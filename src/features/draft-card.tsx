"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FileEdit, ArrowRight, Trash2 } from "lucide-react";
import { readDraft, writeDraft, type LocalDraft } from "@/data/local-store";
import { categories } from "@/data/catalog";
import { useSession } from "@/data/session";
import { toast } from "@/data/toasts";

/**
 * El borrador, a la vista.
 *
 * Vivía escondido dentro del formulario: se guardaba, se salía de la pantalla y
 * no quedaba rastro de él en ninguna parte. Quien lo dejó a medias no tenía
 * forma de saber que seguía ahí.
 *
 * Y dice lo que un borrador es, porque es justo lo que se confunde: **no sale
 * solo**. Un reporte hecho sin señal se envía en cuanto haya red; un borrador
 * espera a que su autor decida. Son dos cosas distintas y la diferencia importa
 * cuando uno cierra la aplicación creyendo que ya avisó.
 */
export function DraftCard() {
  const session = useSession();
  const owner = session.uid ?? undefined;
  const [draft, setDraft] = useState<LocalDraft | null>(null);
  /* Descartar borraba el borrador de golpe y en silencio: lo escrito, la
     fotografía y el punto del mapa se iban con un toque, y si el borrado
     fallaba tampoco se decía. Ahora se pregunta antes y se avisa si no sale. */
  const [discarding, setDiscarding] = useState(false);
  const [problem, setProblem] = useState("");
  useEffect(() => {
    let alive = true;
    const read = () => {
      readDraft(owner)
        .then((found) => {
          if (alive) setDraft(found ?? null);
        })
        .catch(() => {
          if (alive) setDraft(null);
        });
    };
    read();
    window.addEventListener("draft-change", read);
    return () => {
      alive = false;
      window.removeEventListener("draft-change", read);
    };
  }, [owner]);

  if (!draft) return null;
  const category = categories.find((c) => c.id === draft.category)?.name;
  const summary = draft.description.trim();
  return (
    <section className="panel draft-card">
      <span className="draft-mark" aria-hidden="true">
        <FileEdit size={20} />
      </span>
      <div className="draft-copy">
        <span className="eyebrow">BORRADOR SIN ENVIAR</span>
        <strong>
          {[category, draft.vereda].filter(Boolean).join(" · ") ||
            "Reporte a medio escribir"}
        </strong>
        {summary && <p>{summary.slice(0, 120)}</p>}
        <small>
          Tu avance se guarda mientras escribes. Un borrador no sale solo: se queda aquí hasta que lo envíes.
          {draft.photos.length > 0 && " Conserva la fotografía y el punto del mapa."}
        </small>
      </div>
      {discarding ? (
        <div className="notice draft-confirm" role="alertdialog">
          <strong>¿Descartar el borrador?</strong>
          <p>
            Se pierde lo que llevas escrito
            {draft.photos.length > 0 &&
              ", con la fotografía y el punto del mapa"}
            . No se puede deshacer.
          </p>
          <div className="draft-actions">
            <button
              className="btn primary"
              onClick={() => {
                setProblem("");
                void writeDraft(null, owner).catch(() => {
                  const dicho =
                    "No se pudo descartar el borrador. Vuelve a intentarlo.";
                  setProblem(dicho);
                  toast(dicho, "error");
                });
              }}
            >
              Sí, descartar
            </button>
            <button className="btn" onClick={() => setDiscarding(false)}>
              Conservarlo
            </button>
          </div>
          {problem && (
            <p className="errors" role="alert">
              {problem}
            </p>
          )}
        </div>
      ) : (
        <div className="draft-actions">
          <Link className="btn primary" href="/reportar/">
            Continuar <ArrowRight size={16} />
          </Link>
          <button className="text-button" onClick={() => setDiscarding(true)}>
            <Trash2 size={15} /> Descartar
          </button>
        </div>
      )}
    </section>
  );
}
