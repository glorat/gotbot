import Command, { Argv } from './Command.js'
import Argument from './Argument.js'
import Table from 'cli-table3'
import defaultStr from './strings/en.js'
import parseSentence from 'minimist-string'
import { StringsObject } from './strings/en.js'

export interface OnReplyFunction {
  (msg: string, context: unknown): void
}

export interface AppOptions {
  name: string
  desc: string
  prefix: string
  onReply: OnReplyFunction
  caseSensitive?: boolean
  version?: string
  separator?: string
  commands?: Command[]
  strings?: Partial<StringsObject>
}

export interface InputMismatchInfo {
  providedType: string
  expectedType: string
}

export interface ValidPrefixesResult {
  validPrefix: string
  userPrefix: string
}

export interface ParsedArgv {
  _: string[]
  help?: boolean
  version?: boolean
  [key: string]: string | number | boolean | string[] | undefined
}

/**
 * @class App
 *
 * A command line app. An App can parse an input with {@link parseInput}, and if it's correct (i.e:
 * refers to an existing command and provides the required options), the command will be executed.
 * An App needs an onReply function to be able to communicate with the user.
 */
class App {
  name: string
  desc: string
  prefix: string
  caseSensitive: boolean
  version?: string
  separator: string
  str: StringsObject
  reply: OnReplyFunction
  commands: Record<string, Command>

  constructor(options: AppOptions) {
    if (
      typeof options === 'undefined' || // options is required
      typeof options.name !== 'string' || // name is required
      typeof options.desc !== 'string' || // desc is required
      typeof options.prefix !== 'string' || // prefix is required
      typeof options.onReply !== 'function' || // onReply is required
      (options.commands && !Array.isArray(options.commands)) || // commands are not required
      (options.version && typeof options.version !== 'string') || // version is not required
      (options.caseSensitive && typeof options.caseSensitive !== 'boolean') || // caseSensitive is not required
      (options.separator && typeof options.separator !== 'string') || // separator is not required
      (options.strings && typeof options.strings !== 'object') // strings is not required
    ) {
      throw new Error(
        'Wrong options passed into the Clapp constructor. ' +
          'Please refer to the documentation.'
      )
    }

    this.name = options.name
    this.desc = options.desc
    this.prefix = options.prefix
    this.caseSensitive =
      typeof options.caseSensitive === 'boolean' ? options.caseSensitive : true
    this.version =
      typeof options.version === 'string' ? options.version : undefined
    // doing options.separator || ' ' would invalidate the separator being ''
    this.separator =
      typeof options.separator !== 'undefined' ? options.separator : ' '
    this.str = Object.assign({}, defaultStr, options.strings)

    this.reply = options.onReply

    this.commands = {}
    options.commands = options.commands || []
    for (let i = 0; i < options.commands.length; i++) {
      this.addCommand(options.commands[i])
    }
  }

  /**
   * Binds a command to the app so that the command can be executed from
   * [parseInput]{@link App#parseInput}.
   *
   * @param cmd The command to bind.
   * @returns undefined
   *
   * @example
   * app.addCommand(new Clapp.Command({
   *  name: "foo",
   *  desc: "An example command",
   *  fn : (argv, context) => {
   *      console.log("foo was executed");
   *  }
   * })):
   */
  addCommand(cmd: Command): void {
    if (!(cmd instanceof Command)) {
      throw new Error(
        'Error adding a command to ' +
          this.name +
          '. Provided parameter is not a command. Please refer to the documentation.'
      )
    }

    this.commands[cmd.name] = cmd
  }

