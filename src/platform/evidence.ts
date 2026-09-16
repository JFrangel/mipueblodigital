/** Tope del servidor: 24 megapíxeles y 10 MB por archivo. */
const MAX_PIXELS = 24_000_000;
const MAX_BYTES = 10 * 1024 * 1024;

export type PreparedEvidence = {
  /** La imagen en Base64, lista para viajar. */
  dataUrl: string;
  /** Verdadero si hubo que reducirla para que el servidor la aceptara. */
  reduced: boolean;
  /** Megapíxeles finales, para poder decírselo a quien reporta. */
  megapixels: number;
};

/**
 * Prepara la fotografía de un reporte.
 *
 * Regla primera: **si el archivo cabe, no se toca**. Los bytes originales
 * viajan tal cual, sin recomprimir, porque una foto que ya pasó por el sensor y
 * por el compresor del teléfono no gana nada al pasar por un tercero.
 *
 * Solo cuando no cabe —un teléfono de 48 megapíxeles, un PNG enorme— se reduce.
 * Antes se rechazaba, y rechazar significa que el reporte no existe: alguien
 * que fue hasta el sitio, tomó la foto y escribió el relato se quedaba sin
 * poder enviarlo. Una fotografía reducida con cuidado es infinitamente mejor
 * que ninguna.
 *
 * La reducción baja la resolución justo hasta el tope y recodifica en WebP con
 * calidad alta. **No se amplía nunca**: agrandar una imagen no añade detalle,
 * solo inventa píxeles y engorda el archivo.
 */
/**
 * Los tres formatos que el servidor sabe verificar.
 *
 * No son los tres que un teléfono produce. Un iPhone fotografía en HEIC, y
 * muchas galerías de Android —Google Fotos, Drive, «Recientes»— entregan el
 * archivo con el tipo **vacío** aunque sea un JPEG perfecto.
 */
const ACEPTADOS = ["image/jpeg", "image/png", "image/webp"];

/**
 * Qué es el archivo de verdad, mirando sus primeros bytes.
 *
 * No se le pregunta al archivo qué dice ser: en un teléfono miente o calla. Se
 * mira su firma, que es lo que mira también el servidor.
 */
/**
 * El archivo que el teléfono entrega y luego no deja leer.
 *
 * `NotReadableError` — «The requested file could not be read, typically due to
 * permission problems…». No es un formato raro ni un archivo corrupto: es que
 * los **bytes no están**. Android entrega una referencia a la fotografía y
 * cuando se va a leer ya no sirve. Pasa sobre todo con fotos que viven en la
 * nube y no en el aparato, y con las que se eligen desde «Recientes» o desde
 * otra aplicación que retira el permiso al salir.
 *
 * No hay nada que la aplicación pueda arreglar por su cuenta, así que lo único
 * útil es decir qué hacer. Y hay dos cosas que hacer, las dos sencillas.
 */
const NO_SE_PUDO_LEER =
  "Tu teléfono no dejó leer esa fotografía. Pasa con algunas galerías, y con fotos que están guardadas en la nube. " +
  "Prueba a tomarla con la cámara desde aquí, que es lo que nunca falla; o ábrela primero en la galería y vuelve a elegirla.";

