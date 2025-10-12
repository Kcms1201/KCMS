// src/modules/auth/passwordReset.model.js 
const mongoose = require('mongoose');

const PasswordResetSchema = new mongoose.Schema({
  user: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  sha256Hash: { type: String, index: true }, // hashed raw token
  bcryptHash: { type: String },               // double-hash for extra safety
  otpHash: { type: String },                  // store hashed OTP (recommended)
  otpExpiresAt: Date,
  expiresAt: Date,
  attempts: { type: Number, default: 0 },
  usedAt: Date
}, { timestamps: true });

module.exports.PasswordReset = mongoose.model('PasswordReset', PasswordResetSchema);
