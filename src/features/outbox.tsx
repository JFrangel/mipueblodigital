"use client";
import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import Link from "next/link";
import { getSession, useSession } from "@/data/session";
import {
  markDeliveriesSeen,
  outgoingFor,
  pendingAnnouncements,
  retryOutgoing,
  traspasar,
  OUTBOX_LIMIT,
  SIN_CUENTA,
  type Outgoing,
} from "@/data/outbox";
import { onFlushRequest, syncOutbox } from "@/data/sync-outbox";
import { LeafFall } from "./leaf-fall";
import { askDeliveryAlerts, useDeliveryAlerts } from "@/data/delivery-alert";
import { toast } from "@/data/toasts";
import { reconcileNative, stagePendingNative } from "@/platform/native-outbox";
const labels: Record<Outgoing["state"], string> = {
  queued: "En cola · sin confirmar",
  sending: "Enviando…",
  attention: "Requiere tu atención",
  confirmed: "Confirmado por el servidor",
};
export function Outbox({ compact = false }: { compact?: boolean }) {
  const session = useSession();
  /**
   * Sin cuenta, la bandeja también tiene dueño: uno de mentira.
   *
   * Quien prepara un reporte sin haber entrado no lo pierde —el servidor exige
   * sesión para recibirlo, pero eso no puede costarle lo que acaba de
   * escribir—. Queda aquí, a nombre de nadie, y se ve: una bandeja que guarda
   * algo en secreto no es una bandeja, es un agujero.
   */
  const anonima = !session.uid;
  const owner = session.uid ?? SIN_CUENTA;
  /**
   * Lo que quedó a nombre de nadie, visto desde una sesión.
   *
   * El traspaso automático al entrar va atado a una marca de `sessionStorage`
   * que **muere al cerrar la aplicación**, y eso deja fuera el caso que más
   * importa: alguien escribe un reporte sin señal —o sin cuenta—, cierra,
   * busca señal, vuelve a abrir y entra. Ahí no hay marca, no hay traspaso, y
   * el reporte se queda a nombre de nadie **invisible**, porque esta bandeja
   * pasa a enseñar la de su cuenta.
   *
   * La marca no se puede mudar a un almacén que sobreviva: en el río los
   * teléfonos se prestan, y entonces quien entrara se llevaría el reporte de
   * otra persona sin enterarse. Así que no se adivina: **se pregunta.**
   */
  const [huerfanos, setHuerfanos] = useState<Outgoing[]>([]);
  const [reclamando, setReclamando] = useState(false);
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
        /* Solo con sesión: sin ella, lo de «nadie» ya es lo que se enseña. */
        if (anonima) return;
        const sueltos = await outgoingFor(SIN_CUENTA);
        if (active)
          setHuerfanos(sueltos.filter((e) => e.state !== "confirmed"));
      } catch {
        if (active) setError("No se pudo leer la bandeja local.");
      }
    };
    const flush = () => {
      /* Sin cuenta no hay a dónde enviar: el servidor exige sesión. Esperan
         aquí hasta que la persona entre, y entonces pasan a su nombre. */
      if (anonima || !navigator.onLine) return;
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
      void (async () => {
        if (!anonima) {
          await reconcileNative(owner);
          await stagePendingNative(owner);
        }
        flush();
        await refresh();
      })().catch(() => {
        if (active) setError("No se pudo revisar la bandeja local.");
      });
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
  }, [owner, anonima]);
  // La sesión puede cambiar antes de que termine la lectura de IndexedDB.
  const ownItems = items.filter((i) => i.owner === owner);
  const pending = ownItems.filter((i) => i.state !== "confirmed");
  /* Entregas ocurridas sin que nadie mirara: son una novedad, no un estado. */
  const delivered = pendingAnnouncements(ownItems);
  if (compact) {
    /* La entrega manda sobre todo lo demás: es lo único que pasó mientras no
       se miraba. Antes este renglón decía «envíos confirmados» para siempre,
       que no es una noticia sino un dato viejo repetido en cada pantalla. */
    if (delivered.length)
      return (
        <div className="sync-status delivered" role="status" aria-live="polite">
          {/* El gesto de la aplicación para «esto salió de aquí», en el único
              sitio fuera del formulario donde de verdad sale algo: un reporte
              que llevaba esperando señal y ya está en manos del Consejo. Pasa
              una vez, como el aviso. */}
          <LeafFall drifting small />
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
    const text = pending.length
      ? `${pending.length} envío(s) pendiente(s)`
      : "";
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
  /**
   * La pregunta, cuando hay algo a nombre de nadie y alguien con sesión mirando.
   *
   * **No dice lo que el reporte cuenta.** El teléfono puede no ser suyo, y el
   * relato de quien escribió un derrumbe —o algo peor— no es de quien resulte
   * entrar después. Se dice de dónde y cuándo, que es lo que basta para
   * reconocer lo tuyo sin exponer lo ajeno.
   */
  const reclamo = !anonima && huerfanos.length > 0 && (
    <section className="panel remote-panel">
      <div className="remote-panel-body">
        <span className="eyebrow">ESTE DISPOSITIVO</span>
        <h2>
          {huerfanos.length === 1
            ? "Hay un reporte guardado sin cuenta"
            : `Hay ${huerfanos.length} reportes guardados sin cuenta`}
        </h2>
        <p>
          Se escribieron en este teléfono antes de entrar —puede que sin señal—.{" "}
          <strong>Si son tuyos</strong>, pasan a tu nombre y salen solos. Si
          este teléfono es prestado y no los escribiste tú, déjalos: esperarán a
          quien los escribió.
        </p>
        <ul className="outbox-list">
          {huerfanos.map((item) => (
            <li key={item.key}>
              {/* La fecha y nada más. Quien lo escribió lo reconoce; quien no,
                  no se entera de lo que dice. El título de un envío es el
                  principio del relato, y eso no se enseña aquí. */}
              <strong>Reporte guardado</strong>
              <small>{new Date(item.createdAt).toLocaleString("es-CO")}</small>
            </li>
          ))}
        </ul>
        <button
          className="btn primary"
          disabled={reclamando}
          onClick={() => {
            setReclamando(true);
            traspasar(SIN_CUENTA, owner)
              .then((cuantos) => {
                setHuerfanos([]);
                toast(
                  cuantos === 1
                    ? "El reporte pasó a tu nombre y sale con la próxima conexión."
                    : `${cuantos} reportes pasaron a tu nombre y salen con la próxima conexión.`,
                );
              })
              .catch(() => toast("No se pudieron pasar a tu nombre.", "error"))
              .finally(() => setReclamando(false));
          }}
        >
          {huerfanos.length === 1 ? "Es mío, enviarlo" : "Son míos, enviarlos"}
        </button>
      </div>
    </section>
  );

  if (!pending.length && !error) return reclamo || null;
  const megabytes = pending.reduce((sum, i) => sum + i.bytes, 0) / 1024 / 1024;
  return (
    <>
      {reclamo}
      <section className="panel remote-panel">
        <div className="remote-panel-body">
          <span className="eyebrow">ESTE DISPOSITIVO</span>
          <h2>
            {anonima
              ? pending.length === 1
                ? "Un reporte espera a que entres"
                : `${pending.length} reportes esperan a que entres`
              : pending.length === 1
                ? "Un reporte espera señal"
                : `${pending.length} reportes esperan señal`}
          </h2>
          {anonima ? (
            <p>
              Están guardados en este dispositivo y no se han perdido. Los
              reportes de este Consejo llevan nombre, así que{" "}
              <strong>hace falta tu cuenta para enviarlos</strong>: al entrar
              pasan a tu nombre y salen solos, sin que tengas que escribirlos
              otra vez. Puedes seguir preparando más mientras tanto.
            </p>
          ) : (
            <p>
              Están guardados en este dispositivo. En la APK, Android
              reintentará al volver la red aunque esté cerrada, si la sesión
              nativa quedó activa. En el navegador se reintentarán con la página
              abierta o al volver a abrirla. Un borrador espera a que tú lo
              mandes y vive en Mis reportes.
            </p>
          )}
          {anonima && (
            <Link className="btn primary" href="/acceso/?volver=reporte">
              Entrar y enviarlos
            </Link>
          )}
          {/* El permiso se ofrece aquí, donde se entiende para qué sirve, y no
            con una ventana del navegador nada más entrar. */}
          {!anonima && alerts === "default" && (
            <button className="btn" onClick={() => void askDeliveryAlerts()}>
              <BellRing size={17} /> Avisarme cuando salgan
            </button>
          )}
          {!anonima && alerts === "granted" && (
            <p className="subtle-note">
              Te avisaremos cuando salga un reporte en espera. En Android la
              cola nativa puede enviarlo con la app cerrada; en el navegador
              necesita que la página siga abierta o vuelvas a abrirla.
            </p>
          )}
          {!anonima && alerts === "denied" && (
            <p className="subtle-note">
              Los avisos están bloqueados. Puedes permitirlos desde los ajustes
              de notificaciones de la app o del navegador; la bandeja cuenta
              aquí lo que salió.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
        </div>
        {/* Aquí se probaron las hojas y **no van**: este panel mide 745 px con
          tres envíos, así que su pie queda debajo de la barra de navegación y
          casi nadie lo ve. Un dibujo que no se ve no es un dibujo, es peso.
          El gesto de esta bandeja está arriba, en el aviso de entrega. */}
        {pending.map((item) => (
          <div className="outbox-row" key={item.key}>
            <strong>{item.title}</strong>
            <span>{labels[item.state]}</span>
            {item.error && item.state !== "confirmed" && <p>{item.error}</p>}
            {/* Sin cuenta no hay a dónde reintentar: lo que falta no es la red,
              es la sesión, y el botón de entrar ya está arriba. */}
            {!anonima &&
              (item.state === "attention" || item.state === "queued") && (
                <button
                  className="btn"
                  disabled={!online}
                  onClick={() =>
                    void reconcileNative(item.owner)
                      .then(() => retryOutgoing(item.key, item.owner))
                      .then(() => stagePendingNative(item.owner))
                      /* Reintento a la vista: el resultado aparece en esta misma
                     fila, así que no hay nada que anunciar por el sistema. */
                      .then(() =>
                        syncOutbox(
                          item.owner,
                          () => getSession().uid === item.owner,
                          false,
                        ),
                      )
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
          {pending.length} de {OUTBOX_LIMIT} reportes y {megabytes.toFixed(1)}{" "}
          de 50 MB guardados en este teléfono.{" "}
          {online ? "Hay conexión." : "Ahora mismo no hay conexión."} No borres
          los datos del navegador mientras haya envíos pendientes.
        </p>
      </section>
    </>
  );
}
