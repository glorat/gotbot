import * as API from '../Interfaces'
import * as chars from '../chars'
const Clapp = require('../modules/clapp-discord')
import * as _ from 'underscore'

const fleets = require('../fleetdb')
const crewdb = require('../crewdb')

module.exports = new Clapp.Command({
  name: 'bonus',
  desc: 'set your fleet and personal stat bonuses',

  fn: (argv: any, context: API.Context) =>
    new Promise((fulfill) => {
      try {
        const author = context.author.username
        const userid: string = context.author.id
        const fleetId: string = context.fleetId
        const args = argv.args
        const emojify = context.emojify

        let fleetProm: Promise<any>, crewProm: Promise<any>
        if (
          _.chain(chars.skills)
            .map((sk) => args[sk])
            .some((b) => b !== 0)
            .value()
        ) {
          if (args.type === 'fleetbase') {
            fleetProm = fleets.updateStarbase(fleetId, args)
            crewProm = crewdb.get(userid)
          } else if (args.type === 'fleetprof') {
            fleetProm = fleets.updateStarprof(fleetId, args)
            crewProm = crewdb.get(userid)
          } else if (args.type === 'mybase') {
            const filtered = _.pick(args, chars.skills)
            const update = (doc: any) => {
              doc.base = filtered
              return doc
            }
            crewProm = crewdb.update(userid, update)
            fleetProm = fleets.get(fleetId)
          } else if (args.type === 'myprof') {
            const filtered = _.pick(args, chars.skills)
            const update = (doc: any) => {
              doc.prof = filtered
              return doc
            }
            crewProm = crewdb.update(userid, update)
            fleetProm = fleets.get(fleetId)
          } else {
            throw new Error(`Unknown starbase bonus type ${args.type}`)
          }
        } else {
          crewProm = crewdb.get(userid)
          fleetProm = fleets.get(fleetId)
        }

        fleetProm.then((fleet: any) => {
          const b = fleet.starbase
          const bonuses = chars.skills
            .map((sk) => `${emojify(sk)}+${b[sk]}%`)
            .join('  ')
          let ret = `Starbase bonus at\n${bonuses}\n`
          const b2 = fleet.starprof
          const bon2 = chars.skills
            .map((sk) => `${emojify(sk)}+${b2[sk]}%`)
            .join('  ')
          ret += `Starbase proficiency bonus at\n${bon2}\n`
          crewProm.then((crew: any) => {
            const bon3 = chars.skills
              .map((sk) => `${emojify(sk)}+${crew.base[sk]}%`)
              .join('  ')
            ret += `Personal base bonus at\n${bon3}\n`
            const bon4 = chars.skills
              .map((sk) => `${emojify(sk)}+${crew.prof[sk]}%`)
              .join('  ')
            ret += `Personal prof bonus at\n${bon4}`
            fulfill(ret)
          })
        })
      } catch (e: any) {
        fulfill(e.message)
      }
    }),
  args: (
    [
      {
        name: 'type',
        desc: `fleetbase|fleetprof|mybase|myprof`,
        type: 'string',
        default: '',
        required: false,
      },
    ] as any[]
  ).concat(
    chars.skills.map((sk) => ({
      name: sk,
      desc: `${sk} bonus`,
      type: 'number',
      default: 0,
      required: false,
    }))
  ),
})
