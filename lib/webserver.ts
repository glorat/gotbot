'use strict';
import cfg from '../config.js';
import express from 'express';
const http = express();
const bodyParser = require('body-parser');
const db      = require('./crewdb.js');
const cli = require('./cli.js');
//const json2csv = require("json2csv");
import * as api from './Interfaces'

module.exports = {
};


http.use(express.static('client'));

http.use(bodyParser.json());

http.get('/', function (req, res) {
  res.send('Hello World!');
});

http.get('/users', function (req, res) {
  db.users.find({}, {_id:1, username:1}, function(err:any, doc:any) {
    res.json(doc);
  });
});

http.get('/user/:userId', function (req, res) {
  const qry = { _id: req.params.userId };

  db.users.findOne(qry, function (err:any, doc:any) {
    if (doc === null) {
      doc = {_id:req.params.userId, username: 'anonymous', crew:[]};
    }
    res.json(doc);
  });
});

/*
http.get('/usercsv/:userId', function (req, res) {
  const qry = { _id: req.params.userId };

  db.users.findOne(qry, function (err, doc) {
    if (doc === null) {
      doc = {_id:req.params.userId, username: 'anonymous', crew:[]};
    }
    const skillfields = chars.skills.map(sk => {return {label:`${sk}base`, value:`${sk}.base`};});
    const fields = ['name','vaulted'].concat(skillfields);
    const csv = json2csv({ data: doc.crew, fields: fields });

    res.set('Content-Type', 'text/plain');
    //res.set('Content-Type', 'application/octet-stream');
    res.send(csv);
  });
});*/

const emojify : api.EmojiFn = em => `<img src="emoji/${em}.png">`;

http.post('/command', function(req,res) {
  let context : api.Context  = {
    author: {username:'test', id:-1},
    channel: {id:'-2',name:'webserver'},
    isEntitled: function(){return false;},
    emojify : emojify,
    boldify : x => `<b>${x}</b>`,
    fleetId : '-1'
  };

  let cmd = cfg.prefix + ' ' + req.body.command;

  cli.sendCommand(cmd, context).then(function(msg:any) {
    res.json({message:msg, embed:context.embed});
  });

});

http.get('/commands', function(req, res) {
  res.json(cli.commands());
});

http.listen(cfg.httpport, function () {
  console.log('Web server listening on port ' +  cfg.httpport);
});

