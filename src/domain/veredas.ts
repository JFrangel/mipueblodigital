/**
 * Deducir dónde queda una vereda a partir de los reportes de quien está allí.
 *
 * Seis de las dieciocho veredas del catálogo no tienen punto documentado, y sin
 * punto no hay mapa: ni en el formulario del reporte ni en el del territorio. El
 * catálogo sale del EOT de 2007 y él mismo se declara pendiente de validación.
 * La gente del río sabe dónde queda su vereda mejor que un documento de hace
 * diecinueve años; esto es la aritmética con la que lo dice.
 *
 * **Aquí no se decide nada.** Esto propone; acepta el Consejo. El catálogo
 * territorial de un consejo comunitario no lo edita una media.
 */

/** Un punto que aportó un reporte, con lo que hace falta para pesarlo. */
export type Aporte = {
  lat: number;
  lng: number;
  /** Metros que declaró el aparato. */
  exactitud: number;
  /** De dónde salió. Solo cuentan los del aparato; ver `SOLO_DEL_APARATO`. */
  origen: "aparato" | "mano";
  /** De quién. Tres reportes de una sola persona son un dato, no tres. */
  cuenta: string;
};

export type Propuesta = {
  lat: number;
  lng: number;
  /** Cuántos aportes la sostienen, ya filtrados. */
  aportes: number;
  /** De cuántas cuentas distintas. */
  cuentas: number;
  /** Distancia mediana de los aportes al centro, en metros: cómo de apretado. */
  dispersion: number;
  /**
   * Cuántos aportes caen lejos del centro.
   *
   * Hace falta **además** de la dispersión, y lo descubrió una prueba. La
   * mediana describe el grupo y por eso aguanta los intrusos —para eso se
   * eligió—, pero eso mismo la deja callada cuando hay dos reportes perdidos
   * entre cinco: sigue diciendo trescientos metros mientras dos están a cuarenta
   * kilómetros. Son las dos preguntas del Consejo y son distintas: «¿están
   * juntos?» y «¿hay alguno que no pinta nada aquí?».
   */
  apartados: number;
  /** Si algo de lo anterior merece que el Consejo mire con cuidado. */
  disperso: boolean;
};

/** Mínimos para proponerle algo al Consejo. */
export const MINIMO_APORTES = 3;
export const MINIMO_CUENTAS = 2;

/**
 * Margen máximo de un punto que cuenta para deducir.
 *
 * Más estricto que el del reporte (500 m). Un caso mal situado se corrige en
 * campo; un catálogo mal situado se queda.
 */
export const MARGEN_PARA_DEDUCIR = 100;

/** Por encima de esto se avisa. No se rechaza: ver el comentario de abajo. */
export const DISPERSION_AVISO = 2000;

/** Cuánto tiene que apartarse el centro para volver a molestar al Consejo. */
export const DERIVA_MINIMA = 500;

/** Tres decimales: unos 110 m. Nombra un sector, no señala una casa. */
const redondear = (valor: number) => Math.round(valor * 1000) / 1000;

/** La mediana de una lista. Con lista vacía no se llama. */
function mediana(valores: readonly number[]): number {
  const orden = [...valores].sort((a, b) => a - b);
  const medio = orden.length >> 1;
  return orden.length % 2
    ? orden[medio]
    : (orden[medio - 1] + orden[medio]) / 2;
}

/**
 * Distancia en metros entre dos puntos.
 *
 * Aproximación plana, y basta: en esta cuenca las distancias que interesan son
 * de metros a pocos kilómetros, y a esa escala la curvatura no cambia ninguna
 * decisión. Un grado de latitud son 111 320 m; uno de longitud, eso mismo por el
 * coseno de la latitud, que aquí (2° N) vale casi uno.
 */
