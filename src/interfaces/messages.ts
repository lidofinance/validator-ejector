export interface ExitMessage {
  message: {
    epoch: string
    validator_index: string
  }
  signature: string
}

export interface EthDoExitMessage {
  exit: ExitMessage
  fork_version: string
}
