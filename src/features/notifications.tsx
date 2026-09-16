"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CheckCheck, ArrowUpRight } from "lucide-react";
import {
  getServerNotices,
  noticeStore,
  type NoticeState,
} from "@/data/notifications";
import { exactTime, relativeTime } from "@/domain/relative-time";

function useNotices(council: boolean): NoticeState {
  const store = noticeStore(council ? "council" : "personal");
  return useSyncExternalStore(store.subscribe, store.get, getServerNotices);
}

/** Número de novedades sin leer para la campana de la barra superior. */
export function useUnreadCount() {
  return useNotices(false).unread;
}

/** Las del Consejo, para marcar su pestaña sin tener que abrirla. */
export function useCouncilUnread() {
  return useNotices(true).unread;
}

export function Notifications({
  council = false,
  onOpen,
}: {
  council?: boolean;
  /** Llevar a un expediente desde el aviso que lo anuncia. */
  onOpen?: (incidentId: string) => void;
}) {
  const { items, error, loading, available, unread } = useNotices(council);
  const [failure, setFailure] = useState("");
  const [clearing, setClearing] = useState(false);
  const store = noticeStore(council ? "council" : "personal");
  async function markAll() {
    if (clearing) return;
    setClearing(true);
    try {
      setFailure("");
      await store.markAllRead();
    } catch {
      setFailure("No se pudieron marcar como leídas.");
    } finally {
      setClearing(false);
    }
  }
  async function mark(id: string) {
    try {
      setFailure("");
      await store.markRead(id);
    } catch {
      setFailure("No se pudo marcar como leída.");
    }
  }
  return (
    <section className="notification-list">
      <div className="notification-head">
        <h3>
          {council ? "Novedades del Consejo" : "Tus novedades"}
          {unread > 0 && <span className="tag">{unread} sin leer</span>}
        </h3>
        {/* También en el Consejo: sin esto la cifra de la pestaña se quedaba
            clavada en el primer aviso y no volvía a bajar nunca. */}
        {unread > 0 && (
          <button
            className="text-button"
            disabled={clearing}
            onClick={() => void markAll()}
          >
            <CheckCheck size={15} />
            {clearing ? "Marcando…" : "Marcar todas"}
          </button>
        )}
      </div>
      {council && (
        <p className="subtle-note">
          Lo que le pasó al territorio desde el servidor: reportes que llegaron
          y cambios que hizo el Consejo. Es una bandeja compartida por todo el
          Consejo; marcarlas como leídas solo cuenta en este dispositivo.
        </p>
      )}
      {(error || failure) && <p role="status">{failure || error}</p>}
      {!items.length && !error && (
        <p>
          {loading
            ? "Consultando novedades…"
            : available
              ? "No hay novedades para mostrar."
              : "Inicia sesión para recibir avisos sobre tus reportes."}
        </p>
      )}
      {/* Fila propia, no la de la bandeja de salida: un aviso es un titular, un
          detalle y cuándo llegó, con la acción al canto. Con la retícula
          prestada, «Marcar como leída» salía centrada en mitad del aviso. */}
      {items.map((n) => (
        <article
          className={n.read ? "notice-row" : "notice-row unread"}
          key={n.id}
        >
          <strong>{n.title}</strong>
          {n.note && <p>{n.note}</p>}
          <div className="notice-foot">
            {/* Relativo para leerlo de un vistazo; la fecha exacta queda al
                alcance del puntero y del lector de pantalla. Y quién lo hizo,
                que en una bandeja compartida por todo el Consejo es la mitad
                de la noticia: «pasa a pendiente» no dice lo mismo si lo hizo
                una persona u otra. */}
            <small title={exactTime(n.at)}>
              <time dateTime={n.at}>{relativeTime(n.at)}</time>
              {n.actor && ` · ${n.actor}`}
            </small>
            {/* Un aviso a la comunidad lleva a su comunicado: enterarse y
                poder leerlo son la misma acción. */}
            {n.type === "announcement" && n.newsId && (
              <Link
                className="text-button"
                href={`/noticia/${encodeURIComponent(n.newsId)}/`}
              >
                <ArrowUpRight size={14} /> Abrir el comunicado
              </Link>
            )}
            {/* Un aviso que anuncia un expediente tiene que llevar a él. Antes
                decía que algo había llegado y ahí se acababa: para verlo había
                que ir a la bandeja y buscarlo a mano. */}
            {onOpen && n.incidentId && (
              <button
                className="text-button"
                type="button"
                onClick={() => onOpen(n.incidentId as string)}
              >
                <ArrowUpRight size={14} /> Ver el expediente
              </button>
            )}
            {/* Los avisos a la comunidad no son de nadie en particular, así
                que no se descartan de uno en uno: se limpian con «Marcar
                todas», que es lo que guarda hasta dónde llegó cada quien. */}
            {!council && !n.read && n.type !== "announcement" && (
              <button className="text-button" onClick={() => void mark(n.id)}>
                Marcar como leída
              </button>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
