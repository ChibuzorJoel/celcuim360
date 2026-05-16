const mongoose = require('mongoose');

// Hardcoded Atlas URI — no dotenv dependency
const MONGO_URI = 'mongodb+srv://chibuzorjoel:Celcuim360@cluster0.arplt.mongodb.net/celcium360?retryWrites=true&w=majority&appName=Cluster0';

const mongooseConnect = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS:          45000,
    });
    console.log('✅ MongoDB connected:', conn.connection.host);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = mongooseConnect;