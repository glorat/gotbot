import { deploySlash, undeploySlash } from '../slashdeploy'
import * as Clapp from '../modules/clapp-discord'
import * as API from '../Interfaces'
import cfg from '../../config'

export default new Clapp.Command({
  name: 'setup',
  desc: 'setup bot for this server',

  fn: (argv: any, context: API.Context) =>
    new Promise(async (fulfill, reject) => {
      //const guild = context.channel.guild;
      const guildOwner = context.guild?.ownerId ?? NaN
      const guildId = context.guild?.id

      if (
        guildId &&
        (context.author.id === guildOwner || context.author.id === cfg.adminId)
      ) {
        if (argv.flags.unregister) {
          const ret = await undeploySlash(guildId)
          fulfill(ret)
        } else {
          const ret = await deploySlash(guildId)
          fulfill(ret)
        }
      } else {
        fulfill('Only the server administrator can perform setup')
      }
    }),
  args: [],
  flags: [
    {
      name: 'unregister',
      desc: 'unregister slash commands',
      alias: 'u',
      type: 'boolean',
      default: false,
    },
  ],
})
