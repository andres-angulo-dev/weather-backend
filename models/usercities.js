const mongoose = require('mongoose');

const usercitySchema = mongoose.Schema({
	user: [{type: mongoose.Schema.Types.ObjectId, ref: 'users'}],
	cityName: String,
});

const Usercity = mongoose.model('usercities', usercitySchema);

module.exports = Usercity;