"use client";
import { esNativo } from "./native";

/**
 * Retirar la pantalla de arranque de Capacitor.
 *
 * **Es el único aviso de que ya hay algo que enseñar, y sin él no se retira.**
 * En Android 12 en adelante el complemento no dibuja una pantalla suya: coge la
 * que ya enseña el sistema —el palafito sobre el azul del río— y la sostiene
 * bloqueando el dibujado de la ventana. Quien la suelta es esto. Mientras no se
 * llame, la aplicación puede estar entera y pintada debajo sin que se vea ni un
 * píxel.
 *
 * Se llama en cuanto la ventana web ha pintado su primer fotograma, que es el
 * momento exacto en que ya hay algo propio que enseñar. El tope de
 * `capacitor.config.ts` —diez segundos— se queda como red por debajo: si esto
 * no llegara a ejecutarse, la pantalla se quita sola igual y nadie se queda
 * encerrado mirando un icono.
 *
 * Y no se llama solo desde la raíz: está en `NativeShell`, que vive en todas
 * las rutas. Quien abre desde un aviso entra directo a su expediente, y esa
 * pantalla también tiene que descubrirse.
 *
 * En el navegador no hace nada, y por eso no se comprueba antes de llamarla:
 * `esNativo()` decide, y el módulo del complemento no llega a bajarse.
 */
export async function descubrirVentana(): Promise<void> {
  if (!esNativo()) return;
  /**
   * Primero por el puente crudo, que no hay que bajar.
   *
   * `import("@capacitor/splash-screen")` es un trozo de JavaScript aparte, y en
   * el primer arranque —el único que importa aquí— no está en la memoria del
   * navegador: hay que pedirlo por la red, justo cuando la red es lo que está
   * costando. Esos milisegundos son pantalla de arranque de más tapando una
   * portada que ya está dibujada debajo.
   *
   * Esto es lo mismo que acaba haciendo el complemento —una llamada al puente,
   * ver `native-bridge.js`— pero ya está inyectado en la ventana desde antes de
   * que cargue nada nuestro. El complemento se queda debajo por si algún día el
   * puente cambia de forma.
   */
  const puente = (
    window as unknown as {
      Capacitor?: {
        nativePromise?: (
          plugin: string,
          metodo: string,
          datos: Record<string, never>,
        ) => Promise<unknown>;
      };
    }
  ).Capacitor;
  try {
    if (puente?.nativePromise) {
      await puente.nativePromise("SplashScreen", "hide", {});
      return;
    }
  } catch {
    /* Se prueba con el complemento. */
  }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* Un teléfono sin el complemento, o una versión que ya la quitó sola. No
       hay nada que decirle a nadie: lo peor que pasa es que la pantalla se
       retire por reloj, que es lo que hacía antes. */
  }
}
