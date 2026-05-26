const mongoose = require('mongoose');
const S = new mongoose.Schema({
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String },
  googleId:   { type: String, unique: true, sparse: true },
  avatar:     { type: String },
  authMethod: { type: String, default: 'email' },
  phone:      { type: String },
  vehicles:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }],
  resetToken:    { type: String },
  resetExpires:  { type: Date },
  createdAt:  { type: Date, default: Date.now },
});
module.exports = mongoose.model('User', S);
