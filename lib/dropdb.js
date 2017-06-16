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
  allEntries: allEntries
};

function toEntries(recs) {
  // Basically need to sum runs, itemUnits group by code/level/itemName/itemStars
  // Let's use an easy to write and debug O^2 algorithm
  let tmpl = recs[0];
  if (!tmpl) return [];

  let entries = missions.findByMissionCode(tmpl.code, tmpl.level).map(_.clone);
  entries.forEach(e=>{
    e.itemUnits = 0;
    e.runs = 0;
  });

  recs.forEach(rec=> {
    let entry = _.find(entries, e=>e.code === rec.code && e.level === rec.level && e.itemName === rec.itemName && e.itemStars === rec.itemStars);
    if (entry) {
      entry.itemUnits += rec.itemUnits;
      entry.runs += rec.runs;
    }
    else {
      console.log('Drop info with unmatched wiki entry');
    }
  });
  return entries;
}

function findByMissionCode(code, level) {
  return drops.findAsync({code:code, level:level}, {})
    .then(toEntries);
}

function allEntries() {
  drops.find({}, {}, function(err, doc) {
    if (err) throw err;
    return toEntries(doc);
  })
}
