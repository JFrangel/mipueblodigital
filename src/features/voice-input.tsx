"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        /** Desde dónde son nuevos los resultados de este evento. */
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type VoiceWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

/**
 * Juntar los trozos del dictado sin repetirlos.
 *
 * Es el tercer intento, y los dos anteriores fallaron por suponer cómo entrega
 * Android el reconocimiento. Lo que llegó del teléfono:
 *
 *     hubohubohubohubo derrumbéhubo derrumbé enhubo derrumbé en la vía
 *     hubohubohubohubohubo unhubo unhubo un derrumbé yhubo un derrumbé y ocurrió
 *
 * Los dos son la misma frase creciendo. A veces la reemite en la misma
 * posición, a veces en posiciones nuevas —por eso ni juntarlas todas ni
 * guardarlas por posición bastaba—, pero en los dos casos **lo nuevo empieza
 * por lo viejo**.
 *
 * Así que la regla no mira posiciones ni banderas: mira el texto. Si un trozo
 * empieza por lo que ya se lleva, es la misma frase más larga y reemplaza; si
 * no, es frase nueva y se añade. Un ordenador, que entrega trozos distintos,
 * cae siempre por el segundo camino y se comporta igual que siempre.
 */
export function unir(partes: readonly string[]): string {
  let texto = "";
  for (const parte of partes) {
    const trozo = (parte ?? "").trim();
    if (!trozo) continue;
    if (!texto) texto = trozo;
    else if (trozo.startsWith(texto)) texto = trozo;
    else if (texto.startsWith(trozo)) continue;
    else texto = `${texto} ${trozo}`;
  }
  return texto;
}

export function VoiceInput({
  value,
  onChange,
  onListening,
}: {
  value: string;
  onChange: (text: string) => void;
  onListening: (active: boolean) => void;
}) {
  const original = useRef("");
  const [lastResult, setLastResult] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      const current = recognition.current;
      if (current) {
        current.onresult = null;
        current.onerror = null;
        current.onend = null;
        current.abort();
      }
    },
    [],
  );
  function start() {
    if (recognition.current) return;
    setError("");
    const platform = window as VoiceWindow;
    const Constructor =
      platform.SpeechRecognition || platform.webkitSpeechRecognition;
    if (!Constructor) {
      setError(
        "Este navegador no admite dictado. Puedes escribir tu descripción o usar el micrófono del teclado.",
      );
      return;
    }
    if (!navigator.onLine) {
      setError(
        "Conéctate a internet para dictar. Puedes seguir escribiendo sin conexión.",
      );
      return;
    }
    original.current = value;
    const current = new Constructor();
    recognition.current = current;
    current.lang = "es-CO";
    current.continuous = true;
    current.interimResults = true;
    /**
     * Lo ya cerrado se guarda aquí, y no se vuelve a leer del evento.
     *
     * El manejador juntaba **todos** los resultados del evento cada vez. En un
     * ordenador eso da el texto correcto, porque cada frase aparece una sola
     * vez. En un teléfono no: Android cierra y reabre la sesión de
     * reconocimiento por su cuenta mientras uno habla, y vuelve a entregar lo
     * que ya había cerrado. El resultado era el dictado repitiéndose palabra
     * por palabra, que es justo lo que se ve en el móvil.
     *
     * La forma correcta la da el propio evento: `resultIndex` dice desde dónde
     * es nuevo, e `isFinal` dice qué está cerrado. Lo cerrado se acumula una
     * vez; lo provisional se enseña aparte y se reemplaza en el evento
     * siguiente. El código declaraba `isFinal` en su tipo y no lo miraba.
     */
    /**
     * Cada trozo en su sitio.
     *
     * Este es el segundo intento, y el primero también se equivocaba. Junté
     * todos los resultados de cada evento: en escritorio bien, en el teléfono
     * repetido. Entonces pasé a **acumular** lo que llegaba marcado como
     * cerrado, y el teléfono lo repitió igual, de otra manera:
     *
     *     hubohubohubohubo derrumbéhubo derrumbé enhubo derrumbé en la vía
     *
     * Porque Android no cierra una frase y pasa a la siguiente. **Reemite la
     * misma frase creciendo, en el mismo índice, marcada como cerrada cada
     * vez.** Sumar eso multiplica; lo que hay que hacer es reemplazar.
     *
     * Guardar cada trozo en la posición que el propio evento indica hace la
     * operación idempotente: llegue una vez o llegue ocho, el resultado es el
     * mismo. Y sirve igual para el escritorio, donde cada posición llega una
     * sola vez.
     */
    const partes: string[] = [];
    current.onresult = (event) => {
      /* `resultIndex` está en la norma y lo mandan todos, pero si algún día
         llega sin él se empieza por el principio: peor es no transcribir. */
      const desde = event.resultIndex ?? 0;
      for (let i = desde; i < event.results.length; i++)
        partes[i] = event.results[i][0].transcript;
      const transcript = unir(partes).slice(0, 12000);
      setText(transcript);
      const result = [original.current.trim(), transcript]
        .filter(Boolean)
        .join(" ");
      setLastResult(result);
      onChange(result);
    };
    current.onerror = ({ error: reason }) => {
      setError(
        reason === "not-allowed" || reason === "service-not-allowed"
          ? "No se autorizó el micrófono o el servicio de voz. Revisa los permisos del navegador."
          : reason === "no-speech"
            ? "No se detectó voz. Intenta hablar más cerca del micrófono."
            : "El dictado se interrumpió. Puedes revisar lo transcrito y continuar escribiendo.",
      );
    };
    current.onend = () => {
      setListening(false);
      onListening(false);
      recognition.current = null;
      if (timer.current) clearTimeout(timer.current);
    };
    try {
      setText("");
      current.start();
      setListening(true);
      onListening(true);
      timer.current = setTimeout(() => current.stop(), 60000);
    } catch {
      recognition.current = null;
      setListening(false);
      onListening(false);
      setError("No se pudo iniciar el micrófono. Inténtalo de nuevo.");
    }
  }
  return (
    <section className="voice-input" aria-label="Dictado de voz">
      <div className="voice-heading">
        <Mic size={18} />
        <strong>Cuéntalo con tu voz</strong>
        <span>Español · hasta 1 minuto</span>
      </div>
      <p>
        El navegador puede enviar el audio a su servicio de reconocimiento. El
        texto aparece directamente en Descripción; la app no guarda el audio.
      </p>
      <button
        type="button"
        className="btn"
        onClick={() => (listening ? recognition.current?.stop() : start())}
      >
        {listening ? <Square size={16} /> : <Mic size={16} />}{" "}
        {listening ? "Detener dictado" : "Activar micrófono"}
      </button>
      {listening && (
        <p role="status">
          Escuchando… Puedes detener el dictado cuando quieras.
        </p>
      )}
      {error && (
        <p className="errors" role="alert">
          {error}
        </p>
      )}
      {text && !listening && (
        <button
          type="button"
          className="text-button"
          disabled={value !== lastResult}
          onClick={() => {
            onChange(original.current);
            setText("");
          }}
        >
          Deshacer último dictado
        </button>
      )}
    </section>
  );
}
