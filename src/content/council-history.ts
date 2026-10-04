/** Resúmenes públicos, versionados y trazables. No son actas oficiales de la Junta. */
export const councilSources = {
  constitution: {
    label: "Constitución de 1991 · artículo transitorio 55",
    issuer: "Función Pública",
    url: "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=4125",
  },
  law70: {
    label: "Ley 70 de 1993",
    issuer: "Función Pública",
    url: "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=7388",
  },
  decree1745: {
    label: "Decreto 1745 de 1995",
    issuer: "Función Pública",
    url: "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=7389",
  },
  title: {
    label: "Resolución Incora 03292 · reproducción",
    issuer: "Diario Oficial, reproducido por vLex",
    url: "https://vlex.com.co/vid/resolucion-03292-43154281",
  },
  titleRegistry: {
    label: "Consejo Comunitario Titulado · registro de títulos colectivos",
    issuer: "Agencia Nacional de Tierras · datos abiertos",
    url: "https://data-agenciadetierras.opendata.arcgis.com/datasets/agenciadetierras::consejo-comunitario-titulado/about",
  },
  assembly: {
    label: "Acta de Asamblea del 2 de octubre de 2009",
    issuer: "Gran Consejo Comunitario · copia en anexo",
    url: "https://pacificolombia.org/wp-content/uploads/2016/05/0774587001301752331.pdf",
  },
  eot: {
    label: "EOT de Olaya Herrera, 2007",
    issuer: "Alcaldía · repositorio ESAP",
    url: "https://repositoriocdim.esap.edu.co/items/2a84a51e-08cb-4bf0-af7c-41481f352c05",
  },
  pdet: {
    label: "Pacto Municipal PDET de Olaya Herrera",
    issuer: "Agencia de Renovación del Territorio",
    url: "https://centralpdet.renovacionterritorio.gov.co/wp-content/uploads/Documentos/Pacifico%20y%20frontera/OLAYA%20HERRERA.pdf",
  },
  court: {
    label: "Sentencia SU-011 de 2018",
    issuer: "Corte Constitucional",
    url: "https://www.corteconstitucional.gov.co/relatoria/2018/SU011-18.htm",
  },
  protection: {
    label: "Auto 073 de 2014 · ruta étnica",
    issuer: "Corte Constitucional · Unidad para las Víctimas",
    url: "https://www.unidadvictimas.gov.co/wp-content/uploads/Documentos/Jurisprudencia/Auto_073_2014.pdf",
  },
  forestryPlan: {
    label: "Propuesta de forestería comunitaria · datos de 2017",
    issuer: "FAO · Ministerio de Ambiente",
    url: "https://www.minambiente.gov.co/wp-content/uploads/2022/04/1.-Manejo-forestal-sostenible-a-traves-de-la-foresteria-comunitaria-una-propuesta-tecnica-institucional-y-financiera-para-promover-en-Colombia.pdf",
  },
  educationTerritory: {
    label: "Las Marías, comunidad del río Satinga · guía de 2020",
    issuer: "Ministerio de Educación Nacional",
    url: "https://www.mineducacion.gov.co/portal/men/Publicaciones/Guias/360526:Las-Marias",
  },
  environment: {
    label: "Resolución 058 de 2024",
    issuer: "CORPONARIÑO",
    url: "https://corponarino.gov.co/wp-content/uploads/2024/03/RESOLUCION-058-EXP.-ACAP-009-15.pdf",
  },
} as const;

export type CouncilSourceId = keyof typeof councilSources;
export type CouncilPeriod = "origen" | "territorio" | "memoria";
export type CouncilMilestone = {
  date: string;
  title: string;
  account: string;
  period: CouncilPeriod;
  sources: readonly CouncilSourceId[];
  qualification?: string;
};

