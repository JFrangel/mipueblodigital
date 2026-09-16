"use client";
import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { type Case, statuses } from "@/data/catalog";
import { changeLocalCase, readLocalCases } from "@/data/local-store";
import { useSession } from "@/data/session";
import { toast } from "@/data/toasts";
export function AdminEditor({
  item,
  onChange,
}: {
  item: Case;
  onChange: (item: Case) => void;
}) {
  const [status, setStatus] = useState(item.status),
    [assignee, setAssignee] = useState(item.assignee ?? ""),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const lock = useRef(false);
  /* Quién firma el cambio. Decía «Administrador de demo», que era de cuando la
     aplicación se enseñaba sin cuentas: el historial quedaba firmado por
     nadie, y un historial sin autor no sirve para lo que existe. */
  const session = useSession();
  const actor =
    session.name.trim() ||
    session.email.trim() ||
    "Sin sesión en este dispositivo";
  const words = note.trim() ? note.trim().split(/\s+/).length : 0;
  async function refresh() {
    try {
      const latest = (await readLocalCases(session.uid)).find(
        (c) => c.id === item.id,
      );
      if (latest) {
        onChange(latest);
        setStatus(latest.status);
        setAssignee(latest.assignee ?? "");
        setError(
          "Versión actual cargada. Conservamos tu nota: revisa estado y responsable antes de guardar.",
        );
      }
    } catch {
      setError("No se pudo recuperar la versión actual. Tu nota sigue aquí.");
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const updated = await changeLocalCase(item, {
        mutationId: crypto.randomUUID(),
        expectedVersion: item.version ?? 0,
        status,
        assignee,
        note,
        actor,
        at: new Date().toISOString(),
      });
      onChange(updated);
      setNote("");
      setSaved(true);
      toast("Cambio guardado en este dispositivo.");
    } catch (e) {
      const dicho = e instanceof Error ? e.message : "No se pudo guardar.";
      setError(dicho);
      toast(dicho, "error");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="admin-editor">
      <h3>Gestionar este reporte</h3>
      {/* No es una prueba: es una anotación de trabajo que no sale de este
          aparato. Llamarla «prueba local» en producción hacía dudar de si la
          aplicación entera lo era. */}
      <p className="notice">
        Lo que anotes aquí se queda en este dispositivo y no lo ve nadie más. No
        es una actuación del Consejo: para eso está su panel, que escribe en el
        servidor y deja constancia.
      </p>
      <label className="field-label">
        Nuevo estado
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {Object.entries(statuses).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Responsable
        <input
          maxLength={100}
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          placeholder="Equipo o persona encargada"
        />
      </label>
      <label className="field-label">
        Nota de seguimiento
        <textarea
          required
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Describe la actuación o el motivo del cambio."
        />
        <small>
          {words} / 30 palabras · queda en el seguimiento de este dispositivo
        </small>
      </label>
      {error && (
        <p role="alert" className="errors">
          {error}
        </p>
      )}
      {error.includes("actualizado") && (
        <button type="button" className="btn" onClick={refresh}>
          Cargar versión actual y conservar nota
        </button>
      )}
      {saved && (
        <p role="status" className="notice done">
          <Check size={15} />
          Cambio guardado en este dispositivo.
        </p>
      )}
      <button
        className="btn primary"
        disabled={busy || words > 30}
        type="submit"
      >
        {busy ? "Guardando…" : "Guardar gestión local"}
      </button>
    </form>
  );
}
