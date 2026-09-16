import sharp from "sharp";
import { createHash } from "node:crypto";
import { ApiError } from "./admin-auth";

/**
 * La fotografía de un avatar, que no es una evidencia.
 *
 * El navegador la deja en 256 píxeles y WebP antes de mandarla, pero eso no se
 * da por bueno: lo que llega es una cadena que envía un cliente, y el cliente
 * puede ser cualquiera. Se comprueba formato, peso y medidas, y se decodifica
 * entera —los metadatos solos no delatan un archivo truncado—.
 *
 * El tope es pequeño a propósito: el avatar viaja dentro del documento de la
 * cuenta, y ese documento tiene un límite que no conviene rozar.
 */
export async function validateAvatarPhoto(value: string) {
  if (value.length > 90000)
    throw new ApiError(413, "La fotografía del avatar es demasiado grande.");
  const match = /^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new ApiError(400, "Formato de avatar no admitido.");
  const bytes = Buffer.from(match[1], "base64");
  if (
    !bytes.length ||
    bytes.length > 65536 ||
    bytes.toString("base64") !== match[1]
  )
    throw new ApiError(400, "El archivo del avatar no es válido.");
  try {
    const image = sharp(bytes, { limitInputPixels: 1000000, failOn: "warning" });
    const metadata = await image.metadata();
    if (
      metadata.format !== "webp" ||
      (metadata.pages ?? 1) > 1 ||
      (metadata.width ?? 0) > 512 ||
      (metadata.height ?? 0) > 512 ||
      !metadata.width ||
      !metadata.height
    )
      throw new Error("format");
    await image.stats();
  } catch {
    throw new ApiError(
      400,
      "La fotografía del avatar está dañada, es animada o mide más de 512 píxeles.",
    );
  }
  return value;
}
export async function validateOriginal(value: unknown) {
  if (typeof value !== "string" || value.length > 13981060)
    throw new ApiError(413, "La fotografía debe pesar como máximo 10 MB.");
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      value,
    );
  if (!match)
    throw new ApiError(400, "Adjunta una fotografía JPG, PNG o WebP válida.");
  const bytes = Buffer.from(match[2], "base64");
  if (
    !bytes.length ||
    bytes.length > 10485760 ||
    bytes.toString("base64") !== match[2]
  )
    throw new ApiError(400, "El archivo Base64 no es válido.");
  try {
    const image = sharp(bytes, {
      limitInputPixels: 24000000,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (`image/${metadata.format}` !== match[1] || (metadata.pages ?? 1) > 1)
      throw new Error("format");
    await image.stats(); // Decode all pixels; metadata alone does not detect truncated files.
  } catch {
    throw new ApiError(
      400,
      "La fotografía está dañada, es animada o supera 24 megapíxeles.",
    );
  }
  return {
    mime_type: match[1],
    byte_size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    content_base64: match[2],
  };
}

/* Tope del respaldo: Firestore admite un mega por documento. Se deja margen
   para el resto de campos y para el 33 % que añade el Base64. */
const BACKUP_BASE64 = 700 * 1024;

/**
 * Copia reducida de una fotografía, para guardarla junto al expediente.
 *
 * El original vive en el archivo de Supabase. Si ese proyecto se pausa —y los
 * gratuitos se pausan solos cuando pasan días sin uso— el expediente se queda
 * sin su prueba justo cuando alguien va a consultarla. Esta copia vive en la
 * misma base que el expediente: mientras se pueda leer el caso, se podrá ver
 * lo que se reportó.
 *
 * No sustituye al original: es una reducción a 1600 píxeles pensada para poder
 * mirar, no para peritar. La distinción se dice en pantalla cuando toca servir
 * esta y no aquella.
 *
 * Se arma aquí, no en el navegador: quien reporta sube una sola vez, que en el
 * río es lo que cuenta.
 */
export async function buildBackup(base64: string) {
  try {
    const bytes = Buffer.from(base64, "base64");
    for (const quality of [78, 62, 48]) {
      const copia = await sharp(bytes, { limitInputPixels: 24000000 })
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
      const texto = copia.toString("base64");
      if (texto.length <= BACKUP_BASE64)
        return { content_base64: texto, mime_type: "image/webp" };
    }
  } catch {
    /* Un respaldo que no se pudo preparar no invalida el envío: el original
       ya está guardado y verificado. */
  }
  return null;
}

/**
 * Acceso al archivo de Supabase desde el servidor. La clave nunca sale de aquí:
 * el navegador pide siempre a través de una ruta de la aplicación, que antes
 * comprueba con Firebase quién es y si le corresponde ver el archivo.
 */
export async function storageRequest(
  table: string,
  query: string,
  init?: RequestInit,
  problem = "No se pudo acceder al archivo. Reintenta en un momento.",
) {
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = process.env.SUPABASE_URL;
  if (!key || !base)
    throw new ApiError(503, "El archivo privado no está configurado.");
  const headers = new Headers(init?.headers);
  headers.set("apikey", key);
  if (!key.startsWith("sb_secret_"))
    headers.set("Authorization", `Bearer ${key}`);
  headers.set("Content-Type", "application/json");
  try {
    const response = await fetch(`${base}/rest/v1/${table}${query}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("storage unavailable");
    return response;
  } catch {
    throw new ApiError(503, problem);
  }
}

export const evidenceRequest = (query: string, init?: RequestInit) =>
  storageRequest(
    "mpd_evidence_originals",
    query,
    init,
    "No se pudo confirmar la fotografía. Conserva el reporte y reintenta.",
  );

/** Imágenes de los comunicados: públicas una vez publicado el boletín. */
export const newsMediaRequest = (query: string, init?: RequestInit) =>
  storageRequest(
    "mpd_news_media",
    query,
    init,
    "No se pudieron consultar las imágenes del comunicado.",
  );

/* Tope de la portada: es la cara del comunicado, no una prueba. Se ve en una
   tarjeta de unos cientos de píxeles, así que pasar de aquí sería cobrarle
   datos a la comunidad por píxeles que nadie llega a mirar. */
const COVER_BASE64 = 420 * 1024;

/**
 * Portada fotográfica de un comunicado.
 *
 * Se guarda **reducida y recodificada**, al revés que la evidencia de un
 * reporte: allí manda el original porque es una prueba; aquí la fotografía es
 * un encabezado, y lo que cuenta es que abra rápido con una barra de señal.
 *
 * No se recorta aquí: la imagen se encaja dentro de 1400 × 800 conservando su
 * proporción y es la hoja de estilos la que decide qué parte se ve. Recortar
 * con un algoritmo es la manera segura de decapitar a alguien en la portada;
 * así el recorte se ve en el editor, antes de publicar, y se puede cambiar la
 * foto si no quedó.
 *
 * Vive en Firestore, junto al comunicado, y no en el archivo externo: si ese
 * proyecto se pausa, las tarjetas de la comunidad se quedarían en blanco.
 */
export async function buildCover(base64: string) {
  const bytes = Buffer.from(base64, "base64");
  for (const quality of [74, 60, 46]) {
    const cover = await sharp(bytes, { limitInputPixels: 24000000 })
      .rotate() // Endereza según el EXIF; si no, media portada sale tumbada.
      .resize({
        width: 1400,
        height: 800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();
    const content = cover.toString("base64");
    if (content.length <= COVER_BASE64)
      return {
        content_base64: content,
        mime_type: "image/webp",
        byte_size: cover.length,
        /* Marca de versión para la dirección pública: al cambiar la portada
           cambia la marca, y el navegador deja de servir la anterior. */
        digest: createHash("sha256").update(cover).digest("hex").slice(0, 12),
      };
  }
  throw new ApiError(
    413,
    "No se pudo ajustar la portada. Prueba con una fotografía más pequeña.",
  );
}
