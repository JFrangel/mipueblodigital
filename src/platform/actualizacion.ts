"use client";
import { registerPlugin } from "@capacitor/core";
import { esNativo } from "./native";

/**
 * Si hay un APK nuevo esperando, y cómo ir a buscarlo.
 *
 * **Por qué hace falta.** La aplicación instalada es una ventana a la web, así
 * que casi todo lo que se arregla llega solo a los teléfonos: no hay que hacer
 * nada. Lo que no llega nunca es lo que vive dentro del archivo —el icono, los
 * permisos declarados, los complementos nativos, la pantalla de arranque—, y
 * eso obliga a reinstalar. Sin un aviso, esa reinstalación depende de que
 * alguien se acuerde de avisar por WhatsApp, vereda por vereda.
 *
 * Solo corre dentro del APK. En el navegador no hay nada que actualizar: lo que
 * se sirve ya es lo último.
 */

/** Lo que el servidor publica junto al APK. Lo escribe `scripts/publicar-apk.mjs`. */
export type VersionPublicada = {
  versionCode: number;
  versionName: string;
  bytes: number;
  fecha: string;
  /** Qué gana quien se la descargue. Vacío si no se escribió ninguna. */
  notas: string;
  /**
   * Dónde está el archivo. **Lo dice el servidor a propósito**: de dónde se
   * baja el APK decide si el botón funciona o no en las versiones viejas (ver
   * `irALaDescarga`), y escrito aquí se puede cambiar de sitio sin que nadie
   * tenga que reinstalar nada. Si falta, se supone el sitio de siempre.
   */
  url?: string;
};

export type Actualizacion = VersionPublicada & {
  /** La que hay instalada, para poder decir de dónde a dónde se va. */
  instalada: string;
  /** Cuánto pesa, ya en palabras: aquí importa antes de pulsar. */
  peso: string;
  /** La dirección del archivo, ya entera. */
  donde: string;
};

const DESCARGA = "/descargas/mi-pueblo-digital.apk";

/**
 * ¿Hay algo más nuevo que lo que está instalado?
 *
 * Devuelve `null` en cuanto algo no cuadre —sin red, sin JSON, versión ilegible,
 * en el navegador— y no lo cuenta como error en ninguna parte. **Un aviso de
 * actualización que falla no es una avería**: es que hoy no se puede saber, y
 * la aplicación funciona igual de bien sin saberlo. Lo que no puede pasar es
 * que esto reviente y se lleve por delante la pantalla donde aparece.
 */
export async function hayActualizacion(): Promise<Actualizacion | null> {
  if (!esNativo()) return null;
  try {
    const { App } = await import("@capacitor/app");
    const propia = await App.getInfo();
    /* `build` es el versionCode de Android. Llega como texto. */
    const instalado = Number.parseInt(propia.build, 10);
    if (!Number.isFinite(instalado)) return null;

    const respuesta = await fetch("/descargas/version.json", {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!respuesta.ok) return null;
    const publicada = (await respuesta.json()) as VersionPublicada;
    if (
      typeof publicada?.versionCode !== "number" ||
      publicada.versionCode <= instalado
    )
      return null;

    return {
      ...publicada,
      instalada: propia.version,
      peso: `${(publicada.bytes / 1024 / 1024).toFixed(0)} MB`,
      donde: new URL(publicada.url ?? DESCARGA, location.origin).href,
    };
  } catch {
    return null;
  }
}

/**
 * Lo que tarda en darse por vencido una llamada al complemento.
 *
 * **Existe por una trampa de Capacitor.** Cuando a un complemento le falta un
 * método —porque el APK instalado es anterior al que lo añadió—, el puente lo
 * anota en el registro y **no contesta nada**: ni resuelve ni rechaza, ver
 * `Bridge.callPluginMethod`. La promesa se queda colgada para siempre y el
 * botón se quedaría en «Descargando…» hasta cerrar la aplicación.
 */
const PLAZO_MS = 2500;

function conPlazo<T>(promesa: Promise<T>): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, fallar) => setTimeout(fallar, PLAZO_MS)),
  ]);
}

/**
 * Cómo va la descarga.
 *
 * `porcentaje` es −1 mientras el servidor no diga el tamaño, y `esperando` dice
 * que el gestor de Android se quedó sin conexión y está reintentando. **Los dos
 * hacen falta**: una barra parada sin más miente sobre lo que está pasando, y
 * quien la mira piensa que la aplicación se colgó.
 */
export type Avance = {
  porcentaje: number;
  hechos: number;
  total: number;
  esperando: boolean;
};

