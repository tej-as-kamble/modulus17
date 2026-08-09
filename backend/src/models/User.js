/**
 * User.js
 * Mongoose schema for synchronized Firebase user profiles.
 *
 * This model stores only the minimum identifying information extracted from a
 * validated Firebase ID token — the unique user identifier (`uid`) and the
 * registered email address (`email`).
 *
 * Security contract (FR-014):
 *  - Passwords are NEVER stored here. Authentication is fully delegated to Firebase Auth.
 *  - Only `uid` and `email` are persisted to represent a user profile.
 *
 * Usage: Upserted on every successful call to POST /api/users/sync.
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    /**
     * uid — The stable, unique identifier issued by Firebase Auth.
     * This is the primary key used to link tasks to their owner.
     */
    uid: {
      type: String,
      required: [true, 'uid is required'],
      unique: true,
      trim: true,
    },

    /**
     * email — The user's registered email address, extracted from the
     * decoded Firebase ID token. Stored in lowercase for consistency.
     */
    email: {
      type: String,
      required: [true, 'email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    // Automatically adds `createdAt` and `updatedAt` timestamp fields.
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
