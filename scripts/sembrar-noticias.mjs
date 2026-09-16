/**
 * Siembra en Firestore los comunicados que antes vivían incrustados como
 * ejemplos en la interfaz. A partir de aquí la comunidad lee noticias reales:
 * el Consejo las edita, ancla o archiva desde su panel como cualquier otra.
 *
 * Uso:
 *   node scripts/sembrar-noticias.mjs            # crea los que falten
 *   node scripts/sembrar-noticias.mjs --rehacer  # además reescribe los existentes
 *
 * Necesita las credenciales de servidor descritas en .env.example
 * (GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_KEY) y
 * NEXT_PUBLIC_FIREBASE_PROJECT_ID. No inventa autoría: los comunicados quedan
 * a nombre del Consejo Comunitario y con la fecha indicada abajo.
 */
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/** Lee el .env sin añadir dependencias al proyecto. */
function loadEnv() {
  try {
    // Se admiten finales de línea de Windows: el retorno rompía la expresión.
    for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (match && !process.env[match[1]])
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* Sin .env se usan las variables ya presentes en el entorno. */
  }
}

const COMUNICADOS = [
  {
    id: "transparencia-y-resguardo",
    title: "Transparencia y resguardo: así funciona el seguimiento comunitario",
    body: "Si un reporte no se marca como contenido sensible por la persona que lo registra, el Consejo puede publicar un resumen tras 24 horas. Si se marca como sensible, requiere revisión explícita. Los datos personales y las fotografías originales permanecen siempre privados: nadie fuera del Consejo los ve.",
    kind: "Boletín",
    art: "transparencia",
    publishedAt: "2026-09-13T14:00:00.000Z",
    pinned: true,
  },
  {
    id: "jornada-de-limpieza-del-rio",
    title:
      "Jornada de limpieza del río Satinga: lo que se hizo, lo que falta y cómo participar",
    body: `Durante tres jornadas consecutivas, comuneros de siete veredas recorrieron el tramo entre Bocas de Satinga y Barro Caliente retirando residuos de las orillas y de los esteros. Este comunicado deja constancia de lo que se hizo, de lo que quedó pendiente y de cómo puede sumarse quien no pudo asistir.

## Qué se hizo

Se recogieron residuos en **catorce puntos del margen izquierdo y nueve del derecho**. La mayor parte fue plástico de un solo uso arrastrado por la corriente durante las lluvias, junto con restos de redes y envases de agroquímicos. Estos últimos se separaron y se entregaron al punto de acopio, porque no pueden mezclarse con el resto ni quemarse.

Participaron **cincuenta y tres personas**, entre ellas dieciocho menores acompañados por sus familias. Se dispuso de cuatro canoas para el traslado de bolsas y de un punto de hidratación en cada jornada.

## Lo que encontramos y no esperábamos

En dos esteros cercanos a Bellavista se hallaron vertimientos que no corresponden a residuos domésticos. El Consejo levantó el registro y lo remitió a la autoridad ambiental. No publicamos aquí ubicaciones exactas ni nombres: el caso está en trámite y adelantarlo podría entorpecerlo.

Si alguien observa algo similar, el camino es reportarlo desde la aplicación con una fotografía y la vereda. El expediente queda con fecha, y eso es lo que sostiene un reclamo.

## Lo que falta

Quedan dos compromisos abiertos de esta jornada:

- El tramo entre Víbora Paraíso y Boca de Víbora, que no se recorrió por las condiciones del agua. Se retomará cuando baje el caudal.
- La señalización de los tres puntos de acopio acordados en asamblea.

## Cómo participar

La próxima jornada se anunciará por este mismo canal con una semana de anticipación. Quien quiera aportar canoa, combustible o herramienta puede acercarse a la casa del Consejo. Quien no pueda asistir también ayuda: separando sus residuos, no quemando plástico y reportando lo que vea.

## Una constancia

Este comunicado se publica para que quede registro de lo acordado y de lo cumplido. Si algo de lo que aquí se dice no coincide con lo que usted vio en el territorio, dígalo.

> La memoria de la comunidad se corrige entre todos, no desde un escritorio.`,
    kind: "Boletín",
    art: "rio",
    publishedAt: "2026-09-14T13:00:00.000Z",
    pinned: false,
  },
  {
    id: "el-territorio-que-queremos",
    title: "El territorio que queremos lo construimos juntos",
    body: "Un espacio para escuchar las necesidades de la comunidad y conversar sobre el seguimiento de los reportes. Llevamos el consolidado de casos por vereda y las respuestas que ya tienen fecha y responsable.",
    kind: "Encuentro",
    art: "encuentro",
    publishedAt: "2026-09-06T14:00:00.000Z",
    pinned: false,
  },
  {
    id: "una-nueva-forma-de-cuidar",
    title: "Una nueva forma de cuidar nuestro territorio",
    body: "Ya puedes registrar situaciones, consultar avances y conocer la gestión comunitaria desde el teléfono. Los reportes se pueden preparar sin señal y se envían solos cuando vuelve la conexión.",
    kind: "Boletín",
    art: "territorio",
    publishedAt: "2026-09-05T14:00:00.000Z",
    pinned: false,
  },
  {
    id: "como-preparar-un-reporte",
    title: "Cómo preparar un reporte claro y útil",
    body: "Selecciona la categoría y la vereda, explica qué observaste, cuándo ocurrió y a quién afecta, y adjunta una fotografía que ayude a entenderlo. Evita incluir datos personales de otras personas: el Consejo no necesita nombres para atender el caso.",
    kind: "Alerta",
    art: "voz",
    publishedAt: "2026-09-04T14:00:00.000Z",
    pinned: false,
  },
];

