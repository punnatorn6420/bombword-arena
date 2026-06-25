import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

function getServiceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encoded) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable.");
  }

  const serviceAccount = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));

  if (typeof serviceAccount.private_key === "string") {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  return serviceAccount;
}

export function getAdminDatabase() {
  if (!getApps().length) {
    const databaseURL = process.env.FIREBASE_ADMIN_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    if (!databaseURL) {
      throw new Error("Missing Firebase Realtime Database URL.");
    }

    initializeApp({
      credential: cert(getServiceAccount()),
      databaseURL,
    });
  }

  return getDatabase();
}
