export const knowledgeSections = [
  {
    id: "flujo",
    title: "Entradas, procesos y salidas",
    summary: "Cómo se transforma un reporte en información útil.",
    entries: [
      {
        question: "¿Cómo se usa la nueva asistencia de redacción?",
        answer: "En Reportar, completa la descripción y abre Mejorar redacción con IA. La función solicita sesión, correo verificado y perfil ciudadano activo. Envía únicamente el relato a OpenRouter y permite comparar la propuesta con el original. No modifica el reporte hasta que aceptas y bloquea la aceptación si editaste el texto mientras esperaba. Máximo diez intentos diarios por usuario (UTC), separados por un minuto. La conexión completa depende de las credenciales privadas del servidor; un fallo conserva tu texto. La calidad de las sugerencias aún requiere evaluación comunitaria.",
      },
      {
        question: "¿Cómo funciona el dictado de voz?",
        answer:
          "En los detalles del reporte puedes activar el micrófono por hasta un minuto, detenerlo y revisar la transcripción. El texto aparece directamente en Descripción, conservando lo escrito antes del dictado. Al detener puedes editarlo o deshacer el último dictado si aún no lo modificaste. Requiere un navegador compatible, permiso de micrófono y conexión; el navegador puede procesar el audio en su proveedor de voz. Mi Pueblo Digital no guarda el audio. Si falla, puedes continuar escribiendo. La exactitud del reconocimiento debe validarse con hablantes de la comunidad antes del piloto.",
      },
      {
        question: "¿Qué entra al sistema?",
        answer:
          "Categoría, vereda, descripción de hasta 500 palabras y al menos una foto. El celular es opcional. La ubicación debe revisarse y nunca se debe inventar cuando el GPS falla. El reporte viaja al servidor del Consejo y vuelve con un recibo con fecha; si no hay señal espera en la bandeja de salida y sale solo al recuperarla. Mientras tanto se conserva completo en el dispositivo, con su fotografía.",
      },
      {
        question: "¿Qué procesos realiza?",
        answer:
          "Valida los campos, conserva un borrador, prepara evidencia y confirma el envío. El servidor comprueba identidad y perfil activo, verifica la fotografía decodificándola entera, la guarda en el archivo privado y crea el expediente dentro de una transacción con una clave propia: reenviar el mismo reporte nunca crea dos. Desde ahí el Consejo asigna responsable, documenta cada actuación y cambia el estado con motivo, y todo queda en el historial con quién lo hizo y cuándo.",
      },
      {
        question: "¿Qué salidas produce?",
        answer:
          "Un identificador de seguimiento, el recibo del servidor con su fecha, el historial de actuaciones del Consejo, los avisos a quien reportó y las estadísticas del conjunto autorizado. Guardado en el dispositivo y recibido por el Consejo son dos cosas distintas, y la aplicación nunca las confunde: hasta que no llega el recibo, el reporte se lee como pendiente de salir.",
      },
      {
        question: "¿Qué entra y sale del análisis estadístico?",
        answer:
          "Las estadísticas de la pantalla respetan los filtros y calculan conteos, tasa de solución, casos sin responsable y medianas de espera. El Panel del Consejo añade una consulta al servidor sobre todo el territorio: reparto por estado, categoría, vereda y prioridad, lo abierto sin responsable, lo que lleva más tiempo esperando, lo que se tarda en cerrar y lo que se pasó de plazo. De ahí sale también el borrador de OpenRouter, que recibe esas cifras y las notas públicas con las que el Consejo cerró sus últimos casos; nunca un relato, un teléfono, una cuenta ni una nota interna. Requiere rol del Consejo y las credenciales privadas del servidor.",
      },
    ],
  },
  {
    id: "mapa",
    title: "Mapa y volumen de reportes",
    summary: "300 reportes en un punto siguen siendo 300 casos.",
    entries: [
      {
        question: "¿Qué pasa si hay 300 incidencias en el mismo punto?",
        answer:
          "Un marcador muestra el total. Al abrirlo, una lista permite filtrar y recorrer páginas de 25 casos sin perder identificadores. Acercar el mapa no separa coordenadas idénticas. Una prueba automática recorre un escenario reproducible de 300 casos en las mismas coordenadas; es una comprobación del agrupador, no un registro del territorio.",
      },
      {
        question: "¿Un grupo de puntos significa que son duplicados?",
        answer:
          "No. Agrupar es una decisión de visualización, no una fusión de expedientes. Dos personas pueden reportar hechos diferentes en el mismo lugar. La detección de posibles duplicados solo puede proponer una revisión humana, manteniendo autores, evidencias e historial.",
      },
      {
        question: "¿Qué pasa con miles de reportes?",
        answer:
          "El mapa agrupa en memoria lo que ya trajo: los reportes de la comunidad llegan por la ruta pública y los de este dispositivo salen de su propio almacén. Esa prueba de 300 no demuestra capacidad ilimitada ni rendimiento de red. Cuando el volumen lo pida, habrá que consultar por área visible y fecha, agrupar en el servidor y paginar con cursores; queda por medir con 1.000, 10.000 y 50.000 registros.",
      },
      {
        question: "¿Qué pasa si falta señal o el mapa no carga?",
        answer:
          "La lista sigue siendo el acceso alternativo y los borradores persisten sin mapa. El mapa base necesita red y tiene condiciones de uso: no se promete cartografía sin conexión. Reportar no depende de él: la vereda se elige de un catálogo con buscador, y el punto exacto es opcional. Sin él, el expediente viaja con el nombre de la vereda y se sitúa en su punto documentado, lo que la pantalla dice en vez de callarlo.",
      },
    ],
  },
  {
    id: "variantes",
    title: "Variantes y recuperación",
    summary: "Qué hacer cuando el recorrido no sale como se esperaba.",
    entries: [
      {
        question: "¿Qué pasa si se pierde señal al enviar?",
        answer:
          "El reporte entra en la bandeja del dispositivo con una clave propia y se reintenta solo: al volver la señal, al abrir la aplicación con tu sesión y cada medio minuto mientras la tengas delante. El servidor responde con un recibo y esa misma clave nunca crea dos expedientes, así que reintentar es seguro. Si el envío sale mientras usas otra cosa, la aplicación te lo dice al volver, y con permiso concedido también con un aviso del sistema. Caben 10 reportes o 50 MB y se conservan aunque cierres el navegador; se pierden si borras los datos del sitio. Con la aplicación cerrada del todo el envío espera a que la abras: el service worker no guarda tu sesión y sin ella no puede transmitir por ti. Un borrador es otra cosa y conviene no confundirlos: el de la bandeja de salida ya lo enviaste y sale solo; el borrador espera a que tú lo mandes, aparece como tal en Mis reportes y no sale nunca por su cuenta.",
      },
      {
        question: "¿Qué ven los demás de mi reporte?",
        answer:
          "En dos niveles, y conviene leerlo entero. Pasado el plazo, si nadie lo marcó como delicado, tu reporte consta ante la comunidad tal como lo escribiste: tu título y tu relato, con la categoría, la vereda, el estado y la fecha. Cada tarjeta advierte que ese texto no lo ha revisado nadie todavía. Cuando el Consejo estudia el caso y lo declara seguro, redacta un título y un resumen públicos y esa versión reemplaza a la anterior. La fotografía no entra en ninguno de los dos niveles: la ven quien reportó y el Consejo, y nadie más. Marcarlo como sensible lo saca de los dos, y pueden hacerlo tanto quien reporta al enviarlo como el Consejo en cualquier momento. El plazo se configura en el servidor entre 1 y 720 horas; por defecto 24.",
      },
      {
        question: "¿Por qué dice que mi cuenta no está habilitada?",
        answer:
          "Enviar al Consejo exige, además de la sesión, un perfil ciudadano activo en el servidor. Se crea solo al abrir la aplicación, sin necesidad de verificar el correo, así que lo normal es no tener que hacer nada. Si el aviso sigue, en Mi cuenta aparece «Activar mi perfil». Otra cosa es que diga que la cuenta está deshabilitada: eso es una decisión del Consejo y no se resuelve desde la aplicación. El perfil no da rol de administrador. Ese se concede por dos caminos: desde el Panel del Consejo, que lo sella en el token de la persona, o escribiendo `role: \"admin\"` en su documento de cuenta desde la consola de la base. El segundo surte efecto en cuanto vuelve a abrir la aplicación; el primero, al renovarse su token, lo que ocurre en menos de una hora o de inmediato si cierra sesión y vuelve a entrar. Escribir en la cuenta es seguro porque las reglas de Firestore prohíben a todo cliente tocar esos documentos: solo llegan ahí el servidor y la consola del proyecto.",
      },
      {
        question: "¿Y si dos administradores editan el mismo caso?",
        answer:
          "El servidor compara versiones dentro de una transacción: si alguien guardó antes, el segundo cambio recibe un conflicto en vez de pisarlo, y la nota escrita se conserva para poder repetirla sobre la versión nueva. Lo mismo ocurre en la gestión que se queda en el dispositivo, sobre su propio almacén. La comprobación que cuenta es la del servidor, junto con el rol: el navegador no es una barrera de seguridad.",
      },
      {
        question:
          "¿Y si una imagen es demasiado grande o el dispositivo se llena?",
        answer:
          "Se conserva el archivo original como Base64 sin recomprimir: JPG, PNG o WebP de hasta 10 MiB y 24 megapíxeles. Si excede los límites se solicita otro archivo. Si falla el guardado por cuota no se muestra éxito. Las fotografías no se publican nunca: no entran en ninguno de los dos niveles del historial comunitario. Solo las ven quien reportó y el Consejo. El original se guarda en el archivo externo; junto al expediente queda además una copia reducida a 1600 píxeles, para que el caso siga pudiéndose mirar si ese archivo no responde. Cuando se sirve la copia en lugar del original, la respuesta lo declara.",
      },
      {
        question: "¿Dónde se guardan las fotografías y pierden calidad?",
        answer:
          "El original viaja entero y sin recomprimir a una tabla privada de Supabase, en Base64, que conserva los bytes y sus metadatos; no es cifrado y aumenta el tamaño alrededor de un tercio. El servidor compara SHA-256 antes y después de guardar, y el dispositivo conserva su copia hasta que llega el recibo. Va en tabla aparte porque Firestore limita cada documento a 1 MiB, y junto al expediente queda una copia reducida por si ese archivo externo no responde; cuando se sirve esa copia, la respuesta lo declara. Los listados y las estadísticas consultan solo metadatos: ninguna pantalla que liste expedientes descarga una fotografía.",
      },
      {
        question: "¿Qué ocurre con un reporte privado o una cuenta eliminada?",
        answer:
          "Lo público se arma campo a campo, nunca esparciendo el documento: una prueba comprueba que el teléfono, la cuenta de quien reportó y el identificador de la evidencia no salen nunca. Al pedir la eliminación, el servidor corta el acceso, sustituye a la persona por un seudónimo, borra el relato, el teléfono, sus avisos y sus registros de envío, y conserva categoría, vereda, estado y fechas para que las estadísticas de la comunidad sigan siendo ciertas. Si el proceso queda a medias lo dice como parcial, en vez de darlo por hecho. Ocultar un botón nunca fue una medida de autorización.",
      },
    ],
  },
  {
    id: "ia",
    title: "IA y estadísticas responsables",
    summary: "Explicar los datos sin inventar hechos ni causas.",
    entries: [
      {
        question: "¿Dónde interviene la IA y dónde no?",
        answer:
          "En tres sitios, y en ninguno decide. Al redactar un reporte corrige ortografía y claridad del relato de quien reporta, que puede deshacer el cambio. En Estadísticas une los hallazgos ya calculados en un párrafo para leer en asamblea; esa función es solo del Consejo. Y en el Panel propone un borrador de lectura a partir de las cifras de todo el territorio y de las notas con las que el Consejo cerró sus últimos casos. Las cifras no las hace ningún modelo: se calculan y se muestran aparte, y son la versión que manda.",
      },
      {
        question: "¿Qué sale del territorio cuando se usa la IA?",
        answer:
          "Solo lo necesario, y nunca un expediente. En el formulario viaja la descripción que se está escribiendo. En Estadísticas, las frases de los hallazgos sin el título de ningún caso: el título lo escribe quien reporta y puede llevar un nombre propio. En el Panel, las cifras y las notas públicas con las que el Consejo cerró casos, que escribió el Consejo y no quien reportó. No salen nunca fotografías, teléfonos, cuentas, relatos ni notas internas: la nota interna existe justamente para lo que no se cuenta fuera. Cada función declara en pantalla lo que envía antes de enviarlo, y una prueba comprueba que nada más viaja.",
      },
      {
        question: "¿Quién puede usarla y con qué límites?",
        answer:
          "Requiere sesión con correo verificado. La redacción de la lectura estadística exige además rol del Consejo, y el servidor la rechaza para cualquier otra cuenta aunque la petición llegue por fuera de la aplicación. Hay un uso por minuto y diez al día por cuenta. Si el proveedor falla, se avisa y el texto calculado o escrito por la persona se conserva intacto.",
      },
      {
        question: "¿Cómo evitamos que invente cifras?",
        answer:
          "Separando el cálculo de la redacción. Los conteos y la lectura del conjunto se calculan sin modelo y se muestran aparte; el borrador de la bandeja se rechaza si contiene dígitos o el símbolo de porcentaje, y la redacción de la lectura se descarta si vuelve más larga que los hallazgos enviados, porque esa es la señal de que agregó de su cosecha. Un párrafo redactado por IA va siempre rotulado y debajo de la versión calculada: si las dos no coinciden, la que vale es la calculada. Nada de esto sustituye la revisión de una persona.",
      },
      {
        question: "¿La aplicación trae reportes de ejemplo?",
        answer:
          "Ya no. Hubo doce fabricados que poblaban el mapa, las estadísticas y el historial; servían para enseñar la aplicación vacía, pero en producción un vecino podía leerlos como incidencias de su propio territorio. Lo que se muestra ahora es lo que la comunidad reportó: nada, hasta que alguien reporte. Lo guardado en el dispositivo se rotula como tal y no acredita una actuación del Consejo.",
      },
      {
        question: "¿Más reportes significa más problemas reales?",
        answer:
          "No necesariamente. Puede reflejar mejor conectividad, difusión o participación. Los registros no representan a todas las personas del territorio. Una asociación temporal no demuestra causalidad; los resultados deben indicar cobertura, periodo, tamaño de muestra y sesgo de participación.",
      },
      {
        question: "¿Puede leer notas internas para una respuesta pública?",
        answer:
          "No deben mezclarse fuentes internas con el contexto de una respuesta pública. El backend debe seleccionar solo los datos autorizados para cada operación, no pedir al modelo que oculte información a la que no debía acceder.",
      },
    ],
  },
  {
    id: "operacion",
    title: "Mantenimiento y continuidad",
    summary: "Responsables, presupuesto y entrega sostenible.",
    entries: [
      {
        question: "¿Quién mantendrá la app después de la entrega?",
        answer:
          "Propuesta: el Consejo será responsable funcional y titular de las cuentas del servicio; deberá designar o contratar un mantenedor técnico. Ese nombramiento aún debe acordarse. No existe un compromiso indefinido de los estudiantes. La entrega requiere responsable nominal, presupuesto y procedimiento de soporte.",
      },
      {
        question: "¿Qué hará cada responsable?",
        answer:
          "El administrador comunitario clasifica, asigna y responde casos. El responsable funcional define publicación y prioridades. El mantenedor técnico atiende fallos, dependencias, copias, restauración y despliegues. El Consejo aprueba presupuesto y continuidad. Una entidad escalada no recibe acceso automático a todo el sistema.",
      },
      {
        question: "¿Qué gastos debemos prever?",
        answer:
          "Dominio, consumo de base de datos, almacenamiento y transferencia de fotos, funciones, IA y mantenimiento humano. No se promete gratuidad permanente. Antes del piloto se fijarán cuotas, alertas de consumo, límites por usuario y presupuesto mensual según tarifas y volumen medidos.",
      },
      {
        question: "¿Qué se entrega y cómo se recupera una falla?",
        answer:
          "Repositorio, manuales, configuración documentada, inventario de cuentas, acceso institucional y copia verificable. Probar una restauración en entorno separado; registrar cuándo se recuperó el último respaldo. Propuesta inicial a acordar: respaldo diario, revisión mensual de dependencias y simulacro trimestral de recuperación.",
      },
    ],
  },
  {
    id: "frecuentes",
    title: "Preguntas frecuentes",
    summary: "Lo que suele preguntarse, respondido con evidencia.",
    entries: [
      {
        question: "¿Qué problema resuelve frente a WhatsApp?",
        answer:
          "Centraliza categoría, ubicación, evidencia, responsable e historial en un expediente consultable. No garantiza resolver materialmente el problema; permite organizar la atención y documentar decisiones que en mensajes dispersos son difíciles de seguir.",
      },
      {
        question: "¿Por qué una PWA y una aplicación híbrida?",
        answer:
          "Una sola interfaz para el navegador y el teléfono: se instala desde el navegador, funciona sin señal y se actualiza sola, sin pasar por una tienda. El empaquetado con Capacitor está pendiente y es lo que daría acceso a lo que el navegador no alcanza, empezando por las notificaciones del sistema. No se afirma equivalencia total: cámara, avisos, almacenamiento y acceso con Google se comportan distinto en cada plataforma y hay que probarlos en cada una.",
      },
      {
        question: "¿Qué está funcionando hoy y qué falta?",
        answer:
          "Funcionan la sesión con Firebase, los expedientes con su historial y sus avisos en el servidor, la bandeja de salida con recibo, el archivo privado de fotografías con copia de respaldo, el mapa del territorio, las estadísticas con su informe y su tablero de gestión, los comunicados con portada e imágenes, la publicación comunitaria por plazo o por revisión, la administración de roles desde el propio panel y la asistencia de IA por OpenRouter. Sin señal se reporta, se lee lo guardado y se consultan los últimos comunicados. Falta el empaquetado móvil con Capacitor, las notificaciones del sistema y el piloto con la comunidad; quedan pendientes de acta la validación del catálogo territorial por el Consejo y el ensayo de recuperación de respaldos. Cada integración se acredita con pruebas automáticas, no con el aspecto de la pantalla.",
      },
      {
        question: "¿Cómo demuestran que no se pierden reportes?",
        answer:
          "Con pruebas de reinicio, caída de red en cada etapa, cuota agotada, reintento y confirmación duplicada. En el dispositivo: clave estable, reserva entre pestañas, espera progresiva y liberación de la fotografía solo cuando llega el recibo. En el servidor: la misma clave nunca crea dos expedientes, la fotografía se verifica decodificándola entera antes de aceptarla y el expediente se crea en una transacción con su recibo. Lo que falta medir es el comportamiento con redes reales del río durante semanas, y eso solo lo dice el piloto.",
      },
      {
        question: "¿Qué porcentaje de éxito tienen las pruebas?",
        answer:
          "Todas pasan, o no se publica: la compilación se detiene si alguna falla. Son pruebas de unidad sobre las reglas que no se ven —quién puede publicar qué, qué sale hacia la IA, qué conserva la bandeja sin señal— y pruebas de extremo a extremo que recorren la aplicación en un navegador de verdad, incluido el modo sin conexión. Lo que no cubren, y conviene decirlo: no miden carga, no prueban dispositivos reales del territorio y no sustituyen el piloto con la comunidad.",
      },
      {
        question: "¿Cómo se validará la usabilidad?",
        answer:
          "Con habitantes y responsables del Consejo realizando tareas concretas: reportar, recuperar borrador, consultar seguimiento y gestionar un caso. Registrar finalización sin ayuda, errores, tiempos y valoración; aún no se ha ejecutado ese piloto.",
      },
      {
        question: "¿Quién decide la prioridad y el cierre?",
        answer:
          "El administrador autorizado siguiendo lineamientos del Consejo, con motivo e historial. La IA no toma esa decisión. Los criterios de atención y escalamiento deben acordarse antes de operar.",
      },
      {
        question: "¿Qué hacen si la IA falla o resulta costosa?",
        answer:
          "Reportar y consultar funcionan sin IA, y así seguirá. Hay cuota por cuenta, espera máxima y, cuando el modelo no responde, se avisa y el texto escrito por la persona queda intacto: ningún reporte se pierde porque un proveedor falle. Las cifras nunca dependen del modelo, se calculan aparte. Solo se admiten modelos gratuitos; el servidor rechaza cualquier otro, así que la factura no puede crecer sin que alguien cambie la configuración a propósito.",
      },
      {
        question: "¿Cómo protegen al denunciante?",
        answer:
          "La fotografía no se publica nunca y la coordenada exacta tampoco sale del servidor: en el mapa de la comunidad, un caso se sitúa en el punto documentado de su vereda, porque en un territorio de casas dispersas un punto preciso señala una casa. Quien reporta puede marcar su caso como delicado al enviarlo, y entonces no consta ante nadie más que el Consejo; el Consejo puede marcarlo después. El acceso se comprueba en el servidor, no en la pantalla. Lo que queda por acordar en acta con el Consejo es el plazo de publicación y los criterios para declarar un caso seguro.",
      },
      {
        question: "¿Qué ocurre si el equipo de estudiantes se retira?",
        answer:
          "La aplicación se instala desde su repositorio con una instalación reproducible y la configuración documentada archivo por archivo. Lo que no depende del código: las cuentas de los servicios tienen que quedar a nombre del Consejo y hay que designar a quien las mantenga. Sin esas dos cosas, la continuidad no está garantizada por mucho que el código funcione, y no conviene decir lo contrario.",
      },
      {
        question: "¿Por qué usar dos proveedores de backend?",
        answer:
          "La identidad y los expedientes están en Firebase; las fotografías, en una tabla privada de Supabase. Se separan porque Firestore limita cada documento a un megabyte y una fotografía de teléfono no cabe. El coste es operar dos servicios y que ninguno de los dos hable con el navegador por su cuenta: las claves no salen del servidor. Por si el archivo externo se pausa —los proyectos gratuitos se pausan solos tras días sin uso—, junto a cada expediente queda una copia reducida, y la respuesta declara cuándo sirve esa copia en lugar del original.",
      },
      {
        question: "¿Cómo saben que el mapa escala?",
        answer:
          "Una prueba automática recorre 300 casos en las mismas coordenadas y comprueba que el agrupador no pierde ninguno y que la lista se puede paginar. Eso prueba el agrupador, no el sistema: falta medir con miles de registros, con dispositivos del territorio y con sus redes. No se extrapola esa prueba a un número ilimitado de personas usándola a la vez.",
      },
    ],
  },
];
