import * as API from '../Interfaces'
import * as chars from '../chars'
import * as Clapp from '../modules/clapp-discord'
import * as _ from 'underscore'
import * as Discord from 'discord.js'

export default new Clapp.Command({
  name: 'stats',
  desc: 'query stats for characters',

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
      const boldify = context.boldify

      function handleName(name: string, starsArg: number, level: number) {
        chars.wikiLookup(name, function (err: string | null, info: any) {
          if (err) {
            fulfill(err)
          } else {
            const stars = info.stars
            const skill = info.skill
            const char = info.char
            const starStat = function (s: number) {
              const starStr = _.range(s)
                .map(() => emojify('1star'))
                .join('')
              const darkStr = _.range(stars - s)
                .map(() => emojify('1darkstar'))
                .join('')
              const starSk = _.filter(
                skill,
                (sk: any) => sk.stars === s && sk.level === level
              )
              const skStr = _.map(
                starSk,
                (sk: any) =>
                  `${emojify(sk.skill)} ${sk.base} (${sk.min}-${sk.max})`
              ).join(' ')
              return `${starStr}${darkStr} - ${skStr}`
            }

            const levelStr = level !== 100 ? `Level ${level}: ` : ''
            let msg = `${boldify(name)} (${char}): ${levelStr}${info.traits}\n`
            if (starsArg > 0 && starsArg < stars) {
              msg += starStat(starsArg) + '\n'
            } else if (stars === 5) {
              msg += starStat(1) + '\n'
            }
            msg += starStat(stars)
            fulfill(msg)
          }
        })
      }

      if (args.name1.toLowerCase() === 'gabe') {
        fulfill(`Gabe: Admiral,Human,Diplomat,Whoosher,Cultural Figure
${emojify('1star')}${emojify('1star')}${emojify('1star')}${emojify('1star')}${emojify('1star')} - ${emojify('dip')} 922 (354-698) ${emojify('sci')} 926 (247-492) ${emojify('sec')} 1191 (197-525)
`)
        return
      }

      const result = chars.matchOne(args.name1, args.name2, args.name3)
      if (!result.success) {
        fulfill(result.message)
      } else if (result.name) {
        handleName(result.name, argv.flags.stars, argv.flags.level)
      }
    }),
  args: [
    {
      name: 'name1',
      desc: 'Name of character',
      type: 'string',
      default: '',
      required: false,
    },
    {
      name: 'name2',
      desc: 'Name of character',
      type: 'string',
      default: '',
      required: false,
    },
    {
      name: 'name3',
      desc: 'Name of character',
      type: 'string',
      default: '',
      required: false,
    },
  ],
  flags: [
    {
      name: 'stars',
      desc: 'Number of fused stars to query at',
      alias: 's',
      type: 'number',
      default: 0,
    },
    {
      name: 'level',
      desc: 'Skill level to query at. Should be 1,10,20,30,40,50,60,70,80,90,100',
      alias: 'l',
      type: 'number',
      default: 100,
    },
  ],
})
