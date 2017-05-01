'use strict';

(function( myService){

  if (typeof module !== 'undefined' && module.exports ) {
    const Combinatorics = require('./combinatorics.js');
    const underscore = require ('underscore');
    module.exports = myService(Combinatorics, underscore);
  } else if( angular) {
    angular.module('myApp')
      .factory('Gauntlet', function(Combinatorics){
        return myService(Combinatorics, _);
      });


  } else {
    // Die?
    // window.myService = myService;
  }

}(function (Combinatorics, _) {
  const skills = ['cmd','dip','eng','sec','med','sci'];
  const featuredSkillWeight = 2.0;
  const skillCombos = squareCombo(skills, sk => sk);

  return {
    featuredSkillWeight: featuredSkillWeight,
    skills : skills,
    comboAvg:comboAvg,
    analyseChars: analyseChars,
    analyseCharCombos: analyseCharCombos,
    topChars: topChars,
    dbCharToChar : dbCharToChar,
  };

  function topChars(chars, featuredSkill, featuredSkillWeight) {
    var res = analyseChars(chars, featuredSkill, featuredSkillWeight);
    var nms = res.result.map(x => x[1].name);
    return _.uniq(nms);
  }

  function analyseCharCombos(chars, featuredSkill, featuredSkillWeight) {
    if (chars.length<5) return [];

    //noprotect
    var cmb = Combinatorics.combination(chars, 5);
    var res = [];

    var cmbChars;
    while( cmbChars = cmb.next()) {
      var rec = analyseChars(cmbChars, featuredSkill, featuredSkillWeight);
      var summary = {names:cmbChars.map(c => c.name), namesMore: cmbChars.map(c => `${c.name} (${c.crit}%)`), total:rec.total};
      res.push(summary);
    }

    // sort in descending total order
    res = _.sortBy(res, x => -x.total);

    return res;
  }

  function fatigueStrengths(chars, strengths) {
    // fatigue[charIdx] = numOfUses
    var fatigue = Array(chars.length).fill(0);
    // Mutable strengths that we use for some DP
    // adjStrengths[skillComboIdx][charIdx] = strength
    //var adjStrengths = strengths.map(x => Array(x.length).fill(0.0));
    var adjStrengths = strengths;

    var newResult = _.range(skillCombos.length).map(skIdx =>
      [skillCombos[skIdx], {name:'Noone'}, skIdx, -1, 0.0]
    );
    // A sort of DP algo where we copy over best skill to result, and remove from source data
    for (var iter=0; iter<skillCombos.length; iter++) {
      const current = currentBests(adjStrengths);
      const bestOfAll = _.max(current, x => x[4]); // strength
      const bestSkIdx = bestOfAll[2];
      const bestCharIdx = bestOfAll[3];
      // Copy into target
      newResult[bestSkIdx] = bestOfAll;
      // Now remove combo from next iteration
      for (var charIdx = 0; charIdx<chars.length; charIdx++) {
        adjStrengths[bestSkIdx] =  Array(adjStrengths[bestSkIdx].length).fill(0.0);
      }
      // Increase the fatigue for this char
      fatigue[bestCharIdx] ++;
      // Fatigue the remaining strengths for this char
      for (var skillIdx = 0; skillIdx < skillCombos.length; skillIdx++) {
        adjStrengths[skillIdx][bestCharIdx] *= 0.8; // 20% skill reduction!
      }

    }

    return newResult;

    function currentBests(sts) {
      var curBestChars = _.range(skillCombos.length).map(skIdx => {
        var bestIdx = _.max(_.range(chars.length), charIdx => sts[skIdx][charIdx]);
        var best = chars[bestIdx];
        return [skillCombos[skIdx], best, skIdx, bestIdx, adjStrengths[skIdx][bestIdx], fatigue[bestIdx]];
      });
      // curBestChars[skIdx] = [combo, bestChar, skIdx, bestIdx, strength, fatigue]
      return curBestChars;
    }

  }

  function analyseChars(chars, featuredSkill, featuredSkillWeight) {
    // strengths[skIdx][charIdx] = strength

    // Step 1: Unfatigued strengths
    // strengths[skillComboIdx][charIdx] = strength
    var strengths = [];

    for (var j=0; j<skillCombos.length;j++) {
      strengths[j] = [];
      for (var i=0; i<chars.length; i++) {
        strengths[j][i] = comboAvg(chars[i], skillCombos[j]);
      }
    }
    // Step 2/3: TODO: Produce fatigued strengths
    var result = fatigueStrengths(chars, strengths);


    // Step 4: Compute totals
    var denom=0.0;
    var sum = _.reduce(result, function(a,b){
      var featured = _.contains(b[0], featuredSkill);

      denom += featured ? featuredSkillWeight : 1.0;
      // Crits will double the skill value
      return a+ b[4] * (featured ? 2.0 : 1.0 );
    },0);
    // Step 5: Return the required structure

    return {result: result, total: sum/denom};
  }

  function comboAvg (char, sks) {

    var crit = char.crit;
    return _.chain(char.skills)
      .filter(function(sk){return _.contains(sks, sk.name);})
      .map(function(sk){return (1+crit/100)*3*(sk.min+sk.max)/2;})
      .reduce(function(a,b){return a+b;}, 0)
      .value();
  }

  function squareCombo(arr, cb, foo) {
    var ret = [];
    for (var i=0; i<arr.length; i++) {
      for (var j=i+1; j<arr.length;j++) {
        ret.push(cb( [arr[i], arr[j]], foo ));
      }
    }
    return ret;
  }


  function bestCharForSkills(chars, sks) {
    return _.max(chars, function(char) {return comboAvg(char, sks);});
  }

  function analyseCombo(sks, chars) {
    var best = bestCharForSkills(chars, sks)
    return [sks, best];
  }


  function dbCharToChar(dbChar) {
    var char = {};
    char.name = dbChar.name;
    char.crit = 5;
    char.selected = true;

    char.skills = _.chain(skills)
      .filter(function(sk){return !!dbChar[sk.toLowerCase()];})
      .map(function(sk){return {name:sk, min: +dbChar[sk.toLowerCase()].minroll, max:+dbChar[sk.toLowerCase()].maxroll};})
      .value();

    return char;
  }

}));



