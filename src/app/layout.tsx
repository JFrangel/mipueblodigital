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
        {/**
         * ¿Ya se dibujó el palafito antes de llegar aquí?
         *
         * Dentro del APK la portada de arranque se pinta **dos veces**: una
         * desde el archivo, que es la que aparece al instante, y otra aquí
         * cuando la web termina de llegar. Son la misma pantalla, así que sin
         * esto el palafito se traza, se corta a la mitad y vuelve a empezar de
         * cero. Eso no se lee como una entrada, se lee como un tartamudeo —y es
         * exactamente el «sale el logo dos veces» que ya hubo que quitar una
         * vez—.
         *
         * **Manda `window.Capacitor`, no la marca.** La marca la deja la página
         * del archivo en el almacén de la sesión, y funciona… cuando esa página
         * llegó a correr. No siempre: si la ventana se recarga sola, si el
         * almacén no está, si se volvió por el camino del error. Entonces la
         * marca falta, esta portada se traza, y desde fuera lo que se ve es un
         * palafito que unas veces se dibuja y otras aparece puesto, sin que se
         * entienda de qué depende.
         *
         * El puente de Capacitor sí está siempre, y desde antes que nada
         * nuestro: lo inyecta la ventana en cuanto abre el documento. Su
         * presencia responde a la única pregunta que importa aquí —«¿venimos de
         * una pantalla que ya enseñó este dibujo?»— y la responde igual todas
         * las veces. La marca se queda debajo por si algún día el puente
         * cambiara de nombre.
         *
         * En el navegador no hay puente ni marca, y la portada se traza como
         * siempre: allí es la primera vez que se ve el dibujo.
         *
         * **Va al principio del cuerpo y no en un efecto** porque tiene que
         * estar puesto antes del primer fotograma: decidido después, ya se
         * habría visto arrancar la animación que se quería evitar.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(window.Capacitor||sessionStorage.getItem('mpd-portada'))" +
              "document.documentElement.setAttribute('data-arranque','hecho');}catch(e){}",
          }}
        />
        <PwaRegistration />
        <NativeShell />
        {children}
        {/**
         * Descubrir la portada en cuanto está pintada, sin esperar a React.
         *
         * **Va suelto aquí abajo y no en un componente porque el momento es el
         * asunto.** La pantalla de arranque de Android tapa la ventana hasta
         * que la aplicación avisa, y si ese aviso sale de un efecto de React
         * hay que esperar a que baje el paquete y termine de hidratar. Para
         * entonces la portada de carga ya ha cumplido y se ha ido: lo que se
         * descubre es la pantalla siguiente, y el dibujo del palafito
         * trazándose —que es el recibimiento— no lo llega a ver nadie. Se vio
         * midiendo: en el emulador el arranque pasaba del icono a la bienvenida
         * sin portada por el medio.
         *
         * Aquí, al final del cuerpo, esto corre al terminar de leerse el
         * documento: la portada ya está en el HTML que mandó el servidor, así
         * que el fotograma siguiente la tiene entera. Dos vueltas de reloj
         * porque la primera se programa **antes** de que el navegador dibuje, y
         * soltando ahí se vería un instante en blanco.
         *
         * Se llama al puente crudo, que es lo único que existe antes de que
         * cargue nada nuestro. En el navegador no hay `Capacitor` y no pasa
         * nada. El aviso de `NativeShell` se queda debajo por si esto no
         * corriera.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "requestAnimationFrame(function(){requestAnimationFrame(function(){" +
              "try{var c=window.Capacitor;" +
              "if(c&&c.nativePromise)c.nativePromise('SplashScreen','hide',{});}catch(e){}" +
              "})})",
          }}
        />
      </body>
    </html>
  );
}
