const chars = require('./chars');
import {Char, CharInfo} from "./chars";
import {createDefaultTable} from "./utils";
import * as fs from "async-file";
import cfg from "../config";
import * as _ from "underscore";
import STTApiLite from "./modules/STTApiLite/lib/STTApiLite";
const fleets = require('./fleetdb');

export interface BossCmdFlags {
  node?: number
  verbose?: boolean
  summary?: boolean
  solve?: boolean
  own: boolean
}

async function downloadBossBattles() {
  let password = require(cfg.dataPath + 'password');

  let STTApi = new STTApiLite();

  let token = password.stttoken ? password.stttoken
    : await STTApi.login(password.sttuser, password.sttpass, true);

  await STTApi.loginWithToken(token);

  console.log('Using OAuth token ' + token);

  let boss = await STTApi.executeGetRequest('fleet_boss_battles/refresh');
  await fs.writeFile(cfg.dataPath + 'boss.json', JSON.stringify(boss.fleet_boss_battles_root));
}

async function parseBossJson(): Promise<BossData[]> {
  const bossJson = await fs.readFile(cfg.dataPath + 'boss.json')
  const boss = JSON.parse(bossJson)
  const out: BossData[] = []
  boss.statuses.forEach((level: any) => {
    if (level.hp && level.hp > 0 && level.combo) {
      out.push({
        symbol: level.symbol,
        difficulty_id: level.difficulty_id,
        nodes: level.combo.nodes,
        traits: level.combo.traits,
        id: level.id,
        hp: level.hp,
        ends_in: level.ends_in
      })
    }
  })
  await fs.writeFile(cfg.dataPath + 'boss2.json', JSON.stringify(out));
  return out;
}

export async function bossJson() {
  const dataJson = await fs.readFile(cfg.dataPath + 'boss2.json')
  return dataJson
}

interface BossData {
  difficulty_id: number
  symbol: string
  traits: string[]
  nodes: { open_traits: string[], hidden_traits: string[], unlocked_character: any }[]
  id: number
  ends_in: number
  hp: number

}

function reportBossLevelChars(crew: Char[], nodeTotalHits: number[], recs: any[], strs: string[], excludeChar: string[], narvinExcluded: { reqMatches: number; reqMatchNodes: number[]; name: string; optMatches: number; optMatchNodes: number[]; score: number }[], flags: BossCmdFlags) {
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
  const recsToReport = recs.slice(0, maxToReport)
  const table = createDefaultTable()
  const cols = ['NAME', 'N', 'O', 'SCORE']
  if (flags.own) cols.unshift('OWN')
  table.push(cols)

  recsToReport.forEach(rec => {
    const nodes = rec.reqMatchNodes.map((x: number) => `N${x + 1}`).join(' ')
    const opts = rec.optMatchNodes.map((x: number) => `O${x + 1}`).join(' ')
    const row = [rec.name, nodes, opts, rec.score.toFixed(3)]
    if (flags.own) row.unshift(nameToPrefix(rec.name))
    table.push(row)
    //strs.push(`${nameToPrefix(rec.name)}${rec.name} ${nodes} +${rec.optMatches} ${rec.score.toFixed(2)}`)
  })
  strs.push(table.toString())

  strs.push(`Matches per node: ${nodeTotalHits.join(',')}`)
  let summary = `Showing ${recsToReport.length} of ${recs.length} eligible`
  if (excludeChar.length > 0) {
    summary = summary + `, ${excludeChar.length} excluded by fleet, ${narvinExcluded.length} by Narvin`
  }
  strs.push(summary)

  if (flags.verbose) {
    strs.push('FLEET EXCLUDED: ' + excludeChar.join(', '))
    strs.push('NARVIN EXCLUDED: ' + narvinExcluded.map(x => x.name).join(', '))
  }
}

// Returns true if superset including equal
function recIsSupersetOf(ex: { reqMatches: number; reqMatchNodes: number[]; name: string; optMatches: number; optMatchNodes: number[]; score: number }, rec: { reqMatches: number; reqMatchNodes: number[]; name: string; optMatches: number; optMatchNodes: number[]; score: number }): boolean {
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
  strs.push(`${level.hp.toLocaleString()} hull remaining`)
  strs.push(`${(level.ends_in / 60).toFixed(0)} minutes remaining`)

  level.nodes.forEach((node, idx) => {
    if (!node.unlocked_character) {
      strs.push(`   N${idx + 1} ${node.open_traits.join(', ')}`)
    }
  })
  strs.push('OTHER TRAITS')
  strs.push('   ' + possibleTraits.join(', '))
}

function isSubsetOf(lhs: string[], rhs: string[]) {
  return _.all(lhs, x => rhs.includes(x))
}

