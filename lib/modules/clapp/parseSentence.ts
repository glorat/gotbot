export interface ParsedSentenceArgv {
  _: Array<string | number>
  [key: string]:
    | string
    | number
    | boolean
    | Array<string | number | boolean>
    | Array<string | number>
    | undefined
}

function isNumericToken(value: string): boolean {
  return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(value)
}

function coerceValue(value: string): string | number {
  return isNumericToken(value) ? Number(value) : value
}

function isOptionToken(value: string): boolean {
  if (value === '-' || value === '--') {
    return false
  }

  if (value.startsWith('--')) {
    return true
  }

  return value.startsWith('-') && !isNumericToken(value)
}

function pushValue(
  argv: ParsedSentenceArgv,
  key: string,
  value: string | number | boolean
): void {
  const current = argv[key]

  if (typeof current === 'undefined') {
    argv[key] = value
  } else if (current === value) {
    return
  } else if (Array.isArray(current)) {
    ;(current as Array<string | number | boolean>).push(value)
  } else {
    argv[key] = [current, value]
  }
}

function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let escaped = false
  let tokenStarted = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (escaped) {
      current += char
      escaped = false
      tokenStarted = true
      continue
    }

    if (char === '\\') {
      const next = input[i + 1]

      if (
        typeof next !== 'undefined' &&
        (next === '\\' ||
          next === '"' ||
          next === "'" ||
          (quote === null && /\s/.test(next)))
      ) {
        escaped = true
        tokenStarted = true
        continue
      }

      current += char
      tokenStarted = true
      continue
    }

    if (quote !== null) {
      if (char === quote) {
        quote = null
      } else {
        current += char
      }

      tokenStarted = true
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      tokenStarted = true
      continue
    }

    if (/\s/.test(char)) {
      if (tokenStarted) {
        tokens.push(current)
        current = ''
        tokenStarted = false
      }

      continue
    }

    current += char
    tokenStarted = true
  }

  if (escaped) {
    current += '\\'
  }

  if (tokenStarted) {
    tokens.push(current)
  }

  return tokens
}

export default function parseSentence(input: string): ParsedSentenceArgv {
  const argv: ParsedSentenceArgv = { _: [] }
  const tokens = tokenize(input)

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token === '--') {
      for (let j = i + 1; j < tokens.length; j++) {
        argv._.push(coerceValue(tokens[j]))
      }

      break
    }

    if (token.startsWith('--no-') && token.length > 5) {
      pushValue(argv, token.slice(5), false)
      continue
    }

    if (token.startsWith('--') && token.length > 2) {
      const separatorIndex = token.indexOf('=')

      if (separatorIndex !== -1) {
        pushValue(
          argv,
          token.slice(2, separatorIndex),
          coerceValue(token.slice(separatorIndex + 1))
        )
        continue
      }

      const nextToken = tokens[i + 1]
      if (typeof nextToken !== 'undefined' && !isOptionToken(nextToken)) {
        pushValue(argv, token.slice(2), coerceValue(nextToken))
        i++
      } else {
        pushValue(argv, token.slice(2), true)
      }

      continue
    }

    if (token.startsWith('-') && token.length > 1 && !isNumericToken(token)) {
      const shortFlags = token.slice(1)
      const separatorIndex = shortFlags.indexOf('=')

      if (separatorIndex === 1) {
        pushValue(
          argv,
          shortFlags[0],
          coerceValue(shortFlags.slice(separatorIndex + 1))
        )
        continue
      }

      if (shortFlags.length > 1) {
        const attachedValue = shortFlags.slice(1)

        if (isNumericToken(attachedValue)) {
          pushValue(argv, shortFlags[0], coerceValue(attachedValue))
          continue
        }

        for (const flag of shortFlags) {
          pushValue(argv, flag, true)
        }
        continue
      }

      const nextToken = tokens[i + 1]
      if (typeof nextToken !== 'undefined' && !isOptionToken(nextToken)) {
        pushValue(argv, shortFlags, coerceValue(nextToken))
        i++
      } else {
        pushValue(argv, shortFlags, true)
      }

      continue
    }

    argv._.push(coerceValue(token))
  }

  return argv
}
