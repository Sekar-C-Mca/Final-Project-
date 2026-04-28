const mongoose = require('mongoose');
require('dotenv').config({ path: '/media/sekar/3c35492e-e643-4f72-ad34-0465e2ee8b25/Final\ Year\ Project/backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔍 Testing MongoDB Connection...');
console.log('URI:', MONGODB_URI ? MONGODB_URI.substring(0, 60) + '...' : 'NOT SET');

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 10000
})
.then(() => {
  console.log('✅ MongoDB Connection Successful!');
  console.log('📊 Connected to:', mongoose.connection.name);
  console.log('🔗 Host:', mongoose.connection.host);
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB Connection Failed!');
  console.error('Error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('⏱️ Connection timeout!');
  process.exit(1);
}, 15000);
