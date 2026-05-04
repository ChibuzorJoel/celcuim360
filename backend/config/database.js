/**
 * config/database.js - MongoDB Connection Configuration
 */

const mongoose = require('mongoose');

const mongooseConnect = async () => {
  try {
    const conn = await mongoose.connect(
        process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/celcium360_registration',
      {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }
    );

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = mongooseConnect;