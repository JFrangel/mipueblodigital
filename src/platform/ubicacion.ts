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
  | "ubicacion-apagada"
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

/**
 * Por qué falló, de verdad.
 *
 * **Esto existe porque antes no existía**, y esa es la historia de un fallo
 * real: cualquier error que no fuera un plazo agotado se convertía en «la señal
 * no alcanza para situarte con precisión». Con la ubicación del teléfono
 * apagada —el caso más común de todos— la aplicación culpaba a la señal y
 * mandaba a alguien a buscar cobertura en la orilla, cuando lo único que había
 * que hacer era bajar la cortinilla y pulsar un botón. Decir una causa falsa
 * es peor que no decir ninguna: manda a arreglar donde no está roto.
 *
 * Se mira primero el código del complemento, que es estable, y solo si no lo
 * hay se mira el texto, que puede cambiar entre versiones.
 */
function porQue(error: unknown): SinPunto {
  const e = error as { code?: unknown; message?: unknown };
  const codigo = String(e?.code ?? "");
  const dicho = String(e?.message ?? "");
  /* OS-PLUG-GLOC-0007 y -0017: la ubicación del aparato está apagada. */
  if (/GLOC-(0007|0017)/.test(codigo) || /not enabled|turned off/i.test(dicho))
    return "ubicacion-apagada";
  if (/GLOC-(0003|0009)/.test(codigo) || /permission.*denied/i.test(dicho))
    return "sin-permiso";
  if (/GLOC-0010/.test(codigo) || /timeout|timed out|in time/i.test(dicho))
    return "tarde";
  /* Lo que quede —Play Services, ajustes, posición no disponible— sí se
     parece a no poder situarse, y ahí el mensaje de la señal no miente. */
  return "sin-señal";
}

/** Una lectura del aparato, con o sin precisión fina. */
async function leer(alta: boolean) {
  const { Geolocation } = await modulo();
  const { coords } = await Geolocation.getCurrentPosition({
    enableHighAccuracy: alta,
    timeout: ESPERA_MS,
    maximumAge: 0,
  });
  return coords;
}

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
      try {
        return aceptar(await leer(true));
      } catch (error) {
        const motivo = porQue(error);
        /* Sin permiso o con la ubicación apagada no hay segunda oportunidad:
           volver a preguntar da el mismo error y hace esperar otros treinta
           segundos para nada. */
        if (motivo !== "sin-señal" && motivo !== "tarde") return motivo;
        /* **Pero bajo el dosel sí la hay.** El GPS fino no engancha entre los
           árboles, y ahí antes esto se rendía; las antenas y la red sí dan un
           punto, con peor margen. No es bajar el listón: el filtro de
           MARGEN_MAXIMO sigue puesto y descarta la lectura si no vale. */
        return aceptar(await leer(false));
      }
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
    /* El complemento nativo lanza en vez de contestar, así que aquí llega
       todo lo que no atrapó la rama de arriba. */
    return porQue(error);
  }
}

/** Lo que se le dice a una persona cuando no hubo punto. */
export const motivos: Record<SinPunto, string> = {
  "sin-permiso":
    "No se autorizó la ubicación. Puedes marcar el punto en el mapa, o darle permiso desde los ajustes de este dispositivo.",
  "ubicacion-apagada":
    "El teléfono tiene la ubicación apagada. Enciéndela y vuelve a intentarlo, o marca el punto en el mapa.",
  "sin-señal":
    "La señal no alcanza para situarte con precisión. Marca el punto en el mapa: ahí tú sabes mejor que el aparato.",
  tarde:
    "El aparato tardó demasiado en encontrarte. Inténtalo al aire libre, o marca el punto en el mapa.",
  "fuera-del-territorio":
    "La ubicación que entregó este dispositivo cae fuera de la cuenca del Satinga. Marca el punto en el mapa.",
  "no-disponible":
    "Este dispositivo no puede decir dónde está. Marca el punto en el mapa.",
};
