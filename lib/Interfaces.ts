import Discord = require('discord.js');

export type EmojiFn = (x:string) => string | Discord.Emoji
export type BoldifyFn = (x:string) => string

export interface DummyChannel {
  id : string
  name: string
  send : (msg:any) => void

}
export interface Context {
  emojify: EmojiFn;
  boldify: BoldifyFn;
  fleetId: string; // Snowflake
  author: any;
  bot? : Discord.Client;
  channel : Discord.TextChannel | Discord.GroupDMChannel | Discord.DMChannel | DummyChannel;
  embed? : any;
  msg? : Discord.Message;
  callback? : any; // FIXME
  isEntitled(userid: string): boolean ;
}
