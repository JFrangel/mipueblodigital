/* Las coordenadas son opcionales: un expediente de una vereda sin punto
   documentado no tiene ninguna, y agruparlo en el mapa no es posible. El
   agrupador los descarta en vez de situarlos en cualquier parte. */
export type Point = { id: string; lat?: number; lng?: number };
export function clusterPoints<T extends Point>(
  points: T[],
  zoom = 12,
  minimum = 5,
): { lat: number; lng: number; items: T[] }[] {
  const cell = (360 / 2 ** Math.max(0, Math.min(20, zoom))) * 0.25;
  const groups = new Map<string, { lat: number; lng: number; items: T[] }>();
  for (const point of points) {
    const { lat, lng } = point;
    /* Sin coordenadas, o con coordenadas imposibles, el punto no entra: en el
       mapa solo aparece lo que alguien situó de verdad. */
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    )
      continue;
    const key = `${Math.floor(lat / cell)}:${Math.floor(lng / cell)}`;
    const group = groups.get(key);
    if (group) {
      const n = group.items.length;
      group.lat = (group.lat * n + lat) / (n + 1);
      group.lng = (group.lng * n + lng) / (n + 1);
      group.items.push(point);
    } else groups.set(key, { lat, lng, items: [point] });
  }
  return [...groups.values()].flatMap((group) => {
    if (group.items.length >= minimum) return [group];
    const exact = new Map<string, typeof group>();
    for (const point of group.items) {
      const key = `${point.lat}:${point.lng}`;
      const existing = exact.get(key);
      if (existing) existing.items.push(point);
      /* Los puntos de este grupo ya pasaron el filtro de arriba: aquí sus
         coordenadas existen con certeza. */
      else
        exact.set(key, {
          lat: point.lat as number,
          lng: point.lng as number,
          items: [point],
        });
    }
    return [...exact.values()];
  });
}
export function pageItems<T>(items: T[], page: number, size: number): T[] {
  return items.slice((Math.max(1, page) - 1) * size, Math.max(1, page) * size);
}
export function summarize(items: { status: string }[]) {
  const total = items.length,
    solved = items.filter((i) => i.status === "solucionado").length;
  return {
    total,
    solved,
    pending: items.filter((i) => i.status === "pendiente").length,
    active: items.filter((i) => i.status === "en_proceso").length,
    rate: total ? Math.round((solved / total) * 100) : 0,
  };
}
export function explainStatistics(items: { status: string }[]): string {
  const s = summarize(items);
  return s.total
    ? `De ${s.total} reportes del conjunto filtrado, ${s.solved} están solucionados (${s.rate} %), ${s.active} en proceso y ${s.pending} pendientes. Los estados restantes representan ${s.total - s.solved - s.active - s.pending} casos. Estas cifras describen los registros; no demuestran causas ni la situación de quienes no reportan.`
    : "No hay datos para el conjunto seleccionado. Amplía los filtros antes de interpretar tendencias.";
}
export function validateReport(input: {
  category: string;
  vereda: string;
  description: string;
  photos: number;
  phone: string;
}): string[] {
  const errors: string[] = [];
  if (
    ![
      "infraestructura",
      "recursos_naturales",
      "conflictos_territoriales",
      "socioeconomicos",
      "otro",
    ].includes(input.category)
  )
    errors.push("Selecciona una categoría.");
  if (!input.vereda.trim()) errors.push("Selecciona una vereda.");
  if (!input.description.trim()) errors.push("Describe lo que ocurrió.");
  if (input.description.trim().split(/\s+/).length > 500)
    errors.push("La descripción no puede superar 500 palabras.");
  if (input.photos < 1) errors.push("Añade al menos una fotografía.");
  if (input.phone && !/^\d{1,10}$/.test(input.phone))
    errors.push("El celular debe contener hasta 10 dígitos.");
  return errors;
}
