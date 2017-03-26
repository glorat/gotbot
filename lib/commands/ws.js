var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
var _ = require('underscore');
const cfg = require('../../config.js');
const request = require('request');


module.exports = new Clapp.Command({
  name: "ws",
  desc: "Execute raw command to the web service",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const msg = context.msg;
    const channel = msg.channel.name;
    const author = msg.author.username;
    const userid = msg.author.id;
    const args = argv.args;
    var fs = require('fs');

    function emojify(sym) {
      const estat = msg.client.emojis.find(x=> x.name === sym.toLowerCase());
      return estat ? estat : sym;
    }

    var form = {func:args.func, discord:userid};
    if (argv.flags.name) {
      form.name = argv.flags.name;
    }

    console.log(`WS posting: ${JSON.stringify(form)}`);

    request.post({url:'http://got.warbytowers.co.uk/ws2.php', form: form}, function(err,httpResponse,body){
      if (err) {
        fulfill(`Some error sending command`);
      }
      else {
        fulfill(body);
      }
    });
  }),
  args: [
    {
      name: 'func',
      desc: 'Web service function to call',
      type: 'string',
      required: true
    }

  ],
  flags: [
    {
      name: 'name',
      desc: 'A name',
      type: 'string',
      default: ''
    }
  ]
});
