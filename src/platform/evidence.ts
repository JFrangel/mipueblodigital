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

export async function prepareEvidence(file: File): Promise<PreparedEvidence> {
  if (file.size === 0) throw new Error("El archivo está vacío.");

  /**
   * Se decodifica **antes** de juzgar el tipo.
   *
   * Antes se hacía al revés: se miraba `file.type` y, si no era uno de los
   * tres, se rechazaba. En un ordenador eso no falla nunca; en un teléfono
   * falla todo el tiempo, y ese es el aparato con el que se reporta. Quien
   * fotografiaba el muelle roto desde el móvil recibía «Usa una imagen JPG,
   * PNG o WebP» teniendo delante exactamente eso.
   *
   * Si el navegador la decodifica, es una imagen. Esa es la prueba de verdad.
   */
  const bitmap = await decode(file);
  try {
    const { width: ancho, height: alto } = medidas(bitmap);
    const pixels = ancho * alto;
    /* Cabe entera **y** el servidor sabe verificar su formato: el original
       gana siempre. */
    if (
      ACEPTADOS.includes(file.type) &&
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
    throw new Error(
      "No se pudo leer esa fotografía. Puede estar dañada, o ser un formato que este teléfono no abre: prueba con otra.",
    );
  }
}

function round(pixels: number) {
  return Math.round((pixels / 1_000_000) * 10) / 10;
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error("No se pudo leer el archivo. Vuelve a adjuntarlo."));
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
