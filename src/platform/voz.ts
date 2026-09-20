"use client";
import { esNativo } from "./native";
import { unir } from "@/domain/dictado";

/**
 * El dictado, en los dos mundos donde corre esta aplicación.
 *
 * En el navegador lo hace la API de voz del propio navegador. **Dentro del APK
 * no**, y ese fue el fallo: la ventana de Android es Chromium, así que el
 * constructor `webkitSpeechRecognition` **existe** —por eso la aplicación no
 * caía en su rama honesta de «este navegador no admite dictado»— pero detrás no
 * hay servicio de voz al que pedirle nada, y el micrófono ni siquiera estaba
 * declarado en el manifiesto, así que Android negaba la petición sin enseñar
 * ningún diálogo. La persona leía «no se autorizó el micrófono» sin haber
 * tenido nunca nada que autorizar.
 *
 * Dentro del APK se usa el reconocedor de Android, que es **el mismo motor que
 * hay detrás del micrófono del teclado**: lo que la gente del río ya usa y ya
 * sabe que funciona.
 *
 * Quien llama no se entera de nada de esto: pide escuchar y recibe trozos.
 */

/** Por qué no se puede dictar, cuando no se puede. */
export type Impedimento =
  "no-disponible" | "sin-permiso" | "sin-conexion" | "sin-voz";

/** Lo que se devuelve al empezar a escuchar: la manera de parar. */
export type Escucha = { parar: () => void };

/**
 * Cuánto se escucha como mucho.
 *
 * El reconocedor de Android se calla solo tras un silencio; el del navegador
 * sigue hasta que se le diga. Se igualan aquí para que la tarjeta pueda
 * prometer lo mismo en los dos sitios.
 */
export const TOPE_MS = 60000;

type VentanaConVoz = Window & {
  SpeechRecognition?: new () => ReconocedorWeb;
  webkitSpeechRecognition?: new () => ReconocedorWeb;
};

type ResultadoWeb = {
  resultIndex?: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type ReconocedorWeb = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: ResultadoWeb) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

/* El módulo, no el complemento. Los complementos de Capacitor son proxies que
   contestan a cualquier propiedad, `then` incluida, así que devolver uno desde
   una función `async` hace que el motor le llame `.then()` al resolver: el
   puente no lo implementa, la promesa no se resuelve nunca y el `await` de
   quien llamó se queda colgado para siempre. Ya pasó con el acceso de Google. */
const modulo = () => import("@capacitor-community/speech-recognition");

/** ¿Se puede dictar en este aparato, en principio? */
export async function disponible(): Promise<boolean> {
  if (esNativo()) {
    try {
      const { SpeechRecognition } = await modulo();
      return (await SpeechRecognition.available()).available;
    } catch {
      return false;
    }
  }
  const v = window as VentanaConVoz;
  return Boolean(v.SpeechRecognition || v.webkitSpeechRecognition);
}

/**
 * Empieza a escuchar. Va entregando la transcripción entera cada vez que
 * cambia, no los trozos sueltos: quien la pinta no tiene que juntar nada.
 */
export async function escuchar(opciones: {
  alTexto: (texto: string) => void;
  alTerminar: (motivo: Impedimento | null) => void;
}): Promise<Escucha | Impedimento> {
  return esNativo() ? nativa(opciones) : web(opciones);
}

/**
 * Qué pasó, según el reconocedor de Android.
 *
 * **Esto existe porque antes no existía.** El bucle de abajo hacía
 * `.catch(() => seguir(false))`: cualquier fallo —el reconocedor ocupado, la
 * red caída, el micrófono tomado por otra aplicación— se contaba como una
 * vuelta sin palabras, y tres vueltas sin palabras dan «no se detectó voz».
 * Como los reintentos eran inmediatos, los tres se gastaban en milisegundos: se
 * pulsaba «Activar micrófono» y la tarjeta se apagaba sola al instante,
 * diciendo que hablaras más cerca cuando el micrófono ni había llegado a
 * abrirse.
 *
 * Los textos son los que devuelve el complemento en `getErrorText`.
 */
type Suceso = Impedimento | "vacia" | "ocupado";

