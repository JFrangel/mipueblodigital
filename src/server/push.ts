import { getApps } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import {
  aparatosDe,
  aparatosDelConsejo,
  aparatosDeTodos,
  olvidar,
  type Aparato,
} from "./push-tokens";

/** Lo que va a leer la persona en la pantalla de bloqueo. */
export type Aviso = {
  title: string;
  body: string;
  /** La pantalla que abre al tocarlo. Por ejemplo `/reporte/abc/`. */
  url: string;
};

/**
 * A quién va el aviso.
 *
 * `todos` es el único que sale del círculo de los interesados, y por eso lleva
 * `salvo`: quien reportó un caso ya recibe el suyo cuando el Consejo lo toca, y
 * sonarle otra vez por la versión pública del mismo caso es sonar dos veces por
 * lo mismo.
 */
export type Destino =
  { uid: string } | { consejo: true } | { todos: true; salvo?: string };

/** FCM acepta 500 destinatarios por llamada. */
const TANDA = 500;

/**
 * El único código de FCM que significa «este aparato ya no existe».
 *
 * Cualquier otro fallo es pasajero —el servidor caído, la red— y borrar el
 * token por eso dejaría a la persona sin avisos para siempre por una caída de
 * un minuto.
 */
const MUERTO = "messaging/registration-token-not-registered";

/**
 * La mensajería de la aplicación de servidor, que aquí tiene nombre propio.
 *
 * `adminServices()` inicializa `firebase-admin` como «mi-pueblo-server» y nunca
 * como la aplicación por defecto, así que un `getMessaging()` a secas iría a
 * buscar una aplicación que en este proyecto no existe. Y como `avisar` se
 * traga los fallos a propósito, eso no se vería en ninguna parte: los avisos
 * sencillamente no llegarían nunca y los registros estarían limpios. Se busca
 * por nombre, igual que hace `adminServices()`.
 */
const mensajeria = () =>
  getMessaging(getApps().find((a) => a.name === "mi-pueblo-server"));

/**
 * Manda un aviso al teléfono.
 *
 * **Nunca lanza.** Se llama con `void` justo después de las transacciones que
 * escriben el aviso en la bandeja, y un envío que falla no puede tumbar un
 * reporte que ya se guardó. Si FCM está caído, el aviso sigue en la bandeja de
 * dentro: la información no se pierde, solo llega más tarde.
 */
export async function avisar(
  db: Firestore,
  destino: Destino,
  aviso: Aviso,
): Promise<void> {
  try {
    const aparatos: Aparato[] =
      "consejo" in destino
        ? await aparatosDelConsejo(db)
        : "todos" in destino
          ? await aparatosDeTodos(db, destino.salvo)
          : await aparatosDe(db, destino.uid);
    if (!aparatos.length) return;

    const muertos: Aparato[] = [];
    for (let i = 0; i < aparatos.length; i += TANDA) {
      const tanda = aparatos.slice(i, i + TANDA);
      const respuesta = await mensajeria().sendEachForMulticast({
        tokens: tanda.map((a) => a.token),
        notification: { title: aviso.title, body: aviso.body },
        /* La dirección viaja como dato y no dentro de la notificación: la lee
           tanto el oyente del complemento nativo como el service worker. */
        data: { url: aviso.url },
      });
      respuesta.responses.forEach((r, n) => {
        if (!r.success && r.error?.code === MUERTO) muertos.push(tanda[n]);
      });
    }
    if (muertos.length) await olvidar(db, muertos);
  } catch {
    /* A propósito. Ver el comentario de arriba. */
  }
}
