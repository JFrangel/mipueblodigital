/**
 * El informe del observatorio, como documento propio.
 *
 * Es lo que ve quien pide «Descargar informe» dentro del APK: el teléfono lo
 * calcula, el servidor lo guarda un momento y lo recoge el navegador del
 * sistema, que es el único que sabe imprimir y guardar un PDF (ver
 * `src/platform/export.ts`). No es una copia de la pantalla: esa depende de la
 * hoja de estilos entera de la aplicación y de sus reglas de impresión, que
 * existen para reordenar un documento que *ya está* dentro de ella. Este se
 * redacta con las mismas cifras que la pantalla ya calculó, así que es tan
 * reproducible como ella y no se rompe si alguien cambia un nombre de clase.
 *
 * **Lleva el diseño del proyecto**, dentro de lo que cabe sin red: el palafito
 * y el agua de la marca, los verdes de siempre y la filigrana de cada cifra
 * —la hoja, la corriente, el monte y el brote—, que son los mismos dibujos de
 * las tarjetas de la aplicación. No lleva tipografías ni imágenes externas: la
 * respuesta que lo entrega prohíbe pedir nada fuera de sí misma
 * (`src/app/api/statistics/export/[ticket]/route.ts`).
 *
 * **Sin la lectura de IA, a propósito.** Puede nombrar expedientes y señalar a
 * quién le falta responsable —es material de trabajo interno del Consejo— y
 * este archivo puede acabar abierto en un navegador que ya no es la ventana
 * con sesión de quien lo pidió.
 *
 * **Un solo guion, el del botón.** «Guardar como PDF» llama a `print()`. El
 * resto es HTML y CSS.
 */

export type InformeModelo = {
  periodo: string;
  categoria: string;
  vereda: string;
  registros: number;
  emitido: string;
  resumen: {
    total: number;
    solucionados: number;
    pendientes: number;
    tasa: number;
  };
  seguimiento: {
    abiertos: number;
    sinResponsable: number;
    escalados: number;
    esperaMediana: string;
    tiempoMediano: string;
  };
  categorias: { nombre: string; valor: number }[];
  estados: { id: string; nombre: string; valor: number }[];
  espera: { titulo: string; vereda: string; dias: number }[];
};

/**
 * Neutraliza texto libre antes de meterlo en una cadena de HTML.
 *
 * Aquí no hay escapado automático de React: un título de reporte con `<` o `&`
 * viajaría tal cual al navegador del sistema. Se aplica a todo lo que se
 * interpola, venga o no de un catálogo cerrado —es más barato escapar de más
 * que confiar de más—.
 */
export const esc = (value: string | number) =>
  String(value).replaceAll(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

/** Los colores del reparto por categoría: los mismos de la pantalla. */
const COLORES_CATEGORIA = [
  "#174d3d",
  "#709c75",
  "#cfad63",
  "#9bc5c7",
  "#c8d1cb",
];

/** Un estado, un color: el del texto de su insignia en la aplicación. */
const COLORES_ESTADO: Record<string, string> = {
  pendiente: "#7f8567",
  en_proceso: "#a6752b",
  solucionado: "#52754b",
  no_solucionado: "#9f6053",
  descartado: "#77736c",
  bloqueado_conflicto: "#9f6053",
  escalado: "#986e46",
};

/** El palafito de la marca: la casa sobre pilotes, con el agua por delante. */
const PALAFITO =
  '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#174f3b" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.4 15.3v2.6M13.6 15.3v2.6" opacity=".45"/><path d="M2.6 18.4c1.55-1.05 3.1-1.05 4.65 0s3.1 1.05 4.65 0 3.1-1.05 4.65 0 3.1 1.05 4.65 0"/><path d="M2.5 11.3 12 3.7l9.5 7.6M6.1 11.2v3.7M17.9 11.2v3.7M4.1 15.1h15.8M7.7 15.3v5M16.3 15.3v5"/><path d="M2.6 21c1.55-1.05 3.1-1.05 4.65 0s3.1 1.05 4.65 0 3.1-1.05 4.65 0 3.1 1.05 4.65 0"/></svg>';

/**
 * La filigrana de cada cifra: los mismos cuatro dibujos que llevan las
 * tarjetas de la pantalla (`--hoja`, `--ola`, `--monte`, `--brote` en
 * `globals.css`), cada uno con el color de lo que representa.
 */
const FILIGRANAS = [
  {
    color: "#3f9a61",
    trazo:
      "<path d='M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z'/><path d='M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12'/>",
  },
  {
    color: "#4a86b8",
    trazo:
      "<path d='M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1'/><path d='M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1'/><path d='M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1'/>",
  },
  {
    color: "#8a7a4e",
    trazo: "<path d='m8 3 4 8 5-5 5 15H2L8 3z'/>",
  },
  {
    color: "#56a86a",
    trazo:
      "<path d='M7 20h10'/><path d='M10 20c5.5-2.5.8-6.4 3-10'/><path d='M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z'/><path d='M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z'/>",
  },
];

const filigrana = (i: number) =>
  `<svg class="fili" viewBox="0 0 24 24" fill="none" stroke="${FILIGRANAS[i].color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${FILIGRANAS[i].trazo}</svg>`;

/** Una ola, de ida y vuelta, que se repite a lo ancho como fondo. */
const OLA =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='9' viewBox='0 0 32 9' fill='none' stroke='#709c75' stroke-width='1.6' stroke-linecap='round'><path d='M0 4.5c2-2.7 6-2.7 8 0s6 2.7 8 0 6-2.7 8 0 6 2.7 8 0'/></svg>",
  );

