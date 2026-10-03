"use client";
import { useEffect, useRef, useState } from "react";
import { memberHeaders } from "@/data/remote-reports";
import {
  chronological,
  historyDate,
  validateHistory,
  type HistoryEntry,
} from "@/domain/council-history";
import styles from "./council-history-editor.module.css";

const blank = (): HistoryEntry => ({
  id: crypto.randomUUID(),
  occurredOn: "",
  time: "",
  title: "",
  account: "",
  period: "memoria",
  qualification: "",
  sources: [{ label: "", issuer: "", url: "" }],
  status: "draft",
  version: 0,
});
const labels = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};
async function fetchHistory() {
  const { headers } = await memberHeaders();
  const response = await fetch("/api/admin/history/", {
    headers,
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error);
  return chronological(body.items as HistoryEntry[]);
}

export function CouncilHistoryEditor() {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [draft, setDraft] = useState<HistoryEntry | null>(null);
  const [stored, setStored] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [precision, setPrecision] = useState<"year" | "month" | "day">("year");
  const lock = useRef(false);
  const dirty = !!draft && JSON.stringify(draft) !== stored;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function load() {
    return fetchHistory()
      .then((entries) => {
        setItems(entries);
        setMessage("");
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la historia.",
        );
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    void load();
  }, []);
  function choose(item: HistoryEntry) {
    if (
      busy ||
      (dirty &&
        !window.confirm("Hay cambios sin guardar. ¿Quieres descartarlos?"))
    )
      return;
    const copy = structuredClone(item);
    setPrecision(
      item.occurredOn.length === 10
        ? "day"
        : item.occurredOn.length === 7
          ? "month"
          : "year",
    );
    setDraft(copy);
    setStored(JSON.stringify(copy));
    setMessage("");
  }
  async function save() {
    if (!draft || lock.current) return;
    try {
      validateHistory(draft);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Revisa el formulario.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const { headers } = await memberHeaders();
      const response = await fetch(`/api/admin/history/${draft.id}/`, {
        method: "PUT",
        headers,
        body: JSON.stringify(draft),
        signal: AbortSignal.timeout(20000),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setDraft(body);
      setStored(JSON.stringify(body));
      setItems((current) =>
        chronological([...current.filter((item) => item.id !== body.id), body]),
      );
      setMessage(
        body.status === "published"
          ? "Publicado en la línea de tiempo, en la fecha del hecho."
          : body.status === "archived"
            ? "Archivado: ya no aparece en la comunidad."
            : "Borrador guardado: todavía no aparece en la comunidad.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar. Tus cambios siguen en el formulario.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const patch = (value: Partial<HistoryEntry>) =>
    setDraft((current) => (current ? { ...current, ...value } : current));
  return (
    <section aria-label="Editor de historia del Consejo">
      <div className="page-intro">
        <div>
          <span className="eyebrow">MEMORIA DOCUMENTADA</span>
          <h2>Historia del Consejo</h2>
          <p>
            La fecha del hecho decide su lugar en la línea de tiempo. Añade una
            fuente para que otras personas puedan consultarla.
          </p>
        </div>
        <div className={styles.actions}>
          <button
            className="btn"
            disabled={loading || busy}
            onClick={() => choose(blank())}
          >
            Añadir hito
          </button>
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() => {
              if (
                !dirty ||
                window.confirm("¿Descartar los cambios y recargar el archivo?")
              ) {
                setDraft(null);
                setLoading(true);
                void load();
              }
            }}
          >
            Recargar archivo
          </button>
        </div>
      </div>
      {message && <p role="status">{message}</p>}
      {loading && <p role="status">Consultando el archivo…</p>}
      <div className={styles.layout}>
        <aside>
          <label className="field-label">
            Buscar hito
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Título o año…"
            />
          </label>
          <div className={styles.list}>
            {items
              .filter((item) =>
                `${item.title} ${item.occurredOn}`
                  .toLocaleLowerCase("es")
                  .includes(search.toLocaleLowerCase("es")),
              )
              .map((item) => (
                <button
                  key={item.id}
                  className={styles.item}
                  aria-pressed={draft?.id === item.id}
                  disabled={busy}
                  onClick={() => choose(item)}
                >
                  <small>
                    {historyDate(item)} · {labels[item.status]}
                  </small>
                  <strong>{item.title}</strong>
                </button>
              ))}
          </div>
        </aside>
        {draft ? (
          <form
            className={`panel ${styles.form}`}
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <fieldset
              disabled={busy}
              style={{ border: 0, padding: 0, display: "contents" }}
            >
              <label className="field-label">
                Título
                <input
                  required
                  maxLength={180}
                  value={draft.title}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </label>
              <div className={styles.row}>
                <label className="field-label">
                  ¿Qué precisión tiene la fecha?
                  <select
                    value={precision}
                    onChange={(e) => {
                      const next = e.target.value as typeof precision;
                      setPrecision(next);
                      patch({
                        occurredOn: draft.occurredOn.slice(
                          0,
                          next === "year" ? 4 : next === "month" ? 7 : 10,
                        ),
                        time: "",
                      });
                    }}
                  >
                    <option value="year">Solo conozco el año</option>
                    <option value="month">Conozco el año y el mes</option>
                    <option value="day">Conozco la fecha completa</option>
                  </select>
                </label>
                <label className="field-label">
                  Fecha del hecho
                  <input
                    required
                    aria-describedby="history-date-help"
                    type={
                      precision === "day"
                        ? "date"
                        : precision === "month"
                          ? "month"
                          : "text"
                    }
                    inputMode={precision === "year" ? "numeric" : undefined}
                    placeholder="1994"
                    value={draft.occurredOn}
                    onChange={(e) =>
                      patch({
                        occurredOn: e.target.value,
                        time: e.target.value.length === 10 ? draft.time : "",
                      })
                    }
                  />
                  <small id="history-date-help">
                    Año, año-mes o año-mes-día. No inventes una fecha más
                    precisa.
                  </small>
                </label>
                <label className="field-label">
                  Hora opcional (hora local)
                  <input
                    type="time"
                    disabled={draft.occurredOn.length !== 10}
                    value={draft.time}
                    onChange={(e) => patch({ time: e.target.value })}
                  />
                </label>
              </div>
              <label className="field-label">
                Descripción
                <textarea
                  required
                  rows={7}
                  maxLength={6000}
                  value={draft.account}
                  onChange={(e) => patch({ account: e.target.value })}
                />
              </label>
              <div className={styles.row}>
                <label className="field-label">
                  Período
                  <select
                    value={draft.period}
                    onChange={(e) =>
                      patch({
                        period: e.target.value as HistoryEntry["period"],
                      })
                    }
                  >
                    <option value="origen">Origen</option>
                    <option value="territorio">Territorio</option>
                    <option value="memoria">Memoria</option>
                  </select>
                </label>
                <label className="field-label">
                  Visibilidad
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      patch({
                        status: e.target.value as HistoryEntry["status"],
                      })
                    }
                  >
                    <option value="draft">Borrador</option>
                    <option value="published">Publicado en comunidad</option>
                    <option value="archived">Archivado</option>
                  </select>
                </label>
              </div>
              <label className="field-label">
                Aclaración documental (opcional)
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={draft.qualification}
                  onChange={(e) => patch({ qualification: e.target.value })}
                />
              </label>
              <h3>Fuentes de consulta</h3>
              {draft.sources.map((source, index) => (
                <div className={styles.source} key={index}>
                  {(
                    [
                      ["label", "Nombre del documento"],
                      ["issuer", "Institución o autor"],
                      ["url", "Enlace HTTPS"],
                    ] as const
                  ).map(([key, label]) => (
                    <label className="field-label" key={key}>
                      {label}
                      <input
                        type={key === "url" ? "url" : "text"}
                        required={key !== "issuer"}
                        maxLength={key === "url" ? 2000 : 180}
                        value={source[key]}
                        onChange={(e) =>
                          patch({
                            sources: draft.sources.map((s, at) =>
                              at === index
                                ? { ...s, [key]: e.target.value }
                                : s,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={draft.sources.length === 1}
                    onClick={() =>
                      patch({
                        sources: draft.sources.filter((_, at) => at !== index),
                      })
                    }
                  >
                    Quitar fuente {index + 1}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn secondary"
                disabled={draft.sources.length >= 8}
                onClick={() =>
                  patch({
                    sources: [
                      ...draft.sources,
                      { label: "", issuer: "", url: "" },
                    ],
                  })
                }
              >
                Añadir otra fuente
              </button>
              <div className={styles.preview}>
                <span className="eyebrow">VISTA PREVIA</span>
                <small>
                  {/^\d{4}(-\d{2}){0,2}$/.test(draft.occurredOn) &&
                  Number(draft.occurredOn.slice(5, 7) || 1) <= 12 &&
                  Number(draft.occurredOn.slice(5, 7) || 1) > 0
                    ? historyDate(draft)
                    : "Indica la fecha del hecho"}
                </small>
                <h3>{draft.title || "Título del hito"}</h3>
                <p>{draft.account || "Aquí aparecerá la descripción."}</p>
              </div>
              <button className="btn" type="submit">
                {busy
                  ? "Guardando…"
                  : draft.status === "published"
                    ? "Guardar y publicar hito"
                    : draft.status === "archived"
                      ? "Archivar hito"
                      : "Guardar borrador"}
              </button>
              <small>
                Los cambios solo quedan guardados cuando el servidor confirma.{" "}
                {dirty ? "Tienes cambios sin guardar." : ""}
              </small>
            </fieldset>
          </form>
        ) : (
          <div className="panel" style={{ padding: 24 }}>
            <h3>Elige un hito o añade uno nuevo</h3>
            <p>
              Los hitos investigados se conservan. Puedes ampliar sus fuentes,
              corregirlos o archivarlos.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
