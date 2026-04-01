import * as API from '../Interfaces'
const Clapp = require('../modules/clapp-discord')

module.exports = new Clapp.Command({
  name: 'hello',
  desc: 'say hello to the bot',

  fn: (_argv: any, context: API.Context) =>
    new Promise((fulfill) => {
      const author = context.author.username
      fulfill(`Hi ${author} (${context.author.id})`)
    }),
  args: [],
})