const CSS = `
:root{color-scheme:light}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#e8eee9;color:#17231d;font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,p,dl,dd,ol{margin:0}
.barra{position:sticky;top:0;z-index:5;display:flex;gap:14px;align-items:center;justify-content:space-between;padding:10px 16px;background:#174f3b;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.18)}
.barra p{font-size:12px;line-height:1.4;color:#dcebe2;max-width:46ch}
.barra button{flex:none;border:0;border-radius:11px;background:#fff;color:#174f3b;font:700 14px/1 inherit;padding:12px 18px;cursor:pointer}
.hoja{max-width:794px;margin:18px auto 32px;background:#fff;padding:28px 30px 32px;border-radius:16px;box-shadow:0 1px 4px rgba(23,35,29,.14)}
.marca{display:flex;align-items:center;gap:12px}
.sello{display:grid;place-items:center;width:46px;height:46px;border-radius:13px;background:#eaf2ec}
.marca strong{display:block;font-size:19px;line-height:1.15;letter-spacing:-.3px;color:#174f3b}
.marca small{display:block;font-size:11px;color:#55635b}
.ola{height:9px;margin:14px 0 4px;background:url("${OLA}") repeat-x left center}
h1{margin:14px 0 14px;font-size:25px;line-height:1.2;letter-spacing:-.6px;color:#174f3b}
.filtros{display:grid;grid-template-columns:repeat(5,auto);justify-content:start;gap:8px 26px}
.filtros dt{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#55635b}
.filtros dd{margin-top:2px;font-size:12px;font-weight:600}
.cifras{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:22px 0}
.cifra{position:relative;overflow:hidden;border:1px solid #d9e0da;border-radius:12px;padding:13px 13px 12px;background:#fff}
.cifra small{display:block;font-size:11px;color:#55635b}
.cifra strong{display:block;margin-top:2px;font-size:28px;line-height:1.1;letter-spacing:-.8px;color:#174f3b}
.fili{position:absolute;right:-8px;bottom:-9px;width:54px;height:54px;opacity:.17;transform:rotate(-12deg)}
section.bloque{margin:0 0 20px;break-inside:avoid}
h2{margin:0 0 10px;font-size:15px;letter-spacing:-.2px;color:#174f3b}
.seguimiento{display:grid;grid-template-columns:1fr 1fr;gap:0 28px;border:1px solid #d9e0da;border-radius:12px;padding:6px 16px}
.seguimiento div{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #edf1ed}
.seguimiento div:nth-last-child(-n+2){border-bottom:0}
.seguimiento dt{color:#55635b;font-size:12px}
.seguimiento dd{font-weight:700;white-space:nowrap}
.dos{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
.dos .bloque{margin:0;border:1px solid #d9e0da;border-radius:12px;padding:14px 16px}
.fila{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1.4fr) auto;align-items:center;gap:10px;padding:5px 0;font-size:12px}
.pista{display:block;height:9px;border-radius:999px;background:#edf1ed;overflow:hidden}
.pista i{display:block;height:100%;border-radius:999px}
.fila b{min-width:1.6em;text-align:right}
.espera{list-style:none;padding:0;border:1px solid #d9e0da;border-radius:12px;overflow:hidden}
.espera li{display:grid;grid-template-columns:64px 1fr;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid #edf1ed;break-inside:avoid}
.espera li:last-child{border-bottom:0}
.dias{display:block;text-align:center;font-size:22px;font-weight:700;line-height:1;color:#174f3b}
.dias small{display:block;margin-top:3px;font-size:9px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#55635b}
.espera strong{display:block;font-size:13px;color:#17231d}
.espera span{font-size:11px;color:#55635b}
.vacio{padding:14px;border:1px dashed #cdd6cf;border-radius:12px;color:#55635b;font-size:12px}
footer{margin-top:24px;padding-top:12px;border-top:1px solid #d9e0da;color:#55635b;font-size:10.5px;line-height:1.6}
footer p{margin:0 0 7px}
@media (max-width:620px){
  .barra{padding:9px 12px}.barra p{font-size:11px}
  .hoja{margin:0;border-radius:0;padding:20px 16px 26px;box-shadow:none}
  .filtros{grid-template-columns:repeat(2,minmax(0,1fr))}
  .cifras{grid-template-columns:repeat(2,1fr)}
  .seguimiento,.dos{grid-template-columns:1fr}
  .seguimiento div:nth-last-child(2){border-bottom:1px solid #edf1ed}
}
@page{size:A4;margin:14mm 12mm 16mm}
@media print{
  body{background:#fff;font-size:12px}
  .barra{display:none}
  .hoja{max-width:none;margin:0;padding:0;border-radius:0;box-shadow:none}
  .cifra,.fila,.espera li,.seguimiento div{break-inside:avoid}
  h2{break-after:avoid}
}
`;

