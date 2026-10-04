import type { CouncilSourceId } from "./council-history";

/**
 * Lo que dicen las normas y las sentencias sobre un Consejo Comunitario, en
 * lenguaje llano. Cada afirmación se contrastó con el texto de su fuente el 3
 * de octubre de 2026 (véase docs/investigacion-consejo-rio-satinga.md). Es un
 * resumen informativo, no asesoría jurídica.
 */
export type GuideCard = {
  title: string;
  text: string;
  reference: string;
  sources: readonly CouncilSourceId[];
};

export const councilOrganization: readonly GuideCard[] = [
  {
    title: "Asamblea General",
    text: "Es la máxima autoridad y la forman las personas que el Consejo reconoce según su derecho propio. Elige y revoca a la Junta, aprueba los planes de desarrollo y fija el régimen de inhabilidades, incompatibilidades y disciplina de la Junta.",
    reference: "Decreto 1745 de 1995, arts. 4 y 6",
    sources: ["decree1745"],
  },
  {
    title: "Junta del Consejo",
    text: "Es la autoridad de dirección, coordinación, ejecución y administración interna. Prepara el informe de titulación, protege la propiedad colectiva, asigna áreas de uso y lleva el archivo comunitario y los libros de actas.",
    reference: "Decreto 1745 de 1995, arts. 7 y 11",
    sources: ["decree1745"],
  },
  {
    title: "Representante legal",
    text: "Representa a la comunidad como persona jurídica: presenta las solicitudes de titulación, tramita ante las autoridades las de aprovechamiento de recursos naturales y celebra convenios y contratos con aprobación previa de la Junta.",
    reference: "Decreto 1745 de 1995, art. 12",
    sources: ["decree1745"],
  },
  {
    title: "Elección y registro",
    text: "La Junta se elige por tres años, en la primera quincena de diciembre, por consenso o, si no lo hay, por mayoría, y se puede reelegir una sola vez seguida. El acta se presenta al alcalde, que la registra en máximo cinco días. Quien se postula debe pertenecer a la comunidad negra, ser nativo o residir en ella de forma permanente desde hace diez años, no ocupar cargo público (salvo la docencia) y ser mayor de edad.",
    reference: "Decreto 1745 de 1995, arts. 8 a 10",
    sources: ["decree1745"],
  },
];

export const councilRights: readonly GuideCard[] = [
  {
    title: "Propiedad colectiva",
    text: "La parte de la tierra de la comunidad negra destinada a su uso colectivo es inalienable, imprescriptible e inembargable.",
    reference: "Ley 70 de 1993, art. 7",
    sources: ["law70"],
  },
  {
    title: "Ser consultado",
    text: "El Convenio 169 obliga a consultar a los pueblos «mediante procedimientos apropiados y en particular a través de sus instituciones representativas» cuando se prevean medidas que puedan afectarles directamente. La Corte Constitucional lo ha aplicado a comunidades negras: en la T-955 de 2003, por una explotación forestal en territorio colectivo sin consulta, y en la T-576 de 2014, que reconoce la consulta como derecho fundamental colectivo.",
    reference:
      "Ley 21 de 1991, art. 6; sentencias T-955 de 2003 y T-576 de 2014",
    sources: ["convention169", "t955", "t576"],
  },
  {
    title: "Decidir el desarrollo y poseer la tierra",
    text: "El Convenio 169 reconoce a los pueblos el derecho a «decidir sus propias prioridades» en su proceso de desarrollo (art. 7) y «el derecho de propiedad y de posesión sobre las tierras que tradicionalmente ocupan» (art. 14).",
    reference: "Ley 21 de 1991, arts. 7 y 14",
    sources: ["convention169"],
  },
  {
    title: "Identidad sin título",
    text: "La Corte dijo en la T-576 de 2014 que la autoidentificación es el criterio más relevante para reconocer a un pueblo étnico, y que la relación con un territorio indica la identidad pero no la determina. Quedarse sin título por el desplazamiento o por fallas institucionales no hace perder derechos étnicos.",
    reference: "Sentencia T-576 de 2014",
    sources: ["t576"],
  },
  {
    title: "Participar en la planeación",
    text: "La Ley 70 creó una Comisión Consultiva de Alto Nivel con representantes de las comunidades negras de varias regiones, entre ellas Nariño, para dar seguimiento a la aplicación de la ley.",
    reference: "Ley 70 de 1993, art. 45",
    sources: ["law70"],
  },
  {
    title: "Si hay desplazamiento",
    text: "El Auto 005 de 2009, dentro del seguimiento de la sentencia T-025 de 2004, exige medidas diferenciales para la población afrodescendiente desplazada y advierte el riesgo para los derechos territoriales colectivos de sus comunidades. El Auto 073 de 2014 recoge la ruta étnica de protección colectiva que, en 2009, incluyó al Gran Consejo del Río Satinga.",
    reference: "Autos 005 de 2009 y 073 de 2014",
    sources: ["auto005", "protection"],
  },
  {
    title: "Reparación a las víctimas",
    text: "El Decreto Ley 4635 de 2011 reconoce como víctimas, como sujetos colectivos, a las comunidades negras, afrocolombianas, raizales y palenqueras y a sus miembros por hechos ocurridos desde el 1 de enero de 1985, y establece medidas de asistencia, atención, reparación integral y restitución de tierras.",
    reference: "Decreto Ley 4635 de 2011",
    sources: ["decree4635"],
  },
  {
    title: "Avalar a sus docentes",
    text: "El Consejo concede el aval de reconocimiento cultural para nombrar docentes de la población afro en su territorio. En la SU-011 de 2018 la Corte explicó que ese aval no es absoluto: la negativa debe tener fundamento y razones objetivas, y el aval no funciona como un veto.",
    reference: "Sentencia SU-011 de 2018",
    sources: ["court"],
  },
];

