/** Aviso local de una escritura confirmada; cada vista vuelve a consultar su fuente. */
export function notifyReportUpdate(id: string) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("report-updated", { detail: id }));
}
export function onReportUpdate(refresh: () => void, id?: string) {
  const listener = (event: Event) => {
    if (!id || (event as CustomEvent<string>).detail === id) refresh();
  };
  window.addEventListener("report-updated", listener);
  return () => window.removeEventListener("report-updated", listener);
}
