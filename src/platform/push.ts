"use client";
import { esNativo } from "./native";
import { firebaseClient } from "@/data/firebase/client";
import { memberHeaders } from "@/data/remote-reports";

/** Qué pasó al intentar apuntar este aparato. */
export type Resultado = "ok" | "denegado" | "sin-sesion" | "no-disponible";

/** Dónde corre esto, en los términos que entiende el registro del servidor. */
type Plataforma = "android" | "web";

/**
 * La clave pública de los avisos web.
 *
 * Se lee cada vez en lugar de guardarse en una constante del módulo porque así
 * las pruebas pueden quitarla, que es el caso que más importa fijar: **sin esta
 * clave el navegador no ofrece avisos y la aplicación instalada sigue igual**.
 */
const VAPID = () => process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

/**
 * Si este aparato llegó a quedar apuntado de verdad.
 *
 * En el navegador, el permiso y el registro son dos cosas distintas, y hasta
 * ahora la fila de Mi cuenta leía solo el permiso. Cuando pedir el token
 * fallaba —pasó— el permiso ya estaba concedido, así que al recargar la
 * pantalla decía «Activados» sin que nadie fuera a recibir nada: la peor clase
 * de error, el que se ve bien.
 *
 * Se apunta aquí al registrar y se borra al dar de baja. Es del navegador y de
 * nadie más, así que no viaja ni cuenta nada a ningún servidor.
 */
const APUNTADO = "mpd-avisos-apuntado";

function marcarApuntado(si: boolean) {
  try {
    if (si) localStorage.setItem(APUNTADO, "1");
    else localStorage.removeItem(APUNTADO);
  } catch {
    /* Sin almacén, la fila se guía solo por el permiso, como antes. */
  }
}

function constaApuntado(): boolean {
  try {
    return localStorage.getItem(APUNTADO) === "1";
  } catch {
    return false;
  }
}

/**
 * El complemento nativo, cargado solo cuando hace falta.
 *
 * **Se devuelve el módulo, no el complemento, y eso no es estilo.** Los
 * complementos de Capacitor son proxies que contestan a cualquier propiedad, así
 * que parecen «thenables». Devolver uno desde una función `async` hace que el
 * motor le llame `.then()` al resolver el valor de retorno; el puente contesta
 * «FirebaseMessaging.then() is not implemented on android», la promesa no se
 * resuelve **nunca**, y el `await` de quien llamó se queda colgado para siempre
 * sin que nada parezca roto. Se desestructura en cada uso.
 *
 * En el navegador no se baja nunca: no tiene nada que hacer ahí, y son unos
 * cuantos kilobytes que no pinta nadie. Es el mismo reparto que `native.ts`
 * hace con el acceso de Google.
 */
const modulo = () => import("@capacitor-firebase/messaging");

/**
 * ¿Este aparato puede recibir avisos, en principio?
 *
 * En el APK, siempre: el complemento está dentro. En el navegador hacen falta
 * las dos cosas —que el navegador sepa hacerlo y que el proyecto tenga clave
 * pública—, y si falta cualquiera de las dos no se ofrece. Un interruptor que
 * no hace nada es peor que no tener el interruptor: la persona cree que lo
 * activó y se queda esperando un aviso que no va a llegar.
 */
export async function disponible(): Promise<boolean> {
  if (esNativo()) return true;
  if (!VAPID()) return false;
  try {
    const { isSupported } = await import("firebase/messaging");
    return await isSupported();
  } catch {
    return false;
  }
}

/**
 * El canal donde caen los avisos en Android, con nombre en español.
 *
 * Android agrupa las notificaciones por canal y enseña esos grupos en los
 * ajustes del teléfono, para que la gente pueda silenciar unos y no otros. Sin
 * crear el nuestro, los avisos van a uno que el sistema rotula «Miscellaneous»:
 * en inglés, en una aplicación que es toda en español, y sin decir de qué son.
 *
 * El identificador es el mismo que declara el manifiesto en
 * `mpd_canal_avisos`; si los dos dejaran de coincidir, los avisos caerían otra
 * vez en el canal anónimo sin que nada fallara.
 *
 * Importancia 4: aparece encima de lo que se esté mirando. Aquí se justifica
 * —quien reporta un derrumbe está esperando la respuesta— y quien no lo quiera
 * así puede bajarlo desde los ajustes, que es justo para lo que sirve tener un
 * canal con nombre.
 */
async function crearCanal(
  FirebaseMessaging: Awaited<ReturnType<typeof modulo>>["FirebaseMessaging"],
) {
  await FirebaseMessaging.createChannel({
    id: "consejo",
    name: "Avisos del Consejo",
    description: "El estado de tus reportes y lo que el Consejo publica.",
    importance: 4,
  }).catch(() => undefined);
}

/**
 * ¿Están encendidos los avisos en este aparato ahora mismo?
 *
 * **El WebView de Android no implementa la API `Notification`.** Leer
 * `Notification.permission` ahí no devuelve otra cosa: revienta, y dentro de una
 * promesa se traga sin más. Es lo que dejaba la fila de Mi cuenta sin aparecer
 * en el APK mientras en el navegador salía bien, y ninguna prueba lo veía porque
 * todas simulan ese objeto.
 *
 * Así que cada mundo se pregunta con lo suyo, que es exactamente para lo que
 * existe este módulo: el complemento en la aplicación instalada, la API del
 * navegador en el navegador.
 */
