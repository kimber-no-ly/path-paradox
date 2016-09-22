var pathParadox = angular.module('PathParadox', ['ui.router', 'firebase']);

pathParadox.config(function () {
    var config = {
        apiKey: "AIzaSyCLm3jkk5ppMqeQxKoH-dZ9CdYMaDGWWqU",
        authDomain: "the-paths-of-dragons.firebaseapp.com",
        databaseURL: "https://the-paths-of-dragons.firebaseio.com",
        storageBucket: "the-paths-of-dragons.appspot.com",
    };
    firebase.initializeApp(config);
});

pathParadox.constant('firebaseUrl', 'https://the-paths-of-dragons.firebaseio.com/');

pathParadox.config(function ($urlRouterProvider, $locationProvider) {
    // remove '#' from urls
    // $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/login');
    $urlRouterProvider.when('/', '/login');
});