function queDijo(error: unknown): Suceso {
  const dicho = String((error as Error)?.message ?? error ?? "");
  if (/Insufficient permissions|Missing permission/i.test(dicho))
    return "sin-permiso";
  if (/Network|server/i.test(dicho)) return "sin-conexion";
  if (/not available|Audio recording error/i.test(dicho))
    return "no-disponible";
  /* Ocupado o error de cliente: el reconocedor de Android tarda un momento en
     soltarse cuando viene de otra escucha —o de otra aplicación—, y vuelve a
     estar listo enseguida. Reintentar es lo correcto; rendirse, no. */
  if (/busy|Client side error/i.test(dicho)) return "ocupado";
  /* «No match» y «No speech input» son la vuelta vacía de siempre: alguien
     pensando, o el final natural del dictado. */
  return "vacia";
}

/* ── El APK ───────────────────────────────────────────────────────────── */

async function nativa(opciones: {
  alTexto: (texto: string) => void;
  alTerminar: (motivo: Impedimento | null) => void;
}): Promise<Escucha | Impedimento> {
  const { SpeechRecognition } = await modulo();
  if (!(await SpeechRecognition.available()).available) return "no-disponible";
  /* Se pregunta solo si hace falta. En Android 13 en adelante un «no» dicho a
     destiempo obliga a entrar en los ajustes del sistema para deshacerlo. */
  const tiene = await SpeechRecognition.checkPermissions();
  const permiso =
    tiene.speechRecognition === "granted"
      ? tiene
      : await SpeechRecognition.requestPermissions();
  if (permiso.speechRecognition !== "granted") return "sin-permiso";

  /**
   * **`start()` no espera a nada, y sobre esa confusión estaba montado todo.**
   *
   * Con `partialResults: true` el complemento llama a `startListening` y
   * resuelve la promesa en la misma línea, sin resultado —lo dice su propio
   * `.d.ts`: «the function respond directly without result»—. El código de
   * antes leía esa resolución vacía como «esta vuelta no oyó nada», reintentaba,
   * y cada reintento hace `cancel()` y `destroy()` del reconocedor que acababa
   * de arrancar. Tres vueltas en milisegundos, el micrófono destruido antes de
   * oír una sílaba, y la tarjeta pidiendo hablar más cerca.
   *
   * Con `partialResults` todo llega por los oyentes: las transcripciones
   * provisionales y **también la final**. Y los errores del reconocedor se
   * rechazan sobre una promesa ya resuelta, así que no se ven desde aquí: por
   * eso el silencio se mide con un reloj propio y no esperando un aviso que no
   * va a venir.
   *
   * Así que `start()` significa «ya está escuchando», y el final de cada frase
   * lo dice `listeningState`.
   */
  const partes: string[] = [];
  let indice = 0;
  let vivo = true;
  /**
   * Una frase por vuelta, y cada frase en su sitio.
   *
   * **El reconocedor de Android no escucha un minuto seguido: reconoce una
   * frase y se detiene.** Quien dicta un reporte hace pausas —para pensar, para
   * mirar el derrumbe— y cada pausa cierra una vuelta. Así que se reanuda hasta
   * el tope o hasta que la persona pare.
   *
   * Y ahí está la trampa que ya nos costó dos intentos en el navegador: si cada
   * vuelta escribiera en la misma posición, la segunda frase **borraría la
   * primera** y el dictado se iría perdiendo por detrás mientras se habla. Cada
   * vuelta escribe en la suya, y `unir()` se ocupa del resto.
   */
  let vacias = 0;
  /**
   * **Cuántas vueltas en silencio se aguantan, y por qué no son las mismas
   * antes y después de haber dicho algo.**
   *
   * El reconocedor de Android reconoce una frase y se detiene, así que para
   * dictar un reporte entero hay que reabrirlo entre frase y frase. Eso es lo
   * que permite hacer pausas —para pensar, para mirar el derrumbe— y no se
   * toca.
   *
   * Lo que sí cambia es cuánto se insiste. Antes de la primera palabra
   * conviene ser paciente: quien nunca ha dictado tarda en arrancar, y cortarle
   * a los siete segundos es decirle que no funciona. Pero **después** de que ya
   * dijo algo, tres vueltas más son veintiún segundos de micrófono abriéndose
   * solo delante de alguien que ya terminó, con su aviso y su luz cada vez. Una
   * dos llegan: una deja sitio a la pausa y la siguiente cierra.
   *
   * **Una sola no puede ser**, y esto lo tumbó una prueba: con una, la primera
   * pausa termina el dictado. Tampoco se arregla esperando más en la misma
   * vuelta —el reconocedor de Android se calla solo a los cinco segundos y a
   * partir de ahí está muerto sin avisar—, así que para oír lo que venga
   * después de una pausa **hay que reabrir**. Dos es el suelo, no una
   * preferencia.
   */
  const SILENCIOS_ANTES = 3;
  const SILENCIOS_DESPUES = 2;
  let vueltas = 0;
  const VUELTAS_MAXIMAS = 60;
  /* Reintentos por «ocupado», con su propio cupo: el reconocedor de Android
     tarda un momento en soltarse cuando viene de otra escucha, y eso no es una
     vuelta vacía. La pausa es lo que separa reintentar de atragantarse. */
  let ocupados = 0;
  const OCUPADOS_MAXIMOS = 5;
  const PAUSA_MS = 400;
  /**
   * Cuánto se espera sin oír nada antes de dar la vuelta por vacía.
   *
   * Android se planta solo tras unos cinco segundos sin oír voz, y lo avisa
   * con un error que aquí no llega: se rechaza sobre una promesa ya resuelta.
   * A partir de ese momento el reconocedor está muerto y nadie lo sabe, así
   * que cada segundo de más en este reloj es un segundo en el que alguien
   * habla contra un micrófono apagado. Siete: lo justo por encima del plazo
   * de Android para no reiniciar una escucha que aún vive, y lo bastante poco
   * para que la ventana muerta no se note.
   *
   * A quien sí está hablando no le corta nada: cada transcripción y cada
   * «started» rearman el reloj.
   */
  const SILENCIO_MS = 7000;
  /**
   * **Cuánto se espera a la frase después de que Android diga que acabó.**
   *
   * `onEndOfSpeech` —el «stopped» de `listeningState`— avisa de que la persona
   * dejó de hablar, y el resultado final llega **después**, cuando el
   * reconocedor termina de procesar. Cerrar la vuelta al oír «stopped» destruye
   * el reconocedor justo antes de que entregue la frase: lo dicho se pierde, la
   * vuelta cuenta como vacía, y a las tres sale «no se detectó voz» habiendo
   * hablado. Sin micrófono esto no se ve —el «stopped» nunca llega—, así que el
   * emulador lo daba por bueno y el teléfono no.
   *
   * Dos segundos de margen, y en cuanto la frase llega se remata enseguida:
   * esperar los dos enteros con el texto ya puesto sería una pausa boba entre
   * frase y frase.
   */
  const GRACIA_MS = 2000;
  const REMATE_MS = 300;

  let relojSilencio: ReturnType<typeof setTimeout> | undefined;
  /** Se está esperando la frase que Android aún no ha entregado. */
  let enGracia = false;
  /** Si en esta vuelta llegó a oírse voz. Se reinicia en cada vuelta. */
  let huboVoz = false;
  const programar = (ms: number) => {
    clearTimeout(relojSilencio);
    if (vivo) relojSilencio = setTimeout(() => cerrarVuelta(), ms);
  };
  const rearmar = () => {
    enGracia = false;
    programar(SILENCIO_MS);
  };

  const oyenteTexto = await SpeechRecognition.addListener(
    "partialResults",
    ({ matches }) => {
      /* La primera coincidencia es la que el reconocedor considera más
         probable; las demás son alternativas y no se pintan. */
      if (!vivo || !matches?.length) return;
      partes[indice] = matches[0];
      opciones.alTexto(unir(partes));
      /* Si Android ya había dicho que la frase acabó, esto es el resultado
         final que faltaba: se cierra la vuelta enseguida, no a los dos
         segundos. Si todavía está hablando, el reloj vuelve a cero. */
      if (enGracia) programar(REMATE_MS);
      else rearmar();
    },
  );

  const oyenteEstado = await SpeechRecognition.addListener(
    "listeningState",
    ({ status }) => {
      if (!vivo) return;
      /* «started» es que empezó a oír voz: mientras alguien habla, el reloj del
         silencio no tiene por qué correr. */
      if (status === "started") {
        huboVoz = true;
        return rearmar();
      }
      /* «stopped» sin haber oído voz es el reconocedor cerrando en vacío: no
         hay ninguna frase en camino y esperar el margen solo haría perder dos
         segundos por vuelta. */
      if (!huboVoz && !partes[indice]) return cerrarVuelta();
      /* Con voz de por medio, «stopped» **no cierra la vuelta**: abre el margen
         para la frase que el reconocedor todavía está terminando de entregar. */
      enGracia = true;
      programar(GRACIA_MS);
    },
  );

  const cerrar = (motivo: Impedimento | null) => {
    if (!vivo) return;
    vivo = false;
    clearTimeout(reloj);
    clearTimeout(relojSilencio);
    void oyenteTexto.remove();
    void oyenteEstado.remove();
    void SpeechRecognition.stop().catch(() => undefined);
    opciones.alTerminar(motivo);
  };
  const reloj = setTimeout(() => cerrar(null), TOPE_MS);

  /** Se acabó una frase: se guarda si trajo algo, y se abre la siguiente. */
  const cerrarVuelta = () => {
    if (!vivo) return;
    clearTimeout(relojSilencio);
    enGracia = false;
    if (partes[indice]?.trim()) {
      indice = partes.length;
      vacias = 0;
    } else if (
      ++vacias >= (partes.length ? SILENCIOS_DESPUES : SILENCIOS_ANTES)
    ) {
      /* Sin una sola palabra en toda la escucha, el problema es el micrófono y
         se dice. Con algo dicho, el silencio es el final normal del dictado. */
      cerrar(partes.length ? null : "sin-voz");
      return;
    }
    vuelta();
  };

  const vuelta = () => {
    if (!vivo) return;
    huboVoz = false;
    if (++vueltas > VUELTAS_MAXIMAS) {
      cerrar(null);
      return;
    }
    SpeechRecognition.start({
      language: "es-CO",
      partialResults: true,
      /* Sin la ventana del sistema: el dictado ocurre dentro del formulario, a
         la vista del texto que se está escribiendo. */
      popup: false,
    })
      .then(() => {
        /* Resuelve en cuanto está escuchando, sin traer nada: lo que se oiga
           llegará por los oyentes de arriba.

           Salvo que la escucha ya se haya cerrado mientras este arranque venía
           de camino. Pasa al pulsar «Detener dictado»: `stop()` llega antes de
           que el complemento haya hecho su `startListening`, que va encolado en
           el hilo de la ventana, así que no para nada y el micrófono se abre
           **después** de haberlo apagado. Se vuelve a parar aquí. */
        if (!vivo) {
          void SpeechRecognition.stop().catch(() => undefined);
          return;
        }
        rearmar();
      })
      .catch((error: unknown) => {
        const suceso = queDijo(error);
        if (suceso === "vacia") return cerrarVuelta();
        if (suceso === "ocupado") {
          /* Agotado el cupo se cierra sin motivo: hubo micrófono, lo que no
             hubo fue turno, y eso no es culpa de quien habla. */
          if (++ocupados > OCUPADOS_MAXIMOS) return cerrar(null);
          setTimeout(vuelta, PAUSA_MS);
          return;
        }
        cerrar(suceso);
      });
  };

  vuelta();
  return { parar: () => cerrar(null) };
}

