export interface Validation {
  errorMessage: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validate: (value: any) => boolean
}

export interface ValidationTestResult {
  result: boolean
  reason?: string
}

export interface OptionOptions {
  name: string
  desc: string
  type: string
  validations?: Validation[]
}

/**
 * @class Option
 * @private
 *
 * An Option is a type that can become an Argument or a Flag.
 */
class Option {
  name: string
  desc: string
  type: string
  validations: Validation[]

  constructor(options: OptionOptions) {
    if (typeof options.name !== 'string') {
      throw new Error(
        'Error: unnamed ' +
          this.constructor.name.toLowerCase() +
          '. Please refer to the documentation.'
      )
    }
    this.name = options.name

    if (typeof options.desc !== 'string') {
      throw new Error(this._genErrStr('no description provided'))
    }
    this.desc = options.desc

    if (typeof options.type !== 'string') {
      throw new Error(this._genErrStr('no type provided'))
    }
    this.type = options.type

    this.validations = options.validations || []
    for (const i in this.validations) {
      const test = this._testValidation(this.validations[i])

      if (!test.result) {
        throw new Error(
          this._genErrStr('one of its validations ' + test.reason)
        )
      }
    }
  }

  /**
   * Determines whether or not a validation is correct, meaning that it has an errorMessage
   * and a validate function, and that function returns a boolean value.
   * @param validation The validation we're evaluating.
   * @returns An object containing two properties: (boolean) result and (string) reason.
   *                  reason is undefined in case of success.
   * @private
   */
  _testValidation(validation: Validation): ValidationTestResult {
    if (
      typeof validation.errorMessage !== 'string' ||
      typeof validation.validate !== 'function'
    ) {
      return {
        result: false,
        reason: 'is missing one of its parameters',
      }
    }

    // Test the validation to check if it returns a boolean
    // We use a string as the test value since it's the most common case
    const testVal = "Clapp is testing your validation. Please don't panic."

    if (typeof validation.validate(testVal) !== 'boolean') {
      return {
        result: false,
        reason: "was tested and it didn't return a boolean value",
      }
    }

    return { result: true }
  }

  /**
   * Generates an error string based on an error message and the instance type (Argument or Flag)
   *
   * @param err The custom error message.
   * @returns The generated error message.
   * @private
   */
  _genErrStr(err: string): string {
    return (
      'Error when creating ' +
      this.constructor.name.toLowerCase() +
      ' "' +
      this.name +
      '": ' +
      err +
      '. Please refer to the' +
      ' documentation.'
    )
  }
}

export default Option
