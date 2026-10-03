"use client";
import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { prepareEvidence } from "@/platform/evidence";
import { toast } from "@/data/toasts";
import { SIN_CUENTA, enqueue, outgoingFor } from "@/data/outbox";
import { requestBackgroundSync, syncOutbox } from "@/data/sync-outbox";
import { firebaseClient } from "@/data/firebase/client";
import { VoiceInput } from "./voice-input";
import { WritingAssistant } from "./writing-assistant";
import { readDraft, writeDraft } from "@/data/local-store";
import { adoptar, marcar } from "@/data/sin-cuenta";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Files,
  MapPinPlus,
  Save,
} from "lucide-react";
import { categories, type Case } from "@/data/catalog";
import {
  catalogueNotice,
  veredaNames,
  veredaReference,
  localityLabel,
  localitySearchText,
} from "@/domain/territory";
import { VeredaPreview, type Point } from "./vereda-preview";
import { comoLaDelCatalogo } from "@/domain/veredas";
import { validateReport } from "@/domain/logic";
import { CategoryIcon } from "@/components/ui";
import { LeafFall } from "./leaf-fall";
import { registrar } from "@/platform/push";
import { stageNativeOutgoing } from "@/platform/native-outbox";
import { esNativo } from "@/platform/native";
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
  /**
   * Cuando la vereda no está en la lista.
   *
   * Seis de las dieciocho del catálogo no tienen punto, y el catálogo mismo
   * —EOT de 2007 y fuentes abiertas— se declara pendiente de validación. Quien
   * vive en una vereda que ese documento no nombró no podía reportar: se
   * quedaba fuera de su propia aplicación por un papel de hace diecinueve años.
   */
  const [veredaFuera, setVeredaFuera] = useState(false);
  const [veredaEscrita, setVeredaEscrita] = useState("");
  /* Sin tildes y en minúsculas por los dos lados: «vibora» tiene que
     encontrar «Víbora Paraíso», que es como se teclea de verdad. */
  const veredasShown = veredaNames.filter(
    /* La ya elegida nunca se filtra fuera: si desapareciera de la lista, el
       desplegable se quedaría en blanco y la selección se perdería sola. */
    (name) =>
      name === data.vereda ||
      plain(localitySearchText(name)).includes(plain(veredaQuery)),
  );
  const [receipt, setReceipt] = useState<{
    id: string;
    receivedAt: string;
  } | null>(null);
  const [queued, setQueued] = useState(false),
    [sensitive, setSensitive] = useState(false);
  const [nativeQueuedReady, setNativeQueuedReady] = useState(true);
  /* Punto marcado a mano sobre el mapa; nulo si se deja el de la vereda. */
  const [point, setPoint] = useState<Point | null>(null);
  const router = useRouter();
  const draftOwner = useRef<string | undefined>(undefined);
  const [draftReady, setDraftReady] = useState(false);
  const [autoSave, setAutoSave] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const draftWrites = useRef<Promise<void>>(Promise.resolve());
  const draftSnapshot = useRef<Parameters<typeof writeDraft>[0]>(null);
  const draftTouched = useRef(false);
  const draftVersion = useRef(0);
  const queueDraft = (
    value: Parameters<typeof writeDraft>[0],
    owner?: string,
  ) => {
    const next = draftWrites.current
      .catch(() => undefined)
      .then(() => writeDraft(value, owner));
    draftWrites.current = next;
    return next;
  };
  /* El borrador es por cuenta: cambiar de sesión descarta el de la anterior. */
  useEffect(() => {
    let active = true,
      generation = 0;
    function restore(owner?: string) {
      draftVersion.current++;
      draftSnapshot.current = null;
      draftTouched.current = false;
      setDraftReady(false);
      setAutoSave("idle");
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
      setNativeQueuedReady(true);
      setSensitive(false);
      setPoint(null);
      setEvidence(null);
      /* Si esta persona acaba de entrar tras haber preparado reportes sin
         cuenta, esos reportes pasan ahora a su nombre y salen solos con la
         siguiente sincronización. Ver sin-cuenta.ts para por qué el traspaso va
         atado a ese flujo y no a cualquier cosa que estuviera esperando. */
      void (owner ? adoptar(owner) : Promise.resolve(0))
        .then((traspasados) => {
          if (traspasados > 0 && active && current === generation)
            /* Un aviso que se queda, no uno flotante que se va a los tres
               segundos: es la respuesta a «¿y lo que escribí antes?». */
            setMessage(
              traspasados === 1
                ? "Tu reporte pasó a tu cuenta y sale con la próxima conexión. Lo sigues en la bandeja de envíos."
                : `Tus ${traspasados} reportes pasaron a tu cuenta y salen con la próxima conexión. Los sigues en la bandeja de envíos.`,
            );
          return readDraft(owner);
        })
        .then((saved) => {
          if (!active || current !== generation) return;
          if (saved) {
            setData(saved);
            setPhotos(saved.photos);
            setSensitive(saved.sensitive === true);
            if (typeof saved.lat === "number" && typeof saved.lng === "number")
              setPoint({
                lat: saved.lat,
                lng: saved.lng,
                /* Ver el comentario del borrador: sin constancia, «mano». */
                pointSource: saved.pointSource ?? "mano",
                pointAccuracy: saved.pointAccuracy ?? null,
              });
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
          setDraftReady(true);
        })
        .catch(() => {
          if (active && current === generation) {
            setErrors([
              "El borrador no se pudo recuperar. Escribe de nuevo y guardaremos lo que avances.",
            ]);
            setDraftReady(true);
          }
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
  /* Cada cambio sustancial queda en IndexedDB sin exigir el botón. La cadena
     ordena las escrituras: una fotografía grande puede tardar más que un cambio
     de texto posterior, y jamás debe terminar pisándolo. */
  useEffect(() => {
    if (!draftReady || done || saved || busy) return;
    const meaningful = Boolean(
      data.category ||
      data.vereda ||
      data.description.trim() ||
      data.phone.trim() ||
      photos.length ||
      point,
    );
    if (!meaningful && !draftTouched.current) return;
    const snapshot = meaningful
      ? { ...data, photos, sensitive, ...(point ?? {}) }
      : null;
    draftTouched.current = true;
    draftSnapshot.current = snapshot;
    const owner = draftOwner.current;
    const version = draftVersion.current;
    const timer = window.setTimeout(() => {
      if (version !== draftVersion.current) return;
      if (snapshot) setAutoSave("saving");
      void queueDraft(snapshot, owner)
        .then(() => {
          if (version === draftVersion.current)
            setAutoSave(snapshot ? "saved" : "idle");
        })
        .catch(() => {
          if (version === draftVersion.current) setAutoSave("error");
        });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [data, photos, sensitive, point, draftReady, done, saved, busy]);
  /* Al pasar a otra aplicación, no esperamos al temporizador. Si Android mata
     el proceso durante la pausa, el último cambio ya habrá empezado a guardarse. */
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState !== "hidden" || !draftReady || done) return;
      if (draftTouched.current)
        void queueDraft(draftSnapshot.current, draftOwner.current).catch(
          () => undefined,
        );
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [draftReady, done]);
  /* Navegar a otra ruta no siempre oculta la ventana; conserva el último
     cambio también al desmontar el formulario. */
  useEffect(
    () => () => {
      if (draftTouched.current)
        void queueDraft(draftSnapshot.current, draftOwner.current).catch(
          () => undefined,
        );
    },
    [],
  );
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
      /**
       * Sin sesión no se pierde nada de lo escrito.
       *
       * Antes esto lanzaba un error y ahí se quedaba: el formulario seguía en
       * pantalla, pero lo escrito solo vivía en la memoria de esa pestaña. Quien
       * se iba a entrar —que es lo que el propio mensaje le pedía— volvía con
       * todo en blanco, incluida la fotografía. Pedirle a alguien que escriba
       * dos veces lo que acaba de pasarle en el río es la mejor forma de que no
       * lo escriba una tercera.
       *
       * Ahora va a la bandeja de envíos a nombre de nadie y espera ahí. Van
       * a la bandeja y no a un borrador por una razón práctica: el borrador es
       * uno solo, así que el segundo reporte pisaba al primero sin avisar. La
       * bandeja es una lista, y admite varios.
       *
       * Al entrar pasan todos a su nombre y salen con la siguiente
       * sincronización, sin tener que volver a escribirlos ni mandarlos uno por
       * uno. Ver sin-cuenta.ts.
       */
      if (!uid) {
        await enqueue(SIN_CUENTA, {
          ...data,
          photo: photos[0],
          sensitive,
          ...(point ?? {}),
        });
        marcar();
        /* Y el borrador se limpia: el reporte ya está entero en la bandeja, y
           dejarlo también aquí haría que al volver el formulario apareciera
           lleno como si no se hubiera guardado nada. */
        draftVersion.current++;
        draftSnapshot.current = null;
        draftTouched.current = false;
        await draftWrites.current.catch(() => undefined);
        await writeDraft(null).catch(() => undefined);
        setDone(true);
        toast("Guardamos tu reporte. Entra a tu cuenta y lo enviamos por ti.");
        router.push("/acceso/?volver=reporte");
        return;
      }
      const payload = {
        ...data,
        photo: photos[0],
        sensitive,
        ...(point ?? {}),
      };
      const entry = await enqueue(uid, payload);
      /* WorkManager necesita una copia privada del envío para poder despertar
         sin esta ventana. Conserva exactamente el mismo requestId. */
      const nativeReady = await stageNativeOutgoing(entry, payload);
      setNativeQueuedReady(nativeReady || !esNativo());
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
      draftVersion.current++;
      draftSnapshot.current = null;
      draftTouched.current = false;
      /**
       * El único momento en que pedir el permiso de avisos tiene sentido.
       *
       * Acaba de mandar algo y le importa la respuesta: ahí entiende para qué
       * sirve y dice que sí. Pedirlo al abrir la aplicación es pedirlo a
       * ciegas, y en Android 13 en adelante un «no» dicho a destiempo obliga a
       * entrar en los ajustes del sistema para deshacerlo.
       *
       * Con `void` porque el reporte ya está enviado y esto no puede retrasar
       * la confirmación. Si el reporte se quedó en la cola por falta de señal,
       * el permiso se concede igual y el aparato se apunta en el siguiente
       * arranque con red: de eso se encarga `refrescar()`.
       */
      void registrar();
      await draftWrites.current.catch(() => undefined);
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
  /* Antes de crear nada, buscar: si es una del catálogo escrita de otra
     manera, se ofrece esa. Sin esto, «Bellavista», «Bella Vista» y
     «bellavista» acaban siendo tres sitios en el mapa y tres columnas en las
     cifras, que es una lección que la bandeja del Consejo ya arrastra. */
  const sugerida = veredaFuera
    ? comoLaDelCatalogo(veredaEscrita, veredaNames)
    : null;
  /* Una vereda propuesta necesita el punto del aparato: un topónimo sin
     coordenada no se puede situar ni contrastar. Se dice **aquí**, y no al
     final con un error del servidor, que llegaría después de escribirlo todo. */
  const faltaUbicacion =
    veredaFuera &&
    !sugerida &&
    veredaEscrita.trim().length > 1 &&
    point?.pointSource !== "aparato";
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
          ? [
              ...all.filter((e) => e === "Selecciona una vereda."),
              ...(faltaUbicacion
                ? [
                    "Para proponer una vereda que no está en la lista, usa tu ubicación desde el sitio.",
                  ]
                : []),
            ]
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
      await queueDraft(
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
  // No se puede editar hasta recuperar la cuenta y su borrador: una respuesta
  // tardía de Auth/IndexedDB podría borrar una categoría elegida al abrir.
  if (!draftReady)
    return (
      <section className="panel report-form" aria-busy="true" role="status">
        <p>Preparando tu reporte y recuperando el avance guardado…</p>
      </section>
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
              ? nativeQueuedReady
                ? esNativo()
                  ? "El reporte está guardado para enviar. Android reintentará al volver la conexión aunque la app esté cerrada. Consulta Mis envíos para ver el recibo."
                  : "El reporte está guardado para enviar. En el navegador se reintentará al volver la conexión mientras la página esté abierta, o cuando regreses."
                : "El reporte está guardado. El envío con la app cerrada no se activó en este dispositivo; se reintentará cuando abras la app con conexión y tu sesión."
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
          {autoSave !== "idle" && (
            <small className="report-autosave" role="status" aria-live="polite">
              {autoSave === "saving"
                ? "Guardando avance…"
                : autoSave === "saved"
                  ? "Avance guardado en este dispositivo · puedes continuar después"
                  : "No se pudo guardar el avance. Usa Guardar borrador antes de salir."}
            </small>
          )}
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
              {/**
               * Dos maneras de contestar la misma pregunta, y **solo una a la
               * vez**. Estaban las dos en pantalla: al escribir el nombre de tu
               * vereda seguían ahí el buscador y el desplegable, que ya no
               * pintaban nada, y el paso entero se leía como una pila de campos
               * sueltos en vez de como una pregunta.
               */}
              {veredaFuera ? (
                <label className="field-label">
                  Nombre de tu vereda
                  <input
                    type="text"
                    aria-label="Nombre de tu vereda"
                    placeholder="Escríbelo como lo dicen allá…"
                    maxLength={60}
                    autoFocus
                    value={veredaEscrita}
                    onChange={(e) => {
                      const escrito = e.target.value;
                      setVeredaEscrita(escrito);
                      /* La vereda del reporte es lo escrito hasta que el
                         catálogo diga otra cosa; eso lo decide quien reporta
                         pulsando la sugerencia, no esta pantalla por su cuenta. */
                      setData({ ...data, vereda: escrito.trim() });
                    }}
                  />
                </label>
              ) : (
                <label className="field-label">
                  Vereda o cabecera municipal
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
                    <option value="">Seleccionar vereda o cabecera</option>
                    {veredasShown.map((v) => (
                      <option key={v} value={v}>
                        {localityLabel(v)}
                      </option>
                    ))}
                  </select>
                  {veredaQuery.trim() && (
                    <small className="muted">
                      {veredasShown.length === 0
                        ? "Ninguna vereda se llama así. Borra la búsqueda para ver todas."
                        : `${veredasShown.length} de ${veredaNames.length} lugares.`}
                    </small>
                  )}
                </label>
              )}
              {/**
               * La advertencia del catálogo y la salida, en el mismo sitio.
               *
               * Iban sueltas: un párrafo largo sobre el EOT de 2007 en medio de
               * la pantalla y, debajo, un botón que no se sabía de dónde salía.
               * Son **la misma idea** —esta lista no es la última palabra sobre
               * cómo se llama el territorio de nadie— y leerlas juntas es lo que
               * hace que la salida se entienda sin explicarla.
               */}
              <div className="vereda-salida">
                {veredaFuera ? (
                  sugerida ? (
                    <>
                      <p>
                        <strong>{sugerida}</strong> ya está en la lista. Es la
                        misma escrita de otra manera.
                      </p>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setVeredaFuera(false);
                          setVeredaEscrita("");
                          setVeredaQuery("");
                          setPoint(null);
                          setData({ ...data, vereda: sugerida });
                        }}
                      >
                        Usar «{sugerida}»
                      </button>
                    </>
                  ) : (
                    /* Aquí no va nada: la tarjeta de abajo ya lo dice, y lo
                       dice con el botón al lado. Decirlo dos veces empuja fuera
                       de la pantalla justo lo que hay que pulsar. */
                    <p>
                      Con tu ubicación y la de otros reportes, tu vereda entra
                      al mapa con su nombre.
                    </p>
                  )
                ) : (
                  <p>{catalogueNotice}</p>
                )}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    const abre = !veredaFuera;
                    setVeredaFuera(abre);
                    setVeredaEscrita("");
                    setPoint(null);
                    setData({ ...data, vereda: "" });
                    if (!abre) setVeredaQuery("");
                  }}
                >
                  <MapPinPlus size={15} />
                  {veredaFuera
                    ? "Buscar en la lista"
                    : "Mi vereda no está en la lista"}
                </button>
              </div>
              {/* Remontar al cambiar de vereda reinicia el mapa y su estado. */}
              <VeredaPreview
                key={data.vereda}
                vereda={data.vereda}
                point={point}
                onPoint={setPoint}
                proponiendo={veredaFuera}
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
                  <small>Hasta 10 MB</small>
                  <input
                    aria-label="Evidencia fotográfica"
                    type="file"
                    accept="image/*"
                    onChange={(e) => void upload(e.target.files)}
                  />
                </span>
              </label>
              {/**
               * Las otras dos maneras de traer la fotografía.
               *
               * El cuadro de arriba abre el **selector de fotos** de Android, y
               * ahí está el problema: entrega una referencia a la imagen que a
               * veces ya no sirve cuando se va a leer. Pasa con fotos que viven
               * en la nube, y con algunas galerías sin más. La aplicación no
               * puede arreglarlo desde dentro.
               *
               * Lo que sí puede es ofrecer los dos caminos que no dependen de
               * ese selector:
               *
               * - La **cámara**, que deja la foto recién hecha en el aparato.
               * - El **explorador de archivos**, que entrega una ruta de verdad
               *   en lugar de una referencia prestada. Va sin `accept` a
               *   propósito: es lo que hace que Android abra el explorador y no
               *   vuelva a abrir el selector de fotos.
               */}
              <div className="upload-alternatives">
                <label>
                  <span className="text-button">
                    <Camera size={15} /> Tomar una foto ahora
                  </span>
                  <input
                    aria-label="Tomar fotografía con la cámara"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => void upload(e.target.files)}
                  />
                </label>
                <label>
                  <span className="text-button">
                    <Files size={15} /> Buscar en mis archivos
                  </span>
                  <input
                    aria-label="Buscar la fotografía en los archivos"
                    type="file"
                    onChange={(e) => void upload(e.target.files)}
                  />
                </label>
              </div>
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
                  comunidad. Si no, el Consejo debe revisarlo, declarar seguro
                  un resumen y esperar 24 horas para compartirlo. Tu relato,
                  contacto y fotografía permanecen privados.
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
