type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never

type LogLevels = ['debug', 'info', 'log', 'warn', 'error']

export type Logger = Record<
  ArrayElement<LogLevels>,
  (message: string, details?: any) => void
>

export type LoggerOptions = {
  level?: ArrayElement<LogLevels>
  pretty?: boolean
  timestamp?: boolean
}
