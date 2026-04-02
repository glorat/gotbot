import Option, { Validation } from './Option.js'

export interface FlagOptions {
  name: string
  desc: string
  type: 'string' | 'number' | 'boolean'
  default: string | number | boolean
  alias?: string
  caseSensitive?: boolean
  validations?: Validation[]
}

/**
 * @class Flag
 *
 * A flag is an option passed to a {@link Command}. Unlike arguments, flags are optional by
 * nature, meaning that you can't require the user to pass a flag. Flags always have a full
 * name, and may have aliases (i.e: `--debug` and `-d`). In the CLI sentence (See
 * [App.isCliSentence]{@link App#isCliSentence}) `/testapp foo --bar`, `bar` would be the
 * flag the user passed, and its value would be `true`.
 */
class Flag extends Option {
  alias?: string
  default: string | number | boolean
  caseSensitive: boolean
  required: boolean

  constructor(options: FlagOptions) {
    super(options)

    if (
      this.type !== 'string' &&
      this.type !== 'number' &&
      this.type !== 'boolean'
    ) {
      throw new Error(this._genErrStr('type is not string, number or boolean'))
    }

    this.required = false

    if (typeof options.alias === 'string') {
      if (options.alias.length !== 1) {
        throw new Error(
          this._genErrStr('aliases can only be one character long')
        )
      }

      this.alias = options.alias
    }

    if (typeof options.default === 'undefined') {
      throw new Error(this._genErrStr('it does not have a default value'))
    }

    this.default = options.default

    if (typeof this.default !== this.type) {
      throw new Error(
        this._genErrStr("its default value doesn't match its data type")
      )
    }

    if (options.caseSensitive && typeof options.caseSensitive !== 'boolean') {
      throw new Error(
        this._genErrStr('the case sensitive option is not a boolean value')
      )
    }
    this.caseSensitive =
      typeof options.caseSensitive === 'boolean' ? options.caseSensitive : true
  }
}

export default Flag
