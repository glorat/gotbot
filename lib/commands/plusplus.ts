var Clapp = require('../modules/clapp-discord');
import cfg from '../../config';

module.exports = new Clapp.Command({
  name: "++",
  desc: "give karma",
  fn: (argv:any, context:any) => {
    let ret = `<@${cfg.adminId}> ++ deserves the karma for creating me\n`;
    return ret;
  },
  opts: {
    exclude: true
  }
});
