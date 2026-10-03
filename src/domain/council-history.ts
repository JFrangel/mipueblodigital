import {
  councilMilestones,
  councilSources,
  type CouncilPeriod,
} from "@/content/council-history";

export type HistorySource = { label: string; issuer: string; url: string };
export type HistoryEntry = {
  id: string;
  occurredOn: string;
  time: string;
  title: string;
  account: string;
  period: CouncilPeriod;
  sources: HistorySource[];
  qualification: string;
  status: "draft" | "published" | "archived";
  version: number;
};

/** IDs derivados del contenido original: no renombrarlos al corregir un hito. */
export const historySeeds: HistoryEntry[] = councilMilestones.map((item) => ({
  id: `base-${item.date}-${item.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)}`,
  occurredOn: item.date,
  time: "",
  title: item.title,
  account: item.account,
  period: item.period,
  sources: item.sources.map((key) => ({ ...councilSources[key] })),
  qualification: item.qualification ?? "",
  status: "published",
  version: 0,
}));

export function chronological(items: readonly HistoryEntry[]) {
  const key = (item: HistoryEntry) =>
    `${`${item.occurredOn}-01-01`.slice(0, 10)}T${item.time || "00:00"}`;
  return [...items].sort(
    (a, b) => key(a).localeCompare(key(b)) || a.id.localeCompare(b.id),
  );
}

/** La versión guardada reemplaza la base incluso si está archivada o en borrador. */
export function mergeHistory(
  overrides: readonly HistoryEntry[],
  publishedOnly = false,
) {
  const entries = new Map(historySeeds.map((item) => [item.id, item]));
  overrides.forEach((item) => entries.set(item.id, item));
  return chronological(
    [...entries.values()].filter(
      (item) => !publishedOnly || item.status === "published",
    ),
  );
}

export function historyDate(item: HistoryEntry) {
  const [year, month, day] = item.occurredOn.split("-");
  if (!month) return year;
  const label = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(year), Number(month) - 1, 1)));
  return `${day ? `${Number(day)} de ` : ""}${label} de ${year}${item.time ? ` · ${item.time}` : ""}`;
}

export function validateHistory(input: unknown): Omit<HistoryEntry, "id"> {
  if (!input || typeof input !== "object")
    throw new Error("Falta el hito histórico.");
  const raw = input as Record<string, unknown>;
  const text = (value: unknown, label: string, max: number, min = 0) => {
    if (
      typeof value !== "string" ||
      value.trim().length < min ||
      value.trim().length > max
    )
      throw new Error(`${label}: revisa la longitud permitida.`);
    return value.trim();
  };
  const occurredOn = text(raw.occurredOn, "Fecha", 10, 4);
  if (
    !/^[1-9]\d{3}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/.test(
      occurredOn,
    )
  )
    throw new Error("Usa un año, mes o fecha válida.");
  if (
    occurredOn.length === 10 &&
    new Date(`${occurredOn}T12:00:00Z`).toISOString().slice(0, 10) !==
      occurredOn
  )
    throw new Error("Ese día no existe en el calendario.");
  const time = text(raw.time ?? "", "Hora", 5);
  if (
    time &&
    (occurredOn.length !== 10 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
  )
    throw new Error("La hora requiere una fecha completa y formato HH:mm.");
  if (!["origen", "territorio", "memoria"].includes(String(raw.period)))
    throw new Error("Selecciona el período.");
  if (!["draft", "published", "archived"].includes(String(raw.status)))
    throw new Error("Selecciona la visibilidad.");
  if (!Number.isSafeInteger(raw.version) || (raw.version as number) < 0)
    throw new Error("Versión inválida.");
  if (
    !Array.isArray(raw.sources) ||
    raw.sources.length < 1 ||
    raw.sources.length > 8
  )
    throw new Error("Añade entre una y ocho fuentes.");
  const sources = raw.sources.map((value: unknown) => {
    if (!value || typeof value !== "object")
      throw new Error("Fuente inválida.");
    const source = value as Record<string, unknown>;
    const url = text(source.url, "Enlace", 2000, 1);
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("El enlace de la fuente no es válido.");
    }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password)
      throw new Error("Las fuentes deben usar HTTPS sin credenciales.");
    return {
      label: text(source.label, "Nombre de fuente", 180, 1),
      issuer: text(source.issuer, "Institución", 180),
      url,
    };
  });
  return {
    occurredOn,
    time,
    title: text(raw.title, "Título", 180, 3),
    account: text(raw.account, "Descripción", 6000, 10),
    qualification: text(raw.qualification ?? "", "Aclaración", 1000),
    period: raw.period as CouncilPeriod,
    status: raw.status as HistoryEntry["status"],
    version: raw.version as number,
    sources,
  };
}
