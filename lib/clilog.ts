import cfg from '../config'
import Datastore from './modules/nedb-async'

interface CmdLogDoc {
  cmd: string
  authorId: string
  authorName: string
  channelId: string
  channelType: string | number
  channelName?: string
  guildId?: string
  guildName?: string
}

const cmds = new Datastore<CmdLogDoc>({
  filename: cfg.clilogpath,
  autoload: true,
})

export { cmds, logCommand }

function logCommand(cmd: string, context: any) {
  const doc: CmdLogDoc = {
    cmd: cmd,
    authorId: context.author.id,
    authorName: context.author.username,
    channelId: context.channel.id,
    channelType: context.channel.type,
  }
  if (context.channel.type === 'text') {
    doc.channelName = context.channel.name
    doc.guildId = context.channel.guild.id
    doc.guildName = context.channel.guild.name
  }
  void cmds.asyncInsert(doc) // Fire and forget
}
