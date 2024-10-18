const jwt = require('jsonwebtoken');

const generateVerificationToken = (userEmail) => {
  return jwt.sign({ email: userEmail }, process.env.JWT_SECRET, {expiresIn: '15m' });
};

const generateAccessToken = (userId) => {
  return jwt.sign({ _id: userId } , process.env.JWT_SECRET, {expiresIn: '15m' });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ _id: userId }, process.env.JWT_REFRESH_SECRET, {expiresIn: '7d'});
}

module.exports = { generateVerificationToken, generateAccessToken, generateRefreshToken };