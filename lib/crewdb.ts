import cfg from '../config'
import Datastore from './modules/nedb-async'
import * as chars from './chars'
import * as api from './Interfaces'

const users = new Datastore<chars.CrewDoc>({
  filename: cfg.nedbpath,
  autoload: true,
})

function vivify(doc: any, userid: string, username: string) {
  if (doc === null) {
    doc = {
      _id: userid,
      username: username,
      crew: [],
    }
  }
  if (!doc.base) {
    doc.base = { cmd: 0, dip: 0, eng: 0, sec: 0, med: 0, sci: 0 }
  }
  if (!doc.prof) {
    doc.prof = { cmd: 0, dip: 0, eng: 0, sec: 0, med: 0, sci: 0 }
  }
  return doc
}

function update(userid: any, fn: (x: any) => any) {
  const qry = { _id: userid }
  return users.asyncFindOne(qry).then((doc: any) => {
    const newDoc = fn(vivify(doc, userid, 'unknown'))
    users.asyncUpdate(qry, newDoc, { upsert: true })
    return newDoc
  })
}

function get(userid: any, context?: api.Context) {
  const qry = { _id: userid }
  return users
    .asyncFindOne(qry)
    .then((doc: any) =>
      vivify(doc, userid, context?.author.username ?? 'unknown')
    )
}

// Enrich the crew in the doc with bonus adjusted skills
function calcAdjustedSkill(doc: chars.CrewDoc, fleet: any) {
  doc.crew.forEach((c) => {
    c.adj = {}
    chars.skills.forEach((sk) => {
      if (c[sk]) {
        const base = doc.base ? doc.base[sk] : 0
        const prof = doc.prof ? doc.prof[sk] : 0

        c.adj[sk] = {}
        c.adj[sk].base = Math.round(
          c[sk].base * (1 + (fleet.starbase[sk] + base) * 0.01)
        )
        c.adj[sk].minroll = Math.round(
          c[sk].minroll * (1 + (fleet.starprof[sk] + prof) * 0.01)
        )
        c.adj[sk].maxroll = Math.round(
          c[sk].maxroll * (1 + (fleet.starprof[sk] + prof) * 0.01)
        )
      }
    })
  })
  return doc
}

export { users, get, update, calcAdjustedSkill }
