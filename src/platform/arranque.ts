"use client";
import { esNativo } from "./native";

/**
 * Retirar la pantalla de arranque de Capacitor.
 *
 * **Existe porque esa pantalla tapaba justo lo que había que ver.** La
 * aplicación instalada enseña, por este orden, la pantalla de Android, la de
 * Capacitor, la portada de carga y el telón de hojas. Las dos primeras dibujan
 * el mismo icono sobre el mismo verde, y la de Capacitor se quita **por reloj**
 * —dos segundos, escritos en `capacitor.config.ts`—, no cuando la aplicación
 * está lista. Grabando un arranque en un teléfono se ve el resultado: seguía
 * puesta mientras la portada de carga y el telón se sucedían por debajo, y lo
 * único que llegaba a la pantalla era el final de la animación o nada.
 *
 * Aquí se retira en cuanto la ventana web ha pintado su primer fotograma, que
 * es el momento exacto en que ya hay algo propio que enseñar. El reloj de la
 * configuración se queda como red por debajo: si esto no llegara a ejecutarse
 * —un fallo de JavaScript, una versión antigua del complemento— la pantalla se
 * quita sola igual y nadie se queda encerrado mirando un icono.
 *
 * En el navegador no hace nada, y por eso no se comprueba antes de llamarla:
 * `esNativo()` decide, y el módulo del complemento no llega a bajarse.
 */
export async function descubrirVentana(): Promise<void> {
  if (!esNativo()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* Un teléfono sin el complemento, o una versión que ya la quitó sola. No
       hay nada que decirle a nadie: lo peor que pasa es que la pantalla se
       retire por reloj, que es lo que hacía antes. */
  }
}
