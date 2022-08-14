import * as API from '../Interfaces';
const Clapp = require('../modules/clapp-discord');


import * as _ from 'underscore';
//import {allCrewEntries} from "../chars";
import cfg from "../../config";
import STTApiLite from "../modules/STTApiLite/lib/STTApiLite";
import * as fs from "async-file";
import {Char, CharInfo, CrewDoc} from "../chars";
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

  recs.forEach(rec => {

    strs.push(`${nameToPrefix(rec.name)}${rec.name} ${rec.reqMatches} ${rec.optMatches}`)
  })
  if (excludeChar.length > 0) {
    strs.push(`${excludeChar.length} crew excluded by fleet member`)
  }
}

function reportBossLevel(strs: string[], level: BossData, excludeChar: string[], crew: Char[]) {
  strs.push(`${level.symbol} (${level.difficulty_id})`)
  const requiredTraits: string[] = []
  const completedTraits: string[] = []

  level.nodes.forEach(node => {
    if (node.unlocked_character) {
      node.hidden_traits.forEach(t => completedTraits.push(t))
      // strs.push(`   [${node.open_traits[0]}] (${completedTraits.join(',')})`)
    } else {
      requiredTraits.push(node.open_traits[0])
      strs.push(`   ${node.open_traits[0]}`)
    }
  })
  //
  // level.nodes.forEach( (node:any, i:number) => {
  //   strs.push(`NODE ${i}`)
  //   strs.push(`   ${node.open_traits.join(',')}`)
  //   if (node.unlocked_character) {
  //     strs.push(`   (${node.hidden_traits.join(',')})`)
  //   }
  // })
  strs.push('OTHER TRAITS')
  const possibleTraits = _.clone(level.traits)
  // Remove existing hits
  completedTraits.forEach(toExclude => {
    const idx = possibleTraits.indexOf(toExclude)
    if (idx > -1) {
      possibleTraits.splice(idx, 1)
    }
  })

  possibleTraits.forEach((trait: string) => {
    strs.push(`  ${trait}`)
  })


  const allCrewOrig: CharInfo[] = chars.allCrewEntries()
  // Apply exclusion
  let allCrew = allCrewOrig.filter(c => !excludeChar.includes(c.name))
  // allCrew = allCrew.slice(0,10)
  const recs: any[] = []
  allCrew.forEach((crew: CharInfo) => {
    let reqMatches = 0
    let optMatches = 0
    const traits = crew.traits_int
    console.log(traits.join(':'))
    requiredTraits.forEach((reqTrait: string) => {
      if (traits.includes(reqTrait)) {
        reqMatches++
      }
    })
    const matchOptTraits: string[] = []
    possibleTraits.forEach((reqTrait: string) => {
      // The second part of the if clause is to cater for dupe opt traits
      if (traits.includes(reqTrait) && !matchOptTraits.includes(reqTrait)) {
        matchOptTraits.push(reqTrait)
        optMatches++
      }
    })
    if (reqMatches > 0 && optMatches > 1) {
      const rec = {
        name: crew.name,
        reqMatches,
        optMatches,
      }
      recs.push(rec)
    }
  })

  recs.sort((a, b) => (b.reqMatches - a.reqMatches) || (b.optMatches - a.optMatches))
  reportBossLevelChars(crew, recs, strs, excludeChar);
}

async function reportBoss(difficulty_id:number, crew: Char[], excludeChar: string[]) {
  const dataJson = await bossJson()
  const data:BossData[] = JSON.parse(dataJson)
  const strs:string[] = []

  const level = data.find( (rec:any) => rec.difficulty_id == difficulty_id)
  if (level) {
    reportBossLevel(strs, level, excludeChar, crew);


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
                 ** matching crew in vaule
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
        const str = await reportBoss(fleet.bossDifficulty, crewdoc.crew, fleet.bossExclude)
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
  }]
});