const SCRIPT_IMPRIMIR = "window.print()";

/** El informe entero, listo para servirse como una página sola. */
export function informeHtml(m: InformeModelo): string {
  const porcentaje = (n: number) =>
    m.resumen.total ? (n / m.resumen.total) * 100 : 0;
  const fila = (nombre: string, valor: number, color: string) =>
    `<div class="fila"><span>${esc(nombre)}</span><span class="pista"><i style="width:${porcentaje(valor).toFixed(1)}%;background:${color}"></i></span><b>${esc(valor)}</b></div>`;
  const cifra = (i: number, rotulo: string, valor: string | number) =>
    `<article class="cifra">${filigrana(i)}<small>${esc(rotulo)}</small><strong>${esc(valor)}</strong></article>`;
  const par = (rotulo: string, valor: string | number) =>
    `<div><dt>${esc(rotulo)}</dt><dd>${esc(valor)}</dd></div>`;
  const espera = m.espera.length
    ? `<ol class="espera">${m.espera
        .map(
          (c) =>
            `<li><b class="dias">${esc(c.dias)}<small>${c.dias === 1 ? "día" : "días"}</small></b><span><strong>${esc(c.titulo)}</strong><span>${esc(c.vereda)}</span></span></li>`,
        )
        .join("")}</ol>`
    : `<p class="vacio">Ningún caso abierto en este conjunto.</p>`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Informe del observatorio comunitario</title>
<style>${CSS}</style>
</head>
<body>
<div class="barra">
<p>Para guardarlo, pulsa el botón y elige «Guardar como PDF» como impresora en el cuadro que se abre.</p>
<button type="button" onclick="${SCRIPT_IMPRIMIR}">Guardar como PDF</button>
</div>
<main class="hoja">
<header>
<div class="marca"><span class="sello">${PALAFITO}</span><span><strong>Mi Pueblo Digital</strong><small>Gran Consejo Comunitario Río Satinga · Olaya Herrera, Nariño</small></span></div>
<div class="ola" aria-hidden="true"></div>
<h1>Informe del observatorio comunitario</h1>
<dl class="filtros">
${par("Periodo", m.periodo)}
${par("Categoría", m.categoria)}
${par("Vereda", m.vereda)}
${par("Registros", m.registros)}
${par("Emitido", m.emitido)}
</dl>
</header>
<div class="cifras">
${cifra(0, "Reportes", m.resumen.total)}
${cifra(1, "Solucionados", m.resumen.solucionados)}
${cifra(2, "Pendientes", m.resumen.pendientes)}
${cifra(3, "Tasa de solución", `${m.resumen.tasa}%`)}
</div>
<section class="bloque">
<h2>Capacidad de seguimiento</h2>
<dl class="seguimiento">
${par("Casos abiertos", m.seguimiento.abiertos)}
${par("Abiertos sin responsable", m.seguimiento.sinResponsable)}
${par("Escalados a otra entidad", m.seguimiento.escalados)}
${par("Espera mediana de lo abierto", m.seguimiento.esperaMediana)}
${par("Tiempo mediano hasta solución", m.seguimiento.tiempoMediano)}
</dl>
</section>
<div class="dos">
<section class="bloque">
<h2>Incidencias por categoría</h2>
${m.categorias.map((c, i) => fila(c.nombre, c.valor, COLORES_CATEGORIA[i % COLORES_CATEGORIA.length])).join("\n")}
</section>
<section class="bloque">
<h2>Estado de la gestión</h2>
${m.estados.map((e) => fila(e.nombre, e.valor, COLORES_ESTADO[e.id] ?? "#6a776f")).join("\n")}
</section>
</div>
<section class="bloque">
<h2>Lo que lleva más esperando</h2>
${espera}
</section>
<footer>
<p>Emitido por el Gran Consejo Comunitario del Río Satinga a través de Mi Pueblo Digital. Las cifras corresponden al conjunto filtrado que se declara en la portada y se calculan de forma reproducible: el mismo filtro da el mismo informe.</p>
<p>Los reportes reflejan participación, no un censo de todos los problemas del territorio. Un dato ausente significa que nadie lo reportó, no que no exista.</p>
</footer>
</main>
</body>
</html>`;
}
