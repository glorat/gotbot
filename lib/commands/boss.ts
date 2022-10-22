import * as API from '../Interfaces';
//import {allCrewEntries} from "../chars";
import {CrewDoc} from "../chars";
import {BossCmdFlags, bossJson, refreshBossBattleData, reportBoss} from "../bosscalc";

const Clapp = require('../modules/clapp-discord');


const crewdb = require('../crewdb');
const chars = require('../chars');
// const crewdb = require('../crewdb.js');
const fleets = require('../fleetdb');

//const voyageSkills = ['cmd','dip','sec','eng','sci','med'];


module.exports = new Clapp.Command({
  name: 'boss',
  desc: 'boss battle calculator',

// Command function
  fn: (argv:any, context:API.Context) => new Promise(async (fulfill) => {
    async function performRefresh(fleetId: string, userid:string, author:string) {
      let refreshMsg = await refreshBossBattleData(fleetId);

      const flags: BossCmdFlags = argv.flags
      flags.summary = true
      const fleet = await fleets.get(fleetId)
      const crewdoc: CrewDoc = await crewdb.get(userid, context) ?? {
        _id: userid,
        username: author,
        crew: [],
        base: {},
        prof: {}
      }
      const solveMsg = await reportBoss(fleet.bossDifficulty, crewdoc.crew, fleet.bossExclude, argv.flags)
      const msg = `${solveMsg}\n${refreshMsg}`
      return msg;
    }

    try {
      const userid = context.author.id;
      const fleetId = context.fleetId;
      const author = context.author.username;
      // const emojify = context.emojify;
      // const boldify = context.boldify;

      if (!context.isEntitled(userid)) {
        fulfill(`Sorry, this function is for GoT only`);
        return;
      }

      const args = argv.args;


      // let lines : Array<string> = [];
      // const criteria = [args.arg1, args.arg2, args.arg3];
      if (args.cmd === 'reset') {
        await fleets.resetBossExclude(fleetId)
        const msg = `Hi ${author}. exclude list is reset`;
        fulfill(msg)
      }
      else if (args.cmd === 'refresh') {
        const msg = await performRefresh(fleetId, userid, author);
        fulfill(msg)

      }
      else if (args.cmd === 'difficulty') {
        const diff = parseInt(args.arg1)
        if (diff) {
          await fleets.setBossDifficulty(fleetId, diff)
          const msg = await performRefresh(fleetId, userid, author);
          fulfill(`${msg}\nSetting boss difficulty to ${diff}`)
        } else {
          const fleet = await fleets.get(fleetId)
          fulfill(`Fleet boss difficulty is at ${fleet.bossDifficulty}`)
        }
      }
      else if (args.cmd === 'json') {
        const str = await bossJson()
        fulfill('```' +  str + '```')
      }
      else if (args.cmd === 'add') {
        chars.matchOne(async function (err:any, name:any) {
          if (err) {
            fulfill(err);
          } else {
            const fleet = await fleets.get(fleetId)
            await fleets.addBossExclude(fleetId, name)
            const msg = `Hi ${author}. ${name} will be excluded (with ${fleet.bossExclude.length} others)`;
            fulfill(msg);
          }
        }, args.arg1, args.arg2, args.arg3);
      }
      else if (args.cmd === 'help') {
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
      }
      else {
        const flags :BossCmdFlags = argv.flags
        flags.solve = true
        flags.summary = false

        const fleet = await fleets.get(fleetId)
        const crewdoc:CrewDoc = await crewdb.get(userid, context) ?? {_id: userid, username: author, crew: [], base:{}, prof:{}}
        const str = await reportBoss(fleet.bossDifficulty, crewdoc.crew, fleet.bossExclude, argv.flags)
        fulfill(str)
      }


    }
    catch (e) {
      console.error(JSON.stringify(e))
      fulfill(e?.message ?? e);
    }
  }),
  args: [{
    name: 'cmd',
    desc: `boss help for more information`,
    type: 'string',
    default: '',
    required: false
  },{
    name: 'arg1',
    desc: 'search criteria',
    type: 'string',
    default: '',
    required: false
  },{
    name: 'arg2',
    desc: 'search criteria',
    type: 'string',
    default: '',
    required: false
  },{
    name: 'arg3',
    desc: 'search criteria',
    type: 'string',
    default: '',
    required: false
  }],
  flags: [
    {
      name: 'node',
      desc: 'node to query',
      alias: 'n',
      type: 'number',
      default: 0 // falsey
    },
    {
      name: 'own',
      desc: 'tag owned crew',
      alias: 'o',
      type: 'boolean',
      default: false
    },
    {
      name: 'verbose',
      desc: 'increase verbosity of report',
      alias: 'v',
      type: 'boolean',
      default: false
    },
  ]
});
