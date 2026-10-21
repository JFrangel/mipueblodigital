import type { Manual } from "./manuales";

/**
 * El Manual del Consejo: para quien gestiona reportes, publica comunicados y
 * mira las cifras con una cuenta de administración.
 *
 * Es el único texto de este manual; la vista, el PDF y `docs/manual-consejo.md`
 * salen de aquí (ver `manuales.ts`).
 *
 * **Cómo mantenerlo.** Cada capítulo lleva encima un comentario «Verificado
 * contra» con los archivos donde se comprobó cada afirmación: cuando esos
 * archivos cambien, ese capítulo hay que volver a leerlo. Los rótulos entre
 * «guillemets» son los de la aplicación, tal cual; las cifras y los límites son
 * los del código y no se escriben de memoria. Aquí no van rutas de base de
 * datos, nombres de claves, variables de entorno, direcciones de la API ni
 * datos de nadie: este PDF se puede abrir por su dirección y no es secreto.
 */
export const manualConsejo: Manual = {
  id: "consejo",
  titulo: "Manual del Consejo",
  subtitulo:
    "Cómo gestionar reportes, comunicados y cifras en Mi Pueblo Digital",
  publico: "Para quien gestiona",
  fecha: "2026-10-21",
  formato: "A4",
  capitulos: [
    /* Verificado contra: src/server/admin-auth.ts:105-181 (cuenta activa y rol,
       por la sesión o por la cuenta); src/app/api/admin/roles/route.ts:12-145
       (salvaguardas y constancia); src/features/council-roles.tsx:35-38,
       212-326 (botones, etiquetas y avisos); src/data/session.ts:91,175-176 (el
       perfil se activa solo con el correo verificado);
       src/features/account.tsx:344-349,374 (cuentas del Consejo; «Activar mi
       perfil»); src/app/api/ai/reading/route.ts:27 (único uso que exige correo
       verificado); src/components/workspace.tsx:389-397 (entrada del menú). */
    {
      id: "quien-gestiona",
      titulo: "Quién gestiona y cómo se da el rol",
      resumen: "Qué hace falta para entrar al panel y cómo se da el rol.",
      icono: "llave",
      motivo: "palafito",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Para entrar al panel hacen falta una cuenta activa y el rol de administración. Aquí se explica quién lo da y qué evita que el Consejo se quede fuera.",
        },
        {
          tipo: "tarjetas",
          tarjetas: [
            {
              icono: "usuario",
              titulo: "Cuenta activa",
              texto:
                "Se activa sola al entrar, sin pedir el correo verificado; si no, con «Activar mi perfil» en «Mi cuenta».",
            },
            {
              icono: "llave",
              titulo: "Rol del Consejo",
              texto:
                "Lo da otra persona que ya lo tenga, desde «Quién administra».",
            },
            {
              icono: "correo",
              titulo: "Correo verificado",
              texto:
                "No hace falta para gestionar; solo lo exige «Redactar con IA para la asamblea».",
            },
          ],
        },
        {
          tipo: "pasos",
          titulo: "Dar el rol",
          pasos: [
            {
              texto: "Abre «Panel del Consejo» y entra a «Quién administra».",
              detalle:
                "Está en el menú lateral; en el teléfono, en el de la barra superior.",
            },
            {
              texto:
                "Busca la cuenta con «Buscar una cuenta» y pulsa «Hacer admin».",
            },
            {
              texto: "Pídele que cierre sesión y vuelva a entrar.",
              detalle:
                "Hasta que su sesión se renueve, hasta una hora, la aplicación la trata como ciudadana.",
            },
          ],
        },
        {
          tipo: "tabla",
          columnas: ["Salvaguarda", "Cómo funciona"],
          filas: [
            [
              "Solo a cuentas que ya entraron",
              "Si no está activa, que pulse «Activar mi perfil».",
            ],
            ["Nadie se quita el rol", "En tu fila no hay botón."],
            [
              "Nunca se quita al último",
              "«Retirar» se apaga si es la única cuenta con el rol.",
            ],
            [
              "Constancia",
              "Cada cambio queda con quién, sobre quién y cuándo.",
            ],
          ],
        },
        {
          tipo: "aviso",
          nivel: "ojo",
          titulo: "Retirar cierra sus sesiones",
          texto:
            "Al retirar el rol se cierran las sesiones abiertas de esa persona: en cuanto vuelva a entrar ya no tiene el panel. Comprueba que ya no aparece la etiqueta «Admin» junto a su nombre.",
        },
        {
          tipo: "aviso",
          nivel: "consejo",
          texto:
            "Procura que administren al menos dos cuentas. Quien mantiene el servicio también puede dar el rol desde fuera de la aplicación.",
        },
      ],
    },

    /* Verificado contra: src/features/council-panel.tsx:21-29 (siete
       pestañas, en este orden), 41-44 (se montan todas a la vez y se ocultan),
       180-182 («Territorio» solo se monta al abrirla);
       src/features/notifications.tsx:62-85 («Novedades del Consejo», «Marcar
       todas», «Ver el expediente»); src/app/api/notifications/route.ts
       (cincuenta avisos); src/data/notifications.ts (consulta cada 45 s con la
       aplicación a la vista). */
    {
      id: "panel",
      titulo: "El panel y sus siete pestañas",
      resumen: "Qué se hace en cada pestaña.",
      icono: "casa",
      motivo: "brujula",
      bloques: [
        {
          tipo: "texto",
          texto:
            "El «Panel del Consejo» reúne el trabajo en siete pestañas. Puedes pasar de una a otra sin perder lo que escribes.",
        },
        {
          tipo: "tabla",
          columnas: ["Pestaña", "Qué se hace"],
          filas: [
            [
              "«Expedientes»",
              "Revisar, gestionar y retirar reportes; aprobar su resumen público.",
            ],
            [
              "«Novedades»",
              "Bandeja compartida: reportes nuevos, cambios, retiradas y eliminaciones de cuenta. Las 50 más recientes.",
            ],
            [
              "«Comunicados»",
              "Redactar y publicar noticias, alertas y encuentros.",
            ],
            ["«Historia»", "Añadir y corregir hitos de la línea de tiempo."],
            [
              "«Análisis»",
              "Pedir a un servicio externo de IA un borrador de lectura.",
            ],
            [
              "«Territorio»",
              "Mantener el catálogo de veredas y decidir dónde queda una sin punto en el mapa.",
            ],
            [
              "«Quién administra»",
              "Dar y quitar el rol; reabrir cuentas cerradas.",
            ],
          ],
        },
        {
          tipo: "aviso",
          nivel: "consejo",
          texto:
            "Empieza por «Novedades»: cada reporte nuevo deja un aviso con su categoría y su vereda, y «Ver el expediente» lo abre en «Expedientes».",
        },
      ],
    },

    /* Verificado contra: src/features/council-inbox.tsx (diez por página;
       «Siguiente» trae otra tanda del servidor al llegar al final; la bandeja
       se pide sola; filtros enviados al servidor; «Descargar bandeja
       completa»; «Tipo de actuación», «Imagen de la actuación (opcional)»);
       src/app/api/admin/incidents/route.ts (de 25 en 25, de la más reciente a
       la más antigua, con los filtros aplicados);
       src/app/api/admin/incidents/export/route.ts (CSV de todos los que
       cumplen los filtros; enlace de un solo uso en Android);
       src/domain/council-action.ts (visita: fecha y responsable);
       src/app/api/incidents/[id]/history/route.ts (fecha, responsable e imagen
       solo para el Consejo); src/features/action-image.tsx;
       src/server/event-image.ts (imagen de la nota);
       src/features/private-evidence.tsx («Anterior foto», «Siguiente foto»);
       src/app/api/admin/incidents/[id]/route.ts:44-62 (motivo obligatorio y
       límites), 129-133 (versión); src/domain/aggregate.ts (plazos de 1, 3, 7
       y 30 días; qué es abierto); src/features/private-evidence.tsx;
       src/server/evidence.ts:109-194 (2200 y 1600 píxeles);
       docs/seguridad-y-privacidad.md §4. */
    {
      id: "expedientes",
      titulo: "Trabajar un expediente",
      resumen: "Cómo se recorre la bandeja y qué se cambia.",
      icono: "bandeja",
      motivo: "atarraya",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Un expediente es un reporte tal como llegó, con sus fotografías, su relato y su seguimiento. Aquí se decide su estado y quién lo atiende.",
        },
        {
          tipo: "pasos",
          titulo: "De la bandeja al guardado",
          pasos: [
            {
              texto: "Abre «Expedientes»: la bandeja se pide sola.",
              detalle:
                "Va de la más reciente a la más antigua. Llegan 25 y se ven de 10 en 10; al final de lo cargado, «Siguiente» trae otros 25 hasta agotarla. «Actualizar bandeja» la repite.",
            },
            {
              texto:
                "Acota con «Buscar» (título, descripción, responsable o código), «Categoría», «Vereda», «Prioridad» y «Estado».",
              detalle:
                "Se aplican a toda la bandeja, no solo a lo cargado, y la lista se vuelve a pedir con ellos.",
            },
            {
              texto:
                "Toca una fila, mira las fotografías y la descripción, y en «Gestión del Consejo» cambia estado, prioridad y «Responsable».",
              detalle: "Sin nota pública ni interna, el servidor no guarda.",
            },
            {
              texto: "Pulsa «Guardar cambio en servidor».",
              detalle: "Queda en el historial con tu nombre y la fecha.",
            },
          ],
        },
        {
          tipo: "tabla",
          columnas: ["Campo", "Qué conviene saber"],
          filas: [
            [
              "«Estado»",
              "«Pendiente», «En proceso», «Solucionado», «No solucionado», «Descartado», «Bloqueado por conflicto» o «Escalado a otra entidad». Solucionado, No solucionado y Descartado cierran el caso; los demás lo mantienen abierto.",
            ],
            [
              "«Prioridad»",
              "«Baja», «Media», «Alta» o «Crítica»; todo entra como Media. Plazos de referencia: Crítica 1 día, Alta 3, Media 7, Baja 30.",
            ],
            [
              "Notas",
              "«Nota para el ciudadano · hasta 30 palabras» la lee quien reportó, en su expediente y en un aviso: sin datos de nadie. «Nota interna · solo administradores» solo la ve el Consejo.",
            ],
            [
              "«Tipo de actuación»",
              "«Nota de seguimiento» o «Visita técnica». La visita pide «Fecha de la visita» y «Quién realizó la visita» (hasta 100 caracteres), y queda en el historial. Quien reportó ve la entrada y su nota pública, sin fecha ni responsable.",
            ],
            [
              "«Imagen de la actuación (opcional)»",
              "Una imagen por nota o visita; «Quitar imagen» la retira antes de guardar. Se abre en el historial con «Ver imagen · solo Consejo».",
            ],
          ],
        },
        {
          tipo: "aviso",
          nivel: "privacidad",
          titulo: "La imagen de una nota es solo del Consejo",
          texto:
            "Aunque la nota para el ciudadano sea pública, quien reportó no ve la imagen: solo la ve el Consejo, y se borra con el expediente.",
        },
        {
          tipo: "pasos",
          titulo: "Bajar la bandeja",
          pasos: [
            {
              texto:
                "Filtra lo que necesites y pulsa «Descargar bandeja completa».",
              detalle:
                "Baja un CSV con todos los expedientes que cumplen los filtros, no solo los cargados: código, fecha, vereda, categoría, estado, prioridad, responsable y descripción. En Android se abre en el navegador, con un enlace de un solo uso.",
            },
          ],
        },
        {
          tipo: "aviso",
          nivel: "ojo",
          titulo: "El archivo trae el relato",
          texto:
            "La descripción de cada reporte es privada: guarda el archivo donde solo lo lea el Consejo y no lo compartas.",
        },
        {
          tipo: "aviso",
          nivel: "ojo",
          titulo: "Dos personas a la vez",
          texto:
            "Si otra persona guardó antes, verás «Otra persona actualizó el caso. Recarga antes de guardar.» y tu cambio no se aplica. Pulsa «Volver a la bandeja», reabre el expediente y revisa; las notas escritas se pierden.",
        },
        {
          tipo: "aviso",
          nivel: "limite",
          titulo: "La fotografía no es el archivo del teléfono",
          texto:
            "Un reporte trae de una a cinco; con varias, pasa de una a otra con «Anterior foto» y «Siguiente foto». Cada una llega como copia de hasta 1.600 píxeles; «Ver la fotografía original» pide la de archivo (hasta 2.200 píxeles, en WebP). Ninguna es el archivo exacto: sirven para mirar un detalle, no para peritar.",
        },
        {
          tipo: "aviso",
          nivel: "consejo",
          texto:
            "La bandeja se ordena por fecha, no por prioridad: filtra «Prioridad» o «Estado» por Pendiente, o entra desde «Novedades».",
        },
      ],
    },

    /* Verificado contra: src/features/council-inbox.tsx:71-90 (lo que ve la
       comunidad y lo que bloquea), 435-449 (el resumen se propone a partir del
       relato), 869-973 (selectores y campos);
       src/app/api/admin/incidents/[id]/route.ts:158-194 (resumen público),
       195-216, 253-304 (aviso a todos al aprobar; aviso a quien reportó);
       src/server/community-view.ts:50-86 (qué sale y qué no; el estado se lee
       del expediente vivo); src/domain/publication.ts:1-19 (24 horas, de 1 a
       720); src/data/community-map.ts:106 (motivo del descarte);
       src/features/terminos.tsx:61-84; src/features/report.tsx:946-957 (marca de
       quien reporta); src/server/push.ts y push-tokens.ts:107-116. */
    {
      id: "privacidad",
      titulo: "Del expediente privado al resumen público",
      resumen: "Qué ve la comunidad y qué botón hace cada paso.",
      icono: "escudo",
      motivo: "manglar",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Un reporte nace privado: lo ven quien lo envió y el Consejo. La comunidad nunca ve el relato, solo un resumen que escribe el Consejo, pasado el plazo desde que lo aprueba.",
        },
        {
          tipo: "flujo",
          etapas: [
            {
              icono: "candado",
              titulo: "Privado",
              texto: "Relato, fotografía y teléfono, solo para el Consejo.",
            },
            {
              icono: "ojo",
              titulo: "Revisado",
              texto: "Marcas «Revisado · sin contenido sensible».",
            },
            {
              icono: "escribir",
              titulo: "Resumen aprobado",
              texto: "Eliges «Compartir el resumen revisado» y guardas.",
            },
            {
              icono: "reloj",
              titulo: "Visible",
              texto:
                "24 horas después de aprobarlo, en «Reportes» de Comunidad.",
            },
          ],
        },
        {
          tipo: "pasos",
          titulo: "Aprobar un resumen",
          pasos: [
            {
              texto:
                "Tras mirar fotografía y relato, elige en «Revisión de sensibilidad» «Revisado · sin contenido sensible».",
              detalle:
                "Con lesiones, menores o personas identificables elige «Sensible · privado»: ahí termina y no consta ante la comunidad. Quien reporta también puede marcarlo al enviar.",
            },
            {
              texto:
                "En «Visibilidad del resumen» elige «Compartir el resumen revisado».",
              detalle:
                "Cambiar la revisión de sensibilidad devuelve la visibilidad a «Privado».",
            },
            {
              texto:
                "Escribe el «Título público» (hasta 120 caracteres) y el «Resumen público · hasta 30 palabras» sin nombres ni datos que identifiquen, y elige la «Vereda pública».",
            },
            {
              texto: "Deja una nota y pulsa «Guardar cambio en servidor».",
              detalle:
                "El plazo es de 24 horas por defecto y puede fijarse entre 1 y 720.",
            },
          ],
        },
        {
          tipo: "aviso",
          nivel: "ojo",
          titulo: "El texto propuesto es del relato",
          texto:
            "«Título público» y «Resumen público · hasta 30 palabras» aparecen siempre llenos con el título y las 30 primeras palabras del relato, aunque ya hubieras aprobado otro texto. Reescríbelos: si guardas sin tocarlos, el resumen publicado se reemplaza y el plazo vuelve a empezar.",
        },
        {
          tipo: "aviso",
          nivel: "privacidad",
          titulo: "Lo que ve la comunidad y lo que llega a los teléfonos",
          texto:
            "La comunidad ve el título público, la categoría, la vereda, el estado y la fecha, y el estado se actualiza al instante. No ve relato, fotografía, teléfono, quién reportó, responsable ni notas, salvo en «Descartado»: ahí la nota para el ciudadano es el motivo público. Al aprobar por primera vez, los teléfonos con avisos reciben «Un caso nuevo en la comunidad» con el título y la vereda, sin esperar el plazo; y la nota para el ciudadano se lee en la pantalla de bloqueo de quien reportó.",
        },
        {
          tipo: "aviso",
          nivel: "consejo",
          texto:
            "Volver a «Privado» o pasar a «Sensible · privado» retira el resumen al guardar.",
        },
      ],
    },

    /* Verificado contra: src/features/council-inbox.tsx:98-237 (botones,
       motivo y avisos), 1015-1024; src/app/api/admin/incidents/[id]/retirada/
       route.ts:52-123 (motivo de 10 a 600 caracteres y 80 palabras; qué se
       borra y qué queda), 126-191 (la repetición no limpia; resto);
       src/app/api/incidents/[id]/route.ts:52-68 (acta para quien reportó y el
       Consejo); src/components/workspace.tsx:1200-1209;
       src/app/api/incidents/route.ts:315-326 y src/server/evidence.ts:171-194
       (copia reducida que no se borra); docs/arquitectura.md §14. */
    {
      id: "retirar",
      titulo: "Retirar un expediente",
      resumen: "Cuándo retirar, qué se borra y quién se entera.",
      icono: "papelera",
      motivo: "canalete",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Retirar es para lo que no se arregla con un estado: un duplicado, un error, un reporte ajeno al territorio. Cerrarlo como «Descartado» lo deja contando en el mapa y en las cifras.",
        },
        {
          tipo: "aviso",
          nivel: "ojo",
          titulo: "Es irreversible",
          texto:
            "Retirar borra de verdad: el expediente, su seguimiento y las fotografías del archivo salen de la bandeja, del mapa, de las cifras y de lo que ve la comunidad.",
        },
        {
          tipo: "pasos",
          pasos: [
            {
              texto:
                "Abre el expediente, baja al final y pulsa «Retirar este reporte».",
            },
            {
              texto:
                "Escribe el «Motivo de la retirada»: mínimo 10 caracteres, máximo 600 u 80 palabras.",
              detalle: "Le llega a quien reportó tal como lo escribas.",
            },
            {
              texto:
                "Pulsa «Retirar y avisar a quien reportó», o «Conservar el reporte» para cancelar.",
            },
          ],
        },
        {
          tipo: "aviso",
          nivel: "privacidad",
          titulo: "Quién se entera",
          texto:
            "A quien reportó le llega «El Consejo retiró tu reporte» con tu motivo, en sus novedades y en el teléfono; si abre su enlace, ve «El Consejo retiró este reporte» con fecha y motivo. A nadie más se le cuenta.",
        },
        {
          tipo: "aviso",
          nivel: "limite",
          titulo: "Lo que retirar no hace",
          texto:
            "No hay listado de retiradas: queda «Reporte retirado» en «Novedades». Si el aviso dice que quedó algo sin borrar, no se puede repetir desde el panel: avisa a quien mantiene el servicio. Las fotografías, sus copias reducidas, las imágenes de las notas y el historial del expediente se borran con él.",
        },
      ],
    },

    /* Verificado contra: src/features/news-editor.tsx:73-83 (rótulos del botón
       de guardar), 483-981 (editor completo), 566-606 (menú de acciones);
       src/domain/news.ts:3-70 (tipos, 5-140 y 20-5000);
       src/domain/news-format.ts:30-37 y 94-103 (marcas e índice);
       src/domain/signature.ts:27 (60 caracteres);
       src/app/api/admin/news/route.ts:5-8 (100 comunicados);
       src/app/api/admin/news/[id]/route.ts:46-108 (versión, aviso una sola
       vez); .../media/route.ts:8-61 (20 imágenes, 10 MB); .../portada/route.ts
       y src/server/evidence.ts:248-297 (portada reducida, 1400 × 800);
       src/platform/evidence.ts:1-168 (24 megapíxeles y 10 MB);
       src/app/api/news/[id]/media/[mediaId]/route.ts (sin recomprimir). */
    {
      id: "comunicados",
      titulo: "Comunicados, alertas y encuentros",
      resumen: "Cómo se redacta, da formato y publica un comunicado.",
      icono: "megafono",
      motivo: "palma",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Los comunicados son la voz del Consejo. A diferencia de los reportes no esperan plazo: lo que publicas se ve de inmediato.",
        },
        {
          tipo: "pasos",
          titulo: "Publicar un comunicado",
          pasos: [
            {
              texto: "En «Comunicados» pulsa «Nuevo comunicado».",
              detalle:
                "La lista se pide sola; «Actualizar la lista» la repite. Son los 100 más recientes.",
            },
            {
              texto:
                "Escribe el «Título» (5 a 140 caracteres) y el «Contenido» (20 a 5.000), y elige el «Tipo»: «Encuentro», «Boletín» o «Alerta».",
            },
            {
              texto:
                "Revisa con «Vista previa» y cambia «Visibilidad» a «Publicado en comunidad».",
            },
            {
              texto: "Pulsa «Publicar comunicado».",
              detalle:
                "El botón dice lo que hará: «Guardar borrador», «Guardar cambios», «Archivar comunicado» o «Retirar de la comunidad». «Verlo en la comunidad» lo abre.",
            },
          ],
        },
        {
          tipo: "tabla",
          columnas: ["Menú de cada tarjeta", "Efecto"],
          filas: [
            [
              "«Anclar» / «Desanclar»",
              "Lo anclado encabeza las noticias con la insignia «Anclado».",
            ],
            ["«Editar»", "Abre el comunicado con sus datos."],
            [
              "«Eliminar»",
              "Pide «Sí, retirar publicación» y archiva: deja de verse, pero se conserva para la auditoría.",
            ],
          ],
        },
        {
          tipo: "texto",
          texto:
            "La barra de formato tiene «Negrita», «Cursiva», «Título de apartado», «Lista» y «Cita»: selecciona el texto y pulsa el estilo. Deja una línea en blanco entre apartados.",
        },
        {
          tipo: "lista",
          items: [
            "**Firma.** En «Firma del comunicado» escribe tu frase (hasta 60 caracteres) o usa «Otra frase»; en blanco, firma con una del repertorio.",
            "**Portada.** Un dibujo del catálogo y, si quieres, «Subir una fotografía de portada»: se guarda reducida (cabe en 1.400 × 800 píxeles).",
            "**Imágenes.** «Imágenes del comunicado · hasta 20»: JPG, PNG o WebP de hasta 10 MB, visibles solo con el comunicado publicado. Escribe el «Pie de la siguiente imagen» antes de elegir el archivo.",
          ],
        },
        {
          tipo: "aviso",
          nivel: "privacidad",
          titulo: "Qué sale al publicar",
          texto:
            "Al publicar por primera vez, los teléfonos con avisos reciben «Nuevo comunicado del Consejo» («Alerta del Consejo» si el tipo es «Alerta»). Corregir no vuelve a avisar; retirar y publicar de nuevo, sí.",
        },
      ],
    },

    /* Verificado contra: src/features/council-history-editor.tsx:12-444
       (rótulos y botones); src/domain/council-history.ts:72-146 (fechas, de
       una a ocho fuentes, HTTPS, límites de largo);
       src/app/api/admin/history/[id]/route.ts:28-47 (versión y auditoría);
       src/features/council-memory.tsx (línea de tiempo);
       src/features/council-territory.tsx (propuestas y botones);
       src/features/council-catalogue.tsx (catálogo editable: buscar, añadir,
       editar, quitar, ubicación en el mapa, validar);
       src/domain/vereda-catalogue.ts (cada cambio sube la versión; el nombre
       anterior queda como alias; de 2 a 120 caracteres; hasta 500);
       src/app/api/admin/territorio/catalogo/route.ts (versión y constancia);
       src/app/api/admin/territorio/route.ts (aceptar escribe el punto en el
       catálogo; fundir solo a veredas activas; descartar);
       src/domain/veredas.ts (tres reportes de dos cuentas, 100 m);
       src/data/vereda-catalogue.ts (el teléfono guarda la lista);
       docs/arquitectura.md §15. */
    {
      id: "historia-y-veredas",
      titulo: "Historia del Consejo y veredas en el mapa",
      resumen: "Hitos de la línea de tiempo y catálogo de veredas.",
      icono: "historia",
      motivo: "ola",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Dos pestañas que cuidan la memoria y el mapa; lo que decides en ellas lo ve toda la comunidad.",
        },
        {
          tipo: "pasos",
          titulo: "Añadir un hito en la pestaña Historia",
          pasos: [
            {
              texto: "Pulsa «Añadir hito», o busca uno con «Buscar hito».",
            },
            {
              texto:
                "Escribe «Título» y «Descripción»; en «¿Qué precisión tiene la fecha?» elige año, mes o fecha completa y escribe la «Fecha del hecho».",
              detalle: "No inventes una fecha más precisa.",
            },
            {
              texto:
                "Elige el «Período» («Origen», «Territorio» o «Memoria») y pon de una a ocho fuentes en «Fuentes de consulta» (documento, institución o autor y «Enlace HTTPS»).",
            },
            {
              texto:
                "Elige «Visibilidad» y guarda con «Guardar borrador», «Guardar y publicar hito» o «Archivar hito».",
              detalle:
                "Lo publicado aparece en la «Línea de tiempo» de «El Consejo», en Comunidad.",
            },
          ],
        },
        {
          tipo: "aviso",
          nivel: "consejo",
          texto:
            "Los hitos no se borran: se archivan. Cada guardado deja versión y autor.",
        },
        {
          tipo: "texto",
          texto:
            "En «Territorio» el Consejo mantiene el «Catálogo de veredas», la lista que ofrece la aplicación al reportar y al filtrar. Lo que cambies lo ve toda la comunidad.",
        },
        {
          tipo: "pasos",
          titulo: "Cuidar el catálogo",
          pasos: [
            {
              texto:
                "Busca una vereda con «Buscar vereda» o pulsa «Añadir vereda».",
              detalle:
                "El nombre lleva de 2 a 120 caracteres y no puede repetir uno existente.",
            },
            {
              texto:
                "Para cambiar un nombre pulsa «Editar», corrígelo y pulsa «Guardar vereda».",
              detalle:
                "El nombre anterior se sigue reconociendo: los reportes viejos no se pierden.",
            },
            {
              texto:
                "Si conoces el sitio, pulsa «Señalar ubicación» y toca el mapa; «Quitar ubicación» la deshace.",
              detalle:
                "Es opcional: puedes guardar sin punto y ponerlo después. Debe quedar dentro del territorio.",
            },
            {
              texto:
                "Para retirar una vereda pulsa «Quitar» y «Confirmar retirada».",
              detalle:
                "Deja de ofrecerse en los reportes nuevos; los expedientes anteriores se conservan y «Reactivar» la devuelve. No se borra ningún reporte.",
            },
            {
              texto:
                "Cuando los nombres estén revisados, pulsa «Validar catálogo revisado» y «Confirmar validación».",
              detalle: "Queda con tu cuenta y la fecha.",
            },
          ],
        },
        {
          tipo: "aviso",
          nivel: "ojo",
          titulo: "Validar no es para siempre",
          texto:
            "El catálogo solo consta como validado cuando el Consejo lo confirma, y la validación cubre los nombres de esa versión, no la ubicación de cada vereda. Cualquier cambio posterior, incluso aceptar un punto propuesto, crea una versión nueva y vuelve a mostrar «Esta versión está pendiente de validación por el Consejo.»: hay que validarla otra vez. Mientras tanto, quien reporta ve el catálogo como pendiente.",
        },
        {
          tipo: "texto",
          texto:
            "Debajo del catálogo aparecen propuestas de punto para las veredas que no tienen uno o que el catálogo no tiene. Salen cuando al menos tres reportes de dos personas las sitúan desde el sitio. Nada cambia hasta que el Consejo decide.",
        },
        {
          tipo: "tabla",
          columnas: ["Botón", "Qué hace"],
          filas: [
            [
              "«Aceptar el punto»",
              "Es el punto que ve toda la comunidad y se guarda en el catálogo, donde la añade si no estaba. La pantalla no deja ajustarlo a mano.",
            ],
            [
              "«Es otra vereda con otro nombre»",
              "Eliges una vereda activa del catálogo y pulsas «Fundir»: los reportes pasan a ella.",
            ],
            [
              "«Descartar»",
              "Pide «Por qué se descarta» y apaga esa vereda para siempre.",
            ],
          ],
        },
      ],
    },

    /* Verificado contra: src/features/statistics.tsx (filtros, exportCsv,
       exportInforme, tarjetas del Consejo, lectura); src/platform/export.ts
       y src/server/export-tickets.ts:35,39 (enlace de un solo uso, 15
       minutos); src/domain/informe-html.ts:225-227 (página del informe en
       Android, con «Guardar como PDF»); src/domain/csv.ts (separador y
       comillas); src/features/council-statistics.tsx (tarjeta «Dónde está el
       trabajo.»); src/app/api/admin/statistics/route.ts:19 (1.000
       expedientes); src/features/admin-analysis.tsx y
       src/app/api/admin/analysis/route.ts:10-18,29-85 (un minuto, 20 notas,
       200 caracteres); src/features/reading-assistant.tsx y
       src/app/api/ai/reading/route.ts:26-83 (Consejo, correo verificado, un
       uso por minuto y diez al día); src/components/workspace.tsx:194-197,
       786-792 (qué reportes cuenta la pantalla); src/data/community-map.ts. */
    {
      id: "cifras",
      titulo: "Estadísticas, informe y análisis",
      resumen:
        "Qué cuentan las cifras, cómo bajar informe y datos y qué sale a la IA.",
      icono: "grafico",
      motivo: "canoa",
      bloques: [
        {
          tipo: "texto",
          texto:
            "El observatorio está en «Estadísticas». Cualquiera con sesión ve las cifras; las cuentas del Consejo ven además dos tarjetas de trabajo.",
        },
        {
          tipo: "lista",
          items: [
            "La tarjeta «Dónde está el trabajo.» da cifras de todo el territorio (hasta 1.000 expedientes): abiertos sin responsable, lo que más espera, tiempo de cierre y plazos. Solo números.",
            "La tarjeta «De los números a las preguntas.» da la lectura del filtro, en frases para la asamblea, sin modelo; «Ver fuentes y método» detalla cada cálculo.",
          ],
        },
        {
          tipo: "aviso",
          nivel: "limite",
          titulo: "El informe y el CSV no son la bandeja",
          texto:
            "Cuentan los reportes de tu cuenta más los que la comunidad ya ve: sin privados, delicados ni los que esperan el plazo, y el responsable de los ajenos sale como «Sin asignar». En «Dónde está el trabajo.» sí está todo el territorio, y «Descargar bandeja completa», en «Expedientes», baja todos los expedientes.",
        },
        {
          tipo: "tabla",
          columnas: ["Botón", "En el computador", "En Android"],
          filas: [
            [
              "«Descargar informe»",
              "Se abre el cuadro de imprimir: elige «Guardar como PDF».",
              "Se abre, en el navegador del teléfono, una página con el informe y el botón «Guardar como PDF». Necesita señal: pasa por el servidor, con un enlace de un solo uso que vence a los 15 minutos.",
            ],
            [
              "«Datos en CSV»",
              "El navegador baja el archivo.",
              "El archivo baja desde el navegador del teléfono, por el mismo tipo de enlace.",
            ],
          ],
          nota: "El informe de Android no incluye la lectura ni el párrafo de IA. El CSV separa con punto y coma, como espera Excel.",
        },
        {
          tipo: "tabla",
          columnas: [
            "Aspecto",
            "Pestaña Análisis",
            "Redactar con IA para la asamblea",
          ],
          filas: [
            [
              "Qué sale",
              "«Analizar reportes remotos»: conteos y, de hasta 20 casos cerrados, la nota pública con que se cerraron; nunca relatos, teléfonos, cuentas, fotografías ni notas internas.",
              "Solo las frases calculadas, sin el título de ningún expediente.",
            ],
            [
              "Límites",
              "Un minuto entre análisis.",
              "Correo verificado; un minuto entre usos y diez al día.",
            ],
          ],
        },
        {
          tipo: "aviso",
          nivel: "ojo",
          texto:
            "Los dos textos salen rotulados como redactados con IA. Escribe sin nombres las notas públicas con que cierras un caso. Si la IA difiere de lo calculado, vale lo calculado.",
        },
      ],
    },

    /* Verificado contra: src/app/api/account/deletion/route.ts:19-26,78-88,
       103-112,147-157 (aviso al Consejo, mensajes);
       src/server/anonymize.ts:56-125 (qué se borra y qué se conserva);
       src/app/api/admin/accounts/restablecer/route.ts:25-124;
       src/features/council-roles.tsx:121-150,241-247,282-314;
       src/domain/auth.ts:51-52 (lo que lee quien no puede entrar);
       src/features/cuenta-restablecida.tsx (lo que lee quien vuelve);
       src/features/account.tsx:344-349 (cuentas del Consejo);
       src/features/delete-account.tsx; src/app/api/incidents/route.ts:315-326. */
    {
      id: "cuentas",
      titulo: "Cuentas cerradas y solicitudes de eliminación",
      resumen: "Qué pasa al eliminar una cuenta y cómo se vuelve a abrir.",
      icono: "usuarios",
      motivo: "platano",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Cualquiera puede eliminar su cuenta desde «Mi cuenta». El Consejo no aprueba nada: le llega a «Novedades» como «Solicitud de eliminación de cuenta», sin nombre.",
        },
        {
          tipo: "lista",
          items: [
            "Se retira su acceso, se cierran sus sesiones y se borran las fotografías del archivo y su bandeja de avisos.",
            "Sus expedientes se anonimizan: se descarta el seudónimo y se retiran relato, título y teléfono.",
            "Se conservan categoría, vereda, estado y fechas.",
          ],
        },
        {
          tipo: "aviso",
          nivel: "limite",
          titulo: "Lo que sí se conserva",
          texto:
            "Al eliminar una cuenta se borran las fotografías, el punto marcado y el texto de las notas del seguimiento; quedan categoría, vereda, estado y fechas. El panel no muestra si una eliminación quedó a medias: si dudas, avisa a quien mantiene el servicio.",
        },
        {
          tipo: "pasos",
          titulo: "Volver a abrir una cuenta cerrada",
          pasos: [
            {
              texto:
                "La persona se acerca al Consejo a pedirlo: desde la aplicación no puede.",
            },
            {
              texto:
                "En «Quién administra» busca su cuenta (trae la etiqueta «Cerrada») y pulsa «Restablecer».",
            },
            {
              texto:
                "Lee «Volver a abrir esta cuenta» y confirma con «Restablecer», o pulsa «Cancelar».",
            },
          ],
        },
        {
          tipo: "aviso",
          nivel: "ojo",
          titulo: "Se devuelve la puerta, no los datos",
          texto:
            "Lo que reportó antes se anonimizó y no vuelve: entra con su mismo correo a una cuenta vacía. Díselo antes de pulsar. Las cuentas con rol de administración no se eliminan desde la aplicación.",
        },
      ],
    },

    /* Verificado contra: src/server/push.ts y push-tokens.ts:149-159 (a
       quién va cada aviso); src/app/api/incidents/route.ts:332 (nuevo
       reporte); src/app/api/admin/incidents/[id]/route.ts:276-304;
       src/app/api/admin/incidents/[id]/retirada/route.ts:131-148;
       src/app/api/account/deletion/route.ts:103-112;
       src/app/api/admin/news/[id]/route.ts:93-108; src/features/account.tsx:
       455-468 («Avisos en este dispositivo»); src/platform/push.ts:78-87,
       246-276 (dónde hay avisos; baja al cerrar sesión);
       src/platform/native.ts:133; src/features/aviso-actualizacion.tsx;
       docs/empaquetado-android.md. */
    {
      id: "telefono",
      titulo: "Avisos y la aplicación de Android",
      resumen: "Qué avisos llegan al teléfono y cómo se activan.",
      icono: "campana",
      motivo: "monte",
      bloques: [
        {
          tipo: "texto",
          texto:
            "La aplicación es la misma en el navegador y en Android. Cambian los avisos del sistema y la manera de bajar archivos.",
        },
        {
          tipo: "lista",
          items: [
            "**Al Consejo:** «Nuevo reporte recibido», con categoría y vereda y nunca el relato, y «Solicitud de eliminación de cuenta», sin nombre.",
            "**A quien reportó:** «El Consejo actualizó tu reporte», con tu nota pública o el estado, y «El Consejo retiró tu reporte», con tu motivo.",
            "**A todos:** «Un caso nuevo en la comunidad» al aprobar un resumen, y «Nuevo comunicado del Consejo» o «Alerta del Consejo».",
          ],
        },
        {
          tipo: "pasos",
          titulo: "Activar los avisos",
          pasos: [
            {
              texto:
                "En «Mi cuenta» pulsa «Avisos en este dispositivo» y acepta el permiso.",
              detalle:
                "La fila solo existe donde el aparato puede recibirlos. Si bloqueaste el permiso, se activa desde los ajustes del teléfono.",
            },
            {
              texto: "Al «Cerrar sesión» el teléfono se da de baja solo.",
              detalle: "En el río los teléfonos se prestan.",
            },
          ],
        },
      ],
    },

    /* Verificado contra: src/features/council-panel.tsx:21-29 (pestañas);
       src/features/council-inbox.tsx:518-603 (filtros);
       src/features/statistics.tsx («Lo que lleva más esperando»);
       src/features/council-statistics.tsx («Dónde está el trabajo.»);
       src/features/council-roles.tsx:318-325 (al menos dos cuentas);
       docs/manual-consejo.md §10 (responsabilidades que el Consejo designa por
       escrito; no salen del código). */
    {
      id: "rutina",
      titulo: "Rutina de trabajo, responsabilidades y palabras clave",
      resumen: "Una rutina sugerida, quién responde de qué y palabras clave.",
      icono: "calendario",
      motivo: "hoja",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Una rutina corta evita que algo se quede quieto sin que nadie lo note.",
        },
        { tipo: "texto", texto: "**Cada jornada de atención**" },
        {
          tipo: "lista",
          estilo: "casillas",
          items: [
            "Leer «Novedades» desde la última vez.",
            "En «Expedientes», filtrar «Estado» por Pendiente y revisar primero la sensibilidad de los casos nuevos.",
            "Asignar «Prioridad» y «Responsable» a cada caso nuevo.",
            "Dejar una nota breve, sin datos personales, en los casos que avanzaron.",
          ],
        },
        { tipo: "texto", texto: "**Cada semana**" },
        {
          tipo: "lista",
          estilo: "casillas",
          items: [
            "Revisar «Dónde está el trabajo.» y «Lo que lleva más esperando»: que ningún caso quede quieto.",
            "Publicar el comunicado o la alerta que corresponda y mirar «Territorio».",
            "Comprobar en «Quién administra» que haya al menos dos cuentas con el rol.",
          ],
        },
        {
          tipo: "tabla",
          columnas: ["Responsabilidad", "Qué implica"],
          filas: [
            [
              "Administración del Consejo",
              "Gestiona la aplicación y decide quién más administra.",
            ],
            [
              "Persona mantenedora del servicio",
              "Custodia las credenciales, vigila el servicio, fija el plazo de publicación y atiende los fallos.",
            ],
            [
              "Persona responsable de datos",
              "Atiende solicitudes de eliminación y acceso, y vigila que no se publiquen datos personales.",
            ],
            ["Turno de revisión", "Quién revisa la bandeja y cada cuánto."],
            [
              "Lineamiento editorial",
              "Quién aprueba una alerta antes de publicarla.",
            ],
          ],
          nota: "Deben designarse por escrito antes de abrir la aplicación.",
        },
        {
          tipo: "glosario",
          terminos: [
            {
              termino: "Resumen público",
              significado:
                "El texto que escribe el Consejo para que la comunidad vea un caso.",
            },
            {
              termino: "Delicado",
              significado:
                "Reporte «Sensible · privado»: no consta ante la comunidad.",
            },
            {
              termino: "Anonimizar",
              significado:
                "Quitar de un expediente lo que identifica a quien reportó.",
            },
          ],
        },
      ],
    },

    /* Verificado contra: src/domain/vereda-catalogue.ts (un punto por vereda,
       no fronteras); src/features/report.tsx (solo fotografías, hasta cinco);
       src/features/council-inbox.tsx (solo imágenes en las notas; la bandeja
       pide todo al servidor); src/features/council-territory.tsx (sin ajuste
       a mano);
       src/app/api/admin/incidents/[id]/retirada/route.ts:126-130;
       src/features/aviso-actualizacion.tsx; src/server/export-tickets.ts:35;
       docs/arquitectura.md §14. */
    {
      id: "limites",
      titulo: "Lo que la aplicación todavía no hace",
      resumen: "Lo que el Consejo debe saber para no prometer de más.",
      icono: "alerta",
      motivo: "brote",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Decirlo es parte del trabajo del Consejo ante la comunidad. Para gestionar hace falta conexión, porque el panel consulta todo en el servidor.",
        },
        {
          tipo: "lista",
          items: [
            "**La aplicación no traza límites de veredas:** guarda un punto de referencia por vereda, no sus fronteras.",
            "**No hay aplicación en tiendas:** en Android se instala con un archivo.",
            "**Solo se adjuntan fotografías:** hasta cinco por reporte y una imagen por nota; no hay video, audio ni documentos.",
            "**La retirada no se deshace ni tiene listado.**",
          ],
        },
        {
          tipo: "preguntas",
          items: [
            {
              pregunta: "No veo «Panel del Consejo» en el menú.",
              respuesta:
                "Tu cuenta no tiene el rol o acaba de recibirlo: cierra sesión y vuelve a entrar. Si sigue igual, pídelo en «Quién administra».",
            },
            {
              pregunta: "Un caso no aparece en la bandeja.",
              respuesta:
                "La bandeja va de la más reciente a la más antigua y carga de 25 en 25. Busca por título o código, revisa que los filtros estén en «Todas» o «Todos», o pulsa «Siguiente» hasta el final: trae más mientras haya. Si lo retiraron, ya no existe.",
            },
            {
              pregunta: "El enlace del informe dice que ya se usó o venció.",
              respuesta:
                "Pulsa el botón de nuevo: el enlace es de un solo uso y dura 15 minutos.",
            },
          ],
        },
      ],
    },
  ],
  cierre: {
    titulo: "Cada nota es una respuesta",
    texto:
      "Este manual describe lo que la aplicación hace al 21 de octubre de 2026 y dice lo que aún no hace. Gestiona cada reporte pensando en quien lo va a leer: detrás hay alguien del territorio esperando una respuesta.",
  },
};
