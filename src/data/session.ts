"use client";
import { onIdTokenChanged, type User } from "firebase/auth";
import { useSyncExternalStore } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firebaseClient } from "./firebase/client";

/**
 * Una sola suscripción de identidad para toda la aplicación. Antes cada
 * funcionalidad abría la suya y pedía su propio token; el shell no sabía quién
 * había iniciado sesión y mostraba un perfil de demostración fijo.
 */
export type Session = {
  /** Falso hasta que el proveedor responde por primera vez. */
  ready: boolean;
  /** Falso cuando la compilación no tiene credenciales de Firebase. */
  configured: boolean;
  uid: string | null;
  name: string;
  email: string;
  emailVerified: boolean;
  admin: boolean;
  avatar: string;
  passwordProvider: boolean;
  googleProvider: boolean;
  /**
   * Cuándo volvió a abrirse esta cuenta, si es que estuvo cerrada.
   *
   * Quien pidió eliminar su cuenta y el Consejo se la restableció entra a una
   * cuenta **vacía**: sus reportes se anonimizaron y eso no se deshace. Sin
   * decirlo, eso parece una avería. Con esta fecha, la portada lo explica una
   * vez. Nulo en el caso normal, que es el de todo el mundo.
   */
  restoredAt: string | null;
};

export const avatars = ["person", "tree", "river", "home"] as const;

const signedOut: Session = {
  ready: false,
  configured: true,
  uid: null,
  name: "",
  email: "",
  emailVerified: false,
  admin: false,
  avatar: "person",
  passwordProvider: false,
  googleProvider: false,
  restoredAt: null,
};

let current: Session = signedOut;
let started = false;
const listeners = new Set<() => void>();

function publish(next: Session) {
  current = next;
  for (const listener of listeners) listener();
}

/**
 * El avatar y el nombre viven en Firestore; se recuerdan por cuenta para pintar
 * la barra lateral sin esperar a la red ni volver a pedirlos sin conexión.
 */
function rememberedAvatar(uid: string) {
  try {
    const saved = localStorage.getItem(`mpd-avatar:${uid}`);
    if (!saved) return "person";
    /* Una marca del catálogo o una fotografía ya preparada. Cualquier otra
       cosa guardada a mano en el navegador se descarta. */
    return avatars.includes(saved as (typeof avatars)[number]) ||
      saved.startsWith("data:image/webp;base64,")
      ? saved
      : "person";
  } catch {
    return "person";
  }
}

function remember(uid: string, avatar: string) {
  try {
    localStorage.setItem(`mpd-avatar:${uid}`, avatar);
  } catch {
    /* El modo privado puede rechazar el almacenamiento; no es un fallo de sesión. */
  }
}

async function describe(user: User): Promise<Session> {
  let admin = false;
  try {
    admin = (await user.getIdTokenResult()).claims.admin === true;
  } catch {
    /* Sin red se conserva el rol ciudadano, que es el menos privilegiado. */
  }
  /* El rol también puede constar en el documento de la cuenta. La
     reivindicación del token es la vía normal, pero tarda hasta una hora en
     renovarse: leyendo aquí, quien lo recibe lo ve en cuanto vuelve a abrir la
     aplicación, sin tener que cerrar sesión.
     Solo se lee la cuenta propia, que es lo único que las reglas permiten, y
     esas mismas reglas prohíben a cualquier cliente escribirla: el servidor
     vuelve a comprobarlo en cada operación, así que esto decide qué se
     muestra, nunca qué se puede hacer. */
  /* De la misma lectura sale si esta cuenta estuvo cerrada y el Consejo la
     reabrió, que es lo que explica en la portada por qué está vacía. Se lee
     siempre —también con la reivindicación puesta— porque ese dato no depende
     del rol, y atarlo a `!admin` sería dejarlo a merced de un `if` que está
     aquí por otro motivo. */
  let restoredAt: string | null = null;
  try {
    const { db } = firebaseClient();
    const account = (await getDoc(doc(db, "accounts", user.uid))).data();
    admin ||= account?.role === "admin";
    restoredAt =
      typeof account?.restoredAt === "string" ? account.restoredAt : null;
  } catch {
    /* Sin red, o sin permiso, sigue valiendo el rol ciudadano. */
  }
  return {
    ready: true,
    configured: true,
    uid: user.uid,
    name: user.displayName?.trim() || "",
    email: user.email || "",
    emailVerified: user.emailVerified,
    admin,
    avatar: rememberedAvatar(user.uid),
    passwordProvider: user.providerData.some(
      (p) => p.providerId === "password",
    ),
    googleProvider: user.providerData.some(
      (p) => p.providerId === "google.com",
    ),
    restoredAt,
  };
}

