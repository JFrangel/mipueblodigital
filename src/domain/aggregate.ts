import { categories, statuses } from "@/data/catalog";
import { priorities, DEFAULT_PRIORITY } from "@/domain/priority";

/** Lo que el Consejo mira de un expediente para contar. Nada de relato. */
export type Countable = {
  status?: string;
  category?: string;
  vereda?: string;
  priority?: string;
  assignee?: string;
  sensitivity?: string;
  publication?: string;
  date?: string;
};

export type Aggregate = {
  total: number;
  states: Record<string, number>;
  categories: Record<string, number>;
  veredas: Record<string, number>;
  priorities: Record<string, number>;
  /** Expedientes abiertos sin responsable: la cifra que más duele. */
  unassigned: number;
  /** Marcados como delicados; no constan ante la comunidad. */
  sensitive: number;
  /** Abiertos, y cuánto llevan esperando. */
  open: number;
  oldestOpenDays: number;
  medianOpenDays: number;
  /** Cerrados, y cuánto tardaron. */
  closed: number;
  medianClosedDays: number;
  /** Llegados en los últimos siete y treinta días. */
  lastWeek: number;
  lastMonth: number;
  /** Verdadero si se llegó al tope de lectura y las cifras son de una muestra. */
  sampled: boolean;
  /** Cómo va cada vereda: cuánto llega, cuánto se cierra y qué queda abierto. */
  veredaPerformance: VeredaRow[];
  /** El estado de cada categoría, que es lo que dice dónde se atasca. */
  categoryStates: CategoryRow[];
  /** Lo abierto que ya pasó su plazo, por prioridad. */
  sla: SlaRow[];
  /** Cuánto se tarda en cerrar, cuando hay con qué medirlo. */
  resolution: Resolution | null;
};

export type VeredaRow = {
  vereda: string;
  total: number;
  open: number;
  solved: number;
  /** Abiertos de prioridad alta o crítica: el riesgo que no espera. */
  urgent: number;
  /** Porcentaje resuelto sobre lo recibido. */
  rate: number;
};

export type CategoryRow = {
  category: string;
  total: number;
  pending: number;
  active: number;
  solved: number;
};

export type SlaRow = {
  priority: string;
  /** Plazo acordado, en días. */
  target: number;
  open: number;
  /** Abiertos que ya lo pasaron. */
  late: number;
};

export type Resolution = {
  count: number;
  mean: number;
  median: number;
  /** Desviación típica: cuánto se parecen entre sí los tiempos de cierre. */
  deviation: number;
};

/**
 * Plazos por prioridad, en días.
 *
 * No son una promesa al ciudadano ni un contrato: son el acuerdo interno con
 * el que el Consejo mira su propia bandeja. Sirven para una sola cosa —saber
 * qué se está quedando atrás— y cambiarlos es cambiar la vara de medir, no el
 * trabajo.
 */
export const SLA_DAYS: Record<string, number> = {
  critica: 1,
  alta: 3,
  media: 7,
  baja: 30,
};

/** Media, mediana y desviación de los cierres. */
function resolutionOf(ages: number[]): Resolution | null {
  /* Con menos de cinco cierres, una media y una desviación son un accidente
     con aires de medida: se dice que todavía no hay con qué medir. */
  if (ages.length < 5) return null;
  const mean = ages.reduce((a, b) => a + b, 0) / ages.length;
  const variance =
    ages.reduce((sum, value) => sum + (value - mean) ** 2, 0) / ages.length;
  return {
    count: ages.length,
    mean: Math.round(mean),
    median: median(ages),
    deviation: Math.round(Math.sqrt(variance)),
  };
}

const CLOSED = ["solucionado", "no_solucionado", "descartado"];
const DAY = 86400000;

const days = (from: string | undefined, to: number) => {
  const start = Date.parse(from ?? "");
  return Number.isFinite(start) ? Math.max(0, (to - start) / DAY) : null;
};

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return Math.round(
    sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2,
  );
};

/**
 * Las cifras del territorio, contadas sobre expedientes reales.
 *
 * Solo cuenta: ni un relato, ni un nombre, ni un teléfono entra aquí. Es lo que
 * permite enseñárselas al Consejo y mandárselas a un modelo sin faltarle a
 * nadie.
 *
 * Se cuentan cuatro cosas que un conteo por estados no dice y que son las que
 * de verdad orientan una reunión: dónde se acumula el trabajo, qué lleva más
 * tiempo abierto, cuánto hay sin dueño y cuánto se tarda en cerrar.
 */
