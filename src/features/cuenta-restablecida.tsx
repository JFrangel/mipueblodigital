"use client";
import { useState } from "react";
import { DoorOpen, X } from "lucide-react";
import { useSession } from "@/data/session";

/**
 * Lo que ve quien pidió irse, cambió de idea y el Consejo volvió a abrirle la
 * puerta.
 *
 * Entra y su cuenta está **vacía**: cero reportes, sin retrato, sin bandeja.
 * Sin esta tarjeta eso parece una avería —la aplicación perdió mis cosas— y lo
 * que pasó es lo contrario: la aplicación cumplió lo que le prometió cuando
 * pidió eliminarla. Sus reportes se anonimizaron, la fotografía original se
 * borró del archivo y el relato se retiró. Nada de eso se deshace, y decirlo
 * aquí es la única manera de que no se lo tenga que explicar el Consejo de
 * viva voz a cada persona.
 *
 * Se cierra en este aparato y no vuelve a salir. No puede guardarse en el
 * servidor: las reglas de Firestore declaran `accounts/{uid}` como
 * `write: if false` —ningún cliente lo toca, y de ahí sale precisamente la
 * confianza de todo lo que esta aplicación decide por ese documento—, y abrir
 * un hueco en esa regla para esconder una tarjeta sería un precio absurdo.
 */
const visto = (uid: string, fecha: string) => `mpd-reapertura:${uid}:${fecha}`;

function yaLaVio(uid: string, fecha: string) {
  try {
    return localStorage.getItem(visto(uid, fecha)) === "1";
  } catch {
    /* Sin almacén la tarjeta sale cada vez. Es lo correcto de los dos errores
       posibles: repetir una explicación cansa, y no darla desconcierta. */
    return false;
  }
}

/** La fecha como se dice, sin el año: fue hace poco o no saldría esta tarjeta. */
function dicha(iso: string) {
  const cuando = new Date(iso);
  if (Number.isNaN(cuando.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
  }).format(cuando);
}

export function CuentaRestablecida() {
  const { uid, restoredAt } = useSession();
  const [cerrada, setCerrada] = useState(false);
  if (!uid || !restoredAt || cerrada || yaLaVio(uid, restoredAt)) return null;

  const cuando = dicha(restoredAt);

  return (
    <section className="panel cuenta-restablecida" role="status">
      <span className="acceso-icono">
        <DoorOpen size={22} />
      </span>
      <div>
        <h2>Tu cuenta volvió a abrirse</h2>
        <p>
          {cuando
            ? `El Consejo la restableció el ${cuando}. `
            : "El Consejo la restableció. "}
          Desde hoy puedes reportar otra vez con tu mismo correo.
        </p>
        {/* La parte que duele, dicha entera y no en letra pequeña. */}
        <p>
          Lo que reportaste antes sigue contando para el territorio, pero quedó
          anónimo cuando pediste eliminar la cuenta y eso no se deshace. Por eso
          esta cuenta empieza vacía.
        </p>
      </div>
      <button
        className="icon-button"
        aria-label="Entendido, cerrar este aviso"
        onClick={() => {
          setCerrada(true);
          try {
            localStorage.setItem(visto(uid, restoredAt), "1");
          } catch {
            /* Ver arriba: sin almacén, vuelve a salir. */
          }
        }}
      >
        <X size={18} />
      </button>
    </section>
  );
}
