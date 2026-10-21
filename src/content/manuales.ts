/**
 * Los manuales de uso, como datos.
 *
 * **Una sola fuente.** El mismo contenido se dibuja en pantalla (`/manuales/`),
 * se imprime a PDF (`scripts/generar-manuales-pdf.mjs`) y se vuelca a Markdown
 * para quien lo lea en el repositorio (`docs/manual-*.md`). Si el texto viviera
 * en tres sitios, sería distinto en los tres el día que alguien corrigiera uno.
 *
 * **Son datos, no JSX, a propósito.** Un manual cambia cuando cambia la
 * aplicación, y quien lo corrige debería poder hacerlo sin tocar maquetación.
 * La maquetación —tarjetas, hojas, el palafito, los avisos— la pone
 * `src/features/manuales.tsx`; aquí solo se dice **qué** hay que contar.
 *
 * Dos marcas dentro de cualquier texto:
 *
 * - `**así**` es negrita.
 * - `«Así»` es una **etiqueta de la interfaz**: el rótulo exacto de un botón,
 *   una pestaña o un menú, tal como aparece en la aplicación. Se dibuja como
 *   una pastilla y `tests/unit/manuales.test.ts` comprueba que cada una exista
 *   de verdad en `src/`: si alguien renombra un botón y no el manual, la
 *   prueba falla en lugar de que el manual mande a buscar algo que ya no está.
 */

/** El tamaño de hoja con el que se imprime el PDF. */
export type FormatoHoja = "A4" | "A5";

/**
 * Los iconos que puede nombrar el contenido. La vista los traduce a
 * `lucide-react`, que ya es el juego de iconos de toda la aplicación.
 */
export type IconoManual =
  | "ajustes"
  | "alerta"
  | "bandeja"
  | "buscar"
  | "calendario"
  | "camara"
  | "campana"
  | "candado"
  | "casa"
  | "check"
  | "correo"
  | "descarga"
  | "documento"
  | "enviar"
  | "escribir"
  | "escudo"
  | "grafico"
  | "historia"
  | "hoja"
  | "libro"
  | "llave"
  | "mapa"
  | "megafono"
  | "microfono"
  | "ojo"
  | "ojo-cerrado"
  | "papelera"
  | "pin"
  | "pregunta"
  | "reloj"
  | "senal"
  | "sin-senal"
  | "telefono"
  | "usuario"
  | "usuarios";

/**
 * Los dibujos del territorio que la aplicación ya usa como filigrana en sus
 * tarjetas (`--hoja`, `--ola`, `--monte`… en `globals.css`). Cada capítulo
 * puede llevar uno en la esquina, para que dos páginas seguidas no se vean
 * repetidas.
 */
export type Motivo =
  | "hoja"
  | "ola"
  | "monte"
  | "canoa"
  | "palma"
  | "palafito"
  | "manglar"
  | "canalete"
  | "brujula"
  | "atarraya"
  | "platano"
  | "brote";

/**
 * Los avisos que interrumpen el texto, cada uno con su color y su icono:
 *
 * - `consejo`: algo que facilita la tarea. Verde.
 * - `ojo`: algo que sale mal si se pasa por alto. Ámbar.
 * - `privacidad`: lo que ve o no ve otra persona. Azul.
 * - `limite`: lo que la aplicación **no** hace. Gris.
 */
export type NivelAviso = "consejo" | "ojo" | "privacidad" | "limite";

/** Una tarjeta con icono: una idea corta, con su título. */
export type Tarjeta = { icono: IconoManual; titulo: string; texto: string };

/**
 * Las pantallas dibujadas que puede pedir un bloque `pantalla`. Cada una es
 * una pieza de `src/features/manuales-escenas.tsx` armada con las mismas
 * clases que la aplicación real, para que no envejezca como una captura.
 */
export type EscenaId = "estados" | "nuevo-reporte" | "sin-senal";

