import * as API from '../Interfaces'
import * as chars from '../chars'
import * as Clapp from '../modules/clapp-discord'
import * as _ from 'underscore'
import * as Discord from 'discord.js'

function bestEntries(
  argv: any,
  args: { skill1: string; skill2: string; category: string },
  level: number
): any[] {
  const fuse = argv.flags.fuse
  const stars = argv.flags.stars
  const skill1 = args.skill1
  const skill2 = args.skill2
  const category = args.category
  const entries = chars.allCrewEntries()
  return chars.bestChars(entries, stars, fuse, category, level, skill1, skill2)
}

export default new Clapp.Command({
  name: 'best',
  desc: 'search for best characters',

  fn: (argv: any, context: API.Context) =>
    new Promise((fulfill) => {
      const args = argv.args
      const emojify = (x: string): string | Discord.Emoji => {
        const custom: { [key: string]: string } = {
          '1star': '\u2B50',
          '1darkstar': String.fromCodePoint(0x1f311),
        }
        if (custom[x]) {
          return custom[x]
        } else {
          return context.emojify(x)
        }
      }

      const level = 100
      let entrys = bestEntries(argv, args, level)

      entrys = _.first(entrys, argv.flags.number)

      function entryStat(entry: any): string {
        const stars = argv.flags.fuse ? argv.flags.fuse : entry.stars
        const starStr = _.range(stars)
          .map(() => emojify('1star'))
          .join('')
        const darkStr = _.range(entry.stars - stars)
          .map(() => emojify('1darkstar'))
          .join('')
        const starSk = _.chain(entry.skill)
          .filter((sk: any) => sk.stars === stars && sk.level === level)
          .sortBy((sk: any) => -sk.base)
          .value()
        const skStr = _.map(
          starSk,
          (sk: any) => `${emojify(sk.skill)} ${sk.base} (${sk.min}-${sk.max})`
        ).join(' ')
        return `${starStr}${darkStr} ${entry.name} - ${skStr} - ${entry.result}`
      }

      const lines = entrys.map(entryStat)
      fulfill(lines.join('\n'))
    }),
  args: [
    {
      name: 'category',
      desc: 'base|gauntlet|minroll|avg',
      type: 'string',
      default: 'base',
      required: true,
      validations: [
        {
          errorMessage: 'Must be base|gauntlet|minroll|avg',
          validate: (value: string) => {
            return !!value.match(/^(base|gauntlet|minroll|avg)$/)
          },
        },
      ],
    },
    {
      name: 'skill1',
      desc: 'skill to query: cmd|dip|sci|eng|med|sec',
      type: 'string',
      default: '',
      required: false,
      validations: [
        {
          errorMessage: 'Must be cmd|dip|sci|eng|med|sec',
          validate: (value: string) => {
            return !!value.match(/^(cmd|dip|sci|eng|med|sec|)$/)
          },
        },
      ],
    },
    {
      name: 'skill2',
      desc: 'second skill to query: cmd|dip|sci|eng|med|sec',
      type: 'string',
      default: '',
      required: false,
      validations: [
        {
          errorMessage: 'Must be cmd|dip|sci|eng|med|sec',
          validate: (value: string) => {
            return !!value.match(/^(cmd|dip|sci|eng|med|sec|)$/)
          },
        },
      ],
    },
  ],
  flags: [
    {
      name: 'stars',
      desc: 'Number of max stars the character has',
      alias: 's',
      type: 'number',
      default: 0,
    },
    {
      name: 'fuse',
      desc: 'Fuse level to query at',
      alias: 'f',
      type: 'number',
      default: 0,
    },
    {
      name: 'number',
      desc: 'Number of results to return (max/default:5)',
      alias: 'n',
      type: 'number',
      default: 10,
    },
  ],
})
