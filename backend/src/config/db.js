const mongoose = require('mongoose');

// Connects to MongoDB when MONGO_URL is set. Without it the backend still starts
// (so teammates without a database are not blocked), but anything that needs the database will not save.

module.exports = async function connectDB() {
  const url = process.env.MONGO_URL;
  if (!url) {
    console.log('[db] MONGO_URL is not set. Running without a database.');
    return false;
  }
  await mongoose.connect(url, { serverSelectionTimeoutMS: 8000 });
  console.log('[db] MongoDB connected');
  return true;
};
