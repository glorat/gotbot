'use strict';

import * as fs from 'async-file';

import * as _ from 'underscore';
import cheerio = require('cheerio');
import cfg from '../config';

interface CrewEntry {
  name : string,
  wiki : string,
  stars : number,
  char? : string ,
  traits? : string,
  image? : string,
  headImage? : string,
  skill? : any,
  moreChar? : any
  traits_hidden?: Array<string>
}


// STT data
export interface AssetRef {
  file: string
}
export interface CrewAvatar {
  id: number
  symbol: string
  name: string
  traits: Array<string>
  traits_hidden: Array<string>
  short_name: string
  max_rarity: number
  icon: AssetRef
  portrait: AssetRef
  full_body: AssetRef
  default_avatar: boolean
  hide_from_cryo: boolean
  skills: Array<string>

  wiki: string // Added by the download script for convenience
}

const allcrew: Array<CrewAvatar> = require('../../data/sttcrew.json');
const morecrew : Array<CrewEntry> = require('../../client/morecrew.json');
const moretraitlist = ['StarCap','DiscoCrew']; // TODO: dir list client/trait
const moretrait : any = {};
const wikiurl = 'sttwiki.org';

moretraitlist.forEach(async trait => {
  let nms = (await fs.readFile(`client/trait/${trait}`)).toString().split("\n");
  nms.forEach((nm:string) => {
    if (!moretrait[nm]) moretrait[nm] = [];
    moretrait[nm].push(trait);
  });
});

interface WikiDB {
  crewentries: Array<CrewEntry>
}

let wikidb : WikiDB = {
  crewentries : cfg.useSttCrewEntries ? [] :  morecrew
};

module.exports = {
  parseWikiCrew:parseWikiCrew,
  wikidb:wikidb
};

function parseCharForTraits($:cheerio.Root) {
  const traitheader = $('b').filter(function() {return $(this).text() === 'Traits';}).first();
  const traitbox = traitheader.parent().parent().next('tr');
  var traits : Array<string> = [];
  traitbox.find('a').each(function() {
    let nm = copyString($(this).text());
    traits.push(nm);
  });
  return traits.join(', ');
}

function parseCharForChar($:cheerio.Root) {
  const traitheader = $('b').filter(function() {return $(this).text() === 'Character';}).first();
  const traitbox = traitheader.parent().parent().next('tr');
  return copyString(traitbox.find('a').text());

}

function parseCharForMoreChar($:cheerio.Root) {
  const moreHeader = $('b').filter(function() : boolean {
    // @ts-ignore
    return $(this).text().match('Other (Versions|Variations|Variants)');
  }).first();
  const moreBox = moreHeader.parent().parent().next('tr');
  const moreTraits : Array<string> = [];
  moreBox.find('a').each(function() {
    const more = $(this).text().replace('Versions','').trim();
    moreTraits.push(copyString(more)) ;
  });
  return moreTraits;

}

function parseCharForSkillData(entry:CrewEntry, $:cheerio.Root) {
  const stars = entry.stars;
  const name = entry.name;

  const table = $('#Away_Team_Skills').first().parent().next().next(); //.parent().next('table').first();

  const starsRow = table.find('tr').eq(1);
  // @ts-ignore
  const skillCount = +starsRow.find('td').eq(1).attr('colspan');

  const skillsRow = table.find('tr').eq(2);
  const skillsCells = skillsRow.find('a');
  var skills = [];
  for (var ski = 0; ski < skillCount; ski++) {
    const href = skillsCells.eq(ski).attr('href');
    if (!href) throw `No skill href for ${name} in ${skillsCells.html()}`;
    const skill = href.replace('/wiki/', '').substr(0, 3).toLowerCase().replace('com', 'cmd');
    skills.push(skill);
  }

  var skilldata = [];
  for (var row = 3; row <= 13; row++) {
    const ferow = table.find('tr').eq(row);
    const fedata = ferow.find('td');
    const level = +fedata.eq(0).text();
    for (var star = 0; star < stars; star++) {
      for (var skill = 0; skill < skillCount; skill++) {
        const col = (star * skillCount) + skill + 1; // +1 for header column
        const cell = fedata.eq(col).find('span').first();
        if (!cell) throw (`No column ${col} in ${fedata.contents()} for ${name}`);
        var base = cell.contents().filter(function () {
          return this.type === 'text';
        }).text();
        const basere = /\d+/;
        if (!basere.test(base)) {
          base = '0';
        }
        const rollre = /\((\d+).(\d+)\)/;
        let rolls : Array<string> | null= rollre.exec(cell.text());
        if (rolls === null) rolls = ['0', '0', '0'];
        skilldata.push({
          stars: star + 1,
          level: level,
          skill: skills[skill],
          base: +base,
          min: +rolls[1],
          max: +rolls[2]
        });
        // return `Base ${base} ${rolls[1]} ${rolls[2]}`;
        //cell->all_text=~m/\((\d+).(\d+)\)/s or die "No skill range detected: " . $cell->all_text;
        //my ($minroll, $maxroll) = ($1,$2);
        //push @skilldata, {stars=>$star+1, skill=>$skills[$skill], base=>$base, minroll=>$minroll, maxroll=>$maxroll};
      }
    }
  }
  return skilldata;
}
function parseCharPage($:cheerio.Root, entry:CrewEntry) {
  const name = entry.name;
  const skilldata = parseCharForSkillData(entry, $);

  let traits = parseCharForTraits($);
  // Additionals....
  if (moretrait[name]) {
    traits = traits + ', ' + moretrait[name].join(', ');
  }
  const char = parseCharForChar($);
  entry.skill = skilldata;
  entry.traits = traits;
  entry.char = char;
  entry.moreChar = parseCharForMoreChar($);
  entry.image = copyString($(`img[alt="${name}"]`).attr('src'));
  entry.headImage = copyString($(`img[alt="${name} Head.png"]`).attr('src'));

  return entry;


  //return `I have skills ${skills.join()}`;

}


