const admin = require('firebase-admin');

admin.initializeApp();

let db = admin.firestore();

module.exports = { admin, db };