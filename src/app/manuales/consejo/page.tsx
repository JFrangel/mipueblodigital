import type { Metadata } from "next";
import { archivoPdf } from "@/content/manuales-registro";
import { PaginaManualConsejo } from "@/features/manuales-pagina";

/* Es una guía de trabajo para quien gestiona, no algo que un buscador deba
   ofrecer a cualquiera. */
export const metadata: Metadata = {
  title: "Manual del Consejo · Mi Pueblo Digital",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PaginaManualConsejo archivo={archivoPdf("consejo")} />;
}
