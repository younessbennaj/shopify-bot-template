const { isEmpty, isEmail } = require('../util/validators');
const { db, admin } = require('../util/admin');
const config = require('../util/config');
const firebase = require('firebase');
firebase.initializeApp(config);

const {
    validateSignupData,
    validateLoginData,
    reduceUserDetails
} = require('../util/validators');

exports.signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };

    const { valid, errors } = validateSignupData(newUser);

    if (!valid) return res.status(400).json(errors);

    const noImg = 'no-img.png';

    let token, userId;
    db.doc(`/users/${newUser.handle}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                return res.status(400).json({ handle: 'this handle is already taken' });
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((idToken) => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                // imageUrl: `https://firebasestorage.googleapis.com/v0/b/${
                //     config.storageBucket
                //     }/o/${noImg}?alt=media`,
                userId
            };
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({ token });
        })
        .catch((err) => {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                return res.status(400).json({ email: 'Email is already is use' });
            } else {
                return res
                    .status(500)
                    .json({ general: 'Something went wrong, please try again' });
            }
        });
};

exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        // handle: req.body.handle,
        password: req.body.password
    }

    const { valid, errors } = validateLoginData(user);

    if (!valid) return res.status(400).json(errors);

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
}