  /**
   * Parses an input CLI sentence (See [isCliSentence]{@link App#isCliSentence}) and performs
   * actions accordingly:
   * if the sentence is a valid command, that command is executed. If it is an invalid CLI
   * sentence, the user is warned about the problem. If the user passes the "--help" flag, they
   * are prompted with the app general help, or the command specific help.
   *
   * Please note the following:
   *
   * - The input is not sanitized. It is your responsibility to do so.
   * - It would be a good idea to sanitize your input by using [validations]{@link validation}.
   * - It is also imperative that you make sure that the input is a CLI sentence (valid or
   * not) by using [isCliSentence]{@link App#isCliSentence}. Otherwise, Clapp will throw an error.
   *
   * @param input A CLI sentence. See [isCliSentence]{@link App#isCliSentence}.
   * @param [context] The context to retrieve later. See {@tutorial Working-with-contexts}.
   * @returns undefined
   *
   * @example
   * app.parseInput("/testapp foo");        // Executes `foo`
   * app.parseInput("/testapp foo --bar");  // Executes `foo` passing the --bar flag
   * app.parseInput("/testapp foo --help"); // Shows the command help for `foo`
   * app.parseInput("/testapp --help");     // Shows the app help
   * app.parseInput("Not a CLI sentence");  // Throws an error. Make sure to validate
   *                                        // user input with App.isCliSentence();
   */
  parseInput(input: string, context?: unknown): void {
    if (typeof input !== 'string') {
      throw new Error("Input must be a string! Don't forget to sanitize it.")
    }

    if (!this.isCliSentence(input)) {
      throw new Error(
        'Clapp: attempted to parse the input "' +
          input +
          '", ' +
          "but it is not a CLI sentence (doesn't begin with the app prefix)."
      )
    }

    const argv = parseSentence(
      input.replace(this.prefix + this.separator, '')
    ) as ParsedArgv

    // Find whether or not the requested command exists
    let cmd: Command | null = null
    const userInputCommand = argv._[0]
    for (const name in this.commands) {
      const command = this.commands[name]

      const validCommandName = command.caseSensitive ? name : name.toLowerCase()
      const validUserInput = command.caseSensitive
        ? userInputCommand
        : userInputCommand.toLowerCase()

      if (validCommandName === validUserInput) {
        cmd = command
        break
      }
    }

    if (!cmd) {
      // The command doesn't exist. Four scenarios possible:
      const { validPrefix, userPrefix } = this._getValidPrefixes(input)
      const validInput = this._getValidUserInput(input, userPrefix)

      if (argv.help || validInput === validPrefix) {
        // The help flag was passed OR the user typed just the command prefix.
        // Show app help.
        this.reply(this._getHelp(), context)
      } else if (argv.version) {
        // The user asked for the app version
        this.reply('v' + this.version, context)
      } else {
        // The user made a mistake. Let them know.
        this.reply(
          this.str.err +
            this.str.err_unknown_command.replace('%CMD%', argv._[0]) +
            ' ' +
            this.str.err_type_help.replace('%PREFIX%', this.prefix),
          context
        )
      }
    } else {
      // The command exists. Three scenarios possible:
      if (argv.help) {
        // The user requested the command specific help.
        this.reply(cmd._getHelp(this), context)
      } else {
        // Find whether or not it supplies every required argument.
        const unfulfilled_args: Argument[] = []
        let j = 1 // 1 because argv._[0] is the command name
        for (const i in cmd.args) {
          if (cmd.args[i].required && typeof argv._[j] === 'undefined') {
            unfulfilled_args.push(cmd.args[i])
          }

          j++
        }

        if (unfulfilled_args.length) {
          let r = this.str.err + this.str.err_unfulfilled_args + '\n'
          for (const i in unfulfilled_args) {
            r += unfulfilled_args[i as unknown as number].name + '\n'
          }
          r +=
            '\n' +
            this.str.err_type_help.replace(
              '%PREFIX%',
              this.prefix + ' ' + argv._[0]
            )

          this.reply(r, context)
        } else {
          const final_argv: Argv = { args: {}, flags: {} }
          const errors: string[] = []

          // Give values to every argument
          j = 1
          for (const i in cmd.args) {
            const arg = cmd.args[i]

            let argValue: string | number | undefined = argv._[j]

            // If the arg wasn't supplied and it has a default value, use it
            if (
              typeof argValue === 'undefined' &&
              typeof arg.default !== 'undefined'
            ) {
              argValue = arg.default
            }

            // Convert it to the correct type, and register errors.
            const convertedValue = App._convertType(argValue, arg.type)

            if (
              convertedValue !== null &&
              typeof convertedValue === 'object' &&
              'expectedType' in convertedValue
            ) {
              const mismatchInfo = convertedValue as InputMismatchInfo
              errors.push(
                'Error on argument ' +
                  i +
                  ': expected ' +
                  mismatchInfo.expectedType +
                  ', got ' +
                  mismatchInfo.providedType +
                  ' instead.'
              )
              final_argv.args[arg.name] = argValue
            } else {
              final_argv.args[arg.name] = convertedValue as
                | string
                | number
                | boolean
              // If the user input matches the required data type, perform every
              // validation, if there's any:
              for (const validation of arg.validations) {
                if (
                  !validation.validate(
                    final_argv.args[arg.name] as string | number
                  )
                ) {
                  errors.push(
                    'Error on argument ' + i + ': ' + validation.errorMessage
                  )
                }
              }
            }

            j++
          }

          // Give values to every flag
          for (const name in cmd.flags) {
            const flag = cmd.flags[name]
            let userValue: string | number | boolean | null = null

            // Check if the user has passed the alias.
            // Otherwise check if the user has passed the flag.
            if (typeof argv[flag.alias!] !== 'undefined') {
              // The user has passed the alias.
              userValue = argv[flag.alias!] as string | number | boolean
            } else {
              // If the flag is case sensitive, just check if the user has passed it
              if (flag.caseSensitive && typeof argv[name] !== 'undefined') {
                userValue = argv[name] as string | number | boolean
              } else {
                // If not, compare every flag the user passed against this one.
                for (const userInputFlag in argv) {
                  // _ represents the command and arguments;
                  // we don't care about those.
                  if (
                    userInputFlag !== '_' &&
                    name.toLowerCase() === userInputFlag.toLowerCase()
                  ) {
                    userValue = argv[userInputFlag] as string | number | boolean
                  }
                }
              }
            }

            final_argv.flags[name] =
              userValue !== null ? userValue : flag.default

            // Convert it to the correct type, and register errors.
            const convertedFlagValue = App._convertType(
              final_argv.flags[name],
              flag.type
            )

            if (
              convertedFlagValue !== null &&
              typeof convertedFlagValue === 'object' &&
              'expectedType' in convertedFlagValue
            ) {
              const mismatchInfo = convertedFlagValue as InputMismatchInfo
              errors.push(
                'Error on flag ' +
                  name +
                  ': expected ' +
                  mismatchInfo.expectedType +
                  ', got ' +
                  mismatchInfo.providedType +
                  ' instead.'
              )
            } else {
              final_argv.flags[name] = convertedFlagValue as
                | string
                | number
                | boolean
              // If the user input matches the required data type, perform every
              // validation, if there's any:
              for (let k = 0; k < flag.validations.length; k++) {
                if (
                  !flag.validations[k].validate(
                    final_argv.flags[name] as string | number
                  )
                ) {
                  errors.push(
                    'Error on flag ' +
                      name +
                      ': ' +
                      flag.validations[k].errorMessage
                  )
                }
              }
            }
          }

          // If we don't have any errors, we can execute the command
          let response: unknown
          if (errors.length === 0) {
            // The property async is deprecated, but we still give support to it
            if (!cmd.async) {
              response = cmd.fn(final_argv, context)

              if (response instanceof Promise) {
                // Even though the async attribute is set to false, the command
                // is actually async because it returned a promise.
                Promise.resolve(response)
                  .then((actualResponse: unknown) => {
                    // Note the difference between response and actual_response
                    // response is a Promise that will eventually return a value
                    // actualResponse is the value that was returned by the promise
                    if (typeof actualResponse === 'string') {
                      this.reply(actualResponse, context)
                    } else if (
                      typeof actualResponse === 'object' &&
                      actualResponse !== null &&
                      ('message' in actualResponse ||
                        'context' in actualResponse)
                    ) {
                      const respObj = actualResponse as {
                        message?: string
                        context?: unknown
                      }
                      this.reply(respObj.message ?? '', respObj.context)
                    }
                  })
                  .catch((err) => {
                    this.reply(
                      this.str.err_internal_error.replace('%CMD%', cmd!.name),
                      context
                    )
                    console.error(err)
                  })
              } else if (typeof response === 'string') {
                this.reply(response, context)
              } else if (
                typeof response === 'object' &&
                response !== null &&
                ('message' in response || 'context' in response)
              ) {
                const respObj = response as {
                  message?: string
                  context?: unknown
                }
                this.reply(respObj.message ?? '', respObj.context)
              }
            } else {
              const self = this
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const fn = cmd.fn as (
                argv: Argv,
                context: unknown,
                cb: (response: string, newContext?: unknown) => void
              ) => void
              fn(
                final_argv,
                context,
                function cb(response: string, newContext?: unknown) {
                  if (typeof response === 'string') {
                    if (typeof newContext !== 'undefined') {
                      self.reply(response, newContext)
                    } else {
                      self.reply(response, context)
                    }
                  }
                }
              )

              if (!cmd.suppressDeprecationWarnings) {
                /* istanbul ignore next */
                console.warn(
                  'The Command.async property is deprecated. Please' +
                    ' return a Promise instead; refer to the documentation.\n' +
                    'Set the suppressDeprecationWarnings property to true in' +
                    ' order to ignore this warning.'
                )
              }
            }
          } else {
            response = this.str.err + this.str.err_type_mismatch + '\n\n'
            for (let i = 0; i < errors.length; i++) {
              response += errors[i] + '\n'
            }
            this.reply(response as string, context)
          }
        }
      }
    }
  }

