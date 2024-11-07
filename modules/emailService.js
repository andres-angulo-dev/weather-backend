const nodemailer = require('nodemailer');
const { generateVerificationToken, generateValidationToken } = require('../modules/jwtService');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.MY_EMAIL, pass: process.env.MY_EMAIL_PASSWORD },
    tls: { rejectUnauthorized: false },
  });

const sendWelcomeEmail = (userEmail, userName) => {
  const token = generateVerificationToken(userEmail);
  const verificationUrl = `http://localhost:3000/users/validate_email?token=${token}`;

  const mailOptions = {
    from: process.env.MY_EMAIL,
    to: userEmail,
    subject: 'Weather Account confirmation',
    html: `<div style="padding: 0px 100px; display: flex; align-items: center; justify-content: center">
          <div style="display: flex; flex-direction: column; background-color: #faf8f5; padding: 20px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);  border: rgba(0, 0, 0, 0.9); border-color: black;";>
          <div><img style="width: 50px" src='public/image/my_logo.png'/></div>
          <div style="width: 100%; height: 2px; background-color: rgba(0, 0, 0, 0.4)"></div>
          <p style="margin: 20px 0 0 0">Hi ${userName},<p>
          <p style="margin: 0">Thank you for choosing Weather !<br>Please confirm  your email address to help us ensure your account is always protected by clicking the button below :<p> 
          <p><a href="${verificationUrl}" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 30%; min-width: auto; align-items: center; justify-content: center; text-align: center;">Confirm my email address</a><p>
          <p style="margin: 0">For futher technical questions and support, please contact us at <a href='mailto:info@weather.com'>info@weather.com</a>.<br>If you did not sign up for this account, please ignore this email.<p>
          <p style="margin: 0">Best Regards,<br>The Weather team<p>
          <div style="width: 100%; height: 2px; background-color: rgba(0, 0, 0, 0.4)"></div>
          <p><i>Weather ⓒ All rights reserved<i><p>
          <div></div>
          </div>`        
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
    html: `<div style="padding: 0px 100px; display: flex; align-items: center; justify-content: center">
          <div style="display: flex; flex-direction: column; background-color: #faf8f5; padding: 20px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);  border: rgba(0, 0, 0, 0.9); border-color: black;";>
          <div><img style="width: 50px" src='public/image/my_logo.png'/></div>
          <div style="width: 100%; height: 2px; background-color: rgba(0, 0, 0, 0.4)"></div>
          <p style="margin: 20px 0 0 0">Hi ${userName},<p>
          <p style="margin: 20px 0 0 0">We have received your request to change your password.<br>Please click the link below to confirm this change :<p>
          <p><a href="${verificationUrl}" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none; display: flex; width: 50%; align-items: center; justify-content: center;">Confirme your new password</a><p>
          <p style="margin: 20px 0 0 0">After confirming, please log in again to access your account.<p>
          <p style="margin: 20px 0 0 0">For futher technical questions and support, please contact us at <a href='mailto:info@weather.com'>info@weather.com</a>.<br>If you did not request a password reset, please ignore this email.<p>
          <p style="margin: 0">Best Regards,<br>The Weather team<p>
          <div style="width: 100%; height: 2px; background-color: rgba(0, 0, 0, 0.4)"></div>
          <p><i>Weather ⓒ All rights reserved<i><p>
          <div></div>
          </div>`            
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