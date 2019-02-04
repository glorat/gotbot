'use strict';

const cfg = require('../config.js');
import Datastore from 'nedb-async';
import * as _ from 'underscore';
import * as chars from './chars.js';

// @ts-ignore
const fleets = new Datastore({ filename: cfg.dataPath + 'fleetdb.json', autoload: true });

module.exports = {
  fleets: fleets,
  updateStarbase : updateStarbase,
  updateStarprof : updateStarprof,
  resetEvent: resetEvent,
  addEvent: addEvent,
  get : get
};

function update(fleetId:string, fn:any) {
  const qry = {_id: fleetId};
  return get(fleetId).then((doc:any) => {
    const newDoc = fn(doc);
    fleets.asyncUpdate(qry, newDoc, {upsert: true});
    return newDoc;
  });
}

function updateStarbase(fleetId:string, stats:any) {
  let filtered = _.pick(stats, chars.skills);
  const f = (doc:any) => {doc.starbase = filtered; return doc;};
  return update(fleetId, f);
}

function updateStarprof(fleetId:string, stats:any) {
  let filtered = _.pick(stats, chars.skills);
  const f = (doc:any) => {doc.starprof = filtered; return doc;};
  return update(fleetId, f);
}

function resetEvent(fleetId:string) {
  const f = (doc:any) => {doc.event = []; return doc;};
  return update(fleetId, f);
}

function addEvent(fleetId:string, criteria:Array<string>) {
  const f = (doc:any) => {doc.event.push(criteria); return doc;};
  return update(fleetId, f);
}

function get(fleetId:string) {
  function vivify(doc:any) {
    if (doc === null) {
      doc = {_id: fleetId };
    }
    if (!doc.starbase) {
      doc.starbase = {cmd:0, dip:0, eng:0, sec:0, med:0, sci:0};
    }
    if (!doc.starprof) {
      doc.starprof = {cmd:0, dip:0, eng:0, sec:0, med:0, sci:0};
    }
    if (!doc.event) {
      doc.event = []; // Event search criteria
    }
    return doc;
  }
  const qry = {_id: fleetId};
  return fleets.asyncFindOne(qry).then(vivify);
}
