"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { esNativo } from "@/platform/native";
import { escuchar, type Escucha, type Impedimento } from "@/platform/voz";

/**
 * Lo que se le dice a alguien cuando el dictado no arranca o se corta.
 *
 * Cuatro motivos y cuatro frases, y esto no es cortesía: antes «no se autorizó»
 * y «no hay servicio de voz» decían lo mismo, y son cosas distintas. La primera
 * se arregla dando un permiso; la segunda no se arregla de ninguna manera, y lo
 * único útil que se le puede decir a esa persona es que use el micrófono de su
 * teclado. Mandarla a revisar unos permisos que ya están bien es mandarla a
 * buscar donde no es.
 */
const frases: Record<Impedimento, string> = {
  "no-disponible":
    "Este dispositivo no puede dictar. Escribe tu descripción, o usa el micrófono del teclado: funciona igual y el texto llega al mismo sitio.",
  "sin-permiso":
    "No se autorizó el micrófono. Puedes darle permiso desde los ajustes de este dispositivo, o escribir tu descripción.",
  "sin-conexion":
    "Conéctate a internet para dictar. Puedes seguir escribiendo sin conexión.",
  "sin-voz": "No se detectó voz. Intenta hablar más cerca del micrófono.",
};

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
  /* La escucha en curso, si la hay. La puerta devuelve solo la manera de
     pararla: qué reconocedor haya detrás no es asunto de esta pantalla. */
  const escucha = useRef<Escucha | null>(null);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  /* Al desmontar se para lo que esté sonando. Sin esto, salir del formulario
     con el dictado abierto deja el micrófono encendido. */
  useEffect(
    () => () => {
      escucha.current?.parar();
      escucha.current = null;
    },
    [],
  );

  async function start() {
    if (escucha.current) return;
    setError("");
    setText("");
    original.current = value;
    /* Se marca escuchando antes de pedir nada: en el APK el permiso abre un
       diálogo del sistema y el botón tiene que estar ya en «Detener», o se
       pulsa dos veces y se arrancan dos escuchas. */
    setListening(true);
    onListening(true);

    const abierta = await escuchar({
      alTexto: (transcript) => {
        const corto = transcript.slice(0, 12000);
        setText(corto);
        const result = [original.current.trim(), corto]
          .filter(Boolean)
          .join(" ");
        setLastResult(result);
        onChange(result);
      },
      alTerminar: (motivo) => {
        escucha.current = null;
        setListening(false);
        onListening(false);
        if (motivo) setError(frases[motivo]);
      },
    });

    if (typeof abierta === "string") {
      setListening(false);
      onListening(false);
      setError(frases[abierta]);
      return;
    }
    escucha.current = abierta;
  }

  return (
    <section className="voice-input" aria-label="Dictado de voz">
      <div className="voice-heading">
        <Mic size={18} />
        <strong>Cuéntalo con tu voz</strong>
        <span>Español · hasta 1 minuto</span>
      </div>
      {/* Quién oye el audio depende de dónde corre esto, y no es un detalle:
          en el navegador el audio sale hacia el servicio de voz del navegador;
          en la aplicación instalada lo transcribe el reconocedor del propio
          teléfono, el mismo del micrófono del teclado. Decir «el navegador»
          dentro del APK sería contar algo que no está pasando. */}
      <p>
        {esNativo()
          ? "Lo transcribe el reconocedor de voz de tu teléfono, el mismo del micrófono del teclado. El texto aparece directamente en Descripción; la app no guarda el audio."
          : "El navegador puede enviar el audio a su servicio de reconocimiento. El texto aparece directamente en Descripción; la app no guarda el audio."}
      </p>
      <button
        type="button"
        className="btn"
        onClick={() => {
          if (listening) escucha.current?.parar();
          else void start();
        }}
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
