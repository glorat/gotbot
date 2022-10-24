import {slashCommands} from "./cli";

const { REST, Routes } = require('discord.js');
import cfg from "../config";

const x = slashCommands
const commands = x.map(c => c.toJSON())

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(cfg.token);

// and deploy your commands!
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    const guildId = cfg.botServer
    const clientId = cfg.clientId
    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
