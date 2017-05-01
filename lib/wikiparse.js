'use strict';

var fs = require('fs');
const _ = require('underscore');
const cheerio = require('cheerio');
const Promise = require("bluebird");
Promise.promisifyAll(fs);

var wikidb = {
  crewentries : []
};

module.exports = {
  parseWikiCrew:parseWikiCrew,
  wikidb:wikidb
};

function parseCharForTraits($) {
  const traitheader = $('b').filter(function() {return $(this).text() === 'Traits'}).first();
  const traitbox = traitheader.parent().parent().next('tr');
  var traits = [];
  traitbox.find('a').each(function() {
    let nm = copyString($(this).text())
    traits.push(nm);
  });
  return traits.join(', ');
}

function parseCharForChar($) {
  const traitheader = $('b').filter(function() {return $(this).text() === 'Character'}).first();
  const traitbox = traitheader.parent().parent().next('tr');
  return copyString(traitbox.find('a').text());
}

function parseCharPage($, entry) {
  const stars = entry.stars;
  const name = entry.name;

  const table = $('#Away_Team_Skills').first().parent().next().next(); //.parent().next('table').first();
  const starsRow =  table.find('tr').eq(1);
  const skillCount = starsRow.find('td').eq(1).attr('colspan');

  const skillsRow = table.find('tr').eq(2);
  const skillsCells = skillsRow.find('a');
  var skills = [];
  for (var ski =0; ski<skillCount; ski++) {
    const href = skillsCells.eq(ski).attr('href');
    if (!href) throw `No skill href for ${name} in ${skillsCells.html()}`;
    const skill = href.replace('/wiki/','').substr(0,3).toLowerCase().replace('com','cmd');
    skills.push(skill);
  }


  const ferow = table.find('tr').eq(13);
  const fedata = ferow.find('td');

  var skilldata = [];
  for (var star=0; star<stars; star++) {
    for (var skill=0; skill<skillCount; skill++) {
      const col = (star*skillCount) + skill + 1; // +1 for header column
      const cell = fedata.eq(col).find('span').first();
      if (!cell) throw (`No column ${col} in ${fedata.contents()} for ${name}`);
      var base = cell.contents().filter(function() {return this.type === 'text'; }).text();
      const basere = /\d+/;
      if (!basere.test(base)) {
        base = 0;
      }
      const rollre = /\((\d+).(\d+)\)/;
      var rolls = rollre.exec(cell.text());
      if (rolls === null) rolls = [0,0,0];
      skilldata.push({stars:star+1, skill:skills[skill], base:+base, min:+rolls[1], max:+rolls[2]});
      // return `Base ${base} ${rolls[1]} ${rolls[2]}`;
      //cell->all_text=~m/\((\d+).(\d+)\)/s or die "No skill range detected: " . $cell->all_text;
      //my ($minroll, $maxroll) = ($1,$2);
      //push @skilldata, {stars=>$star+1, skill=>$skills[$skill], base=>$base, minroll=>$minroll, maxroll=>$maxroll};
    }

  }

  const traits = parseCharForTraits($);
  const char = parseCharForChar($);

  entry.skill = skilldata;
  entry.traits = traits;
  entry.char = char;

  return entry;


  //return `I have skills ${skills.join()}`;

}


/** Almighty hack to prevent V8 from holding onto the mega string when parsing */
function copyString(original_string) {
  return (' ' + original_string).slice(1);
}


function parseWikiCrew() {
  const subcats = ['Common','Uncommon','Rare','Super_Rare','Legendary'];
  const crewLoadPromises = subcats.map(cat => {
    const stars = subcats.indexOf(cat)+1;
    const file = `client/stt.wiki/wiki/Category:${cat}`;
    return fs.readFileAsync(file, 'utf8')
      .then(cheerio.load)
      .then(function($) {
        const crewlinks = $('.mw-category-generated a');
        crewlinks.each(function(i,elem) {
          const a = $(this);
          wikidb.crewentries.push({name:copyString(a.text()), wiki: copyString(a.attr('href')), stars:stars});
        })})
      .catch(function(e){throw e;});
  });

  return Promise.all(crewLoadPromises).then(function() {
    console.log("All crew summary were loaded");
  }).then(function() {
    const all = wikidb.crewentries.map(entry => {
      const file =`client/stt.wiki/${decodeURI(entry.wiki)}`;

      return fs.readFileAsync(file, 'utf8')
        .then(cheerio.load)
        .then(function(dom) {
          return parseCharPage(dom, entry)
        })
        .catch(function(e) {
          throw e;
        });
    });
    return Promise.all(all);
  }).then(function() {
    console.log('All crew pages parsed');
    // Cache it
    fs.writeFile('wikidb.json',JSON.stringify(wikidb));
    console.log('wikidb written');
  });

}

function parseWikiRecipes() {

}
