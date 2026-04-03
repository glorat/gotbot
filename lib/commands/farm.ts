import * as API from '../Interfaces'
import * as Clapp from '../modules/clapp-discord'
import * as _ from 'underscore'
import * as missions from '../missions'
import * as dropdb from '../dropdb'
import Table from 'cli-table3'

export default new Clapp.Command({
  name: 'farm',
  desc: 'best missions to farm an item',

  // Command function
  fn: (argv: any, context: API.Context) =>
    new Promise((fulfill) => {
      const args = argv.args
      const userid = context.author.id

      function adjCost(cost: number): number {
        return argv.flags.kit ? Math.ceil(cost * 0.75) : cost
      }

      function starStr(s: number): string {
        return _.range(s)
          .map(() => '*')
          .join('')
      }

      function entryStat(e: any): string[] {
        const foo = (adjCost(e.cost) * e.runs) / e.itemUnits
        return [
          e.name,
          e.code,
          e.missiontype,
          e.level,
          adjCost(e.cost).toString(),
          e.runs.toString(),
          foo.toFixed(1),
        ]
      }

      function handleItem(entrys: any[]): string {
        // Sort by best cost first
        entrys = _.sortBy(
          entrys,
          (e) => (adjCost(e.cost) * e.runs) / e.itemUnits
        )

        const table = new Table({
          chars: {
            top: '',
            'top-mid': '',
            'top-left': '',
            'top-right': '',
            bottom: '',
            'bottom-mid': '',
            'bottom-left': '',
            'bottom-right': '',
            left: '',
            'left-mid': '',
            mid: '',
            'mid-mid': '',
            right: '',
            'right-mid': '',
            middle: '',
          },
          wordWrap: true,
        })

        table.push(['Mission', 'Code', 'Type', 'Level', 'C', 'R', 'Cost'])
        entrys.map(entryStat).map((x) => table.push(x))
        return table.toString()
      }

      const result = missions.matchItem(args.name1, args.name2, args.name3)
      if (!result.success) {
        fulfill(result.message)
      } else {
        const name = result.name
        let lines: string[] = []

        const entrys = missions.findByStarItem(args.stars, name)
        lines.push('```')
        lines.push(name + starStr(args.stars))
        lines.push('Wiki farm rates')
        const table = handleItem(entrys)
        lines.push(table)

        dropdb.findByStarItem(args.stars, name).then((botEntries: any[]) => {
          if (
            context.isEntitled(userid) &&
            botEntries &&
            botEntries.length > 0
          ) {
            lines.push('Discord farm rates')
            lines = lines.concat(handleItem(botEntries))
          }

          lines.push('```')
          fulfill(lines.join('\n'))
        })
      }
    }),
  args: [
    {
      name: 'stars',
      desc: 'stars for item being farmed',
      type: 'number',
      default: 0,
      required: true,
      validations: [
        {
          errorMessage: 'Must be 0 (basic) to 5 (legendary)',
          validate: (value: string) => {
            const num = parseInt(value, 10)
            return num >= 0 && num <= 5
          },
        },
      ],
    },
    {
      name: 'name1',
      desc: 'name of item to farm',
      type: 'string',
      default: '',
      required: true,
    },
    {
      name: 'name2',
      desc: 'name of item to farm',
      type: 'string',
      default: '',
      required: false,
    },
    {
      name: 'name3',
      desc: 'name of item to farm',
      type: 'string',
      default: '',
      required: false,
    },
  ],
  flags: [
    {
      name: 'kit',
      desc: 'adjust costs for supply kit',
      alias: 'k',
      type: 'boolean',
      default: false,
    },
  ],
})
