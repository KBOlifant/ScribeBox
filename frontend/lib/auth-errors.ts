import { FirebaseError } from "firebase/app";

/** Turns a Firebase Auth error into a message safe to show. Never reveals whether an email exists. */
export function authErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) return "Something went wrong. Try again.";
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "That email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account with that email already exists.";
    case "auth/weak-password":
      return "Choose a stronger password.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Couldn’t reach the server. Check your connection and try again.";
    case "auth/requires-recent-login":
      return "For your security, log in again and retry.";
    default:
      return "Something went wrong. Try again.";
  }
}
