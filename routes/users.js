var express = require('express');
var router = express.Router();

const User = require('../models/users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { checkBody } = require('../modules/checkBody');
const { sendWelcomeEmail } = require('../modules/emailService');
const { authenticateToken } = require('../middlewares/authenticateToken');
const { generateAccessToken, generateRefreshToken } = require('../modules/jwtService');

const dataUserFormated = (data) => {
  return {
    userName: data.userName,
    email: data.email,
  };
};

// ROUTER POST SIGNUP
router.post('/signup', (req, res) => {
  if (!checkBody(req.body, ['userName', 'email', 'password'])) {
    res.json({ result: false, error: "Missing or empty fields"});
    return;
  }

  const patternEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  const emailCheck = patternEmail.test(req.body.email);
  if (emailCheck) {
    User.findOne({ 
      $or: [
        { userName: new RegExp('^' + req.body.userName + '$', 'i') }, 
        { email: req.body.email.toLowerCase() }, 
      ]
    }).then((dataUser) => {
      if (dataUser == null) {
        const hash = bcrypt.hashSync(req.body.password, 10);
        const newUser = new User({
          userName: req.body.userName,
          email: req.body.email.toLowerCase(),
          password: hash,
        });
        sendWelcomeEmail(req.body.email, req.body.userName);
        newUser.save().then((dataNewUser) => {
          res.json({ result: true, newUser: dataUserFormated(dataNewUser) });
        });
      } else {
        res.json({ result: false, error: 'Username or email address already exists' });
      }
    });
  } else {
    res.json({ result: false, error: 'Email is not valid' }); 
  }
});

// ROUTER GET VERIFY EMAIL
router.get('/verify_email', (req, res) => { 
  if (!checkBody(req.query, ['token'])) {
    res.json({ result: false, error: 'Missing or empty fields' });
    return;
  };

  jwt.verify(req.query.token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.json({ result: false, error: 'Invalid or expired token' });
    }

    const userEmail = decoded.email;
    
    User.updateOne({ email: userEmail }, { $set: { emailVerified: true }})
    .then((data) => {
      if (data.modifiedCount > 0) {
        res.json('<p>Email Successfully Verified.<p> <a href="https://votresite.com" style="padding: 10px 20px; color: white; background-color: blue; text-decoration: none; display: flex; width: 30%; align-items: center; justify-content: center;">Click here to log in</a>' );
      } else {
        res.json({ result: false, error: 'Internal server error', details: error.message });
      }
    });
  });
});

// ROUTER POST SIGNIN 
router.post('/signin', (req, res) => {
  if (!checkBody(req.body, ['password'])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }
  User.findOne({ 
    $or: [
      { userName: new RegExp('^' + req.body.userName + '$', 'i') }, 
      { email: req.body.email }, //toLowerCase()
    ]
  }).then((dataUser) => {
    if (dataUser) {
      if (dataUser.emailVerified) {
        const decrypt = bcrypt.compareSync(req.body.password, dataUser.password);
        if (decrypt) {
          const accessToken = generateAccessToken(dataUser._id);
          const refreshToken = generateRefreshToken(dataUser._id);
          res.json({ result: true, user: dataUserFormated(dataUser), accessToken: accessToken, refreshToken: refreshToken });
        } else {
          res.json({ result: false, error: 'Wrong password'})
        }
      } else {
        res.json({ result: false, error: 'Email address not yet verified'})
      }
    } else {
      res.json({ result: false, error: 'User not found' })
    }
  });
});

// ROUTER POST HOW TOKENS WORK
router.post('/token', (req, res) => {
  if (!req.body.token)
    return res.json({ result: false, error: 'Refresh token required' });
  jwt.verify(req.body.token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
    if (err)
      return res.json({ result: false, error: 'Invalid refresh token' });
    const  accessToken = generateAccessToken(decoded._id);
    res.json({ accessToken });
  })
})

// ROUTER GET TEST AUTHENTICATETOKEN
router.get('/protected_route', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route' });
})

module.exports = router;