const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const firebase = require('firebase');

const app = express();
admin.initializeApp();
let db = admin.firestore();

const config = {
    apiKey: "AIzaSyDP0myBhtZwi1wJOI2lAxygWaCvmZxH0OA",
    authDomain: "my-tcc-project-66a43.firebaseapp.com",
    databaseURL: "https://my-tcc-project-66a43.firebaseio.com",
    projectId: "my-tcc-project-66a43",
    storageBucket: "my-tcc-project-66a43.appspot.com",
    messagingSenderId: "325772360716",
    appId: "1:325772360716:web:82b03d8a034a91cfdc0229",
    measurementId: "G-JHZDV9PBLW"
};

firebase.initializeApp(config);

app.get('/posts', (req, res) => {
    db
        .collection("posts")
        .orderBy('createAt', 'desc')
        .get()
        .then(function (querySnapshot) {
            let posts = [];
            querySnapshot.forEach(function (doc) {
                posts.push({
                    postId: doc.id,
                    ...doc.data()
                });
                console.log(doc.id, " => ", doc.data());
            });
            return res.json(posts);
        })
        .catch(err => console.error(err));
});

const FBAuth = (req, res, next) => {
    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else {
        console.error('No token found');
        return Response.status(403).json({ error: 'Unauthorized' });
    }

    admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            req.user = decodedToken;
            return db.collection('users')
                .where('userId', '==', req.user.uid)
                .limit(1)
                .get();
        })
        .then(data => {
            req.user.handle = data.docs[0].data().handle;
            return next();
        })
        .catch(err => {
            console.error('Error while verifying token', err);
            res.status(403).json(err);
        });
}

app.post('/post', FBAuth, (req, res) => {
    if (req.body.body.trim() === '') {
        return res.status(400).json({ body: 'Body must not be empty' });
    }

    let newPost = {
        userHandle: req.user.handle,
        createAt: new Date().toISOString(),
        body: req.body.body
    };

    //add() auto-generate an ID for the document
    db.collection("posts").add(newPost)
        .then(doc => {
            res.json({ message: `document ${doc.id} created successfuly` });
        })
        .catch(err => {
            res.status(500).json({ error: 'something went wrong' });
            console.error(err);
        });
});

const isEmpty = string => {
    if (string.trim() === '') return true;
    return false;
}

const isEmail = email => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regEx)) return true;
    return false;
}

app.post('/signup', (req, res) => {

    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };

    let errors = {};

    if (isEmpty(newUser.email)) {
        errors.email = 'Must not be empty';
    } else if (!isEmail(newUser.email)) {
        errors.email = 'Must be a valid email address'
    }

    if (isEmpty(newUser.password)) errors.password = 'Must not be empty';
    if (newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Passwords must match';

    if (isEmpty(newUser.handle)) errors.handle = 'Must not be empty';

    if (Object.keys(errors).length > 0) return res.status(400).json(errors);

    let token, userId;
    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            //On vérifie si le handle n'est pas déjà utiliser par un autre utilisateur.
            //Si c'est le cas on envoie un message d'erreur
            if (doc.exists) return res.status(400).json({ handle: 'this handle is already taken' });

            //Si il n'existe pas déjà, on va créer un nouveau compte pour l'utilisateur
            return firebase
                .auth()
                .createUserWithEmailAndPassword(newUser.email, newUser.password);
        })
        .then(data => {
            //On va générer un JWT pour identifier l'utilisateur dans Firebase
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then(idToken => {
            token = idToken;
            //Le schema de notre utilisateur en db
            const userCredentials = {
                handle: newUser.handle,
                password: newUser.password,
                createdAt: new Date().toISOString(),
                userId
            };
            //On va créer un nouveau document dans la collection user qui va répréenter
            //notre utilisateur
            db.doc(`/users/${newUser.handle}`).set(userCredentials);
        }).then(() => {
            //Le compte de l'utilisateur a été crée avec succés et ses données sont stocké
            //dans notre base de donnée
            return res.status(201).json({ token });
        })
        .catch(err => {
            if (err.code === 'auth/email-already-in-use') {
                //On renvoi ce message d'erreur si l'email est déjà utilisé
                return res.status(400).json({ email: 'This email is already in use' })
            }
            else {
                return res.status(500).json({ error: err.code });
            }
        })
});

app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        // handle: req.body.handle,
        password: req.body.password
    }

    let errors = {};

    if (isEmpty(user.email)) {
        errors.email = 'Must not be empty';
    } else if (!isEmail(user.email)) {
        errors.email = 'Must be a valid email address'
    }

    if (isEmpty(user.password)) errors.password = 'Must not be empty';

    if (Object.keys(errors).length > 0) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        }).then(token => {
            return res.status(201).json({ token });
        })
        .catch(err => {
            if (err.code === 'auth/wrong-password') {
                return res.status(400).json({ general: 'Wrong password' });
            } else if (err.code === 'auth/user-not-found') {
                return res.status(400).json({ user: 'User not found' });
            } else {
                return res.status(500).json({ error: err.code });
            }
        });
})

exports.api = functions.region('europe-west1').https.onRequest(app);

