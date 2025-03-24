type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never

export type LogLevels = ['debug', 'info', 'log', 'warn', 'error']

export type Format = 'json' | 'simple'

export type LogLevelsUnion = ArrayElement<LogLevels>

export type Logger = Record<
  LogLevelsUnion,
  (message: string, details?: any) => void
>

export type Sanitizer = {
  secrets: string[]
  replacer: string
}

export type LoggerOptions = {
  level: LogLevelsUnion
  format: Format
  silent?: boolean
  sanitizer?: Sanitizer
  causeDepth?: number
}
