import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "firebase/auth";

import type { NexusSession } from "@/types/auth";

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
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(auth, provider);
  const accessToken = await credential.user.getIdToken();
  return {
    accessToken,
    userId: credential.user.uid,
    workspaceId: `firebase-${credential.user.uid}`,
    mode: "firebase",
    displayName: credential.user.displayName ?? undefined,
    email: credential.user.email ?? undefined,
    photoUrl: credential.user.photoURL ?? undefined
  };
}

export async function signOutFirebase(): Promise<void> {
  if (auth.currentUser) {
    await signOut(auth);
  }
}
