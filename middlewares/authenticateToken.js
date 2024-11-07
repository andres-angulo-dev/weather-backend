const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.json({ result: false, error: 'Token not provided'});
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.json({ result: false, error: 'Invalid token' });
    }
    req.user = decoded;
    next();
  })
};

module.exports = { authenticateToken };