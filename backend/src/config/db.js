/**
 * db.js
 * MongoDB connection handler using Mongoose.
 *
 * Reads MONGODB_URI from environment variables (loaded via dotenv in server.js).
 * Implements connection error handling and logs connection status to the console.
 *
 * Usage: Call connectDB() once during server startup before the Express server begins listening.
 */

const mongoose = require('mongoose');

/**
 * Establishes a connection to the MongoDB database.
 * Exits the process if the connection cannot be established.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  console.log(uri);

  if (!uri) {
    console.error(
      '[DB] FATAL: MONGODB_URI is not defined in environment variables. Exiting.'
    );
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[DB] MongoDB connection error: ${error.message}`);
    // Exit the process with failure code so the OS/orchestrator can restart
    process.exit(1);
  }
};

module.exports = connectDB;
