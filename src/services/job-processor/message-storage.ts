import { ExitMessage, ExitMessageWithMetadata } from './service.js'

export type ValidatorIndex = string
export type TTL = number

/**
 * Stores only valid messages
 */
export class MessageStorage {
  private MAX_TTL: TTL = 10

  // Time to live counter for each message
  private messageTTL: Map<ValidatorIndex, TTL> = new Map<ValidatorIndex, TTL>()

  private messagesMetadatas: Map<ValidatorIndex, ExitMessageWithMetadata> =
    new Map<ValidatorIndex, ExitMessageWithMetadata>()

  private addOrUpdateMessage(
    messageWithMetadata: ExitMessageWithMetadata
  ): number {
    const hasMsg = this.messagesMetadatas.has(
      String(messageWithMetadata.data.message.validator_index)
    )

    this.messagesMetadatas.set(
      String(messageWithMetadata.data.message.validator_index),
      messageWithMetadata
    )

    this.setTTL(messageWithMetadata.data.message.validator_index, this.MAX_TTL)

    if (!hasMsg) {
      // msg was appended
      return 1
    }

    // msg was updated (overwritten)
    return 0
  }

  private setTTL(validatorIndex: ValidatorIndex, ttl: TTL) {
    this.messageTTL.set(String(validatorIndex), ttl)
  }

  public updateMessages(messagesWithMetadata: ExitMessageWithMetadata[]): {
    updated: number
    added: number
  } {
    return messagesWithMetadata
      .map((msg) => this.addOrUpdateMessage(msg))
      .reduce(
        (stats, x) => {
          if (x === 1) {
            stats.added++
            return stats
          }
          stats.updated++
          return stats
        },
        { updated: 0, added: 0 }
      )
  }

  public hasMessageWithChecksum(fileChecksum: string): boolean {
    for (const msgWithMeta of this.messagesMetadatas.values()) {
      if (msgWithMeta.meta.fileChecksum === fileChecksum) {
        this.setTTL(msgWithMeta.data.message.validator_index, this.MAX_TTL)
        return true
      }
    }

    return false
  }

  protected removeMessage(validatorIndex: ValidatorIndex) {
    this.messageTTL.delete(String(validatorIndex))
    this.messagesMetadatas.delete(String(validatorIndex))
  }

  /**
   * Removes old messages with expired TTL
   */
  public removeOldMessages() {
    for (const [validatorIndex, TTL] of this.messageTTL.entries()) {
      if (TTL < 0) {
        this.removeMessage(validatorIndex)
        continue
      }

      // decreasing TTL
      this.setTTL(validatorIndex, TTL - 1)
    }
  }

  public findByValidatorIndex(
    index: ValidatorIndex
  ): Readonly<ExitMessage> | undefined {
    return this.messagesMetadatas.get(String(index))?.data
  }

  public get messages(): ReadonlyArray<Readonly<ExitMessage>> {
    return Array.from(this.messagesMetadatas.values()).map(({ data }) => data)
  }

  public get size(): number {
    return this.messagesMetadatas.size
  }
}
