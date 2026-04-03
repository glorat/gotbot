import * as Clapp from '../modules/clapp-discord'
import cfg from '../../config'

export default new Clapp.Command({
  name: '++',
  desc: 'give karma',
  fn: (argv: any, context: any) => {
    return new Promise((fulfill) => {
      const ret = `<@${cfg.adminId}> ++ deserves the karma for creating me\n`
      fulfill(ret)
    })
  },
  args: [],
  opts: {
    exclude: true,
  },
})
