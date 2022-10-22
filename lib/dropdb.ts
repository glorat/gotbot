'use strict';

import cfg from '../config';
import Datastore from 'nedb-async';
import * as _ from 'underscore';

// @ts-ignore
var drops = new Datastore({ filename: cfg.dataPath + 'dropdb.json', autoload: true });

//{"name":"Under New Management",
// "wiki":"/wiki/Under_New_Management",
// "code":"E2-M1",
// "runs":10,"level":"Elite","cost":6,
// "itemName":"Database (Panel)","itemUnits":9,
// "itemStars":1,"userid":"275649672587116546",
// "username":"DisruptorChief",
// "time":1497800172987,
// "_id":"zzUS0aQ3961I27mn"}

class DropEntry {
  name : string = '';
  wiki : string = '';
  code : string = '';
  runs: number = 0;
  level:string = '';
  cost: number = 10;
  itemName: string = '';
  itemUnits: number = 0;
  itemStars: number = 0;
  userId:string = '';
  username: string = '';
  time: number = 0;
  constructor() {

  }
}

const missions = require('./missions');

module.exports = {
  drops: drops,
  findByMissionCode : findByMissionCode,
  findByMissionCodeAndUser: findByMissionCodeAndUser,
  findByStarItem: findByStarItem,
  allEntries: allEntries,
  reduceEntries: reduceEntries
};

function reduceEntries(recs: Array<DropEntry>) : Array<DropEntry> {
  // Basically need to sum itemUnits,runs, itemUnits group by code/level/itemName/itemStars
  // Let's use an easy to write and debug O^2 algorithm
  if (!recs) return [];

  let entries : Array<DropEntry> = [];

  recs.forEach(rec=> {
    let entry = _.find(entries, e=>e.code === rec.code && e.level === rec.level && e.itemName === rec.itemName && e.itemStars === rec.itemStars);
    if (!entry) {
      // Haven't included this mission yet. Templatise from wiki
      let more  = missions.findByMissionCode(rec.code, rec.level).map(_.clone);
      more.forEach((e:any)=>{
        e.itemUnits = 0;
        e.runs = 0;
      });
      entries = entries.concat(more);
      entry = _.find(entries, e=>e.code === rec.code && e.level === rec.level && e.itemName === rec.itemName && e.itemStars === rec.itemStars);
    }
    if (!entry) {
      throw `Drop info with unmatched wiki entry ${rec.code} ${rec.level} for ${rec.itemName} ${rec.itemStars} stars`;
    }

    entry.itemUnits += rec.itemUnits;
    entry.runs += rec.runs;
    entry.username = rec.username; // Last contributor

  });
  return entries;
}


async function findByMissionCode(code:string, level:string) {
  const ret = await drops.asyncFind({code:code, level:level}, {}) as DropEntry[]
  return reduceEntries(ret)
}

async function findByMissionCodeAndUser(code:string, level:string, userid:string) {
  const ret = await drops.asyncFind({code:code, level:level, userid:userid}, {}) as DropEntry[]
  return reduceEntries(ret)
}

async function findByStarItem(itemStars:number, itemName:string) {
  let recs = await drops.asyncFind({itemStars:+itemStars, itemName:itemName}, {}) as DropEntry[];
  let a = reduceEntries(recs);
  return a.filter(e=>e.itemStars === +itemStars && e.itemName === itemName);
}


async function allEntries() {
  let recs = await drops.asyncFind({},{}) as DropEntry[];
  return reduceEntries(recs);
}
