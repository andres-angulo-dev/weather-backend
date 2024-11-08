const mongoose = require('mongoose');

const userSchema = mongoose.Schema ({
    userName: {type: String, trim:true},
    email: {type: String, unique: true, trim: true},
    password: String,
    passwordUpdate: {type: Boolean, default: false},
    verifiedEmail: {type: Boolean, default: false},
})

const User = mongoose.model('users', userSchema);

module.exports = User;