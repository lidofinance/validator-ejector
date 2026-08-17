import dotenv from 'dotenv'
import { ethers } from 'ethers'

import { makeVerifier } from './verifier.js'

import {
  LoggerService,
  RequestService,
  abort,
  makeLogger,
  makeRequest,
  notOkError,
  retry,
} from '../../lib/index.js'

import { mockConfig } from '../../test/config.js'
import { HardhatServer } from '../../test/hardhat-server.js'
import {
  ExecutionApiService,
  makeExecutionApi,
} from '../execution-api/service.js'

import * as delegationContractFixture from '../../test/fixtures/delegation-contract.bytecode.json'
import delegationContractAbi from '../../test/fixtures/delegation-contract.abi.json'

dotenv.config()

const FORK_PORT = 8560

// Mainnet Locator, same as the neighbouring exit-logs e2e suite. Everything
// else (Exit Bus, HashConsensus) is resolved from it on the fork.
const LOCATOR_ADDRESS = '0xC1d0b3DE6792Bf6b4b37EccdcC24e45978Cfd2Eb'

// Mainnet Curated Node Operators Registry: the Exit Bus verifies each
// reported pubkey against the module's registered keys, so the report must
// reference a real key
const NOR_ADDRESS = '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5'
const NOR_MODULE_ID = 1
const NOR_NODE_OPERATOR_ID = 0
const NOR_KEY_INDEX = 0

const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero

const consensusIface = new ethers.utils.Interface([
  'function getMembers() view returns (address[] addresses, uint256[] lastReportedRefSlots)',
  'function getCurrentFrame() view returns (uint256 refSlot, uint256 reportProcessingDeadlineSlot)',
  'function getChainConfig() view returns (uint256 slotsPerEpoch, uint256 secondsPerSlot, uint256 genesisTime)',
  'function getFrameConfig() view returns (uint256 initialEpoch, uint256 epochsPerFrame, uint256 fastLaneLengthSlots)',
  'function addMember(address addr, uint256 quorum)',
  'function removeMember(address addr, uint256 quorum)',
  'function submitReport(uint256 slot, bytes32 report, uint256 consensusVersion)',
  'function grantRole(bytes32 role, address account)',
  'function getRoleMember(bytes32 role, uint256 index) view returns (address)',
  'function MANAGE_MEMBERS_AND_QUORUM_ROLE() view returns (bytes32)',
])

const exitBusIface = new ethers.utils.Interface([
  'function getConsensusVersion() view returns (uint256)',
  'function getContractVersion() view returns (uint256)',
  'function submitReportData(tuple(uint256 consensusVersion, uint256 refSlot, uint256 requestsCount, uint256 dataFormat, bytes data) data, uint256 contractVersion)',
])

const norIface = new ethers.utils.Interface([
  'function getSigningKeys(uint256 nodeOperatorId, uint256 fromIndex, uint256 keysCount) view returns (bytes pubkeys, bytes signatures, bool[] used)',
])

// dataFormat 2 (LIST_WITH_KEY_INDEX): 3 bytes moduleId, 5 bytes nodeOpId,
// 8 bytes validatorIndex, 8 bytes keyIndex, 48 bytes pubkey
const DATA_FORMAT_LIST_WITH_KEY_INDEX = 2
const packExitRequest = (
  moduleId: number,
  nodeOpId: number,
  validatorIndex: number,
  keyIndex: number,
  pubkey: string
) =>
  ethers.utils.solidityPack(
    ['uint24', 'uint40', 'uint64', 'uint64', 'bytes'],
    [moduleId, nodeOpId, validatorIndex, keyIndex, pubkey]
  )

