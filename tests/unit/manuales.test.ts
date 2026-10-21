import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractText, getDocumentProxy } from "unpdf";
import { manualCiudadano } from "../../src/content/manual-ciudadano";
import { manualConsejo } from "../../src/content/manual-consejo";
import {
  etiquetasDeInterfaz,
  fechaLarga,
  palabrasDe,
  textosDe,
  type Bloque,
  type Manual,
} from "../../src/content/manuales";
import { aMarkdown } from "../../src/content/manuales-markdown";
import { huellaDeFuentes } from "../../scripts/manuales-huella.mjs";

/**
 * Los manuales de uso.
 *
 * Un manual que manda a pulsar un botón que ya no existe es peor que no
 * tenerlo: quien lo sigue concluye que la aplicación está rota, o que él no
 * sabe usarla. Por eso estas pruebas no miran sobre todo la forma sino que el
 * texto **siga siendo cierto**: cada rótulo entre «guillemets» tiene que seguir
 * escrito en la aplicación, y los PDF y el Markdown tienen que ser los de este
 * mismo contenido y no los de hace tres semanas.
 */

const MANUALES: Manual[] = [manualCiudadano, manualConsejo];

/** JSX parte los textos en líneas y mete `{" "}` entre elementos: se comparan
 *  con los espacios colapsados, como los vería quien lee la pantalla. */
const normalizar = (texto: string) =>
  texto.replaceAll('{" "}', " ").replaceAll(/\s+/g, " ");

/** Todo el código de la aplicación, menos los propios manuales: un rótulo no
 *  puede darse por existente porque lo cite el texto que lo cita. */
function corpusDeLaAplicacion(): string {
  const archivos: string[] = [];
  const recorrer = (dir: string) => {
    for (const nombre of readdirSync(dir)) {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (/\.(ts|tsx)$/.test(nombre) && !/manual(es|-)/.test(nombre))
        archivos.push(ruta);
    }
  };
  recorrer("src");
  return normalizar(archivos.map((a) => readFileSync(a, "utf8")).join("\n"));
}

