import { obj, str, bool, num } from '../../lib/index.js'

export const syncingDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      data: obj(json.data, (data) => ({
        head_slot: str(data.head_slot),
        sync_distance: str(data.sync_distance),
        is_syncing: bool(data.is_syncing),
        is_optimistic: bool(data.is_optimistic),
      })),
    }),
    'Invalid syncing response'
  )

export const genesisDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      data: obj(json.data, (data) => ({
        genesis_time: str(data.genesis_time, 'Invalid genesis_time input'),
        genesis_validators_root: str(
          data.genesis_validators_root,
          'Invalid genesis_validators_root input'
        ),
        genesis_fork_version: str(
          data.genesis_fork_version,
          'Invalid genesis_fork_version input'
        ),
      })),
    }),
    'Invalid genesis response'
  )

export const stateDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      data: obj(json.data, (data) => ({
        previous_version: str(
          data.previous_version,
          'Invalid previous_version input'
        ),
        current_version: str(
          data.current_version,
          'Invalid current_version input'
        ),
        epoch: str(data.epoch, 'Invalid epoch input'),
      })),
    }),
    'Invalid state response'
  )

export const specDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      data: obj(json.data, (data) => ({
        CAPELLA_FORK_VERSION: str(
          data.CAPELLA_FORK_VERSION,
          'Invalid CAPELLA_FORK_VERSION input'
        ),
      })),
    }),
    'Invalid spec response'
  )

export const depositContractDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      data: obj(json.data, (data) => ({
        chain_id: num(data.chain_id, 'Invalid chain_id input'),
        address: str(data.address, 'Invalid address input'),
      })),
    }),
    'Invalid spec response'
  )

export const validatorInfoDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      data: obj(json.data, (data) => ({
        index: str(data.index, 'Invalid validator index'),
        status: str(data.status, 'Invalid status'),
        validator: obj(data.validator, (validator) => ({
          pubkey: str(validator.pubkey, 'Invalid pubkey'),
          exit_epoch: str(validator.exit_epoch, 'Invalid exit epoch'),
        })),
      })),
    }),
    'Invalid validator info response'
  )
