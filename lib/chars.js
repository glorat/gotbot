const fs = require('fs');

var charstars;

module.exports = {
  charStars: charStars,
  reloadStatic:reloadStatic
};

function charStars() {
  return charstars;
}

function reloadStatic() {
  fs.readFile('lib/crew.json', 'utf8', function (err, data) {
    if (err) throw err; // we'll not consider error handling for now
    charstars = JSON.parse(data);
  })
}

// Get it on startup
reloadStatic();