describe.each(MANUALES.map((m) => [m.id, m] as const))(
  "manual %s",
  (_id, manual) => {
    it("tiene capítulos con anclas únicas, resumen y contenido", () => {
      const ids = manual.capitulos.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const c of manual.capitulos) {
        expect(c.id, c.titulo).toMatch(/^[a-z0-9-]+$/);
        expect(c.resumen.trim().length, c.titulo).toBeGreaterThan(10);
        expect(c.bloques.length, c.titulo).toBeGreaterThan(0);
        // Cada capítulo abre diciendo para qué sirve.
        expect(c.bloques[0].tipo, c.titulo).toBe("texto");
      }
      expect(manual.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("sus tablas, tarjetas, flujos y listas están completos", () => {
      const bloques: Bloque[] = manual.capitulos.flatMap((c) => c.bloques);
      for (const b of bloques) {
        if (b.tipo === "tabla")
          for (const fila of b.filas)
            expect(fila.length, fila[0]).toBe(b.columnas.length);
        if (b.tipo === "tarjetas") {
          expect(b.tarjetas.length).toBeGreaterThanOrEqual(2);
          expect(b.tarjetas.length).toBeLessThanOrEqual(4);
        }
        if (b.tipo === "flujo") {
          expect(b.etapas.length).toBeGreaterThanOrEqual(2);
          expect(b.etapas.length).toBeLessThanOrEqual(4);
        }
        if (b.tipo === "pasos") expect(b.pasos.length).toBeGreaterThan(0);
        if (b.tipo === "lista") expect(b.items.length).toBeGreaterThan(0);
        if (b.tipo === "preguntas") expect(b.items.length).toBeGreaterThan(0);
      }
    });

    it("cada rótulo de la interfaz que cita existe en la aplicación", () => {
      const corpus = corpusDeLaAplicacion();
      const faltan = etiquetasDeInterfaz(manual).filter(
        (etiqueta) => !corpus.includes(normalizar(etiqueta)),
      );
      expect(
        faltan,
        "Estos rótulos ya no están escritos en src/: corrige el manual o el rótulo",
      ).toEqual([]);
    });

    it("no lleva datos personales ni identificadores internos", () => {
      // El PDF se sirve como archivo público: aunque la página del manual del
      // Consejo solo se enlace desde su cuenta, lo escrito aquí no es secreto.
      const todo = textosDe(manual).join("\n");
      expect(todo).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      expect(todo).not.toMatch(/\b3\d{9}\b/);
      expect(todo).not.toMatch(
        /\/api\/|Firestore|firebase|process\.env|NEXT_PUBLIC|Supabase|OpenRouter|Vercel|service.?account/i,
      );
    });

    it("el Markdown de docs/ es el que sale de este contenido", () => {
      const ruta = `docs/manual-${manual.id}.md`;
      const escrito = readFileSync(ruta, "utf8").replaceAll("\r\n", "\n");
      expect(
        escrito === aMarkdown(manual, fechaLarga(manual.fecha)),
        `${ruta} está desactualizado: corre «npm run manuales:md»`,
      ).toBe(true);
    });
  },
);

it("el del ciudadano es corto y para el teléfono, el del Consejo es de trabajo", () => {
  expect(manualCiudadano.formato).toBe("A5");
  expect(manualConsejo.formato).toBe("A4");
  // Una cota amplia, para notar un manual vaciado o duplicado por error.
  expect(palabrasDe(manualCiudadano)).toBeGreaterThan(1500);
  expect(palabrasDe(manualCiudadano)).toBeLessThan(3500);
  expect(palabrasDe(manualConsejo)).toBeGreaterThan(2500);
  expect(palabrasDe(manualConsejo)).toBeLessThan(7000);
});

describe("los PDF de public/manuales", () => {
  const manifiesto = existsSync("public/manuales/manifest.json")
    ? JSON.parse(readFileSync("public/manuales/manifest.json", "utf8"))
    : null;

  it("existen y salen de lo que hoy está escrito y dibujado", () => {
    expect(
      manifiesto,
      "Faltan los PDF: corre «npm run build» y «npm run manuales:pdf»",
    ).not.toBeNull();
    expect(
      manifiesto.huella === huellaDeFuentes(),
      "Los PDF son de una versión anterior del texto o del diseño: corre «npm run manuales:pdf» y súbelos",
    ).toBe(true);
  });

  it.each(MANUALES.map((m) => [m.id, m] as const))(
    "el de %s es el archivo que dice el manifiesto, con portada, índice y sin hojas en blanco",
    async (id, manual) => {
      const ficha = manifiesto?.manuales?.[id];
      expect(ficha, `no hay ficha de ${id} en el manifiesto`).toBeTruthy();
      const bytes = readFileSync(`public/manuales/${ficha.archivo}`);
      expect(bytes.length).toBe(ficha.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        ficha.sha256,
      );
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");

      const documento = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await extractText(documento, { mergePages: false });
      expect(text.length).toBe(ficha.hojas);
      // Se lee con los espacios colapsados: un título largo se parte en renglones.
      const hojas = text.map((hoja) => hoja.replaceAll(/\s+/g, " "));
      // La portada se reconoce por su pie, no por el título: pdf.js, que es el
      // lector de esta prueba, pierde algunas «s» de las letras grandes de la
      // portada (el título y la letra manuscrita) aunque el PDF las lleva —
      // poppler y MuPDF las extraen bien—.
      expect(hojas[0]).toContain(`Actualizado el ${fechaLarga(manual.fecha)}`);
      // El índice lista todos los capítulos.
      for (const capitulo of manual.capitulos)
        expect(hojas[1], capitulo.titulo).toContain(capitulo.titulo);
      for (const [i, hoja] of text.entries())
        expect(
          hoja.trim().length,
          `la hoja ${i + 1} está en blanco`,
        ).toBeGreaterThan(40);
    },
  );
});
