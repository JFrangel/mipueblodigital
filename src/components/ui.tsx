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
 * Marca de Mi Pueblo Digital: un palafito al amanecer.
 *
 * Hubo antes una hoja sobre tres corrientes, que decía «naturaleza» y podía ser
 * de cualquier sitio. Y hubo un paisaje entero —monte, palma, casa, sol, agua—
 * que a cuarenta y dos píxeles se volvía una mancha: cinco planos no caben ahí.
 *
 * Queda una silueta. La casa levantada sobre pilotes es lo que no tiene ningún
 * otro sitio, y se recorta **entera contra el cielo** para que sobreviva al
 * tamaño pequeño; solo las patas entran en el agua, que es justo lo que hace a
 * un palafito. El sol detrás es la hora a la que se sale a trabajar.
 */
export function Logo() {
  return (
    <span className="brand">
      <svg
        width="42"
        height="42"
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="brand-mark"
      >
        <defs>
          <linearGradient id="mpd-cielo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f7cf95" />
            <stop offset="1" stopColor="#e79350" />
          </linearGradient>
          <linearGradient id="mpd-agua" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#17513f" />
            <stop offset="1" stopColor="#0b2b21" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="19" fill="url(#mpd-cielo)" />
        <circle cx="32" cy="25" r="12" fill="#fff0cd" opacity=".92" />
        <g fill="#103527">
          <path d="M12 30 32 15l20 15v1.8H12Z" />
          <path d="M18 31.8h28V44H18Z" />
          <path d="M20.6 44h3.4v9h-3.4Zm9.7 0h3.4v9h-3.4Zm9.7 0h3.4v9h-3.4Z" />
        </g>
        <path d="M0 47h64v17H0Z" fill="url(#mpd-agua)" />
        <g stroke="#69c4a8" strokeLinecap="round" fill="none">
          <path
            d="M9 52.5c5-2.4 10.2-2.4 15.2 0 5 2.4 10.2 2.4 15.2 0 3.3-1.6 6.8-2.1 10-1.6"
            strokeWidth="2.6"
            opacity=".9"
          />
          <path
            d="M14 58.5c4.3-1.9 8.8-1.9 13.1 0 4.3 1.9 8.8 1.9 13.1 0"
            strokeWidth="2.1"
            opacity=".55"
          />
        </g>
      </svg>
      <span className="brand-word">
        Mi Pueblo<em>Digital</em>
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
