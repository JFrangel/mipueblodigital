/**
 * Cómo está cada vereda (HU-07, HU-16).
 *
 * El mapa dice dónde ocurren las cosas; esto dice dónde se están resolviendo.
 * Son dos preguntas distintas y la segunda es la que decide a dónde va el
 * Consejo la semana entrante.
 *
 * Se ordena por casos abiertos, no por total: una vereda con veinte reportes
 * todos cerrados no necesita nada, y una con tres abiertos sí.
 */

/** Estados que dejan un caso fuera de la cola de trabajo del Consejo. */
const closed = new Set(["solucionado", "no_solucionado", "descartado"]);

export type VeredaLoad = {
  vereda: string;
  total: number;
  open: number;
  solved: number;
  /** Proporción de resueltos sobre el total, o null sin casos cerrados. */
  rate: number | null;
  escalated: number;
};

export function veredaLoad(
  items: { vereda: string; status: string }[],
): VeredaLoad[] {
  const byVereda = new Map<string, { vereda: string; status: string }[]>();
  for (const item of items) {
    const name = item.vereda?.trim();
    if (!name) continue;
    const group = byVereda.get(name);
    if (group) group.push(item);
    else byVereda.set(name, [item]);
  }
  return [...byVereda.values()]
    .map((group) => {
      const total = group.length;
      const solved = group.filter((i) => i.status === "solucionado").length;
      const settled = group.filter((i) => closed.has(i.status)).length;
      return {
        vereda: group[0].vereda.trim(),
        total,
        open: total - settled,
        solved,
        /* Sin ningún caso cerrado no hay tasa que calcular: cero resueltos de
           cero decididos no es 0 %, es que todavía no se sabe. */
        rate: settled ? solved / settled : null,
        escalated: group.filter((i) => i.status === "escalado").length,
      };
    })
    .sort(
      (a, b) =>
        b.open - a.open ||
        b.total - a.total ||
        a.vereda.localeCompare(b.vereda, "es"),
    );
}
