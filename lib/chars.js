const fs = require('fs');
const _ = require('underscore');

var charstars;

module.exports = {
  charStars: charStars,
  matchNames: matchNames,
  reloadStatic:reloadStatic
};

function charStars() {
  return charstars;
}

function matchNames(one, two, three) {
  var names = _.keys(charstars);
  [one,two,three].forEach(x => {
    if (x) {
      names = _.filter(names, nm => nm.toLowerCase().includes(x.toLowerCase()));
    }
  });
  return names;
}

function reloadStatic() {
  fs.readFile('lib/crew.json', 'utf8', function (err, data) {
    if (err) throw err; // we'll not consider error handling for now
    charstars = JSON.parse(data);
  })
}

// Get it on startup
reloadStatic();
