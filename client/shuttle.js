
angular.module('myApp').directive('shuttleCalc', function() {
  var vm = this;

  return {
    restrict: 'E',
    scope: {userStatus: '=', userState: '=', workoutDate: '='},
    templateUrl: 'views/shuttle.html',
    controllerAs: 'vm',
    controller: function ($scope) {

      var vm = this;
      vm.magic = 3.5;
      vm.skills = ['cmd', 'dip', 'eng', 'sec', 'med', 'sci'];
      vm.shuttleTypes = ['single','and','or'];
      vm.boostLevelToSkill = [0, 100, 150, 250, 450, 700];
      vm.vpLevels = [1500,1800,2250,2750,3500,4000];
      vm.vpToDifficulty = {
        1500:1000,
        1800:1100,
        1800:	1100,
        2250:	1300,
        2750:	1500,
        3500:	1700,
        4000:	2000
      };
      vm.shuttles = [];
      vm.boost = {skill: 'cmd', level: 0};
      vm.vpLevel = 4000;
      vm.difficulty = 2000;

      $scope.$watch('vm.vpLevel', function(newVal) {
        vm.difficulty = vm.vpToDifficulty[newVal];
      });


      vm.addShuttle = function () {
        const newShuttle = {type: 'single', skill1: 'cmd', base1: 100, skill2: 'dip', base2: 100, multiplier: 1};
        vm.shuttles.push(newShuttle);
      };

      vm.removeShuttle = function () {
        vm.shuttles.pop();
      };

      vm.shuttleSkill = shuttleSkill;

      // Constructor
      //Add a shuttle to start with as sample
      vm.addShuttle();

      vm.success = function() {
        let totalSkill = _.chain(vm.shuttles)
          .map(x => shuttleSkill(x, vm.boost))
          .reduce(function(a,b){return a+b;}, 0)
          .value();
        vm.avgSkill = totalSkill / vm.shuttles.length;
        // Now apply the logistics formula!
        return Math.floor(100/(1+Math.exp(-(vm.avgSkill/vm.difficulty-0.5)*vm.magic)));

      };

      // This is the key function!
      function shuttleSkill(shuttle, boost) {
        let normalBase = 0;
        if (shuttle.type === 'single') {
          let base1 = +shuttle.base1;
          if (shuttle.skill1 === boost.skill) {
            base1 += +vm.boostLevelToSkill[boost.level];
          }
          normalBase = base1;
        }
        else if (shuttle.type === 'or') {
          let base1 = +shuttle.base1;
          if (shuttle.skill1 === boost.skill) {
            base1 += +vm.boostLevelToSkill[boost.level];
          }
          let base2 = +shuttle.base2;
          if (shuttle.skill2 === boost.skill) {
            base2 += +vm.boostLevelToSkill[boost.level];
          }
          normalBase = (base2 > base1) ? base2 : base1;

        }
        else if (shuttle.type === 'and') {
          normalBase = (+shuttle.base1 > +shuttle.base2) ? (+shuttle.base1 + 0.25*shuttle.base2) : (+shuttle.base2 + 0.25*shuttle.base1);
          // Let's have full boost if either matches
          if ((shuttle.skill1 === boost.skill) || (shuttle.skill2 === boost.skill)) {
            normalBase += +vm.boostLevelToSkill[boost.level];
          }
        }

        return normalBase * shuttle.multiplier;
      }

    }
  }
});
