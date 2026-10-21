import type { Metadata } from "next";
import { archivoPdf, manuales } from "@/content/manuales-registro";
import { ManualesIndice } from "@/features/manuales-pagina";

export const metadata: Metadata = {
  title: "Manuales · Mi Pueblo Digital",
  description:
    "Cómo se usa Mi Pueblo Digital, paso a paso: el manual del ciudadano y el del Consejo, para leer o descargar en PDF.",
};

/**
 * Solo viaja la ficha de cada manual —título, subtítulo, a quién va dirigido—,
 * no sus capítulos: el contenido del manual del Consejo no debe ir a quien solo
 * está eligiendo cuál abrir.
 */
export default function Page() {
  const fichas = Object.values(manuales).map(
    ({ id, titulo, subtitulo, publico }) => ({
      id,
      titulo,
      subtitulo,
      publico,
      archivo: archivoPdf(id),
    }),
  );
  return <ManualesIndice fichas={fichas} />;
}
