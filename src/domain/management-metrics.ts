import type { Case } from "../data/catalog";
import { bogotaDay } from "./calendar";

const settled = ["solucionado", "no_solucionado", "descartado"];

/** Días enteros entre dos fechas del calendario, sin husos ni horas de por medio. */
function daysBetween(from: string, to: string) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.round((b - a) / 86400000));
}

const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * Cuánto lleva esperando cada caso abierto.
 *
 * El tiempo hasta solución solo existe para lo ya resuelto, así que en un
 * territorio que empieza dice «sin datos» justo cuando más falta hace saber
 * algo. Esto siempre tiene respuesta: la fecha de creación existe en todos los
 * expedientes y lo abierto es precisamente lo que el Consejo aún debe atender.
 *
 * `today` llega de fuera —el día del navegador— porque el servidor no puede
 * saber qué día es para quien mira. Sin él no se inventa nada: se devuelve null.
 */
export function waitingCases(items: Case[], today: string) {
  if (!today) return [];
  return items
    .filter((i) => !settled.includes(i.status))
    .flatMap((item) => {
      const days = daysBetween(bogotaDay(item.date), today);
      return days === null ? [] : [{ item, days }];
    })
    .sort((a, b) => b.days - a.days || a.item.id.localeCompare(b.item.id));
}

export function managementMetrics(items: Case[], today = "") {
  const open = items.filter((i) => !settled.includes(i.status));
  const waiting = waitingCases(items, today);
  const durations = items
    .filter((i) => i.status === "solucionado")
    .flatMap((i) => {
      const closed = i.events?.filter((e) => e.status === "solucionado").at(-1);
      const hours = closed
        ? (Date.parse(closed.at) - Date.parse(i.date)) / 3600000
        : NaN;
      return Number.isFinite(hours) && hours >= 0 ? [hours] : [];
    })
    .sort((a, b) => a - b);
  return {
    open: open.length,
    unassigned: open.filter((i) => !i.assignee?.trim()).length,
    escalated: items.filter((i) => i.status === "escalado").length,
    timedSolutions: durations.length,
    medianHours: median(durations),
    /* Espera mediana de lo que sigue abierto, en días. */
    medianWait: median(waiting.map((w) => w.days)),
    /* El que más lleva esperando: es el que explica la cifra de arriba. */
    longestWait: waiting[0]?.days ?? null,
  };
}
