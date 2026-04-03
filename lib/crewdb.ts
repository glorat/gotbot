import cfg from '../config'
import Datastore from './modules/nedb-async'
import * as chars from './chars'
import * as api from './Interfaces'

const users = new Datastore<chars.CrewDoc>({
  filename: cfg.nedbpath,
  autoload: true,
})

function vivify(
  doc: chars.CrewDoc | null,
  userid: string,
  username: string
): chars.CrewDoc {
  if (doc === null) {
    doc = {
      _id: userid,
      username: username,
      crew: [],
      base: { cmd: 0, dip: 0, eng: 0, sec: 0, med: 0, sci: 0 },
      prof: { cmd: 0, dip: 0, eng: 0, sec: 0, med: 0, sci: 0 },
    }
  }
  if (!doc.base) {
    doc.base = { cmd: 0, dip: 0, eng: 0, sec: 0, med: 0, sci: 0 }
  }
  if (!doc.prof) {
    doc.prof = { cmd: 0, dip: 0, eng: 0, sec: 0, med: 0, sci: 0 }
  }
  return doc as chars.CrewDoc
}

function update(userid: string, fn: (x: chars.CrewDoc) => chars.CrewDoc) {
  const qry = { _id: userid }
  return users.asyncFindOne(qry).then((doc: chars.CrewDoc | null) => {
    const newDoc = fn(vivify(doc, userid, 'unknown'))
    users.asyncUpdate(qry, newDoc, { upsert: true })
    return newDoc
  })
}

function get(userid: string, context?: api.Context) {
  const qry = { _id: userid }
  return users
    .asyncFindOne(qry)
    .then((doc: chars.CrewDoc | null) =>
      vivify(doc, userid, context?.author.username ?? 'unknown')
    )
}

// Enrich the crew in the doc with bonus adjusted skills
function calcAdjustedSkill(doc: chars.CrewDoc, fleet: api.FleetDoc) {
  doc.crew.forEach((c) => {
    c.adj = {}
    chars.skills.forEach((sk) => {
      if (c[sk]) {
        const base = doc.base ? doc.base[sk] : 0
        const prof = doc.prof ? doc.prof[sk] : 0

        c.adj[sk] = {} as chars.Skill
        c.adj[sk].base = Math.round(
          c[sk].base *
            (1 + ((fleet.starbase as Record<string, number>)[sk] + base) * 0.01)
        )
        c.adj[sk].minroll = Math.round(
          c[sk].minroll *
            (1 + ((fleet.starprof as Record<string, number>)[sk] + prof) * 0.01)
        )
        c.adj[sk].maxroll = Math.round(
          c[sk].maxroll *
            (1 + ((fleet.starprof as Record<string, number>)[sk] + prof) * 0.01)
        )
      }
    })
  })
  return doc
}

export { users, get, update, calcAdjustedSkill }
