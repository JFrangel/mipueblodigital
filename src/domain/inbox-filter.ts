import { DEFAULT_PRIORITY } from "./priority";
export function matchesInbox(
  item: Record<string, unknown>,
  params: URLSearchParams,
) {
  for (const key of ["category", "vereda", "status", "priority"]) {
    const value = params.get(key);
    if (
      value &&
      value !== "all" &&
      value !==
        String(item[key] ?? (key === "priority" ? DEFAULT_PRIORITY : ""))
    )
      return false;
  }
  const q = params.get("q")?.trim().toLowerCase();
  return (
    !q ||
    `${item.title ?? ""} ${item.description ?? ""} ${item.assignee ?? ""} ${item.id ?? ""}`
      .toLowerCase()
      .includes(q)
  );
}
