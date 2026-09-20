"use client";
import { registerPlugin } from "@capacitor/core";
import { esNativo } from "./native";

/**
 * En qué quedaron los permisos que esta aplicación pide.
 *
 * Existe para una sola pantalla —la de Mi cuenta— y para un solo problema: en
 * Android 13 en adelante, **un «no» dicho a destiempo solo se deshace entrando
 * en los ajustes del sistema**, y una aplicación que no lo cuenta deja a alguien
 * encerrado para siempre en una respuesta que dio sin mirar, creyendo que el
 * dictado o la ubicación simplemente no funcionan.
 *
 * Aquí no se pide nada. Pedir se hace en el momento en que la persona entiende
 * para qué sirve —al pulsar «Activar micrófono», al pulsar «Usar mi
 * ubicación»—, que es la regla que este proyecto ya aplicaba a los avisos.
 */

export type Estado = "concedido" | "sin-conceder" | "negado" | "no-aplica";

/** Qué se pregunta. Los avisos tienen su propia fila y su propio interruptor. */
export type Permiso = "microfono" | "ubicacion";

/**
 * El navegador contesta con tres palabras y Android con otras tres. Se traducen
 * a las mismas, porque quien lee la pantalla no tiene por qué saber en cuál de
 * los dos mundos está.
 */
const comoEstado = (valor: string | undefined): Estado =>
  valor === "granted"
    ? "concedido"
    : valor === "denied"
      ? "negado"
      : valor === "prompt" || valor === "prompt-with-rationale"
        ? "sin-conceder"
        : "no-aplica";

async function nativo(permiso: Permiso): Promise<Estado> {
  try {
    if (permiso === "microfono") {
      const { SpeechRecognition } =
        await import("@capacitor-community/speech-recognition");
      if (!(await SpeechRecognition.available()).available) return "no-aplica";
      return comoEstado(
        (await SpeechRecognition.checkPermissions()).speechRecognition,
      );
    }
    const { Geolocation } = await import("@capacitor/geolocation");
    const permisos = await Geolocation.checkPermissions();
    /* Cualquiera de los dos vale: con el grueso se sitúa el sector, que es
       mejor que nada cuando alguien no quiso dar el fino. */
    return permisos.location === "granted" ||
      permisos.coarseLocation === "granted"
      ? "concedido"
      : comoEstado(permisos.location);
  } catch {
    return "no-aplica";
  }
}

async function web(permiso: Permiso): Promise<Estado> {
  /* `navigator.permissions` no está en todos los navegadores, y el nombre
     «microphone» tampoco lo admiten todos. Donde no se pueda preguntar se dice
     «no-aplica» y la fila no sale: una fila que dice «no sabemos» no ayuda a
     nadie a decidir nada. */
  try {
    const consulta = navigator.permissions?.query;
    if (!consulta) return "no-aplica";
    const estado = await navigator.permissions.query({
      name: permiso === "microfono" ? "microphone" : "geolocation",
    } as PermissionDescriptor);
    return comoEstado(estado.state);
  } catch {
    return "no-aplica";
  }
}

export const estadoDe = (permiso: Permiso): Promise<Estado> =>
  esNativo() ? nativo(permiso) : web(permiso);

async function pedirNativo(permiso: Permiso): Promise<Estado> {
  try {
    if (permiso === "microfono") {
      const { SpeechRecognition } =
        await import("@capacitor-community/speech-recognition");
      return comoEstado(
        (await SpeechRecognition.requestPermissions()).speechRecognition,
      );
    }
    const { Geolocation } = await import("@capacitor/geolocation");
    const permisos = await Geolocation.requestPermissions();
    return permisos.location === "granted" ||
      permisos.coarseLocation === "granted"
      ? "concedido"
      : comoEstado(permisos.location);
  } catch {
    return "no-aplica";
  }
}

