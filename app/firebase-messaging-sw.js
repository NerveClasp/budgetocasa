importScripts('/bower_components/firebase/firebase-app.js');
importScripts('/bower_components/firebase/firebase-messaging.js');
firebase.initializeApp({
  'messagingSenderId': '950449002614'
});
const messaging = firebase.messaging();
