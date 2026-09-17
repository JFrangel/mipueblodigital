"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User,
} from "firebase/auth";
import { cerrarSesion } from "@/platform/native";
import { toast } from "@/data/toasts";
import { outgoingFor } from "@/data/outbox";
import { AlertTriangle } from "lucide-react";

/** HU-19.3: frase exacta que confirma la intención antes de habilitar el botón. */
const PHRASE = "ELIMINAR MI CUENTA";

export function DeleteAccount({ user }: { user: User }) {
  const router = useRouter();
  const [password, setPassword] = useState(""),
    [phrase, setPhrase] = useState(""),
    [confirmation, setConfirmation] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false);
  const passwordProvider = user.providerData.some(
    (p) => p.providerId === "password",
  );
  const ready =
    confirmation &&
    phrase.trim().toLocaleUpperCase("es") === PHRASE &&
    (!passwordProvider || password.length > 0);
  async function request(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if ((await outgoingFor(user.uid)).some((i) => i.state !== "confirmed"))
        throw new Error(
          "Primero revisa tus envíos pendientes. La cuenta desactivada no podrá sincronizarlos.",
        );
      if (passwordProvider && user.email)
        await reauthenticateWithCredential(
          user,
          EmailAuthProvider.credential(user.email, password),
        );
      else if (user.providerData.some((p) => p.providerId === "google.com"))
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      else
        throw new Error(
          "Tu método de acceso requiere asistencia para reautenticarte.",
        );
      setPassword("");
      const token = await user.getIdToken(true);
      const response = await fetch("/api/account/deletion/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(60000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage(data.message);
      setDone(true);
      // HU-19.6: cerrar sesión y devolver a la pantalla de acceso. El resultado
      // viaja en la dirección porque esta pantalla desaparece al cerrar sesión.
      await cerrarSesion().catch(() => undefined);
      router.push(`/acceso/?cuenta=${data.complete ? "eliminada" : "parcial"}`);
    } catch (error) {
      const dicho =
        error instanceof Error
          ? error.message
          : "No se pudo solicitar la eliminación.";
      setMessage(dicho);
      toast(dicho, "error");
    } finally {
      setPassword("");
      setBusy(false);
    }
  }
  return (
    <details className="writing-assistant delete-account">
      <summary>Eliminar mi cuenta</summary>
      <p className="errors" role="note">
        <AlertTriangle size={18} /> Esta acción no se puede deshacer. Perderás
        el acceso, se borrarán las fotografías originales que enviaste y tus
        expedientes quedarán sin ningún dato que te identifique. El Consejo
        conservará categoría, vereda, estado y fechas para la trazabilidad
        comunitaria.
      </p>
      {done ? (
        <p role="status">{message}</p>
      ) : (
        <form onSubmit={request}>
          {passwordProvider && (
            <label className="field-label">
              Contraseña actual
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          <label className="field-label">
            Escribe <strong>{PHRASE}</strong> para confirmar
            <input
              value={phrase}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setPhrase(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={confirmation}
              onChange={(e) => setConfirmation(e.target.checked)}
            />{" "}
            Entiendo que perderé el acceso y solicito la eliminación.
          </label>
          <p>
            <button className="btn" disabled={!ready || busy}>
              {busy
                ? "Eliminando cuenta…"
                : "Eliminar mi cuenta definitivamente"}
            </button>
          </p>
          {message && <p role="alert">{message}</p>}
        </form>
      )}
    </details>
  );
}