export type Bloque =
  /** Un párrafo. */
  | { tipo: "texto"; texto: string }
  /** Pasos numerados. `detalle` es la aclaración, en letra menor. */
  | {
      tipo: "pasos";
      titulo?: string;
      pasos: { texto: string; detalle?: string }[];
    }
  /** Un aviso a página completa. */
  | { tipo: "aviso"; nivel: NivelAviso; titulo?: string; texto: string }
  /** De dos a cuatro tarjetas en cuadrícula. */
  | { tipo: "tarjetas"; tarjetas: Tarjeta[] }
  /** De dos a cuatro etapas unidas por flechas: un camino, no un listado. */
  | { tipo: "flujo"; etapas: Tarjeta[] }
  /** Una tabla. Cada fila tiene tantas celdas como columnas. */
  | { tipo: "tabla"; columnas: string[]; filas: string[][]; nota?: string }
  /** Una lista de puntos o de casillas por marcar. */
  | { tipo: "lista"; estilo?: "puntos" | "casillas"; items: string[] }
  /** Preguntas frecuentes, o «si pasa esto, haz aquello». */
  | { tipo: "preguntas"; items: { pregunta: string; respuesta: string }[] }
  /** Palabras que quien lee puede no conocer. */
  | {
      tipo: "glosario";
      terminos: { termino: string; significado: string }[];
    }
  /** Una pantalla dibujada, con su pie. */
  | { tipo: "pantalla"; escena: EscenaId; pie?: string };

export type Capitulo = {
  /** Sin espacios ni tildes: es el ancla del índice. */
  id: string;
  titulo: string;
  /** Una frase que dice para qué sirve el capítulo. */
  resumen: string;
  icono: IconoManual;
  /** Dibujo de esquina. Si falta, la vista elige uno. */
  motivo?: Motivo;
  bloques: Bloque[];
};

export type Manual = {
  id: "ciudadano" | "consejo";
  titulo: string;
  subtitulo: string;
  /** «Para quien reporta», «Para quien gestiona». */
  publico: string;
  /** Hasta cuándo es cierto: la fecha en que se contrastó con la aplicación. */
  fecha: string;
  formato: FormatoHoja;
  capitulos: Capitulo[];
  /** La página de despedida. */
  cierre: { titulo: string; texto: string };
};

/**
 * Cada texto suelto de un manual, en orden de lectura.
 *
 * Sirve a quien necesita mirar *todo* lo escrito sin conocer la forma de cada
 * bloque: contar palabras, buscar las etiquetas de la interfaz, volcar a
 * Markdown. Recorre el objeto entero en lugar de listar los bloques uno por
 * uno, de modo que un bloque nuevo no queda fuera sin que nadie lo note.
 */
export function textosDe(valor: unknown): string[] {
  if (typeof valor === "string") return [valor];
  if (Array.isArray(valor)) return valor.flatMap(textosDe);
  if (valor && typeof valor === "object")
    return Object.entries(valor as Record<string, unknown>)
      .filter(
        ([clave]) =>
          ![
            "id",
            "icono",
            "motivo",
            "tipo",
            "nivel",
            "estilo",
            "escena",
            "formato",
            "fecha",
          ].includes(clave),
      )
      .flatMap(([, v]) => textosDe(v));
  return [];
}

/** Los rótulos de la interfaz que cita un manual, sin repetir, tal como los
 *  escribe: lo que hay entre «guillemets». */
export function etiquetasDeInterfaz(manual: Manual): string[] {
  const etiquetas = new Set<string>();
  for (const texto of textosDe(manual))
    for (const m of texto.matchAll(/«([^»]+)»/g)) etiquetas.add(m[1]);
  return [...etiquetas];
}

/** Palabras de un manual: lo que lleva escrito, sin contar las marcas. */
export function palabrasDe(manual: Manual): number {
  return textosDe(manual)
    .join(" ")
    .replaceAll(/\*\*|«|»/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
}

/** «20 de octubre de 2026», sin que el huso horario la corra un día. */
export function fechaLarga(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}
