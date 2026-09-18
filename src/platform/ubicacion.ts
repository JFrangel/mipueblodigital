"use client";
import { esNativo } from "./native";
import { isInsideTerritory } from "@/domain/territory";

/**
 * Dónde está quien reporta, si decide decirlo.
 *
 * En un territorio de casas dispersas y presencia armada, una coordenada es una
 * persona parada en un sitio a una hora. Así que esto **no se llama solo**:
 * existe para un botón que se pulsa a propósito, cada vez, y nada de lo que hay
 * aquí guarda ni recuerda nada entre una vez y la siguiente.
 */

/** Por qué no hay punto, cuando no lo hay. */
export type SinPunto =
  | "sin-permiso"
  | "sin-señal"
  | "tarde"
  | "fuera-del-territorio"
  | "no-disponible";

export type Punto = {
  lat: number;
  lng: number;
  /** Metros de margen que declara el aparato. Ver `MARGEN_MAXIMO`. */
  exactitud: number;
};

/**
 * Hasta dónde vale una lectura.
 *
 * **El margen no es adorno.** Bajo el dosel del bosque, o con el GPS recién
 * encendido, un teléfono entrega tranquilamente un punto con dos kilómetros de
 * error. Eso es peor que el punto documentado de la vereda, y ofrecerlo como
 * «tu ubicación» sería mentir con una cifra delante. Por encima de este margen
 * se rechaza y se dice que la señal no alcanza.
 *
 * Quinientos metros: en esta cuenca es la distancia a la que un sector deja de
 * ser el mismo sector.
 */
export const MARGEN_MAXIMO = 500;

/**
 * Cuánto se espera.
 *
 * Un GPS frío bajo los árboles tarda entre veinte y cuarenta segundos. Cortar
 * antes devuelve «no se pudo» a alguien que solo tenía que esperar un poco más.
 */
export const ESPERA_MS = 30000;

const modulo = () => import("@capacitor/geolocation");

/** ¿Este aparato puede decir dónde está, en principio? */
export function disponible(): boolean {
  return esNativo() || typeof navigator?.geolocation !== "undefined";
}

/**
 * Convierte una lectura cruda en un punto, o en el motivo por el que no lo es.
 *
 * Se comparte entre los dos mundos porque las dos reglas —el margen y el
 * marco del territorio— son del dominio y no de la plataforma.
 */
function aceptar(coords: {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}): Punto | SinPunto {
  const exactitud = coords.accuracy ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(exactitud) || exactitud > MARGEN_MAXIMO)
    return "sin-señal";
  /* El mismo marco que ya filtra un punto marcado a mano. Un aparato con la
     ubicación simulada, o un navegador detrás de una red que la deduce de la
     IP, puede situar a alguien en otro departamento; eso no es un reporte de
     este río. */
  if (!isInsideTerritory(coords.latitude, coords.longitude))
    return "fuera-del-territorio";
  return { lat: coords.latitude, lng: coords.longitude, exactitud };
}

/**
 * Pide la ubicación **una vez**.
 *
 * No hay seguimiento: ni `watchPosition`, ni caché. `maximumAge: 0` a
 * propósito, porque un punto guardado de hace una hora es de otro sitio y aquí
 * la gente se mueve en canoa.
 */
export async function dondeEstoy(): Promise<Punto | SinPunto> {
  if (!disponible()) return "no-disponible";
  try {
    if (esNativo()) {
      const { Geolocation } = await modulo();
      /* El permiso, solo si hace falta. En Android 13 en adelante un «no» a
         destiempo obliga a entrar en los ajustes del sistema para deshacerlo. */
      const tiene = await Geolocation.checkPermissions();
      const permiso =
        tiene.location === "granted" || tiene.coarseLocation === "granted"
          ? tiene
          : await Geolocation.requestPermissions({
              permissions: ["location", "coarseLocation"],
            });
      if (
        permiso.location !== "granted" &&
        permiso.coarseLocation !== "granted"
      )
        return "sin-permiso";
      const { coords } = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: ESPERA_MS,
        maximumAge: 0,
      });
      return aceptar(coords);
    }
    return await new Promise<Punto | SinPunto>((resolver) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolver(aceptar(coords)),
        (error) =>
          resolver(
            error.code === error.PERMISSION_DENIED
              ? "sin-permiso"
              : error.code === error.TIMEOUT
                ? "tarde"
                : "sin-señal",
          ),
        { enableHighAccuracy: true, timeout: ESPERA_MS, maximumAge: 0 },
      );
    });
  } catch (error) {
    /* El complemento nativo lanza al agotarse el plazo en vez de contestar. */
    return /timeout|timed out/i.test(String((error as Error)?.message ?? ""))
      ? "tarde"
      : "sin-señal";
  }
}

/** Lo que se le dice a una persona cuando no hubo punto. */
export const motivos: Record<SinPunto, string> = {
  "sin-permiso":
    "No se autorizó la ubicación. Puedes marcar el punto en el mapa, o darle permiso desde los ajustes de este dispositivo.",
  "sin-señal":
    "La señal no alcanza para situarte con precisión. Marca el punto en el mapa: ahí tú sabes mejor que el aparato.",
  tarde:
    "El aparato tardó demasiado en encontrarte. Inténtalo al aire libre, o marca el punto en el mapa.",
  "fuera-del-territorio":
    "La ubicación que entregó este dispositivo cae fuera de la cuenca del Satinga. Marca el punto en el mapa.",
  "no-disponible":
    "Este dispositivo no puede decir dónde está. Marca el punto en el mapa.",
};
