'use strict';
const fs = require('async-file');
const _ = require('underscore');
const cheerio = require('cheerio');

var wikidb = {
  missions:[]
};

module.exports = {
  parseWikiMissions:parseWikiMissions,
  wikidb:wikidb
};

/** Almighty hack to prevent V8 from holding onto the mega string when parsing */
function copyString(original_string) {
  return (' ' + original_string).slice(1);
}


function parseWikiMissionList() {
  const subcats = ['Away_Team_Missions', 'Space_Battle_Missions'];
  const missionLoadPromises = subcats.map(cat => {
    const file = `data/stt.wiki/wiki/Category:${cat}`;
    return fs.readFile(file, 'utf8')
      .then(cheerio.load)
      .then(function ($) {
        const missionlinks = $('.mw-category-generated a');
        missionlinks.each(function (i, elem) {
          const a = $(this);
          wikidb.missions.push({name: copyString(a.text()), wiki: copyString(a.attr('href')), missiontype: cat.substr(0,1)=='A' ? 'Away' : 'Space' });
        });
      })
      .catch(function (e) {
        throw e;
      });
  });
  return missionLoadPromises;
}

function parseWikiMissions() {
  const mlp = parseWikiMissionList();


  return Promise.all(mlp).then(function() {
    console.log("Mission list loaded");
  }).then(function() {
    const all = wikidb.missions.map(entry => {
      const file =`data/stt.wiki/${decodeURI(entry.wiki)}`;

      return fs.readFile(file, 'utf8')
        .then(cheerio.load)
        .then(function(dom) {
          return parseMissionPage(dom, entry);
        })
        .catch(function(e) {
          throw e;
        });
    });
    return Promise.all(all);
  }).then(function() {
    console.log('All mission pages parsed');
    // Cache it
    fs.writeFile('data/missions.json',JSON.stringify(wikidb));
    console.log('missions written');
  });

}

const textFilter = function () {
  return this.type === 'text';
};

function parseMissionRow(row) {


  const itemCell =  row.find('td').eq(0);
  const item = itemCell.find('a');
  const itemMeta = itemCell.contents().filter(textFilter).text();
  const qtyRe = /\(x(\d+)\)/;
  const qtyMatch = qtyRe.exec(itemMeta);
  let qty = 1; // Default drop one
  if (qtyMatch) {
    qty = qtyMatch[1];
  }
  //const starRe = /(\★+)/m;
  //const starMatch = row.text().match(starRe);
  //const starStr = starMatch ? starMatch[1] : ('??'+row.text());
  const starRe = /(Basic|Common|Uncommon|Rare|Super Rare|Legendary)/m;
  const starMatch = itemCell.text().match(starRe);
  const starStr = starMatch ? starMatch[1] : 'undefined';
  const starStrToStars = {
    'Basic' : 0,
    'Common': 1,
    'Uncommon': 2,
    'Rare': 3,
    'Super Rare' :4,
    'Legendary': 5,
    'undefined': -1
  };


  const units = row.find('td').eq(1).find('span').first().contents().filter(textFilter).text();

  return {name: copyString(item.attr('title')), units:+units, stars:starStrToStars[starStr], qty:qty};
}

function parseMissionTable(table) {

  const level = table.find('img').first().attr('title');
  //console.log(`  ${level}`);

  const header = table.find('th').first().closest('tr');

  const sumrow = header.prev('tr');
  const sumre = /Runs:.*?(\d+).*?Cost\/Run:.*?(\d+)/m;
  const summatch = sumrow.text().match(sumre);
  let ret = {items:[], level:copyString(level)};
  if (summatch) {
    ret.runs = +summatch[1];
    ret.cost = +summatch[2];
  }
  else {
    console.log(`    Unknown run detail`);
  }
  //console.log(sumrow.text());

  let row = header.next('tr');
  while (row && row.find('td').length === 4) {
    const item = parseMissionRow(row);
    ret.items.push(item);

    if (item.name && item.stars <0) {
      //console.log(item.attr('title') + starStr);
    }

    const qtyString = item.qty>1 ? `(x${item.qty})` : '';
    // console.log(`    ${item.units} ${item.name}${qtyString} ${item.stars}* ${ret.cost*ret.runs/item.units}  ${ret.runs/item.units}`);
    row = row.next('tr');
  }

  return ret;


}

function parseMissionPage($, entry) {
  // Parse the mission code
  const codeBox = $('#mw-content-text table th b').filter(function() {
    return $(this).text().replace(/[^\w-]/g, '').toUpperCase().match(entry.name.replace(/[^\w-]/g, '').toUpperCase());
  });
  if (codeBox.length === 0) {
    entry.code = 'Unk';
  }
  else if (codeBox.length > 1) {
    throw "selector for mission code not restrictive enough. code bug";
  }
  else {
    entry.code = codeBox.text().replace(/[^\w-]/g, '').toUpperCase().replace(entry.name.replace(/[^\w-]/g, '').toUpperCase(), '').trim();
  }

  // Parse the drop tables
  let tables = [];
  entry.tables = tables;
  const dropHeader = $('.mw-headline').filter(function() {return $(this).text().match('Drop');}).first();
  if (dropHeader.length === 1) {
    console.log(dropHeader.text() + ' ' + entry.name);
    const dropDiv = dropHeader.parent().next();
    const dropTables = dropDiv.find('table');
    if (dropTables.length === 3) {
      dropTables.map(function(i, el) {
        tables.push(parseMissionTable($(el)));
      });
      //JSON.stringify(tables);
      entry.tables = tables;

    }
    else {
      //console.log('***No drop ' + entry.name );
    }
  }
  else {
    console.log('***Empty ' + entry.name);
  }

}
