"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Moon,
  Sun,
  ArrowRight,
  WifiOff,
  Wifi,
} from "lucide-react";
import {
  subscribeTheme,
  getTheme,
  getServerTheme,
  toggleTheme,
} from "@/data/theme";
import Link from "next/link";
import styles from "./access.module.css";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { firebaseClient } from "@/data/firebase/client";
import { GoogleMark } from "@/components/google-mark";
import { Logo } from "@/components/ui";
import { registrationError, authError } from "@/domain/auth";
export function Access() {
  const dark = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
  /* Resultado de una eliminación de cuenta, leído solo en el navegador. */
  const farewell = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("cuenta"),
    () => null,
  );
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const [user, setUser] = useState<User | null>(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [configured, setConfigured] = useState(false);
  useEffect(() => {
    try {
      const { auth } = firebaseClient();
      const unsubscribe = onAuthStateChanged(
        auth,
        (u) => {
          setUser(u);
          setConfigured(true);
          setReady(true);
        },
        () => {
          setError("No se pudo comprobar la sesión.");
          setReady(true);
        },
      );
      return unsubscribe;
    } catch (e) {
      queueMicrotask(() => {
        setError(e instanceof Error ? e.message : "Error de configuración.");
        setReady(true);
      });
    }
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (registering) {
      const invalid = registrationError(name, password, confirmation);
      if (invalid) {
        setError(invalid);
        return;
      }
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (registering) {
        const result = await createUserWithEmailAndPassword(
          firebaseClient().auth,
          email.trim(),
          password,
        );
        setPassword("");
        setConfirmation("");
        try {
          await updateProfile(result.user, { displayName: name.trim() });
          await sendEmailVerification(result.user);
          setMessage(
            "Tu cuenta se creó y ya puedes reportar. Te enviamos un correo para verificarla: no hace falta para usar la aplicación, pero es lo que te permitirá recuperarla si pierdes el acceso.",
          );
        } catch {
          setMessage(
            "Tu cuenta se creó y ya puedes reportar. No se pudo enviar el correo de verificación; puedes pedirlo más tarde desde Mi cuenta.",
          );
        }
      } else
        await signInWithEmailAndPassword(
          firebaseClient().auth,
          email.trim(),
          password,
        );
      setPassword("");
    } catch (error) {
      setError(authError(error));
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await signInWithPopup(firebaseClient().auth, new GoogleAuthProvider());
      setPassword("");
    } catch (error) {
      setError(authError(error));
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Escribe un correo válido para recuperar el acceso.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await sendPasswordResetEmail(firebaseClient().auth, email.trim());
      setMessage(
        "Si existe una cuenta habilitada, recibirás las instrucciones de recuperación.",
      );
    } catch {
      setError("No se pudo solicitar la recuperación. Inténtalo más tarde.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={`${styles.page} ${dark ? "dark" : styles.light}`}>
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
        <Link
          href="/bienvenida/"
          className={styles.brand}
          aria-label="Volver a bienvenida"
        >
          <Logo />
        </Link>
        <div className={styles.controls}>
          {/* El estado de la red no es adorno: aquí decide si se puede entrar. */}
          <p className={styles.link} role="status">
            {offline ? <WifiOff size={17} /> : <Wifi size={17} />}
            <span>
              <strong>{offline ? "Sin conexión" : "En línea"}</strong>
              <small>
                {offline ? "Entrar necesita señal" : "Puedes iniciar sesión"}
              </small>
            </span>
          </p>
          <button
            type="button"
            className={styles.theme}
            onClick={toggleTheme}
            aria-label={dark ? "Activar tema claro" : "Activar tema oscuro"}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>
      {/* La presentación va sobre el paisaje y el formulario sobre el vidrio:
          son dos bloques, no uno. Antes el borde del vidrio cruzaba por mitad
          del subtítulo y lo partía en dos fondos distintos. */}
      <section className={styles.intro}>
          <span className={styles.eyebrow}>ACCESO A MI PUEBLO</span>
          <h1 className={styles.title}>
            {user ? (
              "Ya estás en casa."
            ) : registering ? (
              <>
                Hagamos <em>comunidad.</em>
              </>
            ) : (
              <>
                Tu comunidad, <em>más cerca.</em>
              </>
            )}
          </h1>
          <p className={styles.lead}>
            {user
              ? "Continúa donde lo dejaste."
              : registering ? "Crea tu cuenta para reportar y seguir los cambios de tu territorio." : "Inicia sesión para acompañar lo que pasa en tu territorio."}
          </p>
      </section>
      <section className={styles.panel}>
          {farewell && (
            <p className={styles.notice} role="status">
              {farewell === "eliminada"
                ? "Tu cuenta fue eliminada y tus expedientes quedaron sin datos personales. Gracias por haber cuidado el territorio con nosotros."
                : "Tu acceso fue retirado, pero la eliminación no terminó por completo. El equipo responsable del Consejo debe finalizarla."}
            </p>
          )}
          {offline && (
            <p className={styles.notice} role="status">
              <WifiOff size={16} /> Sin conexión. Necesitas internet para
              iniciar sesión.
            </p>
          )}
          {!ready ? (
            <p role="status">Comprobando conexión…</p>
          ) : user ? (
            <>
              <p>
                Conectado como <strong>{user.email}</strong>.
              </p>
              <p className={styles.notice}>
                Ya puedes reportar. Verificar el correo es opcional.
              </p>
              <Link className={styles.primary} href="/inicio/">
                Continuar a mi comunidad
                <i aria-hidden="true">
                  <ArrowRight size={19} />
                </i>
              </Link>
              <button
                className={styles.quiet}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await signOut(firebaseClient().auth);
                  } catch {
                    setError("No se pudo cerrar la sesión.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <form onSubmit={login}>
              {registering && (
                <label className={styles.field}>
                  Tu nombre
                  <input
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={80}
                    disabled={busy}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )}
              <label className={styles.field}>
                Correo electrónico
                <input
                  type="email"
                  inputMode="email"
                  placeholder="tu@correo.com"
                  disabled={busy}
                  spellCheck={false}
                  autoCapitalize="none"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <div className={`${styles.field} ${styles.password}`}>
                <label className={styles.field}>
                  Contraseña
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      registering ? "new-password" : "current-password"
                    }
                    placeholder="Tu contraseña"
                    disabled={busy}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className={styles.reveal}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}{" "}
                </button>
              </div>
              {registering && (
                <label className={styles.field}>
                  Confirmar contraseña
                  <input
                    aria-label="Confirmar contraseña"
                    type="password"
                    autoComplete="new-password"
                    required
                    disabled={busy}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                  <small>Usa al menos 12 caracteres.</small>
                </label>
              )}
              <button
                className={styles.primary}
                disabled={!configured || busy || offline}
              >
                {busy
                  ? "Conectando…"
                  : registering
                    ? "Crear cuenta"
                    : "Iniciar sesión"}
                <i aria-hidden="true">
                  <ArrowRight size={19} />
                </i>
              </button>
              <button
                className={styles.quiet}
                type="button"
                disabled={!configured || busy || offline}
                onClick={reset}
              >
                Olvidé mi contraseña
              </button>
              {/* Separador: hasta aquí el acceso con contraseña; de aquí en
                  adelante, la otra vía. Sin él los dos botones se leen como
                  alternativas del mismo peso. */}
              <span className={styles.or} aria-hidden="true">
                o
              </span>
              <button
                type="button"
                className={styles.google}
                disabled={busy || offline || !configured}
                onClick={google}
              >
                <GoogleMark /> Continuar con Google
              </button>
              <button
                type="button"
                className={styles.quiet}
                disabled={busy}
                onClick={() => {
                  setRegistering(!registering);
                  setError("");
                  setMessage("");
                  setPassword("");
                  setConfirmation("");
                }}
              >
                {registering ? "Ya tengo una cuenta" : "Crear una cuenta"}
              </button>
            </form>
          )}
          {error && (
            <p className={styles.errors} role="alert">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className={styles.notice}>
              {message}
            </p>
          )}
          {/* El nombre anterior, «Explorar la demostración», dejó de ser cierto
              al retirar los reportes fabricados: lo que hay detrás es la
              aplicación de verdad, vacía hasta que alguien reporte. */}
          <Link href="/inicio/" className={styles.guest}>
            Entrar sin iniciar sesión
            <small>
              Puedes ver el territorio y preparar un reporte. Enviarlo al
              Consejo necesita una cuenta.
            </small>
          </Link>
      </section>
      <footer className={styles.foot}>
        <span>Mi Pueblo Digital · Gran Consejo Comunitario del Río Satinga</span>
      </footer>
    </main>
  );
}
