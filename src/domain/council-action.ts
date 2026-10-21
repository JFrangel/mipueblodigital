export function councilAction(input: Record<string, unknown>) {
  const type = input.type ?? "update";
  if (type !== "update" && type !== "visit")
    throw new Error("Tipo de actuación inválido.");
  if (type === "update") return { type: "update" as const };
  const visitDate = String(input.visitDate ?? ""),
    visitResponsible = String(input.visitResponsible ?? "").trim();
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(visitDate) ||
    new Date(`${visitDate}T12:00:00Z`).toISOString().slice(0, 10) !== visitDate
  )
    throw new Error("Indica la fecha de la visita técnica.");
  if (!visitResponsible || visitResponsible.length > 100)
    throw new Error("Indica quién realizó la visita (hasta 100 caracteres).");
  return { type: "visit" as const, visitDate, visitResponsible };
}
