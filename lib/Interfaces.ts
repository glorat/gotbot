import * as Discord from 'discord.js'
import { Guild } from 'discord.js'

export type EmojiFn = (x: string) => string | Discord.Emoji
export type BoldifyFn = (x: string) => string
export type CommandArgValue = string | number | boolean | null | undefined
export type CommandArgs = Record<string, CommandArgValue>
export type CommandFlags = Record<string, CommandArgValue>
export type CommandCallback = (message: string) => void
export type CommandAuthor = Discord.User | { username: string; id: string }
export type CommandChannel = Discord.SendableChannels | DummyChannel

export interface DummyChannel {
  id: string
  name: string
  send: (message?: unknown) => unknown
}

export interface ClappArgs {
  args: CommandArgs
  flags: CommandFlags
}

export interface Context {
  emojify: EmojiFn
  boldify: BoldifyFn
  fleetId: string // Snowflake
  author: CommandAuthor
  bot?: Discord.Client
  channel: CommandChannel
  embed?: Discord.APIEmbed | Discord.EmbedBuilder
  // msg? : Discord.Message;
  guild?: Guild
  sender: CommandChannel
  callback?: CommandCallback
  isEntitled(userid: string): boolean
}

export interface AssetRef {
  file: string
}
export interface CrewAvatar {
  id: number
  symbol: string
  name: string
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
  _id: any
  eventChar: Array<string>
  eventTrait: Array<Array<string>>
  starbase: Object
  starprof: Object
  bossDifficulty: number
  bossSpec?: unknown
  bossExclude?: string[]
  prefix?: string
}
