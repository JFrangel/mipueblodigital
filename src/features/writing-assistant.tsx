"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Undo2 } from "lucide-react";
import { firebaseClient } from "@/data/firebase/client";

/**
 * Por debajo de esta extensión no hay relato que corregir: pedir una propuesta
 * sobre cuatro palabras gasta la cuota diaria y devuelve las mismas cuatro.
 */
export const minimumWords = 12;

const countWords = (text: string) =>
  text.trim() ? text.trim().split(/\s+/).length : 0;

/**
 * Ayuda de redacción (HU-05).
 *
 * Un toque y la descripción queda corregida. No hay panel que desplegar ni
 * propuesta que comparar: quien reporta desde el río no debería tener que leer
 * dos versiones de su propio texto en una pantalla de teléfono.
 *
 * Lo que sí se conserva es la vuelta atrás. La versión anterior queda guardada
 * y **Deshacer** la devuelve intacta mientras no se siga escribiendo, así que
 * aceptar la mejora nunca es una decisión irreversible.
 */
export function WritingAssistant({
  value,
  onAccept,
  disabled,
}: {
  value: string;
  onAccept: (text: string) => void;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /* Par original/mejorado del último cambio aplicado. */
  const [applied, setApplied] = useState<{
    before: string;
    after: string;
  } | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const words = countWords(value);
  const short = words < minimumWords;
  /* Si se siguió escribiendo, deshacer borraría lo nuevo: se retira. */
  const undoable = applied !== null && value === applied.after;

  async function improve() {
    if (busy || disabled || short) return;
    setBusy(true);
    setError("");
    setApplied(null);
    const original = value;
    const controller = new AbortController();
    request.current = controller;
    try {
      const { auth } = firebaseClient();
      await auth.authStateReady();
      if (!auth.currentUser)
        throw new Error(
          "Inicia sesión y verifica tu correo para usar esta función.",
        );
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/ai/improve/", {
        method: "POST",
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(30000),
        ]),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: original }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onAccept(data.suggestion);
      setApplied({ before: original, after: data.suggestion });
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "No se pudo obtener una propuesta.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="text-button ia-action"
        disabled={busy || disabled || short}
        aria-busy={busy}
        title={
          short
            ? `Escribe al menos ${minimumWords} palabras para usar esta ayuda.`
            : "Corrige ortografía y claridad conservando los hechos."
        }
        onClick={() => void improve()}
      >
        <Sparkles size={15} />
        {busy ? "Mejorando la redacción…" : "Mejorar redacción con IA"}
      </button>
      {error ? (
        <small role="alert" className="ia-note error-text">
          {error}
        </small>
      ) : undoable ? (
        <small role="status" className="ia-note">
          Redacción mejorada. Revisa que conserve los hechos.{" "}
          <button
            type="button"
            className="text-button ia-undo"
            onClick={() => {
              onAccept(applied.before);
              setApplied(null);
            }}
          >
            <Undo2 size={13} /> Deshacer
          </button>
        </small>
      ) : (
        <small className="ia-note">
          {short
            ? `Escribe al menos ${minimumWords} palabras para usar la ayuda de redacción.`
            : "La IA recibe solo esta descripción, nunca tus datos. Evita nombres propios."}
        </small>
      )}
    </>
  );
}
