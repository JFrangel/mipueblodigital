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
 * El módulo del complemento, cargado solo aquí y solo cuando hace falta: en el
 * navegador no se baja nunca, porque no tiene nada que hacer.
 *
 * **Se devuelve el módulo, no el complemento, y eso no es estilo.** Los
 * complementos de Capacitor son proxies que contestan a cualquier propiedad, así
 * que parecen «thenables». Devolver uno desde una función `async` hace que el
 * motor le llame `.then()` al resolver el valor de retorno; el puente contesta
 * «FirebaseAuthentication.then() is not implemented on android», la promesa no
 * se resuelve **nunca** y el `await` de quien llamó se queda colgado para
 * siempre, sin nada roto a la vista. Se desestructura en cada uso.
 */
const modulo = () => import("@capacitor-firebase/authentication");

/** La sesión nativa permite a WorkManager renovar el token con la app cerrada.
 * La contraseña se entrega al complemento para iniciar sesión y no se guarda
 * en la cola, en archivos ni en preferencias de la aplicación. */
export async function entrarCorreoNativo(email: string, password: string) {
  if (!esNativo()) return true;
  try {
    const { FirebaseAuthentication } = await modulo();
    const { user } = await FirebaseAuthentication.signInWithEmailAndPassword({
      email,
      password,
    });
    return user?.uid === firebaseClient().auth.currentUser?.uid;
  } catch {
    return false;
  }
}

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
/**
 * El código de Firebase, cuando el complemento nativo no lo trae.
 *
 * El trayecto de arriba pasa por dos Firebase, y el nativo revienta **antes**
 * que el web: una cuenta cerrada falla ya en `signInWithGoogle()`, con una
 * excepción de Android cuyo `code` no siempre es el `auth/…` que entiende
 * `authError()`. Cuando eso pasa, quien pidió eliminar su cuenta y volvió se
 * lleva en el APK el texto de reserva —«revisa tus datos»— mientras en el
 * navegador lee la verdad. Esto reconoce ese caso por lo que Android sí dice
 * siempre, que es su propio nombre del error, y lo traduce.
 *
 * Es una red por debajo, no el camino principal: si el complemento ya trae el
 * código bueno, no se toca nada.
 */
function conCodigoDeFirebase(error: unknown): unknown {
  const e = error as { code?: unknown; message?: unknown };
  if (typeof e?.code === "string" && e.code.startsWith("auth/")) return error;
  const dicho = `${String(e?.code ?? "")} ${String(e?.message ?? "")}`;
  if (/ERROR_USER_DISABLED|user (account )?has been disabled/i.test(dicho))
    return Object.assign(error as object, { code: "auth/user-disabled" });
  return error;
}

export async function entrarConGoogleNativo() {
  const { FirebaseAuthentication } = await modulo();
  const { credential } = await FirebaseAuthentication.signInWithGoogle().catch(
    (error: unknown) => {
      throw conCodigoDeFirebase(error);
    },
  );
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
 * Antes de nada se suelta el aparato de los avisos. En el río los teléfonos
 * se prestan, y un token que se queda anotado hace que la siguiente persona que
 * entre reciba los avisos de la anterior: el estado de sus reportes, el motivo
 * por el que le retiraron uno. No es limpieza, es de quién lee qué. Va primero
 * porque darlo de baja necesita la sesión para firmar la petición; después ya no
 * habría con qué.
 *
 * La sesión web se cierra a continuación y es la que cuenta: es la que lee la
 * aplicación. Si luego falla el aviso a la capa nativa no se dice nada, porque
 * a esas alturas la sesión **ya está cerrada** y avisar de un fallo sería
 * mentir sobre lo que acaba de pasar.
 */
export async function cerrarSesion() {
  /* Nunca lanza —ver push.ts—, así que no puede impedir cerrar la sesión. */
  await (await import("./push")).darDeBaja();
  const owner = firebaseClient().auth.currentUser?.uid;
  if (owner) await (await import("./native-outbox")).clearNativeOwner(owner);
  await signOut(firebaseClient().auth);
  if (!esNativo()) return;
  await modulo()
    .then(({ FirebaseAuthentication }) => FirebaseAuthentication.signOut())
    .catch(() => undefined);
}
