
const cfg = require('../config.js');
const Datastore = require('nedb');
const Promise = require("bluebird");

const users = new Datastore({ filename: cfg.nedbpath, autoload: true });

Promise.promisifyAll(users);

module.exports = {
  users: users,
  get: get,
  update: update
};

function update(userid, fn) {
  const qry = {_id: userid};
  return get(userid).then(doc => {
    const newDoc = fn(doc);
    users.update(qry, newDoc, {upsert: true});
    return newDoc;
  });
}


function get(userid, context) {
  function vivify(doc) {
    if (doc === null) {
      doc = {_id: userid, username: context.author.username, crew: []};
    }
    if (!doc.base) {
      doc.base = {cmd:0, dip:0, eng:0, sec:0, med:0, sci:0};
    }
    if (!doc.prof) {
      doc.prof = {cmd:0, dip:0, eng:0, sec:0, med:0, sci:0};
    }
    return doc;
  }
  const qry = {_id: userid};
  return users.findOneAsync(qry).then(vivify);
}
