/** Lado del cuadro y peso máximo del avatar ya preparado. */
const SIDE = 256;
const MAX_BYTES = 48 * 1024;

/**
 * Prepara una fotografía para usarla como avatar.
 *
 * Nada que ver con la evidencia de un reporte, donde el original manda y se
 * conserva byte a byte: un avatar se ve a treinta y seis píxeles en una barra
 * lateral. Se recorta al cuadrado por el centro, se reduce a 256 y se codifica
 * en WebP, que es lo que permite guardarlo junto al resto del perfil en lugar
 * de montar almacenamiento aparte para una miniatura.
 *
 * Se baja la calidad por pasos hasta que entra en el tope. Si ni así cabe, se
 * dice: es mejor pedir otra fotografía que guardar uno ilegible.
 */
export async function prepareAvatar(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Usa una imagen JPG, PNG o WebP.");
  if (file.size === 0) throw new Error("El archivo está vacío.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("La imagen está dañada o no se puede leer.");
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = SIDE;
    canvas.height = SIDE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("sin lienzo");
    /* Recorte cuadrado por el centro: es donde está la cara en casi todas las
       fotografías, y deformar la imagen para que quepa se ve peor que recortar. */
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      SIDE,
      SIDE,
    );
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (blob && blob.size <= MAX_BYTES) return await asDataUrl(blob);
    }
    throw new Error("pesada");
  } catch (error) {
    throw error instanceof Error && error.message === "pesada"
      ? new Error("No se pudo reducir la fotografía. Prueba con otra.")
      : new Error("No se pudo preparar la fotografía.");
  } finally {
    bitmap.close();
  }
}

function asDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la fotografía."));
    reader.readAsDataURL(blob);
  });
}
