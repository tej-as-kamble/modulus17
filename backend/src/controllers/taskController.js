/**
 * taskController.js
 * Business logic for all Task CRUD operations.
 *
 * Data isolation contract (FR-010, SC-002):
 *  Every mutating operation (update, delete) scopes its database query to BOTH
 *  `_id` AND `userId`. This means if the task doesn't exist OR belongs to a
 *  different user, the query returns null → 404 Not Found is returned.
 *  This intentionally hides the existence of other users' tasks.
 *
 * Timezone contract (FR-012):
 *  Dates are stored in UTC in MongoDB. Before returning tasks to clients, all
 *  Date fields are converted to IST (UTC+5:30) using a local helper function.
 *
 * Error handling:
 *  All errors are passed via next(error) to the global errorMiddleware.
 */

const Task = require('../models/Task');

// =============================================================================
// Timezone Helper
// =============================================================================

/**
 * The IST offset relative to UTC, expressed in milliseconds.
 * IST = UTC + 5 hours 30 minutes = UTC + 19800 seconds = UTC + 19800000 ms
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * toIST
 * Converts a UTC Date object to an ISO 8601 string in IST (UTC+5:30).
 *
 * This approach creates a new Date shifted by the IST offset, then uses
 * toISOString() to produce a deterministic string. The trailing "Z" is
 * intentionally replaced with "+05:30" to correctly reflect the timezone.
 *
 * @param   {Date|null|undefined} date - A UTC Date value from MongoDB
 * @returns {string|null}              - ISO 8601 string in IST, or null if input is falsy
 */
const toIST = (date) => {
  if (!date) return null;
  const utcMs = new Date(date).getTime();
  const istDate = new Date(utcMs + IST_OFFSET_MS);
  return istDate.toISOString().replace('Z', '+05:30');
};

/**
 * convertTaskDatesToIST
 * Transforms a Mongoose task document into a plain object with dates in IST.
 * This is called on every task before it is sent in an API response.
 *
 * @param   {object} task - A Mongoose Task document (or plain object)
 * @returns {object}      - Plain object representation with IST-converted dates
 */
const convertTaskDatesToIST = (task) => {
  const plain = task.toObject ? task.toObject() : { ...task };
  return {
    ...plain,
    dateTime: toIST(plain.dateTime),
    deadline: toIST(plain.deadline),
    createdAt: toIST(plain.createdAt),
    updatedAt: toIST(plain.updatedAt),
  };
};

// =============================================================================
// Controller: createTask
// =============================================================================

/**
 * createTask
 * Creates a new task record owned by the authenticated user.
 *
 * The `userId` is sourced exclusively from `req.user.uid` (the verified Firebase
 * token) — the client cannot supply or spoof their own userId.
 * The `status` field defaults to 'pending' (FR-005); the client cannot set it on creation.
 *
 * @route   POST /api/tasks
 * @access  Protected
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, dateTime, deadline, priority } = req.body;

    // Validate required fields explicitly for clear client-facing error messages
    if (!title || !dateTime || !deadline || !priority) {
      const error = new Error(
        'Missing required fields: title, dateTime, deadline, and priority are required.'
      );
      error.status = 400;
      return next(error);
    }

    const task = await Task.create({
      title,
      description,
      dateTime,
      deadline,
      priority,
      // status defaults to 'pending' via schema — not set by client (FR-005)
      userId: req.user.uid, // Sourced from verified token only
    });

    res.status(201).json({
      success: true,
      task: convertTaskDatesToIST(task),
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// Controller: getTasks
// =============================================================================

/**
 * getTasks
 * Retrieves all tasks belonging to the authenticated user.
 *
 * Data isolation: queries are scoped strictly to `{ userId: req.user.uid }`,
 * ensuring users can only see their own tasks (FR-010, SC-002).
 *
 * Dates are converted from UTC (storage) to IST before the response (FR-012).
 * Sorting is delegated to the client.
 *
 * @route   GET /api/tasks
 * @access  Protected
 */
const getTasks = async (req, res, next) => {
  try {
    // Scope query strictly to the authenticated user's uid
    const tasks = await Task.find({ userId: req.user.uid });

    // Convert all date fields from UTC to IST before sending to client (FR-012)
    const tasksInIST = tasks.map(convertTaskDatesToIST);

    res.status(200).json({
      success: true,
      tasks: tasksInIST,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// Controller: updateTaskStatus
// =============================================================================

/**
 * updateTaskStatus
 * Updates the `status` field of a specific task to 'completed'.
 *
 * Data isolation (FR-010): the query includes BOTH `_id` and `userId`.
 * If the task does not exist OR belongs to another user, null is returned
 * and a 404 is sent — intentionally hiding the existence of other users' tasks.
 *
 * @route   PATCH /api/tasks/:id/status
 * @access  Protected
 */
const updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate the provided status value against the allowed enum
    if (!status || !['pending', 'completed'].includes(status)) {
      const error = new Error(
        "Invalid status value. Must be one of: 'pending', 'completed'."
      );
      error.status = 400;
      return next(error);
    }

    // Scope the query to both _id AND userId — this is the core isolation check.
    // If _id exists but belongs to a different user, this returns null (→ 404).
    const task = await Task.findOneAndUpdate(
      { _id: id, userId: req.user.uid },
      { status },
      { new: true, runValidators: true }
    );

    if (!task) {
      // Task not found OR belongs to a different user → 404 (hides existence)
      const error = new Error('Task not found.');
      error.status = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      task: convertTaskDatesToIST(task),
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// Controller: deleteTask
// =============================================================================

/**
 * deleteTask
 * Permanently removes a task record from the database.
 *
 * Data isolation (FR-010): the query includes BOTH `_id` and `userId`.
 * If the task does not exist OR belongs to another user, null is returned
 * and a 404 is sent — intentionally hiding the existence of other users' tasks.
 *
 * @route   DELETE /api/tasks/:id
 * @access  Protected
 */
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Scope deletion to both _id AND userId — core data isolation check.
    const task = await Task.findOneAndDelete({ _id: id, userId: req.user.uid });

    if (!task) {
      // Task not found OR belongs to a different user → 404 (hides existence)
      const error = new Error('Task not found.');
      error.status = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createTask, getTasks, updateTaskStatus, deleteTask };
