const mongoose = require('mongoose');
const S = new mongoose.Schema({
  vehicle:     { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemText: { type: String },
  imageUrl:    { type: String },
  aiResult:    { type: mongoose.Schema.Types.Mixed },
  createdAt:   { type: Date, default: Date.now },
});
module.exports = mongoose.model('Diagnosis', S);
