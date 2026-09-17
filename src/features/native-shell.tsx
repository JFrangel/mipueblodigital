"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { esNativo } from "@/platform/native";
import { getTheme, subscribeTheme } from "@/data/theme";

/**
 * Lo que convierte una ventana web en algo que se siente una aplicación.
 *
 * Dentro del APK, Mi Pueblo Digital es una ventana a la aplicación publicada.
 * Eso es deliberado —las rutas del servidor no caben en un teléfono— pero sin
 * nada más se nota, y se nota en detalles concretos: arranca con un rectángulo
 * blanco y de golpe aparece una página, el reloj de arriba no se lee, y
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
    /* Se guarda aparte porque el tema puede cambiar mucho antes de que el
       complemento termine de cargarse. */
    let vestir: ((oscuro: boolean) => void) | undefined;
    void (async () => {
      const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);
      if (!vivo) return;
      /**
       * Los iconos de la barra de estado, del color contrario a lo que hay
       * debajo.
       *
       * La aplicación llega hasta el borde de arriba, así que detrás del reloj
       * está el fondo que pinta la cabecera y no un color propio de la barra.
       * Antes se fijaban claros de una vez y con el tema claro el reloj
       * quedaba blanco sobre blanco, ilegible. Ahora se eligen por tema, y se
       * vuelven a elegir cada vez que cambia.
       */
      vestir = (oscuro) =>
        void StatusBar.setStyle({
          style: oscuro ? Style.Dark : Style.Light,
        }).catch(() => undefined);
      vestir(getTheme());
      /* La pantalla de arranque se retira en cuanto hay algo que enseñar. Se
         retira sola a los dos segundos de todos modos: esto solo la adelanta
         cuando la aplicación arranca antes, que es casi siempre. */
      await SplashScreen.hide().catch(() => undefined);
    })();
    const dejarTema = subscribeTheme(() => vestir?.(getTheme()));
    return () => {
      vivo = false;
      dejarTema();
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
