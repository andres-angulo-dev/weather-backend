var express = require('express');
var router = express.Router();

const User = require('../models/users');
const Usercity = require('../models/usercities');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { checkBody } = require('../modules/checkBody');
const { sendWelcomeEmail, sendUpdatePasswordEmail } = require('../modules/emailService');
const { checkUnconfirmedUpdates } = require('../modules/checkUnconfirmedUpdates');
const { generateAccessToken, generateRefreshToken } = require('../modules/jwtService');
const { checkIfAlreadyPresentToken } = require('../middlewares/checkIfAlreadyPresentToken');
const { authenticateToken } = require('../middlewares/authenticateToken');

const dataUserFormated = (data) => {
  return {
    userName: data.userName,
    email: data.email,
  };
};

// Router post signup
router.post('/signup', async (req, res) => {
  if (!checkBody(req.body, ['userName', 'email', 'password', 'confirmPassword'])) {
    res.json({ result: false, error: "Missing or empty fields"});
    return;
  }

  const patternEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  const emailCheck = patternEmail.test(req.body.email);
  
  try {
    if (emailCheck) {
      const dataUser = await User.findOne({ 
        $or: [
          { userName: new RegExp('^' + req.body.userName + '$', 'i') }, 
          { email: req.body.email.toLowerCase() }, 
        ]
      });
      if (dataUser == null) {
        if (req.body.password === req.body.confirmPassword) {
          const hash = bcrypt.hashSync(req.body.password, 10);
          const newUser = new User({
            userName: req.body.userName,
            email: req.body.email.toLowerCase(),
            password: hash,
          });
          sendWelcomeEmail(req.body.email, req.body.userName);
          const dataNewUser = await newUser.save();
          return res.status(201).json({ result: true, newUser: dataUserFormated(dataNewUser) });
        } else {
          return res.status(400).json({ result: false, error: 'Password mismatch' });
        }
      } else {
        return res.status(409).json({ result: false, error: 'Username or email address already exists' });
      }
    } else {
      return res.status(400).json({ result: false, error: 'Email is not valid' }); 
    }
  } catch (error) {
    return res.status(500).json({ status: 'Internal server error', error: error });
  }
});

// Router get verify email
router.get('/validate_email', async (req, res) => {

  if (!checkBody(req.query, ['userEmail', 'token'])) {
    res.json({ result: false, error: 'Missing or empty fields' });
    return;
  };
  jwt.verify(req.query.token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      try {
        const deletedUserData = await User.deleteOne({ email: req.query.userEmail });
        if (deletedUserData.deletedCount > 0) {
          return res.status(400).send(`<p>Invalid or expired link !<br>Resubmit a new user account.<p> <a href="${process.env.WEB_SITE_URL}" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 150px; align-items: center; justify-content: center; text-align: center">Return to the home page</a>`);
        } else {
          return res.status(400).send(`<p>Invalid or expired link !<br>Resubmit a new user account.<p> <a href="${process.env.WEB_SITE_URL}" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 150px; align-items: center; justify-content: center; text-align: center">Return to the home page</a>`);
        }
      } catch (error) {
        return res.status(500).json({ status: 'Internal server error', error: error });
      }
    }
    const userEmail = decoded.email;
    try {
      const data = await User.updateOne({ email: userEmail }, { $set: { verifiedEmail: true }})
      if (data.modifiedCount > 0) {
        return res.status(200).send(`<p>Email successfully verified.<p> <a href="${process.env.WEB_SITE_URL}" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 150px; align-items: center; justify-content: center; text-align: center;">Click here to log in</a>`);
      } else {
        return res.status(409).send('Email adresse already verified');
      }
    } catch (error) {
      return res.status(500).json({ status: 'Internal server error', error: error });
    }
  });
});

