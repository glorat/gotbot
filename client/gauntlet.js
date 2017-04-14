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
  const skills = ['Cmd','Dip','Eng','Sec','Med','Sci'];
  const featuredSkillWeight = 2.0

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

    //noprotect
    var cmb = Combinatorics.combination(chars, 5);
    var res = [];

    var cmbChars;
    while( cmbChars = cmb.next()) {
      var rec = analyseChars(cmbChars, featuredSkill, featuredSkillWeight);
      var summary = {names:cmbChars.map(c => c.name), total:rec.total};
      res.push(summary);
    }

    // sort in descending total order
    res = _.sortBy(res, x => -x.total);

    return res;
  }

  function analyseCharsOld(chars, featuredSkill, featuredSkillWeight) {

    var result = squareCombo(skills, analyseCombo, chars);

    var denom=0.0;
    var sum = _.reduce(result, function(a,b){
      var featured = _.contains(b[0], featuredSkill);

      denom += featured ? featuredSkillWeight : 1.0;
      // Crits will double the skill value
      return a+ comboAvg(b[1],b[0]) * (featured ? 2.0 : 1.0 );
    },0);

    return {result:result, total:sum/denom};
  }

  function analyseChars(chars, featuredSkill, featuredSkillWeight) {
    // strengths[skIdx][charIdx] = strength

    // Step 1: Unfatigued strengths
    var strengths = [];
    var skillCombos = squareCombo(skills, sk => sk);

    for (var j=0; j<skillCombos.length;j++) {
      strengths[j] = [];
      for (var i=0; i<chars.length; i++) {
        strengths[j][i] = comboAvg(chars[i], skillCombos[j]);
      }
    }
    // Step 2: TODO: Produce fatigued strengths
    // This step is currently broken
    /*
     for (var charIdx=0; charIdx<chars.length; charIdx++) {
     // Descending order of best
     var charBestSkills = _.sortBy(_.range(skillCombos.length), skIdx=>{-strengths[skIdx][charIdx]});
     // Apply adjustment!
     for (var adjIdx=0; adjIdx<charBestSkills.length; adjIdx++) {
     // 20% fatigue factor per use
     var mult = 1 - (0.2 * adjIdx);
     mult = mult < 0 ? 0 : mult;
     strengths[adjIdx][charIdx] *= mult;
     }
     }*/
    var adjStrengths = strengths;

    // Step 3: Reduce to best char per sks
    var result = [];
    for (var j=0; j<skillCombos.length; j++) {
      var bestIdx = _.max(_.range(chars.length), charIdx => adjStrengths[j][charIdx]);
      var best = chars[bestIdx];
      result.push([skillCombos[j], best]);
    }

    // Step 4: Compute totals
    var denom=0.0;
    var sum = _.reduce(result, function(a,b){
      var featured = _.contains(b[0], featuredSkill);

      denom += featured ? featuredSkillWeight : 1.0;
      // Crits will double the skill value
      return a+ comboAvg(b[1],b[0]) * (featured ? 2.0 : 1.0 );
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
      .map(function(sk){return {name:sk, min: dbChar[sk.toLowerCase()].minroll, max:dbChar[sk.toLowerCase()].maxroll};})
      .value();

    return char;
  }

}));



