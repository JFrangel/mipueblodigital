"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { type Case, statuses } from "@/data/catalog";
import { memberHeaders } from "@/data/remote-reports";
import { useSession } from "@/data/session";
import { toast } from "@/data/toasts";

/**
 * Gestionar un expediente **desde su propia ficha**, escribiendo en el servidor.
 *
 * **Por qué existe.** La ficha ya tenía un editor, pero anota en el almacén de
 * este navegador: está para los reportes que se quedaron en el aparato y nunca
 * llegaron al Consejo. Sobre uno que sí llegó no servía de nada —anotaría en
 * una copia que nadie lee— así que quien es del Consejo tenía que salir de la
 * ficha que está mirando, abrir el panel y buscar el mismo caso otra vez. Dos
 * pantallas y una búsqueda para cambiar un estado que tiene delante.
 *
 * **Solo sobre lo que está en el servidor.** Un reporte enviado conserva el
 * identificador que devolvió el servidor al recibirlo; los que empiezan por
 * `LOCAL-` nunca tuvieron recibo. Esa es la frontera, y quien la decide es
 * `report-detail`, que sabe en qué punto del camino está el reporte.
 *
 * **Y solo cambia tres cosas.** Estado, responsable y el porqué. No toca la
 * clasificación de sensibilidad ni si el caso es público: eso se decide
 * leyendo el expediente entero, que es lo que se hace en el panel, y no de
 * pasada desde una ficha. La ruta conserva lo que no se le manda —ver
 * `api/admin/incidents/[id]`—, así que desde aquí no se puede publicar ni
 * despublicar nada ni por error.
 */

/** Lo que el servidor dice que el caso es ahora mismo. */
type Gestion = {
  version: number;
  status: string;
  assignee: string;
  publication: string;
};

