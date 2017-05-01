
const cfg = require('../config.js');
var Datastore = require('nedb');
const Promise = require("bluebird");

var users = new Datastore({ filename: cfg.nedbpath, autoload: true });

Promise.promisifyAll(users);

module.exports = {
  users: users
};