/** Solo el permiso del sistema, sin mirar si el registro llegó a completarse. */
async function permisoConcedido(): Promise<boolean> {
  if (esNativo()) {
    const { FirebaseMessaging } = await modulo();
    return (await FirebaseMessaging.checkPermissions()).receive === "granted";
  }
  return (
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  );
}

export async function activado(): Promise<boolean> {
  try {
    if (!(await permisoConcedido())) return false;
    /* En el APK el complemento pide permiso y apunta el aparato en el mismo
       gesto, así que el permiso basta. En el navegador son dos cosas: se
       pueden dar permisos y aun así fallar al pedir el token —pasó—, y
       entonces la fila decía «Activados» sin que nadie fuera a recibir nada. */
    return esNativo() || constaApuntado();
  } catch {
    return false;
  }
}

/** El token de este aparato en el navegador, con la clave y el service worker. */
async function tokenWeb(): Promise<string | null> {
  const { getMessaging, getToken } = await import("firebase/messaging");
  /* Con la aplicación nombrada, no la por defecto: este proyecto crea
     «mi-pueblo» y nunca una por defecto, así que `getMessaging()` a secas
     revienta. El error se lo tragaba `registrar()` y en pantalla salía
     «no pudo quedar apuntado. Revisa la conexión», mandando a mirar la red
     cuando la red estaba perfectamente. */
  return await getToken(getMessaging(firebaseClient().app), {
    vapidKey: VAPID(),
    serviceWorkerRegistration: await navigator.serviceWorker.ready,
  });
}

/**
 * El token de este aparato, pidiendo permiso si hace falta.
 *
 * Devuelve el token con su plataforma, o la razón por la que no hay ninguno.
 */
async function pedirToken(): Promise<
  { token: string; platform: Plataforma } | Resultado
> {
  if (esNativo()) {
    const { FirebaseMessaging } = await modulo();
    const { receive } = await FirebaseMessaging.requestPermissions();
    if (receive !== "granted") return "denegado";
    await crearCanal(FirebaseMessaging);
    const { token } = await FirebaseMessaging.getToken();
    return token ? { token, platform: "android" } : "no-disponible";
  }
  if (!(await disponible())) return "no-disponible";
  const permiso =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permiso !== "granted") return "denegado";
  const token = await tokenWeb();
  return token ? { token, platform: "web" } : "no-disponible";
}

/** Manda el token al registro del servidor, firmado con la sesión. */
async function contarAlServidor(ruta: string, cuerpo: unknown) {
  const { headers } = await memberHeaders();
  await fetch(ruta, { method: "POST", headers, body: JSON.stringify(cuerpo) });
}

/**
 * Apunta este aparato para que reciba avisos.
 *
 * Pide el permiso si todavía no está dado, así que se llama en el momento en
 * que la persona entiende para qué sirve —tras enviar su primer reporte— y no
 * al abrir la aplicación.
 */
export async function registrar(): Promise<Resultado> {
  /* Un aviso es de alguien. Sin sesión no hay a quién apuntarlo, y se dice
     aparte: mandar a alguien a revisar la conexión cuando lo que le falta es
     entrar es mandarlo a buscar donde no es. */
  if (!firebaseClient().auth.currentUser) return "sin-sesion";
  try {
    const salida = await pedirToken();
    if (typeof salida === "string") return salida;
    await contarAlServidor("/api/push/registro/", salida);
    marcarApuntado(true);
    return "ok";
  } catch {
    return "no-disponible";
  }
}

/**
 * Vuelve a apuntar este aparato, sin preguntar nada.
 *
 * Los tokens de FCM rotan solos y uno viejo deja de recibir sin avisar, así que
 * se reapunta en cada arranque. La diferencia con `registrar` es que esta
 * **nunca abre el diálogo del permiso**: quien no lo ha dado no tiene por qué
 * ver una pregunta solo por abrir la aplicación, y en Android 13 en adelante un
 * «no» dicho a destiempo cuesta entrar en los ajustes del sistema para
 * deshacerlo.
 */
export async function refrescar(): Promise<void> {
  if (!firebaseClient().auth.currentUser) return;
  try {
    /* Por el permiso y no por `activado()`: un aparato que el servidor ya tiene
       apuntado debe seguir renovando su token aunque se haya borrado el almacén
       de este navegador. */
    if (!(await disponible()) || !(await permisoConcedido())) return;
    await registrar();
  } catch {
    /* Un arranque no se rompe por esto. */
  }
}

/**
 * Deja de recibir avisos en este aparato.
 *
 * Se llama desde el interruptor de Mi cuenta y **al cerrar sesión**. Lo segundo
 * no es opcional: en el río los teléfonos se prestan, y sin dar de baja el
 * token la siguiente persona que entrara recibiría los avisos de la anterior.
 *
 * **Nunca lanza.** Cerrar sesión no puede fallar porque el aparato no se
 * pudiera soltar; si el aviso al servidor no sale, ese token muere solo la
 * próxima vez que FCM lo declare muerto.
 */
export async function darDeBaja(): Promise<void> {
  try {
    let token: string | null = null;
    if (esNativo()) {
      const { FirebaseMessaging } = await modulo();
      token = (await FirebaseMessaging.getToken()).token || null;
      await FirebaseMessaging.deleteToken();
    } else {
      if (!(await disponible())) return;
      token = await tokenWeb();
      const { getMessaging, deleteToken } = await import("firebase/messaging");
      await deleteToken(getMessaging(firebaseClient().app));
    }
    marcarApuntado(false);
    if (!token) return;
    await contarAlServidor("/api/push/baja/", { token });
  } catch {
    /* Ver arriba: soltar el aparato no puede impedir cerrar la sesión. */
  }
}
