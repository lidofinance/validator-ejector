// Minimal config for the e2e mainnet fork node, spawned by
// src/test/hardhat-server.ts. EXECUTION_NODE mirrors the default RPC of the
// existing e2e suite.
require('dotenv').config()

module.exports = {
  // Test doubles for the e2e suite; `hardhat node` compiles them on start
  solidity: '0.8.24',
  paths: {
    sources: './src/test/contracts',
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.EXECUTION_NODE ?? 'https://eth.drpc.org',
      },
    },
  },
}
