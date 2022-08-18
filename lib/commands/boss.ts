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

async function parseBossJson() {
  const bossJson = await fs.readFile(cfg.dataPath + 'boss.json')
  const boss = JSON.parse(bossJson)
  const out:any = []
  boss.statuses.forEach( (level:any) => {
    if (level.hp && level.hp>0 && level.combo) {
      out.push({symbol: level.symbol, difficulty_id: level.difficulty_id, nodes: level.combo.nodes, traits: level.combo.traits})
    }
  })
  await fs.writeFile(cfg.dataPath + 'boss2.json', JSON.stringify(out));
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

function reportBossLevelChars(crew: Char[], recs: any[], strs: string[], excludeChar: string[]) {
  function nameToPrefix(name: string): string {
    const m = crew.find(c => c.name === name)
    if (m) {
      return m.vaulted ? '*' : '**'
    } else {
      return '-'
    }
  }

  strs.push('ELIGIBLE CREW PRIORITY')

  const maxToReport = 30
  const recsToReport = recs.slice(0,maxToReport)
  const table = createDefaultTable()
  table.push(['own', 'name', 'N', 'O', 'Score'])

  recsToReport.forEach(rec => {
    const nodes = rec.reqMatchNodes.map( (x:number) => `N${x+1}`).join(' ')
    const opts = rec.optMatchNodes.map( (x:number) => `O${x+1}`).join(' ')
    table.push([nameToPrefix(rec.name), rec.name, nodes, opts, rec.score.toFixed(2)])
    //strs.push(`${nameToPrefix(rec.name)}${rec.name} ${nodes} +${rec.optMatches} ${rec.score.toFixed(2)}`)
  })
  strs.push(table.toString())
  let summary = `Showing ${recsToReport.length} of ${recs.length} eligible`
  if (excludeChar.length > 0) {
    summary =  summary + `, ${excludeChar.length} excluded by fleet member`
  }
  strs.push(summary)
}

function reportBossLevel(strs: string[], level: BossData, excludeChar: string[], crew: Char[], flags: {node?:number}) {

  const requiredTraits: string[] = []
  const completedTraits: string[] = []

  // Determine required traits
  level.nodes.forEach( (node,idx) => {
    if (node.unlocked_character) {
      node.hidden_traits.forEach(t => completedTraits.push(t))
    } else {
      requiredTraits.push(node.open_traits[0])
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



  const allCrewOrig: CharInfo[] = chars.allCrewEntries()
  // Apply exclusion
  let allCrew = allCrewOrig.filter(c => !excludeChar.includes(c.name))
  // allCrew = allCrew.slice(0,10)
  let recs: any[] = []
  allCrew.forEach((crew: CharInfo) => {
    let reqMatches = 0
    let reqMatchNodes:number[] = []
    let optMatches = 0
    let optMatchNodes:number[] = []
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
      if (traits.includes(node.open_traits[0])  && !node.unlocked_character) {
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
        optMatchNodes
      }
      recs.push(rec)
    }
  })
  // Filter further by excluding crew that have subset of traits of existing excluded crew
  excludeChar.forEach(ex => {
    console.log(`Processing ${ex} for further exclusion`)
  })


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
    rec.reqMatchNodes.forEach( (nodeIdx:number) => {
      score += 1/nodeTotalHits[nodeIdx]
    })
    rec.score = score
  })



  // Apply filter and sort after all calculations
  if (flags.node){
    recs = recs.filter(rec => rec.reqMatchNodes.includes(flags.node!-1))

  }
  recs.sort((a, b) => (b.score - a.score))

  // Report required traits
  strs.push(`${level.symbol} (${level.difficulty_id})`)
  requiredTraits.forEach((trait, idx) => {
    strs.push(`   N${idx+1} ${trait}`)
  })
  strs.push('OTHER TRAITS')
  strs.push('   ' + possibleTraits.join(', '))
  strs.push(`Matches per node: ${nodeTotalHits.join(',')}`)
  reportBossLevelChars(crew, recs, strs, excludeChar);
}

async function reportBoss(difficulty_id:number, crew: Char[], excludeChar: string[], flags: {node?:number}) {
  const dataJson = await bossJson()
  const data:BossData[] = JSON.parse(dataJson)
  const strs:string[] = []

  const level = data.find( (rec:any) => rec.difficulty_id == difficulty_id)
  if (level) {
    reportBossLevel(strs, level, excludeChar, crew, flags);


  } else {
    strs.push(`No boss battle at difficulty ${difficulty_id}`)
  }


  // const data = JSON.parse(dataJson)
  const str = '```' + strs.join('\n') + '```'
  return str

}

module.exports = new Clapp.Command({
  name: 'boss',
  desc: 'boss battle calculator',

// Command function
  fn: (argv:any, context:API.Context) => new Promise(async (fulfill) => {
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
      else if (args.cmd === 'difficulty') {
        const diff = parseInt(args.arg1)
        if (diff) {
          await fleets.setBossDifficulty(fleetId, diff)
          fulfill(`Setting boss difficulty to ${diff}`)
        } else {
          const fleet = await fleets.get(fleetId)
          fulfill(`Fleet boss difficulty is at ${fleet.bossDifficulty}`)
        }


      }
      else if (args.cmd === 'refresh') {
        await downloadBossBattles()
        await parseBossJson()
        fulfill('Refreshed')
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
                 *RUN THIS AFTER YOU TRY A CREW*
reset          - Reset exclusion list
                 *RUN RESET WHEN NEW CHAIN STARTS*
refresh        - Reload boss battle status
                 *RUN REFRESH AFTER NODE IS HIT*
difficulty [n] - Our focussed level
                 *CHANGE THIS IF WE SWITCH DIFFICULTY*
json           - Debug information`
        fulfill('```' + str + '```')
      }
      else {
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
  ]
});
