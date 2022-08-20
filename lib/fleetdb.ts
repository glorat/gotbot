'use strict';

import cfg from '../config';
import Datastore from 'nedb-async';
import * as _ from 'underscore';
import * as chars from './chars';
import * as api from './Interfaces'
type FleetDoc = api.FleetDoc
// @ts-ignore
const fleets = new Datastore({ filename: cfg.dataPath + 'fleetdb.json', autoload: true });

module.exports = {
  fleets: fleets,
  updateStarbase : updateStarbase,
  updateStarprof : updateStarprof,
  resetEvent: resetEvent,
  addEventChar: addEventChar,
  addEventTrait: addEventTrait,
  setBossDifficulty : setBossDifficulty,
  addBossExclude,
  resetBossExclude,
  refreshBossSpec,
  get : get
};

async function update(fleetId:string, fn:any) {
  const qry = {_id: fleetId};
  const doc = await get(fleetId)
  const newDoc:FleetDoc = fn(doc);
  await fleets.asyncUpdate(qry, newDoc, {upsert: true});
  return newDoc;
}

function updateStarbase(fleetId:string, stats:any) {
  let filtered = _.pick(stats, chars.skills);
  const f = (doc:FleetDoc) => {doc.starbase = filtered; return doc;};
  return update(fleetId, f);
}

function updateStarprof(fleetId:string, stats:any) {
  let filtered = _.pick(stats, chars.skills);
  const f = (doc:FleetDoc) => {doc.starprof = filtered; return doc;};
  return update(fleetId, f);
}

function resetEvent(fleetId:string) {
  const f = (doc:FleetDoc) => {doc.eventChar = []; doc.eventTrait=[]; return doc;};
  return update(fleetId, f);
}

function addEventTrait(fleetId:string, criteria:Array<string>) {
  const f = (doc:FleetDoc) => {doc.eventTrait.push(criteria); return doc;};
  return update(fleetId, f);
}

function addEventChar(fleetId:string, name:string) {
  const f = (doc:FleetDoc) => {doc.eventChar.push(name); return doc;};
  return update(fleetId, f);
}

function setBossDifficulty(fleetId:string, difficulty_id:number) {
  const f = (doc:FleetDoc) => {doc.bossDifficulty = difficulty_id; return doc;};
  return update(fleetId, f);
}

async function addBossExclude(fleetId:string, name:string) {
  const f = (doc:FleetDoc) => {
    if (doc.bossExclude) {doc.bossExclude.push(name)}
    else {doc.bossExclude=[name]}
    return doc;
  };
  return update(fleetId, f);
}

function resetBossExclude(fleetId:string) {
  const f = (doc:FleetDoc) => {doc.bossExclude=[]; return doc;};
  return update(fleetId, f);
}

function refreshBossSpec(fleetId:string, spec: string[]) {
  const f = (doc:FleetDoc) => {doc.bossSpec=spec; return doc;};
  return update(fleetId, f);
}


async function get(fleetId:string) {
  const defStarbase = () => { return{cmd:0, dip:0, eng:0, sec:0, med:0, sci:0}};
  function vivify(doc:FleetDoc) {
    if (doc === null) {
      doc = {_id: fleetId, starbase:defStarbase(), starprof:defStarbase(), eventChar:[], eventTrait:[], bossDifficulty:0, bossExclude:[] };
    }
    if (!doc.starbase) {
      doc.starbase = defStarbase();
    }
    if (!doc.starprof) {
      doc.starprof = defStarbase();
    }
    if (!doc.eventChar) {
      doc.eventChar = []; // Event search criteria
      doc.eventTrait = []
    }
    return doc;
  }
  const qry = {_id: fleetId};
  const doc:FleetDoc = await fleets.asyncFindOne(qry)
  return vivify(doc)
}
