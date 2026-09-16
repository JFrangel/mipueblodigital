import { getApps, initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
let client: ReturnType<typeof initializeClient> | undefined;
function initializeClient() {
  const emulator = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true";
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (
    !config.apiKey ||
    !config.authDomain ||
    !config.projectId ||
    !config.appId
  )
    throw new Error("Firebase aún no está configurado para este entorno.");
  if (
    emulator &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
  )
    throw new Error(
      "Los emuladores solo están habilitados en desarrollo local.",
    );
  const app =
    getApps().find((a) => a.name === "mi-pueblo") ??
    initializeApp(config, "mi-pueblo");
  const auth = getAuth(app);
  auth.languageCode = "es";
  const db = getFirestore(app);
  if (emulator) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  return { auth, db };
}
export function firebaseClient() {
  if (typeof window === "undefined")
    throw new Error("Firebase cliente requiere navegador.");
  return (client ??= initializeClient());
}
