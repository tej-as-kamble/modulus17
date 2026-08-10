/**
 * Task.js
 * Mongoose schema for user task records.
 *
 * Each task belongs exclusively to one authenticated user, identified by their
 * Firebase `uid` stored in the `userId` field. Data isolation is enforced at
 * the controller level by always scoping queries to `{ _id, userId }`.
 *
 * Field constraints (from spec FR-004):
 *  - title:       Required, max 100 characters
 *  - description: Optional, max 1000 characters
 *  - dateTime:    Required Date (stored in UTC)
 *  - deadline:    Required Date (stored in UTC)
 *  - priority:    Required enum ('Low' | 'Medium' | 'High'), defaults to 'Medium'
 *  - status:      Required enum ('pending' | 'completed'), defaults to 'pending' (FR-005)
 *  - category:    Required strict enum ('Work' | 'Personal' | 'Health' | 'None'), defaults to 'None' (FR-001)
 *  - userId:      Required string, indexed for efficient per-user queries (FR-013)
 */

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    /**
     * title — The short name of the task.
     * Trimmed to remove accidental whitespace. Max 100 chars enforced.
     */
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },

    /**
     * description — Optional context or details for the task.
     * Max 1000 chars enforced.
     */
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },

    /**
     * dateTime — The scheduled execution time for this task.
     * Stored in UTC; converted to IST before sending to clients (FR-012).
     */
    dateTime: {
      type: Date,
      required: [true, 'dateTime is required'],
    },

    /**
     * deadline — The absolute cutoff time for this task.
     * Stored in UTC; converted to IST before sending to clients (FR-012).
     */
    deadline: {
      type: Date,
      required: [true, 'deadline is required'],
    },

    /**
     * priority — The urgency classification of the task.
     * Allowed values: 'Low', 'Medium', 'High'. Defaults to 'Medium'.
     */
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: {
        values: ['Low', 'Medium', 'High'],
        message: "Priority must be one of: 'Low', 'Medium', 'High'",
      },
      default: 'Medium',
    },

    /**
     * status — The lifecycle state of the task.
     * Allowed values: 'pending', 'completed'. Defaults to 'pending' (FR-005).
     */
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['pending', 'completed'],
        message: "Status must be one of: 'pending', 'completed'",
      },
      default: 'pending',
    },

    /**
     * category — Classification tag for filtering and organization. (FR-001)
     *
     * DESIGN DECISION: Using a strict Enum instead of a free-form String.
     * Rationale: A controlled vocabulary prevents data drift (e.g., 'work' vs 'Work'
     * vs 'WORK') which would silently break client-side filtering. By enforcing
     * the enum at the schema level, we guarantee consistent casing and valid values
     * at the database layer, making the filter selector O(1) per comparison.
     *
     * Allowed values: 'Work', 'Personal', 'Health', 'None'
     * Default: 'None' — tasks without an explicit category are uncategorized.
     */
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['Work', 'Personal', 'Health', 'None'],
        message: "Category must be one of: 'Work', 'Personal', 'Health', 'None'",
      },
      default: 'None',
    },

    /**
     * userId — The Firebase `uid` of the owning user.
     * Indexed for fast per-user queries (FR-013). Never exposed without a matching uid check.
     */
    userId: {
      type: String,
      required: [true, 'userId is required'],
      index: true,
    },
  },
  {
    // Automatically adds `createdAt` and `updatedAt` timestamp fields.
    timestamps: true,
  }
);

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