async function pedirWeb(permiso: Permiso): Promise<Estado> {
  try {
    if (permiso === "microfono") {
      const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
      /* Se suelta en cuanto se concede: aquí se pedía el permiso, no se está
         grabando, y dejar el micrófono abierto encendería el punto rojo del
         teléfono sin que nadie esté dictando. */
      flujo.getTracks().forEach((pista) => pista.stop());
      return "concedido";
    }
    await new Promise<void>((bien, mal) =>
      navigator.geolocation.getCurrentPosition(() => bien(), mal, {
        timeout: 20000,
      }),
    );
    return "concedido";
  } catch {
    /* Un «no» no es un fallo: se vuelve a leer el estado y se dice lo que haya
       quedado, que es lo que hace falta para saber si se puede reintentar. */
    return web(permiso);
  }
}

/**
 * Pedir el permiso.
 *
 * Se pide **al pulsar la fila**, que es cuando la persona ya sabe para qué
 * sirve. Antes esta pantalla solo contaba en qué habían quedado y remitía a
 * los ajustes con un párrafo permanente: una pantalla que dice «esto está
 * apagado» y no ofrece encenderlo obliga a salir de la aplicación para algo
 * que se resuelve con un toque.
 */
export const pedir = (permiso: Permiso): Promise<Estado> =>
  esNativo() ? pedirNativo(permiso) : pedirWeb(permiso);

/**
 * Abrir los permisos de esta aplicación en los ajustes del teléfono.
 *
 * Solo existe en el APK, y por eso devuelve si pudo: quien llama tiene que
 * poder decir el camino de palabra cuando no. En el navegador no hay nada que
 * abrir —los permisos de un sitio los gobierna el propio navegador— y contesta
 * que no sin intentarlo.
 */
export async function abrirAjustes(): Promise<boolean> {
  if (!esNativo()) return false;
  try {
    const Ajustes = registerPlugin<{ abrirPermisos(): Promise<void> }>(
      "Ajustes",
    );
    await Ajustes.abrirPermisos();
    return true;
  } catch {
    return false;
  }
}

/**
 * ¿Está la aplicación instalada, fuera de una pestaña?
 *
 * **Importa porque cambia dónde se arreglan los permisos.** Instalada —el icono
 * en la pantalla de inicio, sin barra de direcciones a la vista— no hay candado
 * que tocar, aunque por dentro siga siendo el navegador quien manda. El sistema
 * la registra como una aplicación más, así que sus permisos están donde los de
 * cualquier otra.
 *
 * `standalone` es lo que dicen Android y los navegadores de escritorio;
 * `navigator.standalone` es lo que dice iOS, que nunca implementó lo primero.
 */
const instalada = () => {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
};

/**
 * Dónde se arregla un permiso negado.
 *
 * **Son dos caminos y no tres**, aunque los sitios donde corre esto sean tres.
 * En el APK esto casi nunca se lee, porque `abrirAjustes` abre esa pantalla de
 * un toque; queda para cuando no se pueda. Instalada desde el navegador el
 * camino es **el mismo**: el teléfono la registra como una aplicación y sus
 * permisos están donde los de cualquier otra. Y en una pestaña, el candado.
 *
 * Decía el del candado en los dos sitios donde no hay candado. A quien lo leía
 * dentro de una aplicación instalada se le mandaba a buscar una barra de
 * direcciones que no existe, que es peor que no decir nada: parece que uno no
 * encuentra algo que está.
 *
 * Va **en minúscula y sin preposición**, porque se lee detrás de «Se cambia
 * en»: con la mayúscula puesta, la frase salía diciendo «se cambia en En la
 * barra de direcciones».
 */
export const dondeSeArregla = () =>
  esNativo() || instalada()
    ? "los ajustes del teléfono › Aplicaciones › Mi Pueblo Digital › Permisos."
    : "la barra de direcciones del navegador, tocando el candado › Permisos de este sitio.";
