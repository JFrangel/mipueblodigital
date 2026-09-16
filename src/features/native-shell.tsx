"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { esNativo } from "@/platform/native";

/**
 * Lo que convierte una ventana web en algo que se siente una aplicación.
 *
 * Dentro del APK, Mi Pueblo Digital es una ventana a la aplicación publicada.
 * Eso es deliberado —las rutas del servidor no caben en un teléfono— pero sin
 * nada más se nota, y se nota en detalles concretos: arranca con un rectángulo
 * blanco y de golpe aparece una página, la barra de estado es de otro color, y
 * el botón de atrás del teléfono cierra la aplicación entera en vez de volver
 * a la pantalla anterior.
 *
 * Cada una de esas tres cosas se arregla por separado. Ninguna cambia nada en
 * el navegador: los complementos solo se cargan dentro de la aplicación.
 */
export function NativeShell() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!esNativo()) return;
    /* La marca que usan los estilos para quitar los gestos de navegador. Va
       aquí y no en el servidor porque solo aquí se sabe dónde corre. */
    document.documentElement.classList.add("app-nativa");
    let vivo = true;
    void (async () => {
      const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);
      if (!vivo) return;
      /* La barra de estado, del color del Consejo y con los iconos claros
         encima. En su color de fábrica parecía de otra aplicación. */
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
      await StatusBar.setBackgroundColor({ color: "#104734" }).catch(
        () => undefined,
      );
      /* La pantalla de arranque se retira en cuanto hay algo que enseñar. Se
         retira sola a los dos segundos de todos modos: esto solo la adelanta
         cuando la aplicación arranca antes, que es casi siempre. */
      await SplashScreen.hide().catch(() => undefined);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  /**
   * El botón de atrás del teléfono.
   *
   * Sin esto cierra la aplicación desde cualquier pantalla, que es lo que más
   * la delata: en una aplicación de verdad, atrás es atrás, y solo sale cuando
   * ya no hay a dónde volver.
   */
  useEffect(() => {
    if (!esNativo()) return;
    let quitar: (() => void) | undefined;
    void (async () => {
      const { App } = await import("@capacitor/app");
      const oyente = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack && pathname !== "/inicio/") router.back();
        else void App.exitApp();
      });
      quitar = () => void oyente.remove();
    })();
    return () => quitar?.();
  }, [router, pathname]);

  return null;
}
