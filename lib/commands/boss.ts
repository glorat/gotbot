import * as API from '../Interfaces';
const Clapp = require('../modules/clapp-discord');


import * as _ from 'underscore';
//import {allCrewEntries} from "../chars";
import cfg from "../../config";
import STTApiLite from "../modules/STTApiLite/lib/STTApiLite";
import * as fs from "async-file";
import {Char, CharInfo, CrewDoc} from "../chars";
import {createDefaultTable} from "../utils";
const crewdb = require('../crewdb.js');
const chars = require('../chars.js');
// const crewdb = require('../crewdb.js');
const fleets = require('../fleetdb.js');

interface BossCmdFlags {
  node?: number
  verbose?: boolean
  summary?: boolean
  solve?: boolean
  own: boolean
}
//const voyageSkills = ['cmd','dip','sec','eng','sci','med'];

async function downloadBossBattles() {
  let password = require(cfg.dataPath + 'password');

  let STTApi = new STTApiLite();

  let token = password.stttoken ? password.stttoken
    : await STTApi.login(password.sttuser, password.sttpass,true);

  await STTApi.loginWithToken(token);

  console.log('Using OAuth token ' + token);

  let boss = await STTApi.executeGetRequest('fleet_boss_battles/refresh');
  await fs.writeFile(cfg.dataPath + 'boss.json', JSON.stringify(boss.fleet_boss_battles_root));
}

async function parseBossJson(): Promise<BossData[]> {
  const bossJson = await fs.readFile(cfg.dataPath + 'boss.json')
  const boss = JSON.parse(bossJson)
  const out:BossData[] = []
  boss.statuses.forEach( (level:any) => {
    if (level.hp && level.hp>0 && level.combo) {
      out.push({symbol: level.symbol, difficulty_id: level.difficulty_id, nodes: level.combo.nodes, traits: level.combo.traits})
    }
  })
  await fs.writeFile(cfg.dataPath + 'boss2.json', JSON.stringify(out));
  return out;
}

async function bossJson() {
  const dataJson = await fs.readFile(cfg.dataPath + 'boss2.json')
  return dataJson
}

interface BossData {
  difficulty_id: number
  symbol: string
  traits: string[]
  nodes: { open_traits:string[], hidden_traits:string[], unlocked_character:any }[]
}

function reportBossLevelChars(crew: Char[], nodeTotalHits:number[], recs: any[], strs: string[], excludeChar: string[], narvinExcluded: { reqMatches: number; reqMatchNodes: number[]; name: string; optMatches: number; optMatchNodes: number[]; score: number }[], flags: BossCmdFlags) {
  function nameToPrefix(name: string): string {
    const m = crew.find(c => c.name === name)
    if (m) {
      return m.vaulted ? '*' : '**'
    } else {
      return '-'
    }
  }

  // Report fewer if verbose due to display limit
  const maxToReport = flags.verbose ? 10 : 25 // TODO: Make this a flag
  const recsToReport = recs.slice(0,maxToReport)
  const table = createDefaultTable()
  const cols = ['NAME', 'N', 'O', 'SCORE']
  if (flags.own) cols.unshift('OWN')
  table.push(cols)

  recsToReport.forEach(rec => {
    const nodes = rec.reqMatchNodes.map( (x:number) => `N${x+1}`).join(' ')
    const opts = rec.optMatchNodes.map( (x:number) => `O${x+1}`).join(' ')
    const row = [rec.name, nodes, opts, rec.score.toFixed(3)]
    if (flags.own) row.unshift(nameToPrefix(rec.name))
    table.push(row)
    //strs.push(`${nameToPrefix(rec.name)}${rec.name} ${nodes} +${rec.optMatches} ${rec.score.toFixed(2)}`)
  })
  strs.push(table.toString())

  strs.push(`Matches per node: ${nodeTotalHits.join(',')}`)
  let summary = `Showing ${recsToReport.length} of ${recs.length} eligible`
  if (excludeChar.length > 0) {
    summary =  summary + `, ${excludeChar.length} excluded by fleet, ${narvinExcluded.length} by Narvin`
  }
  strs.push(summary)

  if (flags.verbose) {
    strs.push('FLEET EXCLUDED: ' + excludeChar.join(', '))
    strs.push('NARVIN EXCLUDED: ' + narvinExcluded.map(x => x.name).join(', '))
  }
}

