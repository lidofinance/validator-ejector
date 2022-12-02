type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never

export type LogLevels = ['debug', 'info', 'log', 'warn', 'error']

export type LogLevelsUnion = ArrayElement<LogLevels>

export type Logger = Record<
  LogLevelsUnion,
  (message: string, details?: any) => void
>

export type LoggerOptions = {
  level: LogLevelsUnion
  pretty: boolean
}
