"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Undo2 } from "lucide-react";
import { firebaseClient } from "@/data/firebase/client";
import { useSession } from "@/data/session";
import { shareableReading, type Finding } from "@/domain/reading";

/**
 * Redacción asistida de la lectura estadística (HU-16).
 *
 * La frontera de esta función es la que importa: **el modelo redacta, no
 * analiza**. Los hallazgos de arriba se calculan en el dispositivo y siguen
 * siendo la versión verificable; lo que la IA devuelve es esa misma lista
 * convertida en un párrafo que se pueda leer en voz alta.
 *
 * Por eso el párrafo aparece debajo y siempre rotulado. Si alguna vez las dos
 * versiones no coinciden, la que manda es la de arriba, y quien lea debe poder
 * notarlo de un vistazo.
 *
 * Quien lo usa lo remonta al cambiar el filtro: un párrafo que habla de otro
 * conjunto no debe quedarse contradiciendo a los hallazgos nuevos.
 *
 * Solo la ve el Consejo. Para el resto de la comunidad la tarjeta termina en
 * los hallazgos calculados, que es la información; ofrecer un botón que el
 * servidor va a rechazar sería prometer algo que no se puede cumplir.
 */
export function ReadingAssistant({ findings }: { findings: Finding[] }) {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [narrative, setNarrative] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function draft() {
    if (busy) return;
    setBusy(true);
    setError("");
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
      const response = await fetch("/api/ai/reading/", {
        method: "POST",
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(30000),
        ]),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ findings: shareableReading(findings) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNarrative(data.narrative);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "No se pudo redactar.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  if (findings.length < 2 || !session.admin) return null;
  return (
    <div className="reading-ai">
      {!narrative && (
        <button
          type="button"
          className="btn"
          disabled={busy}
          aria-busy={busy}
          onClick={() => void draft()}
        >
          <Sparkles size={15} />
          {busy ? "Redactando…" : "Redactar con IA para la asamblea"}
        </button>
      )}
      {error && (
        <p role="alert" className="errors">
          {error}
        </p>
      )}
      {narrative && (
        <figure className="reading-narrative">
          <figcaption>
            <Sparkles size={14} /> Redactado con IA a partir de los hallazgos
            <button
              type="button"
              className="text-button"
              onClick={() => setNarrative("")}
            >
              <Undo2 size={13} /> Quitar
            </button>
          </figcaption>
          <p>{narrative}</p>
        </figure>
      )}
      <small>
        Solo salen del territorio las frases de arriba, y sin el título de
        ningún expediente. La IA únicamente las une en un párrafo: no calcula,
        no interpreta y no agrega nada. Si las dos versiones no coinciden, la
        que vale es la calculada.
      </small>
    </div>
  );
}
