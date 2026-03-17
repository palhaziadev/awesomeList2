import { getAuth } from "@react-native-firebase/auth";

// @react-native-firebase/app auto-initializes from google-services.json (Android)
// and GoogleService-Info.plist (iOS). No manual initializeApp() needed.
// Auth persistence is handled natively — no AsyncStorage setup required.

export const auth = getAuth();