// Returns true if superset including equal
function recIsSupersetOf(ex: { reqMatches: number; reqMatchNodes: number[]; name: string; optMatches: number; optMatchNodes: number[]; score: number }, rec: { reqMatches: number; reqMatchNodes: number[]; name: string; optMatches: number; optMatchNodes: number[]; score: number }):boolean {
  // Supersetted if all of rec's nodes are in ex
  return _.all(rec.reqMatchNodes, (reqId) => {
    // Is also hitting that same node
    if (ex.reqMatchNodes.includes(reqId)) {
      // console.log(`${rec.name} also hits N${idx+1} with ${rec.optMatchNodes}`)
      // all optional nodes are included in excluded crew
      if (_.all(rec.optMatchNodes, opt => ex.optMatchNodes.includes(opt))) {
        // console.log(`Narvin excluding ${rec.name}`)
        return true
      }
    }
    return false
  })
}


function reportBossSummary(strs: string[], level: BossData, possibleTraits: string[]) {
  // Report required traits
  strs.push(`${level.symbol} (${level.difficulty_id})`)

  level.nodes.forEach((node, idx) => {
    if (!node.unlocked_character) {
      strs.push(`   N${idx + 1} ${node.open_traits[0]}`)
    }
  })
  strs.push('OTHER TRAITS')
  strs.push('   ' + possibleTraits.join(', '))
}

function computeBossSolution(level: BossData, possibleTraits: string[], excludeChar: string[], flags: BossCmdFlags) {
  const difficultToMaxStars = [0, 2, 3, 4, 4, 5, 5]
  const myMaxStars = difficultToMaxStars[level.difficulty_id]
  let allCrew = chars.allCrewEntries().filter((c: CharInfo) => c.stars <= myMaxStars)
  // allCrew = allCrew.slice(0,10)
  let recs: { reqMatches: number; reqMatchNodes: number[]; name: string; optMatches: number; optMatchNodes: number[], score: number }[] = []
  allCrew.forEach((crew: CharInfo) => {
    let reqMatches = 0
    let reqMatchNodes: number[] = []
    let optMatches = 0
    let optMatchNodes: number[] = []
    const traits = crew.traits_int
    // console.log(traits.join(':'))
    const matchOptTraits: string[] = []
    possibleTraits.forEach((reqTrait: string, idx) => {
      // The second part of the if clause is to cater for dupe opt traits
      if (traits.includes(reqTrait) && !matchOptTraits.includes(reqTrait)) {
        matchOptTraits.push(reqTrait)
        optMatchNodes.push(idx)
        optMatches++
      }
    })

    level.nodes.forEach((node, idx) => {
      // We match the node trait and it is not yet unlocked
      if (traits.includes(node.open_traits[0]) && !node.unlocked_character) {
        // Need to have enough optional traits
        if (optMatches >= node.hidden_traits.length) {
          reqMatches++
          reqMatchNodes.push(idx)
        }
      }
    })

    if (reqMatches > 0 && optMatches > 0) {
      const rec = {
        name: crew.name,
        reqMatches,
        optMatches,
        reqMatchNodes,
        optMatchNodes,
        score: 0.0
      }
      recs.push(rec)
    }
  })
  // Exclude rows that have already been hit
  let excludedCrew = recs.filter(c => excludeChar.includes(c.name))
  recs = recs.filter(c => !excludeChar.includes(c.name))

  // Filter further by excluding crew that have subset of traits of existing excluded crew
  let beforeNarvin = recs
  excludedCrew.forEach(ex => {
    // Compare excluded crew against all other crew
    recs = recs.filter(rec => !recIsSupersetOf(ex, rec))
  })

  const narvinExcluded = beforeNarvin.filter(rec => !recs.map(x => x.name).includes(rec.name))
  narvinExcluded.forEach(rec => console.log(`Narvin excluded ${rec.name}`))

  // Apply a scoring to the crew
  const nodeTotalHits = level.nodes.map((node, idx) => {
    let nodeHits = 0
    recs.forEach(rec => {
      if (rec.reqMatchNodes.includes(idx)) {
        nodeHits++
      }
    })
    return nodeHits
  })
  // Compute some probability of success for each crw
  recs.forEach(rec => {
    let score = 0.0
    // Compute sum of expected probability of hitting each node
    rec.reqMatchNodes.forEach((nodeIdx: number) => {
      score += 1 / nodeTotalHits[nodeIdx]
    })

    recs.forEach(rec2 => {
      // Strictly superset (not equal!)
      if (recIsSupersetOf(rec2, rec) && !_.isEqual(rec2.optMatchNodes, rec.optMatchNodes)) {
        // Big penality if you're supersetted by other eligible crew
        // console.log(`Applying penality to ${rec.name} due to ${rec2.name}`)
        score -= 0.1
      }
    })

    // Prioritise hitting many optional nodes (for narvin exclusion)
    score += rec.optMatchNodes.length / 1000
    // TODO: an improvement on the above is to prioritise the number of narvin exclusions
    // but this would be a slower algo with only marginal benefit

    rec.score = score
  })


  // Apply filter and sort after all calculations
  if (flags.node) {
    recs = recs.filter(rec => rec.reqMatchNodes.includes(flags.node! - 1))

  }

  // Sort by desc score, then by opt nodes so that they are grouped together
  recs.sort((a, b) =>
    (b.score - a.score) ||
    a.optMatchNodes.join('').localeCompare(b.optMatchNodes.join(''))
  )
  return {recs, narvinExcluded, nodeTotalHits};
}

