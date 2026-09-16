"use client";
import { useEffect, useRef, useState } from "react";
import { Upload, X, Check } from "lucide-react";
import { avatars } from "@/data/session";
import { prepareAvatar } from "@/platform/avatar";
import { AvatarMark } from "@/components/ui";

const labels: Record<string, string> = {
  person: "Persona",
  tree: "Árbol",
  river: "Río",
  home: "Hogar",
};

/**
 * Elegir avatar: las marcas del territorio o una fotografía propia.
 *
 * Se abre tocando el avatar, que es donde se busca cambiarlo, y no guarda nada
 * por su cuenta: devuelve la elección y es «Guardar perfil» quien la confirma
 * junto con el nombre. Así una sola decisión se confirma una sola vez.
 *
 * La fotografía se recorta y reduce en el propio teléfono antes de salir: lo
 * que viaja son unos treinta kilobytes, no los ocho megas del carrete.
 */
export function AvatarPicker({
  value,
  onPick,
  onClose,
}: {
  value: string;
  onPick: (avatar: string) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  /* Escape cierra, y el foco entra en el diálogo: es lo que espera quien no
     usa el ratón. */
  useEffect(() => {
    dialog.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  async function upload(files: FileList | null) {
    const chosen = files?.[0];
    if (!chosen) return;
    setBusy(true);
    setError("");
    try {
      onPick(await prepareAvatar(chosen));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo usar esa imagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="pop-shade" aria-label="Cerrar" onClick={onClose} />
      <div
        className="panel avatar-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Elegir avatar"
        tabIndex={-1}
        ref={dialog}
      >
        <div className="avatar-dialog-head">
          <h3>Tu avatar</h3>
          <button
            type="button"
            className="icon-button"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="avatar-options">
          {avatars.map((id) => (
            <button
              key={id}
              type="button"
              className="btn"
              aria-pressed={value === id}
              disabled={busy}
              onClick={() => {
                onPick(id);
                onClose();
              }}
            >
              <AvatarMark avatar={id} size={24} />
              {labels[id]}
              {value === id && <Check size={15} />}
            </button>
          ))}
        </div>
        <label className="btn avatar-upload">
          <Upload size={17} />
          {busy ? "Preparando…" : "Subir una foto"}
          <input
            ref={file}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => void upload(e.target.files)}
          />
        </label>
        <small>
          Se recorta en cuadrado y se reduce en este dispositivo antes de
          guardarla. La verán quienes vean tu perfil.
        </small>
        {error && (
          <p className="errors" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
