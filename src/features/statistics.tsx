"use client";
import { useMemo, useState } from "react";
import { shortId } from "@/domain/short-id";
import { AccesoNecesario } from "@/components/acceso-necesario";
import Link from "next/link";
import {
  Sparkles,
  ArrowDownToLine,
  BarChart3,
  FileText,
  CheckCircle2,
  ChevronRight,
  Clock,
  Files,
  Hourglass,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { type Case, categories, statuses, veredas } from "@/data/catalog";
import { summarize } from "@/domain/logic";
import { readStatistics } from "@/domain/reading";
import { ReadingAssistant } from "./reading-assistant";
import { csvRow } from "@/domain/csv";
import { CaseCalendar } from "./calendar";
import { bogotaDay, spokenDay } from "@/domain/calendar";
import { managementMetrics, waitingCases } from "@/domain/management-metrics";
import { useToday } from "@/data/today";
import { useSession } from "@/data/session";
import { CouncilStatistics } from "./council-statistics";
import { esNativo } from "@/platform/native";
import { abrirExportacion } from "@/platform/export";
import { toast } from "@/data/toasts";
const colors = ["#174d3d", "#709c75", "#cfad63", "#9bc5c7", "#c8d1cb"];
export function Statistics({
  items,
  partial = false,
  signed = true,
}: {
  items: Case[];
  /** Sin señal no se pudo traer lo de la comunidad: las cifras van cortas. */
  partial?: boolean;
  /** Sin sesión no hay territorio que contar: no es que valga cero. */
  signed?: boolean;
}) {
  const [category, setCategory] = useState("all"),
    [from, setFrom] = useState(""),
    [until, setUntil] = useState(""),
    [vereda, setVereda] = useState("all");
  /* Solo se usa dentro del APK: ahí exportar es un viaje al servidor y de
     vuelta antes de que el navegador del sistema tome el relevo, y ese hueco
     necesita decir «un momento» en vez de dejar el botón mudo. En el
     navegador de escritorio las dos acciones son instantáneas y esto no se
     toca. */
  const [exportando, setExportando] = useState(false);
  const selected = useMemo(
    () =>
      items.filter(
        (i) =>
          (category === "all" || i.category === category) &&
          (vereda === "all" || i.vereda === vereda) &&
          (!from || bogotaDay(i.date) >= from) &&
          (!until || bogotaDay(i.date) <= until),
      ),
    [items, category, vereda, from, until],
  );
  const today = useToday();
  /* El asistente es del Consejo. La comunidad ve las cifras y los cuadros; la
     lectura interpretada, que nombra expedientes y señala a quién le falta
     responsable, es material de trabajo interno. */
  const council = useSession().admin;
  const s = summarize(selected);
  const management = managementMetrics(selected, today);
  /* Seis caben en la tarjeta sin volverla un listado; para el resto está la
     bandeja del Consejo, que es donde se trabaja. */
  /* La lectura es un cálculo local e instantáneo, así que no se esconde tras
     un botón: esperar un clic para algo que ya está hecho es fricción. */
  const reading = useMemo(
    () => (council ? readStatistics(selected, today) : []),
    [council, selected, today],
  );
  const waiting = useMemo(
    () => waitingCases(selected, today).slice(0, 6),
    [selected, today],
  );
  const counts = categories.map((c) => ({
    ...c,
    value: selected.filter((i) => i.category === c.id).length,
  }));
  /**
   * Exportación tabular para hoja de cálculo.
   *
   * Sale con los nombres que el Consejo usa, no con las claves internas:
   * «Ambiente» y no «recursos_naturales», «En proceso» y no «en_proceso». La
   * fecha va dos veces —como se lee y en formato ISO— porque una ordena bien
   * y la otra se entiende bien, y en una sola columna no caben las dos cosas.
   */
  function exportCsv() {
    const encabezados = [
      "Código",
      "Título",
      "Categoría",
      "Estado",
      "Vereda",
      "Responsable",
      "Fecha del reporte",
      "Fecha (ISO)",
      "Días abiertos",
      "Abierto",
    ];
    const abiertos = new Map(
      waitingCases(selected, today).map((w) => [w.item.id, w.days]),
    );
    const filas = selected.map((i) => {
      const dia = bogotaDay(i.date);
      const espera = abiertos.get(i.id);
      return csvRow([
        i.id,
        i.title,
        categories.find((c) => c.id === i.category)?.name ?? i.category,
        statuses[i.status] ?? i.status,
        i.vereda,
        i.assignee?.trim() || "Sin asignar",
        spokenDay(dia),
        dia,
        /* En blanco, no cero: un caso cerrado no lleva cero días esperando. */
        espera === undefined ? "" : espera,
        espera === undefined ? "No" : "Sí",
      ]);
    });
    const csv = [csvRow(encabezados), ...filas].join("\r\n");
    /* El nombre carga el contexto: quién lo abra dentro de un año sabrá con
       qué filtro salió sin tener que preguntar. */
    const partes = [
      "mi-pueblo-reportes",
      today || "sin-fecha",
      vereda === "all" ? null : vereda.toLowerCase().replace(/[^a-z]+/g, "-"),
      category === "all" ? null : category,
    ].filter(Boolean);
    const nombre = `${partes.join("_")}.csv`;
    /**
     * Dentro del APK, `<a download>` sobre un `Blob` no descarga nada: la
     * ventana de Capacitor no tiene a quién entregarle el clic. Se manda el
     * mismo CSV, ya calculado aquí, al navegador del sistema —ver
     * `src/platform/export.ts`—, que sí sabe descargar.
     */
    if (esNativo()) {
      setExportando(true);
      /* Misma marca de orden de bytes que el camino de navegador, más abajo:
         es lo que hace que Excel lea las tildes. */
      abrirExportacion(
        "text/csv;charset=utf-8",
        nombre,
        String.fromCharCode(0xfeff) + csv,
      )
        .catch((e: unknown) =>
          toast(
            e instanceof Error ? e.message : "No se pudo exportar el CSV.",
            "error",
          ),
        )
        .finally(() => setExportando(false));
      return;
    }
    const url = URL.createObjectURL(
      /* La marca de orden de bytes es lo que hace que Excel lea las tildes. */
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }
  /**
   * Neutraliza texto libre antes de meterlo en una cadena de HTML.
   *
   * Lo que sigue arma el informe como texto, no como JSX, así que aquí no hay
   * escapado automático de React: un título de reporte con `<` o `&` viajaría
   * tal cual al navegador del sistema que abre este archivo. Se aplica a todo
   * lo que se interpola, venga o no de un catálogo cerrado —es más barato
   * escapar de más que confiar de más.
   */
  const esc = (value: string | number) =>
    String(value).replaceAll(
      /[&<>]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!,
    );
  /**
   * El informe, como documento propio, no como una copia de la pantalla.
   *
   * La primera idea era capturar el `outerHTML` de las secciones ya
   * pintadas —es lo que se ve, así que parecía lo más simple—, pero esa
   * pantalla depende de clases con nombre generado por los módulos CSS (el
   * calendario, por ejemplo) y de la hoja de estilos entera de la aplicación,
   * con su capa `.dark` y sus reglas de impresión, que existen para reordenar
   * un documento que **ya está en el DOM de la aplicación**, no uno suelto
   * que abre otro proceso: reproducirlas fuera de ese contexto es frágil, y
   * un cambio de nombre de clase en cualquier otro sitio lo rompería en
   * silencio. En vez de eso, el informe se redacta con las mismas cifras que
   * ya se calcularon arriba —`s`, `management`, `counts`, `waiting`—, así que
   * es tan reproducible como la pantalla y no depende de su marcado.
   *
   * **Sin la lectura de IA, a propósito.** Puede nombrar expedientes y
   * señalar a quién le falta responsable —es material de trabajo interno del
   * Consejo, ver el comentario de `reading` más arriba— y este archivo puede
   * acabar abierto en un navegador que ya no es la ventana con sesión de
   * quien lo pidió.
   */
  function informeHtml(): string {
    const periodo =
      from || until
        ? `${from ? spokenDay(from) : "desde el inicio"} — ${until ? spokenDay(until) : "hasta hoy"}`
        : "Todo el registro disponible";
    const nombreCategoria =
      category === "all"
        ? "Todas"
        : (categories.find((c) => c.id === category)?.name ?? category);
    const filaHtml = (celdas: (string | number)[]) =>
      `<tr>${celdas.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`;
    const categoriasFilas = counts
      .map((c) => filaHtml([c.name, c.value]))
      .join("");
    const estadosFilas = Object.entries(statuses)
      .map(([id, label]) =>
        filaHtml([label, selected.filter((i) => i.status === id).length]),
      )
      .join("");
    const esperaFilas = waiting.length
      ? waiting
          .map(({ item, days }) => filaHtml([item.title, item.vereda, days]))
          .join("")
      : `<tr><td colspan="3">Ningún caso abierto en este conjunto.</td></tr>`;
    const tiempoSolucion =
      management.medianHours === null
        ? "Sin datos"
        : `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(management.medianHours)} h`;
    const esperaAbierto =
      management.medianWait === null
        ? "—"
        : `${management.medianWait} ${management.medianWait === 1 ? "día" : "días"}`;
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Informe del observatorio comunitario</title>
<style>
:root { color-scheme: light; }
body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; color: #17231d; background: #fff; margin: 0; padding: 28px 24px; max-width: 780px; margin-inline: auto; line-height: 1.5; }
h2 { color: #174f3b; }
header.portada { border-bottom: 2px solid #174f3b; padding-bottom: 14px; margin-bottom: 20px; }
header.portada strong { display: block; font-size: 19px; }
header.portada .lugar { font-size: 11px; color: #55635b; }
h2.titulo { margin: 14px 0 12px; font-size: 22px; }
dl.meta { display: grid; grid-template-columns: repeat(2, auto); gap: 4px 30px; margin: 0 0 22px; font-size: 12px; }
dl.meta dt { text-transform: uppercase; letter-spacing: .05em; color: #55635b; font-size: 9px; }
dl.meta dd { margin: 2px 0 0; font-weight: 600; }
.metricas { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; }
.metricas div { border: 1px solid #d9e0da; border-radius: 8px; padding: 10px; }
.metricas small { display: block; color: #55635b; font-size: 10px; }
.metricas strong { font-size: 20px; }
section { margin-bottom: 22px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #e7ece6; }
footer { font-size: 11px; color: #55635b; border-top: 1px solid #d9e0da; padding-top: 12px; margin-top: 26px; }
footer p { margin: 0 0 8px; }
</style>
</head>
<body>
<header class="portada">
<strong>Mi Pueblo Digital</strong>
<span class="lugar">Gran Consejo Comunitario Río Satinga · Olaya Herrera, Nariño</span>
<h2 class="titulo">Informe del observatorio comunitario</h2>
<dl class="meta">
<div><dt>Periodo</dt><dd>${esc(periodo)}</dd></div>
<div><dt>Categoría</dt><dd>${esc(nombreCategoria)}</dd></div>
<div><dt>Vereda</dt><dd>${esc(vereda === "all" ? "Todas" : vereda)}</dd></div>
<div><dt>Registros</dt><dd>${s.total}</dd></div>
<div><dt>Emitido</dt><dd>${esc(today ? spokenDay(today) : "—")}</dd></div>
</dl>
</header>
<div class="metricas">
<div><small>Reportes</small><strong>${s.total}</strong></div>
<div><small>Solucionados</small><strong>${s.solved}</strong></div>
<div><small>Pendientes</small><strong>${s.pending}</strong></div>
<div><small>Tasa de solución</small><strong>${s.rate}%</strong></div>
</div>
<section>
<h2>Capacidad de seguimiento</h2>
<table>
${filaHtml(["Casos abiertos", management.open])}
${filaHtml(["Abiertos sin responsable", management.unassigned])}
${filaHtml(["Escalados a otra entidad", management.escalated])}
${filaHtml(["Espera mediana de lo abierto", esperaAbierto])}
${filaHtml(["Tiempo mediano hasta solución", tiempoSolucion])}
</table>
</section>
<section>
<h2>Incidencias por categoría</h2>
<table><tr><th>Categoría</th><th>Reportes</th></tr>${categoriasFilas}</table>
</section>
<section>
<h2>Estado de la gestión</h2>
<table><tr><th>Estado</th><th>Reportes</th></tr>${estadosFilas}</table>
</section>
<section>
<h2>Lo que lleva más esperando</h2>
<table><tr><th>Caso</th><th>Vereda</th><th>Días</th></tr>${esperaFilas}</table>
</section>
<footer>
<p>Emitido por el Gran Consejo Comunitario del Río Satinga a través de Mi Pueblo Digital. Las cifras corresponden al conjunto filtrado que se declara en la portada y se calculan de forma reproducible: el mismo filtro da el mismo informe.</p>
<p>Los reportes reflejan participación, no un censo de todos los problemas del territorio. Un dato ausente significa que nadie lo reportó, no que no exista.</p>
</footer>
</body>
</html>`;
  }
  /**
   * Fuera del APK, imprimir es lo de siempre: el propio navegador ya sabe.
   * Dentro, `window.print()` no hace nada —Android WebView no le conecta
   * `PrintManager`—, así que el mismo informe se manda al navegador del
   * sistema, donde «Compartir › Imprimir» sí convierte a PDF de verdad.
   */
  function exportInforme() {
    if (!esNativo()) {
      window.print();
      return;
    }
    setExportando(true);
    abrirExportacion(
      "text/html;charset=utf-8",
      `mi-pueblo-informe_${today || "sin-fecha"}.html`,
      informeHtml(),
    )
      .catch((e: unknown) =>
        toast(
          e instanceof Error ? e.message : "No se pudo abrir el informe.",
          "error",
        ),
      )
      .finally(() => setExportando(false));
  }
  /**
   * Sin sesión no se enseñan ceros.
   *
   * Los reportes del territorio son de quienes forman la comunidad, así que
   * sin entrar no llega ninguno y la pantalla mostraba «0 registros en el
   * periodo» y «Tasa de solución 0 %». Eso no es lo que pasa: lo que pasa es
   * que el sistema **no puede saberlo**, y un cero dicho con esa seguridad
   * afirma que el territorio no tiene casos abiertos.
   *
   * Es la misma regla que el inicio ya seguía —allí las cifras salen como «—»
   * y el texto invita a entrar— y la que sigue el historial de la comunidad.
   * Aquí faltaba.
   *
   * Con reportes guardados en el aparato sí se cuentan, porque existen y son de
   * quien mira; lo que se dice entonces es que son **de este teléfono**, no del
   * territorio. Esconder lo que la persona sí tiene sería el error contrario.
   */
  if (!signed && !items.length)
    return (
      <>
        <div className="page-intro">
          <div>
            <span className="eyebrow">OBSERVATORIO COMUNITARIO</span>
            <h1>Datos para cuidar mejor.</h1>
            <p>Una lectura transparente de los reportes y su seguimiento.</p>
          </div>
        </div>
        <AccesoNecesario
          icono={BarChart3}
          motivo="atarraya"
          titulo="Las cifras son de la comunidad"
          cifras={["Reportes", "Solucionados", "Espera mediana"]}
        >
          Los reportes del territorio los ve quien forma parte de la comunidad.
          Entra con tu cuenta y aquí verás cuántos hay, en qué estado están y
          cuánto se tarda en atenderlos.
        </AccesoNecesario>
      </>
    );
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">OBSERVATORIO COMUNITARIO</span>
          <h1>Datos para cuidar mejor.</h1>
          <p>Una lectura transparente de los reportes y su seguimiento.</p>
        </div>
        <div className="export-actions">
          {/* En el navegador, el informe se arma con el propio diseño de la
              pantalla y lo imprime el navegador: así funciona sin conexión y
              sin arrastrar una biblioteca de PDF de medio megabyte hasta el
              río. Dentro del APK ninguno de los dos mandos funciona así —ver
              `exportInforme`/`exportCsv`— y el estado `exportando` es la
              única señal de que el botón hizo algo mientras viaja al
              servidor y de vuelta. */}
          <button
            className="btn primary"
            onClick={exportInforme}
            disabled={exportando}
          >
            <FileText size={16} />{" "}
            {exportando ? "Preparando…" : "Descargar informe"}
          </button>
          <button
            className="text-button"
            onClick={exportCsv}
            disabled={exportando}
          >
            <ArrowDownToLine size={15} />{" "}
            {exportando ? "Preparando…" : "Datos en CSV"}
          </button>
        </div>
      </div>
      {/* Portada del informe: no existe en pantalla, solo sobre el papel. */}
      <header className="report-cover">
        <div className="report-mark">
          <strong>Mi Pueblo Digital</strong>
          <span>
            Gran Consejo Comunitario Río Satinga · Olaya Herrera, Nariño
          </span>
        </div>
        <h2>Informe del observatorio comunitario</h2>
        <dl className="report-meta">
          <div>
            <dt>Periodo</dt>
            <dd>
              {from || until
                ? `${from ? spokenDay(from) : "desde el inicio"} — ${
                    until ? spokenDay(until) : "hasta hoy"
                  }`
                : "Todo el registro disponible"}
            </dd>
          </div>
          <div>
            <dt>Categoría</dt>
            <dd>
              {category === "all"
                ? "Todas"
                : (categories.find((c) => c.id === category)?.name ?? category)}
            </dd>
          </div>
          <div>
            <dt>Vereda</dt>
            <dd>{vereda === "all" ? "Todas" : vereda}</dd>
          </div>
          <div>
            <dt>Registros</dt>
            <dd>{s.total}</dd>
          </div>
          <div>
            <dt>Emitido</dt>
            <dd>{today ? spokenDay(today) : "—"}</dd>
          </div>
        </dl>
      </header>
      <div className="filters">
        <label>
          Desde{" "}
          <input
            aria-label="Desde"
            type="date"
            value={from}
            max={until || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Hasta{" "}
          <input
            aria-label="Hasta"
            type="date"
            value={until}
            min={from || undefined}
            onChange={(e) => setUntil(e.target.value)}
          />
        </label>
        <select
          aria-label="Categoría estadística"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Vereda estadística"
          value={vereda}
          onChange={(e) => setVereda(e.target.value)}
        >
          <option value="all">Todas las veredas</option>
          {veredas.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <span className="tag">{selected.length} registros en el periodo</span>
      </div>
      {/* Una cifra que no puede ser cierta no se enseña como si lo fuera. Sin
          señal aquí solo está lo que guarda este teléfono, y un observatorio
          comunitario calculado sobre un aparato no es un observatorio. */}
      {partial ? (
        <p className="notice" role="status">
          Sin conexión. Estas cifras cuentan solo lo que guarda este teléfono,
          no el territorio entero: vuelve a abrirlas cuando haya señal.
        </p>
      ) : (
        !signed && (
          <p className="notice" role="status">
            Sin sesión. Estas cifras son solo de los reportes guardados en este
            teléfono. Entra con tu cuenta para ver los del territorio.
          </p>
        )
      )}
      {from && until && from > until && (
        <p className="errors" role="alert">
          La fecha inicial debe ser anterior o igual a la final.
        </p>
      )}
      <div className="metrics four">
        {[
          { name: "Reportes", value: s.total, Icon: Files },
          { name: "Solucionados", value: s.solved, Icon: CheckCircle2 },
          { name: "Pendientes", value: s.pending, Icon: Clock },
          { name: "Tasa de solución", value: s.rate + "%", Icon: Sparkles },
        ].map((m) => (
          <div className="metric panel" key={m.name}>
            <span className="metric-icon">
              <m.Icon size={19} />
            </span>
            <small>{m.name}</small>
            <strong>{m.value}</strong>
          </div>
        ))}
      </div>
      <div className="stats-grid">
        <section className="panel management-metrics">
          <h2>Capacidad de seguimiento</h2>
          <dl>
            <div>
              <dt>Casos abiertos</dt>
              <dd>{management.open}</dd>
            </div>
            <div>
              <dt>Abiertos sin responsable</dt>
              <dd>{management.unassigned}</dd>
            </div>
            <div>
              <dt>Escalados a otra entidad</dt>
              <dd>{management.escalated}</dd>
            </div>
            <div>
              <dt>Espera mediana de lo abierto</dt>
              <dd>
                {management.medianWait === null
                  ? "—"
                  : `${management.medianWait} ${management.medianWait === 1 ? "día" : "días"}`}
              </dd>
            </div>
            <div>
              <dt>Tiempo mediano hasta solución</dt>
              <dd>
                {management.medianHours === null
                  ? "Sin datos"
                  : `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(management.medianHours)} h`}
              </dd>
            </div>
          </dl>
          <p>
            La espera se cuenta desde que se creó el reporte hasta hoy, para los
            casos que siguen abiertos. El tiempo hasta solución va desde la
            creación hasta la última solución registrada, solo para casos
            actualmente solucionados con fecha verificable:{" "}
            {management.timedSolutions} casos. No se infieren fechas de los
            ejemplos. Todos estos indicadores respetan los filtros.
          </p>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Incidencias por categoría</h2>
            <span className="tag">{s.total} registros</span>
          </div>
          <div className="category-chart">
            <div
              className="donut"
              style={{
                background: s.total
                  ? `conic-gradient(${counts
                      .map((c, i) => {
                        const start = counts
                          .slice(0, i)
                          .reduce((sum, x) => sum + x.value, 0);
                        return `${colors[i]} ${(start / s.total) * 100}% ${((start + c.value) / s.total) * 100}%`;
                      })
                      .join(",")})`
                  : "#e8ece8",
              }}
            >
              <span>
                <strong>{s.total}</strong>
                <small>reportes</small>
              </span>
            </div>
            <div className="legend">
              {counts.map((c, i) => (
                <div key={c.id}>
                  <i
                    style={{
                      background: [
                        "#174d3d",
                        "#709c75",
                        "#cfad63",
                        "#9bc5c7",
                        "#c8d1cb",
                      ][i],
                    }}
                  />
                  <span>{c.name}</span>
                  <b>{c.value}</b>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Estado de la gestión</h2>
            <span className="muted">Estado actual</span>
          </div>
          <div className="bar-chart">
            {Object.entries(statuses).map(([id, label]) => {
              const n = selected.filter((i) => i.status === id).length;
              return (
                <div className="bar-row" key={id}>
                  <span>{label}</span>
                  <div>
                    <i
                      style={{ width: `${s.total ? (n / s.total) * 100 : 0}%` }}
                    />
                  </div>
                  <b>{n}</b>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      {/* Lo que más espera es lo que primero hay que mirar. Es la única lectura
          de esta pantalla que señala expedientes concretos en vez de cifras, y
          por eso lleva a cada uno. */}
      <section className="panel waiting-panel">
        <div className="panel-heading">
          <h2>
            <Hourglass size={19} /> Lo que lleva más esperando
          </h2>
          <span className="tag">Casos abiertos</span>
        </div>
        {!today ? (
          <p role="status">Calculando la espera…</p>
        ) : waiting.length === 0 ? (
          <p className="notice">
            Ningún caso abierto en este conjunto. Todo lo reportado tiene una
            decisión registrada.
          </p>
        ) : (
          <ol className="waiting-list">
            {waiting.map(({ item, days }) => (
              <li key={item.id}>
                <Link
                  href={`/reporte/${encodeURIComponent(item.id)}/?desde=estadisticas`}
                >
                  {/* La barra compara contra el que más lleva, no contra un
                      plazo inventado: el Consejo no tiene uno acordado. */}
                  <span
                    className="waiting-bar"
                    aria-hidden="true"
                    style={
                      {
                        "--parte": waiting[0].days ? days / waiting[0].days : 0,
                      } as React.CSSProperties
                    }
                  />
                  <b>
                    {days}
                    <small>{days === 1 ? "día" : "días"}</small>
                  </b>
                  <span className="waiting-copy">
                    <strong>{item.title}</strong>
                    <small>
                      <span title={item.id}>{shortId(item.id)}</span> ·{" "}
                      {item.vereda}
                      {item.assignee?.trim() ? "" : " · sin responsable"}
                    </small>
                  </span>
                  <Badge status={item.status} />
                  <ChevronRight size={16} className="muted" />
                </Link>
              </li>
            ))}
          </ol>
        )}
        <small className="subtle-note">
          Días enteros desde la creación del reporte. Un caso escalado sigue
          contando: la espera de la comunidad no se detiene porque el expediente
          haya cambiado de escritorio.
        </small>
      </section>
      <CaseCalendar items={selected} />
      {/* El límite de estas cifras acompaña a las cifras, no al panel del
          Consejo: quien las lee debe saber qué no dicen, sea quien sea. */}
      <p className="subtle-note stats-caveat">
        <Info size={15} /> Los reportes reflejan participación, no un censo de
        todos los problemas del territorio. Un dato ausente significa que nadie
        lo reportó, no que no exista.
      </p>
      {/* Cierre del informe: quién lo emite y con qué alcance. Va al final
          porque una salvedad al pie es lo que evita que una cifra suelta se
          lea como un censo del territorio. */}
      <footer className="report-foot">
        <p>
          Emitido por el Gran Consejo Comunitario del Río Satinga a través de Mi
          Pueblo Digital. Las cifras corresponden al conjunto filtrado que se
          declara en la portada y se calculan de forma reproducible: el mismo
          filtro da el mismo informe.
        </p>
        <p>
          Los reportes reflejan participación, no un censo de todos los
          problemas del territorio. Un dato ausente significa que nadie lo
          reportó, no que no exista.
        </p>
      </footer>
      {/* Las cifras del servidor van antes que la lectura: primero lo que hay
          en todo el territorio, después lo que puede leerse de ello. */}
      {council && <CouncilStatistics />}
      {council && (
        <section className="insight-panel">
          <div className="insight-heading">
            <span className="icon-tile">
              <Sparkles />
            </span>
            <div>
              <span className="eyebrow">ASISTENTE DE ANÁLISIS</span>
              <h2>De los números a las preguntas.</h2>
            </div>
          </div>
          <p>
            Lo que dicen las cifras del conjunto filtrado, en frases que se
            pueden leer en asamblea.
          </p>
          {/* El distintivo iba arriba, sobre el panel entero, y decía «Sin IA»
              justo encima de un recuadro rotulado «redactado con IA»: la misma
              tarjeta se desmentía a sí misma. Cada parte lleva ahora el suyo,
              donde corresponde. El detalle del cálculo está en «Ver fuentes y
              método», que para eso existe. */}
          <ul className="reading">
            {reading.map((finding) => (
              <li key={finding.id} className={`reading-${finding.id}`}>
                {finding.text}
              </li>
            ))}
          </ul>
          <p className="reading-source">
            Calculado aquí, sin ningún modelo: el mismo filtro da la misma
            lectura, hoy y dentro de un año.
          </p>
          {/* Remontar por conjunto descarta el párrafo del filtro anterior. */}
          <ReadingAssistant
            key={reading.map((f) => f.id).join("|")}
            findings={reading}
          />
          <details className="reading-method">
            <summary>Ver fuentes y método</summary>
            <p>
              Registros del conjunto:{" "}
              {selected.map((i) => i.id).join(", ") || "ninguno"}.
            </p>
            <p>
              Tasa de solución = solucionados / total × 100, redondeada al
              entero. La espera se cuenta en días enteros desde la creación del
              reporte hasta hoy, solo para casos abiertos. Un día de la semana
              solo se nombra si concentra al menos tres reportes y más del
              triple de los demás juntos; por debajo de eso, señalarlo sería
              inventar un patrón. No se infieren causas, gravedad real ni
              personas afectadas.
            </p>
          </details>
          <div className="subtle-note">
            <Info size={15} /> Los reportes reflejan participación, no un censo
            de todos los problemas del territorio.
          </div>
        </section>
      )}
    </>
  );
}
