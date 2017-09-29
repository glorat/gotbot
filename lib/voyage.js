module.exports = {
  calcAntiMatter : calcAntiMatter,
  solveTime: solveTime,
  calcSkillSuccess: calcSkillSuccess
};

const goalSeek = require('./modules/goalSeek.js');

const mult = [3,2,1,1,1,1];

// Constants!
const baseSkill = 1000;
const dripHr = 140;
const gainPerHr = 5;
const lossPerHr = 30;
const hazardsPerHr = 38;


function calcAntiMatter(skills, start, time) {
  if (skills.length !== 6) return 0;

  let antimatter = start;
  for (let m=0; m<6; m++) {
    antimatter += Math.min(time, (skills[m]-baseSkill)/1000) * hazardsPerHr * gainPerHr * mult[m] / 9.0;
    antimatter -= Math.max(0, time-(skills[m]-baseSkill)/1000) * hazardsPerHr * lossPerHr * mult[m] / 9.0;
  }

  antimatter -= dripHr * time;
  return antimatter;
}

function calcSkillSuccess(skills, time) {
  let ret = [];
  for (let m=0; m<6; m++) {
    let good = Math.round(Math.min(time, (skills[m]-baseSkill)/1000) * hazardsPerHr * mult[m] / 9.0);
    let bad = Math.round(Math.max(0, time-(skills[m]-baseSkill)/1000) * hazardsPerHr * mult[m] / 9.0);
    ret.push({good:good, bad:bad, total:good+bad, index:m});
  }
  return ret;
}

function solveTime(skills, start) {
  return goalSeek({
    Func: calcAntiMatter,
    aFuncParams: [skills, start, 1],
    oFuncArgTarget: {
      Position:2
    },
    Goal: 0,
    Tol: 0.1,
    maxIter: 1000
  });

}
