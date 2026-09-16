import { Leaf, Waves, HeartHandshake, Sprout, Sun, ShieldCheck } from "lucide-react";
import { findNewsArt, type NewsMotif } from "@/domain/news-art";

const motifs: Record<NewsMotif, typeof Leaf> = {
  leaf: Leaf,
  river: Waves,
  hands: HeartHandshake,
  sprout: Sprout,
  sun: Sun,
  shield: ShieldCheck,
};

/**
 * Dirección de la portada fotográfica de un comunicado publicado.
 *
 * La marca va en la dirección para que al reemplazar la portada el navegador
 * pida la nueva en vez de servir la que tenía guardada.
 */
export const coverSource = (id: string, cover?: string | null) =>
  cover
    ? `/api/news/${encodeURIComponent(id)}/portada/?v=${encodeURIComponent(cover)}`
    : undefined;

/**
 * Portada de un comunicado: motivo a la izquierda, lema a la derecha.
 *
 * Con fotografía el lema no desaparece: la imagen se pone detrás y el motivo y
 * las dos líneas siguen encima, en blanco y sobre un velo oscuro. Sin ese velo
 * el texto se pierde en cuanto la foto tiene cielo claro o agua al sol.
 */
export function NewsArt({
  art,
  size = 60,
  cover,
}: {
  art?: string;
  size?: number;
  /** Fotografía de fondo, ya sea una dirección o la imagen misma. */
  cover?: string | null;
}) {
  const chosen = findNewsArt(art);
  const Motif = motifs[chosen.motif];
  return (
    <div className={`news-art tone-${chosen.tone}${cover ? " has-cover" : ""}`}>
      {cover && (
        /* Decorativa: lo que se lee es el lema que va encima, así que no
           duplica texto en el lector de pantalla. */
        // eslint-disable-next-line @next/next/no-img-element
        <img className="news-art-photo" src={cover} alt="" />
      )}
      <Motif size={size} aria-hidden="true" />
      <span>
        {chosen.lines.map((line) => (
          <span key={line}>
            {line}
            <br />
          </span>
        ))}
      </span>
    </div>
  );
}
