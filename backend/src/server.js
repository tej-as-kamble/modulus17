/**
 * server.js
 * Express application entry point.
 *
 * Responsibilities:
 *  1. Load environment variables from .env (must be first)
 *  2. Initialize Firebase Admin SDK
 *  3. Connect to MongoDB
 *  4. Configure and start the Express server
 *
 * Global middleware:
 *  - express.json()  → parse incoming JSON request bodies
 *  - cors()          → allow cross-origin requests (configure for production)
 *
 * Health Check:
 *  - GET /health → returns 200 OK with system status
 */

// Load environment variables FIRST before any other imports
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { initFirebaseAdmin } = require('./config/firebase');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const { errorHandler } = require('./middlewares/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// Global Middleware
// =============================================================================

// Parse incoming JSON request bodies globally (FR-005)
app.use(express.json());

// Enable Cross-Origin Resource Sharing
// TODO: Restrict allowed origins for production
app.use(cors());

// =============================================================================
// Health Check Endpoint (FR-003 / SC-001)
// =============================================================================

/**
 * GET /health
 * Returns a 200 OK response confirming the server is operational.
 * Used by load balancers, monitoring tools, and quickstart validation.
 */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is operational',
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// API Routes
// =============================================================================

// User profile synchronization routes (POST /api/users/sync)
app.use('/api/users', userRoutes);

// Task CRUD routes (POST, GET /api/tasks | PATCH, DELETE /api/tasks/:id)
app.use('/api/tasks', taskRoutes);

// =============================================================================
// Global Error Handler (must be LAST middleware registered)
// =============================================================================

// Catches any error passed via next(error) from routes or middlewares
// and returns a standardized { success: false, message } JSON response (FR-011).
app.use(errorHandler);

// =============================================================================
// Application Bootstrap
// =============================================================================

const startServer = async () => {
  // 1. Initialize Firebase Admin SDK (T015 / T016 / FR-008)
  initFirebaseAdmin();

  // 2. Connect to MongoDB (T010 / T012 / FR-002)
  await connectDB();

  // 3. Start listening on the configured port (FR-001)
  app.listen(PORT, () => {
    console.log(`[Server] Express server running on http://localhost:${PORT}`);
    console.log(`[Server] Health check available at http://localhost:${PORT}/health`);
  });
};

startServer();

module.exports = app; // Export for testing;                                                                                                                                     