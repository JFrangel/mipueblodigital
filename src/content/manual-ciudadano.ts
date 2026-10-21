import type { Manual } from "./manuales";

/**
 * El Manual del ciudadano, como datos.
 *
 * Esquema y reglas de las marcas: `./manuales.ts`. Aquí solo se dice qué contar.
 *
 * Cómo mantenerlo: cada capítulo lleva encima un comentario que empieza por
 * Verificado contra, con los archivos donde se comprobó cada afirmación. Cuando
 * cambie la aplicación, se mira ahí primero. Todo lo que va entre guillemets
 * tiene que existir tal cual en `src/`; si no es el rótulo exacto de algo que
 * la persona ve, va en **negrita** o con palabras normales.
 *
 * Las cifras (500 palabras, 10 MB, 10 reportes por día, 45 segundos…) salen del
 * código y se citan en el comentario de su capítulo. Si una cambia allí, hay
 * que cambiarla aquí. Los números de línea son de la fecha de verificación y se
 * desplazan —`workspace.tsx` cambia a menudo—: si no coinciden, se busca el texto
 * citado.
 */
export const manualCiudadano: Manual = {
  id: "ciudadano",
  titulo: "Manual del ciudadano",
  subtitulo: "Reportar, seguir y cuidar el territorio con Mi Pueblo Digital",
  publico: "Para quien reporta",
  fecha: "2026-10-21",
  formato: "A5",
  capitulos: [
    /* Verificado contra: src/features/terminos.tsx:41-46 (el Consejo es el
       responsable; la aplicación es su herramienta);
       src/features/statistics.tsx:588 (el Consejo no tiene un plazo acordado);
       src/app/api/incidents/route.ts:331-332 (el Consejo recibe un aviso
       cuando llega un reporte). */
    {
      id: "que-es",
      titulo: "Qué es y qué no es",
      resumen: "Para qué sirve la aplicación y hasta dónde llega.",
      icono: "megafono",
      motivo: "palafito",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Mi Pueblo Digital sirve para **avisar al Consejo Comunitario** de lo que afecta al territorio y para **seguir qué pasa con tu aviso**. Es la herramienta del Gran Consejo Comunitario Río Satinga.",
        },
        {
          tipo: "tarjetas",
          tarjetas: [
            {
              icono: "camara",
              titulo: "Reportas",
              texto: "Cuentas qué pasa y dónde, y subes fotos.",
            },
            {
              icono: "reloj",
              titulo: "Sigues",
              texto: "Ves el estado y las notas del Consejo.",
            },
            {
              icono: "campana",
              titulo: "Te enteras",
              texto: "Recibes novedades y comunicados.",
            },
            {
              icono: "mapa",
              titulo: "Miras",
              texto: "Mapa, cifras y noticias del territorio.",
            },
          ],
        },
        {
          tipo: "aviso",
          nivel: "limite",
          titulo: "No es una línea de emergencias",
          texto:
            "Ante un riesgo para la vida, la salud o la seguridad, acude primero a los medios de urgencia de tu comunidad. El Consejo recibe un aviso al llegar un reporte, pero no tiene un plazo acordado para atenderlo.",
        },
      ],
    },

    /* Verificado contra: src/features/access.tsx:324-445 (formulario de acceso),
       460-466 («Entrar sin iniciar sesión»), 130 (mensaje al crear la cuenta);
       src/domain/auth.ts:8 (contraseña de 12 caracteres o más);
       src/data/session.ts:169-193 (el perfil se activa solo cuando el correo
       está verificado, y con Google ya lo está); src/features/account.tsx:
       356-376 («Activar mi perfil» solo sale con el perfil inactivo);
       src/app/api/account/activate/route.ts:19-28 (no exige correo verificado);
       src/app/api/ai/improve/route.ts:6 (la IA sí lo exige);
       src/features/report.tsx:303-322 (sin sesión, el reporte queda en la
       bandeja a nombre de nadie y pasa a la cuenta al entrar);
       src/features/outbox.tsx:186-224 («Es mío, enviarlo» cuando no pasó
       solo). */
    {
      id: "entrar",
      titulo: "Entrar y activar tu perfil",
      resumen: "Cómo crear tu cuenta y dejar el perfil listo para reportar.",
      icono: "llave",
      motivo: "canoa",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Para enviar un reporte necesitas una cuenta. Con «Entrar sin iniciar sesión» puedes mirar el territorio y llenar el formulario. Si envías sin cuenta, el reporte espera en tu teléfono; al entrar pasa a tu nombre o «Mis reportes» te pregunta si es tuyo.",
        },
        {
          tipo: "pasos",
          titulo: "Con correo y contraseña",
          pasos: [
            { texto: "En la pantalla de acceso, toca «Crear una cuenta»." },
            {
              texto: "Escribe tu nombre, tu correo y una contraseña.",
              detalle: "12 caracteres o más, escrita dos veces.",
            },
            {
              texto: "Toca «Crear cuenta».",
              detalle:
                "Tu perfil ciudadano se activa solo y ya puedes reportar. Te llega un correo para verificarla.",
            },
          ],
        },
        {
          tipo: "aviso",
          nivel: "consejo",
          titulo: "Con Google es más corto",
          texto:
            "Toca «Continuar con Google»: el correo ya viene verificado, lo que te permite recuperar la cuenta.",
        },
        {
          tipo: "aviso",
          nivel: "ojo",
          titulo: "¿No verificaste el correo?",
          texto:
            "Para reportar no hace falta. Verificarlo te sirve para recuperar la cuenta si pierdes el acceso, y la ayuda con IA sí lo pide. Si tu perfil no aparece activo, entra a «Mi cuenta» y toca «Activar mi perfil».",
        },
      ],
    },

    /* Verificado contra: src/features/report.tsx:618 (pasos «Tipo»,
       «Ubicación», «Detalles», «Revisar»), 1064 («Enviar al Consejo»),
       597-608 (avance guardado y «Guardar borrador»), 172-184 (vuelve al
       primer paso incompleto), 537 (un solo borrador por cuenta), 1012-1017
       (recibo con fecha); src/features/draft-card.tsx:59,106,110 (el borrador
       sale en «Inicio» y «Mis reportes», con «Continuar» y «Descartar»);
       src/data/catalog.ts:53-75 (categorías); src/domain/logic.ts:73-99
       (campos obligatorios); src/components/workspace.tsx:385,824
       («Nuevo reporte»; «Reportar», en el centro de la barra del teléfono);
       src/app/api/incidents/route.ts:183-199 (10 por día, contados por fecha
       UTC, que son las 7:00 p. m. en Colombia; el reintento del mismo envío no
       gasta cupo). */
    {
      id: "reportar",
      titulo: "Crear un reporte",
      resumen: "Los cuatro pasos del formulario, de la categoría al envío.",
      icono: "escribir",
      motivo: "canalete",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Toca «Nuevo reporte» o, en el teléfono, «Reportar» en la barra de abajo. Son cuatro pasos y puedes volver a uno ya recorrido tocando su nombre.",
        },
        {
          tipo: "pantalla",
          escena: "nuevo-reporte",
          pie: "«Reportar» está en el centro de la barra del teléfono.",
        },
        {
          tipo: "pasos",
          titulo: "Los cuatro pasos",
          pasos: [
            {
              texto: "«Tipo»: elige la categoría.",
              detalle:
                "Infraestructura, Ambiente, Territorio, Comunidad u Otro.",
            },
            { texto: "«Ubicación»: elige la vereda más cercana." },
            {
              texto: "«Detalles»: cuenta qué pasó y sube de una a cinco fotos.",
              detalle: "La descripción y al menos una foto son obligatorias.",
            },
            {
              texto: "«Revisar»: comprueba y toca «Enviar al Consejo».",
              detalle: "El servidor responde con un recibo y su fecha.",
            },
          ],
        },
        {
          tipo: "aviso",
          nivel: "consejo",
          titulo: "Tu avance se guarda solo",
          texto:
            "Mientras escribes, el avance se guarda en tu teléfono. Al volver a «Reportar», se abre el primer paso incompleto.",
        },
        {
          tipo: "aviso",
          nivel: "ojo",
          titulo: "Un borrador no es un envío",
          texto:
            "«Guardar borrador» lo deja para después; el Consejo no lo ve hasta que toques «Enviar al Consejo». Solo hay uno por cuenta; en «Inicio» y «Mis reportes» sale con «Continuar» y «Descartar».",
        },
        {
          tipo: "aviso",
          nivel: "limite",
          titulo: "Hasta 10 reportes nuevos por día",
          texto:
            "El día cuenta en hora universal (UTC) y se renueva a las 7:00 p. m. en Colombia. Reintentar un reporte ya preparado no gasta cupo.",
        },
      ],
    },

    /* Verificado contra: src/features/report.tsx (contador de 500 palabras;
       «Añadir fotografías», hasta cinco, «Quitar»; «Tomar una foto ahora»,
       «Buscar en mis archivos»; casilla sensible); src/domain/logic.ts
       (500 palabras, de una a cinco fotografías, celular de 1 a 10 dígitos);
       src/app/api/incidents/route.ts (entre una y cinco fotografías);
       src/features/voice-input.tsx:23,98 y src/platform/voz.ts:38 (dictado de
       hasta 1 minuto, con internet); src/features/writing-assistant.tsx:10,107
       (desde 12 palabras); src/app/api/ai/improve/route.ts:6,49 (correo
       verificado; 10 al día UTC; un minuto entre usos); src/platform/
       evidence.ts y report.tsx (al adjuntar, el teléfono reduce a WebP lo que
       pasa de unos 550 KB o 3 megapíxeles); src/server/evidence.ts:109-149 (el servidor guarda
       WebP de hasta 2200 píxeles, no los bytes originales);
       docs/seguridad-y-privacidad.md §4. */
    {
      id: "detalles",
      titulo: "Descripción, voz y fotografía",
      resumen: "Cómo contar lo ocurrido y qué pasa con tu foto.",
      icono: "camara",
      motivo: "platano",
      bloques: [
        {
          tipo: "texto",
          texto:
            "En «Detalles» cuentas qué pasó, cuándo y a quién afecta, con tus palabras. Un reporte claro ayuda al Consejo a decidir.",
        },
        {
          tipo: "tarjetas",
          tarjetas: [
            {
              icono: "microfono",
              titulo: "Dicta",
              texto:
                "«Activar micrófono» pasa tu voz a texto. Puedes corregirlo o usar «Deshacer último dictado».",
            },
            {
              icono: "camara",
              titulo: "Fotografías",
              texto:
                "Hasta cinco; con una basta. Elige fotos útiles y seguras.",
            },
            {
              icono: "ojo-cerrado",
              titulo: "Sensible",
              texto:
                "Marca «Contiene imágenes o información sensible» si hay lesiones, menores o personas identificables.",
            },
          ],
        },
        {
          tipo: "tabla",
          columnas: ["Dato", "Límite"],
          filas: [
            ["Descripción", "Hasta 500 palabras"],
            ["Fotografías", "De 1 a 5, JPG, PNG o WebP"],
            ["Celular", "Opcional, hasta 10 dígitos"],
            ["Dictado", "Hasta 1 minuto, con internet"],
            ["«Mejorar redacción con IA»", "Desde 12 palabras"],
          ],
        },
        {
          tipo: "aviso",
          nivel: "limite",
          titulo: "Tus fotos no llegan idénticas",
          texto:
            "Si una pesa más de medio megabyte, el teléfono la reduce al adjuntarla y te avisa. El servidor guarda una copia WebP de hasta 2200 píxeles por lado, no el archivo exacto.",
        },
        {
          tipo: "pasos",
          titulo: "Añadir y quitar fotos",
          pasos: [
            {
              texto: "Toca «Añadir fotografías» y elige una o varias a la vez.",
              detalle:
                "También sirven «Tomar una foto ahora» y «Buscar en mis archivos».",
            },
            {
              texto:
                "Cada una sale en miniatura: toca «Quitar» en la que no sirva.",
            },
            {
              texto:
                "Con cinco ya no caben más: quita una antes de añadir otra.",
            },
          ],
        },
        {
          tipo: "aviso",
          nivel: "privacidad",
          titulo: "La ayuda con IA",
          texto:
            "«Mejorar redacción con IA» envía solo tu descripción a un servicio externo, nunca tus datos. Evita nombres propios y revisa el resultado. Pide el correo verificado; hay tope de 10 usos al día.",
        },
        {
          tipo: "aviso",
          nivel: "consejo",
          titulo: "Si una foto no se adjunta",
          texto: "Prueba «Tomar una foto ahora» o «Buscar en mis archivos».",
        },
      ],
    },

    /* Verificado contra: src/features/report.tsx:429-433 y 672-794 (paso
       «Ubicación»: buscador, lista, «Mi vereda no está en la lista»);
       src/features/report.tsx (el aviso depende de si el Consejo validó la
       versión); src/data/vereda-catalogue.ts (el teléfono guarda la lista y
       la actualiza con señal); src/features/vereda-preview.tsx:211-234,262,377,434-438
       («Usar mi ubicación», «Volver al punto de la vereda», sin inventar
       coordenadas, «sin verificar»); src/platform/ubicacion.ts:42,50,124 (solo
       al pulsar, una vez; hasta 500 m de margen; 30 s; dentro del territorio);
       src/app/api/incidents/route.ts:92,151,345-362 (punto dentro del
       territorio; vereda nueva solo con punto del aparato; el punto del
       aparato se suma a los de otras personas); src/server/veredas.ts:38-110 y
       src/app/api/admin/territorio/route.ts:24-51 (el Consejo ve solo el
       resultado conjunto); src/data/community-map.ts:27 (la comunidad ve la
       vereda, no el punto exacto). */
    {
      id: "ubicacion",
      titulo: "Dónde ocurrió",
      resumen: "Cómo situar tu reporte y qué se hace con tu ubicación.",
      icono: "pin",
      motivo: "brujula",
      bloques: [
        {
          tipo: "texto",
          texto:
            "En «Ubicación» eliges la vereda o el centro poblado más cercano; el Consejo la usa para saber dónde mirar.",
        },
        {
          tipo: "pasos",
          pasos: [
            {
              texto:
                "Escribe unas letras para acortar la lista y elige tu vereda.",
            },
            {
              texto: "Mira el mapa.",
              detalle:
                "Muestra el punto de referencia de la vereda, no el sitio exacto. Necesita internet; el reporte no.",
            },
            {
              texto: "Para afinar, toca el mapa donde ocurrió.",
              detalle: "«Volver al punto de la vereda» lo deshace.",
            },
            {
              texto: "O toca «Usar mi ubicación» si estás allí.",
              detalle:
                "Puede tardar medio minuto. Con más de 500 m de margen, no se usa.",
            },
          ],
        },
        {
          tipo: "aviso",
          nivel: "privacidad",
          titulo: "Tu ubicación, solo si tú la pides",
          texto:
            "Solo se lee al tocar «Usar mi ubicación», una vez; no te sigue ni se recuerda. Viaja con el reporte; la ven tú y el Consejo, que la recibe sin verificar. El servidor también la suma a las de otras personas para situar la vereda.",
        },
        {
          tipo: "aviso",
          nivel: "ojo",
          titulo: "¿Tu vereda no está en la lista?",
          texto:
            "Toca «Mi vereda no está en la lista» y escríbela. Para proponerla hace falta tu ubicación desde el sitio; si no estás allí, elige la más cercana.",
        },
        {
          tipo: "aviso",
          nivel: "limite",
          titulo: "La lista puede cambiar",
          texto:
            "La mantiene el Consejo Comunitario y puede cambiar. Se guarda en tu teléfono, así que sirve sin señal; bajo la lista dice si está validada. Los puntos son aproximados; sin punto, el reporte sale solo con el nombre de la vereda.",
        },
      ],
    },

    /* Verificado contra: src/features/report.tsx:303-348 (sin sesión o sin
       señal, el reporte entra a la bandeja), 570-583 (pantalla de
       confirmación); src/data/outbox.ts:2-3,157-162,242 (10 reportes o 50 MB;
       espera creciente; ocho intentos pasan a atención);
       src/features/outbox.tsx:22-25,125,244,299,327,337 (panel «Un reporte
       espera señal», «Reintentar ahora», «Requiere tu atención»; los
       confirmados no se listan); src/data/sync-outbox.ts:39;
       src/app/api/incidents/route.ts:183-190 (el mismo envío no duplica);
       android/app/build.gradle:19 (versión 2.2);
       android/app/src/main/java/co/riosatinga/mipueblodigital/EnviosPlugin.java:
       162 y EnvioWorker.java:88,127 (WorkManager con red; avisos del sistema);
       docs/empaquetado-android.md:25-31,49-52 (puede aplazarse por batería; no
       corre tras Forzar detención; falta probarlo en un teléfono real);
       public/sw.js:21 (el formulario queda guardado tras abrir con señal). */
    {
      id: "sin-senal",
      titulo: "Cuando no hay señal",
      resumen: "Qué pasa con tu reporte sin internet y cómo saber que salió.",
      icono: "sin-senal",
      motivo: "ola",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Puedes enviar un reporte sin señal. No se pierde: espera en tu teléfono y sale solo cuando vuelve la red.",
        },
        {
          tipo: "pantalla",
          escena: "sin-senal",
          pie: "Así avisa el formulario sin conexión.",
        },
        {
          tipo: "flujo",
          etapas: [
            {
              icono: "enviar",
              titulo: "Lo envías",
              texto: "Tocas «Enviar al Consejo».",
            },
            {
              icono: "bandeja",
              titulo: "Espera",
              texto: "Queda en tu teléfono, con su foto.",
            },
            {
              icono: "senal",
              titulo: "Vuelve la red",
              texto: "Sale solo, sin duplicarse.",
            },
            {
              icono: "check",
              titulo: "Recibo",
              texto: "Llega con fecha. Su estado, en «Mis reportes».",
            },
          ],
        },
        {
          tipo: "tabla",
          columnas: ["Lo que ves", "Qué significa"],
          filas: [
            [
              "«En cola · sin confirmar»",
              "Está en tu teléfono; se reintenta solo.",
            ],
            ["«Enviando…»", "Se transmite ahora."],
            [
              "«Requiere tu atención»",
              "Lo rechazaron o falló varias veces. Lee el mensaje y toca «Reintentar ahora».",
            ],
          ],
        },
        {
          tipo: "aviso",
          nivel: "consejo",
          titulo: "En Android, con la app cerrada",
          texto:
            "Con la versión 2.2, Android reintenta al volver la red aunque cierres la app. Con los avisos permitidos verás **Enviando reporte** y **Reporte entregado**; sin ellos, el envío sigue igual.",
        },
        {
          tipo: "aviso",
          nivel: "ojo",
          titulo: "Cuida lo pendiente",
          texto:
            "No borres los datos ni desinstales la app con borradores o envíos pendientes: viven solo en tu teléfono. Si cierras sesión, esperan a que vuelvas a entrar. Caben 10 reportes o 50 MB.",
        },
        {
          tipo: "aviso",
          nivel: "limite",
          titulo: "No siempre es al instante",
          texto:
            "Android puede aplazar el envío por la batería, y **Forzar detención** lo impide hasta que abras la app. En el navegador, la página debe estar abierta.",
        },
      ],
    },

    /* Verificado contra: src/components/workspace.tsx:557-562,981,1289 (detalle y
       cabecera de «Mis reportes», «Ver mis reportes»); src/features/account.tsx
       :548-549 (fila «Mis reportes»); src/data/account-reports.ts:48 (se
       consulta sola); src/features/report-detail.tsx:203,239-240,335
       («Identificador», «Seguimiento», hora de Bogotá, «Última
       actualización»); src/domain/short-id.ts:19 (código de ocho caracteres);
       src/data/catalog.ts:76-84 (los siete estados); src/domain/delivery.ts:28
       («Esperando señal»); src/features/report.tsx:576 («Está pendiente de
       revisión»); src/features/territory.tsx:45-63 («Descartado»: no era una
       incidencia); src/app/api/incidents/[id]/history/route.ts:41 (la persona
       ve solo las notas públicas); src/features/manuales-escenas.tsx:20-52 (la
       escena estados dibuja reportes de ejemplo). */
    {
      id: "seguimiento",
      titulo: "Seguir tus reportes",
      resumen: "Dónde ver en qué va cada reporte y qué significa cada estado.",
      icono: "reloj",
      motivo: "hoja",
      bloques: [
        {
          tipo: "texto",
          texto:
            "En «Mis reportes» ves todo lo que el Consejo tiene a tu nombre, sin tope, desde cualquier teléfono, y lo que aún no salió del tuyo. En el teléfono, abre «Cuenta» y toca «Mis reportes», o usa «Ver mis reportes» en «Inicio».",
        },
        {
          tipo: "pantalla",
          escena: "estados",
          pie: "Reportes de ejemplo, inventados: ninguno es de nadie.",
        },
        {
          tipo: "tabla",
          columnas: ["Estado", "Qué significa"],
          filas: [
            ["«Esperando señal»", "Aún no llegó al Consejo; sale solo."],
            ["«Pendiente»", "Llegó y espera revisión."],
            ["«En proceso»", "El Consejo le hace seguimiento."],
            ["«Solucionado»", "Se resolvió."],
            ["«No solucionado»", "Se cerró sin resolverse."],
            [
              "«Descartado»",
              "No era una incidencia, por ejemplo un duplicado. La nota pública dice por qué.",
            ],
            ["«Bloqueado por conflicto»", "Un conflicto impide avanzar."],
            ["«Escalado a otra entidad»", "El Consejo lo pasó a otra entidad."],
          ],
        },
        {
          tipo: "aviso",
          nivel: "consejo",
          titulo: "Abre un reporte",
          texto:
            "Tócalo para abrir «Detalle del reporte». En «Seguimiento», cada paso lleva fecha (hora de Bogotá) y la nota pública del Consejo. Al hablar con el Consejo, dile el código corto de «Identificador».",
        },
      ],
    },

    /* Verificado contra: src/components/workspace.tsx:513-546 (campana y panel
       de novedades), 1211-1213 (reporte retirado); src/features/notifications.tsx:
       63,75,142-144 («Tus novedades», «Marcar todas», «Marcar como leída»);
       src/data/notifications.ts:101,117 (cada 45 s, solo con la app a la
       vista); src/app/api/incidents/route.ts:292 («Tu reporte fue recibido»);
       src/app/api/admin/incidents/[id]/route.ts:231 («El Consejo actualizó tu
       reporte»); src/app/api/admin/incidents/[id]/retirada/route.ts:110,144
       («El Consejo retiró tu reporte»); src/app/api/admin/news/[id]/route.ts:
       70-71 («Nuevo comunicado del Consejo», «Alerta del Consejo»);
       src/features/report.tsx:394 (permiso de avisos al enviar);
       src/features/account.tsx:464 («Avisos en este dispositivo»);
       src/platform/native.ts:133 (cerrar sesión da de baja el aparato). */
    {
      id: "novedades",
      titulo: "Novedades y avisos",
      resumen: "Cómo te enteras de lo que el Consejo hace con tu reporte.",
      icono: "campana",
      motivo: "palma",
      bloques: [
        {
          tipo: "texto",
          texto:
            "La campana de la barra superior muestra un punto cuando tienes algo sin leer. Ábrela para ver «Tus novedades» y límpialas con «Marcar como leída» o «Marcar todas».",
        },
        {
          tipo: "lista",
          items: [
            "**Tu reporte fue recibido:** el servidor ya lo tiene.",
            "**El Consejo actualizó tu reporte:** cambió de estado o dejó una nota pública.",
            "**El Consejo retiró tu reporte:** con el motivo que escribió el Consejo. Al abrirlo, la aplicación dice cuándo se retiró.",
            "**Nuevo comunicado del Consejo** o **Alerta del Consejo:** para toda la comunidad.",
          ],
        },
        {
          tipo: "aviso",
          nivel: "consejo",
          titulo: "También en el teléfono",
          texto:
            "Al enviar un reporte, la aplicación puede pedirte permiso para avisarte en el teléfono. Lo cambias en «Avisos en este dispositivo», dentro de «Mi cuenta».",
        },
        {
          tipo: "aviso",
          nivel: "limite",
          titulo: "No es en tiempo real",
          texto:
            "Con la aplicación a la vista, las novedades se consultan cada 45 segundos. Sin señal llegan al volver la red.",
        },
        {
          tipo: "aviso",
          nivel: "privacidad",
          titulo: "Si prestas el teléfono",
          texto: "Al cerrar sesión, ese teléfono deja de recibir tus avisos.",
        },
      ],
    },

    /* Verificado contra: src/features/terminos.tsx:49-96 (qué se pide y quién
       ve qué); src/server/community-view.ts:50-87 (la comunidad ve título,
       resumen, vereda, categoría, estado y fecha; nunca relato, foto ni
       contacto; lo sensible nunca); src/domain/publication.ts:3 (24 horas por
       defecto, configurable en el servidor entre 1 y 720); src/app/api/
       community/reports/route.ts:20 (solo con sesión y perfil activo);
       src/app/api/admin/incidents/[id]/route.ts:56 (resumen de hasta 30
       palabras que aprueba el Consejo); src/features/report.tsx:949-956
       (casilla sensible); src/data/community-map.ts:27,91 (la comunidad ve la
       vereda, no el punto); src/features/welcome.tsx:187 («Privacidad, alcance
       y mantenimiento»); docs/seguridad-y-privacidad.md §1 y §5. No se pudo
       comprobar el plazo configurado en producción. */
    {
      id: "privacidad",
      titulo: "Qué ve la comunidad y qué no",
      resumen:
        "Tu reporte nace privado. Esto es lo único que puede salir de él.",
      icono: "escudo",
      motivo: "manglar",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Léelo antes de tu primer reporte. **Nada de lo que escribes se publica por sí solo.** La comunidad ve, a lo sumo, un resumen que escribe y aprueba el Consejo.",
        },
        {
          tipo: "flujo",
          etapas: [
            {
              icono: "candado",
              titulo: "Relato privado",
              texto:
                "Tu texto, tus fotos y tu celular quedan entre tú y el Consejo.",
            },
            {
              icono: "ojo",
              titulo: "Revisión del Consejo",
              texto: "Mira si hay algo sensible. Si lo hay, ahí termina.",
            },
            {
              icono: "documento",
              titulo: "Resumen público",
              texto:
                "Un resumen sin datos personales, visible 24 horas después de aprobarlo.",
            },
          ],
        },
        {
          tipo: "tabla",
          columnas: ["Dato", "Quién lo ve"],
          filas: [
            ["Tu relato, tal como lo escribiste", "Tú y el Consejo"],
            ["Las fotografías y tu celular", "Tú y el Consejo"],
            ["El punto exacto que marcaste", "Tú y el Consejo"],
            ["Tu nombre y tu correo", "No se publican nunca"],
            ["Las notas internas", "Solo el Consejo"],
            [
              "El resumen: título, texto, categoría, vereda, estado y fecha",
              "Quien tenga cuenta, 24 horas después",
            ],
          ],
        },
        {
          tipo: "aviso",
          nivel: "privacidad",
          titulo: "Si no quieres que conste",
          texto:
            "Marca «Contiene imágenes o información sensible» en «Detalles»: no se publica de ninguna forma, ni revisado. El Consejo también puede marcarlo después y lo retira. Si dudas, márcalo; el Consejo lo recibe igual.",
        },
        {
          tipo: "aviso",
          nivel: "limite",
          titulo: "El resumen es del Consejo",
          texto:
            "Solo lo ven quienes tienen cuenta. El plazo lo fija el servidor; la aplicación indica 24 horas. Más en «Privacidad, alcance y mantenimiento», en la bienvenida.",
        },
      ],
    },

    /* Verificado contra: src/components/community-nav.tsx:7-13 (pestañas
       «Noticias», «Reportes», «Estadísticas», «El Consejo»);
       src/components/workspace.tsx:772-783 (el mapa sin sesión no muestra
       puntos), 1317 (resúmenes 24 horas después de su aprobación);
       src/features/territory.tsx:318,398,403 (mapa, «sin ubicación en el mapa»,
       mapa base con conexión); src/data/community-map.ts:27,91 (los puntos de
       otras personas van en la vereda); src/features/community-feed.tsx:130
       (comunicados y copia sin señal); src/features/statistics.tsx:325,333,
       627,642 (cifras con sesión; «Descargar informe», «Datos en CSV»;
       participación, no censo); src/features/council-memory.tsx:108,138,323,
       461-462 (archivo de consulta, fuentes públicas, no es asesoría jurídica,
       sin actas privadas, avisa si un enlace no abre);
       docs/banco-consulta-consejo.md (sin red se lee lo ya guardado). */
    {
      id: "territorio",
      titulo: "El mapa, la comunidad y el Consejo",
      resumen: "Qué encuentras en las secciones para mirar el territorio.",
      icono: "mapa",
      motivo: "atarraya",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Estas secciones no hacen falta para reportar, pero ayudan a entender el río. Reportes, cifras y puntos del mapa piden entrar.",
        },
        {
          tipo: "tarjetas",
          tarjetas: [
            {
              icono: "mapa",
              titulo: "Mapa del territorio",
              texto:
                "Tus reportes y los que la comunidad puede ver; los ajenos, en su vereda y no en el sitio exacto.",
            },
            {
              icono: "megafono",
              titulo: "Noticias",
              texto:
                "Comunicados del Consejo. Si los abres con señal, luego se leen sin ella.",
            },
            {
              icono: "usuarios",
              titulo: "Reportes",
              texto: "Resúmenes del Consejo, 24 horas después de aprobarlos.",
            },
            {
              icono: "grafico",
              titulo: "Estadísticas",
              texto:
                "Cifras del territorio, con informe y datos en CSV. Miden participación, no son un censo.",
            },
          ],
        },
        {
          tipo: "texto",
          texto:
            "En «Comunidad», la pestaña «El Consejo» es un archivo de consulta: por qué existe, línea de tiempo, organización, derechos, territorio y fuentes.",
        },
        {
          tipo: "aviso",
          nivel: "limite",
          titulo: "Consulta, no certificado",
          texto:
            "Reúne fuentes públicas con su enlace. No es asesoría jurídica ni un archivo de actas privadas, y la comunidad aún no lo valida. Si un enlace no abre, avisa al Consejo.",
        },
      ],
    },

    /* Verificado contra: src/features/account.tsx:229-566 (pantalla: avatar,
       nombre, «Guardar perfil», «Apariencia», «Avisos en este dispositivo»,
       permisos), 246,282,329,410,452,464,477-478; src/features/
       avatar-picker.tsx:8-13,108,118 (avatares y «Subir una foto»);
       src/features/password-change.tsx:27,34 (12 caracteres o más);
       src/features/delete-account.tsx:17,42,87,129 (frase, bloqueo con envíos
       pendientes, aviso de lo que se borra); src/app/api/account/deletion/
       route.ts:27; src/server/anonymize.ts:56-125 (se borra la fotografía del
       archivo privado; se retiran relato y teléfono; quedan categoría,
       vereda, estado y fechas; NO se tocan incidentEvidence/{id} ni
       veredaProposals); src/app/api/incidents/route.ts:309-326 (copia reducida
       de respaldo). Si se corrige el borrado, quitar el aviso titulado Lo que
       no se borra. */
    {
      id: "cuenta",
      titulo: "Mi cuenta",
      resumen: "Tu perfil, tus avisos y cómo cerrar o eliminar la cuenta.",
      icono: "usuario",
      motivo: "brote",
      bloques: [
        {
          tipo: "texto",
          texto:
            "En el teléfono, toca «Cuenta»; en pantalla grande, tu nombre al final del menú. Allí está «Mi cuenta».",
        },
        {
          tipo: "lista",
          items: [
            "**Foto:** toca tu avatar y elige «Persona», «Árbol», «Río», «Hogar» o «Subir una foto». Se recorta en cuadrado y se reduce en tu teléfono. Confirma con «Guardar perfil».",
            "**Nombre:** toca el lápiz. El correo no se cambia aquí.",
            "**Tema y avisos:** «Apariencia» (claro u oscuro) y «Avisos en este dispositivo».",
            "**Permisos:** «Micrófono para dictar» y «Ubicación para tus reportes» se piden aquí; si están bloqueados, se cambian en los ajustes.",
            "**Contraseña**, con correo: «Cambiar contraseña de forma segura» pide la actual y la nueva, de 12 caracteres o más.",
          ],
        },
        {
          tipo: "pasos",
          titulo: "Eliminar mi cuenta",
          pasos: [
            {
              texto: "Revisa que no queden envíos pendientes.",
              detalle: "Con pendientes, la aplicación no te deja eliminarla.",
            },
            {
              texto:
                "Abre «Eliminar mi cuenta» y escribe tu contraseña, o confirma con Google.",
            },
            {
              texto:
                "Escribe **ELIMINAR MI CUENTA**, marca la casilla y toca «Eliminar mi cuenta definitivamente».",
            },
          ],
        },
        {
          tipo: "aviso",
          nivel: "ojo",
          titulo: "No se puede deshacer",
          texto:
            "Pierdes el acceso, se borran tus fotografías —también la copia reducida que guarda el servidor—, el punto que marcaste y las notas del seguimiento, y tus reportes quedan sin datos que te identifiquen. Tampoco quedan tus aportes de ubicación para situar veredas. El Consejo conserva categoría, vereda, estado y fechas para las cifras.",
        },
      ],
    },

    /* Verificado contra: src/server/admin-auth.ts:115,125 (perfil inactivo o
       deshabilitado); src/features/outbox.tsx:300,327 («Requiere tu atención»,
       «Reintentar ahora»); src/features/access.tsx:179-197,415 («Olvidé mi
       contraseña»), 140 (envío con la app cerrada no está listo);
       src/features/report.tsx:582. */
    {
      id: "fallas",
      titulo: "Si algo falla",
      resumen: "Qué hacer con los problemas más comunes, y palabras útiles.",
      icono: "pregunta",
      motivo: "monte",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Casi todo se arregla con señal y un nuevo intento. Si no, esto es lo más probable.",
        },
        {
          tipo: "preguntas",
          items: [
            {
              pregunta: "Dice que mi perfil no está activo",
              respuesta:
                "Verifica el correo y vuelve a abrir la aplicación. Si sigue igual, toca «Activar mi perfil» en «Mi cuenta». Si dice que la cuenta está deshabilitada, avisa al Consejo Comunitario.",
            },
            {
              pregunta: "Un envío no sale",
              respuesta:
                "Revisa la señal y toca «Reintentar ahora». Si dice «Requiere tu atención», lee el mensaje: explica qué corregir.",
            },
            {
              pregunta: "Olvidé mi contraseña",
              respuesta:
                "En la pantalla de acceso toca «Olvidé mi contraseña»: te llega un correo para recuperarla.",
            },
            {
              pregunta: "Dice que el envío con la app cerrada no está listo",
              respuesta:
                "Vuelve a entrar a tu cuenta con conexión. Mientras tanto, el reporte se reintenta al abrir la app.",
            },
            {
              pregunta: "Otro problema",
              respuesta:
                "Anota la hora, qué hacías y el mensaje exacto, y cuéntaselo al Consejo Comunitario.",
            },
          ],
        },
        {
          tipo: "glosario",
          terminos: [
            {
              termino: "Expediente",
              significado: "Tu reporte y todo lo que el Consejo hace con él.",
            },
            {
              termino: "Bandeja de salida",
              significado:
                "Donde esperan, en tu teléfono, los reportes que no han salido.",
            },
            {
              termino: "Recibo",
              significado:
                "Constancia, con fecha, de que el servidor recibió tu reporte.",
            },
            {
              termino: "Resumen público",
              significado:
                "Texto del Consejo para la comunidad, sin datos personales.",
            },
          ],
        },
      ],
    },
  ],
  cierre: {
    titulo: "Gracias por cuidar lo que nos une",
    texto:
      "Un reporte claro es el primer paso. La aplicación guarda, envía y muestra; las decisiones las toma el Consejo. Este manual se comprobó el 21 de octubre de 2026: si algo ya no coincide con tu pantalla, avisa al Consejo Comunitario.",
  },
};