describe('verifier EDF e2e (mainnet fork)', () => {
  let hardhat: HardhatServer
  let provider: ethers.providers.JsonRpcProvider
  let executionApi: ExecutionApiService
  let request: RequestService
  let logger: LoggerService

  let consensus: ethers.Contract
  let exitBus: ethers.Contract
  let admin: ethers.providers.JsonRpcSigner
  let memberEoa: ethers.providers.JsonRpcSigner
  let owner: ethers.providers.JsonRpcSigner
  let firstDelegate: ethers.providers.JsonRpcSigner
  let secondDelegate: ethers.providers.JsonRpcSigner
  let memberEoaAddress: string
  let firstDelegateAddress: string
  let secondDelegateAddress: string

  let consensusVersion: ethers.BigNumber
  let contractVersion: ethers.BigNumber
  let frameSeconds: number
  let registeredPubkey: string
  let nextValidatorIndex = 1_000_000_000

  const makeAllowlistedVerifier = (allowlist: string[]) =>
    makeVerifier(logger, executionApi, {
      ORACLE_ADDRESSES_ALLOWLIST: allowlist,
      SUBMIT_TX_HASH_ALLOWLIST: [],
    })

  // Runs the real report lifecycle on the fork: the member reaches consensus
  // on HashConsensus, then submits the report data to the Exit Bus, which
  // emits ValidatorExitRequest. `send` abstracts who the member is: an EOA
  // sends the calldata itself, a delegate wraps it in execute().
  const publishExitRequest = async (
    send: (
      to: string,
      calldata: string
    ) => Promise<ethers.providers.TransactionResponse>
  ) => {
    // A fresh frame per report, so earlier processed reports do not clash
    await provider.send('evm_increaseTime', [frameSeconds])
    await provider.send('evm_mine', [])

    const pubkey = registeredPubkey
    const [refSlot] = await consensus.getCurrentFrame()
    const requestsData = packExitRequest(
      NOR_MODULE_ID,
      NOR_NODE_OPERATOR_ID,
      nextValidatorIndex++,
      NOR_KEY_INDEX,
      pubkey
    )
    const reportData = [
      consensusVersion,
      refSlot,
      1,
      DATA_FORMAT_LIST_WITH_KEY_INDEX,
      requestsData,
    ]

    const reportHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        [
          'tuple(uint256 consensusVersion, uint256 refSlot, uint256 requestsCount, uint256 dataFormat, bytes data)',
        ],
        [reportData]
      )
    )

    await (
      await send(
        consensus.address,
        consensusIface.encodeFunctionData('submitReport', [
          refSlot,
          reportHash,
          consensusVersion,
        ])
      )
    ).wait()

    const finalizedTx = await send(
      exitBus.address,
      exitBusIface.encodeFunctionData('submitReportData', [
        reportData,
        contractVersion,
      ])
    )
    const receipt = await finalizedTx.wait()
    expect(receipt.status).toBe(1)

    const toBlock = await provider.getBlockNumber()
    return { pubkey, finalizedTxHash: finalizedTx.hash, toBlock }
  }

  const sendAsEoa =
    (signer: ethers.providers.JsonRpcSigner) =>
    (to: string, calldata: string) =>
      signer.sendTransaction({ to, data: calldata })

  const sendAsDelegate =
    (
      delegationContract: ethers.Contract,
      delegate: ethers.providers.JsonRpcSigner
    ) =>
    (to: string, calldata: string) =>
      delegationContract.connect(delegate).execute(to, calldata)

  const verify = (
    verifier: ReturnType<typeof makeVerifier>,
    report: { pubkey: string; finalizedTxHash: string; toBlock: number }
  ) =>
    verifier.verifyEvent(report.pubkey, report.finalizedTxHash, report.toBlock)

  beforeAll(async () => {
    hardhat = new HardhatServer(FORK_PORT)
    await hardhat.start()

    provider = new ethers.providers.JsonRpcProvider(hardhat.url)

    // The verifier looks ORACLE_FRAME_BLOCKS (7200) back for
    // ConsensusReached. Mine past that so the whole range stays on the
    // fork-local side and eth_getLogs never crosses into the upstream RPC
    await provider.send('hardhat_mine', [ethers.utils.hexValue(7300)])

    memberEoa = provider.getSigner(0)
    owner = provider.getSigner(1)
    firstDelegate = provider.getSigner(2)
    secondDelegate = provider.getSigner(3)
    memberEoaAddress = await memberEoa.getAddress()
    firstDelegateAddress = await firstDelegate.getAddress()
    secondDelegateAddress = await secondDelegate.getAddress()

    request = makeRequest([retry(3), notOkError(), abort(60_000)])
    logger = makeLogger({
      level: 'error',
      format: 'simple',
      sanitizer: { secrets: [], replacer: '<secret>' },
    })
    const config = mockConfig(logger, {
      EXECUTION_NODE: hardhat.url,
      CONSENSUS_NODE: hardhat.url,
      LOCATOR_ADDRESS,
      DRY_RUN: true,
    })
    executionApi = makeExecutionApi(request, logger, config)

    // Real mainnet contracts, resolved through the real Locator on the fork
    await executionApi.resolveExitBusAddress()
    await executionApi.resolveConsensusAddress()
    consensus = new ethers.Contract(
      executionApi.consensusAddress,
      consensusIface,
      provider
    )
    exitBus = new ethers.Contract(
      executionApi.exitBusAddress,
      exitBusIface,
      provider
    )

    consensusVersion = await exitBus.getConsensusVersion()
    contractVersion = await exitBus.getContractVersion()

    // A real registered key: the Exit Bus validates reported pubkeys
    const nor = new ethers.Contract(NOR_ADDRESS, norIface, provider)
    const { pubkeys } = await nor.getSigningKeys(
      NOR_NODE_OPERATOR_ID,
      NOR_KEY_INDEX,
      1
    )
    registeredPubkey = pubkeys
    expect(ethers.utils.hexDataLength(registeredPubkey)).toBe(48)

    const [slotsPerEpoch, secondsPerSlot] = await consensus.getChainConfig()
    const [, epochsPerFrame] = await consensus.getFrameConfig()
    frameSeconds = epochsPerFrame
      .mul(slotsPerEpoch)
      .mul(secondsPerSlot)
      .toNumber()

    // Take over membership: impersonate the admin, then replace the real
    // members with the test member so a single report reaches consensus
    const adminAddress = await consensus.getRoleMember(DEFAULT_ADMIN_ROLE, 0)
    await provider.send('hardhat_impersonateAccount', [adminAddress])
    await provider.send('hardhat_setBalance', [
      adminAddress,
      ethers.utils.hexValue(ethers.utils.parseEther('10')),
    ])
    admin = provider.getSigner(adminAddress)

    await (
      await consensus
        .connect(admin)
        .grantRole(
          await consensus.MANAGE_MEMBERS_AND_QUORUM_ROLE(),
          adminAddress
        )
    ).wait()

    const [members] = await consensus.getMembers()
    for (let count = members.length; count > 0; count--) {
      const quorumAfter = Math.max(1, Math.floor((count - 1) / 2) + 1)
      await (
        await consensus
          .connect(admin)
          .removeMember(members[count - 1], quorumAfter)
      ).wait()
    }
  }, 600_000)

  afterAll(async () => {
    await hardhat?.stop()
  })

  describe('the oracle member is an EOA', () => {
    beforeAll(async () => {
      await (
        await consensus.connect(admin).addMember(memberEoaAddress, 1)
      ).wait()
    }, 120_000)

    afterAll(async () => {
      await (
        await consensus.connect(admin).removeMember(memberEoaAddress, 1)
      ).wait()
    }, 120_000)

    it('accepts a report when the EOA is allowlisted', async () => {
      const report = await publishExitRequest(sendAsEoa(memberEoa))

      const verifier = makeAllowlistedVerifier([memberEoaAddress])
      await expect(verify(verifier, report)).resolves.toBeUndefined()
    })

    it('rejects a report when the EOA is not allowlisted', async () => {
      const report = await publishExitRequest(sendAsEoa(memberEoa))

      const verifier = makeAllowlistedVerifier([
        ethers.Wallet.createRandom().address,
      ])
      await expect(verify(verifier, report)).rejects.toThrow(
        'Transaction is not signed by a trusted Oracle'
      )
    })
  })

  describe('the oracle member is an EDF DelegationContract', () => {
    let delegationContract: ethers.Contract

    beforeAll(async () => {
      const factory = new ethers.ContractFactory(
        delegationContractAbi as unknown as ethers.ContractInterface,
        delegationContractFixture.bytecode,
        owner
      )
      delegationContract = await factory.deploy(
        await owner.getAddress(),
        firstDelegateAddress,
        3600
      )
      await delegationContract.deployed()

      await (
        await consensus.connect(admin).addMember(delegationContract.address, 1)
      ).wait()
    }, 120_000)

    it('accepts a report submitted through execute() when the delegate is allowlisted', async () => {
      const report = await publishExitRequest(
        sendAsDelegate(delegationContract, firstDelegate)
      )

      const verifier = makeAllowlistedVerifier([firstDelegateAddress])
      await expect(verify(verifier, report)).resolves.toBeUndefined()
    })

    it('rejects a delegate report when the delegate is not allowlisted', async () => {
      const report = await publishExitRequest(
        sendAsDelegate(delegationContract, firstDelegate)
      )

      // The DelegationContract address alone does not make the report
      // trusted: the signer must be listed
      const verifier = makeAllowlistedVerifier([delegationContract.address])
      await expect(verify(verifier, report)).rejects.toThrow(
        'Transaction is not signed by a trusted Oracle'
      )
    })

    it('verifies reports across a rotation while both delegates are allowlisted, and drops the old ones when the old delegate is removed', async () => {
      const firstReport = await publishExitRequest(
        sendAsDelegate(delegationContract, firstDelegate)
      )

      // Rotate the hot key: nominate and wait out the cooldown
      await (
        await delegationContract.nominateDelegate(secondDelegateAddress)
      ).wait()
      const [, activeFrom] = await delegationContract.getPendingDelegate()
      await provider.send('evm_setNextBlockTimestamp', [
        activeFrom.toNumber() + 1,
      ])
      await provider.send('evm_mine', [])
      expect(await delegationContract.getDelegate()).toBe(secondDelegateAddress)

      const secondReport = await publishExitRequest(
        sendAsDelegate(delegationContract, secondDelegate)
      )

      const bothDelegates = makeAllowlistedVerifier([
        firstDelegateAddress,
        secondDelegateAddress,
      ])
      await expect(verify(bothDelegates, secondReport)).resolves.toBeUndefined()
      await expect(verify(bothDelegates, firstReport)).resolves.toBeUndefined()

      // Removing the old delegate from the allowlist invalidates the
      // reports it signed
      const newDelegateOnly = makeAllowlistedVerifier([secondDelegateAddress])
      await expect(
        verify(newDelegateOnly, secondReport)
      ).resolves.toBeUndefined()
      await expect(verify(newDelegateOnly, firstReport)).rejects.toThrow(
        'Transaction is not signed by a trusted Oracle'
      )
    })
  })
})
