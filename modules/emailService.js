const nodemailer = require('nodemailer');
const { generateVerificationToken, generateValidationToken } = require('../modules/jwtService');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.MY_EMAIL, pass: process.env.MY_EMAIL_PASSWORD },
    tls: { rejectUnauthorized: false },
  });

const sendWelcomeEmail = (userEmail, userName) => {
  const token = generateVerificationToken(userEmail);
  const verificationUrl = `http://localhost:3000/users/verify_email?token=${token}`;

  const mailOptions = {
    from: process.env.MY_EMAIL,
    to: userEmail,
    subject: 'Weather Account confirmation',
    html: `<p>Hi ${userName},<p>
          <p>Thank you for choosing Weather!<p> 
          <p>Please confirm  your email address to help us enseure your account is always protected by clicking the button below:<p>
          <p><br><a href="${verificationUrl}" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 50%; align-items: center; justify-content: center;">Confirm my email address</a><p>
          <p><br>For futher technical questions and support, please contact us at <a href='mailto:info@weather.com'>info@weather.com</a><p>
          <p>If you did not sign up for this account, please ignore this email.<p>
          <p>Best Regards,<br>The Weather team<p>
          <p><i>Weather ⓒ All rights reserved<i><p>`        
  };
  
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email envoyé: ' + info.response);
    }
  });
};

const sendUpdatePasswordEmail = (userEmail, userName, password) => {
  const token = generateValidationToken(userEmail, password);
  const verificationUrl = `http://localhost:3000/users/validate_update?token=${token}`;

  const mailOptions = {
    from: process.env.MY_EMAIL,
    to: userEmail,
    subject: 'Weather Confirm your password change request',
    html: `<p>Hi ${userName},<p>
          <p>We have received your request to change your password. Please click the link below to confirm this change:<p>
          <p><br><a href="${verificationUrl}" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 50%; align-items: center; justify-content: center;">Confirme your new password</a><p>
          <p><br>After confirming, please log in again to access your account.<p>
          <p>For futher technical questions and support, please contact us at <a href='mailto:info@weather.com'>info@weather.com</a><p>
          <p>If you did not request a password reset, please ignore this email.<p>
          <p>Best Regards,<br>The Weather team<p>
          <p><i>Weather ⓒ All rights reserved<i><p>`          
  };
  
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email envoyé: ' + info.response);
    }
  });
};

  module.exports = { sendWelcomeEmail, sendUpdatePasswordEmail };