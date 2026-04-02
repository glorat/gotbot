import Option, { Validation } from './Option.js'

export interface ArgumentOptions {
  name: string
  desc: string
  type: 'string' | 'number'
  required?: boolean
  default?: string | number
  validations?: Validation[]
}

/**
 * @class Argument
 *
 * An argument is an option passed to a {@link Command}. In the CLI sentence (See
 * [App.isCliSentence]{@link App#isCliSentence}) `/testapp foo bar`, `bar` would be the
 * value of the first argument.
 */
class Argument extends Option {
  required: boolean
  default?: string | number

  constructor(options: ArgumentOptions) {
    super(options)

    if (this.type !== 'string' && this.type !== 'number') {
      throw new Error(this._genErrStr('type is not string or number'))
    }

    if (typeof options.required !== 'boolean') {
      this.required = false
    } else {
      this.required = options.required
    }

    if (typeof options.default !== 'undefined') {
      this.default = options.default
    }

    // If the argument is not required, it must have a default value
    if (!this.required && typeof this.default !== 'undefined') {
      if (typeof this.default !== this.type) {
        throw new Error(
          this._genErrStr("its default value doesn't match its data type")
        )
      }
    } else if (
      // If it doesn't have a default value, then show an error.
      !this.required &&
      typeof this.default === 'undefined'
    ) {
      throw new Error(
        this._genErrStr(
          "it's not required, and no default value was" + ' provided'
        )
      )
    }
  }
}

export default Argument
