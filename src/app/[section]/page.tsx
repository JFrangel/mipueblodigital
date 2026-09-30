import { notFound } from "next/navigation";
import { Workspace } from "@/components/workspace";

/**
 * Las secciones que existen.
 *
 * Este segmento dinámico casa con **cualquier** palabra, así que sin esta
 * lista `/esto-no-existe/` no daba un 404: dibujaba la aplicación entera con
 * una sección que no existe, sin contenido y con toda la navegación alrededor.
 * Quien llegaba por un enlace viejo no sabía si se había roto algo o si estaba
 * en el sitio equivocado, y un buscador la indexaba como si fuera una pantalla
 * más.
 */
const sections = [
  "inicio",
  "reportar",
  "mis-reportes",
  "mapa",
  "comunidad",
  "estadisticas",
  "admin",
  "documentacion",
  "cuenta",
  "historial",
  "memoria",
] as const;

export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  return <Workspace section={section} />;
}
