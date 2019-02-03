import Discord = require('discord.js');

export interface Context {
  emojify: (x:string) => string | Discord.Emoji;
  boldify: (x:string) => string;
  fleetId: string; // Snowflake
  author: any;
  bot : Discord.Client;
  channel : Discord.TextChannel | Discord.GroupDMChannel | Discord.DMChannel;
  embed? : any;
  msg? : Discord.Message;

  isEntitled(userid: string): boolean ;
}
