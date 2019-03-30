import Discord = require('discord.js');

export type EmojiFn = (x:string) => string | Discord.Emoji
export type BoldifyFn = (x:string) => string

export interface DummyChannel {
  id : string
  name: string

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

export function hasGuild(channel : Discord.TextChannel | Discord.GroupDMChannel | Discord.DMChannel | DummyChannel) : channel is Discord.TextChannel {
  return (<Discord.TextChannel>channel).guild !== undefined;
}
export function hasChannelName(channel : Discord.TextChannel | Discord.GroupDMChannel | Discord.DMChannel | DummyChannel)
  : channel is Discord.TextChannel | Discord.GroupDMChannel | DummyChannel{
  return (<Discord.TextChannel | Discord.GroupDMChannel>channel).name !== undefined;
}
export function canFetchMessages(channel: any) :  channel is Discord.TextBasedChannelFields {
  return (<Discord.TextBasedChannelFields>channel).send !== undefined;
}







export interface AssetRef {
  file: string
}
export interface CrewAvatar {
  id: number,
  symbol: string,
  name: string,
  traits: Array<string>
  traits_hidden: Array<string>
  short_name: string
  max_rarity: number
  icon: AssetRef
  portrait: AssetRef
  full_body: AssetRef
  default_avatar: boolean
  hide_from_cryo: boolean
  skills: Array<string>
}


export interface FleetDoc {
  _id:any
  eventChar: Array<string>
  eventTrait: Array<Array<string>>
  starbase: Object
  starprof: Object
  prefix?: string
}

