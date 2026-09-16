import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
const app = initializeApp({
  apiKey: "local-test-key",
  projectId: "demo-mi-pueblo",
  authDomain: "demo-mi-pueblo.firebaseapp.com",
});
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
try {
  const email = `integration-${Date.now()}@example.test`,
    password = "PruebaLocal!123";
  const created = await createUserWithEmailAndPassword(auth, email, password);
  const uid = created.user.uid;
  await signOut(auth);
  assert.equal(auth.currentUser, null);
  await assert.rejects(
    signInWithEmailAndPassword(auth, email, "Incorrecta!123"),
  );
  const signed = await signInWithEmailAndPassword(auth, email, password);
  assert.equal(signed.user.uid, uid);
  await sendPasswordResetEmail(auth, email);
  await signOut(auth);
  console.log(
    "PASS: crear identidad, rechazar contraseña incorrecta, iniciar sesión, solicitar recuperación y cerrar sesión en emulador.",
  );
} finally {
  await deleteApp(app);
}