/* ── El navegador ─────────────────────────────────────────────────────── */

async function web(opciones: {
  alTexto: (texto: string) => void;
  alTerminar: (motivo: Impedimento | null) => void;
}): Promise<Escucha | Impedimento> {
  const v = window as VentanaConVoz;
  const Constructor = v.SpeechRecognition || v.webkitSpeechRecognition;
  if (!Constructor) return "no-disponible";
  /* El reconocimiento del navegador manda el audio a un servicio remoto. Sin
     red no falla: no empieza, y decirlo antes ahorra una espera en blanco. */
  if (!navigator.onLine) return "sin-conexion";

  const reconocedor = new Constructor();
  reconocedor.lang = "es-CO";
  reconocedor.continuous = true;
  reconocedor.interimResults = true;

  const partes: string[] = [];
  let vivo = true;
  let motivo: Impedimento | null = null;

  reconocedor.onresult = (event) => {
    const desde = event.resultIndex ?? 0;
    for (let i = desde; i < event.results.length; i++)
      partes[i] = event.results[i][0].transcript;
    opciones.alTexto(unir(partes));
  };
  reconocedor.onerror = ({ error }) => {
    /* «No se autorizó» y «no hay servicio» son cosas distintas y llevan a
       sitios distintos: una se arregla dando un permiso y la otra no se
       arregla. Venían diciendo lo mismo. */
    motivo =
      error === "not-allowed"
        ? "sin-permiso"
        : error === "service-not-allowed"
          ? "no-disponible"
          : error === "network"
            ? "sin-conexion"
            : error === "no-speech"
              ? "sin-voz"
              : null;
  };
  reconocedor.onend = () => {
    if (!vivo) return;
    vivo = false;
    clearTimeout(reloj);
    opciones.alTerminar(motivo);
  };

  const reloj = setTimeout(() => reconocedor.stop(), TOPE_MS);
  try {
    reconocedor.start();
  } catch {
    clearTimeout(reloj);
    return "no-disponible";
  }
  return {
    parar: () => {
      if (vivo) reconocedor.stop();
    },
  };
}
