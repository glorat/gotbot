const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';
const password = require('./data/password');

module.exports = {

  // The bot's command prefix. The bot will recognize as command any message that begins with it.
  // i.e: "-got bot foo" will trigger the command "foo",
  //      whereas "Got Bot foo" will do nothing at all.
  prefix: isProd ? '-got bot' : '-dev bot',

  // Your bot name. Typically, this is your bot's username without the discriminator.
  // i.e: if your bot's username is MemeBot#0420, then this option would be MemeBot.
  name: isProd ? 'Got Bot' : 'Proto Bot',

  token: isProd ? password.prod : password.dev,
  gotServer: '235536091011088394', // id of the GoT fleet server
  adminId: '232748347860058112', // id of the bot administrator

  // If this option is enabled, the bot will delete the message that triggered it, and its own
  // response, after the specified amount of time has passed.
  // Enable this if you don't want your channel to be flooded with bot messages.
  // ATTENTION! In order for this to work, you need to give your bot the following permission:
  // MANAGE_MESSAGES - 	0x00002000
  // More info: https://discordapp.com/developers/docs/topics/permissions
  deleteAfterReply: {
    enabled: false,
    time: 30000 // In milliseconds
  },

  httpport: 3030,
  baseUrl: 'http://got.glorat.net/',
  dataPath: './data/',
  nedbpath: './data/stt.json',
  clilogpath: './data/clilog.json'
};
