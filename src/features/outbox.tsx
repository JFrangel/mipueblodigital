"use client";
import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { getSession, useSession } from "@/data/session";
import {
  markDeliveriesSeen,
  outgoingFor,
  pendingAnnouncements,
  retryOutgoing,
  OUTBOX_LIMIT,
  type Outgoing,
} from "@/data/outbox";
import { onFlushRequest, syncOutbox } from "@/data/sync-outbox";
import { askDeliveryAlerts, useDeliveryAlerts } from "@/data/delivery-alert";
import { toast } from "@/data/toasts";
const labels: Record<Outgoing["state"], string> = {
  queued: "En cola · sin confirmar",
  sending: "Enviando…",
  attention: "Requiere tu atención",
  confirmed: "Confirmado por el servidor",
};
export function Outbox({ compact = false }: { compact?: boolean }) {
  const session = useSession();
  const owner = session.uid;
  const [items, setItems] = useState<Outgoing[]>([]),
    [online, setOnline] = useState(true),
    [error, setError] = useState("");
  /* El permiso de avisos es estado del navegador, no de React: se lee como se
     leen la red o la sesión, y se vuelve a leer si cambia desde los ajustes. */
  const alerts = useDeliveryAlerts();
  useEffect(() => {
    let active = true;
    if (!owner) return;
    /* Leer la bandeja no carga fotografías: solo metadatos por envío. */
    const refresh = async () => {
      try {
        const values = await outgoingFor(owner);
        if (active) setItems(values);
      } catch {
        if (active) setError("No se pudo leer la bandeja local.");
      }
    };
    const flush = () => {
      if (!navigator.onLine) return;
      void syncOutbox(owner, () => active && getSession().uid === owner).catch(
        () => {
          if (active)
            setError(
              "No se pudo sincronizar. Tus envíos permanecen guardados.",
            );
        },
      );
    };
    const tick = () => {
      setOnline(navigator.onLine);
      // Con la pestaña oculta no se consulta el disco ni la red.
      if (document.visibilityState === "hidden") return;
      flush();
      void refresh();
    };
    tick();
    const timer = setInterval(tick, 30000);
    const stopFlushRequests = onFlushRequest(tick);
    window.addEventListener("online", tick);
    window.addEventListener("offline", tick);
    window.addEventListener("outbox-change", refresh);
    document.addEventListener("visibilitychange", tick);
    return () => {
      active = false;
      clearInterval(timer);
      stopFlushRequests();
      window.removeEventListener("online", tick);
      window.removeEventListener("offline", tick);
      window.removeEventListener("outbox-change", refresh);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [owner]);
  const pending = items.filter((i) => i.state !== "confirmed");
  /* Entregas ocurridas sin que nadie mirara: son una novedad, no un estado. */
  const delivered = pendingAnnouncements(items);
  if (compact) {
    /* La entrega manda sobre todo lo demás: es lo único que pasó mientras no
       se miraba. Antes este renglón decía «envíos confirmados» para siempre,
       que no es una noticia sino un dato viejo repetido en cada pantalla. */
    if (delivered.length)
      return (
        <div className="sync-status delivered" role="status" aria-live="polite">
          <span>
            {delivered.length === 1
              ? `Salió de la bandeja: «${delivered[0].title}». El Consejo ya lo tiene.`
              : `Salieron ${delivered.length} reportes que esperaban señal. El Consejo ya los tiene.`}
          </span>
          <button
            className="text-button"
            onClick={() => {
              void markDeliveriesSeen(owner!).catch(() => undefined);
            }}
          >
            Entendido
          </button>
        </div>
      );
    const text = pending.length ? `${pending.length} envío(s) pendiente(s)` : "";
    if (!text && online && !error) return null;
    return (
      <div className="sync-status" role="status" aria-live="polite">
        {!online ? "Sin conexión · " : ""}
        {text}
        {error}
      </div>
    );
  }
  /* La bandeja de salida solo tiene sentido cuando hay algo dentro. Vacía
     enseñaba «0 / 10 pendientes · 0.0 / 50 MB», un párrafo sobre cómo saldrán
     los reportes que no hay, y la lista de los ya confirmados —que además
     salen otra vez en Mis reportes, con su ficha y su fotografía—. Lo
     entregado es historia y vive allí; aquí solo está lo que falta por salir. */
  if (!pending.length && !error) return null;
  const megabytes = pending.reduce((sum, i) => sum + i.bytes, 0) / 1024 / 1024;
  return (
    <section className="panel remote-panel">
      <div className="remote-panel-body">
        <span className="eyebrow">ESTE DISPOSITIVO</span>
        <h2>
          {pending.length === 1
            ? "Un reporte espera señal"
            : `${pending.length} reportes esperan señal`}
        </h2>
        <p>
          Ya los enviaste: <strong>salen solos</strong> en cuanto haya red o al
          abrir la aplicación con tu sesión, sin que tengas que hacer nada. Un
          borrador es lo contrario —espera a que tú lo mandes— y vive en Mis
          reportes.
        </p>
        {/* El permiso se ofrece aquí, donde se entiende para qué sirve, y no
            con una ventana del navegador nada más entrar. */}
        {alerts === "default" && (
          <button
            className="btn"
            onClick={() => void askDeliveryAlerts()}
          >
            <BellRing size={17} /> Avisarme cuando salgan
          </button>
        )}
        {alerts === "granted" && (
          <p className="subtle-note">
            Te avisaremos cuando un reporte en espera salga con la aplicación en
            segundo plano. Cerrada del todo, el envío aguarda a que la abras.
          </p>
        )}
        {alerts === "denied" && (
          <p className="subtle-note">
            Los avisos están bloqueados para este sitio. Puedes permitirlos
            desde los ajustes del navegador; la bandeja sigue contando aquí lo
            que salió.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="panel-artwork" aria-hidden="true">
        <svg
          className="panel-artwork-svg"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="160" cy="40" r="110" stroke="currentColor" strokeWidth="1" />
          <circle cx="160" cy="40" r="150" stroke="currentColor" strokeWidth="1" />
          <circle cx="160" cy="40" r="190" stroke="currentColor" strokeWidth="1" strokeDasharray="6 6" />
        </svg>
        <span className="panel-artwork-text">
          CONEXIÓN Y<br />RESGUARDO.
        </span>
      </div>
      {pending.map((item) => (
        <div className="outbox-row" key={item.key}>
          <strong>{item.title}</strong>
          <span>{labels[item.state]}</span>
          {item.error && item.state !== "confirmed" && <p>{item.error}</p>}
          {(item.state === "attention" || item.state === "queued") && (
            <button
              className="btn"
              disabled={!online}
              onClick={() =>
                void retryOutgoing(item.key, item.owner)
                  /* Reintento a la vista: el resultado aparece en esta misma
                     fila, así que no hay nada que anunciar por el sistema. */
                  .then(() => syncOutbox(item.owner, () => true, false))
                  .catch(() => {
                    setError("No se pudo reintentar.");
                    toast("No se pudo reintentar el envío.", "error");
                  })
              }
            >
              Reintentar ahora
            </button>
          )}
        </div>
      ))}
      {/* Los límites, al pie y en pequeño: importan cuando uno lleva varios
          reportes acumulados sin señal, no antes. */}
      <p className="subtle-note">
        {pending.length} de {OUTBOX_LIMIT} reportes y{" "}
        {megabytes.toFixed(1)} de 50 MB guardados en este teléfono.{" "}
        {online ? "Hay conexión." : "Ahora mismo no hay conexión."} No borres
        los datos del navegador mientras haya envíos pendientes.
      </p>
    </section>
  );
}
