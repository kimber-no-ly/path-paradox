tsuro.config(function($stateProvider) {
	$stateProvider.state('game', {
		url: '/game/:gameName',
		templateUrl: '/browser/js/game/game.html',
		controller: 'gameCtrl'
	});
});

tsuro.controller('gameCtrl', function($scope, $firebaseAuth, firebaseUrl, $stateParams, $firebaseObject, $firebaseArray, $state, gameFactory) {
	var ref = firebase.database().ref();
	var obj = $firebaseObject(ref);

	var gameRef = ref.child('games').child($stateParams.gameName);
	var gameArr = gameRef.child($stateParams.gameName);

	var initialDeckRef = ref.child('games').child($stateParams.gameName).child('initialDeck');
	var initialDeckArr = $firebaseArray(initialDeckRef);

	var deckRef = gameRef.child('deck');
	var deckArr = $firebaseArray(deckRef);

	var currPlayerRef = gameRef.child('currentPlayerIndex');

	var playersRef = gameRef.child('players');
	var firebasePlayersArr = $firebaseArray(playersRef);

	var markersRef = gameRef.child('availableMarkers');
	var markersArr = $firebaseArray(markersRef);

	var spaceRef = ref.child('games').child($stateParams.gameName).child('spaces');
	var spaceObj = $firebaseObject(spaceRef);
	var spaceArr = $firebaseArray(spaceRef);


	/****************
	INITIALIZING GAME
	****************/

	// new local game with game name defined by url
	$scope.game = new Game($stateParams.gameName);

	// Start with first player in the array, index 0
	$scope.game.currentPlayerIndex = 0;


	// when the deck is loaded, local deck is the firebase deck
	deckArr.$loaded().then(function () {
		$scope.game.deck.tiles = deckArr[0];
		console.log("new deck made: ", $scope.game.deck);
	});


	// don't start watching players until there is a deck in the game
	// 'child_changed'
	playersRef.on("value", function(snap) {
		// grab the value of the snapshot (all players in game in Firebase)
		var snapPlayers = snap.val();


		// for each player in this collection...
		for (var thisPlayer in snapPlayers) {
			var existingPlayerIndex, thisIsANewPlayer;

			// console.log("got this player from snapshot", thisPlayer);
			// find this 'snap' player's index in local game. find returns that value.
			var localPlayer = $scope.game.players.find(function(plyr, plyrIdx) {
				existingPlayerIndex = plyrIdx;
				return plyr.uid === snapPlayers[thisPlayer].uid;
			});

			// if not found, create new player
			if (!localPlayer) {
				console.log('i didnt find a local player!');
				localPlayer = new Player(snapPlayers[thisPlayer].uid);
				thisIsANewPlayer = true;
			}

			// for each key in the snapPlayer's keys, add that key and value to local player
			for (var playerproperty in snapPlayers[thisPlayer]) {

				//if there is no 'me' (this is the beginning of the game) assign properties like normal
				if (!$scope.me) localPlayer[playerproperty] = snapPlayers[thisPlayer][playerproperty];
				//if there is a me and this snapplayer is me, don't update my tiles
				else if ($scope.me && snapPlayers[thisPlayer].uid !== $scope.me.uid && playerproperty !== 'tiles') localPlayer[playerproperty] = snapPlayers[thisPlayer][playerproperty];
			}

			//push local player to game.players
			if (thisIsANewPlayer) $scope.game.players.push(localPlayer);
			else $scope.game.players[existingPlayerIndex] = localPlayer;
		}

		// on login, find me in the $scope.game players array
		firebase.auth().onAuthStateChanged(function (user) {
			firebasePlayersArr.$loaded()
			.then(function (player) {
				if (user) {
					$scope.me = $scope.game.players.find((player) => player.uid === user.uid);

					$scope.meIdx;
					player.find((player, i) => {
						if (player.uid === user.uid) $scope.meIdx = i
					});

					$scope.me.marker = player[$scope.meIdx].marker;
					$scope.clicked = player[$scope.meIdx].clicked;
					$scope.me.x = player[$scope.meIdx].x;
					$scope.me.y = player[$scope.meIdx].y;
					$scope.me.i = player[$scope.meIdx].i;
					$scope.game.currentPlayer = $scope.game.players[$scope.game.currentPlayerIndex];
					$scope.myTurn = $scope.me.uid === $scope.game.currentPlayer.uid;
				} else {
					console.log("no one is logged in");
				}
			})
		})


	});

	// when that markers array is loaded, update the available markers array on scope
	markersArr.$loaded().then(function (data) {
		$scope.game.availableMarkers = data[0];
	});

	//if someone else picks a marker, update your view
	markersRef.on('child_changed', function(data) {
		$scope.game.availableMarkers = data.val();
	});

	$scope.spaces = _.flatten($scope.game.board);


	currPlayerRef.on('value', function (snapshot) {
		console.log("currentPlayerIndexPlayer index changes", snapshot.val())
		$scope.game.currentPlayerIndex = snapshot.val();

		$scope.game.currentPlayer = $scope.game.players[$scope.game.currentPlayerIndex];
		if (spaceArr.length >= 1) {
			$scope.myTurn = $scope.me.uid === $scope.game.currentPlayer.uid && $scope.me.canPlay === true;
		}

	});


	/****************
	AVAILABLE PLAYER ACTIONS AT GAME START
	****************/

	$scope.pickMarker = function (marker) {
		pickMarkerFn(marker);
	};

	function pickMarkerFn(marker) {
		$scope.me.marker = marker;

		firebasePlayersArr[$scope.meIdx].marker = marker;
		firebasePlayersArr.$save($scope.meIdx);

		var idx = $scope.game.availableMarkers.indexOf(marker);

		markersArr[0].splice(idx, 1);

		markersArr.$save(0)
		.then(function () {
			console.log("removed the picked marker");
		});
	}

	// once placed the marker, cannot place again
	$scope.clicked = false;

	//  Have player pick their start point
	$scope.placeMarker = function (point) {
		placeMarkerFn(point);
	};

	var placeMarkerFn = function (point) {
		$scope.me.placeMarker(point, $scope.game.board);
		$scope.me.tiles = $scope.game.deal(3);
		syncDeck();
		$scope.me.clicked = true;
		// FOR SOME REASON I can't just do firebasePlayersArr[$scope.meIdx] = $scope.me;
		firebasePlayersArr[$scope.meIdx].tiles = $scope.me.tiles;
		// firebasePlayersArr[$scope.meIdx].point = $scope.me.point;
		firebasePlayersArr[$scope.meIdx].x = $scope.me.x;
		firebasePlayersArr[$scope.meIdx].y = $scope.me.y;
		firebasePlayersArr[$scope.meIdx].i = $scope.me.i;
		firebasePlayersArr[$scope.meIdx].clicked = true;
		firebasePlayersArr[$scope.meIdx].canPlay = true;
		firebasePlayersArr.$save($scope.meIdx);

		return false;
	};

	/****************
	GAMEPLAY ACTIONS
	****************/
	$scope.tryTile = function(tile) {
		if($scope.game.board[$scope.me.y][$scope.me.x].image !== tile.imageUrl) {
			$scope.game.board[$scope.me.y][$scope.me.x].image = tile.imageUrl;
		}
		$scope.game.board[$scope.me.y][$scope.me.x].rotation = tile.rotation;
		$scope.chosenTile = tile;

		// CMT: need this line here in order to update the $scope.spaces for the html
		$scope.spaces = _.flatten($scope.game.board);
	};



	$scope.playersOnThisSpace = function(space){
		var gamePlayers = $scope.game.players;

		var playersOnThisSpace = gamePlayers.filter(function(player){
			if(player.x === space.x && player.y === space.y) return player;
		});

		if(playersOnThisSpace.length === 0) return null;
		return playersOnThisSpace;
	};


	$scope.playerIndex = function(player){
		if(player){
			switch (player.i){
				case 0:
				return "zero";
				case 1:
				return "one";
				case 2:
				return "two";
				case 3:
				return "three";
				case 4:
				return "four";
				case 5:
				return "five";
				case 6:
				return "six";
				case 7:
				return "seven";
				default:
				break;
			}
		}
	};

	$scope.markerColor = function(player) {
		if (player) return player.marker;
	};


	// TODO: need a function to assign dragon
	$scope.dragon;
	$scope.dragonQueue = [];


	$scope.myTurn = function() {
		$scope.me === $scope.currentPlayer;
	};


	// these are tied to angular ng-click buttons
	$scope.rotateTileCw = function (tile) {
		tile.rotation++;
		if (tile.rotation === 4) tile.rotation = 0; //set rotation to be between 0 and 3
		$scope.tryTile(tile);
	};

	$scope.rotateTileCcw = function (tile) {
		tile.rotation--;
		if (tile.rotation === -4) tile.rotation = 0; //set rotation to be between -0 and -3
		if (tile.rotation < 0) tile.rotation += 4; //set it to be between +0 and +3

		$scope.tryTile(tile);
	};



	$scope.placeTile = function (tile) {
		if (!$scope.me.canPlay) return
		//clearing out the deadPlayers array in firebase first
		var deadPlayersArr = $firebaseArray(gameRef.child('deadPlayers'));
		console.log(deadPlayersArr, deadPlayersArr.length);

		//JUST IN CASE: if we want to remove players....
		// deadPlayersArr.$loaded(function(players) {
		//     console.log(players);
		//     for (var i = 0; i < players.length; i++) {
		//         deadPlayersArr.$remove(i).then(function(ref) {
		//             console.log('I am removed');
		//         });
		//     }
		// })
		console.log("received place tile command, tile:", tile.id, "rotation", tile.rotation);
		var rotation = tile.rotation;
		var spacex = $scope.me.x;
		var spacey = $scope.me.y;
		var tileImg = tile.imageUrl;
		var tileId = tile.id;
		$scope.me.tiles = $scope.me.tiles.filter(t => t.id !== tile.id);
		firebasePlayersArr[$scope.meIdx].tiles = $scope.me.tiles;
		firebasePlayersArr.$save($scope.meIdx);
		placeTileOnSpace(spacex, spacey, tileImg, rotation, tileId);
	}


	var placeTileOnSpace = function(x, y, img, rotate, tileId) {
		console.log("assigning tile to space", `spaceId = ${spaceId}`, "tile:", tileId, "rotation", rotate);
		var spaceId = 'space' + x + y;
		spaceObj[spaceId] = {
			'img': img,
			'rotation': rotate,
			'tileId': tileId
		};
		spaceObj.$save();
	};

	spaceRef.on('child_added', function (snapshot) {
		// console.log("making moves with tile:", tile.id, "rotation", tile.rotation);
		var addedTile = snapshot.val();
		var spaceKey = snapshot.key;
		var x = +spaceKey.slice(-2, -1);
		var y = +spaceKey.slice(-1);
		var space = $scope.game.board[y][x]; // look space up in game.board

		space.image = addedTile.img;
		space.rotation = addedTile.rotation;
		var tile = gameFactory.tiles[addedTile.tileId]; // look up tile by id
		console.log("tile", tile);
		var rotatedTile = gameFactory.rotateTile(tile, snapshot.val().rotation); // rotate tile


		for (var i = 0; i < rotatedTile.paths.length; i++) {

			// if the point doesn't have neighbors... set to empty array
			if (!space.points[i].neighbors) space.points[i].neighbors = [];
			// set each point's neighbors to it's corresponding point
			space.points[i].neighbors.push(space.points[rotatedTile.paths[i]]);
		}

		if (!$scope.me) {
			console.log("it's not me, placing others where they need to be");
			//debugger;
			firebasePlayersArr.$loaded()
			.then(function (players) {
				players.forEach(function (player) {
					var playerCurrentPoint = $scope.game.board[player.y][player.x].points[player.i]
					if (playerCurrentPoint.neighbors) {
						var neighborSpace = {
							y: +playerCurrentPoint.neighbors[0].spaceId.slice(5, -2),
							x: +playerCurrentPoint.neighbors[0].spaceId.slice(6, -1),
							i: +playerCurrentPoint.neighbors[0].spaceId.slice(-1),
						}
						$scope.game.board[neighborSpace.y][neighborSpace.x].points[neighborSpace.i].travelled = true;
					}
				})
			});
		}

		// trigger move

		if ($scope.me) {
			if ($scope.me.x === x && $scope.me.y === y) {
				console.log("it's me. let's move");
				$scope.me.move($scope.game.board);
				firebasePlayersArr[$scope.meIdx].x = $scope.me.x;
				firebasePlayersArr[$scope.meIdx].y = $scope.me.y;
				firebasePlayersArr[$scope.meIdx].i = $scope.me.i;
				firebasePlayersArr[$scope.meIdx].canPlay = $scope.me.canPlay;
				firebasePlayersArr.$save($scope.meIdx);
				if(!$scope.me.canPlay){
					$scope.myTurn=false;
					console.log("I'm dead");
					//add me to list of deadPlayers for this round
					$firebaseArray(gameRef.child('deadPlayers')).$add({ 'name': $scope.me.name });
				}
			}

			//if I die return my cards to the deck
			if(!$scope.me.canPlay && $scope.me.tiles.length>0){
				//debugger;
				console.log("returning my tiles", $scope.me.tiles, "to the deck", $scope.game.deck);
				$scope.game.deck.reload($scope.me.tiles).shuffle();
				console.log("shuffled deck", $scope.game.deck);
				syncDeck();
				console.log("I should have no tiles", $scope.me.tiles);
				//tell firebase we dont't have any more tiles
				firebasePlayersArr[$scope.meIdx].tiles = $scope.me.tiles;
				firebasePlayersArr.$save($scope.meIdx);
			}

			console.log("viable players:", $scope.game.getCanPlay());
			if ($scope.game.getCanPlay().length<=1 || spaceArr.length ===35) {
				// debugger;
				console.log("I believe we have an ending");
				$scope.winner = $scope.game.getCanPlay();
				if ($scope.winner) {
					//Adding the winner into firebase
					$scope.winner.forEach(winner => $firebaseArray(gameRef.child('winners')).$add({ 'name': winner.name }));
					console.log("#winning!");

				}
				else{
					console.log("game over, no one wins")
				}
				// TODO: disable everything, let the players reset the game
				$scope.gameOver = true;
				return "game over"
			}

			// //LA: I think this is duplicating the logic for death above
			// if ($scope.game.deadPlayers().length) {
			// 	// with new cards & need to reshuffle
			// 	// because the deadPlayers() returns a 2D array, use reduce to flatten it
			// 	var deadPlayerTiles = $scope.game.deadPlayers().reduce(function (a, b) {
			// 		return a = a.concat(b);
			// 	});
			// 	$scope.game.deck = $scope.game.deck.concat(deadPlayerTiles);
			// 	$scope.game.deck = $scope.game.deck.shuffle();
			// 	deckArr.$remove()
			// 	.then(function () {
			// 		deckArr.$add($scope.game.deck);
			// 	});
			// }

			let firebaseDragonArr = $firebaseArray(gameRef.child('dragonQueue'));
			let dragonRef = gameRef.child('dragon');
			//DRAGON
			//if no card in the deck push in dragonQueue;
			if ($scope.game.deck.length() === 0){
				console.log("deck is empty");
				$scope.dragonQueue.push($scope.me)
				//push to Firebase
				$firebaseDragonArr.$add($scope.me.uid);
				console.log(`added myself to the dragonQueue`);
				//scope.dragon =current dragon or next in queue;
				$scope.dragon = $scope.dragon || $scope.dragonQueue.shift();
				console.log(`current dragon is ${scope.dragon}`);
				//upload dragon info to Firebase - uid
				gameRef.set({'dragon': $scope.dragon.uid})

			}else {
				console.log(`deck has cards`);
				// if deck and dragon deal to dragonQueue first until players have 3 tiles
				while ($scope.dragon && $scope.deck.length>0) {
					console.log(`serving dragonQueue first`);
					if($scope.dragon.tiles.length<3){
						//TODO: LA : consider _.flatten
						$scope.dragon.tiles = $scope.dragon.tiles.concat($scope.game.deal(1));
					}
					console.log(`${$scope.dragon} dealt card`);
					$scope.dragon = $scope.dragonQueue.shift()
				}
				//deal to me if I dont have three.
				console.log(`attempting to refresh a hand`);
				if($scope.me.tiles.length < 3 && $scope.me.canPlay){
					let newTile = $scope.game.deal(1)
					syncDeck();
					$scope.me.tiles= $scope.me.tiles.concat(newTile);
					firebasePlayersArr[$scope.meIdx].tiles = $scope.me.tiles;
					firebasePlayersArr.$save($scope.meIdx);
				}
				console.log("deckArr and scope deck:", deckArr, $scope.game.deck);
			}


			if ($scope.me.uid === $scope.game.currentPlayer.uid && !$scope.gameOver) {
				// console.log("on to the next one", $scope.game.nextCanPlay());
				gameRef.update({
					"currentPlayerIndex": $scope.game.nextCanPlay()
				});
			}

		}
	});

	$scope.leaveGame = function() {
		console.log("i'm out");

		// remove the player from firebase
		firebasePlayersArr.$remove(firebasePlayersArr[$scope.meIdx]);

		$state.go('pickGame');
	};

	// TODO: need to remove this game room's moves from firebase?
	$scope.reset = function () {
		Promise.all([
		spaceObj.$remove(),

		markersArr.$remove(0)
		.then(function(ref) {
			markersArr.$add(["red", "orange", "yellow", "green", "aqua", "blue", "navy", "purple"]);
		}),

		deckArr.$remove(0)
		.then(function(ref) {
			var tiles = gameFactory.tiles;
			var deck = new Deck(tiles).shuffle().tiles;
			deckArr.$add(deck);
		}),

		gameRef.update({
			'currentPlayerIndex': 0
		}),

		firebasePlayersArr.$loaded().then(function (data) {
			for (var i = 0; i < data.length; i++) {
				data[i].clicked = true;
				data[i].i = null;
				data[i].x = null;
				data[i].y = null;
				data[i].clicked = false;
				data[i].canPlay = null;
				data[i].marker = null;
				data[i].point = null;
				data[i].tiles = null;
				firebasePlayersArr.$save(i);
			}
		})


	]).then((all) => {
			console.log($scope.me);
			// $state.reload();
			$state.go($state.current, {}, {reload: true});
		})
		.catch(console.error)

	};


	function syncDeck() {
		// deckArr = $firebaseArray(deckRef)
		console.log(`syncing deck`, deckArr, `with ${$scope.game.deck.tiles}`);
		//look out for deck reset now
		deckArr[0] = $scope.game.deck.tiles;
		console.log("saving the deck", deckArr);
		// debugger;
		return deckArr.$save(0);
	}

	$scope.starttop = [
		[0, 0, 0],
		[0, 0, 1],
		[1, 0, 0],
		[1, 0, 1],
		[2, 0, 0],
		[2, 0, 1],
		[3, 0, 0],
		[3, 0, 1],
		[4, 0, 0],
		[4, 0, 1],
		[5, 0, 0],
		[5, 0, 1]
	];
	$scope.startleft = [
		[0, 0, 7],
		[0, 0, 6],
		[0, 1, 7],
		[0, 1, 6],
		[0, 2, 7],
		[0, 2, 6],
		[0, 3, 7],
		[0, 3, 6],
		[0, 4, 7],
		[0, 4, 6],
		[0, 5, 7],
		[0, 5, 6]
	];
	$scope.startbottom = [
		[0, 5, 5],
		[0, 5, 4],
		[1, 5, 5],
		[1, 5, 4],
		[2, 5, 5],
		[2, 5, 4],
		[3, 5, 5],
		[3, 5, 4],
		[4, 5, 5],
		[4, 5, 4],
		[5, 5, 5],
		[5, 5, 4]
	];
	$scope.startright = [
		[5, 0, 2],
		[5, 0, 3],
		[5, 1, 2],
		[5, 1, 3],
		[5, 2, 2],
		[5, 2, 3],
		[5, 3, 2],
		[5, 3, 3],
		[5, 4, 2],
		[5, 4, 3],
		[5, 5, 2],
		[5, 5, 3]
	];

	function gameOver(){
		$scope.winner = $scope.game.getCanPlay();
		if (!$scope.winner) {
			//Adding the winner into firebase
			$scope.winner.forEach(winner => $firebaseArray(gameRef.child('winners')).$add({ 'name': winner.name }));
			console.log("#winning!");

		}
		else{
			console.log("game over, no one wins")
		}
		// TODO: disable everything, let the players reset the game
		$scope.gameOver = true;
		return "game over"
	}
});

tsuro.directive('tile', function () {
	return {
		templateUrl: 'browser/js/game/tile.directive.html',
		scope: {
			'thisTile': '=',
			'tryTile': '&tryTile',
			'rotateccw': '&rotateccw',
			'rotatecw': '&rotatecw',
			'place': '&place',
			'myTurn': '='
		}
	};
});
