pathParadox.config(function ($stateProvider) {
    $stateProvider.state('pickGame', {
        url: '/pickgame',
        templateUrl: '/browser/js/pickGame/pickGame.html',
        controller: 'pickGameCtrl'
    });
});

pathParadox.controller('pickGameCtrl', function ($scope, $state, $firebaseArray, $firebaseObject, gameAssets) {
    var ref = firebase.database().ref();
    var obj = $firebaseObject(ref);

    firebase.auth().onAuthStateChanged(function (user) {
        if (!user) {
            $state.go('login')
            console.log("must sign in")
        } else {
            console.log("welcome, please join or create a game")
        }

    })

    $scope.createGame = function (gameName) {
        var gameRef = ref.child('games').child(gameName);
        var playersRef = gameRef.child('players');
        var markersRef = gameRef.child('availableMarkers');
        var markersArr = $firebaseArray(markersRef);
        var deckRef = gameRef.child('deck');
        var deckArr = $firebaseArray(deckRef);
        var currPlayerRef = gameRef.child('currentPlayerIndex');
        var currPlayerArr = $firebaseArray(currPlayerRef);
        gameRef.set({
            "gameName": gameName,
            'currentPlayerIndex': 0
        });

        firebase.auth().onAuthStateChanged(function (user) {
            if (user) {
                var newPlayer = {
                    uid: user.uid,
                    name: user.displayName
                };
                $firebaseArray(playersRef).$add(newPlayer);
            } else {
                console.log("no one logged in");
            }
        });

        var tiles = gameAssets.tiles;

        var deck = new Deck(tiles).shuffle().tiles;
        deckArr.$add(deck);

        markersArr.$add(gameAssets.markers);


        $state.go('game', {
            "gameName": gameName
        });
    };

    $scope.goToGameList = function () {
        $state.go('gamelist');
    };
});
