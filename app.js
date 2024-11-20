require('dotenv').config();
require('./models/connection');
require('./modules/cronJobs');

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var weatherRouter = require('./routes/weather');

var app = express();
const cors = require('cors');
// const corsOptions = {
//     origin: ['http://127.0.0.1:5500', 'https://weather-frontend-kg6aw9c8y-afas75s-projects.vercel.app', 'https://weather-frontend-sage.vercel.app'], // Remplacez par l'origine de votre frontend
//     credentials: true // Permet d'envoyer les cookies
// };
// app.use(cors(corsOptions));
app.use(cors());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/weather', weatherRouter);

module.exports = app;