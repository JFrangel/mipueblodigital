import type { Aggregate } from "./aggregate";

export type Level = "riesgo" | "atencion" | "bien";
export type Alert = { id: string; level: Level; text: string };

const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

/**
 * Lo que conviene mirar de la bandeja, dicho en una línea.
 *
 * Adaptado de los «insights automáticos» del proyecto anterior, con los
 * umbrales bajados a la escala de este río: allí se asumía volumen —«más de
 * cinco críticas sin resolver», «coeficiente de variación por encima del
 * cincuenta por ciento»— y con quince expedientes esos umbrales o no saltan
 * nunca o saltan siempre.
 *
 * Tres reglas propias, que no estaban allí y aquí hacen falta:
 *
 * - Nada se dice sobre una proporción si el conjunto es diminuto. Un tercio de
 *   tres casos no es un patrón.
 * - Lo que no tiene dueño va primero. Es lo único de esta lista sobre lo que se
 *   puede actuar hoy mismo y sin reunirse.
 * - Si no hay nada que señalar, se dice. Una lista que solo aparece con malas
 *   noticias enseña a no abrirla.
 */
export function alertsFor(data: Aggregate): Alert[] {
  const found: Alert[] = [];

  if (data.unassigned > 0)
    found.push({
      id: "sin-responsable",
      level: data.unassigned >= Math.max(3, data.open / 2) ? "riesgo" : "atencion",
      text: `${data.unassigned} ${data.unassigned === 1 ? "caso abierto no tiene" : "casos abiertos no tienen"} responsable. Es lo único de esta lista que se arregla hoy mismo.`,
    });

  /* Lo más urgente que ya se pasó de su plazo. Solo el peor: una lista de
     cuatro plazos incumplidos no se lee, se ojea. */
  const late = data.sla.filter((row) => row.late > 0);
  if (late.length)
    found.push({
      id: "plazo",
      level: "riesgo",
      text: `${late[0].late} de prioridad ${late[0].priority.toLowerCase()} ${late[0].late === 1 ? "lleva" : "llevan"} más de ${dias(late[0].target)} sin cerrarse.`,
    });

  /* La proporción abierta solo dice algo con un conjunto que la sostenga. */
  if (data.total >= 8 && data.open / data.total > 0.3)
    found.push({
      id: "acumulacion",
      level: "atencion",
      text: "Más de un tercio de lo recibido sigue abierto: está entrando más de lo que se cierra.",
    });

  const vereda = data.veredaPerformance.find((row) => row.urgent > 0);
  if (vereda)
    found.push({
      id: "vereda",
      level: "riesgo",
      text: `${vereda.vereda} tiene ${vereda.urgent} ${vereda.urgent === 1 ? "caso urgente abierto" : "casos urgentes abiertos"}.`,
    });

  /* Desigualdad en los cierres. El umbral del documento original era la mitad
     de la media; con pocos casos eso salta por un solo expediente atascado, así
     que aquí tiene que pasarla entera. */
  if (data.resolution && data.resolution.deviation > data.resolution.mean)
    found.push({
      id: "desigual",
      level: "atencion",
      text: "Unos casos se cierran en días y otros tardan semanas: el tiempo de respuesta no depende del caso sino de algo más.",
    });

  const mejor = data.categoryStates.find(
    (row) => row.total >= 5 && row.solved / row.total >= 0.8,
  );
  if (mejor)
    found.push({
      id: "destacada",
      level: "bien",
      text: `${mejor.category} se cierra bien: casi todo lo recibido está resuelto. Vale la pena mirar cómo se está atendiendo.`,
    });

  if (!found.some((alert) => alert.level !== "bien"))
    found.unshift({
      id: "al-dia",
      level: "bien",
      text: data.open
        ? "Todo lo abierto tiene responsable y está dentro de su plazo."
        : "No queda nada abierto en la bandeja.",
    });

  return found;
}