/** Imágenes de ejemplo para los comunicados que las llevan. */
const IMAGENES = {
  "jornada-de-limpieza-del-rio": [
    {
      file: "public/brand/territorio.webp",
      caption: "Recorrido por el margen izquierdo, entre Bocas de Satinga y Barro Caliente.",
    },
    {
      file: "public/brand/river-welcome.webp",
      caption: "Punto de acopio temporal instalado durante la segunda jornada.",
    },
  ],
};

const TIPOS = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

/**
 * Sube las imágenes de un comunicado al archivo de Supabase. Se hace aparte del
 * documento de Firestore porque un comunicado con fotos superaría su límite de
 * tamaño; aquí solo viaja la referencia.
 */
async function sembrarImagenes(id, imagenes) {
  const base = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) {
    console.log(`  (${id}: sin credenciales de Supabase, imágenes omitidas)`);
    return 0;
  }
  const cabeceras = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_secret_")) cabeceras.Authorization = `Bearer ${key}`;

  // Se reemplazan las anteriores para que repetir la siembra no acumule copias.
  await fetch(
    `${base}/rest/v1/mpd_news_media?news_id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE", headers: { ...cabeceras, Prefer: "return=minimal" } },
  );

  let puestas = 0;
  for (const [indice, imagen] of imagenes.entries()) {
    const bytes = readFileSync(imagen.file);
    const extension = imagen.file.split(".").pop().toLowerCase();
    const cuerpo = {
      id: randomUUID(),
      news_id: id,
      position: indice,
      caption: imagen.caption,
      mime_type: TIPOS[extension],
      byte_size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      content_base64: bytes.toString("base64"),
    };
    const respuesta = await fetch(`${base}/rest/v1/mpd_news_media`, {
      method: "POST",
      headers: { ...cabeceras, Prefer: "return=minimal" },
      body: JSON.stringify(cuerpo),
    });
    if (!respuesta.ok) {
      console.error(`  imagen ${indice + 1} rechazada:`, await respuesta.text());
      continue;
    }
    puestas++;
  }
  return puestas;
}

function credential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return undefined;
  const json = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return cert(JSON.parse(json));
}

async function main() {
  loadEnv();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error(
      "Falta NEXT_PUBLIC_FIREBASE_PROJECT_ID. Revisa .env antes de sembrar.",
    );
    process.exitCode = 1;
    return;
  }
  const rehacer = process.argv.includes("--rehacer");
  // Sin clave explícita se delega en GOOGLE_APPLICATION_CREDENTIALS; pasar
  // `credential: undefined` haría fallar la inicialización.
  const key = credential();
  const app = initializeApp(key ? { projectId, credential: key } : { projectId });
  const db = getFirestore(app);
  const at = new Date().toISOString();
  let creados = 0,
    actualizados = 0,
    intactos = 0;

  for (const item of COMUNICADOS) {
    const ref = db.doc(`news/${item.id}`);
    const previo = await ref.get();
    if (previo.exists && !rehacer) {
      intactos++;
      continue;
    }
    const version = previo.exists ? (previo.data().version ?? 0) + 1 : 1;
    const registro = {
      title: item.title,
      body: item.body,
      kind: item.kind,
      art: item.art,
      pinned: item.pinned,
      status: "published",
      version,
      publishedAt: item.publishedAt,
      updatedAt: at,
    };
    await ref.set(registro);
    // El aviso comunitario es lo que hace sonar la campana de las novedades.
    await db.doc(`communityAnnouncements/${item.id}`).set({
      title:
        item.kind === "Alerta"
          ? "Alerta del Consejo"
          : "Nuevo comunicado del Consejo",
      note: item.title,
      type: "announcement",
      at: item.publishedAt,
      newsId: item.id,
    });
    await ref
      .collection("history")
      .doc()
      .set({ ...registro, actorUid: "semilla:consejo" });
    if (previo.exists) actualizados++;
    else creados++;
  }

  for (const [id, imagenes] of Object.entries(IMAGENES)) {
    const puestas = await sembrarImagenes(id, imagenes);
    if (puestas) console.log(`Imágenes de ${id}: ${puestas}`);
  }

  console.log(
    `Comunicados creados: ${creados} · actualizados: ${actualizados} · sin cambios: ${intactos}`,
  );
  if (intactos && !rehacer)
    console.log("Usa --rehacer para reescribir los que ya existen.");
}

main().catch((error) => {
  console.error("No se pudo sembrar:", error?.message ?? error);
  process.exitCode = 1;
});
