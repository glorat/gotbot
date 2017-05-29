angular
  .module("myApp")
  .controller("GotCtrl", function($scope, $http, $sce) {

    var vm = this;
    vm.skills = ['cmd','dip','eng','sec','med','sci'];
    vm.commandResult = {message:'', error:''};

    vm.onCmdChange = function(name) {
      let args = _.values(vm.commands[name].args).map(x=>x.value);
      let flags = _.values(vm.commands[name].flags).filter(x=>x.value).map(x=>`-${x.alias} ${x.value}`);
      vm.command = (name + ' ' + args.join(' ') + ' ' + flags.join(' ')).trim();
    };

    vm.sendCommand = function() {
      let cmd = vm.command;

      $http({
        method: 'POST',
        url: '/command',
        data: {command: cmd}

      }).then(function successCallback(response) {
        vm.commandResult.error = $sce.trustAsHtml(response.data.error);
        vm.commandResult.message = $sce.trustAsHtml(response.data.message);
        vm.embed = response.data.embed;
      }, function errorCallback(response) {
        // called asynchronously if an error occurs
        // or server returns response with an error status.
        vm.commandResult = {message:'', error:'The server was unable to process your request. The server may be down or your connection at fault'}
      });
    };

    $http({
      method: 'GET',
      url: '/commands'
    }).then(function(response) {
      vm.commands = response.data;
    });

  });
