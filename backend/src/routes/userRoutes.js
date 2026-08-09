/**
 * userRoutes.js
 * Express router for user profile synchronization endpoints.
 *
 * All routes here are protected by the `protect` middleware, which verifies
 * the Firebase ID token and attaches `req.user` before the controller runs.
 *
 * Routes:
 *  POST /api/users/sync  → syncUser controller
 */

const express = require('express');
const { syncUser } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @route   POST /api/users/sync
 * @desc    Verify Firebase token and create/update the user profile in MongoDB.
 * @access  Protected
 */
router.post('/sync', protect, syncUser);

module.exports = router;
