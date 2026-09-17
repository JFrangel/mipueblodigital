"use client";
import { Capacitor } from "@capacitor/core";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from "firebase/auth";
import { firebaseClient } from "@/data/firebase/client";

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
 * El complemento, cargado solo aquí y solo cuando hace falta: en el navegador
 * no se baja nunca, porque no tiene nada que hacer.
 */
const complemento = async () =>
  (await import("@capacitor-firebase/authentication")).FirebaseAuthentication;

/**
 * Entrar con Google desde la aplicación instalada.
 *
 * **Dentro del teléfono hay dos Firebase, y no se conocen.** El complemento
 * firma en el Firebase nativo de Android; el resto de esta aplicación —la
 * sesión, los reportes, la cuenta, la bandeja del Consejo— lee el Firebase de
 * JavaScript que vive en la ventana web. Son dos almacenes distintos.
 *
 * Firmar solo en el nativo produce el fallo más desconcertante posible: el
 * selector de cuentas abre, la persona elige la suya, todo va bien por dentro y
 * **la pantalla no se mueve**, porque la capa que la pinta no se ha enterado de
 * nada. Así que se hace el trayecto entero: el complemento elige la cuenta del
 * teléfono y devuelve un identificador, y con ese identificador se firma
 * también en la capa web, que es la que manda aquí.
 */
export async function entrarConGoogleNativo() {
  const FirebaseAuthentication = await complemento();
  const { credential } = await FirebaseAuthentication.signInWithGoogle();
  const idToken = credential?.idToken;
  /* Sin identificador no hay nada que firmar, y seguir adelante devolvería a
     la persona a la misma pantalla quieta de antes. Mejor decirlo. */
  if (!idToken)
    throw Object.assign(
      new Error("Google no devolvió el identificador de la cuenta."),
      { code: "mpd/sin-credencial-google" },
    );
  await signInWithCredential(
    firebaseClient().auth,
    GoogleAuthProvider.credential(idToken),
  );
}

/**
 * Cerrar la sesión, en todas las capas que la tengan abierta.
 *
 * Existe por lo mismo que la función de arriba: dentro de la aplicación
 * instalada hay dos sesiones, y cerrar solo la de la ventana deja la cuenta
 * puesta en la capa nativa. Recordarlo en cada botón de salir es pedir que
 * algún día se olvide —hay cuatro—, así que la regla vive en un solo sitio.
 *
 * La sesión web se cierra primero y es la que cuenta: es la que lee la
 * aplicación. Si luego falla el aviso a la capa nativa no se dice nada, porque
 * a esas alturas la sesión **ya está cerrada** y avisar de un fallo sería
 * mentir sobre lo que acaba de pasar.
 */
export async function cerrarSesion() {
  await signOut(firebaseClient().auth);
  if (!esNativo()) return;
  await complemento()
    .then((FirebaseAuthentication) => FirebaseAuthentication.signOut())
    .catch(() => undefined);
}
