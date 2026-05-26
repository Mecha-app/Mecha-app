const mongoose = require('mongoose');
const S = new mongoose.Schema({
  owner:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  year:     { type: String, required: true },
  make:     { type: String, required: true },
  model:    { type: String, required: true },
  mileage:  { type: Number },
  nickname: { type: String },
  diagnoses:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Diagnosis' }],
  createdAt:{ type: Date, default: Date.now },
});
module.exports = mongoose.model('Vehicle', S);
