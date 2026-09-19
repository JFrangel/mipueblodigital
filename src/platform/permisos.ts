"use client";
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
      const { SpeechRecognition } = await import(
        "@capacitor-community/speech-recognition"
      );
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

/**
 * Dónde se arregla un permiso negado.
 *
 * No se abren los ajustes: hacerlo desde una ventana de Capacitor necesita otro
 * complemento en el APK, y el camino dicho con todas sus letras resuelve lo
 * mismo. Si algún día entra ese complemento, este es el sitio.
 */
export const dondeSeArregla = () =>
  esNativo()
    ? "Ajustes del teléfono › Aplicaciones › Mi Pueblo Digital › Permisos."
    : "En la barra de direcciones del navegador, tocando el candado › Permisos de este sitio.";
