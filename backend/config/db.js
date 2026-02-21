const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Trim to guard against Windows \r\n line-ending artefacts in .env
    const uri = (process.env.MONGO_URI || '').trim();

    if (!uri) {
      throw new Error('MONGO_URI is not defined in .env');
    }

    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
