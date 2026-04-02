import * as API from '../Interfaces'
import * as chars from '../chars'
import * as Clapp from '../modules/clapp-discord'
import * as db from '../crewdb'
import * as _ from 'underscore'
import { MatchCB } from '../matcher'

export default new Clapp.Command({
  name: 'equip',
  desc: 'equip crew member to a fuse and level',

  // Command function
  fn: (argv: any, context: API.Context) =>
    new Promise((fulfill) => {
      const author = context.author.username
      const userid: string = context.author.id
      const args = argv.args
      const emojify = context.emojify
      const boldify = context.boldify

      if (!context.isEntitled(userid)) {
        fulfill(`Sorry, this function is in restricted beta`)
        return
      }

      const qry = { _id: userid }

      db.users.findOne(qry, function (err: Error | null, doc: any) {
        // Create a default doc if user is new
        if (doc === null || !doc.crew) {
          fulfill(`Sorry ${author}, you do not have any crew to update`)
          return
        }

        const matchCallback: MatchCB = function (err, name) {
          if (err) {
            fulfill(err)
          } else if (name) {
            const char = _.find(doc.crew, (x) => x.name === name)
            if (char) {
              chars.wikiLookup(name, function (err: string | null, info: any) {
                if (err) {
                  fulfill(err)
                } else {
                  const stars =
                    argv.flags.stars == 0 ? info.stars : argv.flags.stars
                  const level: number = argv.flags.level
                  chars.fullyEquip(char, info, stars, level)
                  db.users.update(qry, doc, { upsert: true })
                  fulfill(
                    `${author}, I have updated stats for ${chars.statsFor(char, emojify, boldify, {})}`
                  )
                }
              })
            } else {
              fulfill(`Sorry ${author}, I cannot find ${name} in your crew`)
            }
          }
        }

        chars.matchOne(matchCallback, args.name1, args.name2, args.name3)
      })
    }),
  args: [
    {
      name: 'name1',
      desc: 'search string for name',
      type: 'string',
      required: true,
    },
    {
      name: 'name2',
      desc: 'search string for name',
      type: 'string',
      default: '',
    },
    {
      name: 'name3',
      desc: 'search string for name',
      type: 'string',
      default: '',
    },
  ],
  flags: [
    {
      name: 'stars',
      desc: 'Number of fused stars to equip at',
      alias: 's',
      type: 'number',
      default: 0,
    },
    {
      name: 'level',
      desc: 'Skill level to query at. Should be 1,10,20,30,40,50,60,70,80,90,100 - Default:100',
      alias: 'l',
      type: 'number',
      default: 100,
    },
  ],
})
