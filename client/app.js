angular
  .module("myApp", ['ui.bootstrap', 'mobile-angular-ui', 'ngRoute'])
  .config(['$routeProvider','$locationProvider',
    function($routeProvider) {
      $routeProvider.
        when('/shuttle', {
          template: '<shuttle-calc></shuttle-calc>',
          reloadOnSearch: false
        })
        .when('/gauntlet', {
          templateUrl: 'views/gauntlet.html',
          controller: 'GauntletCtrl',
          controllerAs: 'vm',
          reloadOnSearch: false
        })
        .when('/console', {
          templateUrl: 'views/console.html',
          reloadOnSearch: false
        })
        .otherwise({
          templateUrl: 'views/main.html',
          reloadOnSearch: false
        });
    }])
  .directive('gauntletCalc', function() {
    var vm = this;

    return {
      restrict: 'E',
      scope: {userStatus: '=', userState: '=', workoutDate: '='},
      templateUrl: 'views/gauntlet.html',
      controllerAs: 'vm',
      controller: GauntletCtrl
    };
  })
  .controller("GauntletCtrl", GauntletCtrl);

function GauntletCtrl($scope, $http, Combinatorics, Gauntlet) {

  var charIdx = 0;
  function newChar() {
    return {
      name:'Char ' + ++charIdx,
      crit:5,
      selected:true,
      skills : [
        {name:'cmd', min:0, max:0},
        {name:'dip', min:0, max:0},
        {name:'sec', min:0, max:0}
      ]
    };
  }

  var vm = this;
  vm.skills = ['cmd','dip','eng','sec','med','sci'];
  vm.featuredSkillWeight = 2.0;

  var saved = (typeof localStorage === 'object') ? localStorage.getItem('crew') : '';
  if (!saved) {saved = '';}
  if (saved !== '') {
    vm.chars = JSON.parse(saved) ;
  }
  else {
    resetCrew();
  }

  vm.reset = resetCrew;

  $http({
    method: 'GET',
    url: '/users'
  }).then(function successCallback(response) {
    vm.users = response.data;
  }, function errorCallback(response) {
    // called asynchronously if an error occurs
    // or server returns response with an error status.
  });

  function resetCrew() {
    vm.chars = [0,1,2,3,4].map(newChar);
  }

  function save() {
    localStorage.setItem('crew', JSON.stringify(vm.chars));

  }

  vm.comboAvg = Gauntlet.comboAvg;

  vm.analyse = function() {
    save();
    var selectedChars = _.filter(vm.chars, c=>c.selected);

    var res = Gauntlet.analyseChars(selectedChars, vm.featuredSkill, vm.featuredSkillWeight);
    vm.result = res.result;
    vm.total = res.total;
  };

  vm.addChar = function() {
    vm.chars.push(newChar());
  };

  vm.removeChar = function() {
    vm.chars.pop();
  };

  vm.analyseAll = function() {
    save();
    var selectedChars = _.filter(vm.chars, c=>c.selected);
    var res = Gauntlet.analyseCharCombos(selectedChars, vm.featuredSkill, vm.featuredSkillWeight);
    vm.fullRes = res;
  };

  vm.selectBest = function() {
    var best = Gauntlet.topChars(vm.chars, vm.featuredSkill, vm.featuredSkillWeight);

    _.each(vm.chars,
      char => char.selected = _.contains(best, char.name)
    );
  };

  vm.onSelectedUserChange = function() {

    $http({
      method: 'GET',
      url: `/user/${vm.selectedUser._id}`
    }).then(function successCallback(response) {
      const user = response.data;

      function dbCharToChar(dbChar) {
        var char = {};
        char.name = dbChar.name;
        char.crit = 5;
        char.selected = true;

        char.skills = _.chain(vm.skills)
          .filter(function(sk){return !!dbChar[sk.toLowerCase()];})
          .map(function(sk){return {
            name:sk,
            min: dbChar[sk.toLowerCase()].minroll,
            max:dbChar[sk.toLowerCase()].maxroll,
            base:dbChar[sk.toLowerCase()].base
          };})
          .sortBy(x => -x.base)
          .value();

        return char;
      }

      if (user.crew.length>0) {
        vm.chars = _.map(user.crew, dbCharToChar);
      }

    }, function errorCallback(response) {
      // called asynchronously if an error occurs
      // or server returns response with an error status.
    });
  };
}

angular.module('myApp').directive('selectOnClick', ['$window', function ($window) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      element.on('click', function () {
        if (!$window.getSelection().toString()) {
          // Required for mobile Safari
          this.setSelectionRange(0, this.value.length)
        }
      });
    }
  };
}]);
