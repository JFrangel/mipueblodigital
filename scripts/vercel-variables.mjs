/**
 * Sube a Vercel las variables de entorno del servidor.
 *
 *   vercel login                                   (una vez, abre el navegador)
 *   vercel link                                    (una vez, elige el proyecto)
 *   node scripts/vercel-variables.mjs --revisar    enseña qué haría, sin tocar
 *   node scripts/vercel-variables.mjs              las sube de verdad
 *
 * Para qué existe: `.env` no se copia a Vercel —y no debe— así que hay que
 * cargar una por una en su panel. Son doce, varias de sesenta caracteres, y
 * equivocarse en un carácter produce fallos que no se parecen a «falta una
 * variable»: la aplicación compila, arranca, y se cae al primer reporte.
 *
 * **La traducción que importa.** En este equipo, Firebase se identifica con
 * `GOOGLE_APPLICATION_CREDENTIALS`, que es la *ruta a un archivo*. En Vercel no
 * hay ese archivo y no lo va a haber: allí la credencial viaja como
 * `FIREBASE_SERVICE_ACCOUNT_KEY`, con el JSON entero en Base64. Este guion hace
 * esa conversión solo. Sin ella, el despliegue compila y luego responde 503 a
 * todo lo que toque Firestore.
 *
 * Lo que no sube: nada que empiece por `NEXT_PUBLIC_FIREBASE_EMULATORS` puesto
 * en `true`, ni variables vacías, ni `NEXT_PUBLIC_DATA_MODE`, que ya no se usa.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { delimiter, join } from "node:path";
import { existsSync } from "node:fs";

/**
 * La orden de Vercel, llamada por su archivo de JavaScript.
 *
 * `vercel env add` recibe el valor por la entrada estándar, y en Windows eso no
 * sobrevive a ninguno de los dos caminos normales: lo que hay en el PATH es un
 * `.cmd`, que Node se niega a lanzar sin intérprete (EINVAL), y con intérprete
 * la entrada se pierde por el camino y la orden falla sin decir por qué.
 *
 * Así que se llama al propio `index.js` del paquete con este mismo Node. Sin
 * intermediarios, la entrada llega.
 */
function ordenVercel() {
  for (const carpeta of (process.env.PATH ?? "").split(delimiter)) {
    const entrada = join(carpeta, "node_modules", "vercel", "dist", "index.js");
    if (existsSync(entrada)) return entrada;
  }
  return null;
}
const VERCEL = ordenVercel();

/** Ejecuta la orden de Vercel pasándole `valor` por la entrada estándar. */
function vercel(args, valor) {
  if (!VERCEL)
    throw new Error(
      "No se encontró la orden de Vercel. Instálala con `npm i -g vercel`.",
    );
  return execFileSync(process.execPath, [VERCEL, ...args], {
    input: valor ?? "",
    stdio: ["pipe", "ignore", "pipe"],
    encoding: "utf-8",
  });
}

const revisar = process.argv.includes("--revisar");
const entornos = ["production", "preview", "development"];