export type TitledCouncil = {
  name: string;
  registeredAs?: string;
  act: string;
  date: string;
  hectares: string;
  current?: boolean;
};

/** Registro de títulos colectivos de la ANT, municipio 52490 (3 oct. 2026). */
export const titledCouncils: readonly TitledCouncil[] = [
  {
    name: "Consejo Comunitario del Río Satinga",
    registeredAs: "Gran Consejo Comunitario del Río Satinga",
    act: "Resolución 3292",
    date: "18 de diciembre de 2000",
    hectares: "24.507,04",
    current: true,
  },
  {
    name: "Consejo Comunitario del Río Sanquianga",
    act: "Resolución 2773",
    date: "21 de noviembre de 2000",
    hectares: "33.429,06",
  },
  {
    name: "Consejo Comunitario Gualmar",
    act: "Resolución 0399",
    date: "28 de abril de 2003",
    hectares: "5.787,73",
  },
];

export type GlossaryEntry = {
  term: string;
  definition: string;
  sources: readonly CouncilSourceId[];
};

export const councilGlossary: readonly GlossaryEntry[] = [
  {
    term: "Consejo Comunitario",
    definition:
      "La comunidad negra constituida como persona jurídica que ejerce la máxima autoridad de administración interna de sus tierras colectivas. Lo integran la Asamblea General y la Junta.",
    sources: ["decree1745"],
  },
  {
    term: "Comunidad negra",
    definition:
      "Conjunto de familias de ascendencia afrocolombiana que tienen una cultura propia, comparten una historia, tienen sus propias tradiciones y costumbres y conservan conciencia de identidad.",
    sources: ["law70"],
  },
  {
    term: "Ocupación colectiva",
    definition:
      "El asentamiento histórico y ancestral de comunidades negras en tierras de uso colectivo, que constituyen su hábitat y donde desarrollan sus prácticas tradicionales de producción.",
    sources: ["law70"],
  },
  {
    term: "Prácticas tradicionales de producción",
    definition:
      "Las actividades agrícolas, mineras, forestales, de caza, pesca y recolección que la comunidad usa por costumbre para su subsistencia y su desarrollo sostenible.",
    sources: ["law70"],
  },
  {
    term: "Título colectivo",
    definition:
      "El acto con el que el Estado reconoce la propiedad colectiva de una comunidad negra sobre las tierras baldías que ocupa tradicionalmente. En 2000 lo expedía el Incora; hoy la titulación colectiva la tramita la Agencia Nacional de Tierras.",
    sources: ["law70", "title", "antProcess"],
  },
  {
    term: "Consulta previa",
    definition:
      "El derecho de un pueblo a ser consultado, con procedimientos apropiados y por medio de sus instituciones representativas, antes de medidas legislativas o administrativas que puedan afectarle directamente.",
    sources: ["convention169"],
  },
  {
    term: "Concejo Municipal y Consejo Comunitario",
    definition:
      "El Concejo Municipal es la corporación del municipio. El Consejo Comunitario es la autoridad de una comunidad negra sobre su territorio colectivo. Son instituciones distintas.",
    sources: ["decree1745"],
  },
];

/** Lo que ninguna fuente pública resuelve y solo el archivo del Consejo puede aportar. */
export const councilPending: readonly string[] = [
  "El acta 002 de 1998 con la elección del representante y la solicitud de titulación del 7 de octubre de 1998.",
  "La copia auténtica de la Resolución 3292 de 2000, con sus linderos y su plano (B-615-515, según la ANT).",
  "El número y la fecha de la resolución de inscripción en el Ministerio del Interior, y el acta y la fecha de constitución del Consejo.",
  "El reglamento interno vigente, la composición actual de la Junta y quién es hoy el representante legal.",
  "La lista de comunidades y veredas del Consejo, con el número de familias de cada una.",
  "Las actas de Asamblea que el Consejo autorice publicar y la Resolución 752 de 2009 original.",
];
