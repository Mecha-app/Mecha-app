const mongoose = require('mongoose');
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\x1b[32m  ✅ MongoDB connected\x1b[0m');
  } catch (err) {
    console.error('\x1b[31m  ❌ MongoDB failed:', err.message, '\x1b[0m');
    console.error('  👉 Open backend/.env and fix your MONGO_URI');
    process.exit(1);
  }
};
module.exports = connectDB;