/** Almighty hack to prevent V8 from holding onto the mega string when parsing */
function copyString(original_string:string|undefined) {
  return (' ' + original_string).slice(1);
}

async function parseSttLoadedCrew() : Promise<Array<any>> {
  let entries = allcrew.map(c => <CrewEntry>{
    name:c.name,
    stars:c.max_rarity,
    wiki:c.wiki,
    traits_hidden: c.traits_hidden.map(snake2PascalCase) // for prettiness
  });
  wikidb.crewentries = entries;
  return entries;
}

async function parseCategoryCrew() : Promise<Array<any>> {
  const superRareCutoff = 'Ruk'; // Check gotcron to see what page is being used to do the cutoff
  const subcatFiles = ['Common', 'Uncommon', 'Rare', 'Super_Rare', 'Super_Rare?pagefrom=' + superRareCutoff, 'Legendary'];
  const subcats = ['Common', 'Uncommon', 'Rare', 'Super_Rare', 'Legendary'];

  let crewLoadPromises = subcatFiles.map(async catfile => {
    const cat = catfile.replace(/\?.*/, '');
    const stars = subcats.indexOf(cat) + 1;
    const file = `data/${wikiurl}/wiki/Category:${catfile}`;
    return await fs.readFile(file, 'utf8')
      .then(cheerio.load)
      .then(function ($: cheerio.Root) {
        console.log('LOADING ' + file);
        const crewlinks = $('.mw-category-generated a');
        crewlinks.each(function (i, elem) {
          const a = $(this);
          if (a.text() !== 'next page' && a.text() !== 'previous page' && !_.some(wikidb.crewentries, x => x.name == a.text())) {
            //console.log(cat + '    ' + a.text() + ' ' + stars);
            let entry = {name: copyString(a.text()), wiki: copyString(a.attr('href')), stars: stars}
            let mkwiki = '/wiki/' + entry.name.replace(/ /g, '_');
            let mkwiki2 = mkwiki.replace(/'/g, "%27");
            if (mkwiki2 !== entry.wiki) {
              console.log(`Auto wiki name error: ${mkwiki2} vs ${entry.wiki}`);
            }
            wikidb.crewentries.push(entry);
          } else {
            console.log('SKIP    ' + a.text());
          }
        });
      })
      .catch(function (e) {
        throw e;
      });
  });

  return Promise.all(crewLoadPromises).then(function() {
    console.log("All crew summary were loaded");
    return wikidb.crewentries;
  });

}

async function parseEachCharPage() {
  const all = wikidb.crewentries.map(async entry => {
    const file = `data/${wikiurl}${decodeURI(entry.wiki)}`;
    if (await fs.exists(file)) {
      return await fs.readFile(file, 'utf8')
        .then(cheerio.load)
        .then(function (dom) {
          return parseCharPage(dom, entry);
        })
        .catch(function (e) {
          console.error(e);
          throw e;
        });
    }
    else {
      console.error(file + ' does not exist');
      return;
    }
  });
  return Promise.all(all);
}

async function parseWikiCrew() {
  let loadPromise = cfg.useSttCrewEntries ? parseSttLoadedCrew() : parseCategoryCrew();

  return loadPromise.then(parseEachCharPage).then(async function() {
    console.log('All crew pages parsed');
    // Filter the good
    wikidb.crewentries = wikidb.crewentries.filter(x => x.skill !== undefined);
    // Cache it
    await fs.writeFile('data/wikidb.json',JSON.stringify(wikidb));
    console.log('wikidb written');
  });

}


function snake2CamelCase(string:string) {
  return string
    .replace(
      /_(\w)/g,
      ($, $1) => $1.toUpperCase()
    )
    ;
}

function snake2PascalCase(string:string) {
  let s = snake2CamelCase(string);

  return `${s.charAt(0).toUpperCase()}${s.substr(1)}`;
}
