export function reportCursor(date: string, id: string) {
  return `${date}|${id}`;
}
export function parseReportCursor(value: string): [string, string] {
  const [date, id, extra] = value.split("|");
  if (
    extra !== undefined ||
    !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(date ?? "") ||
    !Number.isFinite(Date.parse(date)) ||
    !/^[a-f0-9]{64}$/.test(id ?? "")
  )
    throw new Error("Página inválida.");
  return [date, id];
}
