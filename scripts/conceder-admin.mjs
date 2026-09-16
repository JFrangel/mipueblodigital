/**
 * Concede el rol de administrador del Consejo a una cuenta.
 *
 *   node scripts/conceder-admin.mjs alguien@ejemplo.com
 *   node scripts/conceder-admin.mjs alguien@ejemplo.com --retirar
 *
 * Para qué existe: el rol **no es un campo de Firestore**, es una
 * reivindicación del token (`admin`). Escribir «admin» a mano en la consola de
 * la base no hace administrador a nadie, porque la aplicación —y el servidor—
 * leen la reivindicación, no el documento.
 *
 * Y solo puede ponerla el SDK de servidor. De ahí este guion: es el que
 * concede el **primer** administrador. A partir de ahí, el propio Panel del
 * Consejo permite designar a los demás sin volver aquí.
 *
 * Necesita las credenciales privadas del proyecto, las mismas que usa el
 * servidor: GOOGLE_APPLICATION_CREDENTIALS (ruta al JSON) o
 * FIREBASE_SERVICE_ACCOUNT_KEY (el JSON, o en Base64).
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const [email, ...flags] = process.argv.slice(2);
const retirar = flags.includes("--retirar");

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error(
    "Uso: node scripts/conceder-admin.mjs correo@ejemplo.com [--retirar]",
  );
  process.exit(1);
}

function credenciales() {
  const bruto = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (bruto)
    return JSON.parse(
      bruto.trim().startsWith("{")
        ? bruto
        : Buffer.from(bruto, "base64").toString("utf-8"),
    );
  const ruta = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (ruta) return JSON.parse(readFileSync(ruta, "utf-8"));
  console.error(
    "Faltan las credenciales del servidor: define GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_KEY.",
  );
  process.exit(1);
}

const cuenta = credenciales();
const app =
  getApps().find((a) => a.name === "conceder-admin") ??
  initializeApp(
    { credential: cert(cuenta), projectId: cuenta.project_id },
    "conceder-admin",
  );
const auth = getAuth(app);
const db = getFirestore(app);

const usuario = await auth.getUserByEmail(email).catch(() => null);
if (!usuario) {
  console.error(
    `No hay ninguna cuenta con ${email}. Pídele que entre una vez a la aplicación.`,
  );
  process.exit(1);
}

await auth.setCustomUserClaims(usuario.uid, retirar ? {} : { admin: true });
/* El `role` del documento no lo lee nadie —quien decide es la reivindicación—,
   pero se deja al día para que la consola no contradiga a la aplicación. */
await db
  .doc(`accounts/${usuario.uid}`)
  .update({ role: retirar ? "citizen" : "admin" })
  .catch(() => undefined);
await db.collection("councilRoleEvents").add({
  actor: "script",
  target: usuario.uid,
  targetEmail: email,
  admin: !retirar,
  at: new Date().toISOString(),
});

console.log(
  retirar
    ? `Rol retirado a ${email}.`
    : `${email} ya es administrador del Consejo.`,
);
/* La reivindicación viaja dentro del token, y el token dura una hora. Hasta
   que se renueve, la sesión abierta sigue creyéndose ciudadana. */
console.log(
  "Tiene que cerrar sesión y volver a entrar para que su sesión lo reconozca.",
);
process.exit(0);