export function GestionConsejo({
  item,
  onChange,
}: {
  item: Case;
  onChange: (item: Case) => void;
}) {
  const session = useSession();
  /**
   * **Nada se edita hasta saber qué hay en el servidor.**
   *
   * Lo que se ve en esta pantalla es la copia que guarda el aparato, y de un
   * expediente enviado esa copia es del día en que salió: el estado puede ser
   * otro, el responsable puede ser otro, y sobre todo la versión —que es lo que
   * el servidor exige para dejar cambiar nada— aquí no existe. Editando sobre
   * la copia, el primer guardado contestaría «otra persona actualizó el caso» a
   * alguien que es la única que lo ha tocado.
   *
   * Así que primero se pregunta, y mientras tanto no hay formulario. Es la
   * misma idea que el resto de la ficha: el aparato no es la fuente, es una
   * copia.
   */
  const [gestion, setGestion] = useState<Gestion | null>(null);
  /* Arranca consultando desde el estado inicial —como el historial remoto—
     para que el efecto solo encadene promesas y no toque el estado antes de
     tiempo. Quien lo vuelve a encender es el botón de reintentar. */
  const [cargando, setCargando] = useState(true);
  const [status, setStatus] = useState(item.status),
    [assignee, setAssignee] = useState(item.assignee ?? ""),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  /* El envío no se puede disparar dos veces: cada uno lleva su propio
     identificador de cambio y el segundo chocaría con la versión del primero,
     dejando en pantalla un conflicto que no existe. */
  const lock = useRef(false);
  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);
  const words = note.trim() ? note.trim().split(/\s+/).length : 0;

  /* Preguntar y recibir van aparte —como en el historial remoto— porque lo que
     trae la respuesta no puede tocar una pantalla que ya no está: entre la
     pregunta y la respuesta se cambia de expediente, o se cierra la ficha. */
  const preguntar = useCallback(async () => {
    const { headers } = await memberHeaders(session.uid ?? undefined);
    const response = await fetch(`/api/incidents/${item.id}/`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    if (!data.gestion)
      throw new Error("Esta cuenta no puede gestionar el expediente.");
    return data.gestion as Gestion;
  }, [item.id, session.uid]);

  const recibir = useCallback((traido: Gestion, silencioso: boolean) => {
    if (!vivo.current) return;
    setGestion(traido);
    /* Lo que se ofrece a cambiar es lo que el caso es ahora, no lo que este
       aparato recuerda. Si no coinciden, el desplegable ya lo dice sin
       necesidad de avisar de nada. */
    setStatus(traido.status);
    setAssignee(traido.assignee);
    /* Callada, no borra lo que se esté diciendo: la consulta callada es la que
       sigue a un choque de versiones, y su aviso es justo lo que hay que
       leer. */
    if (!silencioso) setError("");
  }, []);

  const consultar = useCallback(
    (silencioso = false) => {
      preguntar()
        .then((traido) => recibir(traido, silencioso))
        .catch((e: unknown) => {
          if (!vivo.current) return;
          setError(
            e instanceof Error
              ? `No se pudo consultar el expediente: ${e.message}`
              : "No se pudo consultar el expediente.",
          );
        })
        .finally(() => {
          if (vivo.current) setCargando(false);
        });
    },
    [preguntar, recibir],
  );

  useEffect(() => {
    consultar();
  }, [consultar]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || !gestion) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      /* Se exige que la sesión del navegador sea la misma que firma la
         petición: si alguien cambió de cuenta en otra pestaña, el cambio se
         guardaría a nombre de quien no es. */
      const { headers } = await memberHeaders(session.uid ?? undefined);
      const response = await fetch(`/api/admin/incidents/${item.id}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          mutationId: crypto.randomUUID(),
          version: gestion.version,
          status,
          assignee,
          /**
           * La nota va como **pública**, y por eso se avisa en pantalla.
           *
           * Es la que llega a quien reportó —en el aviso del teléfono y en su
           * expediente— y la que queda como motivo si el caso se descarta. Una
           * nota interna desde aquí no tendría sentido: el gesto que se hace
           * en esta pantalla es contestarle a quien está esperando respuesta.
           * Para las anotaciones que no salen del Consejo está su panel.
           */
          publicNote: note.trim(),
        }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) {
        /**
         * Alguien del Consejo tocó el caso mientras esta ficha estaba abierta.
         *
         * Se vuelve a preguntar y se enseña lo que hay ahora: dejar el
         * formulario con la versión vieja solo consigue que el siguiente
         * intento falle igual. Y se dice con otras palabras que las del
         * servidor —que mandan recargar— porque recargar es justo lo que se
         * acaba de hacer por quien está mirando.
         */
        if (response.status === 409) {
          consultar(true);
          throw new Error(
            "Otra persona del Consejo acaba de cambiar este caso. Arriba está lo que hay ahora; revísalo y vuelve a guardar.",
          );
        }
        throw new Error(data.error);
      }
      setGestion({ ...gestion, version: data.version, status, assignee });
      onChange({ ...item, status, assignee, version: data.version });
      setNote("");
      setSaved(true);
      toast("Guardado en el servidor.");
    } catch (e) {
      const dicho =
        e instanceof Error
          ? `No se guardó: ${e.message}`
          : "No se guardó. Revisa la conexión y vuelve a intentarlo.";
      setError(dicho);
      toast(dicho, "error");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (cargando)
    return (
      <div className="admin-editor">
        <h3>Gestionar este expediente</h3>
        <p className="notice">Consultando el expediente en el servidor…</p>
      </div>
    );

  /* Sin saber en qué versión está el caso no se puede cambiar nada, así que no
     se enseña un formulario que no va a poder guardar. */
  if (!gestion)
    return (
      <div className="admin-editor">
        <h3>Gestionar este expediente</h3>
        <p role="alert" className="errors">
          {error || "No se pudo consultar el expediente."}
        </p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setCargando(true);
            consultar();
          }}
        >
          <RefreshCw size={15} />
          Volver a intentarlo
        </button>
      </div>
    );

  return (
    <form onSubmit={submit} className="admin-editor">
      <h3>Gestionar este expediente</h3>
      {/* Lo contrario de lo que dice el editor local, y por eso se dice: esta
          pantalla se parece a aquella y lo que hacen no se parece en nada.

          Y si además el caso está publicado, el cambio de estado lo ve el río
          entero: va en la misma caja porque es la misma pregunta —qué pasa
          cuando le dé a guardar— y son dos renglones de la misma respuesta. */}
      <div className="notice">
        <p>
          Esto se guarda en el servidor y queda en el historial con tu nombre y
          la fecha. Quien lo reportó recibe el aviso.
        </p>
        {gestion.publication === "public" && (
          <p>Este caso es público: el nuevo estado se verá en la comunidad.</p>
        )}
      </div>
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
        Qué decirle a quien reportó
        <textarea
          required
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="En qué quedó, o por qué cambia."
        />
        <small>
          {words} / 30 palabras · lo lee quien reportó, así que sin datos de
          nadie
        </small>
      </label>
      {error && (
        <p role="alert" className="errors">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="notice done">
          <Check size={15} />
          Guardado en el servidor y avisado a quien reportó.
        </p>
      )}
      <button
        className="btn primary"
        disabled={busy || words > 30}
        type="submit"
      >
        {busy ? "Guardando…" : "Guardar en el servidor"}
      </button>
    </form>
  );
}
