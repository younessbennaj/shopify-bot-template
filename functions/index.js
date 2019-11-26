const functions = require('firebase-functions');
// const admin = require('firebase-admin');
const express = require('express');
const firebase = require('firebase');

const app = express();

const { db, admin } = require('./util/admin');

const { isEmpty, isEmail } = require('./util/validators');

const { getAllPosts, postOnePost } = require('./handlers/posts');

const { FBAuth } = require('./util/fbAuth');

const { signup, login } = require('./handlers/users');

// const config = {
//     apiKey: "AIzaSyDP0myBhtZwi1wJOI2lAxygWaCvmZxH0OA",
//     authDomain: "my-tcc-project-66a43.firebaseapp.com",
//     databaseURL: "https://my-tcc-project-66a43.firebaseio.com",
//     projectId: "my-tcc-project-66a43",
//     storageBucket: "my-tcc-project-66a43.appspot.com",
//     messagingSenderId: "325772360716",
//     appId: "1:325772360716:web:82b03d8a034a91cfdc0229",
//     measurementId: "G-JHZDV9PBLW"
// };

// firebase.initializeApp(config);

//Post routes

app.get('/posts', getAllPosts);

app.post('/post', FBAuth, postOnePost);

// CMK

app.post('/signup', signup);

app.post('/login', login);

exports.api = functions.region('europe-west1').https.onRequest(app);

