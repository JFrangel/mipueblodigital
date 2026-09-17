import type { Metadata, Viewport } from "next";
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
/**
 * La ventana llega hasta los bordes de la pantalla.
 *
 * Sin `viewportFit: "cover"` Android deja la aplicación metida entre las barras
 * del sistema y pinta el hueco de la barra de gestos con el fondo de la
 * ventana: una franja gris al pie que no es de ningún tema de la aplicación.
 * Y peor, `env(safe-area-inset-*)` vale `0px`, así que el relleno que este CSS
 * ya reservaba para la muesca y para la barra de gestos no hacía nada.
 *
 * Con `cover` la aplicación pinta de borde a borde —la barra inferior lleva su
 * propio color hasta abajo— y los insets traen medidas de verdad. En un
 * navegador de escritorio no cambia nada: ahí valen cero.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