/** Lee un `.env` sin depender de nada: clave, igual, resto de la línea. */
function leerEnv(ruta) {
  const salida = {};
  for (const linea of readFileSync(ruta, "utf-8").split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;
    const corte = limpia.indexOf("=");
    if (corte < 1) continue;
    const valor = limpia.slice(corte + 1).trim();
    salida[limpia.slice(0, corte).trim()] = valor.replace(/^["']|["']$/g, "");
  }
  return salida;
}

const env = leerEnv(".env");
const subir = {};
/** Lo que se queda fuera por no tener forma de variable de entorno. */
const sobrantes = [];
/** Las que sí suben, pero que ninguna parte del código lee hoy. */
const SIN_USO = ["SUPABASE_PUBLISHABLE_KEY", "SUPABASE_JWKS_URL"];

for (const [clave, valor] of Object.entries(env)) {
  if (!valor) continue;
  /* Una ruta del disco de este equipo no significa nada en un servidor. */
  if (clave === "GOOGLE_APPLICATION_CREDENTIALS") continue;
  /* Los emuladores son de aquí; en producción manda el proyecto de verdad. */
  if (clave === "NEXT_PUBLIC_FIREBASE_EMULATORS") {
    subir[clave] = "false";
    continue;
  }
  /* Quedó en el archivo y no la lee nadie. */
  if (clave === "NEXT_PUBLIC_DATA_MODE") continue;
  /* La clave de OpenRouter quedó guardada con un nombre sin forma de variable
     de entorno. El servidor la acepta así —hay un respaldo puesto a propósito—
     pero el filtro de abajo la descartaría por minúscula, y el despliegue se
     quedaría sin asistencia de IA sin que nadie supiera por qué. Sube con el
     nombre documentado. */
  if (clave === "apikey_openrouter") {
    subir.OPENROUTER_API_KEY ??= valor;
    continue;
  }
  /* Restos de haber pegado la configuración de Firebase dentro del `.env`:
     `measurementId`, `storageBucket`. Se reconocen por la forma —una variable
     de entorno va en mayúsculas— y no las lee nadie. */
  if (!/^[A-Z][A-Z0-9_]*$/.test(clave)) {
    sobrantes.push(clave);
    continue;
  }
  subir[clave] = valor;
}

/* La credencial de Firebase, del archivo al Base64 que espera el servidor. */
const ruta = env.GOOGLE_APPLICATION_CREDENTIALS;
if (!subir.FIREBASE_SERVICE_ACCOUNT_KEY && ruta) {
  const json = readFileSync(ruta, "utf-8");
  JSON.parse(json); // que reviente aquí y no en el servidor
  subir.FIREBASE_SERVICE_ACCOUNT_KEY = Buffer.from(json).toString("base64");
}

if (!subir.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error(
    "Sin credencial de Firebase: define GOOGLE_APPLICATION_CREDENTIALS en .env " +
      "apuntando al JSON de la cuenta de servicio, o FIREBASE_SERVICE_ACCOUNT_KEY.",
  );
  process.exitCode = 1;
} else {
  console.log(`Variables que van a Vercel (${Object.keys(subir).length}):\n`);
  for (const [clave, valor] of Object.entries(subir))
    console.log(
      `  ${clave.padEnd(34)} ${clave.startsWith("NEXT_PUBLIC_") ? valor : `··· ${valor.length} caracteres`}`,
    );

  /* El servidor acepta los dos nombres, así que preguntar solo por el canónico
     daba un aviso falso: decía que no había clave teniéndola. */
  if (!env.OPENROUTER_API_KEY && !env.apikey_openrouter)
    console.log(
      "\nAviso: sin clave de OpenRouter. La aplicación funciona igual y la " +
        "asistencia de redacción con IA sencillamente no aparece.",
    );
  if (env.apikey_openrouter && !env.OPENROUTER_API_KEY)
    console.log(
      "\nLa clave de OpenRouter está en el `.env` como `apikey_openrouter` y " +
        "sube como `OPENROUTER_API_KEY`, que es el nombre documentado. " +
        "Conviene renombrarla también en el `.env` local.",
    );
  if (sobrantes.length)
    console.log(
      `\nFuera por no ser variables de entorno: ${sobrantes.join(", ")}. ` +
        "Parecen restos de pegar la configuración de Firebase en el `.env`; " +
        "nada del código las lee.",
    );
  const inutiles = SIN_USO.filter((c) => subir[c]);
  if (inutiles.length)
    console.log(
      `\nSuben pero no las lee nadie: ${inutiles.join(", ")}. ` +
        "Se dejan por si hacen falta luego; quitarlas del `.env` tampoco rompe nada.",
    );

  if (revisar) {
    console.log("\n--revisar: no se subió nada.");
  } else {
    console.log("");
    for (const [clave, valor] of Object.entries(subir)) {
      for (const entorno of entornos) {
        try {
          vercel(["env", "rm", clave, entorno, "--yes"]);
        } catch {
          /* No estaba puesta. Es lo normal la primera vez. */
        }
        try {
          /**
           * Vercel pide clasificar cada valor, y con razón: `NEXT_PUBLIC_`
           * significa que el valor acaba dentro del JavaScript que descarga
           * cualquiera. Para la clave web de Firebase eso es lo correcto —está
           * diseñada para ser pública: identifica el proyecto, no autoriza
           * nada, y quien protege son las reglas de Firestore y la sesión—,
           * pero su detector de credenciales no puede saberlo y se planta. Se
           * le dice a mano; el resto va como secreto.
           */
          const tipo = clave.startsWith("NEXT_PUBLIC_") ? "config" : "secret";
          vercel(["env", "add", clave, entorno, "--type", tipo], valor);
        } catch (error) {
          console.error(`
  falló   ${clave} (${entorno})`);
          console.error(String(error.stderr || error.message).trim());
          process.exitCode = 1;
        }
      }
      console.log(`  puesta  ${clave}`);
    }
    console.log(
      "\nListo. El despliegue siguiente las tomará: `vercel --prod`.\n" +
        "Las que ya estaban desplegadas no cambian hasta volver a desplegar.",
    );
  }
}
