"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
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
    current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ")
        .slice(0, 12000);
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