  /**
   * Validates an input to find out whether or not it is a CLI sentence.
   *
   * A CLI sentence (valid or not) is a string that begins with the app prefix. A valid CLI
   * sentence is a CLI sentence that does not result in an error upon parsing.
   *
   * @param sentence The string to test.
   * @returns Whether or not the sentence is a CLI sentence.
   *
   * @example
   * app.isCliSentence('/testapp foo --bar'); // True
   * app.isCliSentence('Hello, world!')       // False
   */
  isCliSentence(sentence: string): boolean {
    const { validPrefix, userPrefix } = this._getValidPrefixes(sentence)

    // Replace the user-introduced prefix with the userPrefix variable
    const userSentence = this._getValidUserInput(sentence, userPrefix)

    return (
      userSentence === validPrefix ||
      userPrefix === validPrefix + this.separator
    )
  }

  /**
   * Converts an argument to the requested data type. Returns null if impossible.
   * @param arg    The provided argument
   * @param toType The type we want the argument to be.
   * @returns Returns the desired value, or the error information on fail.
   * @private
   */
  static _convertType(
    arg: string | number | boolean | undefined,
    toType: string
  ): string | number | boolean | null | InputMismatchInfo {
    switch (typeof arg) {
      case 'string':
        switch (toType) {
          case 'string':
            // String asked, string provided. We're good to go.
            return arg
          case 'number':
            // Number asked, string provided.
            // We don't even try to convert the string to a number, because if the user
            // had provided a number, minimist would have given us a number, meaning
            // that we wouldn't be here. So we have an error.
            return {
              providedType: 'string',
              expectedType: 'number',
            }
          case 'boolean':
            // Boolean asked, string provided.
            // The common scenario for getting a boolean would be an user inputting
            // something like this: --boolOption.
            // But we also want this to work: --boolOption=true and --boolOption="true"
            // So we try to convert the string to boolean:
            switch (arg.toLowerCase()) {
              case 'true':
                // We have a boolean with the value true. We're good to go.
                return true
              case 'false':
                // We have a boolean with the value false. We're good to go.
                return false
              default:
                // The string can't be converted to boolean.
                // We have an error.
                return {
                  providedType: 'string',
                  expectedType: 'boolean',
                }
            }
          /* istanbul ignore next */
          default:
            // This shouldn't happen.
            throw new Error(
              'Clapp: internal error.' +
                'Please report this to the bug tracker.'
            )
        }

      case 'number':
        switch (toType) {
          case 'string':
            // String asked, number provided.
            // This is fine, the expected value could be a number string,
            // so we just convert it.
            return arg.toString()
          case 'number':
            // Number asked, number provided. We're good to go.
            return arg
          case 'boolean':
            // We want to accept the values of 0 and 1 as booleans, and reject the rest.
            if (arg === 0) {
              return false
            } else if (arg === 1) {
              return true
            } else {
              return {
                providedType: 'number',
                expectedType: 'boolean',
              }
            }
          /* istanbul ignore next */
          default:
            // This shouldn't happen.
            throw new Error(
              'Clapp: internal error.' +
                'Please report this to the bug tracker.'
            )
        }

      case 'boolean':
        // If a boolean is provided, it only makes sense to accept it if a boolean is asked
        // because although true could be converted to 1 or string "true", it would only
        // be confusing and cause unexpected behaviour.
        switch (toType) {
          case 'string':
            return {
              providedType: 'boolean',
              expectedType: 'string',
            }
          case 'number':
            return {
              providedType: 'boolean',
              expectedType: 'number',
            }
          case 'boolean':
            // We gucci
            return arg
          /* istanbul ignore next */
          default:
            // This shouldn't happen.
            throw new Error(
              'Clapp: internal error.' +
                'Please report this to the bug tracker.'
            )
        }

      /* istanbul ignore next */
      default:
        // This shouldn't happen.
        throw new Error(
          'Clapp: internal error. Please report this to the bug tracker.'
        )
    }
  }

