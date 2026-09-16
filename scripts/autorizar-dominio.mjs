/**
 * Autoriza un dominio en Firebase Authentication.
 *
 *   node --env-file=.env scripts/autorizar-dominio.mjs mipueblodigital.vercel.app
 *   node --env-file=.env scripts/autorizar-dominio.mjs --listar
 *
 * Para qué existe: Firebase solo acepta iniciar sesión desde los dominios que
 * tiene en su lista. Publicar la aplicación en una dirección nueva y no añadirla
 * ahí produce el fallo más desconcertante del proyecto: la aplicación carga
 * entera, el formulario responde, y entrar con Google se cierra sin decir por
 * qué. Ya pasó una vez con la política de contenido; esto es lo mismo un piso
 * más arriba.
 *
 * Hace falta cada vez que cambia la dirección: el dominio de Vercel, el propio
 * del Consejo cuando lo haya, y cualquiera de prueba.
 *
 * Añade, nunca quita: lee la lista, mete lo que falte y la vuelve a escribir.
 * Si el dominio ya está, lo dice y no toca nada.
 *
 * Necesita las credenciales de servidor de .env.example
 * (GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_KEY).
 */
import { cert, deleteApp, getApps, initializeApp } from "firebase-admin/app";
import { readFileSync } from "node:fs";

const argumentos = process.argv.slice(2);
const listar = argumentos.includes("--listar");
const dominios = argumentos.filter((a) => !a.startsWith("--"));

/* Sin protocolo ni barras: Firebase guarda el dominio a secas, y pegar la
   dirección del navegador con el https:// delante es el error natural. */
const limpio = (d) =>
  d
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

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
  throw new Error(
    "Faltan las credenciales del servidor: define GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_KEY.",
  );
}

/**
 * El trabajo, entero, dentro de una función.
 *
 * Nada de `process.exit`: cortar el proceso con las conexiones de Firebase
 * todavía abiertas hace abortar al motor de Node —«Assertion failed» y código
 * 127— después de haber hecho bien el trabajo. Se marca el código de salida, se
 * cierra la aplicación y se deja terminar sola.
 */
async function principal() {
  if (!listar && !dominios.length) {
    console.error(
      "Uso: node --env-file=.env scripts/autorizar-dominio.mjs <dominio> [...]\n" +
        "     node --env-file=.env scripts/autorizar-dominio.mjs --listar",
    );
    return 1;
  }

  const cuenta = credenciales();
  const app =
    getApps().find((a) => a.name === "autorizar-dominio") ??
    initializeApp(
      { credential: cert(cuenta), projectId: cuenta.project_id },
      "autorizar-dominio",
    );
  try {
    const { access_token: token } =
      await app.options.credential.getAccessToken();
    const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${cuenta.project_id}/config`;

    const actual = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    if (actual.error) {
      console.error(
        `No se pudo leer la configuración de ${cuenta.project_id}: ${actual.error.message}`,
      );
      return 1;
    }

    const autorizados = actual.authorizedDomains ?? [];
    console.log(`Proyecto: ${cuenta.project_id}`);
    console.log("Dominios autorizados:");
    for (const d of autorizados) console.log(`  ${d}`);
    if (listar) return 0;

    const nuevos = dominios.map(limpio).filter((d) => !autorizados.includes(d));
    if (!nuevos.length) {
      console.log("\nYa estaban todos. No se tocó nada.");
      return 0;
    }

    const respuesta = await fetch(`${url}?updateMask=authorizedDomains`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ authorizedDomains: [...autorizados, ...nuevos] }),
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok) {
      console.error(
        `\nNo se pudo autorizar: ${resultado.error?.message ?? respuesta.status}`,
      );
      console.error(
        "Si dice que falta permiso, la cuenta de servicio necesita el rol " +
          "«Firebase Authentication Admin»; también se puede añadir a mano en " +
          "la consola de Firebase → Authentication → Settings → Authorized domains.",
      );
      return 1;
    }

    console.log(`\nAñadidos: ${nuevos.join(", ")}`);
    console.log("Ahora se puede iniciar sesión desde ahí.");
    return 0;
  } finally {
    await deleteApp(app).catch(() => undefined);
  }
}

process.exitCode = await principal().catch((error) => {
  console.error(error.message);
  return 1;
});
