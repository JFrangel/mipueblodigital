import type { Case } from "../data/catalog";
import { summarize } from "./logic";
import { managementMetrics, waitingCases } from "./management-metrics";
import { veredaLoad } from "./vereda-load";
import { weekdayLoad } from "./calendar";
import { bogotaDay } from "./calendar";

/**
 * Lectura del conjunto filtrado (HU-16).
 *
 * Convierte las cifras de la pantalla en frases que se pueden leer en voz alta
 * en una asamblea. Cada una sale de un cálculo reproducible: el mismo filtro da
 * la misma lectura, hoy y dentro de un año.
 *
 * Lo que aquí NO se hace es tan importante como lo que se hace. No se infieren
 * causas, no se estima gravedad, no se compara con territorios vecinos y no se
 * habla de quienes no reportaron. Una frase que el dato no sostenga no entra,
 * aunque sonara mejor: de este texto puede salir una decisión del Consejo.
 */
export type Finding = {
  /** Clave estable, para poder probar la lectura sin depender del texto. */
  id: string;
  /** Lo que se muestra al Consejo, que ya tiene acceso al expediente. */
  text: string;
  /**
   * Lo que puede salir del territorio hacia un servicio de terceros.
   *
   * Solo difiere cuando la frase nombra un expediente. El título lo escribe
   * quien reporta y puede llevar un nombre propio o un detalle sensible, así
   * que fuera de la aplicación viaja la cifra, no el título. Sin esto, pedirle
   * a un modelo que redacte el resumen sacaría del país el título de un caso
   * que quizá está marcado como sensible.
   */
  shared?: string;
};

/** Lo único que sale hacia un modelo: nunca el texto completo. */
export const shareableReading = (findings: Finding[]) =>
  findings.map((f) => f.shared ?? f.text);

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export function readStatistics(items: Case[], today = ""): Finding[] {
  const found: Finding[] = [];
  const s = summarize(items);

  if (!s.total)
    return [
      {
        id: "vacio",
        text: "No hay reportes en el conjunto seleccionado. Amplía los filtros antes de interpretar cualquier tendencia.",
      },
    ];

  found.push({
    id: "volumen",
    text: `El conjunto reúne ${plural(s.total, "reporte", "reportes")}: ${s.solved} solucionados (${s.rate} %), ${s.active} en proceso y ${s.pending} pendientes.`,
  });

  const management = managementMetrics(items, today);
  const waiting = waitingCases(items, today);

  if (management.open > 0) {
    /* «La mitad de ellos» con un solo caso abierto no es una medida, es una
       frase que delata que nadie leyó lo que sale en pantalla. */
    const espera =
      management.medianWait === null
        ? ""
        : management.open === 1
          ? ` Lleva ${plural(management.medianWait, "día", "días")} esperando.`
          : ` La mitad de ellos lleva más de ${plural(management.medianWait, "día", "días")} esperando.`;
    found.push({
      id: "cola",
      text: `${plural(management.open, "caso sigue abierto", "casos siguen abiertos")}.${espera}`,
    });
  }

  /* Con un solo caso abierto, «el que más espera» es ese mismo del que acaba
     de hablar la frase anterior: dos hallazgos para un caso. */
  const oldest = management.open > 1 ? waiting[0] : undefined;
  if (oldest)
    found.push({
      id: "mas-antiguo",
      text: `El que más espera es «${oldest.item.title}», de ${oldest.item.vereda}, con ${plural(oldest.days, "día", "días")} desde que se reportó.`,
      shared: `El caso que más espera lleva ${plural(oldest.days, "día", "días")} desde que se reportó.`,
    });

  if (management.unassigned > 0)
    found.push({
      id: "sin-responsable",
      text: `${plural(management.unassigned, "caso abierto no tiene", "casos abiertos no tienen")} responsable asignado.`,
    });

  if (management.escalated > 0)
    found.push({
      id: "escalados",
      text: `${plural(management.escalated, "caso está escalado", "casos están escalados")} a otra entidad: la respuesta ya no depende solo del Consejo.`,
    });

  /* La vereda que más espera, no la que más reporta: son cosas distintas y la
     primera es la que dice a dónde ir. */
  const load = veredaLoad(items);
  const [busiest] = load;
  /* Solo cuando hay con qué comparar: en una única vereda, decir que
     «concentra la mayor carga» es dar por hallazgo el conjunto entero. */
  if (busiest && busiest.open > 0 && load.length > 1)
    found.push({
      id: "vereda",
      text: `${busiest.vereda} concentra la mayor carga abierta, con ${plural(busiest.open, "caso", "casos")} de ${plural(busiest.total, "reportado", "reportados")} allí.`,
    });

  /* Un día destacado solo se nombra si de verdad destaca: con el reparto plano
     de un conjunto pequeño, señalar un día sería inventar un patrón. */
  const week = weekdayLoad(items.map((i) => bogotaDay(i.date)));
  const peak = week.reduce((a, b) => (b.total > a.total ? b : a));
  const rest = week.reduce((sum, d) => sum + d.total, 0) - peak.total;
  if (peak.total >= 3 && peak.total > rest / 3)
    found.push({
      id: "dia",
      text: `La comunidad reporta sobre todo los ${peak.name.toLocaleLowerCase("es")}: ${peak.total} de los ${s.total} registros.`,
    });

  found.push({
    id: "salvedad",
    text: "Estas cifras describen los registros recibidos. No demuestran causas, no miden la gravedad real y no dicen nada de quienes no reportaron.",
  });
  return found;
}
