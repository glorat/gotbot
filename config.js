const node_env = process.env.NODE_ENV || 'development';
const isProd = node_env === 'production';

module.exports = {

  // The bot's command prefix. The bot will recognize as command any message that begins with it.
  // i.e: "-got bot foo" will trigger the command "foo",
  //      whereas "Got Bot foo" will do nothing at all.
  prefix:  isProd ? "-got bot" : '-dev bot',


  // Your bot name. Typically, this is your bot's username without the discriminator.
  // i.e: if your bot's username is MemeBot#0420, then this option would be MemeBot.
  name: isProd ? "Got Bot" : 'Proto Bot',

  // Your bot's user token. If you don't know what that is, go here:
  // https://discordapp.com/developers/applications/me
  // Then create a new application and grab your token.
  token: isProd
    ? "Mjg3ODI4NzE0OTQ5OTY3ODcy.C50_zQ.kYciwKYeUQgPqmruFoBIiVgihO0"
    : "MjkyMzAwOTAwMjA5NTI0NzQ2.C62B8g.3pztd6QerlZO717lsPHE49dnCWc",

  // If this option is enabled, the bot will delete the message that triggered it, and its own
  // response, after the specified amount of time has passed.
  // Enable this if you don't want your channel to be flooded with bot messages.
  // ATTENTION! In order for this to work, you need to give your bot the following permission:
  // MANAGE_MESSAGES - 	0x00002000
  // More info: https://discordapp.com/developers/docs/topics/permissions
  deleteAfterReply: {
    enabled: false,
    time: 30000, // In milliseconds
  },

  httpport: 3030,
  nedb: './stt.json'
};
