angular
  .module("myApp", ['ui.bootstrap'])
  .controller("GotCtrl", function($scope, $http, $sce, Combinatorics, Gauntlet) {

    var vm = this;
    vm.skills = ['cmd','dip','eng','sec','med','sci'];
    vm.commandResult = {message:'', error:''};

    vm.sendCommand = function() {
      let cmd = vm.command;

      $http({
        method: 'POST',
        url: '/command',
        data: {command: cmd}

      }).then(function successCallback(response) {
        vm.commandResult.error = $sce.trustAsHtml(response.data.error);
        vm.commandResult.message = $sce.trustAsHtml(response.data.message);
      }, function errorCallback(response) {
        // called asynchronously if an error occurs
        // or server returns response with an error status.
        vm.commandResult = {message:'', error:response}
      });
    };


  });
