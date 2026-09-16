import { statuses, type Case } from "../data/catalog";
export type CaseChange = {
  mutationId: string;
  expectedVersion: number;
  status: string;
  assignee: string;
  note: string;
  actor: string;
  at: string;
};
export type CaseEvent = {
  id: string;
  status: string;
  assignee: string;
  note: string;
  actor: string;
  at: string;
};
export function applyCaseChange(item: Case, command: CaseChange): Case {
  if (item.events?.some((e) => e.id === command.mutationId)) return item;
  if ((item.version ?? 0) !== command.expectedVersion)
    throw new Error(
      "Este caso fue actualizado en otra sesión. Recarga el caso y revisa tus cambios.",
    );
  if (!Object.hasOwn(statuses, command.status))
    throw new Error("Estado no válido.");
  if (!command.note.trim())
    throw new Error("Escribe el motivo o la nota de seguimiento.");
  if (command.note.trim().split(/\s+/).length > 30)
    throw new Error("La nota admite hasta 30 palabras.");
  if (command.assignee.trim().length > 100)
    throw new Error("El responsable admite hasta 100 caracteres.");
  if (
    !command.mutationId ||
    !command.actor ||
    !Number.isFinite(Date.parse(command.at))
  )
    throw new Error("Operación incompleta.");
  return {
    ...item,
    status: command.status,
    assignee: command.assignee.trim(),
    version: (item.version ?? 0) + 1,
    events: [
      ...(item.events ?? []),
      {
        id: command.mutationId,
        status: command.status,
        assignee: command.assignee.trim(),
        note: command.note.trim(),
        actor: command.actor,
        at: command.at,
      },
    ],
  };
}
