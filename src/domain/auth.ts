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