// Router post signin
router.post('/signin', checkIfAlreadyPresentToken, async (req, res) => {
  if (!checkBody(req.body, ['password'])) {
    return res.status(400).json({ result: false, error: "Missing or empty fields" });
  }

  try {
    const dataUser = await User.findOne({ 
      $or: [
        { userName: new RegExp('^' + req.body.userName + '$', 'i') }, 
        { email: req.body.email.toLowerCase() },
      ]
    })
    if (dataUser) {
      if (dataUser.verifiedEmail) {
        const decrypt = bcrypt.compareSync(req.body.password, dataUser.password);
        if (dataUser.tempUpdate.newPassword) {
          const decryptNewPassword = bcrypt.compareSync(req.body.password, dataUser.tempUpdate.newPassword);
          if (decryptNewPassword) {
            return res.status(400).json({ result: false, error: 'Password change request not yet confirmed'})
          }
        } 
        if (decrypt) {
            const accessToken = generateAccessToken(dataUser._id);
            const refreshToken = generateRefreshToken(dataUser._id);
            return res.status(200).json({ result: true, user: dataUserFormated(dataUser), accessToken: accessToken, refreshToken: refreshToken });
        } else {
          return res.status(401).json({ result: false, error: 'Wrong password'})
        }
      } else {
        return res.status(401).json({ result: false, error: 'Email address not yet verified'})
      }
    } else {
      return res.status(404).json({ result: false, error: 'User not found' })
    }
  } catch (error) {
    return res.status(500).json({ status: 'Internal server error', error: error });
  }
});

// Router refresh access token
router.post('/refresh_token', async (req, res) => {
  if (!req.body.refreshToken) {
    return res.status(400).json({ result: false, error: 'Refresh token is required' })
  }
  try {
    jwt.verify(req.body.refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ result: false, error: 'Invalid refresh token' });
      }
      const refreshAccessToken = generateAccessToken(decoded._id); 
      return res.status(200).json({ result: true, accessToken: refreshAccessToken });
    });
  } catch (error) {
    return res.status(500).json({ status: 'Internal server error', error: error });
  }
});

// Router put change password
router.put('/change_password', authenticateToken, async (req, res) => {
  if (!checkBody(req.body, ['userName', 'email', 'currentPassword', 'newPassword', 'confirmPassword'])) {
    return res.status(400).json({ result: false, error: 'Missing or empty fields'});
  }

  try {
    const dataUser = await User.findOne({ _id: req.user._id });
    if (dataUser) {
      if (dataUser.userName === req.body.userName && dataUser.email === req.body.email ) {
        if ( req.body.newPassword === req.body.confirmPassword ) {
          const decrypt = bcrypt.compareSync(req.body.currentPassword, dataUser.password);
          if (decrypt) {
            const hash = bcrypt.hashSync(req.body.newPassword, 10)
            await User.updateOne({ _id: req.user._id }, { $set: {password: hash }});
            return res.status(200).json({ result: true, newPassword: 'Password changed'});
          } else {
            return res.status(401).json({ result: false, error: 'Wrong password' });
          }
        } else {
          return res.status(400).json({ result: false, error: 'Password mismatch' });
        }
      } else {
        return res.status(404).json({ result: false, error: 'User not found' });
      } 
    } else {
      return res.status(404).json({ result: false, error: 'User not found' });
    }
  } catch (error) {
    return res.status(500).json({ status: 'Internal server error', error : error });
  }
});

