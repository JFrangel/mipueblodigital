import type { Case } from "../../src/data/catalog";

/**
 * Expedientes de muestra para las pruebas.
 *
 * Viven aquí y no en la aplicación a propósito: el producto no debe llevar
 * reportes fabricados: quien lo abre vería incidencias inventadas como si
 * fueran de su territorio. Las pruebas sí los necesitan, y este es su sitio.
 */
export const sampleCase = (over: Partial<Case> = {}): Case => ({
  id: "MPD-0248",
  title: "Alumbrado en el malecón",
  category: "infraestructura",
  status: "en_proceso",
  vereda: "Bocas de Satinga",
  date: "2026-09-06T14:00:00Z",
  description:
    "La luminaria del malecón no enciende. La comunidad solicita una revisión.",
  lat: 2.347,
  lng: -78.325,
  owner: "propio",
  notes: ["Reporte registrado para seguimiento."],
  ...over,
});

/**
 * Un puñado con estados, veredas y categorías distintos.
 *
 * La variedad no es adorno: sostiene las pruebas de las insignias de estado, el
 * reparto por categoría y el orden de la tabla por casos abiertos. Quitar uno
 * deja alguna de esas comprobaciones sin nada que mirar.
 */
export const sampleCases = (): Case[] =>
  [
    { id: "MPD-0248", title: "Alumbrado en el malecón", status: "en_proceso" },
    {
      id: "MPD-0247",
      title: "Deterioro del muelle comunitario",
      status: "pendiente",
      vereda: "Alto Satinga",
    },
    {
      id: "MPD-0246",
      title: "Residuos en la ribera",
      status: "solucionado",
      vereda: "Bajo Satinga",
      category: "recursos_naturales",
    },
    {
      id: "MPD-0245",
      title: "Interrupción del servicio de agua",
      status: "pendiente",
      vereda: "Vuelta Larga",
    },
    {
      id: "MPD-0244",
      title: "Afectación del bosque",
      status: "escalado",
      vereda: "Bocas de Satinga",
      category: "conflictos_territoriales",
    },
  ].map((over, i) =>
    sampleCase({ ...over, date: `2026-09-0${6 - i}T14:00:00Z` }),
  );
