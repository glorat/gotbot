
const Table = require('cli-table3');

export function createDefaultTable() {
  return new Table({
    chars: {
      'top': '', 'top-mid': '', 'top-left': '', 'top-right': '', 'bottom': '',
      'bottom-mid': '', 'bottom-left': '', 'bottom-right': '', 'left': '',
      'left-mid': '', 'mid': '', 'mid-mid': '', 'right': '', 'right-mid': '',
      'middle': ''
    },
    style: {'padding-left': 0, 'padding-right': 1},
    wordWrap: true
  });
}
