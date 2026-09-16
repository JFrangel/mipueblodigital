"use client";
import { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  type User,
} from "firebase/auth";
import { authError } from "@/domain/auth";
import { toast } from "@/data/toasts";
export function PasswordChange({ user }: { user: User }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  if (!user.providerData.some((p) => p.providerId === "password"))
    return (
      <p>
        Tu acceso utiliza Google. Gestiona la contraseña desde tu cuenta de
        Google.
      </p>
    );
  return (
    <details className="password-change">
      <summary>Cambiar contraseña de forma segura</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setError("");
          setSuccess(false);
          if (next.length < 12 || next !== confirm || next === current) {
            setError(
              "Usa al menos 12 caracteres, distintos de la contraseña actual, y confirma que coinciden.",
            );
            return;
          }
          setBusy(true);
          try {
            await reauthenticateWithCredential(
              user,
              EmailAuthProvider.credential(user.email!, current),
            );
            await updatePassword(user, next);
            setCurrent("");
            setNext("");
            setConfirm("");
            setSuccess(true);
            toast("Tu contraseña se actualizó.");
          } catch (e) {
            const dicho = authError(e);
            setError(dicho);
            toast(dicho, "error");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field-label">
          Contraseña actual
          <input
            type="password"
            autoComplete="current-password"
            required
            disabled={busy}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label className="field-label">
          Nueva contraseña
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            disabled={busy}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </label>
        <label className="field-label">
          Repetir nueva contraseña
          <input
            type="password"
            autoComplete="new-password"
            required
            disabled={busy}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        <button className="btn primary" disabled={busy}>
          {busy ? "Actualizando…" : "Actualizar contraseña"}
        </button>
        {error && (
          <p className="errors" role="alert">
            {error}
          </p>
        )}
        {success && <p role="status">Tu contraseña se actualizó.</p>}
      </form>
    </details>
  );
}
