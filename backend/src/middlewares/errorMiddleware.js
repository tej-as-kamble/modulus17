/**
 * errorMiddleware.js
 * Global Express error-handling middleware.
 *
 * This must be the LAST middleware registered in server.js (after all routes).
 * It catches any error passed via `next(error)` from any route or middleware
 * and returns a consistent, structured JSON error response (FR-011).
 *
 * Response format guaranteed for ALL errors:
 *  {
 *    "success": false,
 *    "message": "Human readable error description."
 *  }
 */

/**
 * errorHandler
 * Catches errors forwarded via next(error) and sends a standardized JSON response.
 *
 * @param {Error}  err  - The error object (may contain `status` or `statusCode`)
 * @param {object} req  - Express request object
 * @param {object} res  - Express response object
 * @param {Function} next - Express next function (required signature for error middleware)
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Use the status attached to the error, or fall back to 500 (Internal Server Error)
  const statusCode = err.status || err.statusCode || 500;

  // Avoid leaking internal stack traces or implementation details to the client.
  const message =
    statusCode === 500 ? 'An internal server error occurred.' : err.message;

  // Log the full error internally for debugging (not sent to client)
  console.error(
    `[ErrorHandler] ${req.method} ${req.path} → ${statusCode}: ${err.message}`
  );

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = { errorHandler };
