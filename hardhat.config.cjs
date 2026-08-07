// Minimal config for the e2e mainnet fork node, spawned by
// src/test/hardhat-server.ts. EXECUTION_NODE mirrors the default RPC of the
// existing e2e suite.
require('dotenv').config()

module.exports = {
  networks: {
    hardhat: {
      forking: {
        // An unset CI secret arrives as an empty string, which must also
        // fall back to the public node
        url: process.env.EXECUTION_NODE || 'https://ethereum-rpc.publicnode.com',
      },
    },
  },
}
