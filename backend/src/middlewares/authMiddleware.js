/**
 * authMiddleware.js
 * Firebase Authentication middleware for protected routes.
 *
 * This middleware intercepts every incoming request to a protected route,
 * extracts the Firebase ID token from the Authorization header, and verifies
 * it using the Firebase Admin SDK.
 *
 * On success:
 *  - The decoded token payload (including `uid` and `email`) is attached to
 *    `req.user` so downstream controllers can access user identity without
 *    re-verifying the token.
 *
 * On failure (missing, malformed, or expired token):
 *  - Returns 401 Unauthorized with a standardized error response (FR-003).
 *  - The error is passed to the global errorHandler for consistent formatting.
 *
 * Token format expected in Authorization header:
 *  Authorization: Bearer <firebase-id-token>
 */

const admin = require('firebase-admin');

/**
 * protect
 * Express middleware that verifies a Firebase ID token from the Authorization header.
 * Attaches the decoded token to `req.user` on success.
 *
 * @param {object}   req  - Express request object
 * @param {object}   res  - Express response object
 * @param {Function} next - Express next middleware function
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check that the Authorization header is present and uses the Bearer scheme
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error(
      'Authorization token missing or malformed. Expected: Bearer <token>'
    );
    error.status = 401;
    return next(error);
  }

  // Extract the raw token string from "Bearer <token>"
  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Verify the token cryptographically using Firebase Admin SDK.
    // This confirms the token is genuine, not expired, and issued for this project.
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Attach the decoded payload to the request for use in controllers.
    // At minimum, `decodedToken` contains: uid, email, iat, exp, aud, iss
    req.user = decodedToken;

    next();
  } catch (error) {
    // Token is invalid, expired, or was issued for a different Firebase project.
    const authError = new Error('Unauthorized: Invalid or expired token.');
    authError.status = 401;
    next(authError);
  }
};

module.exports = { protect };
