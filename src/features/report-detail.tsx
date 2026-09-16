"use client";
import { useState } from "react";
import {
  MapPin,
  Check,
  Info,
  UserRound,
  Users,
  FileText,
  Trash2,
  Send,
  Hash,
  Ellipsis,
} from "lucide-react";
import { type Case, statuses, categories } from "@/data/catalog";
import { deliveryOf, deliveryLabel, deliveryNote } from "@/domain/delivery";
import { useSession } from "@/data/session";
import { shortId } from "@/domain/short-id";
import { relativeTime } from "@/domain/relative-time";
import { Badge, CategoryIcon, StatusIcon } from "@/components/ui";
import { AdminEditor } from "./admin-editor";
import { PrivateEvidence } from "./private-evidence";
import { PhotoView } from "@/components/photo-view";
import { useRemoteHistory } from "@/data/remote-history";
import styles from "./report-detail.module.css";
const date = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
export function ReportDetail({
  item,
  admin,
  onChange,
  onRemove,
  onResume,
}: {
  item: Case;
  admin: boolean;
  onChange: (item: Case) => void;
  onRemove?: () => void;
  /** Retomar en el formulario un reporte que nunca llegó a salir. */
  onResume?: () => void;
}) {
  const [history, setHistory] = useState(false),
    /* Quitar un registro pide confirmación en el sitio, no una ventana del
       navegador: se ve qué se está quitando mientras se decide. */
    [removing, setRemoving] = useState(false);
  const session = useSession();
  const delivery = deliveryOf(item);
  /**
   * El seguimiento de un expediente entregado lo lleva el Consejo.
   *
   * Lo que guarda este teléfono es del día en que salió el reporte: un asiento
   * viejo, con el nombre de quien lo firmó entonces. Si el Consejo lo devuelve
   * a «pendiente» hoy, aquí seguía leyéndose «en proceso» para siempre.
   *
   * Así que mientras el reporte no haya salido manda lo de aquí —que es lo
   * único que hay—, y en cuanto sale manda el servidor.
   */
  /* De un reporte de otra persona no hay expediente que consultar: el servidor
     responde «no encontrado» a quien no lo firmó, y con razón. Lo que consta de
     él ante la comunidad es justo lo que se está leyendo. */
  const ajeno = item.owner === "community";
  const remote = useRemoteHistory(
    item.id,
    delivery === "enviado" && !!session.uid && !ajeno,
  );
  const served = delivery === "enviado" && remote.items.length > 0;
  /* El servidor devuelve del más reciente al más antiguo; la línea de tiempo se
     lee al revés, y el asiento de recepción ya lo encabeza por su cuenta. */
  const events = served
    ? [...remote.items].reverse().filter((event) => event.type !== "received")
    : (item.events ?? []).map((event) => ({
        id: event.id,
        at: event.at,
        status: event.status,
        note: event.note,
        actor: event.actor as string | undefined,
      }));
  const latest = events.at(-1);
  /* La línea de tiempo cuenta el caso, no lo registra entero: cómo entró, en
     qué está y qué falta. Lo de en medio se pliega detrás de un solo mando, en
     el sitio donde estaría, en vez de repetirse otra vez más abajo. */
  const visible = history ? events : events.slice(-1);
  const completed = ["solucionado", "no_solucionado", "descartado"].includes(
    item.status,
  );
  /**
   * Cómo se dibuja el asiento que está al frente de la línea de tiempo.
   *
   * Salía siempre en ámbar y con el reloj de «en curso», fuera cual fuera el
   * estado: un caso cerrado con éxito se leía «Solucionado» con el color y el
   * icono de algo que todavía está pasando, justo debajo de una insignia verde
   * que decía lo contrario. El último asiento **es** el estado del caso.
   */
  const mark = (status: string) =>
    status === "solucionado"
      ? styles.solved
      : status === "no_solucionado" || status === "descartado"
        ? styles.closed
        : styles.current;
  return (
    <div className={styles.body}>
      <div className={styles.meta}>
        {/* Una sola etiqueta, la que toca. «Pendiente» es el estado de la
            gestión del Consejo, y junto a «Enviado» se leían como una
            contradicción. Además, mientras el reporte no haya llegado, el
            Consejo no puede tenerlo pendiente de nada: lo único cierto es que
            todavía no salió. */}
        {delivery === "enviado" ? (
          <Badge status={item.status} />
        ) : (
          <span className={`tag delivery-${delivery}`}>
            {deliveryLabel[delivery]}
          </span>
        )}
        <span title={item.id}>#{shortId(item.id)}</span>
      </div>
      <h2>{item.title}</h2>
      {/* Qué y dónde, juntos y debajo del título. El tipo estaba al pie de la
          fotografía, que en un reporte largo queda fuera de pantalla: lo
          primero que se pregunta quien abre un expediente es de qué va. */}
      <p className={styles.location}>
        <span className={styles.kind}>
          <CategoryIcon category={item.category} size={14} />
          {categories.find((c) => c.id === item.category)?.name ??
            "Otra situación"}
        </span>
        <MapPin size={15} />
        {item.vereda}
        {/* Aquí iba «Sin punto en el mapa; ubicado por el nombre de la
            vereda». Lo mismo lo dice ya la ficha de abajo, en la línea de
            ubicación, y dicho dos veces en la misma pantalla sobraba una. */}
      </p>
      {/* En escritorio el expediente se lee en dos columnas: a la izquierda la
          evidencia y sus datos, a la derecha el relato y su historia. */}
      <div className={styles.columns}>
        <div className={styles.evidence}>
          {item.photo ? (
            /* Entera y a pantalla completa al pulsarla, como la del panel del
               Consejo. Antes se recortaba a una altura fija y el botón solo la
               estiraba dentro de su columna: una foto vertical seguía sin
               verse entera y el detalle nunca se apreciaba. El original en
               Base64 no sale de aquí: ni optimizador ni direcciones. */
            <PhotoView src={item.photo} alt="Evidencia adjunta al reporte" />
          ) : ajeno ? (
            /* La fotografía es evidencia: la ven quien reportó y el Consejo.
               Ofrecer aquí el botón de pedirla sería mandar a alguien a un «no
               encontrado» que el servidor ya tiene decidido. */
            <div className={styles.missing}>
              <CategoryIcon category={item.category} size={42} />
              <strong>La fotografía no es pública</strong>
              <span>
                La evidencia de un reporte la ven quien lo hizo y el Consejo
                Comunitario.
              </span>
            </div>
          ) : delivery === "enviado" ? (
            /* El expediente llegó al servidor, así que su fotografía está
               allí aunque este teléfono no la tenga —porque se envió desde
               otro, o porque se reinstaló la aplicación—. Se trae sola: aquí
               decía «pídela cuando la necesites», con un botón debajo, en el
               sitio exacto donde tenía que estar la fotografía. */
            <PrivateEvidence id={item.id} />
          ) : (
            <div className={styles.missing}>
              <CategoryIcon category={item.category} size={42} />
              <strong>Sin fotografía disponible</strong>
              <span>Este registro se guardó sin fotografía.</span>
            </div>
          )}
          {/* Debajo de la fotografía, la ficha del reporte. Al desplegar el
              historial esta columna se quedaba en blanco de arriba abajo, y lo
              que hay aquí es justo lo que hace falta para hablar del caso:
              cuándo fue, dónde y con qué número se nombra. */}
          <ul className="case-facts">
            <li>
              <FileText size={15} />
              <span>
                Registrado
                <strong title={item.date}>
                  {date(item.date)} · {relativeTime(item.date)}
                </strong>
              </span>
            </li>
            <li>
              <MapPin size={15} />
              <span>
                Ubicación
                <strong>
                  {item.vereda || "Sin vereda"} ·{" "}
                  {typeof item.lat === "number" && typeof item.lng === "number"
                    ? "con punto marcado"
                    : "sin punto; ubicado por el nombre"}
                </strong>
              </span>
            </li>
            {/* El número corto es con lo que se nombra el caso al Consejo, por
                radio o en una reunión: el completo son sesenta y cuatro
                caracteres que nadie dicta. */}
            <li>
              <Hash size={15} />
              <span>
                Identificador
                <strong title={item.id}>{shortId(item.id)}</strong>
              </span>
            </li>
          </ul>
          {item.assignee && (
            <p className={styles.assignee}>
              <UserRound size={17} />
              <span>
                Responsable<strong>{item.assignee}</strong>
              </span>
            </p>
          )}
        </div>
        <div className={styles.record}>
          <section>
            <h3>Descripción</h3>
            <p className={styles.description}>
              {item.description ||
                "Este reporte consta sin relato público todavía."}
            </p>
            {/* Quién escribió lo que se acaba de leer. De un reporte propio es
                obvio; del de otra persona no, y la diferencia importa: lo que
                consta de él ante la comunidad puede ser su propio relato o un
                resumen que redactó el Consejo, y en ninguno de los dos casos es
                el expediente entero. */}
            {ajeno && (
              <p className={styles.shared}>
                <Users size={15} />
                Esto es lo que consta de este reporte ante la comunidad. El
                expediente completo lo llevan quien lo reportó y el Consejo.
              </p>
            )}
          </section>
          <section>
            <div className={styles.heading}>
              <h3>Seguimiento</h3>
              <small>Hora de Bogotá</small>
            </div>
            <ol className={styles.timeline}>
              <li className={styles.done}>
                <i>
                  <Check size={12} />
                </i>
                <div>
                  <strong>Reporte registrado</strong>
                  <small>{date(item.date)}</small>
                </div>
              </li>
              {events.length > 1 && (
                <li className={styles.done}>
                  <i>
                    <Ellipsis size={12} />
                  </i>
                  <div>
                    <button
                      className="text-button"
                      aria-expanded={history}
                      onClick={() => setHistory(!history)}
                    >
                      {history
                        ? "Ocultar las actuaciones anteriores"
                        : `Ver las ${events.length - 1} actuaciones anteriores`}
                    </button>
                  </div>
                </li>
              )}
              {visible.map((event, index) => {
                const last = index === visible.length - 1;
                return (
                  <li
                    key={event.id}
                    className={last ? mark(event.status) : styles.done}
                  >
                    <i>
                      {last ? (
                        <StatusIcon status={event.status} />
                      ) : (
                        <Check size={12} />
                      )}
                    </i>
                    <div>
                      <strong>{statuses[event.status] ?? event.status}</strong>
                      <small>
                        {date(event.at)}
                        {event.actor ? ` · ${event.actor}` : ""}
                      </small>
                      <p>{event.note}</p>
                    </div>
                  </li>
                );
              })}
              {!latest && (
                <li className={mark(item.status)}>
                  <i>
                    <StatusIcon status={item.status} />
                  </i>
                  <div>
                    <strong>{statuses[item.status]}</strong>
                    <small>Estado actual del reporte</small>
                  </div>
                </li>
              )}
              {history && remote.next && (
                <li className={styles.done}>
                  <i>
                    <Ellipsis size={12} />
                  </i>
                  <div>
                    <button
                      className="text-button"
                      disabled={remote.busy}
                      onClick={remote.more}
                    >
                      Traer actuaciones más antiguas
                    </button>
                  </div>
                </li>
              )}
              {!completed && (
                <li className={styles.future}>
                  <i />
                  <div>
                    <strong>Próxima actualización</strong>
                    <small>Se mostrará cuando quede registrada.</small>
                  </div>
                </li>
              )}
            </ol>
          </section>
          <section className={styles.update}>
            <h3>
              <Info size={17} /> Última actualización
            </h3>
            <p>
              {latest?.note ??
                item.notes.at(-1) ??
                "Todavía no hay notas de seguimiento."}
            </p>
            {latest && <small>{date(latest.at)}</small>}
            {/* Aquí había un «Ver historial completo» que abría, debajo, una
                segunda copia de la línea de tiempo que está justo encima. El
                historial se despliega ahora en la propia línea, donde va cada
                actuación; esta tarjeta se queda con lo que es: el resumen. */}
            {item.notes.length > 0 && (
              <div className={styles.history}>
                {item.notes.map((note, i) => (
                  <p key={i}>{note}</p>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      {admin && <AdminEditor item={item} onChange={onChange} />}
      {/* Solo cuando hay algo que decir. De un expediente entregado ya lo
          cuentan la etiqueta de arriba y el seguimiento; repetirlo abajo era
          la tercera vez que la misma pantalla decía lo mismo. */}
      {delivery !== "enviado" && (
        <div className={`${styles.delivery} ${styles[delivery]}`}>
          <p>{deliveryNote[delivery]}</p>
          {/* Las dos salidas de un reporte que se quedó aquí: mandarlo o
            retirarlo. Solo se ofrecen para ese caso. Quitar el registro de uno
            que el Consejo ya recibió —o que está a punto de salir— no arregla
            nada y te deja sin tu copia del expediente. */}
          {delivery === "sin-enviar" &&
            (removing ? (
              <div className={styles.removal} role="group">
                <p>
                  Se quita <strong>«{item.title}»</strong> de este dispositivo.
                  Como nunca llegó al Consejo, no quedará en ninguna parte.
                </p>
                <div>
                  <button className="btn" onClick={() => setRemoving(false)}>
                    Conservarlo
                  </button>
                  <button className="btn" onClick={onRemove}>
                    <Trash2 size={16} /> Quitar de este dispositivo
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.deliveryActions}>
                {onResume && (
                  <button className="btn primary" onClick={onResume}>
                    <Send size={16} /> Retomar y enviar
                  </button>
                )}
                {onRemove && (
                  <button
                    className="text-button"
                    onClick={() => setRemoving(true)}
                  >
                    <Trash2 size={15} /> Quitar de este dispositivo
                  </button>
                )}
              </div>
            ))}
        </div>
      )}
      {/* La salvedad vale para lo que aún no llegó al Consejo. Un expediente
          entregado sí consta, y decir lo contrario en su ficha lo desmiente. */}
      {delivery !== "enviado" && (
        <p className={styles.disclaimer}>
          Registro guardado en este dispositivo. No acredita una actuación
          oficial del Consejo.
        </p>
      )}
    </div>
  );
}
