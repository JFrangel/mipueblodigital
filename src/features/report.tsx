"use client";
import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { prepareEvidence } from "@/platform/evidence";
import { toast } from "@/data/toasts";
import { enqueue, outgoingFor } from "@/data/outbox";
import { requestBackgroundSync, syncOutbox } from "@/data/sync-outbox";
import { firebaseClient } from "@/data/firebase/client";
import { VoiceInput } from "./voice-input";
import { WritingAssistant } from "./writing-assistant";
import { readDraft, writeDraft } from "@/data/local-store";
import { ArrowLeft, ArrowRight, Camera, Check, Save } from "lucide-react";
import { categories, type Case } from "@/data/catalog";
import {
  catalogueNotice,
  veredaNames,
  veredaReference,
} from "@/domain/territory";
import { VeredaPreview, type Point } from "./vereda-preview";
import { validateReport } from "@/domain/logic";
import { CategoryIcon } from "@/components/ui";
import { LeafFall } from "./leaf-fall";
const blank = { category: "", vereda: "", description: "", phone: "" };
/** Para comparar nombres como se teclean: sin tildes y en minúsculas. */
const plain = (text: string) =>
  text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export function Report({ onSave }: { onSave: (c: Case) => Promise<void> }) {
  const [data, setData] = useState(blank),
    [step, setStep] = useState(0),
    /* Paso más lejano al que se llegó: volver atrás no debe cerrar la puerta
       de vuelta. Solo sube, y `reachable` comprueba que lo anterior siga
       completo antes de dejar saltar. */
    [reached, setReached] = useState(0),
    [photos, setPhotos] = useState<string[]>([]),
    [errors, setErrors] = useState<string[]>([]),
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false),
    /* Borrador recién guardado: la pantalla lo dice y deja salir. */
    [saved, setSaved] = useState(false),
    /* Qué se hizo con la fotografía elegida. La afirmación «se envía el
       archivo original» solo es cierta cuando cabía entera; si hubo que
       reducirla, decirlo igualmente sería mentir sobre lo que viaja. Nulo
       cuando la foto viene de un borrador y no nos consta. */
    [evidence, setEvidence] = useState<{
      reduced: boolean;
      megapixels: number;
    } | null>(null),
    [busy, setBusy] = useState(false);
  const [dictating, setDictating] = useState(false);
  /* Lo escrito para acortar la lista de veredas. No es parte del reporte: se
     queda aquí y no viaja a ninguna parte. */
  const [veredaQuery, setVeredaQuery] = useState("");
  /* Sin tildes y en minúsculas por los dos lados: «vibora» tiene que
     encontrar «Víbora Paraíso», que es como se teclea de verdad. */
  const veredasShown = veredaNames.filter(
    /* La ya elegida nunca se filtra fuera: si desapareciera de la lista, el
       desplegable se quedaría en blanco y la selección se perdería sola. */
    (name) => name === data.vereda || plain(name).includes(plain(veredaQuery)),
  );
  const [receipt, setReceipt] = useState<{
    id: string;
    receivedAt: string;
  } | null>(null);
  const [queued, setQueued] = useState(false),
    [sensitive, setSensitive] = useState(false);
  /* Punto marcado a mano sobre el mapa; nulo si se deja el de la vereda. */
  const [point, setPoint] = useState<Point | null>(null);
  const draftOwner = useRef<string | undefined>(undefined);
  /* El borrador es por cuenta: cambiar de sesión descarta el de la anterior. */
  useEffect(() => {
    let active = true,
      generation = 0;
    function restore(owner?: string) {
      draftOwner.current = owner;
      const current = ++generation;
      setData(blank);
      setPhotos([]);
      setStep(0);
      setReached(0);
      setDone(false);
      setSaved(false);
      setReceipt(null);
      setQueued(false);
      setSensitive(false);
      setPoint(null);
      setEvidence(null);
      void readDraft(owner)
        .then((saved) => {
          if (active && current === generation && saved) {
            setData(saved);
            setPhotos(saved.photos);
            setSensitive(saved.sensitive === true);
            if (typeof saved.lat === "number" && typeof saved.lng === "number")
              setPoint({ lat: saved.lat, lng: saved.lng });
            /* Se vuelve al primer paso que quedó a medias, no al principio.
               Guardar un borrador para enviarlo después no sirve de nada si
               al volver hay que recorrer otra vez los pasos ya llenos. */
            const completo = [
              Boolean(saved.category),
              Boolean(saved.vereda),
              Boolean(saved.description?.trim()) && saved.photos.length > 0,
            ];
            const donde = completo.every(Boolean)
              ? 3
              : completo.findIndex((paso) => !paso);
            setStep(donde);
            setReached(donde);
          }
        })
        .catch(() => {
          if (active) setErrors(["El borrador no se pudo recuperar."]);
        });
    }
    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(firebaseClient().auth, (user) =>
        restore(user?.uid),
      );
    } catch {
      queueMicrotask(() => restore());
    }
    return () => {
      active = false;
      generation++;
      unsubscribe();
    };
  }, []);
  async function submitRemote() {
    if (saving.current) return;
    const validation = validateReport({ ...data, photos: photos.length });
    if (validation.length) {
      setErrors(validation);
      return;
    }
    saving.current = true;
    setBusy(true);
    setErrors([]);
    try {
      const { auth } = firebaseClient();
      await auth.authStateReady();
      const uid = auth.currentUser?.uid;
      if (!uid)
        throw new Error(
          "Inicia sesión antes de preparar envíos para el Consejo.",
        );
      const entry = await enqueue(uid, {
        ...data,
        photo: photos[0],
        sensitive,
        ...(point ?? {}),
      });
      // Si el envío no sale ahora, el navegador lo reintentará al volver la señal.
      void requestBackgroundSync();
      await syncOutbox(
        uid,
        () => firebaseClient().auth.currentUser?.uid === uid,
        /* Sin anuncio: quien reporta está mirando esta pantalla y el recibo
           aparece aquí mismo. Los avisos son para lo que sale después, cuando
           vuelve la señal y ya nadie está delante. */
        false,
      );
      const updated = (await outgoingFor(uid)).find((e) => e.key === entry.key);
      if (firebaseClient().auth.currentUser?.uid !== uid) return;
      if (updated?.receipt) setReceipt(updated.receipt);
      else setQueued(true);
      /* Espejo local del envío: sin esto, quien reporta no vuelve a ver su
         caso en el mapa ni en las cifras, porque el listado de la aplicación
         lee del dispositivo. No es una copia inventada: es el mismo reporte
         que acaba de salir, con su recibo cuando lo hay. */
      const reference = veredaReference(data.vereda);
      await onSave({
        id: updated?.receipt?.id ?? `LOCAL-${entry.key}`,
        title: data.description.trim().slice(0, 70),
        ...data,
        /* Solo el punto que exista de verdad: el marcado a mano, o el
           documentado de la vereda. Ninguno, si la vereda no tiene. */
        lat: point?.lat ?? reference?.lat,
        lng: point?.lng ?? reference?.lng,
        status: "pendiente",
        date: new Date().toISOString(),
        owner: "propio",
        /* Con recibo ya está en el Consejo; sin él espera señal en la bandeja
           de salida, que no es lo mismo que un borrador: este sale solo. */
        delivery: updated?.receipt
          ? ("enviado" as const)
          : ("en-cola" as const),
        notes: [
          updated?.receipt
            ? `Recibido por el Consejo el ${new Date(updated.receipt.receivedAt).toLocaleString("es-CO")}.`
            : "En la bandeja de salida. Se enviará al volver la señal.",
        ],
        photo: photos[0],
      }).catch(() => undefined);
      setDone(true);
      await writeDraft(null, uid).catch(() => undefined);
    } catch (error) {
      /* La respuesta a «¿se envió?» tiene que ser la primera palabra. El
         motivo viene detrás; sin el «no se envió» delante, un aviso técnico
         deja a quien reportó sin saber si tiene que volver a intentarlo. */
      setErrors([
        `No se envió. ${
          error instanceof Error
            ? error.message
            : "No se pudo confirmar el envío; el reporte sigue aquí para que lo reintentes."
        }`,
      ]);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const saving = useRef(false);
  const words = data.description.trim()
    ? data.description.trim().split(/\s+/).length
    : 0;
  /* Estado real de cada paso: si se borra la categoría, «Detalles» deja de ser
     alcanzable aunque ya se hubiera visitado. */
  const pending = validateReport({ ...data, photos: photos.length });
  const filled = [
    !pending.includes("Selecciona una categoría."),
    !pending.includes("Selecciona una vereda."),
    pending.length === 0,
  ];
  const reachable = (i: number) =>
    i <= step || (i <= reached && filled.slice(0, i).every(Boolean));
  function next() {
    const all = validateReport({ ...data, photos: photos.length });
    const current =
      step === 0
        ? all.filter((e) => e === "Selecciona una categoría.")
        : step === 1
          ? all.filter((e) => e === "Selecciona una vereda.")
          : all;
    if (current.length) {
      setErrors(current);
      return;
    }
    setErrors([]);
    setStep(step + 1);
    setReached((far) => Math.max(far, step + 1));
  }
  async function draft() {
    try {
      await writeDraft(
        { ...data, photos, sensitive, ...(point ?? {}) },
        draftOwner.current,
      );
      /* Guardado el borrador, seguir en el formulario no tiene sentido: lo que
         se quería era dejarlo para luego. La pantalla lo confirma y ofrece las
         dos únicas salidas que existen desde aquí. */
      setSaved(true);
      setMessage("");
      setErrors([]);
      toast("Guardado como borrador en este dispositivo.");
    } catch {
      const dicho = "No se pudo guardar. Conserva el texto antes de salir.";
      setErrors([dicho]);
      toast(dicho, "error");
    }
  }
  const [preparing, setPreparing] = useState(false);
  const uploadVersion = useRef(0);
  /* El formulario es largo y el botón vive al final: un aviso que aparece
     fuera de la pantalla es un aviso que nadie lee. */
  const errorBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (errors.length)
      errorBox.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [errors]);
  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const version = ++uploadVersion.current;
    setPreparing(true);
    setErrors([]);
    try {
      const prepared = await prepareEvidence(file);
      if (version === uploadVersion.current) {
        setPhotos([prepared.dataUrl]);
        setEvidence({
          reduced: prepared.reduced,
          megapixels: prepared.megapixels,
        });
        /* Si hubo que reducirla, hay que decirlo: quien reporta tiene derecho a
           saber que lo que viaja no es exactamente el archivo que eligió. */
        setMessage(
          prepared.reduced
            ? `La fotografía era demasiado grande y se ajustó a ${prepared.megapixels} megapíxeles para poder enviarla.`
            : "",
        );
      }
    } catch (error) {
      if (version === uploadVersion.current)
        setErrors([
          error instanceof Error
            ? error.message
            : "No se pudo preparar la fotografía.",
        ]);
    } finally {
      if (version === uploadVersion.current) setPreparing(false);
    }
  }
  if (saved)
    return (
      <div className="panel draft-saved" role="status">
        <span className="draft-mark" aria-hidden="true">
          <Save size={20} />
        </span>
        <div>
          <span className="eyebrow">GUARDADO COMO BORRADOR</span>
          <h2>Tu reporte te espera.</h2>
          <p>
            Se queda en este dispositivo con la fotografía y el punto del mapa.
            <strong> No sale hasta que tú lo envíes</strong>, y solo se guarda
            uno por cuenta: al volver a Reportar continúas por donde ibas.
          </p>
          <div className="draft-actions">
            <Link className="btn primary" href="/mis-reportes/">
              Ver mis reportes <ArrowRight size={16} />
            </Link>
            <button className="text-button" onClick={() => setSaved(false)}>
              Seguir editándolo
            </button>
          </div>
        </div>
      </div>
    );
  if (done)
    return (
      <div className="success panel report-success">
        <LeafFall />
        <span className="success-mark">
          <Check size={34} />
        </span>
        <span className="eyebrow">
          {receipt
            ? "RECEPCIÓN CONFIRMADA"
            : queued
              ? "CONSERVADO EN TU BANDEJA DE SALIDA"
              : "GUARDADO EN ESTE DISPOSITIVO"}
        </span>
        <h1>Tu reporte ya tiene un lugar.</h1>
        <p>
          {receipt
            ? `El servidor recibió tu reporte el ${new Date(receipt.receivedAt).toLocaleString("es-CO")}. Está pendiente de revisión.`
            : queued
              ? "El reporte está guardado para enviar. Consulta Mis envíos: se reintentará con conexión y tu sesión activa. Todavía no hay confirmación del Consejo."
              : "Se guardó en este dispositivo. Todavía no se ha enviado al Consejo."}
        </p>
        <Link className="btn primary" href="/mis-reportes/">
          Ver mis reportes <ArrowRight size={17} />
        </Link>
      </div>
    );
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">CUIDEMOS LO NUESTRO</span>
          <h1>Cuéntanos qué está pasando.</h1>
          <p>Un reporte claro es el primer paso para darle seguimiento.</p>
        </div>
        <button className="btn" onClick={draft}>
          <Save size={16} /> Guardar borrador
        </button>
      </div>
      <div className="report-layout">
        <section className="panel report-form">
          {busy && <LeafFall count={7} drifting />}
          {/* Se puede ir y venir por los pasos ya recorridos mientras sus
              campos sigan completos. Los que nunca se abrieron esperan, porque
              todavía no se ha validado nada de ellos. */}
          <ol className="steps">
            {["Tipo", "Ubicación", "Detalles", "Revisar"].map((label, i) => (
              <li key={label} className={i <= step ? "active" : ""}>
                <button
                  type="button"
                  disabled={!reachable(i) || busy || dictating}
                  aria-current={i === step ? "step" : undefined}
                  onClick={() => {
                    setStep(i);
                    setErrors([]);
                  }}
                >
                  <span>
                    {i !== step && filled[i] ? <Check size={16} /> : i + 1}
                  </span>
                  {label}
                </button>
              </li>
            ))}
          </ol>
          {step === 0 && (
            <>
              <h2>¿Qué tipo de situación es?</h2>
              <p>Elige la categoría que mejor describa el problema.</p>
              <div className="category-grid">
                {categories.map((c) => (
                  <button
                    className={
                      data.category === c.id ? "category selected" : "category"
                    }
                    key={c.id}
                    onClick={() => setData({ ...data, category: c.id })}
                  >
                    <CategoryIcon category={c.id} size={28} />
                    <strong>{c.name}</strong>
                    <small>{c.description}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2>¿Dónde está ocurriendo?</h2>
              <p>
                Selecciona la vereda o el centro poblado más cercano al lugar de
                la situación.
              </p>
              <label className="field-label">
                Vereda
                {/* Escribir acorta la lista. Dieciocho veredas en un
                    desplegable obligan a recorrerlo entero, y en una ventana
                    baja el desplegable se abre con media lista fuera de la
                    pantalla. Queda un desplegable —así el nombre siempre sale
                    del catálogo y el mapa puede agrupar por él—, pero se llega
                    a cualquiera con dos letras. */}
                <input
                  type="search"
                  className="vereda-filter"
                  value={veredaQuery}
                  aria-label="Buscar vereda por nombre"
                  placeholder="Escribe para acortar la lista…"
                  onChange={(e) => setVeredaQuery(e.target.value)}
                />
                <select
                  aria-label="Vereda"
                  value={data.vereda}
                  onChange={(e) => {
                    // Otro sitio, otro punto: el ajuste anterior ya no aplica.
                    setPoint(null);
                    setData({ ...data, vereda: e.target.value });
                  }}
                >
                  <option value="">Seleccionar vereda</option>
                  {veredasShown.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                {veredaQuery.trim() && (
                  <small className="muted">
                    {veredasShown.length === 0
                      ? "Ninguna vereda se llama así. Borra la búsqueda para ver todas."
                      : `${veredasShown.length} de ${veredaNames.length} veredas.`}
                  </small>
                )}
                <small className="muted">{catalogueNotice}</small>
              </label>
              {/* Remontar al cambiar de vereda reinicia el mapa y su estado. */}
              <VeredaPreview
                key={data.vereda}
                vereda={data.vereda}
                point={point}
                onPoint={setPoint}
              />
            </>
          )}
          {step === 2 && (
            <>
              <h2>Los detalles hacen la diferencia.</h2>
              <label className="field-label">
                Descripción
                <textarea
                  aria-label="Descripción"
                  readOnly={dictating}
                  rows={5}
                  placeholder="Describe qué ocurrió, cuándo y cómo afecta a tu comunidad."
                  value={data.description}
                  onChange={(e) =>
                    setData({ ...data, description: e.target.value })
                  }
                />
              </label>
              {/* Contador y ayuda de redacción comparten fila: son las dos
                  respuestas a «cómo voy con el texto». */}
              <div className="composer-meta">
                <small className={words > 500 ? "error-text" : "muted"}>
                  {words} / 500 palabras
                </small>
                <WritingAssistant
                  value={data.description}
                  disabled={dictating}
                  onAccept={(description) =>
                    setData((current) => ({ ...current, description }))
                  }
                />
              </div>
              <VoiceInput
                value={data.description}
                onListening={setDictating}
                onChange={(description) =>
                  setData((current) => ({ ...current, description }))
                }
              />
              <label className="field-label">
                Evidencia fotográfica *
                <span className="upload-box">
                  <Camera />
                  <strong>
                    {photos.length
                      ? "Fotografía adjunta · cambiar"
                      : "Añadir una fotografía"}
                  </strong>
                  <small>JPG, PNG o WebP · hasta 10 MB</small>
                  <input
                    aria-label="Evidencia fotográfica"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => void upload(e.target.files)}
                  />
                </span>
              </label>
              {preparing && <p role="status">Preparando fotografía…</p>}
              {photos[0] && (
                <div className="evidence-preview">
                  {/* Preserve the original data URL without optimizer diagnostics. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photos[0]}
                    width={600}
                    height={360}
                    alt="Vista previa de la fotografía del reporte"
                    className="evidence-image"
                  />
                  <button
                    className="btn"
                    onClick={() => {
                      uploadVersion.current++;
                      setPreparing(false);
                      setPhotos([]);
                      setEvidence(null);
                    }}
                  >
                    Quitar fotografía
                  </button>
                  {evidence && (
                    <small>
                      {evidence.reduced
                        ? `Reducida a ${evidence.megapixels} megapíxeles para caber en el envío. Por lo demás, la misma fotografía.`
                        : "Archivo original conservado sin compresión ni cambio de resolución."}
                    </small>
                  )}
                </div>
              )}
              <label className="field-label">
                Celular de contacto <span className="muted">(opcional)</span>
                <input
                  value={data.phone}
                  inputMode="numeric"
                  onChange={(e) => setData({ ...data, phone: e.target.value })}
                />
              </label>
              <label className="field-label">
                <span>
                  <input
                    type="checkbox"
                    checked={sensitive}
                    onChange={(e) => setSensitive(e.target.checked)}
                  />{" "}
                  Contiene imágenes o información sensible
                </span>
                <small>
                  Por ejemplo, lesiones, menores o personas identificables. Si
                  lo marcas, el reporte no aparece en el historial de la
                  comunidad. Si no, a las 24 horas constará allí con su
                  categoría, vereda, estado y fecha —nunca tu relato, tu
                  contacto ni la fotografía, que solo ve el Consejo—.
                </small>
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <h2>Revisa antes de enviar.</h2>
              {/* En pantalla ancha la ficha va a un lado y la fotografía al
                  otro: con todo en una columna, la mitad derecha quedaba en
                  blanco justo donde más se mira antes de enviar. */}
              <div className="review">
                <div className="review-data">
                  <small>Categoría</small>
                  <strong>
                    {categories.find((c) => c.id === data.category)?.name}
                  </strong>
                  <small>Vereda</small>
                  <strong>{data.vereda}</strong>
                  <small>Descripción</small>
                  <p>{data.description}</p>
                </div>
                <div className="review-evidence">
                  <small>Evidencia</small>
                  {/* La fotografía, no su recuento: es lo único del resumen que
                    no se puede comprobar leyendo, y es lo que va a salir del
                    teléfono. Verla aquí es la última ocasión de notar que se
                    coló la equivocada. */}
                  {photos[0] ? (
                    <figure className="review-photo">
                      {/* Se conserva el archivo original tal cual. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photos[0]}
                        alt="Vista previa de la fotografía que se enviará"
                        className="evidence-image"
                      />
                      {evidence && (
                        <figcaption>
                          {evidence.reduced
                            ? `Ajustada a ${evidence.megapixels} megapíxeles para poder enviarla.`
                            : "Se envía el archivo original, sin recomprimir."}
                        </figcaption>
                      )}
                    </figure>
                  ) : (
                    <strong>Sin fotografía</strong>
                  )}
                </div>
              </div>
              {/* Una sola nota. Había dos, las dos empezando por «Al enviar» y
                  las dos explicando el reintento sin señal; una de ellas
                  ofrecía además guardar una demo local, que ya no existe. Lo
                  que sobraba tampoco tocaba aquí: el límite de la bandeja lo
                  dice la bandeja, y que no se inventan coordenadas lo dice el
                  paso de la ubicación. */}
              <div className="notice">
                <p>
                  Sale de aquí tu descripción, la vereda, la fotografía original
                  y el contacto si lo dejaste. Nada más. El servidor responde
                  con un recibo y su fecha.
                </p>
                <p>
                  ¿Sin señal? El reporte espera en tu bandeja de salida y{" "}
                  <strong>sale solo</strong> en cuanto haya red. ¿Todavía no
                  quieres enviarlo? <strong>Guardar borrador</strong> lo deja
                  tal cual, y ese no sale hasta que tú lo mandes.
                </p>
              </div>
            </>
          )}
          {errors.length > 0 && (
            <div className="errors" role="alert" ref={errorBox}>
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          <div className="form-actions">
            <button
              className="btn"
              disabled={step === 0 || busy || dictating}
              onClick={() => {
                setStep(step - 1);
                setErrors([]);
              }}
            >
              <ArrowLeft size={16} /> Atrás
            </button>
            {step < 3 ? (
              <button
                className="btn primary"
                disabled={preparing || dictating}
                onClick={next}
              >
                Continuar <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="btn primary"
                disabled={busy || preparing}
                onClick={() => void submitRemote()}
              >
                {busy ? "Confirmando…" : "Enviar al Consejo"}{" "}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </section>
        <aside className="report-aside">
          <span className="eyebrow">UN BUEN REPORTE</span>
          <h2>Tu contexto ayuda.</h2>
          <p>Cuenta lo que observaste con tus propias palabras.</p>
          <ul>
            <li>Explica dónde y cuándo ocurrió.</li>
            <li>Añade una foto útil y segura.</li>
            <li>Evita datos personales de terceros.</li>
            <li>Revisa el reporte antes de enviarlo.</li>
          </ul>
          <div className="aside-divider" />
          <h3>¿Y la IA?</h3>
          <p>
            Puedes solicitar una propuesta de redacción con tu cuenta
            verificada. Siempre podrás revisar los cambios y continuar sin ella.
          </p>
          <Link href="/documentacion/">Conocer cómo funciona →</Link>
        </aside>
      </div>
    </>
  );
}
