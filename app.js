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
const corsOptions = {
    origin: ['https://weather-frontend-sage.vercel.app', 'http://127.0.0.1:5500'],
    credentials: true
};
app.use(cors(corsOptions));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/weather', weatherRouter);

module.exports = app;