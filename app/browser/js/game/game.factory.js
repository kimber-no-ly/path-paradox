pathParadox.factory('gameFactory', function($firebaseAuth, $state, $rootScope) {
  return {
    rotateTile: function(tile, rotation) {
      if (rotation > 0) {
        for (var i = 1; i <= rotation; i++) {
          tile.paths = tile.paths.map(function(connection) {
            connection = connection + 2;
            if (connection === 9) connection = 1;
            if (connection === 8) connection = 0;
            return connection;
          });
          tile.paths.unshift(tile.paths.pop());
          tile.paths.unshift(tile.paths.pop());
        }
      }
      return tile;
    },
    logInWithGoogle: function() {
      $firebaseAuth()
      .$signInWithPopup("google")
      .then(function(authData) {
        $rootScope.currentUser = authData;
        $state.go('pickGame');
      }).catch(function(error) {
        console.error("Authentication failed:", error);
      });
    }
  };
});
