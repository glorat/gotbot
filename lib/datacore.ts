import CONFIG from './dcmodel/CONFIG'
import { CrewMember } from './dcmodel/crew'
import * as fs from 'async-file'
import fetch from 'node-fetch'

export const STATIC_URL = `https://datacore.app/structured/`
export const DATACORE_ASSETS_URL = `https://assets.datacore.app/`

// Download raw Datacore crew.json as typed CrewMember[]
export async function downloadDataCoreCrew(): Promise<CrewMember[] | null> {
  const crewUrl = `${STATIC_URL}crew.json`
  const result = await fetch(crewUrl)

  if (!result.ok) {
    return null
  }

  const crew = (await result.json()) as CrewMember[]
  return crew
}

export function getShortNameFromTrait(
  trait: string,
  crewGroup: CrewMember[] | CrewMember,
  preferEnglish = true
) {
  switch (trait) {
    case 'dax':
      let daxname = ''
      if (Array.isArray(crewGroup)) {
        daxname =
          (preferEnglish ? crewGroup[0].short_name_english : '') ||
          crewGroup[0].short_name
      } else {
        daxname =
          (preferEnglish ? crewGroup.short_name_english : '') ||
          crewGroup.short_name
      }
      if (daxname === 'Ezri') return daxname
      return 'Dax'
    case 'tpring':
      return "T'Pring"
    case 'mbenga':
      return "M'Benga"
    case 'gburnham':
      return 'G. Burnham'
    case 'burnham':
      return 'M. Burnham'
    case 'mburnham_sr':
      return 'M. Burnham, Sr.'

    default:
      if (Array.isArray(crewGroup)) {
        return (
          (preferEnglish ? crewGroup[0].short_name_english : '') ||
          crewGroup[0].short_name
        )
      } else {
        return (
          (preferEnglish ? crewGroup.short_name_english : '') ||
          crewGroup.short_name
        )
      }
  }
}

export const crewVariantIgnore = ['sam_lavelle_crew', 'jack_crusher_crew']

export function getVariantTraits(subject: CrewMember | string[]): string[] {
  const ignore = [
    'female',
    'male',
    'artificial_life',
    'nonhuman',
    'organic',
    'species_8472',
    'admiral',
    'captain',
    'commander',
    'lieutenant_commander',
    'lieutenant',
    'ensign',
    'general',
    'nagus',
    'first_officer',
    'ageofsail',
    'bridge_crew',
    'evsuit',
    'gauntlet_jackpot',
    'mirror',
    'niners',
    'crewman',
    'crew_max_rarity_5',
    'crew_max_rarity_4',
    'crew_max_rarity_3',
    'crew_max_rarity_2',
    'crew_max_rarity_1',
  ]
  const ignoreRe = [
    /^exclusive_/ /* exclusive_ crew, e.g. bridge, collection, fusion, gauntlet, honorhall, voyage */,
    /^[a-z]{3}\d{4}$/ /* mega crew, e.g. feb2023 and apr2023 */,
    /^[a-z]{4}\d{4}$/ /* mega crew, e.g. june2024 and july2024 */,
  ]
  const variantTraits = [] as string[]

  if ('length' in subject) {
    subject.forEach((trait) => {
      if (
        !CONFIG.SERIES.includes(trait) &&
        !ignore.includes(trait) &&
        !ignoreRe.reduce((prev, curr) => prev || curr.test(trait), false)
      ) {
        variantTraits.push(trait)
      }
    })
  } else {
    subject.traits_hidden.forEach((trait) => {
      if (
        !CONFIG.SERIES.includes(trait) &&
        !ignore.includes(trait) &&
        !ignoreRe.reduce((prev, curr) => prev || curr.test(trait), false)
      ) {
        variantTraits.push(trait)
      }
    })
  }

  return variantTraits
}

async function main() {
  try {
    const rawCrew = await downloadDataCoreCrew()
    if (!rawCrew || !rawCrew.length) {
      console.log('No crew found from Datacore')
      return
    }

    await fs.writeFile('data/datacore-crew.json', JSON.stringify(rawCrew))
    console.log(
      `${rawCrew.length} Datacore crew written to data/datacore-crew.json`
    )
  } catch (e) {
    console.error('Error downloading Datacore crew', e)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // When executed via ts-node, perform download and caching into ./data
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main()
}
