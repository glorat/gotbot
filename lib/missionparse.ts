/* istanbul ignore file */
// This file is non-unit testable since it is shifting large amounts of data
'use strict'

import * as fs from 'async-file'
import { load } from 'cheerio'
import type { CheerioAPI, Cheerio } from 'cheerio'

const wikiurl = 'sttwiki.org'

interface MissionEntry {
  name: string
  wiki: string
  missiontype: string | null
  code?: string
  tables?: MissionTable[]
}

interface MissionTable {
  items: MissionItem[]
  level: string
  runs?: number
  cost?: number
}

interface MissionItem {
  name: string | undefined
  units: number
  stars: number
  qty: number
}

const wikidb = {
  missions: [] as MissionEntry[],
}

/** Almighty hack to prevent V8 from holding onto the mega string when parsing */
function copyString(original_string: string): string {
  return (' ' + original_string).slice(1)
}

function parseWikiMissionList(): Promise<void>[] {
  const subMissionNavs = ['MissionsNav', 'CCMissionNav']
  const missionLoadPromises = subMissionNavs.map((nav) => {
    const file = `data/${wikiurl}/wiki/Template:${nav}`
    return fs
      .readFile(file, 'utf8')
      .then(load)
      .then(function ($: CheerioAPI) {
        const episodePanel = $('#mw-content-text table tr td')
        episodePanel.each(function (_i: number, _elem: any) {
          $('a', this).each(function (_i: number, _elem: any) {
            wikidb.missions.push({
              name: $(this).attr('title') || '',
              wiki: $(this).attr('href') || '',
              missiontype: nav === 'CCMissionNav' ? 'Cadet' : null,
            })
          })
        })
      })
      .catch(function (e: Error) {
        throw e
      })
  })
  return missionLoadPromises
}

export function parseWikiMissions(): Promise<void> {
  const mlp = parseWikiMissionList()

  return Promise.all(mlp)
    .then(function () {
      console.log('Mission list loaded')
    })
    .then(function () {
      const all = wikidb.missions.map((entry) => {
        const file = `data/${wikiurl}/${decodeURI(entry.wiki)}`

        return fs
          .readFile(file, 'utf8')
          .then(load)
          .then(function (dom: CheerioAPI) {
            return parseMissionPage(dom, entry)
          })
          .catch(function (e: Error) {
            throw e
          })
      })
      return Promise.all(all)
    })
    .then(function () {
      console.log('All mission pages parsed')
      // Cache it
      fs.writeFile('data/missions.json', JSON.stringify(wikidb))
      console.log('missions written')
    })
}

const textFilter = function (this: any) {
  return this.type === 'text'
}

function parseMissionRow(row: Cheerio): MissionItem {
  const itemCell = row.find('td').eq(0)
  const item = itemCell.find('a')
  const itemMeta = itemCell.contents().filter(textFilter).text()
  const qtyRe = /\(x(\d+)\)/
  const qtyMatch = qtyRe.exec(itemMeta)
  let qty = 1 // Default drop one
  if (qtyMatch) {
    qty = parseInt(qtyMatch[1], 10)
  }
  const starRe = /(Basic|Common|Uncommon|Rare|Super Rare|Legendary)/m
  const starMatch = itemCell.text().match(starRe)
  const starStr = starMatch ? starMatch[1] : 'undefined'
  const starStrToStars: { [key: string]: number } = {
    Basic: 0,
    Common: 1,
    Uncommon: 2,
    Rare: 3,
    'Super Rare': 4,
    Legendary: 5,
    undefined: -1,
  }

  const units = row
    .find('td')
    .eq(1)
    .find('span')
    .first()
    .contents()
    .filter(textFilter)
    .text()

  return {
    name: copyString(item.attr('title') || ''),
    units: +units,
    stars: starStrToStars[starStr],
    qty: qty,
  }
}

function parseMissionTable(table: Cheerio): MissionTable {
  const level = table.find('img').first().attr('title') || ''

  const header = table.find('th').first().closest('tr')

  const sumrow = header.prev('tr')
  const sumre = /Runs:.*?(\d+).*?Cost\/Run:.*?(\d+)/m
  const summatch = sumrow.text().match(sumre)
  const ret: MissionTable = { items: [], level: copyString(level) }
  if (summatch) {
    ret.runs = +summatch[1]
    ret.cost = +summatch[2]
  } else {
    console.log(`    Unknown run detail`)
  }

  let row = header.next('tr')
  while (row && row.find('td').length === 4) {
    const item = parseMissionRow(row)
    ret.items.push(item)
    row = row.next('tr')
  }

  return ret
}

function removeAds($: CheerioAPI) {
  $('p').each(function () {
    if ($(this).find('script').length) {
      $(this).find('script').parent().remove()
    }
  })
}

function parseMissionPage($: CheerioAPI, entry: MissionEntry) {
  removeAds($)
  // Parse the mission code
  const codeBox = $('#mw-content-text table th b').filter(function () {
    return (
      $(this)
        .text()
        .replace(/[^\w-]/g, '')
        .toUpperCase()
        .match(entry.name.replace(/[^\w-]/g, '').toUpperCase()) !== null
    )
  })
  if (codeBox.length === 0) {
    entry.code = 'Unk'
  } else if (codeBox.length > 1) {
    throw 'selector for mission code not restrictive enough. code bug'
  } else {
    entry.code = codeBox
      .text()
      .replace(/[^\w-]/g, '')
      .toUpperCase()
      .replace(entry.name.replace(/[^\w-]/g, '').toUpperCase(), '')
      .trim()
  }
  const missionType = $('#mw-content-text table.infobox tr td')
    .has('b')
    .filter(function (_i: number, _elem: any) {
      return $(this).text().match('Type') !== null
    })
    .text()
    .replace(/.*(Away|Space).*/g, '$1')
    .trim()
  if (entry.missiontype !== 'Cadet') {
    entry.missiontype = missionType
  }

  // Parse the drop tables
  const tables: MissionTable[] = []
  entry.tables = tables
  const dropHeader = $('.mw-headline')
    .filter(function () {
      return $(this).text().match('Drop') !== null
    })
    .first()
  if (dropHeader.length === 1) {
    console.log(dropHeader.text() + ' ' + entry.name)
    const dropDiv = dropHeader.parent().next()
    const dropTables = dropDiv.find('table')
    if (dropTables.length === 3) {
      dropTables.each(function (_i: number, el: any) {
        tables.push(parseMissionTable($(el)))
      })
      entry.tables = tables
    }
  } else {
    console.log('***Empty ' + entry.name)
  }
}

export { wikidb }
