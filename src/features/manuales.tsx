import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Camera,
  CalendarDays,
  ChartColumn,
  CircleCheck,
  CircleHelp,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  History,
  House,
  Inbox,
  Info,
  KeyRound,
  Leaf,
  Lightbulb,
  Lock,
  Mail,
  Map,
  MapPin,
  Megaphone,
  Mic,
  PenLine,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Trash2,
  TriangleAlert,
  UserRound,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Filigrana, MOTIVOS } from "@/components/filigranas";
import { Palafito } from "@/components/palafito";
import { Logo } from "@/components/ui";
import { fechaLarga } from "@/content/manuales";
import type {
  Bloque,
  Capitulo,
  IconoManual,
  Manual,
  Motivo,
  NivelAviso,
} from "@/content/manuales";
import { HojaPlatano } from "./leaf-fall";
import { Escena } from "./manuales-escenas";
import styles from "./manuales.module.css";

/**
 * Un manual, dibujado.
 *
 * Sirve a tres sitios sin cambiar una línea: la página de lectura
 * (`/manuales/…`), la ruta que usa el generador de PDF
 * (`scripts/generar-manuales-pdf.mjs`) y el diálogo de imprimir del navegador.
 * No lleva estado ni efectos a propósito —es solo contenido—, de modo que se
 * renderiza igual en el servidor que en el teléfono, y el PDF sale idéntico a lo
 * que se ve.
 *
 * El texto no vive aquí: viene de `src/content/manuales.ts`, y esta pieza solo
 * decide cómo se ve cada bloque.
 */

/** Los iconos que nombra el contenido, traducidos a los de la aplicación. */
const ICONOS: Record<IconoManual, typeof Leaf> = {
  ajustes: Settings,
  alerta: TriangleAlert,
  bandeja: Inbox,
  buscar: Search,
  calendario: CalendarDays,
  camara: Camera,
  campana: Bell,
  candado: Lock,
  casa: House,
  check: CircleCheck,
  correo: Mail,
  descarga: Download,
  documento: FileText,
  enviar: Send,
  escribir: PenLine,
  escudo: ShieldCheck,
  grafico: ChartColumn,
  historia: History,
  hoja: Leaf,
  libro: BookOpen,
  llave: KeyRound,
  mapa: Map,
  megafono: Megaphone,
  microfono: Mic,
  ojo: Eye,
  "ojo-cerrado": EyeOff,
  papelera: Trash2,
  pin: MapPin,
  pregunta: CircleHelp,
  reloj: Clock,
  senal: Wifi,
  "sin-senal": WifiOff,
  telefono: Smartphone,
  usuario: UserRound,
  usuarios: Users,
};

/** El color de lo que representa cada dibujo: la hoja verde, el agua azul, el
 *  monte terroso. Los mismos que usan las tarjetas de la aplicación. */
const TINTES: Record<Motivo, string> = {
  hoja: "#3f9a61",
  brote: "#56a86a",
  palma: "#3f9a61",
  platano: "#3f9a61",
  manglar: "#3f9a61",
  ola: "#4a86b8",
  canoa: "#4a86b8",
  palafito: "#4a86b8",
  monte: "#8a7a4e",
  atarraya: "#8a7a4e",
  canalete: "#8a7a4e",
  brujula: "#8a7a4e",
};

/** Los cuatro dibujos que se turnan en las tarjetas, como en las cifras de la
 *  aplicación: ninguna tarjeta repite el de su vecina. */
const TURNO_TARJETAS: Motivo[] = ["hoja", "ola", "monte", "brote"];

const AVISOS: Record<NivelAviso, { rotulo: string; Icono: typeof Leaf }> = {
  consejo: { rotulo: "Consejo", Icono: Lightbulb },
  ojo: { rotulo: "Ojo con esto", Icono: TriangleAlert },
  privacidad: { rotulo: "Privacidad", Icono: ShieldCheck },
  limite: { rotulo: "Lo que no hace", Icono: Info },
};

/** Las dos marcas de texto del contenido: `**negrita**` y «Etiqueta». */
function Texto({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*|«[^»]+»)/g).filter(Boolean);
  return (
    <>
      {partes.map((parte, i) =>
        parte.startsWith("**") ? (
          <strong key={i}>{parte.slice(2, -2)}</strong>
        ) : parte.startsWith("«") ? (
          <span key={i} className={styles.etiqueta}>
            {parte.slice(1, -1)}
          </span>
        ) : (
          parte
        ),
      )}
    </>
  );
}

