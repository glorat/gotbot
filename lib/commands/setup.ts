import {deploySlash} from "../slashdeploy";

const Clapp = require('../modules/clapp-discord');
import * as API from '../Interfaces';

module.exports = new Clapp.Command({
  name: "setup",
  desc: "setup bot for this server",

  fn:(argv:any, context:API.Context) => new Promise(async (fulfill, reject) => {
    //const guild = context.channel.guild;
    const guildOwner = context.guild?.ownerId ?? NaN;
    const guildId = context.guild?.id;

    if (guildId && context.author.id === guildOwner) {
      const ret = await deploySlash(guildId)
      fulfill(ret)
    }
    else {
      fulfill('Only the server administrator can perform setup');
    }

  }),
  args: [

  ]
});

