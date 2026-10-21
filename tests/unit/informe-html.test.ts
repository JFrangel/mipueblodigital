import { expect, it } from "vitest";
import { informeHtml, type InformeModelo } from "../../src/domain/informe-html";

/**
 * El informe que abre el navegador del sistema dentro del APK.
 *
 * Lo que importa aquí no es el adorno sino tres promesas: que nada de lo que
 * escribió una persona se cuele como HTML, que el documento no dependa de nada
 * fuera de sí mismo —la respuesta que lo entrega prohíbe pedir recursos— y que
 * quien lo abra encuentre el botón para guardarlo como PDF.
 */
const modelo = (over: Partial<InformeModelo> = {}): InformeModelo => ({
  periodo: "Todo el registro disponible",
  categoria: "Todas",
  vereda: "Todas",
  registros: 5,
  emitido: "20 de octubre de 2026",
  resumen: { total: 5, solucionados: 1, pendientes: 2, tasa: 20 },
  seguimiento: {
    abiertos: 4,
    sinResponsable: 2,
    escalados: 1,
    esperaMediana: "6 días",
    tiempoMediano: "Sin datos",
  },
  categorias: [
    { nombre: "Infraestructura", valor: 3 },
    { nombre: "Ambiente", valor: 2 },
  ],
  estados: [
    { id: "pendiente", nombre: "Pendiente", valor: 2 },
    { id: "solucionado", nombre: "Solucionado", valor: 1 },
  ],
  espera: [{ titulo: "Alumbrado en el malecón", vereda: "Bocas", dias: 12 }],
  ...over,
});

it("el texto libre no se cuela como HTML", () => {
  const html = informeHtml(
    modelo({
      espera: [
        {
          titulo: `<img src=x onerror="alert(1)"> & "comillas" 'simples'`,
          vereda: "<script>robar()</script>",
          dias: 1,
        },
      ],
      periodo: "<b>desde</b>",
    }),
  );
  expect(html).not.toContain("<img");
  expect(html).not.toContain("<script");
  expect(html).not.toContain("<b>desde</b>");
  expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  expect(html).toContain("&amp; &quot;comillas&quot; &#39;simples&#39;");
});

it("trae el botón de guardar como PDF y es lo único que ejecuta código", () => {
  const html = informeHtml(modelo());
  expect(html).toContain("Guardar como PDF");
  expect(html).toContain('onclick="window.print()"');
  // Ningún guion, ningún enlace y ninguna imagen de fuera: la respuesta que lo
  // entrega no deja pedir nada.
  expect(html).not.toMatch(/<script/i);
  expect(html).not.toMatch(/https?:\/\//);
  expect(html).not.toMatch(/<(img|link|iframe|form)\b/i);
  expect(html.match(/\sonclick=/g)).toHaveLength(1);
});

it("se imprime en A4 sin la barra del botón", () => {
  const html = informeHtml(modelo());
  expect(html).toContain("@page{size:A4");
  expect(html).toMatch(/@media print\{[^}]*\n?[^]*\.barra\{display:none\}/);
  expect(html).toContain("print-color-adjust:exact");
});

it("declara el filtro con el que salió y reparte las barras sobre el total", () => {
  const html = informeHtml(
    modelo({ categoria: "Ambiente", vereda: "Alto Satinga" }),
  );
  expect(html).toContain("Ambiente");
  expect(html).toContain("Alto Satinga");
  expect(html).toContain("20 de octubre de 2026");
  // 3 de 5 = 60 %; 2 de 5 = 40 %.
  expect(html).toContain("width:60.0%");
  expect(html).toContain("width:40.0%");
  expect(html).toContain("20%");
});

it("sin reportes no hay barras vacías con NaN, y la espera lo dice", () => {
  const html = informeHtml(
    modelo({
      registros: 0,
      resumen: { total: 0, solucionados: 0, pendientes: 0, tasa: 0 },
      categorias: [{ nombre: "Infraestructura", valor: 0 }],
      estados: [{ id: "pendiente", nombre: "Pendiente", valor: 0 }],
      espera: [],
    }),
  );
  expect(html).not.toContain("NaN");
  expect(html).toContain("width:0.0%");
  expect(html).toContain("Ningún caso abierto en este conjunto.");
});

it("el día se dice en singular cuando es uno", () => {
  const html = informeHtml(
    modelo({ espera: [{ titulo: "Caso", vereda: "Bocas", dias: 1 }] }),
  );
  expect(html).toContain("1<small>día</small>");
  expect(informeHtml(modelo())).toContain("12<small>días</small>");
});
