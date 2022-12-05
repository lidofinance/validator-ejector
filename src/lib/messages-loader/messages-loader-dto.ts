import { obj, str, or } from 'tooling-nanolib-test'

export const exitMessageDTO = (input: unknown) =>
  obj(input, (json) => ({
    message: obj(json.message, (message) => ({
      epoch: str(message.epoch),
      validator_index: str(message.validator_index),
    })),
    signature: str(json.signature),
  }))

export const ethDoExitMessageDTO = (input: unknown) =>
  obj(input, (json) => ({
    exit: exitMessageDTO(json),
    fork_version: str(json.fork_version),
  }))

export const exitOrEthDoExitDTO = (input: unknown) =>
  or(
    () => exitMessageDTO(input),
    () => ethDoExitMessageDTO(input)
  )
