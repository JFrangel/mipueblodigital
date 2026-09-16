"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { firebaseClient } from "@/data/firebase/client";
import { statuses } from "@/data/catalog";

export function AdminAnalysis() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    text: string;
    generated: boolean;
    aggregate: { total: number; states: Record<string, number> };
  } | null>(null);
  async function analyze() {
    if (busy) return;
    setBusy(true);
    setError("");
    setResult(null);
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
        <div role="status">
          <h3>{result.aggregate.total} reportes contabilizados</h3>
          <dl>
            {Object.entries(statuses).map(([id, label]) => (
              <div key={id}>
                <dt>{label}</dt>
                <dd>{result.aggregate.states[id] ?? 0}</dd>
              </div>
            ))}
          </dl>
          <strong>
            {result.generated
              ? "Borrador de IA · requiere revisión humana"
              : "Resultado de la consulta"}
          </strong>
          <p>{result.text}</p>
        </div>
      )}
    </section>
  );
}
