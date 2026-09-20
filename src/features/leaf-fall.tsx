import styles from "./banana-leaves.module.css";

/**
 * Hojas ilustradas que acompañan el envío sin interceptar los controles.
 *
 * Dicen una sola cosa —**algo pasa por aquí**— y por eso no van en cualquier
 * panel: donde salen sin que nada pase dejan de significar y se vuelven papel
 * pintado. Los tres momentos que las tienen son los tres de paso: mientras el
 * reporte sale, cuando ya tiene lugar, y cuando la bandeja suelta lo que
 * llevaba días esperando señal.
 */
/**
 * La hoja de plátano, el dibujo.
 *
 * Vive aparte porque la usan dos cosas distintas —las hojas que acompañan un
 * envío y el telón que abre la aplicación— y dos copias de estos trazos serían
 * dos hojas distintas el día que alguien retoque una.
 */
export function HojaPlatano() {
  return (
    <svg viewBox="0 0 120 320" fill="none">
      <path
        /* El nervio central, que **se afina hacia la punta**: en la mata
           es grueso donde la hoja carga su peso y se va reduciendo hasta
           desaparecer en el ápice. Un trazo tiene un solo grosor en todo
           su recorrido, así que esto no es un trazo sino una figura
           rellena: el mismo arco de ida por un lado y de vuelta por el
           otro, con el ancho cayendo de 2,1 a 0,15.
  
           Termina en el ápice de la lámina (96,15) y no en (99,12): así
           no asoma por la punta como un pelo suelto. */
        d="M33.2 314L33.6 302.1L34.2 290.3L35.2 278.7L36.5 267.2L38 255.8L39.8 244.5L41.8 233.3L44 222.2L46.4 211.1L49 200.1L51.7 189.1L54.6 178.1L57.5 167.1L60.6 156L63.7 144.9L66.8 133.8L70 122.5L73.2 111.2L76.4 99.7L79.5 88.2L82.5 76.4L85.5 64.5L88.4 52.5L91.1 40.2L93.7 27.7L96.1 15L95.9 15L93.3 27.6L90.5 40.1L87.6 52.3L84.6 64.3L81.5 76.1L78.2 87.8L75 99.3L71.7 110.7L68.3 122L65 133.2L61.7 144.3L58.4 155.4L55.2 166.4L52.1 177.4L49.1 188.4L46.2 199.4L43.4 210.4L40.9 221.5L38.5 232.7L36.3 243.9L34.3 255.2L32.6 266.7L31.2 278.2L30.1 290L29.2 301.9L28.8 314Z"
        fill="#acbd70"
      />
      <path
        d="M96 14C35 30 2 86 14 144l26-15-23 26c5 25 14 45 26 64l19-39-12 54c39-24 66-58 65-103l-16 10 15-23c2-35-3-69-18-104Z"
        fill="#24634b"
      />
      <path
        d="M96 14C83 78 62 151 43 219c-12-19-21-39-26-64l23-26-26 15C2 86 35 30 96 14Z"
        fill="#4a8751"
      />
      <path
        /* El nervio central sobre la lámina, **afinándose hacia la
           punta**: en la mata es grueso donde la hoja carga su peso y
           se reduce hasta desaparecer en el ápice. Un trazo tiene un
           solo grosor en todo su recorrido, así que esto no es un trazo
           sino una figura: la misma curva de ida por un lado y de
           vuelta por el otro. Abajo empata con el grosor del peciolo,
           para que la línea se lea como una sola. */
        d="M96 14L94.5 20.4L93 26.8L91.5 33.2L89.9 39.5L88.4 45.8L86.9 52.2L85.3 58.4L83.7 64.7L82.1 71L80.5 77.2L78.9 83.4L77.2 89.6L75.6 95.8L73.9 102L72.2 108.1L70.5 114.3L68.8 120.4L67.1 126.6L65.4 132.7L63.7 138.8L62 145L60.3 151.1L58.6 157.2L56.8 163.3L55.1 169.5L53.4 175.6L51.7 181.7L50 187.8L48.3 194L46.6 200.1L44.9 206.3L43.2 212.4L41.5 218.6L46.1 213.2L47.7 207L49.3 200.9L51 194.7L52.6 188.6L54.3 182.4L55.9 176.3L57.6 170.1L59.2 164L60.9 157.9L62.5 151.7L64.2 145.6L65.8 139.4L67.5 133.3L69.1 127.1L70.8 121L72.4 114.8L74 108.6L75.6 102.4L77.2 96.2L78.8 90L80.3 83.8L81.9 77.5L83.4 71.3L84.9 65L86.4 58.7L87.9 52.4L89.3 46.1L90.7 39.7L92.1 33.3L93.5 26.9L94.8 20.5L96 14Z"
        fill="#c1d17e"
      />
      <g stroke="#a9c577" strokeWidth="1" opacity=".6">
        {/* La nervadura, **hacia la punta**. Salía del nervio central
            inclinándose hacia la base, que es al revés de como crece una
            hoja: las nervaduras laterales se abren hacia el margen
            apuntando al ápice, como las barbas de una pluma.
  
            Y **arrancan sobre el nervio**, no cerca. Sus puntos salen de
            evaluar la curva del nervio —que es una cúbica— en once
            posiciones, no de estimarlos a ojo: estimados, los de abajo
            nacían hasta nueve unidades a la izquierda y se veían
            flotando en la mitad clara de la lámina.
  
            El ángulo es **el mismo en todas** —22° respecto a la
            perpendicular del nervio— y el largo sale del ancho de la
            lámina en cada punto. Puestas a mano iban de 8° a 39°, unas
            más tumbadas que otras, y la de arriba medía 46 donde la hoja
            tiene 25: se salía.
  
            Y **ninguna cruza un desgarro**: la hoja tiene tres rotos, y
            una nervadura atravesando uno dibuja lámina donde no la hay.
            Dos los invadían y se recortaron; una tercera quedaba en un
            muñón de cuatro unidades y se quitó. */}
        <path d="M86.5 56.1 65.3 40.9M78.7 87 46.5 63.2M70.6 117.6 30.7 87.5M62.3 148 41.7 132.3M54 178.4 31.7 161.4M88.9 45.6 100.8 43.8M82.4 72.6 104.2 69.6M74.4 103.4 104.2 99.6M66.2 133.9 98 130.1M57.9 164.2 83.7 161.2" />
      </g>
      {/* La hojita que salía de la base ya no está: a los tamaños a los
          que se usa este dibujo no se leía como una segunda hoja, se
          leía como un borrón, y en más de un sitio parecía que hubiera
          dos hojas donde se quiere una. */}
    </svg>
  );
}

export function LeafFall({
  drifting = false,
  waiting = false,
  calm = false,
  small = false,
}: {
  count?: number;
  drifting?: boolean;
  /** Ni entran ni se van: respiran. Para lo que está siempre a la vista. */
  calm?: boolean;
  /** Se apartan y **se quedan abiertas**: para lo que espera, no lo que salió. */
  waiting?: boolean;
  /** Para una franja baja, donde la hoja entera no cabe. */
  small?: boolean;
}) {
  return (
    <div
      className={[
        styles.frame,
        drifting ? styles.sending : "",
        waiting ? styles.waiting : "",
        calm ? styles.calm : "",
        small ? styles.small : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {/* En calma va **una sola**. La pareja enfrentada es el gesto de dejar
          pasar algo, y además en espejo queda rígida: parece un sello, no
          monte. Donde no pasa nada basta una hoja. */}
      {(calm ? ["left"] : ["left", "right"]).map((side) => (
        <div
          key={side}
          className={side === "left" ? styles.left : styles.right}
        >
          <HojaPlatano />
        </div>
      ))}
    </div>
  );
}
