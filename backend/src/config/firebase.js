/**
 * firebase.js
 * Firebase Admin SDK initialization.
 *
 * Reads Firebase service account credentials from environment variables loaded
 * via dotenv — credentials are NEVER hard-coded or committed to version control.
 *
 * Usage: Call initFirebaseAdmin() once during server startup.
 * After initialization, use admin.auth(), admin.firestore(), etc. throughout the app.
 */

const admin = require('firebase-admin');

/**
 * Initializes the Firebase Admin SDK using environment variable credentials.
 * Exits the process if required credentials are missing.
 */
const initFirebaseAdmin = () => {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } =
    process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.error(
      '[Firebase] FATAL: Missing Firebase Admin SDK credentials in environment variables. ' +
        'Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set. Exiting.'
    );
    process.exit(1);
  }

  // Parse the private key: newline characters may be escaped as \n in .env files
  const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  try {
    admin.initializeApp({
      credential: admin.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });

    console.log(
      `[Firebase] Admin SDK initialized for project: ${FIREBASE_PROJECT_ID}`
    );
  } catch (error) {
    console.error(
      `[Firebase] Admin SDK initialization failed: ${error.message}`
    );
    process.exit(1);
  }
};

module.exports = { initFirebaseAdmin };
