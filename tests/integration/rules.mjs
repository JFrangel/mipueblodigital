import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
const env = await initializeTestEnvironment({
  projectId: "demo-mi-pueblo",
  firestore: {
    host: "127.0.0.1",
    port: 8080,
    rules: await readFile("firebase/firestore.rules", "utf8"),
  },
});
try {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "accounts/alice"), { active: true });
    await setDoc(doc(db, "accounts/bob"), { active: true });
    await setDoc(doc(db, "accounts/admin"), { active: true });
    await setDoc(doc(db, "accounts/disabled"), { active: false });
    await setDoc(doc(db, "incidents/one"), {
      ownerUid: "alice",
      description: "Privado",
    });
    await setDoc(doc(db, "publicIncidents/one"), {
      published: true,
      title: "Proyección pública",
    });
    await setDoc(doc(db, "publicIncidents/leaked"), {
      published: true,
      title: "Proyección incorrecta",
      phone: "3000000000",
    });
  });
  const alice = env.authenticatedContext("alice").firestore(),
    bob = env.authenticatedContext("bob").firestore(),
    admin = env.authenticatedContext("admin", { admin: true }).firestore(),
    anon = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(alice, "incidents/one")));
  await assertFails(getDoc(doc(bob, "incidents/one")));
  await assertFails(getDoc(doc(anon, "incidents/one")));
  await assertFails(getDoc(doc(admin, "incidents/one")));
  await assertFails(
    getDoc(
      doc(
        env.authenticatedContext("disabled", { admin: true }).firestore(),
        "incidents/one",
      ),
    ),
  );
  await assertFails(
    setDoc(doc(alice, "accounts/alice"), { active: true, admin: true }),
  );
  await assertFails(
    setDoc(doc(admin, "incidents/one"), { status: "solucionado" }),
  );
  await assertFails(getDoc(doc(anon, "publicIncidents/one")));
  await assertSucceeds(getDoc(doc(alice, "publicIncidents/one")));
  await assertFails(getDoc(doc(alice, "publicIncidents/leaked")));
  await assertFails(getDoc(doc(alice, "incidentIntake/secret")));
  await assertFails(getDoc(doc(alice, "councilNotifications/secret")));
  await assertFails(getDoc(doc(alice, "notifications/bob/items/secret")));
  await assertFails(getDoc(doc(anon, "publicIncidents/leaked")));
  console.log(
    "PASS: aislamiento por autor, administrador activo, cuenta desactivada, proyección pública y rechazo a escrituras directas.",
  );
} finally {
  await env.cleanup();
}
