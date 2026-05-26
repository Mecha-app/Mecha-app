const mongoose = require('mongoose');
const S = new mongoose.Schema({
  from:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fromEmail: String,
  toShop:    { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
  body:      { type: String, required: true },
  isRead:    { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('Message', S);