function DibujoDeEsquina({ motivo, clase }: { motivo: Motivo; clase: string }) {
  return (
    <span
      className={clase}
      style={{ "--tinte": TINTES[motivo] } as CSSProperties}
      aria-hidden="true"
    >
      <Filigrana motivo={motivo} />
    </span>
  );
}

function Tarjeta({
  icono,
  titulo,
  texto,
  motivo,
  clase,
}: {
  icono: IconoManual;
  titulo: string;
  texto: string;
  motivo?: Motivo;
  clase: string;
}) {
  const Icono = ICONOS[icono];
  return (
    <div className={clase}>
      <span className={styles.tarjetaIcono}>
        <Icono size={19} />
      </span>
      <h4>{titulo}</h4>
      <p>
        <Texto texto={texto} />
      </p>
      {motivo && (
        <DibujoDeEsquina motivo={motivo} clase={styles.tarjetaMotivo} />
      )}
    </div>
  );
}

function BloqueVista({ bloque }: { bloque: Bloque }): ReactNode {
  switch (bloque.tipo) {
    case "texto":
      return (
        <p className={styles.texto}>
          <Texto texto={bloque.texto} />
        </p>
      );
    case "pasos":
      return (
        <div className={styles.pasos}>
          {bloque.titulo && (
            <h3 className={styles.subtitulo2}>{bloque.titulo}</h3>
          )}
          <ol className={styles.pasosLista}>
            {bloque.pasos.map((paso, i) => (
              <li key={i}>
                <span className={styles.paso} aria-hidden="true">
                  {i + 1}
                </span>
                <div className={styles.pasoTexto}>
                  <p>
                    <Texto texto={paso.texto} />
                  </p>
                  {paso.detalle && (
                    <small>
                      <Texto texto={paso.detalle} />
                    </small>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    case "aviso": {
      const { rotulo, Icono } = AVISOS[bloque.nivel];
      return (
        <aside className={styles.aviso} data-nivel={bloque.nivel}>
          <span className={styles.avisoIcono}>
            <Icono size={20} />
          </span>
          <div>
            <p className={styles.avisoRotulo}>{rotulo}</p>
            {bloque.titulo && (
              <p className={styles.avisoTitulo}>{bloque.titulo}</p>
            )}
            <p className={styles.avisoTexto}>
              <Texto texto={bloque.texto} />
            </p>
          </div>
        </aside>
      );
    }
    case "tarjetas":
      return (
        <div className={styles.tarjetas}>
          {bloque.tarjetas.map((t, i) => (
            <Tarjeta
              key={i}
              {...t}
              clase={styles.tarjeta}
              motivo={TURNO_TARJETAS[i % TURNO_TARJETAS.length]}
            />
          ))}
        </div>
      );
    case "flujo":
      return (
        <div className={styles.flujo}>
          {bloque.etapas.map((t, i) => (
            <FlujoEtapa
              key={i}
              {...t}
              ultima={i === bloque.etapas.length - 1}
            />
          ))}
        </div>
      );
    case "tabla":
      return (
        <>
          <div className={styles.tablaCaja}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  {bloque.columnas.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bloque.filas.map((fila, i) => (
                  <tr key={i}>
                    {fila.map((celda, j) => (
                      <td key={j}>
                        <Texto texto={celda} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bloque.nota && (
            <p className={styles.nota}>
              <Texto texto={bloque.nota} />
            </p>
          )}
        </>
      );
    case "lista":
      return (
        <ul
          className={`${styles.lista} ${bloque.estilo === "casillas" ? styles.casillas : ""}`}
        >
          {bloque.items.map((item, i) => (
            <li key={i}>
              <Texto texto={item} />
            </li>
          ))}
        </ul>
      );
    case "preguntas":
      return (
        <dl className={styles.preguntas}>
          {bloque.items.map((p, i) => (
            <div key={i} className={styles.pregunta}>
              <dt>
                <Texto texto={p.pregunta} />
              </dt>
              <dd>
                <Texto texto={p.respuesta} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "glosario":
      return (
        <dl className={styles.glosario}>
          {bloque.terminos.map((t) => (
            <div key={t.termino} className={styles.termino}>
              <dt>{t.termino}</dt>
              <dd>
                <Texto texto={t.significado} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "pantalla":
      return (
        <figure className={styles.pantalla}>
          <div className={styles.telefono}>
            <Escena id={bloque.escena} />
          </div>
          {bloque.pie && (
            <figcaption>
              <Texto texto={bloque.pie} />
            </figcaption>
          )}
        </figure>
      );
  }
}

/** Una etapa del camino, con la flecha que la une a la siguiente. */
function FlujoEtapa({
  icono,
  titulo,
  texto,
  ultima,
}: {
  icono: IconoManual;
  titulo: string;
  texto: string;
  ultima: boolean;
}) {
  const Icono = ICONOS[icono];
  return (
    <>
      <div className={styles.etapa}>
        <span className={styles.tarjetaIcono}>
          <Icono size={19} />
        </span>
        <h4>{titulo}</h4>
        <p>
          <Texto texto={texto} />
        </p>
      </div>
      {!ultima && (
        <span className={styles.flecha} aria-hidden="true">
          <ArrowRight size={20} />
        </span>
      )}
    </>
  );
}

function CapituloVista({
  capitulo,
  numero,
  relleno,
  compacto,
  salto,
}: {
  capitulo: Capitulo;
  numero: number;
  /** Alto en mm de la figura que llena el hueco al final del capítulo. */
  relleno?: number;
  /** 1 o 2: letra y espacios algo menores, para que quepa en la hoja. */
  compacto?: number;
  /** Empieza en hoja nueva: arrancaba al pie con apenas unas líneas. */
  salto?: boolean;
}) {
  const motivo = capitulo.motivo ?? MOTIVOS[(numero - 1) % MOTIVOS.length];
  return (
    <section
      id={capitulo.id}
      className={styles.capitulo}
      data-compacto={compacto || undefined}
      data-salto={salto || undefined}
    >
      <header className={styles.apertura}>
        <span className={styles.numero} aria-hidden="true">
          {numero}
        </span>
        <div className={styles.aperturaTexto}>
          <p className={styles.kicker}>Capítulo {numero}</p>
          <h2>{capitulo.titulo}</h2>
          <p className={styles.resumen}>{capitulo.resumen}</p>
        </div>
        <DibujoDeEsquina motivo={motivo} clase={styles.motivo} />
      </header>
      <div className={styles.cuerpo}>
        {capitulo.bloques.map((bloque, i) => (
          <BloqueVista key={i} bloque={bloque} />
        ))}
      </div>
      {/* Solo donde el capítulo deja un hueco grande al pie de la hoja: una de
          las figuras del territorio, del tamaño del hueco. El generador de PDF
          mide los huecos y pide estas figuras; en pantalla no hay ninguna. */}
      {relleno ? (
        <div className={styles.remate} aria-hidden="true">
          <span
            className={styles.remateDibujo}
            style={
              {
                "--tinte": TINTES[motivo],
                "--alto": `${relleno}mm`,
              } as CSSProperties
            }
          >
            <Filigrana motivo={motivo} />
          </span>
        </div>
      ) : null}
    </section>
  );
}

/** El alto de una hoja, una pizca menos para que la portada no la desborde. */
const ALTO_HOJA = { A5: "210mm", A4: "297mm" } as const;
const MARGENES = { A5: "13mm 11mm 18mm", A4: "16mm 15mm 20mm" } as const;

/**
 * Lo que `@page` necesita saber de este manual: tamaño de hoja, márgenes y el
 * pie con su paginación. No puede ir en el módulo CSS porque `@page` no lee
 * variables y cada manual tiene su tamaño. La portada y la contraportada usan
 * la página `cubierta`, sin márgenes ni pie.
 */
function reglasDePagina(manual: Manual) {
  const pie = `${manual.titulo} · Mi Pueblo Digital`.replaceAll('"', "'");
  return `@page { size: ${manual.formato}; margin: ${MARGENES[manual.formato]};
  @bottom-left { content: "${pie}"; font: 600 7pt "DM Sans Variable", sans-serif; color: #55635b; vertical-align: top; padding-top: 5mm; }
  @bottom-right { content: counter(page); font: 800 8pt "DM Sans Variable", sans-serif; color: #174f3b; vertical-align: top; padding-top: 5mm; } }
@page cubierta { margin: 0; background: #0d3340; @bottom-left { content: none; } @bottom-right { content: none; } }`;
}

export function ManualDocumento({
  manual,
  acciones,
  paginas,
  rellenos,
  compactos,
  saltos,
}: {
  manual: Manual;
  /** El botón de descargar, que solo existe en pantalla. */
  acciones?: ReactNode;
  /**
   * En qué hoja del PDF empieza cada capítulo, para el índice impreso.
   *
   * No se puede saber de antemano: depende de cuánto ocupa cada capítulo. El
   * generador de PDF imprime una primera vez, lee en qué hoja cae cada título y
   * vuelve a imprimir con estos números. El índice ocupa una hoja con o sin
   * ellos, así que no mueve nada.
   */
  paginas?: number[];
  /** Alto en mm de la figura de relleno de cada capítulo, por su `id`. */
  rellenos?: Record<string, number>;
  /** Nivel de compactación de cada capítulo, por su `id`. */
  compactos?: Record<string, number>;
  /** Los capítulos que empiezan en hoja nueva, por su `id`. */
  saltos?: string[];
}) {
  return (
    <article
      className={styles.manual}
      data-formato={manual.formato}
      style={{ "--alto-hoja": ALTO_HOJA[manual.formato] } as CSSProperties}
    >
      <style>{reglasDePagina(manual)}</style>

      <header className={styles.cubierta}>
        <div className={styles.hojas} aria-hidden="true">
          <span className={styles.hojaA}>
            <HojaPlatano />
          </span>
          <span className={styles.hojaB}>
            <HojaPlatano />
          </span>
          <span className={styles.hojaC}>
            <HojaPlatano />
          </span>
          <span className={styles.hojaD}>
            <HojaPlatano />
          </span>
        </div>
        <span className={styles.sello}>
          <Palafito size={188} casa="#f4f8f1" agua="#86cdd3" grosor={1.15} />
        </span>
        <div className={styles.marca}>
          <Logo />
        </div>
        <p className={styles.publico}>{manual.publico}</p>
        <h1>{manual.titulo}</h1>
        <p className={styles.subtitulo}>{manual.subtitulo}</p>
        {acciones && <div className={styles.acciones}>{acciones}</div>}
        <p className={styles.cubiertaPie}>
          <strong>Gran Consejo Comunitario Río Satinga</strong>
          Olaya Herrera, Nariño · Actualizado el {fechaLarga(manual.fecha)}
        </p>
      </header>

      <nav className={styles.indice} aria-label="En este manual">
        <p className={styles.indiceTitulo}>En este manual</p>
        <ol className={styles.indiceLista}>
          {manual.capitulos.map((c, i) => (
            <li key={c.id}>
              <a className={styles.indiceEnlace} href={`#${c.id}`}>
                <span className={styles.indiceNumero}>{i + 1}</span>
                {c.titulo}
              </a>
            </li>
          ))}
        </ol>
        <ol className={styles.indiceFilas}>
          {manual.capitulos.map((c, i) => (
            <li key={c.id}>
              <a className={styles.indiceFila} href={`#${c.id}`}>
                <span className={styles.indiceNumero}>{i + 1}</span>
                <span>
                  <strong>{c.titulo}</strong>
                  <small>{c.resumen}</small>
                </span>
                {paginas?.[i] && (
                  <span className={styles.indicePagina}>{paginas[i]}</span>
                )}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className={styles.contenido}>
        {manual.capitulos.map((c, i) => (
          <CapituloVista
            key={c.id}
            capitulo={c}
            numero={i + 1}
            relleno={rellenos?.[c.id]}
            compacto={compactos?.[c.id]}
            salto={saltos?.includes(c.id)}
          />
        ))}
      </div>

      <footer className={styles.despedida}>
        <span className={styles.despedidaSello}>
          <Palafito size={84} casa="#f4f8f1" agua="#86cdd3" grosor={1.2} />
        </span>
        <h2>{manual.cierre.titulo}</h2>
        <p>{manual.cierre.texto}</p>
        <p className={styles.despedidaPie}>
          Hecho para nuestro territorio · Río Satinga · Nariño
        </p>
      </footer>
    </article>
  );
}
