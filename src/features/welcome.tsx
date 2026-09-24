"use client";
import Link from "next/link";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  CloudOff,
  Leaf,
  MapPin,
  MessageCircle,
  Moon,
  ShieldCheck,
  Sun,
  Users,
  Wifi,
} from "lucide-react";
import { Logo } from "@/components/ui";
import {
  subscribeTheme,
  getTheme,
  getServerTheme,
  toggleTheme,
} from "@/data/theme";
import { useOnline } from "@/data/network";
import { markVisited } from "@/data/first-visit";
import styles from "./welcome.module.css";

/** Punto de referencia documentado de la cuenca; no es un límite territorial. */
const REFERENCE = "2.2833° N · 78.2543° O";

const pillars = [
  { Icon: Camera, label: "Reporta" },
  { Icon: MapPin, label: "Localiza" },
  { Icon: Users, label: "Participa" },
  { Icon: Leaf, label: "Transforma" },
];

const steps = [
  {
    Icon: MessageCircle,
    title: "Cuéntalo con claridad",
    text: "Describe la situación y añade una fotografía que ayude a entenderla.",
  },
  {
    Icon: MapPin,
    title: "Ponlo en el territorio",
    text: "Elige la vereda. El Consejo sabe dónde mirar y a quién asignar el caso.",
  },
  {
    Icon: ShieldCheck,
    title: "Sigue cada paso",
    text: "Consulta el estado y las notas del Consejo. Tu reporte conserva su historia.",
  },
];

export function Welcome() {
  const dark = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
  const online = useOnline();
  return (
    <main className={dark ? "dark" : styles.light}>
      <section className={styles.stage}>
        <Image
          src="/brand/river-welcome.webp"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className={styles.landscape}
        />
        <div className={styles.depth} aria-hidden="true" />
        <div className={styles.veil} aria-hidden="true" />

        <header className={styles.header}>
          <div className={styles.brand}>
            <Logo />
            <span className={styles.brandLine}>
              Nuestra gente.
              <br />
              Nuestro territorio.
              <br />
              Un mejor mañana.
            </span>
          </div>
          <div className={styles.controls}>
            {/* El estado de la red es real, no decorativo. */}
            <p className={styles.link} role="status">
              {online ? <Wifi size={17} /> : <CloudOff size={17} />}
              <span>
                <strong>{online ? "En línea" : "Sin conexión"}</strong>
                <small>
                  {online
                    ? "Tu voz llega al Consejo"
                    : "Tus reportes se guardarán"}
                </small>
              </span>
            </p>
            <button
              className={styles.theme}
              onClick={toggleTheme}
              aria-label={dark ? "Activar tema claro" : "Activar tema oscuro"}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>

        <section className={styles.intro}>
          <h1 className={styles.title}>
            Tu voz.
            <br />
            <em>Tu territorio.</em>
            <br />
            Nuestra comunidad.
          </h1>
          <p className={styles.lead}>
            Haz visible lo que pasa. Juntos cuidamos y transformamos nuestro
            territorio.
          </p>
          <ul className={styles.pillars}>
            {pillars.map(({ Icon, label }) => (
              <li key={label}>
                <Icon size={19} />
                {label}
              </li>
            ))}
          </ul>
          <Link className={styles.start} href="/inicio/" onClick={markVisited}>
            <i aria-hidden="true">
              <ArrowRight size={20} />
            </i>
            Comenzar
          </Link>
          <p className={styles.offline}>
            <CloudOff size={15} />
            <span>
              También puedes reportar <b>sin conexión</b>
            </span>
          </p>
          {/* Quien ya tiene cuenta no viene a conocer la aplicación: viene a
              entrar. Antes tenía que pasar por «Comenzar», llegar a Inicio y
              buscar el acceso desde ahí, o desde Mi cuenta. Va debajo y en
              segundo plano a propósito: la puerta principal de esta pantalla
              sigue siendo conocer el proyecto sin tener que registrarse. */}
          <p className={styles.ya}>
            ¿Ya tienes cuenta?{" "}
            <Link href="/acceso/" onClick={markVisited}>
              Inicia sesión
            </Link>
          </p>
        </section>

        <footer className={styles.foot}>
          <span className={styles.coords}>
            <MapPin size={13} />
            {REFERENCE} · Río Satinga, Olaya Herrera
          </span>
          <Link href="/documentacion/">
            Conoce el alcance y cómo se mantiene
          </Link>
        </footer>
      </section>

      <section className={styles.explainer}>
        <div className={styles.explainerHead}>
          <span className={styles.kicker}>CERCA DE LO QUE IMPORTA</span>
          <h2>De una situación a una respuesta con nombre y fecha.</h2>
        </div>
        {/* La numeración marca el orden real en que ocurre un reporte. */}
        <ol className={styles.steps}>
          {steps.map(({ Icon, title, text }, i) => (
            <li key={title}>
              <span>0{i + 1}</span>
              <Icon size={24} />
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <div className={styles.explainerFoot}>
          <Link href="/inicio/" className={styles.enter} onClick={markVisited}>
            Entrar a la aplicación <ArrowUpRight size={18} />
          </Link>
          <Link href="/terminos/" className={styles.guide}>
            Privacidad, alcance y mantenimiento
          </Link>
          {/* Lo que sigue sin estar cerrado, y solo eso. Decía «versión en
              desarrollo» y que el mapa y las estadísticas usaban datos de
              ejemplo: aquellos doce reportes fabricados ya no existen, y lo que
              se dibuja son los reportes de la comunidad. Mantener el aviso
              después de quitarlos hacía dudar de cifras que sí son ciertas. */}
          <p className={styles.note}>
            El catálogo de veredas proviene del EOT de 2007 y de fuentes
            públicas, y está pendiente de validación por el Consejo Comunitario:
            los nombres pueden cambiar y los puntos son aproximados.
          </p>
        </div>
      </section>
    </main>
  );
}
