import Discord = require('discord.js');

export type EmojiFn = (x:string) => string | Discord.Emoji
export type BoldifyFn = (x:string) => string
export interface Context {
  emojify: EmojiFn;
  boldify: BoldifyFn;
  fleetId: string; // Snowflake
  author: any;
  bot : Discord.Client;
  channel : Discord.TextChannel | Discord.GroupDMChannel | Discord.DMChannel;
  embed? : any;
  msg? : Discord.Message;
  callback? : any; // FIXME
  isEntitled(userid: string): boolean ;
}
