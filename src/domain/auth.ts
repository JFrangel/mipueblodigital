export function registrationError(
  name: string,
  password: string,
  confirmation: string,
) {
  if (name.trim().length < 2 || name.trim().length > 80)
    return "Escribe un nombre de entre 2 y 80 caracteres.";
  if (password.length < 12)
    return "Usa una contraseña de al menos 12 caracteres.";
  if (password !== confirmation) return "Las contraseñas no coinciden.";
  return null;
}
export function authError(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const messages: Record<string, string> = {
    "auth/popup-blocked":
      "El navegador bloqueó la ventana de Google. Permite ventanas emergentes para este sitio y vuelve a intentarlo.",
    "auth/popup-closed-by-user":
      "Se cerró el acceso con Google. Puedes intentarlo de nuevo.",
    "auth/unauthorized-domain":
      "El dominio de esta app aún no está autorizado para acceder con Google.",
    "auth/operation-not-allowed":
      "Este método de acceso aún no está habilitado en el servicio.",
    "auth/network-request-failed":
      "No se pudo conectar. Revisa tu conexión y vuelve a intentarlo.",
    "auth/too-many-requests":
      "Hay demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
    /**
     * Quien pidió eliminar su cuenta y cambió de idea.
     *
     * Sin esta entrada caía en el texto de reserva de abajo, que le echa la
     * culpa a sus datos y la manda a recuperar la contraseña: un correo que sí
     * llega, un formulario que sí funciona y una puerta que sigue cerrada.
     *
     * **Y sí, decirlo revela que esa cuenta existe.** Pero el código lo manda
     * el servicio de identidad y viaja en la respuesta: cualquiera que mire la
     * red lo lee igual, diga lo que diga esta pantalla. Callarlo no esconde
     * nada de quien sabe buscarlo; solo deja a ciegas a la persona a la que
     * esto le está pasando de verdad.
     *
     * Lo cual **no** vale para `auth/email-already-in-use`, que se lleva el
     * texto de reserva a propósito: ese sale del formulario de registro, donde
     * cualquiera puede teclear el correo de otra persona sin saber nada de
     * ella. Ahí un mensaje distinto sí abre una puerta que no existía, y por
     * eso `tests/unit/auth.test.ts` exige que diga lo mismo que un correo
     * desconocido.
     */
    "auth/user-disabled":
      "Esta cuenta está cerrada. Si quieres volver a usarla, acércate al Consejo Comunitario del Río Satinga y pide que te la restablezcan.",
    "auth/weak-password":
      "La contraseña no cumple los requisitos del servicio.",
    "auth/password-does-not-meet-requirements":
      "La contraseña no cumple los requisitos del servicio.",
    /* Lo lanza el acceso nativo de Android cuando Google elige la cuenta pero
       no devuelve con qué firmar. Ver src/platform/native.ts. */
    "mpd/sin-credencial-google":
      "Google no entregó los datos de la cuenta. Vuelve a intentarlo; si sigue igual, entra con tu correo y contraseña.",
  };
  return (
    messages[code] ||
    "No se pudo completar el acceso. Revisa tus datos o recupera tu contraseña."
  );
}
