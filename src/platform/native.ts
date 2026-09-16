"use client";
import { Capacitor } from "@capacitor/core";

/**
 * ¿Corre dentro de la aplicación instalada, o en un navegador?
 *
 * No es lo mismo y hay cosas que no se pueden hacer igual en los dos sitios.
 * La principal: entrar con Google. `signInWithPopup` abre una ventana, y Google
 * **rechaza el acceso desde vistas web incrustadas**; Android lo manda al
 * navegador del sistema, la sesión queda allí —en otras galletas, en otro
 * sitio— y a la aplicación no vuelve nunca.
 */
export const esNativo = () => Capacitor.isNativePlatform();

/**
 * Entrar con Google desde la aplicación instalada.
 *
 * Usa la cuenta que ya está puesta en el teléfono, sin salir de la aplicación,
 * y firma en Firebase con lo que devuelve. Es además lo que la gente espera:
 * elegir su cuenta de una lista, no teclear una contraseña.
 *
 * El complemento se carga solo aquí y solo cuando hace falta: en el navegador
 * no se baja nunca, porque no tiene nada que hacer.
 */
export async function entrarConGoogleNativo() {
  const { FirebaseAuthentication } =
    await import("@capacitor-firebase/authentication");
  await FirebaseAuthentication.signInWithGoogle();
}
