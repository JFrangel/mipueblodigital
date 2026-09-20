"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { memberHeaders } from "@/data/remote-reports";
import { useSession } from "@/data/session";
import { statuses, categories, shortDate } from "@/data/catalog";
import { veredaNames } from "@/domain/territory";
import { priorities, DEFAULT_PRIORITY } from "@/domain/priority";
import { autoPublicationReady } from "@/domain/publication";
import { relativeTime } from "@/domain/relative-time";
import { toast } from "@/data/toasts";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FileText,
  MapPin,
  Search,
  UserRound,
  Phone,
  Eye,
  Trash2,
} from "lucide-react";
import { Badge, CategoryIcon } from "@/components/ui";
/* La ficha de un expediente es la misma en los dos sitios, así que comparten
   hoja: quien la leyó en su reporte la reconoce aquí sin aprenderla otra vez. */
import styles from "./report-detail.module.css";
import { PrivateEvidence } from "./private-evidence";
import { MiniaturaExpediente } from "./miniatura-expediente";
import { RemoteHistory } from "./remote-history";
import type { Case } from "@/data/catalog";
import { deliveryLabel, deliveryOf } from "@/domain/delivery";
import { shortId } from "@/domain/short-id";
type Incident = {
  id: string;
  title: string;
  description: string;
  vereda: string;
  category: string;
  status: string;
  priority?: string;
  version: number;
  sensitivity: string;
  publication: string;
  assignee?: string;
  date?: string;
  /* Llegan del servidor —la bandeja del Consejo recibe el documento entero—
     pero hasta ahora no se declaraban, y por tanto no se enseñaban. */
  phone?: string;
  lat?: number | null;
  lng?: number | null;
};
const ALL = "all";
/** Expedientes por página. Los mismos que en el resto de listados. */
const PER_PAGE = 10;
/** El resumen público admite treinta palabras: se propone el principio del
 *  relato y quien revisa lo ajusta. */
function firstWords(text: string, limit: number) {
  const words = text.trim().split(/\s+/);
  return words.length <= limit
    ? text.trim()
    : `${words.slice(0, limit).join(" ")}…`;
}
/**
 * Qué ve la comunidad de este expediente, ahora mismo.
 *
 * Es lo primero que conviene saber antes de tocar un caso —si ya está a la
 * vista de todo el mundo o todavía no—, y hasta ahora había que deducirlo de
 * dos desplegables del formulario y de una regla de horas que no se ve por
 * ninguna parte.
 */
function visibility(item: Incident, delay: number) {
  if (item.sensitivity === "sensitive")
    return "No consta: marcado como delicado";
  if (item.publication === "published") return "Ve el resumen del Consejo";
  if (!item.date) return "Sin fecha de recepción";
  if (autoPublicationReady(item.date, item.sensitivity, Date.now(), delay))
    return "Consta con lo que escribió quien reportó";
  const opens = new Date(Date.parse(item.date) + delay * 3600000);
  return `Constará el ${shortDate(opens.toISOString())}`;
}
/**
 * Lo que impide compartir el resumen, si algo lo impide.
 *
 * Lo comprueba el servidor, que es quien manda. Aquí se comprueba antes para
 * no dejar redactar un título, un resumen y una vereda públicos y rechazarlo
 * todo al pulsar guardar: el cambio entero se perdía por una condición que ya
 * se sabía de antemano.
 */
function blocked(sensitivity: string) {
  return sensitivity === "safe"
    ? null
    : "Para compartir el resumen, la revisión de sensibilidad de arriba tiene que quedar en «Revisado · sin contenido sensible».";
}
const blankNotes = {
  publicNote: "",
  internalNote: "",
  publicTitle: "",
  publicSummary: "",
  publicVereda: "",
};
/**
 * Los expedientes del Consejo, y lo que este dispositivo todavía no ha soltado.
 *
 * Eran dos pestañas y parecían la misma: dos listas de reportes, con filtros y
 * un estado al canto. La diferencia —una escribe en el servidor con versión y
 * auditoría, la otra no sale de este navegador— no se veía por ninguna parte.
 *
 * Ahora es una sola pantalla. De lo guardado aquí solo entra lo que **nunca
 * llegó**: lo que sí llegó ya está arriba como expediente, y listarlo dos
 * veces era la mitad de la confusión.
 */
