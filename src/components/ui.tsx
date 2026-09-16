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
/** Palafito, árbol ribereño y río: emblema vectorial compartido con la PWA. */
export function Logo() {
  return (
    <span className="brand">
      {/* SVG local: mantiene detalle y nitidez sin transformación del optimizador. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/emblem.svg"
        width="42"
        height="42"
        alt=""
        aria-hidden="true"
        className="brand-mark"
      />
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
