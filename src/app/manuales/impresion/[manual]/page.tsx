import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { manuales } from "@/content/manuales-registro";
import { ManualDocumento } from "@/features/manuales";

/**
 * El manual tal como se imprime a PDF, sin la barra ni la puerta.
 *
 * Existe para `scripts/generar-manuales-pdf.mjs`, que necesita abrir **los dos**
 * manuales sin sesión de nadie. En producción no existe: solo responde cuando
 * quien arranca el servidor lo pide con `MPD_IMPRIMIR_MANUALES=1`, que no se
 * pone en ningún despliegue. Sin esa variable es un 404, y el manual del
 * Consejo no tiene aquí una segunda puerta por donde leerlo.
 *
 * `?paginas=3,5,8…` es lo que usa el generador en su segunda pasada: en qué
 * hoja empieza cada capítulo, para escribirlo en el índice.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ manual: string }>;
}): Promise<Metadata> {
  const { manual } = await params;
  // Chrome toma el título del PDF de aquí.
  const titulo =
    manual === "consejo" || manual === "ciudadano"
      ? manuales[manual].titulo
      : "Manual";
  return {
    title: `${titulo} · Mi Pueblo Digital`,
    authors: [{ name: "Gran Consejo Comunitario Río Satinga" }],
    robots: { index: false, follow: false },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ manual: string }>;
  searchParams: Promise<{ paginas?: string }>;
}) {
  if (process.env.MPD_IMPRIMIR_MANUALES !== "1") notFound();
  const { manual } = await params;
  if (manual !== "ciudadano" && manual !== "consejo") notFound();
  const { paginas } = await searchParams;
  const numeros = paginas
    ?.split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0 && n < 500);
  return (
    <ManualDocumento
      manual={manuales[manual]}
      paginas={
        numeros?.length === manuales[manual].capitulos.length
          ? numeros
          : undefined
      }
    />
  );
}