/**
 * El perfil ciudadano en el servidor.
 *
 * Registrarse crea la identidad, pero enviar un reporte exige además un
 * documento de cuenta activa. Eso se activaba pulsando un botón dentro de «Mi
 * cuenta», que nadie descubre: se registraba, se verificaba el correo, y al
 * enviar aparecía «La cuenta no está habilitada» sin decir qué hacer.
 *
 * Ahora se activa sola en cuanto hay identidad con el correo verificado. No es
 * decisión de nadie —el rol es siempre ciudadano y lo pone el servidor, que
 * ignora lo que mande el cliente—: es papeleo. Se recuerda por cuenta y
 * dispositivo para no repetir la petición en cada carga, y esa marca local no
 * concede nada: quien decide sigue siendo el servidor en cada operación.
 */
const ensuring = new Set<string>();

function alreadyMember(uid: string) {
  try {
    return localStorage.getItem(`mpd-member:${uid}`) === "1";
  } catch {
    return false;
  }
}

function rememberMember(uid: string) {
  try {
    localStorage.setItem(`mpd-member:${uid}`, "1");
  } catch {
    /* El modo privado puede rechazarlo; se reintentará, que es inofensivo. */
  }
}

async function ensureMembership(user: User) {
  if (ensuring.has(user.uid) || alreadyMember(user.uid)) return;
  ensuring.add(user.uid);
  try {
    /* El enlace de verificación no refresca una sesión ya abierta: sin volver
       a leer el usuario, el testigo sigue diciendo que falta verificar. */
    if (!user.emailVerified) await user.reload();
    if (!user.emailVerified) return;
    const token = await user.getIdToken(true);
    const response = await fetch("/api/account/activate/", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return;
    rememberMember(user.uid);
    if (current.uid === user.uid && !current.emailVerified)
      updateSession({ emailVerified: true });
  } catch {
    /* Sin red no pasa nada: se reintenta en la próxima carga, y «Mi cuenta»
       conserva el botón para repararlo a mano. */
  } finally {
    ensuring.delete(user.uid);
  }
}

function start() {
  if (started) return;
  started = true;
  let generation = 0;
  try {
    onIdTokenChanged(
      firebaseClient().auth,
      (user) => {
        const mine = ++generation;
        if (!user) {
          publish({ ...signedOut, ready: true });
          return;
        }
        void describe(user).then((session) => {
          if (mine === generation) publish(session);
        });
        void ensureMembership(user);
      },
      () => publish({ ...signedOut, ready: true }),
    );
  } catch {
    publish({ ...signedOut, ready: true, configured: false });
  }
}

export function subscribeSession(callback: () => void) {
  listeners.add(callback);
  start();
  return () => {
    listeners.delete(callback);
  };
}

export const getSession = () => current;
export const getServerSession = () => signedOut;

export function useSession(): Session {
  return useSyncExternalStore(subscribeSession, getSession, getServerSession);
}

/** Refleja de inmediato un cambio guardado en el servidor, sin recargar la sesión. */
export function updateSession(patch: Partial<Session>) {
  if (!current.uid) return;
  if (patch.avatar) remember(current.uid, patch.avatar);
  publish({ ...current, ...patch });
}
