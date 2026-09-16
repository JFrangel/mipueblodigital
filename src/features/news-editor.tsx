"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { memberHeaders } from "@/data/remote-reports";
import { newsKinds, validateNews, type News } from "@/domain/news";
import { DEFAULT_NEWS_ART, newsArtCatalogue } from "@/domain/news-art";
import { NewsArt } from "@/components/news-art";
import { NewsBody } from "@/components/news-body";
import { CouncilSign } from "@/components/council-sign";
import {
  councilSayings,
  maxSayingLength,
  sayingFor,
} from "@/domain/signature";
import { newsMarks, newsOutline } from "@/domain/news-format";
import {
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Ellipsis,
  ImagePlus,
  Bold,
  Italic,
  Heading,
  List,
  Quote,
  Eye,
  PenLine,
  Shuffle,
  ArrowUpRight,
  Check,
  FilePlus2,
  RefreshCw,
} from "lucide-react";
import { prepareEvidence } from "@/platform/evidence";
import { toast } from "@/data/toasts";
/** Los comunicados de la redacción, tal como los sirve el servidor. */
async function fetchNews() {
  const { headers } = await memberHeaders();
  const response = await fetch("/api/admin/news/", {
    headers,
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "No se pudo consultar la redacción.");
  return data.items as News[];
}
const empty = (): News => ({
  id: crypto.randomUUID(),
  title: "",
  body: "",
  kind: "Boletín",
  status: "draft",
  version: 0,
  publishedAt: null,
  art: DEFAULT_NEWS_ART,
});
const labels: Record<News["status"], string> = {
  published: "Publicado",
  archived: "Archivado",
  draft: "Borrador",
};
/**
 * El botón dice lo que va a pasar, no «guardar».
 *
 * Con un único «Guardar comunicado» había que acordarse de que la visibilidad
 * de un comunicado nuevo empieza en borrador: se pulsaba guardar, el
 * comunicado quedaba bien guardado y en la comunidad no aparecía nada. El
 * botón no mentía, pero tampoco decía la verdad entera.
 *
 * Compara lo que hay guardado con la visibilidad elegida, porque no es lo
 * mismo crear que editar, ni corregir una frase que sacar de la comunidad un
 * comunicado que la gente ya estaba leyendo.
 */
function action(
  stored: News["status"] | null,
  next: News["status"],
): [string, string] {
  if (stored === next) return ["Guardar cambios", "Guardando…"];
  if (next === "published") return ["Publicar comunicado", "Publicando…"];
  if (next === "archived") return ["Archivar comunicado", "Archivando…"];
  return stored === "published"
    ? ["Retirar de la comunidad", "Retirando…"]
    : ["Guardar borrador", "Guardando…"];
}
/** Y dónde queda después, que es donde estaba la confusión. */
const results: Record<News["status"], string> = {
  published: "Ya está publicado en la comunidad.",
  draft:
    "Queda en borrador: todavía no se ve en la comunidad. Para publicarlo, cambia Visibilidad a «Publicado en comunidad».",
  archived: "Queda archivado: deja de verse en la comunidad.",
};
/** En qué se está al abrir el editor, dicho antes de tocar nada. */
const editing: Record<News["status"], string> = {
  published: "Estás editando un comunicado que la comunidad ya está viendo.",
  draft: "Estás editando un borrador. La comunidad todavía no lo ve.",
  archived: "Estás editando un comunicado archivado. La comunidad no lo ve.",
};
/** HU-14.6 y HU-21.3: el botón de guardar solo se habilita con el formulario válido. */
function complete(draft: News) {
  try {
    validateNews(draft);
    return true;
  } catch {
    return false;
  }
}
export function NewsEditor() {
  const [items, setItems] = useState<News[]>([]);
  /* La primera consulta, la que ocurre sola al abrir el panel. Aparte de
     `busy`, que es para lo que pulsa quien redacta. Empieza en cierto para no
     tocar el estado dentro del efecto. */
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<News | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [removing, setRemoving] = useState<News | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  /* Imágenes del comunicado abierto: se guardan aparte del documento, así que
     se cargan y se retiran por su cuenta. */
  const [media, setMedia] = useState<{ id: string; caption: string }[]>([]);
  const [caption, setCaption] = useState("");
  /* La portada fotográfica, si la hay: se guarda aparte del comunicado y se
     trae por la ruta del Consejo, que sí enseña la de un borrador. */
  const [cover, setCover] = useState<string | null>(null);
  /* Un comunicado nuevo todavía no existe en el servidor, así que su portada
     no tiene dónde guardarse. En vez de prohibir subirla, espera aquí y viaja
     con el primer guardado: quien redacta elige la foto cuando quiere. */
  const [pendingCover, setPendingCover] = useState<string | null>(null);
  /* Cómo estaba el comunicado al abrirlo, que no es lo mismo que la
     visibilidad elegida ahora: de la diferencia entre las dos sale lo que el
     botón promete. Nulo mientras el comunicado no exista todavía. */
  const [origin, setOrigin] = useState<News["status"] | null>(null);
  /* Vista previa: el Consejo comprueba el comunicado antes de publicarlo. */
  const [preview, setPreview] = useState(false);
  const bodyBox = useRef<HTMLTextAreaElement>(null);
  /**
   * Aplica una marca de formato a lo que el redactor tenga seleccionado.
   *
   * Se edita el texto, no un documento oculto: el cuadro sigue siendo un cuadro
   * de texto corriente, así que pegar desde WhatsApp o escribir a mano siguen
   * funcionando igual. Tras el cambio se devuelve el cursor a donde estaba,
   * porque perderlo en un comunicado de cinco mil caracteres es exasperante.
   */
  function mark(kind: "bold" | "italic" | "heading" | "item" | "quote") {
    const box = bodyBox.current;
    if (!box || !draft) return;
    const { selectionStart: from, selectionEnd: to, value } = box;
    let next: string;
    let cursor: [number, number];
    if (kind === "bold" || kind === "italic") {
      const sign = newsMarks[kind];
      const chosen = value.slice(from, to) || "texto";
      next = `${value.slice(0, from)}${sign}${chosen}${sign}${value.slice(to)}`;
      cursor = [from + sign.length, from + sign.length + chosen.length];
    } else {
      /* Las marcas de bloque van al principio de cada línea tocada. */
      const sign = newsMarks[kind];
      const start = value.lastIndexOf("\n", from - 1) + 1;
      const end = value.indexOf("\n", to);
      const stop = end === -1 ? value.length : end;
      const lines = value.slice(start, stop).split("\n");
      /* Todo el bloque en el mismo sentido: si ya estaba marcado entero se
         desmarca, y si no, se marca lo que falte. Alternar línea a línea
         dejaría media lista puesta y media quitada. */
      const marked = lines.every((line) => line.startsWith(sign));
      const block = lines
        .map((line) =>
          marked
            ? line.slice(sign.length)
            : line.startsWith(sign)
              ? line
              : sign + line,
        )
        .join("\n");
      next = value.slice(0, start) + block + value.slice(stop);
      cursor = [start, start + block.length];
    }
    if (next.length > 5000) return;
    setDraft({ ...draft, body: next });
    requestAnimationFrame(() => {
      box.focus();
      box.setSelectionRange(cursor[0], cursor[1]);
    });
  }
  /**
   * El índice que va a producir este texto.
   *
   * No se escribe: se deduce de los apartados, así que no puede quedar
   * desfasado respecto a lo que dice el comunicado. Antes solo aparecía en la
   * pantalla de lectura, y quien redactaba no sabía si sus apartados iban a
   * quedar bien hasta después de publicar.
   */
  const outline = useMemo(() => newsOutline(draft?.body ?? ""), [draft?.body]);
  /** HU-20.3: lo anclado encabeza la lista; lo demás conserva su orden. */
  const ordered = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          Number(!!b.pinned) - Number(!!a.pinned) ||
          (b.publishedAt || "").localeCompare(a.publishedAt || ""),
      ),
    [items],
  );
  async function call(path: string, init?: RequestInit) {
    const { headers } = await memberHeaders();
    const response = await fetch(path, {
      ...init,
      headers,
      signal: AbortSignal.timeout(20000),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "No se pudo completar la operación.");
    return data;
  }
  /**
   * La redacción se consulta sola al abrir el panel.
   *
   * Era el único panel del Consejo que empezaba vacío esperando un botón, y
   * una redacción vacía no se distingue de una sin comunicados: había que
   * pulsar para saber si había algo. Los demás paneles se consultan al
   * montarse; este ya también.
   */
  useEffect(() => {
    let alive = true;
    fetchNews()
      .then((list) => {
        if (alive) setItems(list);
      })
      .catch((e: unknown) => {
        if (alive)
          setError(e instanceof Error ? e.message : "Error de conexión.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  /** Volver a pedirla, por si alguien más del Consejo publicó entretanto. */
  async function load() {
    setBusy(true);
    setError("");
    try {
      const list = await fetchNews();
      setItems(list);
      setMessage(
        `Lista actualizada: ${list.length} comunicados (máximo 100).`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión.");
    } finally {
      setBusy(false);
    }
  }
  async function loadMedia(id: string) {
    try {
      const data = await call(`/api/admin/news/${id}/media/`);
      setMedia(data.items ?? []);
    } catch {
      // Sin archivo configurado el comunicado sigue siendo editable.
      setMedia([]);
    }
  }
  async function addImage(files: FileList | null) {
    const file = files?.[0];
    if (!file || !draft || busy) return;
    setBusy(true);
    setError("");
    try {
      const prepared = await prepareEvidence(file);
      await call(`/api/admin/news/${draft.id}/media/`, {
        method: "POST",
        body: JSON.stringify({
          image: prepared.dataUrl,
          caption: caption.trim(),
        }),
      });
      setCaption("");
      await loadMedia(draft.id);
      setMessage(
        prepared.reduced
          ? `Imagen añadida. Era demasiado grande y se ajustó a ${prepared.megapixels} megapíxeles.`
          : "Imagen añadida al comunicado.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo añadir la imagen.");
    } finally {
      setBusy(false);
    }
  }
  async function removeImage(mediaId: string) {
    if (!draft || busy) return;
    setBusy(true);
    try {
      await call(`/api/admin/news/${draft.id}/media/?media=${mediaId}`, {
        method: "DELETE",
      });
      await loadMedia(draft.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo retirar.");
    } finally {
      setBusy(false);
    }
  }
  async function loadCover(id: string) {
    try {
      const data = await call(`/api/admin/news/${id}/portada/`);
      setCover(data.cover ?? null);
    } catch {
      // Sin portada guardada el comunicado se edita igual.
      setCover(null);
    }
  }
  async function changeCover(file: File | null) {
    if (!file || !draft || busy) return;
    setBusy(true);
    setError("");
    try {
      const prepared = await prepareEvidence(file);
      if (draft.version === 0) {
        setPendingCover(prepared.dataUrl);
        setCover(prepared.dataUrl);
        setMessage("Portada elegida. Sube al guardar el comunicado.");
        return;
      }
      const data = await call(`/api/admin/news/${draft.id}/portada/`, {
        method: "PUT",
        body: JSON.stringify({ image: prepared.dataUrl }),
      });
      /* Se muestra la que quedó guardada, no la del teléfono: así el recorte y
         la calidad que verá la comunidad se ven aquí, antes de publicar. */
      setCover(data.image);
      /* Si una había quedado esperando —porque el guardado anterior falló a
         medias— ya no vale: manda esta, que sí está en el servidor. */
      setPendingCover(null);
      setDraft({ ...draft, cover: data.cover });
      setMessage("Portada actualizada. El lema del catálogo sigue encima.");
      toast("Portada actualizada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la portada.");
    } finally {
      setBusy(false);
    }
  }
  async function dropCover() {
    if (!draft || busy) return;
    if (pendingCover) {
      setPendingCover(null);
      setCover(null);
      setMessage("Portada descartada. Queda la del catálogo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await call(`/api/admin/news/${draft.id}/portada/`, { method: "DELETE" });
      setCover(null);
      setDraft({ ...draft, cover: null });
      setMessage("Portada retirada. El comunicado vuelve a la del catálogo.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo retirar la portada.",
      );
    } finally {
      setBusy(false);
    }
  }
  function edit(item: News) {
    setDraft(item);
    setMedia([]);
    setCaption("");
    setCover(null);
    setPendingCover(null);
    setOrigin(item.status);
    void loadMedia(item.id);
    void loadCover(item.id);
  }
  /** Guardar una publicación completa y reflejarla en la lista. */
  async function store(next: News) {
    const data: News = await call(`/api/admin/news/${next.id}/`, {
      method: "PUT",
      body: JSON.stringify(next),
    });
    setItems((current) => [data, ...current.filter((n) => n.id !== data.id)]);
    return data;
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || busy || !complete(draft)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await store(draft);
      setDraft(data);
      const guardado = `${origin ? "Cambios guardados." : "Comunicado creado."} ${results[data.status]}`;
      setOrigin(data.status);
      if (!pendingCover) {
        setMessage(guardado);
        toast(guardado);
        return;
      }
      /* Ya hay comunicado al que pertenecer: sube la portada que esperaba. */
      try {
        const subida = await call(`/api/admin/news/${data.id}/portada/`, {
          method: "PUT",
          body: JSON.stringify({ image: pendingCover }),
        });
        setPendingCover(null);
        setCover(subida.image);
        setDraft({ ...data, cover: subida.cover });
        setMessage(`${guardado} La portada quedó puesta.`);
        toast(guardado);
      } catch (e) {
        /* El comunicado sí se guardó. Decirlo entero evita la impresión de
           que se perdió todo, y la portada sigue elegida para reintentar. */
        setError(
          `${guardado} La portada no subió: ${
            e instanceof Error ? e.message : "error de conexión."
          } Vuelve a guardar para reintentarlo.`,
        );
      }
    } catch (e) {
      const dicho = e instanceof Error ? e.message : "No se pudo guardar.";
      setError(dicho);
      toast(dicho, "error");
    } finally {
      setBusy(false);
    }
  }
  /** HU-20: anclar y desanclar sin abrir el editor completo. */
  async function togglePin(item: News) {
    setMenu(null);
    setBusy(true);
    setError("");
    try {
      const data = await store({ ...item, pinned: !item.pinned });
      setMessage(
        data.pinned
          ? "Publicación anclada al inicio de las noticias."
          : "Publicación desanclada; vuelve a su orden por fecha.",
      );
    } catch (e) {
      // HU-21.6: ante un error la tarjeta permanece con su estado anterior.
      setError(e instanceof Error ? e.message : "No se pudo anclar.");
    } finally {
      setBusy(false);
    }
  }
  /** HU-21.5 y 21.6: borrado lógico confirmado; el historial queda auditado. */
  async function remove() {
    if (!removing || busy) return;
    setBusy(true);
    setError("");
    try {
      await store({ ...removing, status: "archived", pinned: false });
      setMessage(
        "Publicación retirada de la comunidad. Su historial queda auditado en el servidor.",
      );
      setRemoving(null);
      if (draft?.id === removing.id) setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setBusy(false);
    }
  }
  const feedback = (
    <>
      {error && (
        <p role="alert" className="errors">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice done">
          <Check size={15} />
          {message}
        </p>
      )}
    </>
  );
  return (
    <section className="panel newsroom">
      <span className="eyebrow">REDACCIÓN DEL CONSEJO</span>
      <h2>Noticias que llegan a tu comunidad.</h2>
      <p>
        Crea borradores, publica comunicados y archiva los que dejaron de estar
        vigentes. Solo se muestra éxito después de guardar en el servidor.
      </p>
      {/* Los dos mandos de la redacción son un par: volver a pedirla y empezar
          uno. Van con el mismo icono a la izquierda y el mismo ancho, o la
          fila queda coja. */}
      <div className="account-actions newsroom-actions">
        <button
          className="btn"
          disabled={busy || loading}
          onClick={() => void load()}
        >
          <RefreshCw size={15} /> Actualizar la lista
        </button>
        <button
          className="btn primary"
          disabled={busy || loading || !!draft}
          onClick={() => {
            setDraft(empty());
            setMedia([]);
            setCaption("");
            setCover(null);
            setPendingCover(null);
            setOrigin(null);
            setMessage("");
            setError("");
          }}
        >
          <FilePlus2 size={15} /> Nuevo comunicado
        </button>
      </div>
      {/* Con el editor abierto el aviso va abajo, junto al botón que acaba de
          pulsarse: el formulario mide varias pantallas y un «Cambios
          guardados» dibujado aquí arriba no lo ve nadie. */}
      {!draft && feedback}
      {removing && (
        <div className="notice news-confirm" role="alertdialog">
          <strong>¿Retirar «{removing.title}»?</strong>
          <p>
            Dejará de verse en la comunidad. El comunicado y su historial se
            conservan en el servidor para la auditoría del Consejo.
          </p>
          <div className="account-actions">
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? "Retirando…" : "Sí, retirar publicación"}
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {!draft && loading && <p role="status">Consultando la redacción…</p>}
      {!draft && !loading && !items.length && !error && (
        <p className="subtle-note">
          Todavía no hay comunicados. Empieza uno con «Nuevo comunicado».
        </p>
      )}
      {!draft && (
        <div className="news-editor-list">
          {ordered.map((n) => (
            <div className="news-editor-row" key={n.id}>
              <button className="account-row" onClick={() => edit(n)}>
                <span>
                  {n.title}
                  {n.pinned && <span className="tag">Anclado</span>}
                </span>
                <small>{labels[n.status]}</small>
              </button>
              {/* HU-20.1 y HU-21.1: menú de acciones por tarjeta. */}
              <div className="news-actions">
                <button
                  className="icon-button"
                  aria-label={`Acciones de ${n.title}`}
                  aria-expanded={menu === n.id}
                  disabled={busy}
                  onClick={() => setMenu(menu === n.id ? null : n.id)}
                >
                  <Ellipsis size={18} />
                </button>
                {menu === n.id && (
                  <div className="news-menu panel">
                    <button
                      className="text-button"
                      onClick={() => void togglePin(n)}
                    >
                      {n.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                      {n.pinned ? "Desanclar" : "Anclar"}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        setMenu(null);
                        edit(n);
                      }}
                    >
                      <Pencil size={16} /> Editar
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        setMenu(null);
                        setRemoving(n);
                      }}
                    >
                      <Trash2 size={16} /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {draft && (
        <form onSubmit={save}>
          <p className="editing-state">
            {origin ? <Pencil size={15} /> : <FilePlus2 size={15} />}
            <span>
              {origin
                ? editing[origin]
                : "Comunicado nuevo. Todavía no existe en el servidor."}
            </span>
            {origin && <span className="tag">{labels[origin]}</span>}
          </p>
          <label className="field-label">
            Título
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              required
              minLength={5}
              maxLength={140}
            />
          </label>
          <div className="field-label body-field">
            <div className="format-bar">
              <label htmlFor="news-body">Contenido</label>
              <div className="format-marks">
                <button
                  type="button"
                  className="icon-button"
                  title="Negrita"
                  aria-label="Poner en negrita lo seleccionado"
                  disabled={preview}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => mark("bold")}
                >
                  <Bold size={16} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title="Cursiva"
                  aria-label="Poner en cursiva lo seleccionado"
                  disabled={preview}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => mark("italic")}
                >
                  <Italic size={16} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title="Título de apartado"
                  aria-label="Convertir la línea en título de apartado"
                  disabled={preview}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => mark("heading")}
                >
                  <Heading size={16} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title="Lista"
                  aria-label="Convertir las líneas en lista"
                  disabled={preview}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => mark("item")}
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title="Cita"
                  aria-label="Convertir las líneas en cita"
                  disabled={preview}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => mark("quote")}
                >
                  <Quote size={16} />
                </button>
                <button
                  type="button"
                  className="text-button format-preview-toggle"
                  aria-pressed={preview}
                  onClick={() => setPreview(!preview)}
                >
                  {preview ? <PenLine size={15} /> : <Eye size={15} />}
                  {preview ? "Seguir escribiendo" : "Vista previa"}
                </button>
              </div>
            </div>
            {preview ? (
              <div className="bulletin-body format-preview">
                {draft.body.trim() ? (
                  <NewsBody body={draft.body} />
                ) : (
                  <p className="muted">
                    Escribe el comunicado y aquí lo verás como lo verá la
                    comunidad.
                  </p>
                )}
              </div>
            ) : (
              <textarea
                id="news-body"
                ref={bodyBox}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                required
                minLength={20}
                maxLength={5000}
                rows={9}
              />
            )}
          </div>
          <div className="format-foot">
            <small>{draft.body.length}/5000 caracteres</small>
            <small>
              Selecciona un texto y pulsa el estilo. Deja una línea en blanco
              entre apartados.
            </small>
          </div>
          {draft.body.trim() && (
            <div className="outline-preview">
              <span className="eyebrow">En este comunicado</span>
              {outline.length > 0 && (
                <ol>
                  {outline.map((section) => (
                    <li key={section.id}>{section.text}</li>
                  ))}
                </ol>
              )}
              <small className="subtle-note">
                {outline.length === 0
                  ? "Todavía no hay apartados. Marca una línea como «Título de apartado» y entrará aquí sola."
                  : outline.length < 3
                    ? `Cada línea marcada como «Título de apartado» entra aquí sola. Con ${outline.length === 1 ? "uno" : "dos"} el índice no se muestra: hacen falta tres para que valga la pena.`
                    : "Cada línea marcada como «Título de apartado» entra aquí sola. La comunidad lo verá al costado del comunicado, para saltar de un apartado a otro."}
              </small>
            </div>
          )}
          {/* Portada: el lema del catálogo, y detrás una fotografía si se
              quiere. Lo uno no quita lo otro: la foto va debajo del lema. */}
          <fieldset className="art-picker">
            <legend>Portada del comunicado</legend>
            <NewsArt art={draft.art} size={44} cover={cover} />
            <div className="art-options">
              {newsArtCatalogue.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  className="btn"
                  aria-pressed={(draft.art ?? DEFAULT_NEWS_ART) === art.id}
                  onClick={() => setDraft({ ...draft, art: art.id })}
                >
                  {art.label}
                </button>
              ))}
            </div>
            <div className="cover-photo">
              <label className="upload-box">
                <ImagePlus size={18} />
                <strong>
                  {cover
                    ? "Cambiar la fotografía"
                    : "Subir una fotografía de portada"}
                </strong>
                <input
                  aria-label="Subir la fotografía de portada"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    /* Se vacía el campo para poder volver a elegir la misma
                       fotografía si la primera vez falló. */
                    e.target.value = "";
                    void changeCover(file);
                  }}
                />
              </label>
              {cover && (
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => void dropCover()}
                >
                  <Trash2 size={14} /> Quitar la fotografía
                </button>
              )}
            </div>
            <small className="subtle-note">
              {pendingCover
                ? "La fotografía va detrás y el lema queda encima. Esta sube en cuanto guardes el comunicado."
                : "La fotografía va detrás y el lema queda encima. Se guarda reducida para que la tarjeta abra rápido con poca señal, y arriba se ve ya recortada como la verá la comunidad."}
            </small>
          </fieldset>
          {/* Firma: la frase con la que este comunicado se despide. En blanco,
              el comunicado toma una del repertorio de la comunidad. */}
          <fieldset className="art-picker sign-picker">
            <legend>Firma del comunicado</legend>
            <CouncilSign saying={draft.saying?.trim() || sayingFor(draft.id)} />
            <div className="sign-field">
              <label className="field-label">
                Frase <span className="muted">(opcional)</span>
                <input
                  value={draft.saying ?? ""}
                  list="firmas-del-consejo"
                  maxLength={maxSayingLength}
                  placeholder="Escribe la tuya o elige una"
                  onChange={(e) =>
                    setDraft({ ...draft, saying: e.target.value })
                  }
                />
              </label>
              <datalist id="firmas-del-consejo">
                {councilSayings.map((phrase) => (
                  <option key={phrase} value={phrase} />
                ))}
              </datalist>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  /* Siguiente del repertorio, para recorrerlo sin repetir. */
                  const at = councilSayings.indexOf(draft.saying?.trim() ?? "");
                  setDraft({
                    ...draft,
                    saying: councilSayings[(at + 1) % councilSayings.length],
                  });
                }}
              >
                <Shuffle size={15} /> Otra frase
              </button>
            </div>
            <small className="subtle-note">
              Aparece al pie del comunicado, escrita a mano. Si la dejas en
              blanco, el comunicado firma con una frase del repertorio de la
              comunidad.
            </small>
          </fieldset>
          <label className="field-label">
            <span>
              <input
                type="checkbox"
                checked={draft.pinned === true}
                onChange={(e) =>
                  setDraft({ ...draft, pinned: e.target.checked })
                }
              />{" "}
              Anclar al inicio de las noticias
            </span>
          </label>
          <small>
            Archivar retira el comunicado del feed y de los avisos comunitarios;
            conserva su historial de auditoría.
          </small>
          <div className="filters">
            <label className="field-label">
              Tipo
              <select
                value={draft.kind}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
              >
                {newsKinds.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Visibilidad
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    status: e.target.value as News["status"],
                  })
                }
              >
                <option value="draft">Borrador privado</option>
                <option value="published">Publicado en comunidad</option>
                <option value="archived">Archivado</option>
              </select>
            </label>
          </div>
          {/* Un comunicado puede ser largo y llevar varias imágenes; van
              aparte del documento para no toparse con su límite de tamaño. */}
          <fieldset className="news-media">
            <legend>Imágenes del comunicado · hasta 20</legend>
            <div className="news-media-list">
              {media.map((image, i) => (
                <figure key={image.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/news/${encodeURIComponent(draft.id)}/media/${image.id}/`}
                    alt={image.caption || `Imagen ${i + 1}`}
                  />
                  <figcaption>{image.caption || "Sin pie"}</figcaption>
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    onClick={() => void removeImage(image.id)}
                  >
                    <Trash2 size={14} /> Retirar
                  </button>
                </figure>
              ))}
            </div>
            <label className="field-label">
              Pie de la siguiente imagen <span className="muted">(opcional)</span>
              <input
                value={caption}
                maxLength={160}
                onChange={(e) => setCaption(e.target.value)}
              />
            </label>
            <label className="upload-box">
              <ImagePlus />
              <strong>Añadir una imagen</strong>
              <small>JPG, PNG o WebP · hasta 10 MB</small>
              <input
                aria-label="Añadir imagen al comunicado"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => void addImage(e.target.files)}
              />
            </label>
            <small className="subtle-note">
              Las imágenes se ven en la comunidad solo cuando el comunicado está
              publicado. Se guardan al añadirlas, sin esperar a Guardar.
            </small>
          </fieldset>
          {feedback}
          <div className="account-actions">
            <button className="btn primary" disabled={busy || !complete(draft)}>
              {action(origin, draft.status)[busy ? 1 : 0]}
            </button>
            {/* Publicar sin poder comprobarlo es publicar a ciegas. Se abre en
                otra pestaña a propósito: el editor se queda donde estaba y no
                hay manera de perder un cambio sin guardar por ir a mirar. */}
            {draft.status === "published" && draft.version > 0 && (
              <Link
                className="btn"
                href={`/noticia/${encodeURIComponent(draft.id)}/`}
                target="_blank"
                rel="noopener"
              >
                <ArrowUpRight size={15} /> Verlo en la comunidad
              </Link>
            )}
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "¿Cerrar el editor? Los cambios sin guardar se perderán.",
                  )
                )
                  setDraft(null);
              }}
            >
              Cerrar editor
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
