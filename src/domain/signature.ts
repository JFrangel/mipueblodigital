/**
 * Firma del Consejo al pie de un comunicado.
 *
 * Cada comunicado cierra con una frase de la comunidad, escrita a mano. No se
 * sortea en cada visita: se deriva del identificador del comunicado, así que
 * ese texto siempre firma ese documento —el que lo compartió y quien lo abre
 * ven lo mismo— y el servidor y el navegador dibujan lo mismo.
 */
export const councilSayings = [
  "Un pueblo más conectado",
  "Lo que se acuerda, se cumple",
  "La memoria se guarda entre todos",
  "Aquí la palabra queda escrita",
  "El territorio se cuida hablando",
  "Nuestra voz, nuestro registro",
  "Juntos sostenemos el territorio",
  "El río nos reúne",
  "Nadie conoce el territorio como quien lo habita",
  "Lo que se nombra, se defiende",
  "De la asamblea al papel",
  "Aquí se responde con hechos",
  "El territorio también se escribe",
  "Una comunidad que se entera, decide",
];

/** Lo que cabe en la firma: dos renglones a mano, no un párrafo. */
export const maxSayingLength = 60;

/** Reparto estable y bien distribuido a partir de una cadena cualquiera. */
export function sayingFor(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return councilSayings[Math.abs(hash) % councilSayings.length];
}