export function summarize(items: Countable[], now = Date.now()): Aggregate {
  const states: Record<string, number> = {};
  for (const status of Object.keys(statuses)) states[status] = 0;
  const byCategory: Record<string, number> = {};
  for (const category of categories) byCategory[category.name] = 0;
  const byPriority: Record<string, number> = {};
  for (const priority of Object.values(priorities)) byPriority[priority] = 0;
  const byVereda: Record<string, number> = {};
  const openAges: number[] = [];
  const closedAges: number[] = [];
  const byVereda2 = new Map<string, VeredaRow>();
  const byCategory2 = new Map<string, CategoryRow>();
  const sla = new Map<string, SlaRow>();
  for (const [key, target] of Object.entries(SLA_DAYS))
    sla.set(key, { priority: priorities[key] ?? key, target, open: 0, late: 0 });
  let unassigned = 0,
    sensitive = 0,
    lastWeek = 0,
    lastMonth = 0;

  for (const item of items) {
    const status = String(item.status ?? "pendiente");
    if (status in states) states[status]++;
    const category =
      categories.find((c) => c.id === item.category)?.name ?? "Otra situación";
    byCategory[category] = (byCategory[category] ?? 0) + 1;
    const vereda = item.vereda?.trim() || "Sin vereda";
    byVereda[vereda] = (byVereda[vereda] ?? 0) + 1;
    const priority =
      priorities[item.priority ?? DEFAULT_PRIORITY] ??
      priorities[DEFAULT_PRIORITY];
    byPriority[priority] = (byPriority[priority] ?? 0) + 1;
    if (item.sensitivity === "sensitive") sensitive++;
    const age = days(item.date, now);
    if (age !== null) {
      if (age <= 7) lastWeek++;
      if (age <= 30) lastMonth++;
      if (CLOSED.includes(status)) closedAges.push(age);
      else openAges.push(age);
    }
    if (!CLOSED.includes(status) && !item.assignee?.trim()) unassigned++;

    /* Lo mismo, cruzado: por vereda, por categoría y por prioridad. Un conteo
       suelto de cada dimensión dice cuánto hay; cruzarlas dice dónde se
       atasca, que es la pregunta de una reunión del Consejo. */
    const abierto = !CLOSED.includes(status);
    const clave = item.priority ?? DEFAULT_PRIORITY;
    const plazo = sla.get(clave);
    if (plazo && abierto) {
      plazo.open++;
      if (age !== null && age > plazo.target) plazo.late++;
    }
    const fila = byVereda2.get(vereda) ?? {
      vereda,
      total: 0,
      open: 0,
      solved: 0,
      urgent: 0,
      rate: 0,
    };
    fila.total++;
    if (abierto) fila.open++;
    if (status === "solucionado") fila.solved++;
    if (abierto && (clave === "alta" || clave === "critica")) fila.urgent++;
    byVereda2.set(vereda, fila);

    const ficha = byCategory2.get(category) ?? {
      category,
      total: 0,
      pending: 0,
      active: 0,
      solved: 0,
    };
    ficha.total++;
    if (status === "pendiente") ficha.pending++;
    else if (!CLOSED.includes(status)) ficha.active++;
    else if (status === "solucionado") ficha.solved++;
    byCategory2.set(category, ficha);
  }

  return {
    total: items.length,
    states,
    categories: byCategory,
    veredas: byVereda,
    priorities: byPriority,
    unassigned,
    sensitive,
    open: openAges.length,
    oldestOpenDays: openAges.length ? Math.round(Math.max(...openAges)) : 0,
    medianOpenDays: median(openAges),
    closed: closedAges.length,
    medianClosedDays: median(closedAges),
    lastWeek,
    lastMonth,
    sampled: false,
    /* Primero lo que más pesa: la vereda con más abiertos es a donde hay que
       ir, no la que más ha reportado en total. */
    veredaPerformance: [...byVereda2.values()]
      .map((row) => ({
        ...row,
        rate: row.total ? Math.round((row.solved / row.total) * 100) : 0,
      }))
      .sort((a, b) => b.open - a.open || b.total - a.total),
    categoryStates: [...byCategory2.values()].sort((a, b) => b.total - a.total),
    sla: [...sla.values()].filter((row) => row.open > 0),
    resolution: resolutionOf(closedAges.map((days) => Math.round(days))),
  };
}
