export function bogotaDay(instant: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instant));
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)?.value)
    .join("-");
}
/** Month uses JavaScript's zero-based index; weeks begin Monday. */
export function monthDays(year: number, month: number): (number | null)[] {
  const first = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [
    ...Array(first).fill(null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];
}

/** Nombres de los días como los escribe la región, la semana empieza el lunes. */
export const weekdayNames = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

/**
 * Reparto de los reportes por día de la semana.
 *
 * Le dice al Consejo cuándo reporta la comunidad, que no es lo mismo que
 * cuándo ocurren las cosas: quien vive río arriba baja al pueblo ciertos días
 * y es entonces cuando hay señal para enviar. Saberlo es poder estar.
 */
export function weekdayLoad(days: string[]) {
  const counts = new Array(7).fill(0) as number[];
  for (const day of days) {
    const [year, month, date] = day.split("-").map(Number);
    if (!year || !month || !date) continue;
    /* Lunes primero, como en el calendario de arriba. */
    counts[(new Date(Date.UTC(year, month - 1, date)).getUTCDay() + 6) % 7]++;
  }
  const peak = Math.max(...counts);
  return counts.map((total, i) => ({
    name: weekdayNames[i],
    short: ["L", "M", "X", "J", "V", "S", "D"][i],
    total,
    /* Proporción respecto al día más activo, para dibujar la barra. */
    share: peak ? total / peak : 0,
  }));
}

/**
 * La fecha como se dice en voz alta, no como la guarda la base de datos.
 *
 * Abre en mayúscula porque encabeza una frase. En español solo va en mayúscula
 * la primera letra: «Domingo, 6 De Septiembre» sería un calco del inglés.
 */
export function spokenDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return day;
  const spoken = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, date)));
  return spoken.charAt(0).toLocaleUpperCase("es") + spoken.slice(1);
}
