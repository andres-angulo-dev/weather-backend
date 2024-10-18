const nodemailer = require('nodemailer');
const { generateVerificationToken } = require('../modules/jwtService');

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
      subject: 'Welcome to WEATHER : please Verify your email address',
      html: `<p>Hi ${userName},<p>
            <p>Thank you for signing up with WEATHER ! To complete your registration, please verify your email address by clicking the link below:<p>
            <a href="${verificationUrl}" style="padding: 10px 20px; color: white; background-color: blue; text-decoration: none; display: flex; width: 50%; align-items: center; justify-content: center;">Vérifier mon email</a>
            <p>If you did not sign up for this account, please ignore this email.<p>
            <p>Thank you, The WEATHER Team<p>`        
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log('Email envoyé: ' + info.response);
      }
    });
  };

  module.exports = { sendWelcomeEmail };