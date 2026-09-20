"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { esNativo } from "@/platform/native";
import { descubrirVentana } from "@/platform/arranque";
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
    /**
     * Retirar la pantalla de arranque, lo primero y por su cuenta.
     *
     * **Va suelta y no dentro del bloque de abajo a propósito.** Ahí dentro
     * estaba esperando a que bajara también el complemento de la barra de
     * estado, y mientras tanto la pantalla de arranque sigue puesta tapando la
     * aplicación entera: un trozo de JavaScript que no tiene nada que ver
     * decidía cuándo se ve la portada, y si ese no llegaba a cargar, no se
     * retiraba nunca —hasta el tope de diez segundos—.
     *
     * Aquí y no en `first-run.tsx` porque esto está en todas las rutas. Quien
     * abre desde un aviso entra directo a su expediente, y esa pantalla también
     * tiene que descubrirse.
     */
    void descubrirVentana();
    void (async () => {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
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
