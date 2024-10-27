var express = require('express');
var router = express.Router();

const User = require('../models/users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { checkBody } = require('../modules/checkBody');
const { sendWelcomeEmail, sendUpdatePasswordEmail } = require('../modules/emailService');
const { authenticateToken } = require('../middlewares/authenticateToken');
const { checkIfAlreadyPresentToken } = require('../middlewares/checkIfAlreadyPresentToken');
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
    }).then(dataUser => {
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
router.get('/validate_email', (req, res) => { 
  if (!checkBody(req.query, ['token'])) {
    res.json({ result: false, error: 'Missing or empty fields' });
    return;
  };

  jwt.verify(req.query.token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.send('Invalid or expired link');
    }

    const userEmail = decoded.email;
    
    try {
      const data = await User.updateOne({ email: userEmail }, { $set: { emailVerified: true }})
      if (data.modifiedCount > 0) {
        res.send(`<p>Email successfully verified.<p> <a href="http://127.0.0.1:5500/Frontend/" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 30%; align-items: center; justify-content: center;">Click here to log in</a>`);
      } else {
        res.send('Email adresse already verified');
      }
    } catch (err) {
      res.json({ result: false, error: 'Internal server error'});
    }
  });
});

// ROUTER POST SIGNIN 
router.post('/signin', checkIfAlreadyPresentToken, (req, res) => {
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
          if (dataUser.updatePassword === false) {
            const accessToken = generateAccessToken(dataUser._id);
            const refreshToken = generateRefreshToken(dataUser._id);
            console.log('je taime signin');
            res.json({ result: true, user: dataUserFormated(dataUser), accessToken: accessToken, refreshToken: refreshToken });
          } else {
            console.log('t es la coquin ?');
            User.updateOne({ updatePassword: dataUser.updatePassword}, { updatePassword: false });
            res.json({ result: false, error: 'Password change request not yet confirmed'})
          }
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

// ROUTER PUT REQUEST PASSWORD UPDATE
router.put('/request_update', checkIfAlreadyPresentToken, (req, res) => {
  if (!checkBody(req.body, ['userName', 'email', 'password'])) {
    res.json({ result: false, error: 'Missing or empty fields'});
    return;
  }
  User.findOne({
    $and: [
      { userName: new RegExp('^' + req.body.userName + '$', 'i') }, 
      { email: req.body.email }, //toLowerCase()
    ]
  }).then((dataUser) => {
    if (dataUser) {
      if (!dataUser.updatePassword) {
        sendUpdatePasswordEmail(dataUser.email, dataUser.userName, req.body.password);
        //User.updateOne({ updatePassword: dataUser.updatePassword}, { $set: {updatePassword: true} }).then(data => {
        //  if (data.modifiedCount > 0) {
            console.log('********TOI');
            res.json({ result: true, newPassword: 'Validation email sent' });
        //}
        //});
      } else {
        console.log('SALUT TOIiiiiiiiii');

        res.json({ result: false, error: 'New password not yet confirmed'});
      }
    } else {
      console.log('SALUT TOI');

      res.json({ result: false, error: 'User not found' });
    } 
    });
});

  // ROUTER GET VALIDATE PASSWORD UPDATE
router.get('/validate_update', (req, res) => {
  if (!checkBody(req.query, ['token'])) {
    res.json({ result: false, error: 'Missing or empty fields' });
    return;
  }    
 
  jwt.verify(req.query.token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.send('Invalid or expired link');
    }
    const { email, password } = decoded;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const hash = bcrypt.hashSync(password, 10);
    user.password = hash;
    await user.save();
    //User.updateOne({ email: email }, {updatePassword: false }).then(data => {
    //  if (data.modifiedCount > 0) {
        res.send(`<p>Password successfully updated.<p> <a href="http://127.0.0.1:5500/Frontend/" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 30%; align-items: center; justify-content: center;">Click here to log in</a>`);
    //  }
    //});
  })
});


// ROUTER POST LOGOUT
router.post('/logout', (req, res) => {
  res.json({ message: 'Success logout' });
});

module.exports = router;