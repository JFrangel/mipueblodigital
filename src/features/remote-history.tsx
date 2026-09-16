"use client";
import { statuses } from "@/data/catalog";
import {
  useRemoteHistory,
  type RemoteHistoryState,
} from "@/data/remote-history";

/**
 * Lo que el Consejo ha hecho con el expediente.
 *
 * Solo dibuja: los datos los trae `useRemoteHistory`, porque la pantalla de
 * quien reportó los necesita además para saber en qué estado está su caso, y
 * dos consultas al mismo historial en la misma pantalla sobran.
 */
export function HistoryList({ state }: { state: RemoteHistoryState }) {
  const { items, busy, error, next, more } = state;
  /* Sin `role="status"`: esto acompaña al seguimiento del caso, que ya lo
     cuenta. Anunciarlo como novedad interrumpiría la lectura y competiría con
     los avisos que sí importan. */
  if (busy && !items.length)
    return (
      <p className="remote-history-note">
        Consultando lo que el Consejo ha hecho…
      </p>
    );
  /* Que no se pueda consultar el servidor no es una alarma: el expediente se
     sigue leyendo entero con lo que hay en el dispositivo. */
  if (error) return <p className="remote-history-note">{error}</p>;
  if (!items.length) return null;
  return (
    <section className="remote-history">
      <ol>
        {items.map((event) => (
          <li key={event.id}>
            <strong>
              {event.type === "received"
                ? "Recibido por el Consejo"
                : (statuses[event.status as keyof typeof statuses] ??
                  event.status)}
            </strong>
            <time dateTime={event.at}>
              {new Date(event.at).toLocaleString("es-CO")}
              {event.actor && ` · ${event.actor}`}
            </time>
            {event.note && <p>{event.note}</p>}
            {event.internalNote && (
              <p className="notice">
                <b>Nota interna · Consejo</b>
                <br />
                {event.internalNote}
              </p>
            )}
          </li>
        ))}
      </ol>
      {next && (
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={more}
        >
          Ver actuaciones anteriores
        </button>
      )}
    </section>
  );
}

/** El historial con su propia consulta, para quien solo quiere listarlo. */
export function RemoteHistory({ id }: { id: string }) {
  const state = useRemoteHistory(id, true);
  return <HistoryList state={state} />;
}
