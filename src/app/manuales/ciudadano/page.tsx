import type { Metadata } from "next";
import { manualCiudadano } from "@/content/manual-ciudadano";
import { archivoPdf } from "@/content/manuales-registro";
import { PaginaManual } from "@/features/manuales-pagina";

export const metadata: Metadata = {
  title: "Manual del ciudadano · Mi Pueblo Digital",
  description: manualCiudadano.subtitulo,
};

export default function Page() {
  return (
    <PaginaManual manual={manualCiudadano} archivo={archivoPdf("ciudadano")} />
  );
}
