const mongoose = require('mongoose');
const S = new mongoose.Schema({
  shopName:   { type: String, required: true },
  ownerName:  { type: String },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String },
  googleId:   { type: String, unique: true, sparse: true },
  authMethod: { type: String, default: 'email' },
  phone:      { type: String, required: true },
  address:    { type: String },
  city:       { type: String },
  state:      { type: String },
  zip:        { type: String, required: true },
  location:   { type: { type: String, default: 'Point' }, coordinates: { type: [Number], default: [0,0] } },
  about:      { type: String },
  specialties:[String],
  languages:  [String],
  hours:      { type: String },
  rating:     { type: Number, default: 0 },
  reviewCount:{ type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  isActive:   { type: Boolean, default: true },
  views:      { type: Number, default: 0 },
  leads:      { type: Number, default: 0 },
  createdAt:  { type: Date, default: Date.now },
});
S.index({ location: '2dsphere' });
module.exports = mongoose.model('Shop', S);
