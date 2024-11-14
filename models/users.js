const mongoose = require('mongoose');

const tempUpdateSchema =  mongoose.Schema ({
    newPassword: {type: String, trim: true},
    timeStamp: {type: Date },
});

const userSchema = mongoose.Schema ({
    userName: {type: String, trim:true},
    email: {type: String, unique: true, trim: true},
    password: String,
    verifiedEmail: {type: Boolean, default: false},
    createdAt: {type: Date, default: Date.now},
    forgotPasswordRequestInProgress: {type: Boolean, default: false},
    tempUpdate: {
        type: tempUpdateSchema,
        default: { 
            newPassword: null,
            timeStamp: null,
        },
    }
});

const User = mongoose.model('users', userSchema);

module.exports = User;