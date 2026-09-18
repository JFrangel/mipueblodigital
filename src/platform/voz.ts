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
  | "no-disponible"
  | "sin-permiso"
  | "sin-conexion"
  | "sin-voz";

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
   *
   * La transcripción buena no es el último trozo provisional: es la que llega
   * al resolverse `start()`, ya corregida y con sus tildes. Se guarda encima.
   */
  const partes: string[] = [];
  let indice = 0;
  let vivo = true;
  /* Vueltas seguidas que no trajeron nada. Tres, no una: una vuelta vacía es
     alguien pensando, tres seguidas es alguien que dejó de hablar. */
  let vacias = 0;
  const SILENCIOS = 3;
  /* Y un tope duro de vueltas, para que un reconocedor que contestara al
     instante no dejara esto girando: el reloj de abajo es de tiempo, y el
     tiempo no corre si cada vuelta dura cero. */
  let vueltas = 0;
  const VUELTAS_MAXIMAS = 60;

  const oyente = await SpeechRecognition.addListener(
    "partialResults",
    ({ matches }) => {
      /* La primera coincidencia es la que el reconocedor considera más
         probable; las demás son alternativas y no se pintan. */
      if (!vivo || !matches?.length) return;
      partes[indice] = matches[0];
      opciones.alTexto(unir(partes));
    },
  );

  const cerrar = (motivo: Impedimento | null) => {
    if (!vivo) return;
    vivo = false;
    clearTimeout(reloj);
    void oyente.remove();
    void SpeechRecognition.stop().catch(() => undefined);
    opciones.alTerminar(motivo);
  };
  const reloj = setTimeout(() => cerrar(null), TOPE_MS);

  const seguir = (hubo: boolean) => {
    if (!vivo) return;
    if (hubo) {
      indice = partes.length;
      vacias = 0;
    } else if (++vacias >= SILENCIOS) {
      /* Sin una sola palabra en toda la escucha, el problema es el micrófono y
         se dice. Con algo dicho, el silencio es el final normal del dictado. */
      cerrar(partes.length ? null : "sin-voz");
      return;
    }
    vuelta();
  };

  const vuelta = () => {
    if (!vivo) return;
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
      .then(({ matches }) => {
        const dicho = matches?.[0]?.trim();
        if (dicho) {
          partes[indice] = dicho;
          opciones.alTexto(unir(partes));
        }
        seguir(Boolean(dicho));
      })
      .catch(() => seguir(false));
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
