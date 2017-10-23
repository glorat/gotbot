module.exports = {
  calcAntiMatter : calcAntiMatter,
  solveTime: solveTime,
  calcSkillSuccess: calcSkillSuccess,
  configString:configString
};

const goalSeek = require('./modules/goalSeek.js');

const mult = [3,2,1,1,1,1].map(x => x/9);

// Constants!
const baseSkill = 750;
const dripHr = 140;
const gainPerHr = 5;
const lossPerHr = 30;
const hazardsPerHr = 38;
const difficultyPerHr = 1000;

function configString() {
  const ret = `Base difficulty: ${baseSkill}
Anti-matter drip per hr: ${dripHr}
Hazards per hr: ${hazardsPerHr}
Relative skill distribution: ${mult.join(',')}
`;
  return ret;
}

function calcAntiMatter(skills, start, time) {
  if (skills.length !== 6) return 0;

  let antimatter = start;
  for (let m=0; m<6; m++) {
    antimatter += Math.min(time, (skills[m]-baseSkill)/difficultyPerHr) * hazardsPerHr * gainPerHr * mult[m];
    antimatter -= Math.max(0, time-(skills[m]-baseSkill)/difficultyPerHr) * hazardsPerHr * lossPerHr * mult[m];
  }

  antimatter -= dripHr * time;
  return antimatter;
}

function calcSkillSuccess(skills, time) {
  let ret = [];
  for (let m=0; m<6; m++) {
    let good = Math.round(Math.min(time, (skills[m]-baseSkill)/difficultyPerHr) * hazardsPerHr * mult[m]);
    let bad = Math.round(Math.max(0, time-(skills[m]-baseSkill)/difficultyPerHr) * hazardsPerHr * mult[m]);
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
