'use strict';

const cfg = require('../config.js');
var Datastore = require('nedb');
const Promise = require("bluebird");
const _ = require('underscore');

var drops = new Datastore({ filename: cfg.dataPath + 'dropdb.json', autoload: true });
Promise.promisifyAll(drops);

const missions = require('./missions.js');

module.exports = {
  drops: drops,
  findByMissionCode : findByMissionCode,
  findByMissionCodeAndUser: findByMissionCodeAndUser,
  findByStarItem: findByStarItem,
  allEntries: allEntries,
  reduceEntries: reduceEntries
};

function reduceEntries(recs) {
  // Basically need to sum itemUnits,runs, itemUnits group by code/level/itemName/itemStars
  // Let's use an easy to write and debug O^2 algorithm
  if (!recs) return [];

  let entries = [];

  recs.forEach(rec=> {
    let entry = _.find(entries, e=>e.code === rec.code && e.level === rec.level && e.itemName === rec.itemName && e.itemStars === rec.itemStars);
    if (!entry) {
      // Haven't included this mission yet. Templatise from wiki
      let more = missions.findByMissionCode(rec.code, rec.level).map(_.clone);
      more.forEach(e=>{
        e.itemUnits = 0;
        e.runs = 0;
      });
      entries = entries.concat(more);
      entry = _.find(entries, e=>e.code === rec.code && e.level === rec.level && e.itemName === rec.itemName && e.itemStars === rec.itemStars);
    }
    if (!entry) {
      throw "Drop info with unmatched wiki entry";
    }

    entry.itemUnits += rec.itemUnits;
    entry.runs += rec.runs;
    entry.username = rec.username; // Last contributor

  });
  return entries;
}


function findByMissionCode(code, level) {
  return drops.findAsync({code:code, level:level}, {})
    .then(reduceEntries);
}

function findByMissionCodeAndUser(code, level, userid) {
  return drops.findAsync({code:code, level:level, userid:userid}, {})
    .then(reduceEntries);
}

function findByStarItem(itemStars, itemName) {
  return drops.findAsync({itemStars:+itemStars, itemName:itemName}, {})
    .then(reduceEntries)
    .then(x => x.filter(e=>e.itemStars === +itemStars && e.itemName === itemName));
}


function allEntries() {
  drops.find({}, {}, function(err, doc) {
    if (err) throw err;
    return reduceEntries(doc);
  });
}
