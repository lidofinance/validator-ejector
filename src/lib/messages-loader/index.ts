import { makeConfig } from '../config/index.js'
import type { Reader } from '../reader/index.js'
import { makeLogger } from 'tooling-nanolib-test'
import { exitOrEthDoExitDTO } from './messages-loader-dto.js'

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

export const makeMessagesLoader = ({
  logger,
  config,
  reader,
}: {
  logger: ReturnType<typeof makeLogger>
  config: ReturnType<typeof makeConfig>
  reader: Reader
}) => {
  const load = async () => {
    const folder = await reader.dir(config.MESSAGES_LOCATION)
    const messages: ExitMessage[] = []

    for (const file of folder) {
      if (!file.endsWith('.json')) {
        logger.warn(
          `File with invalid extension found in messages folder: ${file}`
        )
        continue
      }
      const read = await reader.file(`${config.MESSAGES_LOCATION}/${file}`)
      let parsed: EthDoExitMessage | ExitMessage
      try {
        const json = JSON.parse(read.toString())
        parsed = exitOrEthDoExitDTO(json)
      } catch (error) {
        logger.warn(`Unparseable JSON in file ${file}`, error)
        continue
      }
      const message = 'exit' in parsed ? parsed.exit : parsed
      messages.push(message)
    }

    return messages
  }

  return { load }
}
