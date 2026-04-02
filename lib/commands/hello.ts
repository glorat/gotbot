import * as API from '../Interfaces'
import * as Clapp from '../modules/clapp-discord'

export default new Clapp.Command({
  name: 'hello',
  desc: 'say hello to the bot',

  fn: (_argv: any, context: API.Context) =>
    new Promise((fulfill) => {
      const author = context.author.username
      fulfill(`Hi ${author} (${context.author.id})`)
    }),
  args: [],
})
