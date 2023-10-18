import { ExitMessage } from './service.js'

export class MessageStorage {
  protected $messages: ExitMessage[] = []
  protected $signatures: Set<string> = new Set()

  public addMessage(message: ExitMessage): number {
    if (!this.$signatures.has(message.signature)) {
      this.$messages.push(message)
      this.$signatures.add(message.signature)
      return 1
    }
    return 0
  }

  public addMessages(messages: ExitMessage[]): number {
    return messages
      .map((message) => this.addMessage(message))
      .reduce((sum, x) => sum + x, 0)
  }

  public get messages(): ReadonlyArray<Readonly<ExitMessage>> {
    return this.$messages
  }

  public get length(): number {
    return this.$messages.length
  }
}
