/**
 * userController.js
 * Business logic for user profile synchronization.
 *
 * This controller handles the POST /api/users/sync endpoint. Its sole
 * responsibility is to receive an already-validated Firebase token (decoded
 * by authMiddleware), then create or update the matching User record in MongoDB.
 *
 * No passwords are handled here — authentication is fully delegated to Firebase (FR-014).
 */

const User = require('../models/User');

/**
 * syncUser
 * Creates a new user profile or updates an existing one based on the Firebase `uid`.
 *
 * The `req.user` object is populated by `authMiddleware` and contains the
 * decoded Firebase token payload, including `uid` and `email`.
 *
 * @route   POST /api/users/sync
 * @access  Protected (requires valid Firebase ID token)
 */
const syncUser = async (req, res, next) => {
  try {
    // `req.user` is guaranteed to exist here because authMiddleware runs first.
    // Extract uid and email from the decoded Firebase token.
    const { uid, email } = req.user;

    // Upsert: find by uid and update email, or insert if no document exists.
    // `new: true` returns the updated document; `upsert: true` creates if missing.
    const user = await User.findOneAndUpdate(
      { uid },
      { uid, email },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
      },
    });
  } catch (error) {
    // Pass errors to the global error handler (errorMiddleware)
    next(error);
  }
};

module.exports = { syncUser };