// todo: write tests that this preserves order
function combinations(arr: string[], n: number): string[][] {
  if (n == 0) {
    return []
  }
  if (n == 1) {
    return arr.map(x => [x])
  }

  let result: string[][] = []
  let prefixes: string[][] = []

  arr.forEach(x => {
    let newPrefixes = [[x]]
    prefixes.forEach(prefix => {
      newPrefixes.push(_.clone(prefix))
      prefix.push(x)
      if (prefix.length == n) {
        result.push(prefix)
      } else {
        newPrefixes.push(prefix)
      }
    })
    prefixes = newPrefixes
  })

  return result
}

function computeBossSolution(level: BossData, possibleTraits: string[], excludeChar: string[], flags: BossCmdFlags) {
  const difficultToMaxStars = [0, 2, 3, 4, 4, 5, 5]
  const myMaxStars = difficultToMaxStars[level.difficulty_id]
  let allCrew: CharInfo[] = chars.allCrewEntries().filter((c: CharInfo) => c.stars <= myMaxStars)
  let excludeCrew = allCrew.filter(crew => excludeChar.includes(crew.name))

  let initialRecs = new Map<string, { reqMatchNodes: number[]; optMatchTraits: string[]; }>()

  // Find all potential solutions for each node
  let nodes = level.nodes.map((node, nodeIdx) => {
    if (node.unlocked_character) {
      // skip, node is already solved
      // console.log(`init: skip node ${node.unlocked_character}`)
      let solutions = new Map<string, CharInfo[]>()
      solutions.set(node.hidden_traits.join(":"), [])
      return {
        solutions,
        unlocked_character: node.unlocked_character,
        open_traits: node.open_traits,
        hidden_traits: node.hidden_traits,
        solved_traits: ([] as string[])
      }
    }

    // map from "list of traits that can be solution for hidden part" to "list of crew who would match this solution"
    // we use string of traits joined by ':' because map doesn't allow string[] as keys
    let solutions = new Map<string, CharInfo[]>()
    allCrew.forEach(crew => {
      // console.log(`checking crew ${crew.name}`)
      if (!isSubsetOf(node.open_traits, crew.traits_int)) {
        // skip, crew doesn't match required traits
        // console.log(`checking crew ${crew.name}: not subset`)
        return
      }

      let traits = _.intersection(crew.traits_int, possibleTraits)
      // console.log(`checking crew ${crew.name} traits ${traits}`)
      if (traits.length < node.hidden_traits.length) {
        // skip, not enough crew traits are in possible list to solve the node
        // console.log(`checking crew ${crew.name}: not enough`)
        return
      }

      traits.sort() // sort, we rely on traits order for map keys
      combinations(traits, node.hidden_traits.length).forEach(hiddenPart => {
        // console.log(`init: node ${node.open_traits} crew ${crew.name} adding ${hiddenPart}`)
        let solutionKey = hiddenPart.join(":")
        let matches = solutions.get(solutionKey) || []
        matches.push(crew)
        solutions.set(solutionKey, matches)
      })

      // save crew to calculate `narvinExcluded` later
      let initialRec = initialRecs.get(crew.name) || {
        reqMatchNodes: [] as number[],
        optMatchTraits: [] as string[] 
      }
      initialRec.reqMatchNodes = _.union(initialRec.reqMatchNodes, [nodeIdx])
      initialRec.optMatchTraits = _.union(initialRec.optMatchTraits, traits)
      initialRecs.set(crew.name, initialRec)
    })

    // prune solutions
    Array.from(solutions).forEach(([solutionKey, crewList]) => {
      // console.log(`prune: checking ${solutionKey} ${crewList.map(it => it.name)}`)

      // exclude solutions with only one crew
      // todo: change to "if only one crew in portal"
      if (crewList.length === 1) {
        // console.log(`prune: pruned by one crew rule`)
        solutions.delete(solutionKey)
        return
      }

      // exclude if traits are covered by an already attempted crew
      // todo: also do this check for crew that are `unlocked_character` for other nodes
      let hiddenPart = solutionKey.split(":")
      if (_.any(excludeCrew, crew => isSubsetOf(_.union(node.open_traits, hiddenPart), crew.traits_int))) {
        // console.log(`prune: pruned by excludeCrew`)
        solutions.delete(solutionKey)
        return
      }
    });

    return {
      solutions,
      unlocked_character: node.unlocked_character,
      open_traits: node.open_traits,
      hidden_traits: node.hidden_traits,
      solved_traits: []
    }
  })

  let uneliminatedTraits = _.clone(possibleTraits)
  while (true) {
    let changed = false

    nodes.forEach(node => {
      if (node.unlocked_character) {
        // skip, node is fully solved and all traits were removed from `possibleTraits` in advance
        return
      }

      // solved traits are removed from uneliminatedTrais, add them back for this node
      let nodePossibleTraits = uneliminatedTraits.concat(node.solved_traits)

      let newSolutions = new Map([...node.solutions].filter(([solutionKey, crew]) => isSubsetOf(solutionKey.split(':'), nodePossibleTraits)))

      // todo: it might be possible to add early return here if nothing changed, except on the first iteration we expect no change in solutions

      let hiddenParts = [...newSolutions.keys()].map(solutionKey => solutionKey.split(":"))
      let newSolvedTraits = _.intersection(...hiddenParts)
      // keep only traits that must be part of solution, but weren't added to `solved_traits` yet
      let newUneliminatedSolvedTraits = _.intersection(uneliminatedTraits, newSolvedTraits)

      if (newUneliminatedSolvedTraits.length === 0) {
        return
      }
      // console.log(`New solved traits ${newUneliminatedSolvedTraits}`)

      changed = true
      node.solutions = newSolutions
      node.solved_traits = node.solved_traits.concat(newUneliminatedSolvedTraits)

      // delete only first occurence of trait in case it's a duplicate trait
      newUneliminatedSolvedTraits.forEach(trait => {
        let idx = uneliminatedTraits.indexOf(trait)
        if (idx >= 0) {
          uneliminatedTraits.splice(idx, 1)
        } else {
          console.log(`added ${trait} to solved, but it's not in uneliminatedTraits`)
        }
      })
    })

    if (!changed) {
      break
    }
  }

  let recsMap = new Map<string, { hiddenMatches: string[], nodeMatches: number[] }>()
  nodes.forEach((node, idx) => {
    node.solutions.forEach((crews, hiddenPart) => {
      crews.forEach(crew => {
        let rec = recsMap.get(crew.name) || {
          hiddenMatches: [] as string[],
          nodeMatches: [] as number[],
        }

        rec.nodeMatches = _.union(rec.nodeMatches, [idx])
        rec.hiddenMatches = _.union(rec.hiddenMatches, hiddenPart.split(":"))

        recsMap.set(crew.name, rec)
      });
    })
  })

  let recs: { reqMatches: number; reqMatchNodes: number[]; name: string; optMatches: number; optMatchNodes: number[], score: number }[] = []
  recsMap.forEach((rec, name) => {
    let optMatchNodes = rec.hiddenMatches.map(trait => possibleTraits.indexOf(trait))
    rec.nodeMatches.sort((a, b) => a - b)
    optMatchNodes.sort((a, b) => a - b)
    recs.push({
      name: name,
      reqMatches: rec.nodeMatches.length,
      reqMatchNodes: rec.nodeMatches,
      optMatches: optMatchNodes.length,
      optMatchNodes,
      score: 0.0
    })
  })

  let narvinExcluded: { reqMatches: number; reqMatchNodes: number[]; name: string; optMatches: number; optMatchNodes: number[]; score: number; }[] = []
  initialRecs.forEach((initialRec, name) => {
    if (!recsMap.has(name)) {
      let optMatchNodes = initialRec.optMatchTraits.map(trait => possibleTraits.indexOf(trait))
      narvinExcluded.push({ 
        name,
        reqMatches: initialRec.reqMatchNodes.length,
        reqMatchNodes: initialRec.reqMatchNodes,
        optMatches: initialRec.optMatchTraits.length,
        optMatchNodes,
        score: 0
      })
    }
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

    const dupeOpts = _.filter(level.traits, (val, i, iteratee) => _.includes(iteratee, val, i + 1))

    // Nodes come in alphabetical order so penalise if not enougn
    // optional traits are before the required traits
    if (rec.reqMatchNodes.length == 1) {
      // If exactly one match, eligible for alphabetical penalisation
      const node = level.nodes[rec.reqMatchNodes[0]]
      const reqNames = node.open_traits
      const optNames = rec.optMatchNodes.map(i => possibleTraits[i])
      // console.log(`${rec.name} has ${optNames}`)
      const validOptNames = optNames.filter(nm => _.all(reqNames, reqNm => reqNm.localeCompare(nm)==-1))
      if (validOptNames.length < node.hidden_traits.length) {
        console.log(`Penalise ${rec.name} on node ${node.open_traits} against ${optNames}`)
        score -= 0.5
      } else {
        // But if we are hitting a dupe opt, we get a bonus
        if (_.any(optNames, nm => dupeOpts.includes(nm))) {
          console.log(`Bonus ${rec.name} as ${optNames} hits ${dupeOpts}`)
          score += 0.1
        }
      }
    }

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

export async function reportBoss(difficulty_id: number, crew: Char[], excludeChar: string[], flags: BossCmdFlags) {
  const dataJson = await bossJson()
  const data: BossData[] = JSON.parse(dataJson)
  const strs: string[] = []

  const level = data.find((rec: any) => rec.difficulty_id == difficulty_id)
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

export async function refreshBossBattleData(fleetId: string) {
  await downloadBossBattles()
  const bossData = await parseBossJson()
  const fleet = await fleets.get(fleetId)
  const before = fleet.bossSpec

  const level = bossData.find((rec: any) => rec.difficulty_id == fleet.bossDifficulty)
  const after = level?.traits ?? []

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
