var express = require('express');
var router = express.Router();

const User = require('../models/users');
const Usercity = require('../models/usercities');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { checkBody } = require('../modules/checkBody');
const { sendWelcomeEmail, sendUpdatePasswordEmail } = require('../modules/emailService');
const { checkIfAlreadyPresentToken } = require('../middlewares/checkIfAlreadyPresentToken');
const { generateAccessToken, generateRefreshToken } = require('../modules/jwtService');
const { authenticateToken } = require('../middlewares/authenticateToken');

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
  if (!checkBody(req.query, ['userEmail', 'token'])) {
    res.json({ result: false, error: 'Missing or empty fields' });
    return;
  };
  jwt.verify(req.query.token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      const deletedUserData = await User.deleteOne({ email: req.query.userEmail });
      if (deletedUserData.deletedCount > 0) {
        return res.send(`<p>Invalid or expired link !<br>Resubmit a new user account.<p> <a href="http://127.0.0.1:5500/Frontend/" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 150px; align-items: center; justify-content: center; text-align: center">Return to the home page</a>`);
      } else {
        return res.send(`<p>Invalid or expired link !<br>Resubmit a new user account.<p> <a href="http://127.0.0.1:5500/Frontend/" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 150px; align-items: center; justify-content: center; text-align: center">Return to the home page</a>`);
      }
    }
    const userEmail = decoded.email;
    try {
      const data = await User.updateOne({ email: userEmail }, { $set: { verifiedEmail: true }})
      if (data.modifiedCount > 0) {
        res.send(`<p>Email successfully verified.<p> <a href="http://127.0.0.1:5500/Frontend/" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 150px; align-items: center; justify-content: center; text-align: center;">Click here to log in</a>`);
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
      if (dataUser.verifiedEmail) {
        const decrypt = bcrypt.compareSync(req.body.password, dataUser.password);
        if (decrypt) {
          if (dataUser.passwordUpdateRequestInProgress === false) {
            const accessToken = generateAccessToken(dataUser._id);
            const refreshToken = generateRefreshToken(dataUser._id);
            res.json({ result: true, user: dataUserFormated(dataUser), accessToken: accessToken, refreshToken: refreshToken });
          } else {
            User.updateOne({ passwordUpdateRequestInProgress: dataUser.passwordUpdateRequestInProgress}, { passwordUpdateRequestInProgress: false });
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

// ROUTER REFRESH ACCESS TOKEN
router.post('/refresh_token', (req, res) => {
  if (!req.body.refreshToken) {
    return res.json({ result: false, error: 'Refresh token is required' })
  }

  jwt.verify(req.body.refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) {
      return res.json({ result: false, error: 'Invalid refresh token' });
    }
    const refreshAccessToken = generateAccessToken(decoded._id); 
    res.json({ result: true, accessToken: refreshAccessToken });
  });
});

// ROUTER PUT CHANGE PASSWORD
router.put('/change_password', authenticateToken, (req, res) => {
  console.log('ROOO');
  if (!checkBody(req.body, ['userName', 'email', 'currentPassword', 'newPassword', 'confirmPassword'])) {
    res.json({ result: false, error: 'Missing or empty fields'});
    return;
  }
  console.log('ALORS');
  User.findOne({ _id: req.user._id })
  .then((dataUser) => {
    if (dataUser.userName === req.body.userName && dataUser.email === req.body.email ) {
      if ( req.body.newPassword === req.body.confirmPassword ) {
        const decrypt = bcrypt.compareSync(req.body.currentPassword, dataUser.password);
        if (decrypt) {
          const hash = bcrypt.hashSync(req.body.newPassword, 10)
          User.updateOne({ _id: req.user._id }, { password: hash })
          .then(() => {
          console.log('SIIII');
            res.json({ result: true, newPassword: 'Password changed' });
          })
        } else {
          console.log('NOOON ');
          res.json({ result: false, error: 'Wrong password' });
        }
      } else {
        res.json({ result: false, error: 'Password mismatch' });
      }
    } else {
      console.log('T LA ?');
      res.json({ result: false, error: 'User not found' });
    } 
    });
});

// ROUTER PUT REQUEST PASSWORD UPDATE
router.put('/request_update', checkIfAlreadyPresentToken, (req, res) => {
  if (!checkBody(req.body, ['userName', 'email', 'password', 'confirmPassword'])) {
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
      if (!dataUser.passwordUpdateRequestInProgress) {
        if (req.body.password === req.body.confirmPassword) {
          sendUpdatePasswordEmail(dataUser.email, dataUser.userName, req.body.password);
          User.updateOne({ email: req.body.email }, { passwordUpdateRequestInProgress: true })
          .then(() => {
            res.json({ result: true, newPassword: 'Validation email sent' });
          })
        } else {
          res.json({ result: false, error: 'Password mismatch' });
        }
      } else {
        res.json({ result: false, error: 'New password not yet confirmed'});
      }
    } else {
      res.json({ result: false, error: 'User not found' });
    } 
    });
});

// ROUTER GET CONFIRM PASSWORD UPDATE
router.get('/validate_update', (req, res) => {
  if (!checkBody(req.query, ['userName', 'token'])) {
    res.json({ result: false, error: 'Missing or empty fields' });
    return;
  }

  jwt.verify(req.query.token, process.env.JWT_SECRET, async (err, decoded) => {
    const userName = req.query.userName;
    const user = await User.findOne({ userName: userName });
    if (err) {
      if (user) {
        const verifiedEmail = await User.updateOne({ userName: userName }, { passwordUpdateRequestInProgress: false })
        if (verifiedEmail.modifiedCount > 0) {
          return res.send(`<p>Invalid or expired link !<br>Resubmit a request to change a new password or log in with your initial password<p> <a href="http://127.0.0.1:5500/Frontend/" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 30%; align-items: center; justify-content: center; text-align: center">Return to the home page</a>`);
        }
      }
    }
    const password = decoded.password;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const hash = bcrypt.hashSync(password, 10);
    user.password = hash;
    user.passwordUpdateRequestInProgress = false;
    await user.save();
    res.send(`<p>Password successfully updated.<p> <a href="http://127.0.0.1:5500/Frontend/" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 30%; align-items: center; justify-content: center; text-align: center">Click here to log in</a>`);
  })
});

// ROUTER POST LOGOUT
router.post('/logout', (req, res) => {
  res.json({ message: 'Success logout' });
});

router.delete('/delete_user_account', authenticateToken, (req, res) => {
  User.findOne({ _id: req.user._id })
  .then(userData => {
    if (userData) {
      Usercity.find()
      .then(citiesData => {
        const promises = citiesData.map(async e => {
          if (e.user.includes(req.user._id) && e.user.length === 1) {
            return await Usercity.deleteOne({ _id: e._id });
          } else if (e.user.includes(req.user._id)) {
            return await Usercity.updateOne({ _id: e._id }, { $pull: { user: req.user._id }});
          }
        });

        Promise.all(promises)
        .then(resultsData => {
          const deleteCount = resultsData.filter(result => result && result.deletedCount > 0).length; 
          const updateCount = resultsData.filter(result => result && result.modifiedCount > 0).length;
          
          User.deleteOne({ _id: req.user._id })
          .then(() => { 
            if (deleteCount > 0 && updateCount > 0) { 
              return res.json({ result: true }); 
            } else if (deleteCount > 0) { 
              return res.json({ result: true }); 
            } else if (updateCount > 0) { 
              return res.json({ result: true }); 
            } else { 
              return res.json({ result: true }); 
            } 
          })
        })
      })
    } else {
      res.json({ result: false, error: 'User not found' });
    }
  })
});

module.exports = router;