async function formatoReal(file: File): Promise<string> {
  /* Devuelve el tipo si lo reconoce, y "" si leyó la cabecera y no es una
     imagen. Que no se pueda leer es otra cosa y la dice lanzando. */
  const cabeza = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const empieza = (...bytes: number[]) =>
    bytes.every((b, i) => cabeza[i] === b);
  const texto = (desde: number, largo: number) =>
    String.fromCharCode(...cabeza.slice(desde, desde + largo));
  if (empieza(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (empieza(0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (texto(0, 4) === "RIFF" && texto(8, 4) === "WEBP") return "image/webp";
  /* Lo que fotografía un iPhone por defecto. Ningún navegador de Android lo
     abre, y decirlo por su nombre permite explicar qué hacer. */
  if (texto(4, 4) === "ftyp" && /hei|mif1|msf1|avif/.test(texto(8, 4)))
    return texto(8, 4).startsWith("avi") ? "image/avif" : "image/heic";
  return "";
}

export async function prepareEvidence(file: File): Promise<PreparedEvidence> {
  if (file.size === 0)
    throw new Error(
      "Ese archivo llegó vacío. Suele pasar con fotos que están solo en la nube: ábrela primero en la galería para que se descargue, y vuelve a intentarlo.",
    );

  /**
   * Ningún paso previo puede impedir que la fotografía se envíe.
   *
   * Es la lección de tres intentos. Cada comprobación que se puso por delante
   * —el tipo que declara el archivo, la firma de sus primeros bytes, que el
   * navegador consiga decodificarla— falla en algún teléfono, y al fallar
   * rechazaba fotografías perfectas. Ese rechazo significa que el reporte no
   * existe: alguien fue hasta el sitio, tomó la foto, escribió el relato, y se
   * quedó sin poder mandarlo.
   *
   * Así que todo lo de aquí es **información, no permiso**. Lo único que de
   * verdad hace falta es leer los bytes, y de validarlos se encarga el
   * servidor, que abre la imagen entera con una biblioteca de verdad.
   *
   * `formatoReal` mira la firma con `slice().arrayBuffer()`, que en algunos
   * Android falla justo donde `FileReader` funciona: si no se consigue, se
   * sigue sin ella.
   */
  /* `null` es «no se pudo mirar», que no es lo mismo que «se miró y no es una
     imagen». Con lo primero se sigue adelante; con lo segundo, no. */
  const formato = await formatoReal(file).catch(() => null);
  const bitmap = await decode(file).catch(async (error) => {
    /* Lo único que no tiene remedio desde aquí: un formato que este navegador
       no sabe abrir y que el servidor tampoco aceptaría. Se dice qué tocar. */
    if (formato === "image/heic" || formato === "image/avif")
      throw new Error(
        "Tu teléfono guarda las fotos en un formato que este navegador no abre (HEIC). En Ajustes → Cámara → Formatos, elige «Más compatible», o toma la foto con la cámara desde aquí.",
      );
    /**
     * No se pudo abrir. ¿Se manda igual?
     *
     * Sí, en dos casos: cuando la firma dice que es una imagen de las que el
     * servidor sabe verificar —entonces el navegador es el que no puede, no el
     * archivo— y cuando **no se pudo mirar la firma**, porque entonces no hay
     * base para rechazarla y equivocarse ahí cuesta un reporte entero.
     *
     * No, cuando la firma se leyó y dice que eso no es una imagen. Ahí sí se
     * sabe, y mandarlo sería hacerle esperar a alguien por un rechazo seguro.
     */
    const esImagen = formato === null || ACEPTADOS.includes(formato);
    if (esImagen && file.size <= MAX_BYTES) return null;
    if (formato === "")
      throw new Error(
        "Ese archivo no es una fotografía. Elige una imagen, o tómala con la cámara desde aquí.",
      );
    throw error;
  });

  /* Sin abrir. El servidor comprobará que es lo que dice ser. */
  if (!bitmap)
    return {
      dataUrl: await readAsDataUrl(file),
      reduced: false,
      megapixels: 0,
    };

  try {
    const { width: ancho, height: alto } = medidas(bitmap);
    const pixels = ancho * alto;
    /* Cabe entera **y** el servidor sabe verificar su formato: el original
       gana siempre. */
    if (
      ACEPTADOS.includes(formato ?? file.type) &&
      pixels <= MAX_PIXELS &&
      file.size <= MAX_BYTES
    )
      return {
        dataUrl: await readAsDataUrl(file),
        reduced: false,
        megapixels: round(pixels),
      };
    /* Lo demás se recodifica a WebP. Si el tipo no era de los tres —un HEIC
       del iPhone, o el vacío que entregan algunas galerías— la conversión no
       es un apaño: es lo que hace que el servidor pueda comprobar que lo que
       recibe es de verdad la imagen que dice ser. */
    const reducida = await shrink(bitmap, pixels);
    return { ...reducida, reduced: true };
  } finally {
    if ("close" in bitmap) bitmap.close();
    else URL.revokeObjectURL(bitmap.src);
  }
}

/** Lo que se puede dibujar en un lienzo: da igual por qué camino se abrió. */
export type Decodificada = ImageBitmap | HTMLImageElement;

/**
 * Las medidas reales de la imagen.
 *
 * Una `ImageBitmap` las lleva en `width`; una etiqueta de imagen las lleva en
 * `naturalWidth`, porque su `width` es la de dibujado y una etiqueta suelta,
 * sin estilos, puede darla en cero. Confundirlas aquí sale como una fotografía
 * de un píxel.
 */
export const medidas = (imagen: Decodificada) =>
  "naturalWidth" in imagen
    ? { width: imagen.naturalWidth, height: imagen.naturalHeight }
    : { width: imagen.width, height: imagen.height };

/**
 * Abrir la fotografía, por el camino que funcione.
 *
 * `createImageBitmap` es el camino bueno y el que falla. Reserva la imagen
 * entera en memoria descomprimida —ancho × alto × 4 bytes— y las cámaras de
 * hoy hacen fotos de cincuenta o cien megapíxeles: una de 108 son **432 MB**
 * que un teléfono no va a dar. El navegador contesta con un error sin motivo,
 * y quien reporta lee «la imagen está dañada» de una fotografía que está
 * perfectamente bien y que puede ver en su galería.
 *
 * El respaldo es una etiqueta de imagen de toda la vida. El navegador la
 * decodifica a su ritmo y puede submuestrearla mientras lo hace, así que
 * aguanta lo que la otra no. Se intenta primero la rápida, porque para una
 * fotografía normal es mejor, y solo se cae a esta cuando hace falta.
 */
export async function decode(file: File): Promise<Decodificada> {
  try {
    return await createImageBitmap(file);
  } catch {
    /* Sigue abajo: puede ser memoria, o un formato que esta vía no abre. */
  }
  const url = URL.createObjectURL(file);
  try {
    const imagen = new Image();
    imagen.src = url;
    await imagen.decode();
    if (!imagen.naturalWidth) throw new Error("sin dimensiones");
    return imagen;
  } catch {
    URL.revokeObjectURL(url);
    /* Que no se pueda abrir aquí no significa que no se pueda mandar: quien
       llama decide. El mensaje lleva el tipo y el tamaño por si llega a verse,
       para no tener que adivinar qué archivo era. */
    throw new Error(
      `Este teléfono no pudo abrir esa imagen (${file.type || "sin tipo"}, ${Math.round(file.size / 1024)} kB).`,
    );
  }
}

function round(pixels: number) {
  return Math.round((pixels / 1_000_000) * 10) / 10;
}

/**
 * Leer el archivo entero, que es el único paso sin alternativa.
 *
 * Todo lo demás —mirar la firma, decodificar para medir— se puede saltar. Esto
 * no: sin los bytes no hay reporte. Así que aquí, y solo aquí, es donde el
 * fallo es terminal y donde tiene sentido explicar qué hacer.
 *
 * `FileReader` es además la vía más compatible que hay en Android; los métodos
 * modernos del `Blob` fallan en teléfonos donde este funciona.
 */
function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(NO_SE_PUDO_LEER));
    reader.onabort = () =>
      reject(new Error("La lectura de la imagen fue cancelada."));
    reader.readAsDataURL(file);
  });
}

/**
 * Reduce la imagen hasta que quepa, conservando la proporción.
 *
 * Se intenta primero con la mayor calidad razonable; si el resultado sigue
 * pasándose de peso, se baja la calidad por pasos en lugar de recortar más
 * resolución. Perder nitidez de compresión estropea menos una fotografía de
 * un muelle roto que perder píxeles.
 */
async function shrink(
  bitmap: Decodificada,
  pixels: number,
): Promise<{ dataUrl: string; megapixels: number }> {
  const factor = pixels > MAX_PIXELS ? Math.sqrt(MAX_PIXELS / pixels) : 1;
  const real = medidas(bitmap);
  const width = Math.max(1, Math.floor(real.width * factor));
  const height = Math.max(1, Math.floor(real.height * factor));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error(
      "Este navegador no pudo ajustar la fotografía. Usa una de menor tamaño.",
    );
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);

  for (const quality of [0.92, 0.85, 0.78, 0.7]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob) break;
    if (blob.size <= MAX_BYTES)
      return {
        dataUrl: await readAsDataUrl(blob),
        megapixels: round(width * height),
      };
  }
  throw new Error(
    "No se pudo ajustar la fotografía a 10 MB. Usa una de menor tamaño.",
  );
}