// Router put request forgot password
router.put('/forgot_password', checkIfAlreadyPresentToken, async (req, res) => {
  if (!checkBody(req.body, ['userName', 'email', 'password', 'confirmPassword'])) {
    return res.status(400).json({ result: false, error: 'Missing or empty fields'});
  }

  try {
    const dataUser = await User.findOne({
      $and: [
        { userName: new RegExp('^' + req.body.userName + '$', 'i') }, 
        { email: req.body.email }, //toLowerCase()
      ]
    });
    if (dataUser) {
      if (!dataUser.forgotPasswordRequestInProgress) {
        if (req.body.password === req.body.confirmPassword) {
          const hash = bcrypt.hashSync(req.body.password, 10);
          sendUpdatePasswordEmail(dataUser.email, dataUser.userName, req.body.password);
          await User.updateOne({ email: req.body.email }, { $set: {
            forgotPasswordRequestInProgress: true,
            tempUpdate: {
              newPassword: hash,
              timeStamp: new Date(),
              }
            }
          });
          res.status(200).json({ result: true, newPassword: 'Validation email sent' });
          setTimeout(async () => {
            try {
              await checkUnconfirmedUpdates(dataUser._id);
            } catch (error) {
              console.error('Failed to check updates', error);
            }
          }, 15 * 60 * 1000); // 15m * 60s * 1000 thousandth of a second
        } else {
          return res.status(400).json({ result: false, error: 'Password mismatch' });
        }
      } else {
        return res.status(400).json({ result: false, error: 'New password not yet confirmed'});
      }
    } else {
      return res.status(404).json({ result: false, error: 'User not found' });
    } 
  } catch (error) {
    return res.status(500).json({ status: 'Internal server error', error: error });
  }
});

// Router get confirm forgot password
router.get('/validate_update', async (req, res) => {
  if (!checkBody(req.query, ['userName', 'token'])) {
   return res.status(400).json({ result: false, error: 'Missing or empty fields' });
  }

  jwt.verify(req.query.token, process.env.JWT_SECRET, async (err, decoded) => {
    try {
      const userName = req.query.userName;
      const user = await User.findOne({ userName: userName });
      if (err) {
        if (user) {
          user.forgotPasswordRequestInProgress = false;
          user.tempUpdate.newPassword = null;
          user.tempUpdate.timeStamp = null;
          await user.save();
          return res.status(400).send(`<p>Invalid or expired link !<br>Resubmit a request to change a new password or log in with your initial password<p> <a href="${process.env.WEB_SITE_URL}" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 30%; align-items: center; justify-content: center; text-align: center">Return to the home page</a>`);
        }
      }
      const password = decoded.password;
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const hash = bcrypt.hashSync(password, 10);
      user.password = hash;
      user.forgotPasswordRequestInProgress = false;
      user.tempUpdate.newPassword = null;
      user.tempUpdate.timeStamp = null;
      await user.save();
      return res.status(200).send(`<p>Password successfully updated.<p> <a href="${process.env.WEB_SITE_URL}" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 30%; align-items: center; justify-content: center; text-align: center">Click here to log in</a>`);
    } catch (error) {
      return res.status(500).json({ status: 'Internal server error', error: error})
    }
  })
});

// Router delete user account
router.delete('/delete_user_account', authenticateToken, async (req, res) => {
  try {
    const userData = await User.findOne({ _id: req.user._id });
    if (userData) {
      const citiesData = Usercity.find();
      if (citiesData) {
        const promises = citiesData.map(async e => {
          if (e.user.includes(req.user._id) && e.user.length === 1) {
            return await Usercity.deleteOne({ _id: e._id });
          } else if (e.user.includes(req.user._id)) {
            return await Usercity.updateOne({ _id: e._id }, { $pull: { user: req.user._id }});
          }
        });
        const resultsData = await Promise.all(promises);
        const deleteCount = resultsData.filter(result => result && result.deletedCount > 0).length; 
        const updateCount = resultsData.filter(result => result && result.modifiedCount > 0).length;
          
          await User.deleteOne({ _id: req.user._id }); 
          if (deleteCount > 0 || updateCount > 0) { 
            return res.status(200).json({ result: true }); 
          } else { 
            return res.status(200).json({ result: true }); 
          } 
      } else {
         return res.status(404).json({ result: false, error: 'User not found' });
      }
    }
  } catch (error) {
    return res.status(500).json({ status: 'Internal server error', error: error});
  }
});

module.exports = router;