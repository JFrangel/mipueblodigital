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
export async function prepareEvidence(file: File): Promise<PreparedEvidence> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Usa una imagen JPG, PNG o WebP.");
  if (file.size === 0) throw new Error("El archivo está vacío.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "La imagen está dañada o no se puede leer. Selecciona otra fotografía.",
    );
  }
  try {
    const pixels = bitmap.width * bitmap.height;
    /* Cabe entera: el original gana siempre. */
    if (pixels <= MAX_PIXELS && file.size <= MAX_BYTES)
      return {
        dataUrl: await readAsDataUrl(file),
        reduced: false,
        megapixels: round(pixels),
      };
    const reducida = await shrink(bitmap, pixels);
    return { ...reducida, reduced: true };
  } finally {
    bitmap.close();
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
  bitmap: ImageBitmap,
  pixels: number,
): Promise<{ dataUrl: string; megapixels: number }> {
  const factor = pixels > MAX_PIXELS ? Math.sqrt(MAX_PIXELS / pixels) : 1;
  const width = Math.max(1, Math.floor(bitmap.width * factor));
  const height = Math.max(1, Math.floor(bitmap.height * factor));

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
