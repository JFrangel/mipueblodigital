import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
/* Manuscrita para la firma del Consejo al pie de un comunicado. Va alojada en
   el propio servidor: una tipografía traída de fuera no existiría sin señal. */
import "@fontsource-variable/caveat";
/* Solo para el nombre de la aplicación. Bricolage Grotesque tiene el trazo algo
   irregular de una letra cortada a mano — se parece más a un rótulo pintado en
   una pared del pueblo que a una marca de empresa, que es justo lo que este
   proyecto es. El cuerpo del texto sigue en DM Sans: una tipografía con
   carácter se gasta en un sitio, no en todos. Se sirve desde aquí, como las
   demás, y el navegador solo baja el tramo latino. */
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "./globals.css";
import { PwaRegistration } from "@/features/pwa";
import { NativeShell } from "@/features/native-shell";
export const metadata: Metadata = {
  title: "Mi Pueblo Digital · Río Satinga",
  description:
    "Reporta lo que pasa en el territorio del Gran Consejo Comunitario Río Satinga y sigue la respuesta del Consejo.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <PwaRegistration />
        <NativeShell />
        {children}
      </body>
    </html>
  );
}
