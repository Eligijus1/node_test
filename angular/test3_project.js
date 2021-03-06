angular.module('project', ['ngRoute', 'firebase'])
.value('fbURL', 'https://ng-projects-list.firebaseio.com/')
.service('fbRef', function(fbURL) {
  console.debug('service fbRef. fbURL=', fbURL);
  return new Firebase(fbURL)
})
.service('fbAuth', function($q, $firebase, $firebaseAuth, fbRef) {
  console.debug('service fbAuth');
  var auth;
  return function () {
      console.debug('service fbAuth return');
      if (auth) return $q.when(auth);
      var authObj = $firebaseAuth(fbRef);
      if (authObj.$getAuth()) {
        return $q.when(auth = authObj.$getAuth());
      }
      var deferred = $q.defer();
      authObj.$authAnonymously().then(function(authData) {
          auth = authData;
          deferred.resolve(authData);
      });
      return deferred.promise;
  }
})
 
.service('Projects', function($q, $firebase, fbRef, fbAuth, projectListValue) {
  console.debug('service Projects');
  var self = this;
  this.fetch = function () {
    if (this.projects) return $q.when(this.projects);
    return fbAuth().then(function(auth) {
      var deferred = $q.defer();
      var ref = fbRef.child('projects-fresh/' + auth.auth.uid);
      var $projects = $firebase(ref);
      ref.on('value', function(snapshot) {
        if (snapshot.val() === null) {
          $projects.$set(projectListValue);
        }
        self.projects = $projects.$asArray();
        deferred.resolve(self.projects);
      });
 
      //Remove projects list when no longer needed.
      ref.onDisconnect().remove();
      return deferred.promise;
    });
  };
})
 
.config(function($routeProvider) {
  var resolveProjects = {
    projects: function (Projects) {
      console.debug('config.Projects', Projects);
      return Projects.fetch();
    }
  };
  
  console.debug('config.resolveProjects', resolveProjects);
 
  $routeProvider
    .when('/', {
      controller:'ProjectListController as projectList',
      templateUrl:'test3_list.html',
      resolve: resolveProjects
    })
    .when('/edit/:projectId', {
      controller:'EditProjectController as editProject',
      templateUrl:'test3_detail.html',
      resolve: resolveProjects
    })
    .when('/new', {
      controller:'NewProjectController as editProject',
      templateUrl:'test3_detail.html',
      resolve: resolveProjects
    })
    .otherwise({
      redirectTo:'/'
    });
    
  console.debug('config.routeProvider', $routeProvider);
})
 
.controller('ProjectListController', function(projects) {
  console.debug('ProjectListController');
  var projectList = this;
  projectList.projects = projects;
})
 
.controller('NewProjectController', function($location, projects) {
console.debug('NewProjectController');
  var editProject = this;
  editProject.save = function() {
      projects.$add(editProject.project).then(function(data) {
          $location.path('/');
      });
  };
})
 
.controller('EditProjectController',
  function($location, $routeParams, projects) {
    console.debug('EditProjectController');
    var editProject = this;
    var projectId = $routeParams.projectId,
        projectIndex;
 
    editProject.projects = projects;
    projectIndex = editProject.projects.$indexFor(projectId);
    editProject.project = editProject.projects[projectIndex];
 
    editProject.destroy = function() {
        editProject.projects.$remove(editProject.project).then(function(data) {
            $location.path('/');
        });
    };
 
    editProject.save = function() {
        editProject.projects.$save(editProject.project).then(function(data) {
           $location.path('/');
        });
    };
});


