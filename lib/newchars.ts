/* istanbul ignore file */

import * as fs from 'fs/promises'
import * as _ from 'underscore'
import { load } from 'cheerio'
import type { CheerioAPI } from 'cheerio'
import { execSync } from 'child_process'
import morecrew from '../client/morecrew.json' assert { type: 'json' }

const cmd =
  "wget -O 'data/sttwiki.org/newpages.html' https://sttwiki.org/w/index.php?title=Special:NewPages"
const shell = execSync
shell(cmd)

const file = `data/sttwiki.org/newpages.html`
fs.readFile(file, 'utf8')
  .then(load)
  .then(function ($: CheerioAPI) {
    const crewlinks = $('ul li')
    let newCrew = 0
    crewlinks.each(function () {
      const a = $(this)
      if (a.text().match('Crew/add')) {
        const crew = a.find('.mw-newpages-pagename')
        const title = crew.text()
        const wiki = decodeURI(crew.attr('href') || '')
        const starsMatch = a.text().match('stars=([1-5])')
        const stars = starsMatch ? starsMatch[1] : '0'

        if (_.some(morecrew, (x: any) => x.name === title)) {
          console.log(`${title} already is in morecrew`)
        } else {
          newCrew++
          morecrew.push({ name: title, wiki: wiki, stars: +stars })
          console.log(title + wiki + stars)
        }
      }
    })

    if (newCrew) {
      fs.rename('client/morecrew.json', `client/.morecrew.${+Date.now()}.json`)
      console.log('Writing new morecrew.json')
      fs.writeFile('client/morecrew.json', JSON.stringify(morecrew, null, 4))
    }
  })
  .catch(function (e: Error) {
    throw e
  })
