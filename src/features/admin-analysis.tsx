"use client";
import { useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { firebaseClient } from "@/data/firebase/client";
import { statuses } from "@/data/catalog";
import styles from "./admin-analysis.module.css";

export function AdminAnalysis() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    text: string;
    generated: boolean;
    aggregate: { total: number; states: Record<string, number> };
  } | null>(null);
  const text = result?.text.trim() ?? "";
  const questionStart = result?.generated ? text.indexOf("¿") : -1;
  const questionTail = questionStart >= 0 ? text.slice(questionStart) : "";
  const matchedQuestions = questionTail.match(/¿[^¿?]+\?/g) ?? [];
  const questions =
    matchedQuestions.length &&
    !questionTail
      .replace(/¿[^¿?]+\?/g, "")
      .replace(/[\s,;:.]/g, "")
      .replace(/^[ye]$/i, "")
      ? matchedQuestions
      : [];
  const narrative = questions.length
    ? text.slice(0, questionStart).trim()
    : text;
  const paragraphs = narrative.split(/\n\s*\n/).filter(Boolean);
  const sentences =
    paragraphs.length === 1 && typeof Intl.Segmenter === "function"
      ? Array.from(
          new Intl.Segmenter("es", { granularity: "sentence" }).segment(
            paragraphs[0],
          ),
          ({ segment }) => segment,
        )
      : [];
  const reportBlocks =
    sentences.length > 2
      ? sentences.flatMap((sentence, index) =>
          index % 2 === 0
            ? [(sentence + (sentences[index + 1] ?? "")).trim()]
            : [],
        )
      : paragraphs;

  async function analyze() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { auth } = firebaseClient();
      await auth.authStateReady();
      if (!auth.currentUser)
        throw new Error(
          "Inicia sesión con tu cuenta del Consejo para continuar.",
        );
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/analysis/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(45000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "No se pudo consultar el análisis.");
      setResult(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo generar el análisis.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel admin-analysis">
      <span className="eyebrow">
        <Sparkles size={16} /> ASISTENTE DEL CONSEJO
      </span>
      <h2>Una lectura para orientar la gestión.</h2>
      <p>
        Lee el territorio entero: cuánto hay abierto y sin responsable, dónde se
        acumula, cuánto se tarda en cerrar y con qué notas cerró el Consejo sus
        últimos casos. Con eso propone un borrador para la asamblea.
      </p>
      {/* La promesa hay que decirla en concreto, no como «no recibe datos
          personales»: lo que se manda son cifras y las notas que el propio
          Consejo escribió al cerrar. Lo demás se queda aquí. */}
      <p className="muted">
        <strong>Qué sale de aquí:</strong> los conteos, y de los casos cerrados
        la nota pública con la que el Consejo los cerró.{" "}
        <strong>Qué no:</strong> el relato de quien reportó, su teléfono, su
        cuenta, las fotografías y las notas internas. Se consulta toda la base
        al pulsar, no lo que haya filtrado en la bandeja.
      </p>
      <button className="btn primary" onClick={analyze} disabled={busy}>
        {busy ? "Consultando el Consejo…" : "Analizar reportes remotos"}
      </button>
      {error && (
        <p role="alert" className="errors">
          {error}
        </p>
      )}
      {result && (
        <section
          className={styles.report}
          aria-label="Informe del Consejo"
          aria-busy={busy}
        >
          <div className={styles.summary}>
            <span className={styles.icon}>
              <FileText size={22} aria-hidden="true" />
            </span>
            <div>
              <h3>Informe del Consejo</h3>
              <p role="status">
                {result.aggregate.total} reportes contabilizados
              </p>
            </div>
          </div>
          <dl className={styles.counts}>
            {Object.entries(statuses).map(([id, label]) => (
              <div key={id} data-empty={!result.aggregate.states[id]}>
                <dt>{label}</dt>
                <dd>{result.aggregate.states[id] ?? 0}</dd>
              </div>
            ))}
          </dl>
          <article className={styles.draft}>
            <header>
              <h4>
                {result.generated
                  ? "Lectura para la asamblea"
                  : "Resultado de la consulta"}
              </h4>
              {result.generated && (
                <span>Borrador de IA · Requiere revisión humana</span>
              )}
            </header>
            {reportBlocks.map((block, index) => (
              <p key={index}>{block}</p>
            ))}
            {questions.length > 0 && (
              <section
                className={styles.questions}
                aria-label="Preguntas para la asamblea"
              >
                <h5>Preguntas para la asamblea</h5>
                <ul>
                  {questions.map((question, index) => (
                    <li key={index}>{question}</li>
                  ))}
                </ul>
              </section>
            )}
          </article>
        </section>
      )}
    </section>
  );
}
