const mongoose = require('mongoose');
const S = new mongoose.Schema({
  companyName:  { type: String, required: true },
  ownerName:    { type: String },
  email:        { type: String, required: true, unique: true, lowercase: true },
  password:     { type: String },
  googleId:     { type: String, unique: true, sparse: true },
  authMethod:   { type: String, default: 'email' },
  phone:        { type: String, required: true },
  zip:          { type: String },
  location:     { type: { type: String, default: 'Point' }, coordinates: { type: [Number], default: [0,0] } },
  serviceRadius:{ type: Number, default: 25 },
  truckCount:   { type: Number, default: 1 },
  plan:         { type: String, default: 'starter' },
  monthlyJobs:  { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  rating:       { type: Number, default: 0 },
  isVerified:   { type: Boolean, default: false },
  isActive:     { type: Boolean, default: true },
  createdAt:    { type: Date, default: Date.now },
});
S.index({ location: '2dsphere' });
module.exports = mongoose.model('Towing', S);
