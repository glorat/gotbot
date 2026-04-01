import * as API from '../Interfaces'
import * as chars from '../chars'
const Clapp = require('../modules/clapp-discord')
import * as _ from 'underscore'

module.exports = new Clapp.Command({
  name: 'search',
  desc: 'search for crew',

  fn: (argv: any, _context: API.Context) =>
    new Promise((fulfill) => {
      const args = argv.args

      try {
        const res = chars.searchCrewByCharTrait(
          [args.name1, args.name2, args.name3],
          chars.allCrewEntries()
        )
        let entries = res.entries
        const searchParams = res.searchParams
        const num = entries.length
        if (entries.length > 50) {
          entries = _.first(entries, 50).concat([
            { name: '...and more...' } as any,
          ])
        }

        const ret =
          `${num} results for ${searchParams.join(', ')}\n` +
          entries.map((x: { name: string }) => x.name).join('\n')
        fulfill(ret)
      } catch (e: any) {
        console.log(e)
        fulfill(e)
      }
    }),
  args: [
    {
      name: 'name1',
      desc: 'Search param (char or trait)',
      type: 'string',
      required: true,
    },
    {
      name: 'name2',
      desc: 'Search param',
      type: 'string',
      default: '',
      required: false,
    },
    {
      name: 'name3',
      desc: 'Search param',
      type: 'string',
      default: '',
      required: false,
    },
  ],
})
