'use strict';

import cfg  from '../config';
import * as fs from 'async-file';
import * as _ from 'underscore';
const matcher = require('./matcher.js');

interface MissionDB {
  missions : Array<Mission>
  itemList : Array<string>
  missionNames : Array<string>
  missionCodes : Array<string>
  entries : Array<MissionEntry>
}
interface Mission {
  name : string
  wiki: string
  code: string
  missiontype: string
  tables: Array<MissionTable>
}
interface MissionTable {
  runs: number
  level: number
  cost: number
  items: Array<MissionTableItem>
}
interface MissionTableItem {
  name : string
  units: number
  stars: number
  qty: number
}
type MissionEntry = any

// FIXME: later
// @ts-ignore
let wikidb : MissionDB = {};
let ready = fs.readFile(cfg.missionsdbpath, 'utf8')
  .then(JSON.parse)
  .then(function(obj:MissionDB) {
    wikidb = obj;
    const concat = (x:any,y:any) => x.concat(y);

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
      const missiontype = mission.missiontype;

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
            missiontype : missiontype,
            runs : runs,
            level :level,
            cost : cost,
            itemName : itemName,
            itemUnits : itemUnits,
            itemStars : itemStars,
            itemQty : item.qty
          });
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
  .catch((e:any) => {throw(e);})
;


module.exports = {
  allMissionNames: function(){return wikidb.missionNames;},
  allMissionCodes: function(){return wikidb.missionCodes;},
  missionNameToCode : (nm:string) => _.find(wikidb.entries, m=>m.name === nm).code,
  allMissionItems: allMissionItems,
  matchItem: matchItem,
  findByStarItem :  findByStarItem,
  findByMissionCode : findByMissionCode,
  ready:ready
};


function allMissionItems() {
  return wikidb.itemList;
}

function findByStarItem(itemStars:number, itemName:string) : Array<MissionEntry> {
  return _.filter(wikidb.entries, entry => entry.itemName === itemName && entry.itemStars === +itemStars);
}

function findByMissionCode(code:string, level:string) : Array<MissionEntry> {
  return _.filter(wikidb.entries, entry => entry.code.toLowerCase() === code.toLowerCase() && entry.level.toLowerCase() === level.toLowerCase());
}

function matchItem(cb:any, one:string, two:string, three:string) {
  return matcher.matchOne(cb, wikidb.itemList, 'items', one, two, three);
}