export function metrosEntre(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const grado = 111320;
  const dy = (a.lat - b.lat) * grado;
  const dx = (a.lng - b.lng) * grado * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/**
 * Qué aportes cuentan.
 *
 * Los del aparato y con buen margen. **Un punto marcado a mano no dice dónde
 * está la vereda**: dice dónde está el derrumbe, y sale de un mapa que ya
 * estaba centrado donde nosotros lo centramos. Contarlo sería medir nuestra
 * propia respuesta y convencernos de que acertamos.
 */
export const cuenta = (aporte: Aporte) =>
  aporte.origen === "aparato" && aporte.exactitud <= MARGEN_PARA_DEDUCIR;

/**
 * El punto que se le propone al Consejo, o nada.
 *
 * **La mediana, no el promedio.** Un solo reporte hecho desde el casco urbano
 * sobre algo que pasó en la vereda arrastra un promedio kilómetros; a la mediana
 * no la mueve. Con puñados de puntos —que es lo que va a haber— es además
 * trivial de explicar, y explicarlo importa: el Consejo tiene que entender de
 * dónde salió el punto que le proponen.
 *
 * La dispersión se calcula y se devuelve, pero **no rechaza**: una vereda a lo
 * largo del río puede medir dos kilómetros, y quién sabe si el punto sirve como
 * referencia es el Consejo, no un umbral.
 */
export function proponer(aportes: readonly Aporte[]): Propuesta | null {
  const validos = aportes.filter(cuenta);
  if (validos.length < MINIMO_APORTES) return null;
  const cuentas = new Set(validos.map((a) => a.cuenta));
  if (cuentas.size < MINIMO_CUENTAS) return null;

  const centro = {
    lat: redondear(mediana(validos.map((a) => a.lat))),
    lng: redondear(mediana(validos.map((a) => a.lng))),
  };
  const distancias = validos.map((a) => metrosEntre(a, centro));
  const dispersion = Math.round(mediana(distancias));
  const apartados = distancias.filter((d) => d > DISPERSION_AVISO).length;
  return {
    ...centro,
    aportes: validos.length,
    cuentas: cuentas.size,
    dispersion,
    apartados,
    disperso: dispersion > DISPERSION_AVISO || apartados > 0,
  };
}

/**
 * Si un punto ya aceptado merece que se vuelva a proponer otro.
 *
 * El acumulador sigue acumulando después de aceptar, pero **no mueve nada
 * solo**. Solo cuando el centro se aparta lo suficiente se le vuelve a poner
 * delante al Consejo: «doce reportes sitúan ahora El Firme 600 m al oriente».
 */
export const seMovio = (
  aceptado: { lat: number; lng: number },
  propuesto: { lat: number; lng: number },
) => metrosEntre(aceptado, propuesto) >= DERIVA_MINIMA;

/**
 * El nombre de una vereda, reducido a lo que la hace la misma vereda.
 *
 * Sin mayúsculas, sin tildes, sin signos y con un solo espacio. La bandeja del
 * Consejo ya arrastra la lección: sin esto, «Bellavista», «Bella Vista» y
 * «bellavista» son tres sitios, el mapa los dibuja tres veces y las cifras los
 * cuentan por separado.
 */
export const clave = (nombre: string) =>
  nombre
    /* Descomponer separa cada tilde de su letra, y el barrido de abajo se las
       lleva junto a los signos: una tilde suelta no es letra ni número ni
       espacio. Aquí había además un `replace` explícito de diacríticos que no
       hacía nada —lo descubrió una mutación que sobrevivió—, y lo que no hace
       nada es peor que no estar: el día que alguien toque esta cadena, creerá
       que las tildes las quita esa línea. */
    .normalize("NFD")
    .toLocaleLowerCase("es")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Busca un nombre escrito a mano dentro del catálogo.
 *
 * Devuelve la del catálogo si es la misma escrita de otra manera, o nulo si de
 * verdad es nueva. Se llama **antes** de crear nada.
 */
export function comoLaDelCatalogo(
  escrito: string,
  catalogo: readonly string[],
): string | null {
  const buscada = clave(escrito);
  if (!buscada) return null;
  const exacta = catalogo.find((nombre) => clave(nombre) === buscada);
  if (exacta) return exacta;
  /* Y sin los espacios: «Bella Vista» y «Bellavista» son la misma, y así se
     escriben las dos por el río. */
  const pegada = buscada.replace(/\s/g, "");
  return (
    catalogo.find((nombre) => clave(nombre).replace(/\s/g, "") === pegada) ??
    null
  );
}
