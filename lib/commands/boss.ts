import * as API from '../Interfaces'
import { CrewDoc } from '../chars'
import {
  BossCmdFlags,
  bossJson,
  refreshBossBattleData,
  reportBoss,
} from '../bosscalc'
import { SlashCommandBuilder } from 'discord.js'
import * as Clapp from '../modules/clapp-discord'
import * as crewdb from '../crewdb'
import * as chars from '../chars'
import * as fleets from '../fleetdb'

export default new Clapp.Command({
  name: 'boss',
  desc: 'boss battle calculator',

  // Command function
  fn: (argv: any, context: API.Context) =>
    new Promise(async (fulfill) => {
      async function performRefresh(
        fleetId: string,
        userid: string,
        author: string
      ) {
        const refreshMsg = await refreshBossBattleData(fleetId)

        const flags: BossCmdFlags = argv.flags
        flags.summary = true
        const fleet = await fleets.get(fleetId)
        const crewdoc: CrewDoc = (await crewdb.get(userid, context)) ?? {
          _id: userid,
          username: author,
          crew: [],
          base: {},
          prof: {},
        }
        const solveMsg = await reportBoss(
          fleet.bossDifficulty,
          crewdoc.crew,
          fleet.bossExclude ?? [],
          argv.flags
        )
        const msg = `${solveMsg}\n${refreshMsg}`
        return msg
      }

      try {
        const userid = context.author.id
        const fleetId = context.fleetId
        const author = context.author.username
        // const emojify = context.emojify;
        // const boldify = context.boldify;

        if (!context.isEntitled(userid)) {
          fulfill(`Sorry, this function is for GoT only`)
          return
        }

        const args = argv.args

        // let lines : Array<string> = [];
        // const criteria = [args.arg1, args.arg2, args.arg3];
        if (args.cmd === 'reset') {
          await fleets.resetBossExclude(fleetId)
          const msg = `Hi ${author}. exclude list is reset`
          fulfill(msg)
        } else if (args.cmd === 'refresh') {
          const msg = await performRefresh(fleetId, userid, author)
          fulfill(msg)
        } else if (args.cmd === 'difficulty') {
          const diff = parseInt(args.arg1, 10)
          if (diff) {
            await fleets.setBossDifficulty(fleetId, diff)
            const msg = await performRefresh(fleetId, userid, author)
            fulfill(`${msg}\nSetting boss difficulty to ${diff}`)
          } else {
            const fleet = await fleets.get(fleetId)
            fulfill(`Fleet boss difficulty is at ${fleet.bossDifficulty}`)
          }
        } else if (args.cmd === 'json') {
          const str = await bossJson()
          fulfill('```' + str + '```')
        } else if (args.cmd === 'add') {
          const matchArgs =
            typeof argv.flags?.names === 'string' && argv.flags.names
              ? argv.flags.names.split(' ')
              : [args.arg1, args.arg2, args.arg3]

          chars.matchOne(
            async function (err: any, name: any) {
              if (err) {
                fulfill(err)
              } else {
                const fleet = await fleets.get(fleetId)
                await fleets.addBossExclude(fleetId, name)
                const msg = `Hi ${author}. ${name} will be excluded (with ${(fleet.bossExclude ?? []).length} others)`
                fulfill(msg)
              }
            },
            ...matchArgs
          )
        } else if (args.cmd === 'help') {
          const str = `
help           - Show this text
_              - Current info
                 ** matching crew you have
                 * matching crew in vault
                 -  crew you do not have
add [] [] []   - Add crew to exclusion list
                 *RUN THIS WHEN YOU TRY A CREW*
reset          - Reset exclusion list
                 *RUN RESET WHEN CREW WERE ADDED IN ERROR*
refresh        - Reload boss battle status
                 *RUN REFRESH AFTER NODE IS HIT*
difficulty [n] - Our focussed level
                 *CHANGE THIS IF WE SWITCH DIFFICULTY*
json           - Debug information
                 *RUN THIS IF YOU SEE A BUG*`
          fulfill('```' + str + '```')
        } else {
          const flags: BossCmdFlags = argv.flags
          flags.solve = true
          flags.summary = false

          const fleet = await fleets.get(fleetId)
          const crewdoc: CrewDoc = (await crewdb.get(userid, context)) ?? {
            _id: userid,
            username: author,
            crew: [],
            base: {},
            prof: {},
          }
          const str = await reportBoss(
            fleet.bossDifficulty,
            crewdoc.crew,
            fleet.bossExclude ?? [],
            argv.flags
          )
          fulfill(str)
        }
      } catch (e: any) {
        console.error(JSON.stringify(e))
        fulfill(e?.message ?? e)
      }
    }),
  args: [
    {
      name: 'cmd',
      desc: `boss help for more information`,
      type: 'string',
      default: '',
      required: false,
    },
    {
      name: 'arg1',
      desc: 'search criteria',
      type: 'string',
      default: '',
      required: false,
    },
    {
      name: 'arg2',
      desc: 'search criteria',
      type: 'string',
      default: '',
      required: false,
    },
    {
      name: 'arg3',
      desc: 'search criteria',
      type: 'string',
      default: '',
      required: false,
    },
  ],
  flags: [
    {
      name: 'names',
      desc: 'search string',
      type: 'string',
      default: '',
    },
    {
      name: 'node',
      desc: 'node to query',
      alias: 'n',
      type: 'number',
      default: 0, // falsey
    },
    {
      name: 'own',
      desc: 'tag owned crew',
      alias: 'o',
      type: 'boolean',
      default: false,
    },
    {
      name: 'verbose',
      desc: 'increase verbosity of report',
      alias: 'v',
      type: 'boolean',
      default: false,
    },
  ],
  opts: {
    slashCommandBuilder: () => {
      const b = new SlashCommandBuilder()
      b.setName('boss').setDescription('boss battle calculator')
      b.addSubcommand((sc) =>
        sc
          .setName('report')
          .setDescription('show current eligible crew for battle')
      )
      b.addSubcommand((sc) =>
        sc
          .setName('add')
          .setDescription('crew that just been tried')
          .addStringOption((opts) =>
            opts
              .setName('names')
              .setDescription('search string for crew to add')
              .setRequired(true)
          )
      )
      b.addSubcommand((sc) =>
        sc.setName('refresh').setDescription('a node has been hit')
      )
      b.addSubcommand((sc) =>
        sc
          .setName('difficulty')
          .setDescription('set new difficulty level')
          .addStringOption((opt) =>
            opt
              .setName('arg1')
              .setDescription('difficulty level')
              .addChoices(
                { name: 'normal', value: '3' },
                { name: 'brutal', value: '4' },
                { name: 'nightmare', value: '5' },
                { name: 'ultra-nightmare', value: '6' }
              )
              .setRequired(false)
          )
      )
      b.addSubcommand((sc) =>
        sc.setName('reset').setDescription('crew were added in error')
      )
      b.addSubcommand((sc) =>
        sc
          .setName('json')
          .setDescription('something went wrong, show diagnostics')
      )

      return b
    },
  },
})
