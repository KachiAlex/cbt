const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
	username: { type: String, required: true, index: true },
	email: { type: String },
	password: { type: String },
	role: { type: String, default: 'student' },
	fullName: { type: String },
	registeredAt: { type: Date },
	createdAt: { type: Date },
	updatedAt: { type: Date },
}, { timestamps: false, strict: false });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema); 