/**
 * En qué acabó el intento de actualizar.
 *
 * Son cuatro y no un `boolean` porque cada uno se le dice a la persona de una
 * manera distinta, y confundirlos es dejarla mirando una pantalla que no
 * explica qué pasó.
 */
export type Resultado =
  /** El instalador de Android está abierto. No hay nada más que hacer aquí. */
  | "instalando"
  /** Falta permitirle a esta aplicación instalar. Se puede abrir esa pantalla. */
  | "sin-permiso"
  /** Versión vieja: se abrió el navegador y la descarga sigue fuera. */
  | "navegador"
  /** No se pudo. Queda decir la dirección para que alguien la escriba. */
  | "a-mano";

type Puente = {
  puedeInstalar(): Promise<{ puede: boolean }>;
  pedirPermisoInstalar(): Promise<void>;
  descargarEInstalar(opciones: { url: string }): Promise<void>;
  addListener(
    evento: "progreso",
    escucha: (avance: Avance) => void,
  ): Promise<{ remove: () => Promise<void> }>;
};

const puente = () => registerPlugin<Puente>("Actualizacion");

/** Abrir la pantalla de Android donde se permite instalar a esta aplicación. */
export async function permitirInstalar(): Promise<void> {
  try {
    await conPlazo(puente().pedirPermisoInstalar());
  } catch {
    /* Sin esa pantalla no hay nada que ofrecer; el aviso ya dice el camino. */
  }
}

/**
 * Descargar la versión nueva e instalarla.
 *
 * **Todo ocurre dentro de la aplicación**, salvo el «Instalar» final, que lo
 * pregunta Android y tiene que preguntarlo: una aplicación que se reemplaza
 * sola sin que nadie diga que sí es exactamente lo que el sistema está ahí para
 * impedir.
 *
 * Quedan dos caminos de repuesto, y no son adorno. La 1.2 es la primera que
 * trae el complemento; quien tenga la 1.1 solo tiene `abrirEnlace`, que abre el
 * navegador, y quien tenga la 1.0 no tiene ni eso. Los tres casos van a existir
 * a la vez en el río durante meses, porque actualizar depende de que alguien
 * baje al pueblo con señal.
 */
export async function instalarActualizacion(
  nueva: Actualizacion,
  alAvanzar: (avance: Avance) => void,
): Promise<Resultado> {
  if (!esNativo()) return "a-mano";

  let quitar: (() => Promise<void>) | null = null;
  try {
    const plugin = puente();
    /* Se pregunta **antes** de bajar nada: siete megas para chocarse luego con
       un «no» es gastarle a alguien el plan de datos para nada. */
    const { puede } = await conPlazo(plugin.puedeInstalar());
    if (!puede) return "sin-permiso";

    const oyente = await conPlazo(plugin.addListener("progreso", alAvanzar));
    quitar = oyente.remove;
    /* Sin plazo: esto dura lo que dure la descarga, que con la señal del río
       pueden ser varios minutos, y cortarla sería el peor error posible. */
    await plugin.descargarEInstalar({ url: nueva.donde });
    return "instalando";
  } catch (error) {
    if (esFaltaDePermiso(error)) return "sin-permiso";
  } finally {
    if (quitar) await quitar().catch(() => {});
  }

  return await porElNavegador(nueva);
}

function esFaltaDePermiso(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "sin-permiso"
  );
}

/**
 * El camino de la 1.1: sacar la descarga al navegador del teléfono.
 *
 * La ventana de Capacitor no sabe descargar archivos —no le pone un
 * `DownloadListener` al WebView—, así que un enlace a un `.apk` desde dentro no
 * hace nada. Fuera, la descarga la hace quien sabe hacerla; lo que ya no hace
 * nadie por la persona es encontrar el archivo después y tocarlo.
 */
async function porElNavegador(nueva: Actualizacion): Promise<Resultado> {
  try {
    const Ajustes = registerPlugin<{
      abrirEnlace(opciones: { url: string }): Promise<void>;
    }>("Ajustes");
    await conPlazo(Ajustes.abrirEnlace({ url: nueva.donde }));
    return "navegador";
  } catch {
    /* Ni eso: la 1.0. Queda navegar a secas, que solo sirve si el archivo está
       en otro dominio —Capacitor suelta al navegador lo que no es suyo, ver
       `Bridge.launchIntent`—. Cambiar solo el esquema no vale: «.app» está en
       la lista de precarga de HSTS y el navegador repone «https:» antes de que
       nadie mire la dirección. */
  }
  try {
    location.href = nueva.donde;
  } catch {
    /* La dirección escrita es lo único que queda. */
  }
  return "a-mano";
}
