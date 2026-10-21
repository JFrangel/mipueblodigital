/**
 * Imprime los dos manuales a PDF, con el mismo motor que el diálogo de imprimir
 * de Chrome, y los deja en `public/manuales/`.
 *
 *   npm run build
 *   npm run manuales:pdf
 *
 * **Por qué se generan aquí y no al vuelo.** Los manuales no cambian con cada
 * visita: cambian cuando alguien corrige el texto. Generarlos en el servidor
 * exigiría un Chrome dentro de cada petición, con su peso, su arranque en
 * frío y su coste; generarlos aquí, una vez, deja un archivo estático que se
 * sirve igual que el APK y que se puede mirar antes de publicarlo. Es además
 * *la misma vista* que se lee en pantalla —`src/features/manuales.tsx`, con
 * su hoja de estilos—, no una segunda versión del diseño.
 *
 * **Cómo sabe la aplicación que un PDF se quedó viejo.** Cada PDF se apunta en
 * `public/manuales/manifest.json` con la huella de lo que lo produce
 * (`scripts/manuales-huella.mjs`). Si alguien cambia el texto o la vista y no
 * vuelve a correr esto, `tests/unit/manuales.test.ts` falla.
 *
 * Por defecto levanta su propio servidor con `MPD_IMPRIMIR_MANUALES=1`, que
 * es lo que abre la ruta `/manuales/impresion/…` —no existe en producción—. Con
 * `MPD_BASE_URL` se usa uno que ya esté corriendo con esa variable.
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { extractText, getDocumentProxy } from "unpdf";
import { manualCiudadano } from "../src/content/manual-ciudadano.ts";
import { manualConsejo } from "../src/content/manual-consejo.ts";
import { huellaDeFuentes } from "./manuales-huella.mjs";

const MANUALES = ["ciudadano", "consejo"];
const DESTINO = "public/manuales";
/** Cuánto hueco al pie de una hoja justifica una figura, en milímetros. */
const HUECO_MINIMO_MM = 45;
const RE_CAPITULO = new RegExp(
  String.raw`C\s*A\s*P\s*[IÍ]\s*T\s*U\s*L\s*O`,
  "i",
);
const PUERTO = Number(process.env.MPD_MANUALES_PUERTO) || 3101;

async function esperar(base) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${base}/manuales/impresion/ciudadano/`);
      if (r.ok) return;
    } catch {
      /* Todavía arrancando. */
    }
    await new Promise((ok) => setTimeout(ok, 1000));
  }
  throw new Error(
    `El servidor de ${base} no contesta en /manuales/impresion/ciudadano/. ¿Corriste «npm run build»? Con MPD_BASE_URL, ¿lleva MPD_IMPRIMIR_MANUALES=1?`,
  );
}

async function servidorPropio() {
  // Se lanza el ejecutable de Next con el Node de este proceso, sin intérprete
  // de órdenes por en medio: así no hay un proceso hijo que quede suelto al
  // pararlo ni argumentos que escapar.
  const proceso = spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL("../node_modules/next/dist/bin/next", import.meta.url),
      ),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(PUERTO),
    ],
    {
      stdio: "ignore",
      env: { ...process.env, MPD_IMPRIMIR_MANUALES: "1" },
    },
  );
  const base = `http://127.0.0.1:${PUERTO}`;
  return {
    base,
    parar: () => {
      // Next arranca un trabajador aparte: en Windows hay que cerrar el árbol.
      if (process.platform === "win32")
        spawn("taskkill", ["/pid", String(proceso.pid), "/T", "/F"], {
          stdio: "ignore",
        });
      else proceso.kill();
    },
  };
}

const externo = process.env.MPD_BASE_URL;
const servidor = externo
  ? { base: externo.replace(/\/$/, ""), parar: () => {} }
  : await servidorPropio();

