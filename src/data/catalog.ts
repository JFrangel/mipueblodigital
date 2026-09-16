/**
 * Catálogos del dominio y tipo del expediente: estados, categorías y veredas.
 *
 * Se llamó `demo.ts` mientras guardaba doce reportes fabricados que poblaban el
 * mapa, las estadísticas y el historial. Se fueron —en producción un vecino los
 * leía como incidencias de su propio territorio— y el nombre se quedó, diciendo
 * de la aplicación algo que ya no era verdad en veinticinco importaciones.
 *
 * Aquí no vive ningún reporte. Hubo doce fabricados que poblaban el mapa,
 * las estadísticas y el historial; servían para enseñar la aplicación vacía,
 * pero en producción un vecino los veía como incidencias de su propio
 * territorio. Lo que se muestra ahora es lo que la comunidad reportó de
 * verdad: nada, hasta que alguien reporte.
 *
 * Las pruebas construyen sus propios casos en tests/fixtures.
 */
export type Case = {
  version?: number;
  assignee?: string;
  events?: import("../domain/admin").CaseEvent[];
  id: string;
  title: string;
  category: string;
  status: string;
  vereda: string;
  date: string;
  description: string;
  /* Sin punto documentado ni marcado a mano, el expediente viaja solo con el
     nombre de su vereda. No se rellena con el casco urbano: eso pondría en el
     mapa una ubicación que nadie declaró. */
  lat?: number;
  lng?: number;
  owner: string;
  /**
   * La cuenta que lo guardó en este aparato.
   *
   * Sin esto, el almacén del dispositivo era de todos: quien entrara después
   * en el mismo teléfono veía en «Mis reportes» los de quien estuvo antes, con
   * su relato y su fotografía. En un territorio donde el teléfono se presta,
   * eso no es un detalle.
   *
   * Vacío en los registros anteriores a esta versión; los reclama la primera
   * cuenta que entre, que es casi siempre quien los escribió.
   */
  account?: string;
  notes: string[];
  photo?: string;
  /* En qué punto del camino va: enviado y con recibo, esperando señal en la
     bandeja de salida, o guardado sin haber salido nunca. Ver domain/delivery,
     que también sabe leer los registros anteriores a esta marca. */
  delivery?: import("../domain/delivery").Delivery;
};
export const categories = [
  {
    id: "infraestructura",
    name: "Infraestructura",
    description: "Alumbrado, vías, agua y muelles",
  },
  {
    id: "recursos_naturales",
    name: "Ambiente",
    description: "Bosques, agua y recursos naturales",
  },
  {
    id: "conflictos_territoriales",
    name: "Territorio",
    description: "Uso y delimitación del territorio",
  },
  {
    id: "socioeconomicos",
    name: "Comunidad",
    description: "Necesidades sociales y económicas",
  },
  { id: "otro", name: "Otro", description: "Una situación diferente" },
];
export const statuses: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  solucionado: "Solucionado",
  no_solucionado: "No solucionado",
  descartado: "Descartado",
  bloqueado_conflicto: "Bloqueado por conflicto",
  escalado: "Escalado a otra entidad",
};
export const veredas = [
  "Bocas de Satinga",
  "Alto Satinga",
  "Bajo Satinga",
  "Vuelta Larga",
];
export const shortDate = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
