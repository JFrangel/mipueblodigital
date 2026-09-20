"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  type User,
} from "firebase/auth";
import { firebaseClient } from "@/data/firebase/client";
import { cerrarSesion } from "@/platform/native";
import { toast } from "@/data/toasts";
import {
  abrirAjustes,
  dondeSeArregla,
  estadoDe,
  pedir,
  type Estado,
} from "@/platform/permisos";
import { PasswordChange } from "./password-change";
import { DeleteAccount } from "./delete-account";
import { AvatarPicker } from "./avatar-picker";
import {
  UserRound,
  ShieldCheck,
  LogOut,
  Moon,
  Sun,
  BookOpen,
  ArrowUpRight,
  Pencil,
  Camera,
  Bell,
  BellOff,
  Mic,
  Crosshair,
} from "lucide-react";
import { memberHeaders } from "@/data/remote-reports";
import { activado, darDeBaja, disponible, registrar } from "@/platform/push";
import { updateSession, useSession } from "@/data/session";
import { AvatarMark } from "@/components/ui";

export function Account({
  dark,
  onTheme,
}: {
  dark: boolean;
  onTheme: () => void;
}) {
  const session = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  /* El nombre guardado, para saber si lo que hay en pantalla cambió. */
  const [savedName, setSavedName] = useState("");
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  /* Elección en curso: no se guarda al tocarla, se guarda al confirmar. */
  const [avatar, setAvatar] = useState(session.avatar);
  /* Para que la respuesta del servidor no pise una elección recién hecha. */
  const picked = useRef(false);
  /* Si el perfil ciudadano está activo en el servidor. Se deduce de la misma
     consulta del avatar, que pasa por el guión de pertenencia: si responde,
     la cuenta está habilitada y no hay nada que reintentar. */
  const [membership, setMembership] = useState<
    "comprobando" | "activa" | "inactiva"
  >("comprobando");
  const [busy, setBusy] = useState(false);
  /**
   * Los avisos al teléfono: `null` mientras no se sabe, y también cuando este
   * aparato no puede recibirlos.
   *
   * La fila solo existe donde puede funcionar. Un interruptor que no hace nada
   * es peor que no tener el interruptor: la persona cree que lo activó y se
   * queda esperando un aviso que no va a llegar. Y `null` de partida evita que
   * la fila parpadee al entrar en la pantalla.
   */
  const [avisos, setAvisos] = useState<boolean | null>(null);
  /**
   * El micrófono y la ubicación.
   *
   * No son interruptores de esta aplicación: los tiene el sistema, y esta
   * pantalla solo puede decir en qué quedaron y dónde se cambian. Están aquí
   * por Android 13 en adelante, donde **un «no» dicho a destiempo solo se
   * deshace entrando en los ajustes**: sin contarlo, alguien se queda creyendo
   * que el dictado no funciona en su teléfono.
   *
   * Nulos de partida, y las filas no salen donde no se puedan preguntar: una
   * fila que dice «no sabemos» no ayuda a decidir nada.
   */
  const [microfono, setMicrofono] = useState<Estado | null>(null);
  const [ubicacion, setUbicacion] = useState<Estado | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    try {
      return onAuthStateChanged(
        firebaseClient().auth,
        (current) => {
          setUser(current);
          setName(current?.displayName || "");
          setSavedName(current?.displayName || "");
          setReady(true);
        },
        () => {
          setError("No se pudo comprobar la sesión.");
          setReady(true);
        },
      );
    } catch {
      queueMicrotask(() => {
        setReady(true);
        setError("El acceso todavía no está configurado.");
      });
    }
  }, []);
  /* El avatar vigente lo dice el servidor: el recordado en el navegador pinta
     de inmediato, pero puede venir de otro dispositivo. */
  useEffect(() => {
    if (!session.uid) return;
    let alive = true;
    memberHeaders()
      .then(({ headers }) =>
        fetch("/api/account/avatar/", {
          headers,
          signal: AbortSignal.timeout(10000),
        }).then(async (response) => {
          if (!alive) return;
          setMembership(response.ok ? "activa" : "inactiva");
          if (!response.ok) return;
          const data = await response.json();
          if (picked.current) return;
          updateSession({ avatar: data.avatar });
          setAvatar(data.avatar);
        }),
      )
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [session.uid]);
  useEffect(() => {
    let vivo = true;
    void (async () => {
      /* Se pregunta por la puerta y no por `Notification`: el WebView de
         Android no trae esa API, y leerla ahí dejaba esta fila sin aparecer en
         la aplicación instalada mientras en el navegador salía bien. Ver
         push.ts. */
      const puede = await disponible();
      const encendido = puede && (await activado());
      if (vivo) setAvisos(puede ? encendido : null);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  /* Se miran al entrar, y otra vez al volver a la pantalla: alguien pudo
     haberlos cambiado en los ajustes del sistema mientras tanto, y encontrarse
     el dato viejo al volver sería justo lo contrario de lo que estas filas
     vienen a resolver. */
  useEffect(() => {
    let vivo = true;
    const mirar = () => {
      void estadoDe("microfono").then((e) => vivo && setMicrofono(e));
      void estadoDe("ubicacion").then((e) => vivo && setUbicacion(e));
    };
    mirar();
    document.addEventListener("visibilitychange", mirar);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", mirar);
    };
  }, []);

  /** Encender o apagar los avisos de este aparato. */
  async function cambiarAvisos() {
    if (busy) return;
    setBusy(true);
    try {
      if (avisos) {
        await darDeBaja();
        setAvisos(false);
        toast("Ya no recibirás avisos en este dispositivo.");
        return;
      }
      const salida = await registrar();
      setAvisos(salida === "ok");
      toast(
        salida === "ok"
          ? "Te avisaremos en este dispositivo."
          : salida === "denegado"
            ? "Los avisos están bloqueados para esta aplicación. Se vuelven a activar desde los ajustes del navegador o del sistema."
            : salida === "sin-sesion"
              ? "Inicia sesión para recibir avisos sobre tus reportes."
              : "Este dispositivo no pudo quedar apuntado. Revisa la conexión.",
        salida === "ok" ? undefined : "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function action(run: () => Promise<void>, success: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await run();
      setMessage(success);
      toast(success);
    } catch {
      const dicho =
        "No se pudo completar la operación. Revisa la conexión o vuelve a iniciar sesión.";
      setError(dicho);
      toast(dicho, "error");
    } finally {
      setBusy(false);
    }
  }
  /* Hay algo que guardar cuando el nombre o el avatar de la pantalla ya no son
     los que están guardados. Mientras no lo haya, el botón no existe: un botón
     permanentemente deshabilitado no informa de nada. */
  const dirty =
    (name.trim() !== savedName.trim() && name.trim().length > 0) ||
    avatar !== session.avatar;
  return (
    <section className="panel account account-live">
      <span className="eyebrow">TU ESPACIO PERSONAL</span>
      <h1>Mi cuenta</h1>
      {!ready ? (
        <p role="status">Comprobando tu sesión…</p>
      ) : user ? (
        <>
          {/* El perfil se edita donde se ve: el avatar se toca para cambiarlo
              y el nombre lleva su lápiz al lado. Antes había una ficha arriba
              para mirar y un formulario aparte para lo mismo, con un botón de
              guardar siempre presente aunque no hubiera nada que guardar. */}
          <div className="account-identity">
            <button
              type="button"
              className="avatar-change"
              onClick={() => setPicking(true)}
              aria-label="Cambiar tu avatar"
            >
              <span className="avatar large">
                <AvatarMark avatar={avatar} size={34} />
              </span>
              <span className="avatar-change-mark" aria-hidden="true">
                <Camera size={14} />
              </span>
            </button>
            {editing ? (
              <form
                className="name-edit"
                onSubmit={(e) => {
                  e.preventDefault();
                  setEditing(false);
                }}
              >
                <label className="field-label">
                  Nombre para mostrar
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    minLength={2}
                    maxLength={80}
                    required
                    autoFocus
                    autoComplete="name"
                  />
                </label>
              </form>
            ) : (
              <h2 className="name-view">
                {name.trim() || "Mi perfil"}
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Editar tu nombre"
                  onClick={() => setEditing(true)}
                >
                  <Pencil size={15} />
                </button>
              </h2>
            )}
            {/* HU-16.3: el correo se muestra, nunca se edita desde aquí. */}
            <p>{user.email}</p>
            {/* Verificar el correo ayuda a recuperar la cuenta, pero no cierra
                el paso: en el río hay quien no vuelve a abrir ese buzón. */}
            <span className="tag">
              {user.emailVerified
                ? "Correo verificado"
                : "Correo sin verificar · opcional"}
            </span>
          </div>
          {/* Solo cuando hay algo distinto que guardar. */}
          {dirty && (
            <button
              className="btn primary"
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  const displayName = name.trim();
                  if (displayName.length < 2 || displayName.length > 80)
                    throw new Error("invalid-name");
                  if (displayName !== savedName) {
                    await updateProfile(user, { displayName });
                    updateSession({ name: displayName });
                  }
                  if (avatar !== session.avatar) {
                    const { headers } = await memberHeaders();
                    const response = await fetch("/api/account/avatar/", {
                      method: "PATCH",
                      headers,
                      body: JSON.stringify({ avatar }),
                      signal: AbortSignal.timeout(20000),
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error);
                    updateSession({ avatar });
                  }
                  setEditing(false);
                }, "Tu perfil se guardó y ya aparece en toda la aplicación.")
              }
            >
              Guardar perfil
            </button>
          )}
          {picking && (
            <AvatarPicker
              value={avatar}
              onPick={(chosen) => {
                picked.current = true;
                setAvatar(chosen);
              }}
              onClose={() => setPicking(false)}
            />
          )}
          {session.passwordProvider && <PasswordChange user={user} />}
          {/* HU-19.1: la eliminación es una opción del rol ciudadano. */}
          {session.admin ? (
            <p className="notice">
              Las cuentas del Consejo no se eliminan desde la aplicación. El
              retiro de un administrador se tramita con el procedimiento
              documentado del Consejo Comunitario.
            </p>
          ) : (
            <DeleteAccount user={user} />
          )}
          <div className="account-actions">
            {/* Solo cuando hace falta. El perfil se activa solo al entrar; que
                el botón estuviera siempre hacía dudar de si había que pulsarlo. */}
            {membership === "inactiva" && (
              <button
                className="btn"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await user.reload();
                    const token = await user.getIdToken(true);
                    const response = await fetch("/api/account/activate/", {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}` },
                      signal: AbortSignal.timeout(15000),
                    });
                    if (!response.ok) throw new Error("activation-failed");
                    setMembership("activa");
                  }, "Tu perfil ciudadano está activo. Ya puedes enviar reportes al Consejo.")
                }
              >
                Activar mi perfil
              </button>
            )}
            {/* Con Google, el correo ya viene comprobado por Google y la
                contraseña se gestiona allí: ofrecer aquí esas dos cosas es
                ofrecer lo que no se puede hacer. */}
            {session.passwordProvider && !user.emailVerified && (
              <button
                className="btn"
                disabled={busy}
                onClick={() =>
                  void action(
                    () => sendEmailVerification(user),
                    "Revisa tu correo para verificar tu cuenta.",
                  )
                }
              >
                <ShieldCheck size={18} />
                Verificar correo
              </button>
            )}
            {session.passwordProvider && (
              <button
                className="btn"
                disabled={busy || !user.email}
                onClick={() =>
                  void action(
                    () =>
                      sendPasswordResetEmail(
                        firebaseClient().auth,
                        user.email!,
                      ),
                    "Solicitud de cambio de contraseña enviada.",
                  )
                }
              >
                Cambiar contraseña
              </button>
            )}
            <button
              className="btn"
              disabled={busy}
              onClick={() =>
                void action(
                  () => cerrarSesion(),
                  "La sesión se cerró en este dispositivo.",
                )
              }
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </>
      ) : (
        <div className="account-empty">
          <UserRound size={36} />
          <h2>Accede a tu espacio</h2>
          <p>
            Inicia sesión para editar tu perfil y gestionar la seguridad de tu
            cuenta.
          </p>
          <Link href="/acceso/" className="btn primary">
            Iniciar sesión
          </Link>
        </div>
      )}
      {error && (
        <p className="errors" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <button className="account-row" onClick={onTheme}>
        <span>{dark ? <Moon size={20} /> : <Sun size={20} />}Apariencia</span>
        <strong>{dark ? "Oscuro" : "Claro"}</strong>
      </button>
      {/* Solo donde puede funcionar: ver el comentario de `avisos` arriba. */}
      {avisos !== null && (
        <button
          className="account-row"
          disabled={busy}
          onClick={() => void cambiarAvisos()}
        >
          <span>
            {avisos ? <Bell size={20} /> : <BellOff size={20} />}
            Avisos en este dispositivo
          </span>
          <strong>{avisos ? "Activados" : "Desactivados"}</strong>
        </button>
      )}
      {/* Los otros dos permisos. **Se piden aquí**: la fila se pulsa y sale la
          ventana del sistema. Antes solo contaban en qué habían quedado y un
          párrafo fijo remitía a los ajustes, que es mandar a alguien fuera de
          la aplicación para algo que se resuelve con un toque.

          Concedido no es un botón: no hay nada que pulsar, y un control que no
          puede hacer nada es peor que no tenerlo. */}
      {[
        ["Micrófono para dictar", microfono, "microfono"] as const,
        ["Ubicación para tus reportes", ubicacion, "ubicacion"] as const,
      ].map(([rotulo, estado, cual]) => {
        if (estado === null || estado === "no-aplica") return null;
        const nombre = (
          <span>
            {cual === "microfono" ? <Mic size={20} /> : <Crosshair size={20} />}
            {rotulo}
          </span>
        );
        const guardar = (nuevo: Estado) =>
          cual === "microfono" ? setMicrofono(nuevo) : setUbicacion(nuevo);

        if (estado === "concedido")
          return (
            <div className="account-row account-permiso" key={rotulo}>
              {nombre}
              {/* Una palabra, y corta.

                  Aquí estuvo «Solo mientras usas la app» —que es lo que Android
                  concede de verdad, porque el permiso de segundo plano no está
                  en el manifiesto y no va a estarlo— y en un teléfono de 360 px
                  no cabía al lado de su rótulo: la fila se partía en dos
                  renglones y quedaba desparejada con la de al lado. Esa
                  salvedad la dice el propio diálogo de Android al concederlo,
                  que es donde se decide. */}
              <strong>Concedido</strong>
            </div>
          );

        return (
          <button
            className="account-row account-permiso"
            key={rotulo}
            onClick={() => {
              /* Negado: el sistema ya no vuelve a preguntar por mucho que se
                 pulse. En vez de no hacer nada —que se lee como una avería—
                 se dice dónde se cambia, y se dice **al pulsar**, no en un
                 párrafo que está siempre ahí. */
              if (estado === "negado")
                return void abrirAjustes().then((abrio) => {
                  /* En el teléfono se abre la pantalla de permisos y ya está.
                     Recitar «Ajustes › Aplicaciones › Mi Pueblo Digital ›
                     Permisos» es mandar a alguien a buscar por su cuenta algo
                     que se abre de un toque. El camino dicho queda para el
                     navegador, donde no hay nada que abrir. */
                  if (!abrio)
                    /* No es un «hecho»: es un permiso que no se consiguió y
                       que hay que ir a arreglar. Con el tono de fallo además
                       se queda el doble de tiempo en pantalla, que es lo que
                       hace falta para leer un camino y seguirlo. */
                    toast(
                      `Ya se le dijo que no a este permiso, y desde aquí no se puede volver a pedir. Se cambia en ${dondeSeArregla()}`,
                      "error",
                    );
                });
              void pedir(cual).then((nuevo) => {
                guardar(nuevo);
                if (nuevo === "negado")
                  toast(
                    `Sin este permiso no se puede. Si cambias de idea, se activa en ${dondeSeArregla()}`,
                    "error",
                  );
              });
            }}
          >
            {nombre}
            <strong>{estado === "negado" ? "Bloqueado" : "Activar"}</strong>
          </button>
        );
      })}
      <Link className="account-row" href="/mis-reportes/">
        <span>Mis reportes</span>
        <ArrowUpRight size={16} />
      </Link>
      {/* La guía cierra la tarjeta apoyada en la palma. Era una fila más, y el
          mismo destino volvía a aparecer al pie de la página; aquí la filigrana
          deja de ser relleno de esquina y sostiene la única salida que tiene
          esta pantalla. */}
      <Link className="account-guide" href="/documentacion/">
        <BookOpen size={19} />
        <span>
          <strong>Cómo funciona</strong>
          <small>Privacidad, ayuda y mantenimiento</small>
        </span>
        <ArrowUpRight size={17} />
      </Link>
    </section>
  );
}
