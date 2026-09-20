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
      <span className="brand-word">Pueblo</span>
      {/* «Digital» con su A, y sin dibujo dentro.

          La A era una hoja: una lámina ladeada con un meandro azul de
          travesaño, puesta para que el rótulo dijera de dónde es sin
          escribirlo. Funcionaba cuando la hoja era la marca. Dejó de serlo —el
          icono del cajón, la pestaña, el arranque y la barra de estado son el
          palafito—, y una hoja que ya no significa nada en el resto de la
          aplicación deja de leerse como una A con historia y pasa a leerse como
          una errata: «DIGIT⊘L».

          Con ella se van el «a» escondido para lectores de pantalla y los tres
          colores que sostenían el dibujo. La palabra vuelve a estar escrita con
          letras, que es lo que un lector de pantalla, un buscador y quien copie
          el texto entendían ya de todas formas. */}
      <em>Digital</em>
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
