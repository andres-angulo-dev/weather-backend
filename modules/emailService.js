const nodemailer = require('nodemailer');
const { generateVerificationToken, generateValidationToken } = require('../modules/jwtService');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.MY_EMAIL, pass: process.env.MY_EMAIL_PASSWORD },
    tls: { rejectUnauthorized: false },
  });

const sendWelcomeEmail = (userEmail, userName) => {
  const token = generateVerificationToken(userEmail);
  const verificationUrl = `${process.env.BASE_URL}/users/validate_email?userEmail=${userEmail}&token=${token}`;
  console.error(process.env.BASE_URL);
  const mailOptions = {
    from: process.env.MY_EMAIL,
    to: userEmail,
    subject: 'Your Weather account confirmation',
    html: `<div style="padding: 0% 5%; display: flex; align-items: center; justify-content: center">
          <div style="background-color: #faf8f5; padding: 20px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1)">
          <div><img style="width: 50px" src='${process.env.BASE_URL}/images/my_logo.png' alt="Logo"/></div>
          <div style="width: 100%; height: 2px; background-color: rgba(0, 0, 0, 0.4)"></div>
          <p style="margin: 20px 0 0 0">Hi ${userName},<p>
          <p style="margin: 20px 0">Thank you for choosing Your Weather !<br>Please confirm  your email address to help us ensure your account is always protected by clicking the button below :<p> 
          <div style="display: flex; justify-content: center; align-items: center; width: 100%; min-width: 300px; margin: 25px 0"><p style="margin: 0"><a href="${verificationUrl}" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none">Confirm my email address</a><p></div>
          <p style="margin: 20px 0">For futher technical questions and support, please contact us at <a href='mailto:info@weather.com'>info@weather.com</a>.<br>If you did not sign up for this account, please ignore this email.<p>
          <p style="margin: 0">Best Regards,<br>The Your Weather team<p>
          <div style="width: 100%; height: 2px; background-color: rgba(0, 0, 0, 0.4)"></div>
          <p style="margin: 20px 0 0 0"><i>Your Weather ⓒ All rights reserved<i><p>
          </div>
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
  const verificationUrl = `${process.env.BASE_URL}/users/validate_update?userName=${userName}&token=${token}`;

  const mailOptions = {
    from: process.env.MY_EMAIL,
    to: userEmail,
    subject: 'Your Weather confirm your password change request',
    html: `<div style="padding: 0% 5%; display: flex; align-items: center; justify-content: center">
          <div style="background-color: #faf8f5; padding: 20px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1)">
          <div><img style="width: 50px" src='${process.env.BASE_URL}/images/my_logo.png' alt="Logo"/></div>
          <div style="width: 100%; height: 2px; background-color: rgba(0, 0, 0, 0.4)"></div>
          <p style="margin: 20px 0 0 0">Hi ${userName},<p>
          <p style="margin: 20px 0">We have received your request to change your password.<br>Please click the link below to confirm this change :<p>
          <div style="display: flex; justify-content: center; align-items: center; width: 100%; min-width: 300px; margin: 25px 0"><p style="margin: 0"><a href="${verificationUrl}" style="padding: 10px 20px; color: white; background-color: #8c92ac; text-decoration: none">Confirme your new password</a><p></div>
          <p style="margin: 20px 0; align-self: center">After confirming, please log in again to access your account.<p>
          <p  style="margin: 20px 0">For futher technical questions and support, please contact us at <a href='mailto:info@weather.com'>info@weather.com</a>.<br>If you did not request a password reset, please ignore this email.<p>
          <p style="margin: 0">Best Regards,<br>The Your Weather team<p>
          <div style="width: 100%; height: 2px; background-color: rgba(0, 0, 0, 0.4)"></div>
          <p style="margin: 20px 0 0 0"><i>Your Weather ⓒ All rights reserved<i><p>
          </div>
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