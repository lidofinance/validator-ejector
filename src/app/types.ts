export type ExitMessage = {
  message: {
    epoch: string
    validator_index: string
  }
  signature: string
}

export type EthDoExitMessage = {
  exit: ExitMessage
  fork_version: string
}
