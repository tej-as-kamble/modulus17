/**
 * taskRoutes.js
 * Express router for all Task CRUD endpoints.
 *
 * All routes are protected by the `protect` middleware, which verifies the
 * Firebase ID token and populates `req.user` before any controller runs.
 *
 * Routes:
 *  POST   /api/tasks              → createTask   (create a new task)
 *  GET    /api/tasks              → getTasks     (retrieve all tasks for the user)
 *  PATCH  /api/tasks/:id/status  → updateTaskStatus (mark task as completed/pending)
 *  DELETE /api/tasks/:id          → deleteTask   (permanently remove a task)
 */

const express = require('express');
const {
  createTask,
  getTasks,
  updateTaskStatus,
  deleteTask,
} = require('../controllers/taskController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply the `protect` middleware to all routes in this router.
// This ensures every task endpoint requires a valid Firebase ID token.
router.use(protect);

/**
 * @route   POST /api/tasks
 * @desc    Create a new task for the authenticated user.
 * @access  Protected
 */
router.post('/', createTask);

/**
 * @route   GET /api/tasks
 * @desc    Retrieve all tasks belonging to the authenticated user (dates in IST).
 * @access  Protected
 */
router.get('/', getTasks);

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Update the status of a specific task (pending ↔ completed).
 *          Returns 404 if the task does not exist or belongs to a different user.
 * @access  Protected
 */
router.patch('/:id/status', updateTaskStatus);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Permanently delete a specific task.
 *          Returns 404 if the task does not exist or belongs to a different user.
 * @access  Protected
 */
router.delete('/:id', deleteTask);

module.exports = router;