/**
 * Retirar un expediente, diciendo por qué.
 *
 * El Consejo no tenía cómo quitar un reporte. Un duplicado, uno hecho por
 * error, uno que no es del territorio: la única salida era cerrarlo con un
 * estado, que dice otra cosa, y mientras tanto seguía contando en el mapa, en
 * las cifras y ante la comunidad.
 *
 * Retirar borra el expediente de verdad, así que el motivo no es un trámite:
 * es lo único que le queda a quien reportó para saber qué pasó con lo suyo, y
 * le llega tal como se escriba aquí. Por eso se escribe antes de confirmar y no
 * después, y por eso el botón dice lo que hace.
 */
function Retract({
  id,
  title,
  onRemoved,
}: {
  id: string;
  title: string;
  onRemoved: (message: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [problem, setProblem] = useState("");
  const short = reason.trim().length < 10;
  async function remove() {
    if (busy || short) return;
    setBusy(true);
    setProblem("");
    try {
      const { headers } = await memberHeaders();
      const response = await fetch(`/api/admin/incidents/${id}/retirada/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          mutationId: crypto.randomUUID(),
          reason: reason.trim(),
        }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onRemoved(
        data.complete
          ? "Reporte retirado. Quien lo envió recibe el motivo en sus novedades, y queda el acta de la retirada."
          : "Reporte retirado de las listas, pero quedó algo sin borrar —la fotografía o el historial—. Vuelve a intentarlo para terminar.",
      );
    } catch (error) {
      const dicho =
        error instanceof Error
          ? `No se retiró: ${error.message}`
          : "No se retiró. Revisa la conexión y vuelve a intentarlo.";
      setProblem(dicho);
      toast(dicho, "error");
      setBusy(false);
    }
  }
  if (!open)
    return (
      <div className="council-retract">
        <button
          type="button"
          className="text-button"
          onClick={() => setOpen(true)}
        >
          <Trash2 size={15} /> Retirar este reporte
        </button>
      </div>
    );
  return (
    <div className="council-retract open" role="group">
      <h4>
        <Trash2 size={16} /> Retirar «{title}»
      </h4>
      <p>
        El expediente se borra: sale de la bandeja, del mapa, de las cifras y de
        lo que ve la comunidad, y con él su fotografía. No se puede deshacer.
        Queda el acta —quién lo retiró, cuándo y por qué—, y el motivo que
        escribas le llega a quien lo reportó tal cual.
      </p>
      <label>
        Motivo de la retirada
        <textarea
          rows={3}
          maxLength={600}
          value={reason}
          disabled={busy}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Por ejemplo: está repetido con el expediente del muelle enviado el mismo día."
        />
      </label>
      {problem && (
        <p className="errors" role="alert">
          {problem}
        </p>
      )}
      <div className="account-actions">
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setReason("");
            setProblem("");
          }}
        >
          Conservar el reporte
        </button>
        <button
          type="button"
          className="btn danger"
          disabled={busy || short}
          onClick={remove}
        >
          <Trash2 size={16} />{" "}
          {busy ? "Retirando…" : "Retirar y avisar a quien reportó"}
        </button>
      </div>
      {short && (
        <small className="subtle-note">
          Escribe el motivo: es lo que va a leer quien envió el reporte.
        </small>
      )}
    </div>
  );
}
export function CouncilInbox({
  pending = [],
  focus = "",
}: {
  pending?: Case[];
  /** Expediente que un aviso pidió abrir; entra como búsqueda. */
  focus?: string;
}) {
  const session = useSession();
  const [items, setItems] = useState<Incident[]>([]),
    [selected, setSelected] = useState<Incident | null>(null),
    [cursor, setCursor] = useState<string | null>(null),
    /* Arranca ocupada: la bandeja se pide sola al montar. */
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState(""),
    /* Aparte de la confirmación: lo que salió mal se dibujaba en la misma
       caja verde que lo que salió bien, y entonces no hay manera de saber si
       se guardó o no. */
    [problem, setProblem] = useState(""),
    /* Las horas de gracia, tal como las tiene puestas el servidor. */
    [delay, setDelay] = useState(24);
  const [notes, setNotes] = useState(blankNotes);
  /** HU-15.2: cuatro filtros independientes sobre el conjunto cargado. */
  const [category, setCategory] = useState(ALL),
    [vereda, setVereda] = useState(ALL),
    [priority, setPriority] = useState(ALL),
    [status, setStatus] = useState(ALL);
  /* Buscar por texto sobre lo cargado. La bandeja no lo tenía y la vista de
     este dispositivo sí, y buscar un expediente por su título es lo primero
     que se intenta cuando la lista pasa de una pantalla. */
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  /* Ajustar el estado durante el renderizado al cambiar la propiedad, que es
     lo que React recomienda para esto: en un efecto llegaría un fotograma
     tarde, y la bandeja parpadearía con la lista entera antes de filtrar. */
  const [lastFocus, setLastFocus] = useState(focus);
  if (focus !== lastFocus) {
    setLastFocus(focus);
    /* Se abre el expediente, no se deja buscado: quien pulsa «Ver el
       expediente» en un aviso quiere el expediente, no un buscador con su
       número dentro y una fila que todavía hay que pulsar. */
    const found = items.find((item) => item.id === focus);
    setQuery(found ? "" : focus);
    setPage(1);
    /* Si aún no ha llegado en ninguna tanda se deja buscado, y el mensaje de
       la lista explica cómo traer más del servidor. */
    if (found) open(found);
    else setSelected(null);
  }
  /** El catálogo de veredas del filtro sale de los expedientes reales. */
  const veredas = useMemo(
    () =>
      [...new Set(items.map((i) => i.vereda).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [items],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (category === ALL || i.category === category) &&
        (vereda === ALL || i.vereda === vereda) &&
        (priority === ALL || (i.priority ?? DEFAULT_PRIORITY) === priority) &&
        (status === ALL || i.status === status) &&
        (!needle ||
          `${i.title} ${i.description} ${i.assignee ?? ""} ${i.id}`
            .toLowerCase()
            .includes(needle)),
    );
  }, [items, category, vereda, priority, status, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const shown = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const account = session.uid;
  /* La petición sola, sin tocar estado: lo que devuelve lo coloca quien la
     pidió. Así la puede lanzar tanto un botón como el montaje de la pantalla. */
  const requestPage = useCallback(async (after?: string) => {
    const { headers, uid } = await memberHeaders();
    const response = await fetch(
      `/api/admin/incidents/${after ? `?after=${after}` : ""}`,
      { headers, signal: AbortSignal.timeout(20000), cache: "no-store" },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return {
      uid,
      next: data.next as string | null,
      items: data.items as Incident[],
      delay: Number(data.delayHours) || 24,
    };
  }, []);
  /* Colocar una página. Se ignora si la sesión cambió entre la petición y la
     respuesta: lo cargado dejaría de ser de quien mira. */
  const receive = useCallback(
    (
      page: {
        uid: string | null;
        next: string | null;
        items: Incident[];
        delay: number;
      },
      after?: string,
    ) => {
      if (account !== page.uid) return;
      setItems((old) => (after ? [...old, ...page.items] : page.items));
      setCursor(page.next);
      setDelay(page.delay);
      setSelected(null);
    },
    [account],
  );
  const failed = (error: unknown) =>
    setProblem(
      error instanceof Error ? error.message : "No se pudo consultar.",
    );
  /* Lo que hacen los botones: anunciar la espera y pedir. */
  function load(after?: string, done?: () => void) {
    setBusy(true);
    setMessage("");
    setProblem("");
    if (!after) setPage(1);
    requestPage(after)
      .then((batch) => {
        receive(batch, after);
        done?.();
      })
      .catch(failed)
      .finally(() => setBusy(false));
  }
  /**
   * Una sola paginación.
   *
   * Mientras queden páginas de lo ya cargado avanza por ellas, y al llegar al
   * final trae del servidor la siguiente tanda. Antes eran dos controles
   * —«Siguiente» sobre lo cargado y «Cargar más» sobre el servidor— y había
   * que saber por dónde iba la bandeja para acertar con cuál pulsar.
   */
  function next() {
    if (page < pages) {
      setPage(page + 1);
      return;
    }
    if (cursor) load(cursor, () => setPage((current) => current + 1));
  }
  /* La bandeja es el trabajo de esta pantalla, no una opción: se pide al
     entrar. Antes había que pulsar un botón, así que el puesto del Consejo
     empezaba siempre vacío. Se repite al cambiar de cuenta, que es cuando lo
     cargado deja de ser de quien mira. */
  useEffect(() => {
    let alive = true;
    requestPage()
      .then((page) => {
        if (alive) receive(page);
      })
      .catch((error) => {
        if (alive) failed(error);
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [requestPage, receive]);
  function open(item: Incident) {
    setSelected({ ...item, priority: item.priority ?? DEFAULT_PRIORITY });
    /* La versión pública parte de lo que el expediente ya dice. Quien revisa
       corrige, recorta o cambia lo que haga falta, pero no vuelve a teclear la
       vereda ni el título que tiene delante: escribirlos otra vez a mano era,
       además, la manera más fácil de equivocarse de vereda. */
    setNotes({
      ...blankNotes,
      publicTitle: item.title.slice(0, 120),
      publicSummary: firstWords(item.description, 30),
      publicVereda: item.vereda,
    });
    setMessage("");
    setProblem("");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setMessage("");
    setProblem("");
    try {
      const { headers, uid } = await memberHeaders();
      const response = await fetch(`/api/admin/incidents/${selected.id}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          ...selected,
          ...notes,
          mutationId: crypto.randomUUID(),
        }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (session.uid !== uid) return;
      const updated = { ...selected, version: data.version };
      setSelected(updated);
      setItems((old) => old.map((i) => (i.id === selected.id ? updated : i)));
      setNotes(blankNotes);
      setMessage(
        "Guardado en el servidor. El cambio queda en el historial del expediente con quién lo hizo y cuándo, y el resto del Consejo recibe el aviso.",
      );
      toast("Expediente guardado en el servidor.");
    } catch (error) {
      const dicho =
        error instanceof Error
          ? `No se guardó: ${error.message}`
          : "No se guardó. Revisa la conexión y vuelve a intentarlo.";
      setProblem(dicho);
      toast(dicho, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel remote-panel council-inbox">
      <span className="eyebrow">BANDEJA DEL SERVIDOR</span>
      <h2>Expedientes recibidos</h2>
      <p>
        Todas las incidencias que llegaron al servidor, con su prioridad, su
        responsable y su estado.
      </p>
      {!selected && (
        <button className="btn" disabled={busy} onClick={() => load()}>
          {busy ? "Consultando…" : "Actualizar bandeja"}
        </button>
      )}
      {/* Con un expediente abierto el aviso baja con él: el botón de guardar
          está al final de la ficha, y un «guardado» dibujado aquí arriba se
          queda fuera de pantalla justo cuando hace falta leerlo. */}
      {!selected && problem && (
        <p className="errors" role="alert">
          {problem}
        </p>
      )}
      {!selected && message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {items.length > 0 && !selected && (
        <>
          <div className="filters council-filters">
            <label className="field-label council-search">
              Buscar
              <span className="search">
                <Search size={16} />
                <input
                  value={query}
                  placeholder="Título, responsable o código…"
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </span>
            </label>
            <label className="field-label">
              Categoría
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value={ALL}>Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Vereda
              <select
                value={vereda}
                onChange={(e) => {
                  setVereda(e.target.value);
                  setPage(1);
                }}
              >
                <option value={ALL}>Todas</option>
                {veredas.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Prioridad
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  setPage(1);
                }}
              >
                <option value={ALL}>Todas</option>
                {Object.entries(priorities).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Estado
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value={ALL}>Todos</option>
                {Object.entries(statuses).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p role="status" className="subtle-note">
            {filtered.length} de {items.length} expedientes cargados.
          </p>
        </>
      )}
      {items.length > 0 && !filtered.length && !selected && (
        <p className="notice">
          Ningún expediente coincide con lo buscado. Borra la búsqueda o los
          filtros, o pulsa Siguiente para traer más del servidor: la bandeja se
          consulta por tandas y puede que este todavía no haya llegado.
        </p>
      )}
      {/* HU-15.4: categoría/vereda, prioridad, responsable y estado, leídos como
          cualquier otro listado de la aplicación. La tabla de seis columnas
          cabía más datos, pero en un teléfono se leía a trozos y no se parecía
          a ninguna otra lista de reportes. */}
      {/* Con un expediente abierto la bandeja se aparta. Antes el formulario se
          añadía al pie de la lista: había que bajar varias pantallas para
          encontrarlo, y quedaba la duda de si se había abierto algo. */}
      {!selected && (
        <div className="case-list council-cases">
          {shown.map((i) => (
            <button className="case-row" key={i.id} onClick={() => open(i)}>
              <MiniaturaExpediente id={i.id} category={i.category} />
              <span className="case-copy">
                <strong>{i.title}</strong>
                <small title={i.id}>
                  {categories.find((c) => c.id === i.category)?.name ??
                    i.category}{" "}
                  <span>·</span> {i.vereda || "Sin vereda"} <span>·</span>{" "}
                  {i.assignee || "Sin asignar"} <span>·</span> {shortId(i.id)}
                </small>
              </span>
              <span
                className={`tag priority-${i.priority ?? DEFAULT_PRIORITY}`}
              >
                {priorities[i.priority ?? DEFAULT_PRIORITY]}
              </span>
              <Badge status={i.status} />
              <ChevronRight size={16} className="muted" />
            </button>
          ))}
        </div>
      )}
      {items.length > 0 && !selected && (
        <div className="pagination">
          <small>
            Página {page} de {pages}
            {cursor && " · hay más en el servidor"}
          </small>
          <button
            className="btn"
            type="button"
            disabled={busy || page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </button>
          <button
            className="btn"
            type="button"
            disabled={busy || (page >= pages && !cursor)}
            onClick={next}
          >
            {busy ? "Cargando…" : "Siguiente"}
          </button>
        </div>
      )}
      {/* Lo que este dispositivo guarda y nunca envió. No son expedientes
          —nadie los ha recibido—, así que van aparte y con su estado dicho, no
          mezclados en la tabla de arriba como si el Consejo los tuviera. */}
      {pending.length > 0 && !selected && (
        <div className="council-pending">
          <h3>Todavía en este dispositivo</h3>
          <p className="subtle-note">
            Reportes guardados en este navegador que no llegaron al servidor. El
            Consejo no los tiene y nadie más los ve. Ábrelos para revisarlos y
            enviarlos.
          </p>
          {pending.map((item) => (
            <Link
              className="account-row pending-row"
              key={item.id}
              href={`/reporte/${encodeURIComponent(item.id)}/?desde=admin`}
            >
              <span>
                <strong>{item.title}</strong>
                <small title={item.id}>
                  {item.vereda || "Sin vereda"} · {shortId(item.id)}
                </small>
              </span>
              <span className="tag">{deliveryLabel[deliveryOf(item)]}</span>
            </Link>
          ))}
        </div>
      )}
      {selected && (
        <form onSubmit={save} className="council-form">
          {/* Volver arriba del todo: es lo primero que se busca al terminar de
              mirar un expediente, no al final de un formulario largo. */}
          <button
            type="button"
            className="text-button"
            onClick={() => setSelected(null)}
          >
            <ArrowLeft size={15} /> Volver a la bandeja
          </button>
          {/* La misma ficha que se lee en el detalle de un reporte: la
              evidencia a un lado y el relato al otro, y debajo la gestión. Un
              formulario corrido dejaba la fotografía arriba y las decisiones
              tres pantallas más abajo, sin poder mirar las dos cosas a la vez. */}
          <div className={`${styles.body} council-detail`}>
            <div className={styles.meta}>
              <Badge status={selected.status} />
              <span title={selected.id}>
                #{shortId(selected.id)} · versión {selected.version}
              </span>
            </div>
            <h2>{selected.title}</h2>
            <p className={styles.location}>
              <span className={styles.kind}>
                <CategoryIcon category={selected.category} size={14} />
                {categories.find((c) => c.id === selected.category)?.name ??
                  "Otra situación"}
              </span>
              <MapPin size={15} />
              {selected.vereda || "Sin vereda"}
            </p>
            <div className={styles.columns}>
              <div className={styles.evidence}>
                <PrivateEvidence key={selected.id} id={selected.id} />
                {/* Debajo de la fotografía, lo que hace falta para decidir
                    sin abrir nada más: cuándo llegó, a quién llamar, dónde fue
                    y qué ve ya la comunidad. La columna quedaba vacía. */}
                <ul className="case-facts">
                  {selected.date && (
                    <li>
                      <FileText size={15} />
                      <span>
                        Registrado
                        <strong title={selected.date}>
                          {shortDate(selected.date)} ·{" "}
                          {relativeTime(selected.date)}
                        </strong>
                      </span>
                    </li>
                  )}
                  <li>
                    <Phone size={15} />
                    <span>
                      Contacto
                      {selected.phone ? (
                        <a href={`tel:${selected.phone}`}>
                          <strong>{selected.phone}</strong>
                        </a>
                      ) : (
                        <strong>No dejó teléfono</strong>
                      )}
                    </span>
                  </li>
                  <li>
                    <MapPin size={15} />
                    <span>
                      Ubicación
                      {/* La vereda y nada más. Aquí decía además si el
                          expediente traía punto de GPS, y ese dato no lleva a
                          ninguna parte: esta ficha no enseña el punto ni deja
                          abrirlo, así que «con punto marcado» era una etiqueta
                          sin nada que hacer con ella, y «sin punto» una
                          disculpa por algo que nadie echaba en falta. */}
                      <strong>{selected.vereda || "Sin vereda"}</strong>
                    </span>
                  </li>
                  {/* Antes de cambiar nada conviene saber si la comunidad ya lo
                      está viendo. Se deducía de dos desplegables y de una regla
                      de horas que no se ve por ninguna parte. */}
                  <li>
                    <Eye size={15} />
                    <span>
                      Ante la comunidad
                      <strong>{visibility(selected, delay)}</strong>
                    </span>
                  </li>
                  <li>
                    <UserRound size={15} />
                    <span>
                      Responsable
                      <strong>{selected.assignee || "Sin asignar"}</strong>
                    </span>
                  </li>
                </ul>
              </div>
              <div className={styles.record}>
                <section>
                  <h3>Descripción</h3>
                  <p className={styles.description}>{selected.description}</p>
                </section>
                <section>
                  <h3>Seguimiento</h3>
                  <RemoteHistory
                    key={`history-${selected.id}`}
                    id={selected.id}
                  />
                </section>
                <section>
                  <h3>Gestión del Consejo</h3>
                  <div className="filters">
                    <label className="field-label">
                      Estado
                      <select
                        value={selected.status}
                        onChange={(e) =>
                          setSelected({ ...selected, status: e.target.value })
                        }
                      >
                        {Object.entries(statuses).map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-label">
                      Prioridad
                      <select
                        value={selected.priority ?? DEFAULT_PRIORITY}
                        onChange={(e) =>
                          setSelected({ ...selected, priority: e.target.value })
                        }
                      >
                        {Object.entries(priorities).map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="field-label">
                    Responsable
                    <input
                      maxLength={100}
                      value={selected.assignee ?? ""}
                      onChange={(e) =>
                        setSelected({ ...selected, assignee: e.target.value })
                      }
                    />
                  </label>
                  <label className="field-label">
                    Nota para el ciudadano · hasta 30 palabras
                    <textarea
                      value={notes.publicNote}
                      onChange={(e) =>
                        setNotes({ ...notes, publicNote: e.target.value })
                      }
                      maxLength={1000}
                    />
                  </label>
                  <label className="field-label">
                    Nota interna · solo administradores
                    <textarea
                      value={notes.internalNote}
                      onChange={(e) =>
                        setNotes({ ...notes, internalNote: e.target.value })
                      }
                      maxLength={4000}
                    />
                  </label>
                  <label className="field-label">
                    Revisión de sensibilidad
                    <select
                      value={selected.sensitivity}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          sensitivity: e.target.value,
                          publication: "private",
                        })
                      }
                    >
                      <option value="unreviewed">Sin revisar · privado</option>
                      <option value="sensitive">Sensible · privado</option>
                      <option value="safe">
                        Revisado · sin contenido sensible
                      </option>
                    </select>
                  </label>
                  <label className="field-label">
                    Visibilidad del resumen
                    <select
                      value={selected.publication}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          publication: e.target.value,
                        })
                      }
                    >
                      <option value="private">Privado</option>
                      <option value="public">
                        Compartir el resumen revisado
                      </option>
                    </select>
                  </label>
                  {/* Dicho aquí, junto al desplegable que lo provoca, y no
                      después de redactar el resumen entero. */}
                  {selected.publication === "public" &&
                    blocked(selected.sensitivity) && (
                      <p className="errors" role="status">
                        {blocked(selected.sensitivity)}
                      </p>
                    )}
                  {selected.publication === "public" && (
                    <>
                      <p>
                        Redacta una versión sin nombres, teléfonos ni datos que
                        identifiquen a personas. La fotografía original
                        permanecerá privada.
                      </p>
                      <label className="field-label">
                        Título público
                        <input
                          required
                          maxLength={120}
                          value={notes.publicTitle}
                          onChange={(e) =>
                            setNotes({ ...notes, publicTitle: e.target.value })
                          }
                        />
                      </label>
                      <label className="field-label">
                        Resumen público · hasta 30 palabras
                        <textarea
                          required
                          value={notes.publicSummary}
                          onChange={(e) =>
                            setNotes({
                              ...notes,
                              publicSummary: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="field-label">
                        Vereda pública
                        {/* Del catálogo, el mismo que usa quien reporta.
                            Escrita a mano entraban «Bellavista», «Bella Vista»
                            y «bellavista» como si fueran tres sitios, y el mapa
                            y los filtros se apoyan en ese nombre para agrupar. */}
                        <select
                          required
                          value={notes.publicVereda}
                          onChange={(e) =>
                            setNotes({ ...notes, publicVereda: e.target.value })
                          }
                        >
                          <option value="">Selecciona una vereda</option>
                          {/* La del expediente puede venir de un registro
                              antiguo y no estar en el catálogo. Se ofrece
                              igual: si no, al abrirlo la selección cambiaría
                              sola a otra vereda sin que nadie lo pidiera. */}
                          {notes.publicVereda &&
                            !veredaNames.includes(notes.publicVereda) && (
                              <option value={notes.publicVereda}>
                                {notes.publicVereda} · fuera del catálogo
                              </option>
                            )}
                          {veredaNames.map((name) => (
                            <option key={name}>{name}</option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                </section>
              </div>
            </div>
          </div>
          {problem && (
            <p className="errors" role="alert">
              {problem}
            </p>
          )}
          {message && (
            <p className="notice done" role="status">
              <Check size={15} />
              {message}
            </p>
          )}
          <div className="account-actions">
            {/* Un botón que no puede hacer lo que dice no debe poder
                pulsarse: guardar con el resumen bloqueado no guardaba nada, ni
                siquiera el estado o el responsable que sí se podían cambiar. */}
            <button
              className="btn primary"
              disabled={
                busy ||
                (selected.publication === "public" &&
                  !!blocked(selected.sensitivity))
              }
            >
              {busy ? "Guardando…" : "Guardar cambio en servidor"}
            </button>
            {/* HU-13.5: salir del detalle sin abandonar la bandeja. */}
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Volver a la bandeja
            </button>
          </div>
          {/* Fuera de los mandos de guardar, y al final: no es una variante de
              guardar, es lo contrario. */}
          <Retract
            id={selected.id}
            title={selected.title}
            onRemoved={(dicho) => {
              setItems((old) => old.filter((i) => i.id !== selected.id));
              setSelected(null);
              setMessage(dicho);
              toast("Reporte retirado.");
            }}
          />
        </form>
      )}
    </section>
  );
}
