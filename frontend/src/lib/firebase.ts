import { getApp, getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
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

export async function registerWithFirebaseEmail(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<NexusSession> {
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      input.email.trim().toLowerCase(),
      input.password
    );
    await updateProfile(credential.user, { displayName: input.fullName.trim() });
    return await exchangeFirebaseUser(credential.user, "password");
  } catch (reason) {
    throw new Error(firebaseAuthErrorMessage(reason));
  }
}

export async function signInWithFirebaseEmail(
  email: string,
  password: string
): Promise<NexusSession> {
  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );
    return await exchangeFirebaseUser(credential.user, "password");
  } catch (reason) {
    throw new Error(firebaseAuthErrorMessage(reason));
  }
}

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
    return await exchangeFirebaseUser(credential.user, "google");
  } catch (reason) {
    throw new Error(firebaseAuthErrorMessage(reason));
  }
}

export async function resumeGoogleSession(): Promise<NexusSession | null> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;
  try {
    await user.reload();
    const currentUser = auth.currentUser ?? user;
    return await exchangeFirebaseUser(currentUser, currentIdentityProvider(currentUser));
  } catch (reason) {
    throw new Error(firebaseAuthErrorMessage(reason));
  }
}

export async function signOutFirebase(): Promise<void> {
  if (auth.currentUser) {
    await signOut(auth);
  }
}

async function exchangeFirebaseUser(
  user: User,
  identityProvider: NexusSession["identityProvider"]
): Promise<NexusSession> {
  const accessToken = await user.getIdToken(true);
  return {
    ...(await exchangeFirebaseToken(accessToken)),
    identityProvider,
    displayName: user.displayName ?? undefined,
    email: user.email ?? undefined,
    photoUrl: user.photoURL ?? undefined
  };
}

function currentIdentityProvider(user: User): NexusSession["identityProvider"] {
  return user.providerData.some((profile) => profile.providerId === "password")
    ? "password"
    : "google";
}

function firebaseAuthErrorMessage(reason: unknown): string {
  const code =
    typeof reason === "object" && reason !== null && "code" in reason
      ? String((reason as { code: unknown }).code)
      : "";

  if (code === "auth/email-already-in-use") {
    return "This email already has a Nexus sign-in. Switch to Log In.";
  }
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return "Invalid email or password.";
  }
  if (code === "auth/user-not-found") {
    return "No Nexus account exists for this email yet.";
  }
  if (code === "auth/weak-password") {
    return "Use a stronger password with at least 10 characters.";
  }
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
    return "This sign-in method is not enabled in Firebase Authentication.";
  }
  if (code === "auth/too-many-requests") {
    return "Firebase temporarily blocked this action because it was tried too many times. Wait a little, then try again.";
  }
  if (code === "auth/network-request-failed") {
    return "Google could not be reached. Check your connection or privacy extensions and try again.";
  }
  if (code === "auth/internal-error") {
    return "Google sign-in could not initialize. Refresh Nexus and try again.";
  }
  return reason instanceof Error ? reason.message : "Google sign-in is unavailable.";
}
