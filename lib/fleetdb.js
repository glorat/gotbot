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
  get : get
};

function updateStarbase(fleetId, stats) {
  let filtered = _.pick(stats, chars.skills);

  const qry = {_id: fleetId};
  return get(fleetId).then(doc => {
    // Create a default doc if user is new
    if (doc === null) {
      doc = {_id: fleetId, starbase: filtered};
    }
    else {
      doc.starbase = filtered;
    }
    fleets.update(qry, doc, {upsert: true});
    return doc;
  });
}



function get(fleetId) {
  function hydrate(doc) {
    if (doc === null) {
      doc = {_id: fleetId, starbase: {cmd:0, dip:0, eng:0, sec:0, med:0, sci:0}};
    }
    return doc;
  }
  const qry = {_id: fleetId};
  return fleets.findOneAsync(qry).then(hydrate);
}
