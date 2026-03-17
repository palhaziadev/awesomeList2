import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from "@react-native-firebase/auth";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { auth } from "@/lib/firebase";

GoogleSignin.configure({
  webClientId:
    "203722623000-e1nuqqv0mo5dsd9ga0sofiojrafske9v.apps.googleusercontent.com",
  offlineAccess: true,
});

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();

  if (response.type !== "success") {
    throw new Error("Google sign-in was cancelled or failed");
  }

  const { idToken } = response.data;
  const credential = GoogleAuthProvider.credential(idToken);

  return signInWithCredential(auth, credential);
}

export async function signOutUser() {
  await GoogleSignin.signOut();
  await signOut(auth);
}

export { statusCodes };
