import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User
} from "firebase/auth";

import type { NexusSession } from "@/types/auth";
import { exchangeFirebaseToken } from "@/lib/api";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyChJSRE-5owbu7elTb5RjRgFLHth9orsSM",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "nexus-advait-pm.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "nexus-advait-pm",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "nexus-advait-pm.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "1084749882068",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ??
    "1:1084749882068:web:fd1bbee3695d750197d141"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export async function signInWithGoogle(): Promise<NexusSession> {
  if (window.location.hostname === "127.0.0.1") {
    throw new Error(
      "Google sign-in is authorized on localhost. Open http://localhost:5173 and try again."
    );
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const credential = await signInWithPopup(auth, provider);
    return await exchangeGoogleUser(credential.user);
  } catch (reason) {
    throw new Error(googleAuthErrorMessage(reason));
  }
}

export async function resumeGoogleSession(): Promise<NexusSession | null> {
  await auth.authStateReady();
  if (!auth.currentUser) return null;
  try {
    return await exchangeGoogleUser(auth.currentUser);
  } catch (reason) {
    throw new Error(googleAuthErrorMessage(reason));
  }
}

export async function signOutFirebase(): Promise<void> {
  if (auth.currentUser) {
    await signOut(auth);
  }
}

async function exchangeGoogleUser(user: User): Promise<NexusSession> {
  const accessToken = await user.getIdToken();
  return {
    ...(await exchangeFirebaseToken(accessToken)),
    identityProvider: "google",
    displayName: user.displayName ?? undefined,
    email: user.email ?? undefined,
    photoUrl: user.photoURL ?? undefined
  };
}

function googleAuthErrorMessage(reason: unknown): string {
  const code =
    typeof reason === "object" && reason !== null && "code" in reason
      ? String((reason as { code: unknown }).code)
      : "";

  if (code === "auth/popup-blocked") {
    return "Your browser blocked the Google window. Allow pop-ups for Nexus and try again.";
  }
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "Google sign-in was cancelled before it finished.";
  }
  if (code === "auth/unauthorized-domain") {
    return "This address is not authorized for Google sign-in. Use the official Nexus site or localhost.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google sign-in is not enabled in Firebase Authentication.";
  }
  if (code === "auth/network-request-failed") {
    return "Google could not be reached. Check your connection or privacy extensions and try again.";
  }
  if (code === "auth/internal-error") {
    return "Google sign-in could not initialize. Refresh Nexus and try again.";
  }
  return reason instanceof Error ? reason.message : "Google sign-in is unavailable.";
}
