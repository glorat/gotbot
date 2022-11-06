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

export const undeploySlash = async(guildId: string): Promise<string> => {
  const clientId = cfg.clientId
  const data = await rest.get(Routes.applicationGuildCommands(clientId, guildId))
  const promises = data.map(async (command:any) => {
    const deleteUrl = `${Routes.applicationGuildCommands(clientId, guildId)}/${command.id}`;
    console.log(deleteUrl)
    await rest.delete(deleteUrl)
    console.log(`${command.id} deleted`)
  })
  await Promise.all(promises);
  return "Slash commands unregistered"
}

// sample script
// const main = async () => {
//   const guildId = cfg.botServer
//   const ret = deploySlash(guildId)
//   console.log(ret)
// }
//
// main()
