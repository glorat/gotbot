'use strict';

import * as fs from 'async-file';

import _ = require('underscore');
import cheerio = require('cheerio');

interface CrewFoo {
  name : string,
  wiki : string,
  stars : number,
  char? : string ,
  traits? : string,
  image? : string,
  headImage? : string,
  skill? : any,
  moreChar? : any
}

const morecrew : Array<CrewFoo> = require('../../client/morecrew.json');
const moretraitlist = ['StarCap','DiscoCrew']; // TODO: dir list client/trait
const moretrait : any = {};

moretraitlist.forEach(trait => {
  let nms = fs.readFile(`client/trait/${trait}`).toString().split("\n");
  nms.forEach(nm => {
    if (!moretrait[nm]) moretrait[nm] = [];
    moretrait[nm].push(trait);
  });
});

var wikidb = {
  crewentries : morecrew
};

module.exports = {
  parseWikiCrew:parseWikiCrew,
  wikidb:wikidb
};

function parseCharForTraits($:CheerioStatic) {
  const traitheader = $('b').filter(function() {return $(this).text() === 'Traits';}).first();
  const traitbox = traitheader.parent().parent().next('tr');
  var traits : Array<string> = [];
  traitbox.find('a').each(function() {
    let nm = copyString($(this).text());
    traits.push(nm);
  });
  return traits.join(', ');
}

function parseCharForChar($:CheerioStatic) {
  const traitheader = $('b').filter(function() {return $(this).text() === 'Character';}).first();
  const traitbox = traitheader.parent().parent().next('tr');
  return copyString(traitbox.find('a').text());

}

function parseCharForMoreChar($:CheerioStatic) {
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

function parseCharForSkillData(entry:CrewFoo, $:CheerioStatic) {
  const stars = entry.stars;
  const name = entry.name;

  const table = $('#Away_Team_Skills').first().parent().next().next(); //.parent().next('table').first();

  const starsRow = table.find('tr').eq(1);
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
function parseCharPage($:CheerioStatic, entry:CrewFoo) {
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
function copyString(original_string:string) {
  return (' ' + original_string).slice(1);
}


async function parseWikiCrew() {
  const superRareCutoff = 'Ruk'; // Check gotcron to see what page is being used to do the cutoff
  const subcatFiles = ['Common','Uncommon','Rare','Super_Rare','Super_Rare?pagefrom=' + superRareCutoff,'Legendary'];
  const subcats = ['Common','Uncommon','Rare','Super_Rare','Legendary'];

  let crewLoadPromises = subcatFiles.map(async catfile => {
    const cat = catfile.replace(/\?.*/,'');
    const stars = subcats.indexOf(cat)+1;
    const file = `client/stt.wiki/wiki/Category:${catfile}`;
    return await fs.readFile(file, 'utf8')
      .then(cheerio.load)
      .then(function($) {
        console.log('LOADING ' + file);
        const crewlinks = $('.mw-category-generated a');
        crewlinks.each(function(i,elem) {
          const a = $(this);
          if (a.text() !== 'next page' && a.text() !== 'previous page' && ! _.some(wikidb.crewentries, x=>x.name == a.text())) {
            //console.log(cat + '    ' + a.text() + ' ' + stars);
            wikidb.crewentries.push({name:copyString(a.text()), wiki: copyString(a.attr('href')), stars:stars});
          }
          else {
            console.log('SKIP    ' + a.text());
          }
        });})
      .catch(function(e){throw e;});
  });

  return Promise.all(crewLoadPromises).then(function() {
    console.log("All crew summary were loaded");
  }).then(function() {
    const all = wikidb.crewentries.map(async entry => {
      const file =`client/stt.wiki/${decodeURI(entry.wiki)}`;

      return await fs.readFile(file, 'utf8')
        .then(cheerio.load)
        .then(function(dom) {
          return parseCharPage(dom, entry);
        })
        .catch(function(e) {
          throw e;
        });
    });
    return Promise.all(all);
  }).then(async function() {
    console.log('All crew pages parsed');
    // Cache it
    await fs.writeFile('data/wikidb.json',JSON.stringify(wikidb));
    console.log('wikidb written');
  });

}

function parseWikiRecipes() {

}
