'use strict';

const cfg = require('../config.js');
var Datastore = require('nedb');
const Promise = require("bluebird");
const _ = require('underscore');
const chars = require('./chars.js');

const fleets = new Datastore({ filename: cfg.dataPath + 'fleetdb.json', autoload: true });
Promise.promisifyAll(fleets);

module.exports = {
  fleets: fleets,
  updateStarbase : updateStarbase,
  updateStarprof : updateStarprof,
  get : get
};

function update(fleetId, fn) {
  const qry = {_id: fleetId};
  return get(fleetId).then(doc => {
    const newDoc = fn(doc);
    fleets.update(qry, newDoc, {upsert: true});
    return newDoc;
  });
}

function updateStarbase(fleetId, stats) {
  let filtered = _.pick(stats, chars.skills);
  const f = doc => {doc.starbase = filtered; return doc;};
  return update(fleetId, f);
}

function updateStarprof(fleetId, stats) {
  let filtered = _.pick(stats, chars.skills);
  const f = doc => {doc.starprof = filtered; return doc;};
  return update(fleetId, f);
}


function get(fleetId) {
  function vivify(doc) {
    if (doc === null) {
      doc = {_id: fleetId };
    }
    if (!doc.starbase) {
      doc.starbase = {cmd:0, dip:0, eng:0, sec:0, med:0, sci:0};
    }
    if (!doc.starprof) {
      doc.starprof = {cmd:0, dip:0, eng:0, sec:0, med:0, sci:0};
    }
    return doc;
  }
  const qry = {_id: fleetId};
  return fleets.findOneAsync(qry).then(vivify);
}
