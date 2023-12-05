import { ExitMessage, ExitMessageWithMetadata } from './service.js'

export type ValidatorIndex = string
export type LAST_UPDATE = number

export enum Result {
  UPDATED = 0,
  ADDED = 1,
}

/**
 * Stores only valid messages
 */
export class MessageStorage {
  private LAST_UPDATE: LAST_UPDATE = 0

  // Last update counter for each message
  private messagesLastUpdate: Map<ValidatorIndex, LAST_UPDATE> = new Map<
    ValidatorIndex,
    LAST_UPDATE
  >()

  private messagesMetadata: Map<ValidatorIndex, ExitMessageWithMetadata> =
    new Map<ValidatorIndex, ExitMessageWithMetadata>()

  private addOrUpdateMessage(
    messageWithMetadata: ExitMessageWithMetadata
  ): Result {
    const hasMsg = this.messagesMetadata.has(
      String(messageWithMetadata.data.message.validator_index)
    )

    this.messagesMetadata.set(
      String(messageWithMetadata.data.message.validator_index),
      messageWithMetadata
    )

    this.setLastUpdate(
      messageWithMetadata.data.message.validator_index,
      this.LAST_UPDATE
    )

    if (!hasMsg) {
      // msg was appended
      return Result.ADDED
    }

    // msg was updated (overwritten)
    return Result.UPDATED
  }

  private setLastUpdate(
    validatorIndex: ValidatorIndex,
    lastUpdate: LAST_UPDATE
  ) {
    this.messagesLastUpdate.set(String(validatorIndex), lastUpdate)
  }

  public startUpdateCycle() {
    this.LAST_UPDATE = Date.now()
  }

  public updateMessages(messagesWithMetadata: ExitMessageWithMetadata[]): {
    updated: number
    added: number
  } {
    const processResults = messagesWithMetadata.map((msg) =>
      this.addOrUpdateMessage(msg)
    )

    const updated = processResults.filter(
      (result) => result === Result.UPDATED
    ).length

    const added = processResults.filter(
      (result) => result === Result.ADDED
    ).length

    return { updated, added }
  }

  /**
   * Updates LAST_UPDATE of message with checksum if any
   * Returns true if message was found and updated
   */
  public touchMessageWithChecksum(fileChecksum: string): boolean {
    for (const msgWithMeta of this.messagesMetadata.values()) {
      if (msgWithMeta.meta.fileChecksum === fileChecksum) {
        this.setLastUpdate(
          msgWithMeta.data.message.validator_index,
          this.LAST_UPDATE
        )
        return true
      }
    }

    return false
  }

  protected removeMessage(validatorIndex: ValidatorIndex) {
    this.messagesLastUpdate.delete(String(validatorIndex))
    this.messagesMetadata.delete(String(validatorIndex))
  }

  /**
   * Removes old messages
   */
  public removeOldMessages(): number {
    let removed = 0

    for (const [
      validatorIndex,
      LAST_UPDATE,
    ] of this.messagesLastUpdate.entries()) {
      if (LAST_UPDATE < this.LAST_UPDATE) {
        this.removeMessage(validatorIndex)
        removed++
      }

      // // decreasing LAST_UPDATE
      // this.setLastUpdate(validatorIndex, LAST_UPDATE - 1)
    }

    return removed
  }

  public findByValidatorIndex(
    index: ValidatorIndex
  ): Readonly<ExitMessage> | undefined {
    return this.messagesMetadata.get(String(index))?.data
  }

  public get messages(): ReadonlyArray<Readonly<ExitMessage>> {
    return Array.from(this.messagesMetadata.values()).map(({ data }) => data)
  }

  public get size(): number {
    return this.messagesMetadata.size
  }
}
