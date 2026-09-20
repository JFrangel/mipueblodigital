import {
  Check,
  Clock,
  X,
  Ban,
  ArrowUpRight,
  Leaf,
  Construction,
  Users,
  MapPin,
  Ellipsis,
  UserRound,
  TreePine,
  Waves,
  House,
} from "lucide-react";
import { statuses } from "@/data/catalog";
/**
 * El rótulo del Consejo: solo la palabra.
 *
 * Llevaba el emblema delante y **se quitó**: sobre la fotografía del dosel de
 * la bienvenida y sobre el blanco de la barra se leía como una pegatina pegada
 * al lado del nombre, y no había tamaño ni sombra que lo arreglara. El emblema
 * no desaparece de la aplicación, sigue siendo el icono: el del lanzador en el
 * teléfono, el de la pestaña y el de la pantalla de inicio.
 *
 * Una marca que es solo palabra no es menos marca. Lo que la sostiene es el
 * contraste entre el nombre y su descriptor, y la raya que cierra el renglón.
 */
export function Logo() {
  return (
    <span className="brand">
      {/* «Mi» en fino y «Pueblo» en negra: el contraste de peso es lo que
          hace que esto se lea como un rótulo dibujado y no como una cadena
          puesta en negrita. Sale del mismo archivo de fuente —el eje de grueso
          va de 200 a 800— y no cuesta un byte más. */}
      {/* El «Mi», enredado.
            El tallo pasa por detrás del recuadro y una hoja por delante: así
            la enredadera lo rodea en vez de estar pintada encima. */}
      {/* El «Mi» va aparte del nombre porque es el posesivo, y escrito a mano
          porque quien lo dice es una persona. Llevó una enredadera alrededor,
          con su última hoja de punto de la i; se quitó, y con ella vuelve la i
          con el suyo: sin el dibujo, la ı sin punto es una falta. */}
      <span className="brand-mi">
        <i>Mi</i>
      </span>
      {/* El nombre y su descriptor son una columna, y el «Mi» va al lado: así
          «Digital» cae debajo de «Pueblo» y no debajo de todo el rótulo. */}
      <span className="brand-word">
        Pueblo
        <em>
          {/* La hoja **es la A**. Deja de ser un remate al final del renglón y
              pasa a ser una letra: sin ella la palabra no está escrita. La «a»
              de verdad va detrás, tapada, para que quien no vea el dibujo
              —lector de pantalla, o quien copie el texto— siga leyendo
              «Digital» y no «Digitl». */}
          Digit
          <svg className="brand-leaf" viewBox="0 0 24 24" aria-hidden="true">
            {/* La lámina, **cerrada**, como estaba al principio.

                Se probó abriéndola por abajo y por el canto izquierdo, y con
                cada apertura se leía menos una A, no más: lo que hace la letra
                es **el ojo cerrado encima del travesaño**. En una A de verdad
                la barra encierra un triángulo, y una lámina abierta no encierra
                nada.

                El giro de 16° tampoco se toca: probados 26 y 34, tumban el
                vértice y vuelve a parecer una hoja. */}
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            {/* El travesaño es **el río**. Esto es el Gran Consejo Comunitario
                del Río Satinga: en ese territorio el río no es un adorno del
                paisaje, es la calle. Que la barra de la A sea un meandro dice
                de dónde es la aplicación sin escribirlo en ninguna parte.

                **Subió de sitio, y no por gusto.** Donde cruzaba antes —y 15,3,
                el 28 % del alto de la letra— la lámina deja un hueco de unas 6
                unidades, y el trazo mide 2,4: midiendo la distancia de cada
                punto al canto, la mayor onda que cabía allí sin que los dos
                trazos se fundieran era **cero**. A y 13 caben ±1,7. Y 13 es,
                además, el 39 % del alto, que es donde cruza el travesaño de una
                A de verdad; la anterior iba baja.

                Se usa 1,2 y no el máximo de 1,7: así quedan 3,3 unidades entre
                ejes y se ve raya de sombra entre el río y el canto. Por debajo
                de 2,4 los dos trazos se tocan y la letra se cierra.

                **Va en azul.** Es la única pieza de la marca que no es verde, y
                por eso se entiende sin pie de foto: una raya verde dentro de
                una hoja verde es una nervadura; en azul es agua. Usa el azul
                que ya tiene la app —#4a86b8—, aclarado a #83b9e0 donde el
                fondo es oscuro, que es el mismo tono con la claridad que pide
                el fondo. El icono de avisos se queda sin él: Android solo usa
                el canal alfa de ese archivo y lo tiñe de un color.

                **Un solo meandro.** En el rótulo esta hoja mide 11 px: con dos
                vueltas el río se vuelve un borrón y la A deja de leerse. Los
                extremos caen justo sobre el canto de la lámina, así que los
                remates redondos mueren dentro de su trazo por los dos lados. */}
            <path
              className="brand-rio"
              d="M3.9 13C4.6 13.2 6.7 14.2 8.1 14.2C9.5 14.2 10.8 13.4 12.2 13C13.6 12.6 15 11.8 16.4 11.8C17.8 11.8 19.9 12.8 20.6 13"
            />
          </svg>
          <span className="solo-lectores">a</span>l
        </em>
      </span>
    </span>
  );
}
/** El avatar que el ciudadano elige en su cuenta, reutilizable en todo el shell. */
export function AvatarMark({
  avatar,
  size = 20,
}: {
  avatar: string;
  size?: number;
}) {
  /* Una fotografía propia en vez de una marca del catálogo. Va recortada en
     círculo y cubriendo el hueco, que es como se ve un retrato pequeño. */
  if (avatar.startsWith("data:image/"))
    return (
      /* Base64 propio, ya reducido a 256 píxeles: el optimizador no tiene nada
         que optimizar aquí y no sabe servir data URLs. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        className="avatar-photo"
      />
    );
  const Icon =
    avatar === "tree"
      ? TreePine
      : avatar === "river"
        ? Waves
        : avatar === "home"
          ? House
          : UserRound;
  return <Icon size={size} aria-hidden="true" />;
}
/**
 * El dibujo de cada estado, en un solo sitio.
 *
 * Lo tenía la insignia, y la línea de tiempo del expediente dibujaba lo suyo
 * aparte: el último asiento salía siempre con el reloj ámbar de «en curso»,
 * así que un caso cerrado con éxito se leía «Solucionado» en el color y con el
 * icono de algo que todavía está pasando. El estado y su color tienen que ser
 * la misma cosa mire uno donde mire.
 *
 * Siete estados y cuatro dibujos: lo resuelto se marca, lo que se cerró sin
 * resolver se tacha, lo bloqueado se corta y lo que sigue abierto espera.
 */
export function StatusIcon({
  status,
  size = 12,
}: {
  status: string;
  size?: number;
}) {
  return status === "solucionado" ? (
    <Check size={size} />
  ) : status === "no_solucionado" || status === "descartado" ? (
    <X size={size} />
  ) : status === "bloqueado_conflicto" ? (
    <Ban size={size} />
  ) : status === "escalado" ? (
    <ArrowUpRight size={size} />
  ) : (
    <Clock size={size} />
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${status}`}>
      <StatusIcon status={status} />
      {statuses[status] || status}
    </span>
  );
}
export function CategoryIcon({
  category,
  size = 21,
}: {
  category: string;
  size?: number;
}) {
  const Icon =
    category === "recursos_naturales"
      ? Leaf
      : category === "conflictos_territoriales"
        ? MapPin
        : category === "socioeconomicos"
          ? Users
          : category === "otro"
            ? Ellipsis
            : Construction;
  return <Icon size={size} />;
}
export function Empty({
  text = "No hay reportes con estos filtros.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <Leaf size={30} />
      <h3>Un espacio por completar</h3>
      <p>{text}</p>
    </div>
  );
}
