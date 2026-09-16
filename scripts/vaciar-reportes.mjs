/**
 * Vacía los expedientes del servidor: el borrón y cuenta nueva antes de abrir.
 *
 *   node scripts/vaciar-reportes.mjs             # cuenta lo que hay y no toca nada
 *   node scripts/vaciar-reportes.mjs --borrar    # borra de verdad
 *
 * Para qué existe: las reglas de privacidad cambiaron sobre la marcha. Los
 * expedientes anteriores se guardaron sin la marca de cuenta que hoy decide qué
 * es de quién, y arrastrarlos es arrastrar esa ambigüedad para siempre: un
 * reporte de la época antigua no se puede atribuir con certeza a nadie, así que
 * ni «Mis reportes» ni el historial de la comunidad pueden colocarlo bien.
 *
 * Esto **no es la retirada del panel**. Retirar un reporte desde el Consejo
 * deja acta y le avisa a quien lo envió, porque es una decisión sobre un caso
 * concreto que alguien reportó de verdad. Esto es lo otro: borrar la base de
 * pruebas antes de abrir. No deja acta y no avisa a nadie.
 *
 * Borra: incidents (con sus actuaciones), publicIncidents, incidentEvidence,
 * incidentIntake, incidentLimits, removedIncidents, councilNotifications, las
 * novedades personales y, si hay credenciales, las fotografías originales.
 * No toca cuentas, ni roles, ni comunicados.
 *
 * **Sin `--borrar` no escribe nada**: enseña lo que hay y se va. No tiene
 * vuelta atrás, así que léelo antes y hazlo cuando no haya nadie usando la
 * aplicación.
 *
 * Necesita las credenciales de servidor de .env.example
 * (GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_KEY), y para la
 * fotografía original, SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const borrar = process.argv.slice(2).includes("--borrar");

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
  getApps().find((a) => a.name === "vaciar-reportes") ??
  initializeApp(
    { credential: cert(cuenta), projectId: cuenta.project_id },
    "vaciar-reportes",
  );
const db = getFirestore(app);

/* Las colecciones del expediente, con las subcolecciones que Firestore no
   borra en cascada. */
const colecciones = [
  ["incidents", ["events"]],
  ["publicIncidents", []],
  ["incidentEvidence", []],
  ["incidentIntake", []],
  ["incidentLimits", []],
  ["removedIncidents", []],
  ["councilNotifications", []],
];

/** Borra una colección entera en lotes, con sus subcolecciones. */
async function vaciar(ruta, subcolecciones) {
  let total = 0;
  for (;;) {
    const pagina = await db.collection(ruta).limit(200).get();
    if (pagina.empty) return total;
    for (const doc of pagina.docs)
      for (const sub of subcolecciones) {
        const hijos = await doc.ref.collection(sub).limit(500).get();
        if (!hijos.empty) {
          const lote = db.batch();
          for (const hijo of hijos.docs) lote.delete(hijo.ref);
          await lote.commit();
        }
      }
    const lote = db.batch();
    for (const doc of pagina.docs) lote.delete(doc.ref);
    await lote.commit();
    total += pagina.size;
    if (pagina.size < 200) return total;
  }
}

if (!borrar) {
  console.log("Lo que hay ahora. No se borra nada sin --borrar.\n");
  for (const [nombre] of colecciones) {
    const { data } = await db.collection(nombre).count().get();
    console.log(`  ${nombre.padEnd(22)} ${data().count}`);
  }
  const cuentas = await db.collection("accounts").count().get();
  console.log(
    `  ${"accounts".padEnd(22)} ${cuentas.data().count}  (no se tocan)`,
  );
  console.log("\nPara borrarlo: node scripts/vaciar-reportes.mjs --borrar");
  process.exit(0);
}

for (const [nombre, subs] of colecciones) {
  const total = await vaciar(nombre, subs);
  console.log(`${nombre}: ${total} documento(s) borrado(s).`);
}

/* Las novedades personales hablaban de expedientes que ya no existen. Se
   recorren por cuenta, que es como están guardadas. */
let avisos = 0;
const cuentas = await db.collection("accounts").select().get();
for (const persona of cuentas.docs) {
  const items = await db.collection(`notifications/${persona.id}/items`).get();
  if (items.empty) continue;
  const lote = db.batch();
  for (const doc of items.docs) lote.delete(doc.ref);
  await lote.commit();
  avisos += items.size;
}
console.log(`notifications: ${avisos} aviso(s) borrado(s).`);

/* La fotografía original vive fuera de Firestore. */
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (url && key) {
  const respuesta = await fetch(
    `${url.replace(/\/$/, "")}/rest/v1/mpd_evidence_originals?id=not.is.null`,
    {
      method: "DELETE",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        Prefer: "return=minimal",
      },
    },
  );
  console.log(
    respuesta.ok
      ? "mpd_evidence_originals: fotografías originales borradas."
      : `mpd_evidence_originals: no se pudieron borrar (${respuesta.status}). Hazlo desde el panel de Supabase.`,
  );
} else
  console.log(
    "mpd_evidence_originals: sin SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, las fotografías originales siguen ahí.",
  );

console.log(
  "\nListo. En cada teléfono queda todavía la copia local: se limpia desde Mi cuenta, o borrando los datos del sitio en el navegador.",
);
process.exit(0);