function computeBossSummary(level: BossData) {
  const completedTraits: string[] = []

  // Determine optional traits
  level.nodes.forEach((node, idx) => {
    if (node.unlocked_character) {
      node.hidden_traits.forEach(t => completedTraits.push(t))
    }
  })

  const possibleTraits = _.clone(level.traits)
  // Remove existing hits
  completedTraits.forEach(toExclude => {
    const idx = possibleTraits.indexOf(toExclude)
    if (idx > -1) {
      possibleTraits.splice(idx, 1)
    }
  })
  return possibleTraits;
}

async function reportBoss(difficulty_id:number, crew: Char[], excludeChar: string[], flags: BossCmdFlags) {
  const dataJson = await bossJson()
  const data:BossData[] = JSON.parse(dataJson)
  const strs:string[] = []

  const level = data.find( (rec:any) => rec.difficulty_id == difficulty_id)
  if (level) {
    const possibleTraits = computeBossSummary(level);
    if (flags.summary) {
      reportBossSummary(strs, level, possibleTraits);
    }
    if (flags.solve) {
      let {recs, narvinExcluded, nodeTotalHits} = computeBossSolution(level, possibleTraits, excludeChar, flags);
      reportBossLevelChars(crew, nodeTotalHits, recs, strs, excludeChar, narvinExcluded, flags);
    }
  } else {
    strs.push(`No boss battle at difficulty ${difficulty_id}`)
  }


  // const data = JSON.parse(dataJson)
  const str = '```' + strs.join('\n') + '```'
  return str

}

async function refreshBossBattleData(fleetId: string) {
  await downloadBossBattles()
  const bossData = await parseBossJson()
  const fleet = await fleets.get(fleetId)
  const before = fleet.bossSpec
  const after = bossData[fleet.bossDifficulty]?.traits ?? []

  if (_.isEqual(before, after)) {
    // TODO: if open_traits have changed, auto reset exclude list
    return ('Refreshed')
  } else {
    console.log(`Updating spec to ${after}`)
    await fleets.refreshBossSpec(fleetId, after)
    await fleets.resetBossExclude(fleetId)
    return ('Refreshed and resetting for new chain')
  }
}

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
      fulfill(e);
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
