'use strict';

var fs = require('fs');
const _ = require('underscore');
const request = require('request');
const jsonreq = require('request-json');
const Promise = require("bluebird");
Promise.promisifyAll(fs);
const matcher = require('./matcher.js');

let wikidb = {};
let ready = fs.readFileAsync('./data/missions.json', 'utf8')
  .then(JSON.parse)
  .then(function(obj) {
    wikidb = obj;
    const concat = (x,y) => x.concat(y);

    const allItemNames = wikidb.missions.map(mission => mission.tables.map(table => table.items.map(item => item.name)) )
      .reduce(concat).reduce(concat);
    wikidb.itemList = _.uniq(allItemNames);
    wikidb.missionNames = _.uniq(wikidb.missions.map(mission => mission.name));
    wikidb.missionCodes = _.uniq(wikidb.missions.map(mission => mission.code));

    wikidb.entries = [];
    let entries = wikidb.entries;
    wikidb.missions.forEach(mission => {
      const name = mission.name;
      const wiki = mission.wiki;
      const code = mission.code;

      mission.tables.forEach(table => {
        const runs = table.runs;
        const level = table.level;
        const cost = table.cost;
        table.items.forEach(item => {
          const itemName = item.name;
          const itemUnits = item.units;
          const itemStars = +item.stars;
          entries.push({
            name : name,
            wiki : wiki,
            code : code,
            runs : runs,
            level :level,
            cost : cost,
            itemName : itemName,
            itemUnits : itemUnits,
            itemStars : itemStars
          })
        });
      });

    });
    console.log(`Generated mission entries table of size ${JSON.stringify(entries).length}`);
    /*
    wikidb.charstars = _.object(wikidb.crewentries.map(x=>x.name), wikidb.crewentries.map(x=>x.stars));
    wikidb.charToCrew = _.groupBy(wikidb.crewentries, x=>x.char);

    var traitsSet = new Set();
    wikidb.crewentries.forEach(x=>x.traits.split(',').map(x=>x.trim()).forEach(x=>traitsSet.add(x)));
    wikidb.traits = Array.from(traitsSet);*/

  })
  .catch(e => {throw(e)})
;


module.exports = {
  allMissionNames: function(){return wikidb.missionNames;},
  allMissionCodes: function(){return wikidb.missionCodes;},
  missionNameToCode : nm => _.find(wikidb.entries, m=>m.name === nm).code,
  allMissionItems: allMissionItems,
  matchItem: matchItem,
  findByStarItem :  findByStarItem,
  findByMissionCode : findByMissionCode,
  ready:ready
};


function allMissionItems() {
  return wikidb.itemList;
}

function findByStarItem(itemStars, itemName) {
  return _.filter(wikidb.entries, entry => entry.itemName === itemName && entry.itemStars === +itemStars);
}

function findByMissionCode(code, level) {
  return _.filter(wikidb.entries, entry => entry.code.toLowerCase() === code.toLowerCase() && entry.level.toLowerCase() === level.toLowerCase());
}

function matchItem(cb, one, two, three) {
  return matcher.matchOne(cb, wikidb.itemList, 'items', one, two, three);
}