export const councilMilestones: readonly CouncilMilestone[] = [
  {
    date: "1991",
    title: "Un mandato constitucional",
    account:
      "El artículo transitorio 55 ordenó reconocer la propiedad colectiva de tierras rurales ribereñas ocupadas tradicionalmente y proteger la identidad cultural de las comunidades negras.",
    period: "origen",
    sources: ["constitution"],
  },
  {
    date: "1993",
    title: "La Ley 70 reconoce el derecho colectivo",
    account:
      "La ley desarrolló ese mandato y fijó el marco de propiedad colectiva, identidad cultural y participación. Dio cauce jurídico a procesos organizativos de las comunidades; no inventó su historia.",
    period: "origen",
    sources: ["law70"],
  },
  {
    date: "1995",
    title: "Reglas para Asamblea, Junta y titulación",
    account:
      "El Decreto 1745 definió la Asamblea como máxima autoridad y la Junta como órgano de dirección y administración interna; reguló además el trámite del título colectivo.",
    period: "origen",
    sources: ["decree1745"],
  },
  {
    date: "1998",
    title: "Organización y solicitud del título",
    account:
      "La Resolución 03292 reproduce una elección de representante en Asamblea del 26 de septiembre y una solicitud de titulación ante el Incora del 7 de octubre.",
    qualification:
      "Estas fechas documentan actuaciones; la fecha exacta de constitución requiere cotejar el acta original con el Consejo.",
    period: "origen",
    sources: ["title"],
  },
  {
    date: "1999",
    title: "La solicitud se hace pública y se estudia en campo",
    account:
      "El Incora aceptó estudiar la solicitud en septiembre. Publicó avisos, la difundió por radio y realizó una visita para documentar territorio, memoria cultural, población y prácticas productivas.",
    qualification:
      "El procedimiento se describe en una reproducción del acto de titulación; el expediente auténtico debe cotejarse con la autoridad custodio.",
    period: "origen",
    sources: ["title"],
  },
  {
    date: "2000",
    title: "Titulación colectiva del Río Satinga",
    account:
      "El Incora expidió la Resolución 03292 el 18 de diciembre y adjudicó 24.507,04 hectáreas al Gran Consejo Comunitario del Río Satinga, en Olaya Herrera. La cifra coincide con la del registro de títulos colectivos de la Agencia Nacional de Tierras.",
    qualification:
      "La extensión es la del acto histórico; no define por sí sola linderos digitales ni población actual. La reproducción del acto que se pudo consultar está incompleta: para linderos y condiciones hace falta la copia auténtica.",
    period: "territorio",
    sources: ["title", "titleRegistry"],
  },
  {
    date: "2007",
    title: "El ordenamiento municipal registra el territorio",
    account:
      "El Esquema de Ordenamiento Territorial de Olaya Herrera ofrece un registro administrativo del municipio y su contexto territorial en ese momento.",
    period: "memoria",
    sources: ["eot"],
  },
  {
    date: "2009",
    title: "La Asamblea se reúne en Las Marías",
    account:
      "Un documento del propio Consejo registra la Asamblea General del 2 de octubre para tratar asuntos que afectaban a las comunidades del río y dialogar con autoridades.",
    qualification:
      "El anexo trata asuntos sensibles. Aquí no se publican nombres ni testimonios personales.",
    period: "memoria",
    sources: ["assembly"],
  },
  {
    date: "2009",
    title: "Protección colectiva del territorio",
    account:
      "Un auto posterior de la Corte cita la Resolución 752 del 4 de noviembre de 2009 del Comité Territorial de Olaya Herrera, que incluyó al Gran Consejo del Río Satinga en una ruta étnica de protección.",
    qualification:
      "Es una referencia judicial a una medida de esa época; no certifica el estado actual de la ruta ni identifica personas protegidas.",
    period: "memoria",
    sources: ["protection"],
  },
  {
    date: "2017",
    title: "Un plan forestal en discusión",
    account:
      "Una propuesta técnica de forestería comunitaria incluyó estructurar y ejecutar un plan de manejo para el Gran Consejo, con datos suministrados al Ministerio de Ambiente en octubre de 2017.",
    qualification:
      "Es una inversión propuesta, sujeta a cambios; no demuestra financiación recibida ni ejecución.",
    period: "territorio",
    sources: ["forestryPlan"],
  },
  {
    date: "2018",
    title: "Autonomía y etnoeducación",
    account:
      "La Corte Constitucional examinó la participación del Gran Consejo de Río Satinga en avales culturales para docentes. Reconoció su papel, con deber de motivar decisiones y respetar el debido proceso.",
    qualification:
      "Es un precedente sobre un caso concreto, no el reglamento actual del Consejo.",
    period: "memoria",
    sources: ["court"],
  },
  {
    date: "2018",
    title: "Río Satinga en el pacto municipal PDET",
    account:
      "El pacto de Olaya Herrera nombra a Río Satinga, Gualmar y Sanquianga entre los consejos del municipio y recoge propuestas de planeación territorial de aquel proceso.",
    qualification:
      "El pacto no sustituye las prioridades que el Consejo defina hoy ni acredita por sí solo la ejecución de sus iniciativas. El enlace al documento no respondía al revisarlo el 3 de octubre de 2026; la referencia queda pendiente de reverificar.",
    period: "memoria",
    sources: ["pdet"],
  },
  {
    date: "2024",
    title: "Gestión de recursos naturales documentada",
    account:
      "CORPONARIÑO expidió la Resolución 058 sobre una fase de aprovechamiento forestal solicitada por el Consejo y volvió a identificar el título colectivo.",
    qualification:
      "El enlace al texto del acto no respondía al revisarlo el 3 de octubre de 2026; la referencia queda pendiente de reverificar con CORPONARIÑO.",
    period: "territorio",
    sources: ["environment"],
  },
];