try {
  await esperar(servidor.base);
  await mkdir(DESTINO, { recursive: true });
  const navegador = await chromium.launch({ headless: true });
  const resultado = {};
  try {
    for (const id of MANUALES) {
      /**
       * Dos pasadas. En la primera se imprime el manual sin números de hoja en
       * el índice y se lee en qué hoja cae cada capítulo; en la segunda se
       * vuelve a imprimir con esos números. El índice ocupa la misma hoja con
       * o sin ellos, así que lo de la primera pasada sigue valiendo.
       */
      const imprimir = async (consulta, archivo) => {
        const pagina = await navegador.newPage();
        await pagina.goto(
          `${servidor.base}/manuales/impresion/${id}/${consulta}`,
          { waitUntil: "networkidle" },
        );
        // Sin esto el PDF puede salir con la tipografía de reserva.
        await pagina.evaluate(() => document.fonts.ready);
        const bytes = await pagina.pdf({
          path: archivo,
          preferCSSPageSize: true,
          printBackground: true,
          // Etiquetado y con marcadores: lo leen los lectores de pantalla y el
          // visor de PDF muestra el índice de capítulos.
          tagged: true,
          outline: true,
        });
        await pagina.close();
        return bytes;
      };
      const archivo = `${DESTINO}/manual-${id}.pdf`;
      const primera = await imprimir("", archivo);
      const textoPrimera = (
        await extractText(await getDocumentProxy(new Uint8Array(primera)), {
          mergePages: false,
        })
      ).text;
      // Los capítulos empiezan después de la portada y del índice.
      const inicios = [];
      for (let n = 1; ; n++) {
        // El rótulo va con las letras espaciadas (CSS) y el PDF las extrae con
        // huecos irregulares —«C A P Í T U LO 1»—: se admiten entre cada una.
        const cifras = String(n)
          .split("")
          .join(String.raw`\s*`);
        const rotulo = new RegExp(
          String.raw`C\s*A\s*P\s*[IÍ]\s*T\s*U\s*L\s*O\s*${cifras}(?!\s*\d)`,
          "i",
        );
        const hoja = textoPrimera.findIndex((t, i) => i >= 2 && rotulo.test(t));
        if (hoja < 0) {
          if (n === 1)
            throw new Error(`No encuentro el capítulo 1 de ${id} en el PDF.`);
          break;
        }
        inicios.push(hoja + 1);
      }
      /**
       * Los huecos grandes. Si un capítulo termina y deja al pie de la hoja más
       * de ${HUECO_MINIMO_MM} mm vacíos —porque el siguiente empieza arriba de la hoja
       * que viene—, se le pide una figura del tamaño del hueco. Donde el hueco
       * es pequeño no se pone nada.
       */
      const documentoPrimera = await getDocumentProxy(new Uint8Array(primera));
      const margenInferior = id === "consejo" ? 20 : 18;
      const ids = (
        id === "consejo" ? manualConsejo : manualCiudadano
      ).capitulos.map((c) => c.id);
      const rellenos = [];
      for (let h = 2; h < textoPrimera.length - 2; h++) {
        const siguiente = textoPrimera[h + 1];
        if (!RE_CAPITULO.test(siguiente.slice(0, 400))) continue;
        const pagina = await documentoPrimera.getPage(h + 1);
        const { items } = await pagina.getTextContent();
        const piePt = Math.min(...items.map((t) => t.transform[5]));
        const cuerpoPt = items
          .map((t) => t.transform[5])
          .filter((y) => y > piePt + 8);
        const bajoPt = Math.min(...cuerpoPt);
        const huecoMm = (bajoPt - margenInferior * 2.8346) / 2.8346 - 6;
        const capitulo = inicios.filter((p) => p <= h + 1).length - 1;
        if (huecoMm >= HUECO_MINIMO_MM && capitulo >= 0)
          rellenos.push(
            `${ids[capitulo]}:${Math.min(huecoMm - 6, 60).toFixed(0)}`,
          );
      }
      const bytes = await imprimir(
        `?paginas=${inicios.join(",")}&rellenos=${rellenos.join(",")}`,
        archivo,
      );
      const documento = await getDocumentProxy(new Uint8Array(bytes));
      if (documento.numPages !== textoPrimera.length)
        throw new Error(
          `Con los números en el índice, ${id} pasó de ${textoPrimera.length} a ${documento.numPages} hojas: el índice no debería mover nada.`,
        );
      resultado[id] = {
        archivo: `manual-${id}.pdf`,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        hojas: documento.numPages,
        capitulos: inicios,
      };
      console.log(
        `${id}: ${documento.numPages} hojas, ${(bytes.length / 1024).toFixed(0)} KB, capítulos en las hojas ${inicios.join(", ")}`,
      );
    }
  } finally {
    await navegador.close();
  }
  await writeFile(
    `${DESTINO}/manifest.json`,
    JSON.stringify(
      {
        generadoEn: new Date().toISOString().slice(0, 10),
        huella: huellaDeFuentes(),
        manuales: resultado,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  servidor.parar();
}
