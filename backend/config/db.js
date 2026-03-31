const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  try {
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️  MONGODB_URI not set in environment variables');
      console.warn('    Ensure .env file has MONGODB_URI configured');
      console.warn('    Example: mongodb+srv://user:pass@cluster.mongodb.net/db');
      isConnected = false;
      return;
    }

    console.log(`🔗 Attempting MongoDB connection...`);
    console.log(`   URI: ${process.env.MONGODB_URI.substring(0, 50)}...`);

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      retryWrites: true,
      maxPoolSize: 10,
      ssl: true,
      // For development/testing with certificate issues
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    });
    
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   State: ${conn.connection.readyState === 1 ? 'CONNECTED' : 'CONNECTING'}`);
    
  } catch (error) {
    isConnected = false;
    console.error(`❌ MongoDB Connection Failed`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Cause: ${error.reason || error.code || 'Unknown'}`);
    console.error(``);
    console.error(`⚠️  TROUBLESHOOTING:`);
    console.error(`   1. Check MONGODB_URI in backend/.env`);
    console.error(`   2. Ensure MongoDB is running (local or Atlas)`);
    console.error(`   3. Check network connectivity`);
    console.error(`   4. Verify credentials are correct`);
    console.error(`   5. Check if IP is whitelisted (for MongoDB Atlas)`);
    console.error(``);
    console.error(`   Application will run with LIMITED functionality`);
    console.error(`   Auth and data operations will fail until MongoDB is available`);
  }
};

// Reconnection monitor
mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('✅ MongoDB reconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
  isConnected = false;
});

// Export connection status checker
const isMongoDBConnected = () => {
  return isConnected && mongoose.connection.readyState === 1;
};

module.exports = connectDB;
module.exports.isMongoDBConnected = isMongoDBConnected;
