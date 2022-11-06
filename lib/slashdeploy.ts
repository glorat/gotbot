import {slashCommands} from "./cli";

const { REST, Routes } = require('discord.js');
import cfg from "../config";

const x = slashCommands
const commands = x.map(c => c.toJSON())

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(cfg.token);

// and deploy your commands!
export const deploySlash = async (guildId:string):Promise<string> => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    const clientId = cfg.clientId
    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    return `Successfully reloaded ${data.length} application (/) commands.`;
  } catch (error:any) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
    return error.toString()
  }
};

// sample script
// const main = async () => {
//   const guildId = cfg.botServer
//   const ret = deploySlash(guildId)
//   console.log(ret)
// }
//
// main()