  /**
   * Parses the app prefix and user inputted prefix to take into account case insensitivity.
   *
   * @param input The user input.
   * @returns An object containing the result.
   * @private
   */
  _getValidPrefixes(input: string): ValidPrefixesResult {
    const validPrefix = this.caseSensitive
      ? this.prefix
      : this.prefix.toLowerCase()
    let userPrefix = input.substring(
      0,
      this.prefix.length + this.separator.length
    )
    userPrefix = this.caseSensitive ? userPrefix : userPrefix.toLowerCase()

    return {
      validPrefix: validPrefix,
      userPrefix: userPrefix,
    }
  }

  /**
   * Converts the user input to a "valid" input which takes into account case insensitivity.
   *
   * @param input The user input
   * @param userPrefix The result of _getValidPrefixes()
   * @returns The parsed input
   * @private
   */
  _getValidUserInput(input: string, userPrefix: string): string {
    return (
      userPrefix + input.substring(this.prefix.length + this.separator.length)
    )
  }

  /**
   * Returns the global app help
   *
   * @returns The App Help
   * @private
   */
  _getHelp(): string {
    const LINE_WIDTH = 100

    let r =
      this.name +
      (typeof this.version !== 'undefined' ? ' v' + this.version : '') +
      '\n' +
      this.desc +
      '\n\n' +
      this.str.help_usage +
      this.prefix +
      this.separator +
      this.str.help_command +
      '\n\n' +
      this.str.help_cmd_list +
      '\n\n'
    // Command list
    const table = new Table({
      chars: {
        top: '',
        'top-mid': '',
        'top-left': '',
        'top-right': '',
        bottom: '',
        'bottom-mid': '',
        'bottom-left': '',
        'bottom-right': '',
        left: '',
        'left-mid': '',
        mid: '',
        'mid-mid': '',
        right: '',
        'right-mid': '',
        middle: '',
      },
      colWidths: [0.1 * LINE_WIDTH, 0.9 * LINE_WIDTH],
      wordWrap: true,
    })

    for (const i in this.commands) {
      table.push([i, this.commands[i].desc])
    }

    r +=
      table.toString() +
      '\n\n' +
      this.str.help_further_help +
      this.prefix +
      ' ' +
      this.str.help_command +
      ' --help'

    return r
  }
}

export default App
