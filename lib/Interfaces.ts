import Discord = require('discord.js');
import {Guild, PartialTextBasedChannelFields} from "discord.js";

export type EmojiFn = (x:string) => string | Discord.Emoji
export type BoldifyFn = (x:string) => string

export interface DummyChannel {
  id : string
  name: string
  send: () => {}
}
export interface Context {
  emojify: EmojiFn;
  boldify: BoldifyFn;
  fleetId: string; // Snowflake
  author: any;
  bot? : Discord.Client;
  channel : Discord.GuildTextBasedChannel | Discord.TextBasedChannel | DummyChannel;
  embed? : any;
  // msg? : Discord.Message;
  guild?: Guild
  sender: PartialTextBasedChannelFields
  callback? : any; // FIXME
  isEntitled(userid: string): boolean ;
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
  bossDifficulty: number
  bossSpec?: unknown
  bossExclude?: string[]
  prefix?: string
}

