const jwt = require('jsonwebtoken');

const checkIfAlreadyPresentToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
          if (!err) {
              console.log('User already logged in');
              return res.status(400).json({ result: false, error: 'User already logged in' });
          }
          next();
      });
  } else {
      next();
  }
};

module.exports = { checkIfAlreadyPresentToken };