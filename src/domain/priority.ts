/**
 * Prioridad de gestión (HU-15). La asigna el Consejo al revisar el expediente;
 * el formulario ciudadano no la ofrece, para que nadie escale su propio caso.
 * Todo reporte entra como «media» hasta que alguien la revise.
 */
export const priorities: Record<string, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};
export const DEFAULT_PRIORITY = "media";
export const isPriority = (value: unknown): value is string =>
  typeof value === "string" && Object.hasOwn(priorities, value);
