# Catálogo de pruebas automatizadas

Inventario generado a partir de los nombres que reportan Vitest y Playwright. **Aparecer en el catálogo no significa que una prueba de navegador se haya ejecutado**: Playwright se consultó con `--list`. Los resultados de ejecución se registran por separado en [Pruebas y rendimiento](pruebas-y-rendimiento.md).

- Unitarias: **459 casos en 54 archivos**; estado del reporte usado: 459 pasan, 0 fallan, 0 pendientes.
- Navegador: **76 casos en 16 archivos** registrados por Playwright.

## Vitest: lógica, datos y rutas

### [tests/unit/account-reports.test.ts](../tests/unit/account-reports.test.ts) — 8 casos

- el historial es de la cuenta, no del teléfono trae del servidor lo que este dispositivo no tiene
- el historial es de la cuenta, no del teléfono no repite el que ya está aquí, y conserva la copia local con su foto
- el historial es de la cuenta, no del teléfono mantiene lo que aún no ha salido de este dispositivo
- el historial es de la cuenta, no del teléfono ordena del más reciente al más antiguo
- el servidor manda en el estado; el aparato, en lo suyo
- un reporte que el servidor ya no tiene se señala para quitarlo de aquí
- lo que todavía no ha salido nunca se señala
- con el servidor al día no se señala nada

### [tests/unit/activation.test.ts](../tests/unit/activation.test.ts) — 3 casos

- activación ignora rol e identidad del cuerpo
- activación no restaura cuentas deshabilitadas
- activación no exige correo verificado

### [tests/unit/admin.test.ts](../tests/unit/admin.test.ts) — 2 casos

- registra cambio y repetir operación no duplica historial
- rechaza versión antigua y notas de más de 30 palabras

### [tests/unit/anonymize.test.ts](../tests/unit/anonymize.test.ts) — 4 casos

- anonimización de cuenta retira los datos personales y conserva la trazabilidad comunitaria
- anonimización de cuenta no toca los expedientes de otras personas
- anonimización de cuenta repetirla no cambia el resultado
- anonimización de cuenta marca incompleta la eliminación si el archivo privado falla

### [tests/unit/auth.test.ts](../tests/unit/auth.test.ts) — 3 casos

- registro valida nombre, longitud y confirmación
- errores no revelan existencia de cuentas
- una cuenta cerrada manda al Consejo, no a recuperar la contraseña

### [tests/unit/calendar.test.ts](../tests/unit/calendar.test.ts) — 8 casos

- el día se calcula en Bogotá, no UTC
- febrero bisiesto tiene 29 días
- cuándo reporta la comunidad reparte por día de la semana empezando el lunes
- cuándo reporta la comunidad mide cada día contra el más movido, no contra el total
- cuándo reporta la comunidad sin reportes no divide por cero
- cuándo reporta la comunidad descarta fechas que no lo son en vez de contarlas mal
- la fecha como se dice en voz alta escribe el día con su nombre y no el formato de la base
- la fecha como se dice en voz alta devuelve lo recibido si no es una fecha

### [tests/unit/community-projection.test.ts](../tests/unit/community-projection.test.ts) — 9 casos

- el relato original nunca se publica automáticamente
- nunca salen el teléfono, el dueño ni la evidencia
- lo marcado como delicado no consta de ninguna manera
- el resumen del Consejo reemplaza al automático
- un caso revisado hoy espera 24 horas
- sin revisar, lo recién llegado sigue esperando su plazo
- marcarlo como delicado lo retira aunque ya tuviera resumen publicado
- un caso resuelto después de publicarse se lee resuelto
- deja constar todos los finales, incluido el descartado

### [tests/unit/council-alerts.test.ts](../tests/unit/council-alerts.test.ts) — 5 casos

- lo que no tiene dueño va primero y es lo único accionable hoy
- un plazo vencido se señala con su prioridad
- no habla de proporciones con un conjunto diminuto
- cuando no hay nada que señalar, lo dice
- una categoría que se cierra bien se señala para copiarla

### [tests/unit/council-history-api.test.ts](../tests/unit/council-history-api.test.ts) — 4 casos

- guarda y audita con versión confirmada y autor del servidor
- rechaza versiones antiguas sin sobrescribir
- rechaza al no administrador antes de escribir
- valida contenido e identificador antes de escribir

### [tests/unit/council-history.test.ts](../tests/unit/council-history.test.ts) — 20 casos

- archivo histórico del Consejo inserta hechos antiguos por fecha y no por orden de carga
- archivo histórico del Consejo archivar una semilla no hace reaparecer su copia original
- archivo histórico del Consejo los borradores no salen en la lectura pública
- archivo histórico del Consejo editar una semilla reemplaza su contenido sin duplicarla
- archivo histórico del Consejo ordena precisión parcial y hora local sin convertir husos horarios
- archivo histórico del Consejo rechaza la fecha inválida 1994-02-29
- archivo histórico del Consejo rechaza la fecha inválida 2024-04-31
- archivo histórico del Consejo rechaza la fecha inválida 1994-00
- archivo histórico del Consejo rechaza la fecha inválida 1994-13
- archivo histórico del Consejo rechaza la fecha inválida 94
- archivo histórico del Consejo rechaza la fecha inválida 1994-1-01
- archivo histórico del Consejo acepta año, mes y día bisiesto
- archivo histórico del Consejo no admite hora con una fecha incompleta
- archivo histórico del Consejo rechaza enlaces inseguros javascript:alert(1)
- archivo histórico del Consejo rechaza enlaces inseguros http://example.com
- archivo histórico del Consejo rechaza enlaces inseguros https://user:password@example.com
- archivo histórico del Consejo exige fuente y elimina campos ajenos al esquema
- archivo histórico del Consejo cada hito base tiene identidad única y datos válidos
- archivo histórico del Consejo la ficha pública sale campo a campo: sin versión, estado ni autor
- archivo histórico del Consejo la biblioteca de fuentes solo enlaza por HTTPS y sin repetir direcciones

### [tests/unit/csv.test.ts](../tests/unit/csv.test.ts) — 4 casos

- CSV conserva comillas y neutraliza fórmulas
- la fila usa punto y coma, que es lo que Excel en español espera
- un punto y coma dentro del texto no parte la fila en dos
- una celda vacía se conserva como celda, no desaparece

### [tests/unit/delivery-alert.test.ts](../tests/unit/delivery-alert.test.ts) — 3 casos

- avisos locales de entrega en Android pide el permiso nativo aunque WebView no tenga Notification
- avisos locales de entrega en Android refleja la denegación sin prometer avisos
- avisos locales de entrega en Android un fallo del complemento no impide usar la bandeja

### [tests/unit/delivery.test.ts](../tests/unit/delivery.test.ts) — 3 casos

- en qué punto del camino va un reporte separa lo que ya salió de lo que espera señal y de lo que nunca salió
- en qué punto del camino va un reporte lee los registros antiguos por su identificador
- en qué punto del camino va un reporte cada estado se nombra de una sola manera en toda la aplicación

### [tests/unit/domain.test.ts](../tests/unit/domain.test.ts) — 8 casos

- mapa y escala conserva 300 casos en la misma coordenada sin confundirlos con duplicados
- mapa y escala deja fuera del mapa lo que no tiene coordenadas, sin inventarlas
- mapa y escala descarta coordenadas imposibles y agrupa menos al acercar
- mapa y escala agrupa cinco cercanos y conserva coincidencias menores
- métricas verificables no cuenta escalado como solucionado y calcula sobre todos los casos
- métricas verificables no divide entre cero ni inventa explicaciones causales
- reporte requiere foto y rechaza 501 palabras
- reporte permite celular vacío y 500 palabras

### [tests/unit/evidence.test.ts](../tests/unit/evidence.test.ts) — 10 casos

- valida imagen y conserva exactamente bytes, resolución y hash
- rechaza texto disfrazado de fotografía y MIME falso
- la portada se reduce a la medida del encabezado y conserva la proporción
- una fotografía difícil sigue cabiendo en el documento
- archiva en WebP dentro del presupuesto, sin ampliar una foto pequeña
- reduce una fotografía grande a 2200 píxeles como máximo
- una fotografía difícil baja los tres escalones de calidad y sigue cabiendo
- una fotografía imposible de comprimir no se descarta: se guarda el mejor intento
- el sha256 devuelto es el de los bytes que de verdad se archivan
- una fotografía pequeña no se amplía ni repite marca con otra distinta

### [tests/unit/incident-api.test.ts](../tests/unit/incident-api.test.ts) — 18 casos

- recibo repetido no crea otro expediente ni notificación
- guarda una copia reducida de la fotografía junto al expediente
- rechaza cambiar el contenido de una solicitud reservada
- fallo de evidencias no crea acuse falso; reintento recupera reserva
- ignora dueño y privilegios enviados por cliente
- recibe el reporte de quien no ha verificado su correo
- revisa de nuevo la cuenta antes de confirmar
- una vereda que no está en la lista no entra sin ubicación del aparato
- y tampoco con un punto marcado a mano sobre el mapa
- con la ubicación del aparato sí, y queda marcada como propuesta
- un nombre del catálogo escrito de otra manera no crea vereda nueva
- un punto sin origen declarado cuenta como marcado a mano
- acepta un punto dentro del territorio y lo guarda sin verificar
- rechaza un punto fuera del territorio
- rechaza media coordenada
- un reporte nuevo le suena el teléfono al Consejo
- a quien reportó no le suena su propio envío
- un recibo repetido no vuelve a sonar

### [tests/unit/incidente-parcial.test.ts](../tests/unit/incidente-parcial.test.ts) — 9 casos

- un cambio de estado sin clasificación conserva la que ya tenía
- no publica un caso reservado por no venir la clasificación
- y no despublica uno que ya estaba público
- conserva la prioridad y el responsable que no se mandaron
- pero sí cambia el responsable cuando la ficha lo manda, incluso a vacío
- lo que el panel manda sigue pisando lo guardado
- publicar sin ficha pública sigue rechazándose
- publicar sin revisar la sensibilidad sigue rechazándose
- una clasificación inventada se rechaza, no se ignora

### [tests/unit/management-metrics.test.ts](../tests/unit/management-metrics.test.ts) — 9 casos

- no inventa tiempos de solución sin eventos y excluye cerrados de carga abierta
- calcula mediana usando fechas de solución verificables
- cuánto lleva esperando lo que sigue abierto ordena de más a menos espera y cuenta días enteros
- cuánto lleva esperando lo que sigue abierto deja fuera lo ya decidido, que no espera a nadie
- cuánto lleva esperando lo que sigue abierto un escalado sigue contando: cambió de escritorio, no de espera
- cuánto lleva esperando lo que sigue abierto sin el día del navegador no inventa una espera
- cuánto lleva esperando lo que sigue abierto la mediana de espera resume la cola sin depender de un caso extremo
- cuánto lleva esperando lo que sigue abierto una fecha futura no produce una espera negativa
- cruza vereda, categoría y plazo, y calla la media cuando no hay con qué

### [tests/unit/membership.test.ts](../tests/unit/membership.test.ts) — 6 casos

- sin perfil dice cómo se activa, no solo que no está habilitada
- cuenta deshabilitada remite al Consejo, no a activarla de nuevo
- la cuenta que su dueña cerró se dice distinto
- el rol escrito en la cuenta vale, y se sella en el token
- la reivindicación sin reflejo se escribe en la cuenta, y solo si falta
- perfil activo pasa, y el rol sigue siendo cosa aparte

### [tests/unit/native-auth.test.ts](../tests/unit/native-auth.test.ts) — 10 casos

- el acceso nativo firma también en el SDK web
- sin idToken avisa en vez de quedarse callado
- cerrar sesión cierra las dos capas
- en el navegador solo cierra la sesión web
- cerrar sesión suelta el aparato
- el aparato se suelta antes de cerrar la sesión
- en el navegador también se suelta
- una cuenta cerrada se dice igual en el APK que en el navegador
- un código de Firebase que ya viene bien se respeta
- otro fallo del complemento no se disfraza de cuenta cerrada

### [tests/unit/news-format.test.ts](../tests/unit/news-format.test.ts) — 7 casos

- marcas dentro de una línea reconoce negrita y cursiva sin tocar el resto
- marcas dentro de una línea deja pasar los signos sueltos, que en un texto corriente abundan
- bloques del comunicado separa apartados, listas y citas
- bloques del comunicado respeta los comunicados antiguos, escritos sin marcas
- bloques del comunicado no confunde una frase larga con un título
- bloques del comunicado agrupa los renglones de una lista en un solo bloque
- resumen para el feed retira las marcas y conserva el texto

### [tests/unit/news-publish.test.ts](../tests/unit/news-publish.test.ts) — 5 casos

- publicar deja el aviso con su comunicado y con la hora de ahora
- corregir un comunicado ya publicado no vuelve a sonar la campana
- guardar no se lleva por delante la portada, que la pone otra ruta
- retirar de la comunidad borra el aviso
- una versión vieja se rechaza en vez de pisar lo de otra persona

### [tests/unit/notifications.test.ts](../tests/unit/notifications.test.ts) — 4 casos

- el aviso de un comunicado llega sin leer y con el comunicado que abre
- lo personal conserva su propio leído y todo se ordena por fecha
- el aviso del Consejo dice quién lo hizo, con su nombre
- una cuenta que ya no existe se dice, no se enseña su identificador

### [tests/unit/openrouter.test.ts](../tests/unit/openrouter.test.ts) — 2 casos

- impide usar modelos de pago por configuración
- solo envía agregados y rechaza cifras en la redacción

### [tests/unit/outbox-migration.test.ts](../tests/unit/outbox-migration.test.ts) — 1 casos

- migración de la bandeja conserva los envíos pendientes al separar metadatos y fotografía

### [tests/unit/outbox-traspaso.test.ts](../tests/unit/outbox-traspaso.test.ts) — 5 casos

- lo preparado sin cuenta pasa a nombre de quien entra
- la fotografía viaja con su reporte
- sin nada esperando devuelve cero
- no se lleva por delante lo que ya tenía
- un reporte repetido no se duplica al traspasar

### [tests/unit/outbox.test.ts](../tests/unit/outbox.test.ts) — 11 casos

- bandeja persistente conserva identificador al repetir un envío y aísla cuentas
- bandeja persistente reserva un solo envío entre dos pestañas y rechaza otro dueño
- bandeja persistente conserva datos si falla y libera fotografía solo con recibo
- bandeja persistente limita a diez reportes sin eliminar pendientes
- bandeja persistente bloquea reintentos automáticos de rechazos permanentes
- bandeja persistente listar la bandeja no carga las fotografías
- bandeja persistente anuncia lo que salió sin nadie delante y calla lo que se vio salir
- bandeja persistente no anuncia entregas anteriores a la marca
- bandeja persistente espera progresiva acotada
- bandeja persistente un fallo web tardío no reactiva un rechazo nativo definitivo
- bandeja persistente acepta el recibo nativo al reabrir sin entregar el caso a otra cuenta

### [tests/unit/publication.test.ts](../tests/unit/publication.test.ts) — 4 casos

- solo una clasificación segura permite aprobar un resumen
- el resumen revisado espera 24 horas y se detiene ante lo sensible
- sin revisión no hay resumen, aunque el plazo ya haya pasado
- configuración inválida no acorta el plazo de la ficha automática

### [tests/unit/push-api.test.ts](../tests/unit/push-api.test.ts) — 12 casos

- el alta guarda el aparato de quien pregunta
- el alta ignora un uid puesto en el cuerpo
- rechaza una plataforma desconocida
- rechaza un token vacío
- recorta el agente antes de guardarlo
- la baja borra ese aparato
- la baja ignora un uid puesto en el cuerpo
- la baja rechaza un token vacío
- un cuerpo nulo es una solicitud mala, no un fallo del servidor
- un token con forma rara sale como 400 y no como fallo del servidor
- un fallo de Firestore es un 503
- sin sesión no se apunta ni se borra nada

### [tests/unit/push-cliente.test.ts](../tests/unit/push-cliente.test.ts) — 26 casos

- en el APK apunta el aparato con el token nativo
- en el navegador lo apunta con el token web
- la petición lleva la sesión
- sin clave VAPID el navegador no ofrece avisos
- el APK sigue disponible aunque falte la clave VAPID
- un navegador sin soporte tampoco ofrece avisos
- permiso denegado se dice, y no se apunta nada
- sin sesión no se apunta nada, y no se pregunta nada
- la baja borra el token y se lo dice al servidor
- en el navegador la baja borra el token web
- la baja no lanza aunque falle avisar al servidor
- la baja no lanza en un navegador sin soporte
- refrescar reapunta el aparato cuando ya hay permiso
- refrescar no pregunta ni apunta si no hay permiso
- refrescar tampoco pregunta en el APK
- refrescar sin sesión no hace nada
- el APK crea el canal con su nombre en español
- en el navegador no se crea ningún canal
- el APK sabe si están activados sin la API del navegador
- el APK sabe que están apagados sin la API del navegador
- refrescar funciona en el APK sin la API del navegador
- en el navegador pregunta a la API del navegador
- con permiso pero sin registro, la fila no dice que esté activado
- tras un registro completo sí lo dice
- en el APK basta el permiso
- refrescar reapunta aunque se haya perdido la marca local

### [tests/unit/push-enganche.test.ts](../tests/unit/push-enganche.test.ts) — 11 casos

- un cambio de estado le suena al vecino dueño del reporte
- al Consejo no le suena lo que acaba de hacer uno de ellos
- guardar sin cambiar nada para el vecino no suena
- una nota pública suena aunque el estado no cambie
- sin nota, el aviso dice en qué estado quedó
- un caso sin dueño no suena en ningún teléfono
- repetir el mismo cambio no vuelve a sonar
- la respuesta no lleva el identificador del vecino
- una solicitud de eliminación le suena al Consejo
- el aviso de eliminación no nombra a quien la pidió
- reintentar una solicitud a medias no vuelve a sonar

### [tests/unit/push-envio.test.ts](../tests/unit/push-envio.test.ts) — 7 casos

- manda a los aparatos de esa persona, con la dirección que abre
- al Consejo manda a todos sus aparatos
- sin aparatos no llama a FCM
- borra los tokens que FCM dice que ya no existen
- un fallo pasajero no borra el token
- trocea por encima de 500 aparatos
- si FCM revienta, avisar no lanza

### [tests/unit/push-todos.test.ts](../tests/unit/push-todos.test.ts) — 3 casos

- reúne los aparatos de todo el mundo y les devuelve su dueño
- deja fuera a quien se le diga, para no sonarle dos veces
- descarta un aparato sin dueño en vez de mandarle un aviso a nadie

### [tests/unit/push-tokens.test.ts](../tests/unit/push-tokens.test.ts) — 15 casos

- guardar escribe bajo la persona y con el token por clave
- aparatosDe lista los tokens de esa persona, y de esa ruta
- coleccionDeAparatos apunta a la subcolección de esa persona
- aparatosDelConsejo junta los aparatos de todos los admin
- una cuenta del Consejo deshabilitada no recibe nada
- una cuenta del Consejo ya anonimizada tampoco
- olvidar borra cada aparato por su ruta
- olvidar sigue adelante aunque un borrado falle
- olvidarUno borra solo ese
- rechaza un token a/b/c (con barras)
- rechaza un token  (vacío)
- rechaza un token .. (reservado por Firestore)
- rechaza un token __name__ (reservado por Firestore)
- rechaza un token xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (desmesurado)
- rechaza un token tok en✱blanco (con caracteres que un token de FCM no lleva)

### [tests/unit/reading-api.test.ts](../tests/unit/reading-api.test.ts) — 8 casos

- exige correo verificado sin llamar al proveedor
- una cuenta sin rol del Consejo no llega al proveedor
- aplica el cupo diario antes del proveedor
- envía solo los hallazgos recibidos, nada más
- rechaza una lista con saltos de línea, que podrían colar instrucciones
- rechaza una lista vacía o desmedida sin gastar cupo
- descarta una redacción más larga de lo que cabe en un párrafo
- sin proveedor configurado lo dice en vez de fallar en silencio

### [tests/unit/reading.test.ts](../tests/unit/reading.test.ts) — 10 casos

- lectura del conjunto sin datos lo dice y no arriesga una tendencia
- lectura del conjunto siempre cierra con la salvedad, aunque el conjunto sea mínimo
- lectura del conjunto nombra el caso que más espera con su vereda y sus días
- lectura del conjunto calla lo que no aplica en vez de decir cero
- lectura del conjunto no señala un día de la semana cuando el reparto es plano
- lectura del conjunto sí lo señala cuando un día concentra los reportes
- lectura del conjunto sin el día del navegador omite la espera pero conserva el resto
- lectura del conjunto lo que sale hacia un modelo no lleva el título de ningún expediente
- lectura del conjunto concuerda el singular y el plural
- con un solo caso abierto no inventa medias ni comparaciones

### [tests/unit/relative-time.test.ts](../tests/unit/relative-time.test.ts) — 5 casos

- antigüedad de un aviso dice los tramos cortos en palabras
- antigüedad de un aviso pasada una semana vuelve al calendario
- antigüedad de un aviso una fecha del futuro no produce «hace -2 minutos»
- antigüedad de un aviso una fecha ilegible no rompe la lista
- antigüedad de un aviso la fecha exacta se conserva para el título

### [tests/unit/report-lookup.test.ts](../tests/unit/report-lookup.test.ts) — 13 casos

- quien lo reportó recibe su expediente tal como lo mandó
- al Consejo se le sirve el expediente aunque no sea suyo
- y con la versión, que es lo que permite cambiarlo
- a quien lo reportó no, que no gestiona nada
- a otra persona no se le sirve un reporte aún no revisado
- el resumen del Consejo reemplaza al automático también aquí
- lo marcado como delicado no aparece por este camino
- dentro del plazo y sin revisión, todavía no consta
- no existe y no es para ti se dicen con la misma frase
- un código que no es de un expediente se rechaza sin consultar nada
- a quien lo reportó se le cuenta que se retiró, y por qué
- al Consejo también, que es quien lo retiró
- a un tercero el acta no le consta

### [tests/unit/restablecer.test.ts](../tests/unit/restablecer.test.ts) — 18 casos

- sin rol del Consejo no se restablece nada
- un correo que no existe se dice, y no se toca nada
- una cuenta que no está cerrada no se restablece
- abre la puerta
- enciende la casa
- levanta el registro de la solicitud
- no concede el rol del Consejo
- deja constancia de quién la reabrió
- marca la Novedad como atendida
- la respuesta avisa de que los reportes no vuelven
- si la base falla, la puerta no llega a abrirse
- una cuenta restablecida se puede volver a eliminar
- la segunda solicitud lleva su propia fecha
- la segunda solicitud avisa al Consejo
- reintentar la misma solicitud no avisa dos veces
- restablecer no toca ningún expediente
- la eliminación sigue anonimizando, antes y después de un restablecimiento
- el nombre de quien administra no acaba en el documento de la cuenta

### [tests/unit/retract.test.ts](../tests/unit/retract.test.ts) — 12 casos

- sin motivo no se retira nada
- un motivo de dos palabras tampoco es un motivo
- retirar borra el expediente y su resumen público
- el motivo le llega a quien reportó, tal como se escribió
- queda el acta con quién lo retiró y por qué, y sin el relato
- la fotografía se borra del archivo privado
- repetir la llamada sobre algo ya retirado no vuelve a avisar
- un reporte reenviado con el mismo contenido se puede volver a retirar
- un expediente que no existe se dice y no se inventa un acta
- el motivo también le suena en el teléfono a quien reportó
- el aviso de retirada no lleva a un expediente que ya no existe
- repetir la retirada no vuelve a sonar el teléfono

### [tests/unit/roles.test.ts](../tests/unit/roles.test.ts) — 8 casos

- concede el rol y lo deja registrado
- si el campo de la cuenta no se puede escribir, el rol no se concede a medias
- no concede a una cuenta que todavía no ha entrado
- no se lo concede a un correo que no existe
- nadie se retira a sí mismo
- no se retira al último administrador
- la consulta y el cambio exigen el rol
- la consulta devuelve todas las cuentas con su rol, no solo las que administran

### [tests/unit/service-worker.test.ts](../tests/unit/service-worker.test.ts) — 12 casos

- caché pública sin conexión sirve el emblema guardado sin intentar descargarlo
- caché pública sin conexión nunca intercepta datos privados: /api/incidents/
- caché pública sin conexión nunca intercepta datos privados: /api/incidents/private/evidence/
- caché pública sin conexión nunca intercepta datos privados: /api/account/avatar/
- caché pública sin conexión no guarda peticiones autenticadas ni siquiera de imágenes públicas
- avisos que llegan con la aplicación cerrada un push dibuja la notificación con su dirección
- avisos que llegan con la aplicación cerrada un push con carga ilegible no revienta y avisa igual
- avisos que llegan con la aplicación cerrada un push vacío tampoco revienta
- avisos que llegan con la aplicación cerrada tocar el aviso abre el expediente cuando no hay pestaña
- avisos que llegan con la aplicación cerrada reutiliza la pestaña que ya está en ese expediente
- avisos que llegan con la aplicación cerrada lleva a la dirección la pestaña que ya estaba abierta
- avisos que llegan con la aplicación cerrada un aviso sin dirección lleva al inicio

### [tests/unit/signature.test.ts](../tests/unit/signature.test.ts) — 5 casos

- firma del Consejo siempre devuelve una frase del repertorio
- firma del Consejo es estable: el mismo comunicado firma siempre igual
- firma del Consejo el Consejo puede poner la suya, y en blanco no estorba
- firma del Consejo rechaza una firma que ya no es una firma
- firma del Consejo reparte entre comunicados distintos en vez de repetir una sola

### [tests/unit/sin-cuenta.test.ts](../tests/unit/sin-cuenta.test.ts) — 5 casos

- marcar y olvidar dejan constancia del flujo
- traspasa lo que esperaba cuando viene de este flujo
- sin la marca no traspasa nada
- si el traspaso falla se dice con un cero, no con un error
- sin sessionStorage no revienta

### [tests/unit/statistics-export.test.ts](../tests/unit/statistics-export.test.ts) — 6 casos

- lo que se acuña se puede recoger una vez, y ya no una segunda
- un billete de más de quince minutos ya no sirve
- un formato de billete que no es el que se acuña no consulta nada
- un tipo de exportación fuera de la lista se rechaza al acuñar
- un nombre de archivo con caracteres fuera del patrón se rechaza
- un cuerpo que no cabe en un documento de Firestore se rechaza

### [tests/unit/storage.test.ts](../tests/unit/storage.test.ts) — 2 casos

- dos escritores con la misma versión no sobrescriben cambios
- confirmar un reporte limpia el borrador y repetir el mismo identificador no duplica

### [tests/unit/territory.test.ts](../tests/unit/territory.test.ts) — 11 casos

- catálogo territorial ofrece todas las veredas documentadas, sin repetir y ordenadas
- catálogo territorial solo entrega coordenadas donde existe una fuente documentada
- catálogo territorial no declara validación mientras el Consejo no la firme
- catálogo territorial reconoce solo nombres del catálogo
- procedencia de los puntos de referencia cada punto declara de dónde sale
- procedencia de los puntos de referencia Boca de Víbora usa la coordenada oficial del DANE
- procedencia de los puntos de referencia todos los puntos caen dentro del marco del territorio
- procedencia de los puntos de referencia el marco contiene el título colectivo y no mucho más
- procedencia de los puntos de referencia el marco cubre el municipio entero, esquinas incluidas
- procedencia de los puntos de referencia admite una vereda del Consejo que cae fuera del municipio
- procedencia de los puntos de referencia rechaza un punto en los Andes aunque siga en Nariño

### [tests/unit/ubicacion.test.ts](../tests/unit/ubicacion.test.ts) — 19 casos

- un punto bueno dentro del territorio se acepta, con su margen
- en el APK lo pide al complemento, no al navegador
- en el APK pide el permiso solo si falta
- un punto con demasiado margen se rechaza
- y justo en el límite todavía vale
- sin margen declarado se rechaza
- un punto fuera de la cuenca se rechaza aunque sea exacto
- el permiso negado se distingue del plazo agotado
- en el APK, el permiso negado se dice
- con la ubicación apagada no se pregunta antes: se va a pedir que la enciendan
- si la ubicación sigue apagada, se dice que hace falta encenderla
- aceptando encenderla, el punto llega
- un aparato sin geolocalización lo dice
- nunca acepta un punto guardado, ni en el navegador ni en el APK
- la ubicación apagada no se cuenta como falta de señal
- si el GPS fino no engancha, se reintenta sin él antes de rendirse
- el punto del reintento también se descarta si trae demasiado margen
- cada motivo dice algo distinto y ninguno queda mudo
- solo el permiso manda a los ajustes; los demás, al mapa

### [tests/unit/vereda-load.test.ts](../tests/unit/vereda-load.test.ts) — 5 casos

- carga por vereda ordena por casos abiertos, no por total
- carga por vereda no cuenta como abiertos los descartados ni los no solucionados
- carga por vereda sin casos decididos no inventa una tasa de cero
- carga por vereda ignora los reportes sin vereda en vez de agruparlos aparte
- carga por vereda cuenta los escalados a otra entidad, que siguen abiertos

### [tests/unit/veredas-acumulador.test.ts](../tests/unit/veredas-acumulador.test.ts) — 10 casos

- un punto marcado a mano no deja rastro
- un punto con mal margen tampoco
- un punto del aparato se guarda, y todavía no propone nada
- con tres de dos cuentas ya hay propuesta para el Consejo
- el nombre escrito de otra manera cae en el mismo sitio
- una vereda ya situada no propone nada por unos metros
- pero sí cuando el centro se ha ido lejos
- lo descartado no resucita con reportes nuevos
- lo aceptado sigue aceptado mientras el punto no se mueva
- no crece sin fin: se queda con los últimos

### [tests/unit/veredas.test.ts](../tests/unit/veredas.test.ts) — 19 casos

- proponer un punto un punto lejano no mueve el centro, y un promedio sí lo movería
- proponer un punto pero se cuenta cuántos quedaron lejos
- proponer un punto y un grupo apretado no acusa a nadie
- proponer un punto un punto marcado a mano no cuenta
- proponer un punto un punto con mal margen tampoco
- proponer un punto tres reportes de una sola cuenta no proponen nada
- proponer un punto dos aportes no bastan aunque sean de dos cuentas
- proponer un punto tres aportes de dos cuentas sí, y lo dice
- proponer un punto el punto propuesto viene redondeado
- proponer un punto los aportes descartados no rellenan el mínimo
- volver a molestar al Consejo una deriva pequeña no se propone; una grande sí
- volver a molestar al Consejo el umbral es el declarado, no uno inventado
- el nombre de una vereda se reconoce escrito de cualquier manera
- el nombre de una vereda los acentos y los signos no hacen una vereda distinta
- el nombre de una vereda una vereda nueva no se confunde con ninguna
- el nombre de una vereda un nombre vacío no encuentra nada
- la distancia mide en metros de verdad
- la distancia y el mismo punto dista cero
- la distancia un grado de longitud mide menos que uno de latitud

### [tests/unit/voice-transcript.test.ts](../tests/unit/voice-transcript.test.ts) — 9 casos

- unir los trozos del dictado un ordenador entrega trozos distintos y se suman
- unir los trozos del dictado una frase reemitida creciendo no se multiplica
- unir los trozos del dictado y tampoco cuando cada versión llega en su propia posición
- unir los trozos del dictado la mayúscula que añade al crecer no crea una frase nueva
- unir los trozos del dictado una tilde corregida tampoco
- unir los trozos del dictado ni una coma añadida
- unir los trozos del dictado lo provisional más corto no borra lo que ya se llevaba
- unir los trozos del dictado dos frases de verdad distintas sí se suman
- unir los trozos del dictado los huecos no dejan espacios sueltos

### [tests/unit/voz.test.ts](../tests/unit/voz.test.ts) — 19 casos

- en el APK usa el reconocedor del teléfono y no el del navegador
- pide el permiso solo si falta, y si lo niegan lo dice
- una frase que crece no se multiplica
- dos frases seguidas se suman, no se pisan
- la versión final reemplaza a la provisional
- aguanta una pausa y termina tras varios silencios
- sin haber oído nada lo dice; habiendo oído algo, no
- no se reinicia el reconocedor antes de haber oído nada
- si el reconocedor está ocupado se espera y se reintenta
- un fallo de red se dice como fallo de red
- después de dictar algo, se reabre dos veces y no tres
- antes de la primera palabra se aguanta más
- al parar no queda un micrófono abriéndose por detrás
- al terminar suelta el micrófono
- un teléfono sin reconocedor lo dice en vez de fallar callado
- en el navegador usa la API del navegador y no el complemento
- sin conexión no arranca, y lo dice antes de esperar en blanco
- el permiso negado y la falta de servicio se distinguen
- el tope de un minuto es el mismo en los dos mundos

### [tests/unit/writing-api.test.ts](../tests/unit/writing-api.test.ts) — 4 casos

- IA exige correo verificado sin llamar al proveedor
- IA aplica cupo diario antes del proveedor
- IA devuelve propuesta y solo envía relato
- IA rechaza salida vacía

## Playwright: recorridos de interfaz

### [tests/e2e/app.spec.ts](../tests/e2e/app.spec.ts) — 6 casos

- una foto de más de 24 megapíxeles se ajusta en vez de rechazarse ([línea 7](../tests/e2e/app.spec.ts#L7))
- el borrador conserva foto, punto y texto para enviarlo después ([línea 46](../tests/e2e/app.spec.ts#L46))
- autoguarda un reporte incompleto al salir y permite seguir editándolo ([línea 126](../tests/e2e/app.spec.ts#L126))
- inicio móvil no desborda y muestra navegación ([línea 141](../tests/e2e/app.spec.ts#L141))
- inicio navega al reporte y exige los campos ([línea 157](../tests/e2e/app.spec.ts#L157))
- documentación y análisis explican límites ([línea 171](../tests/e2e/app.spec.ts#L171))

### [tests/e2e/cabecera-history.spec.ts](../tests/e2e/cabecera-history.spec.ts) — 3 casos

- la API editorial de historia exige sesión administrativa ([línea 5](../tests/e2e/cabecera-history.spec.ts#L5))
- la cabecera se encuentra buscando el municipio y conserva el nombre del expediente ([línea 18](../tests/e2e/cabecera-history.spec.ts#L18))
- la línea de tiempo ordena una publicación antigua y recupera su copia sin red ([línea 36](../tests/e2e/cabecera-history.spec.ts#L36))

### [tests/e2e/community-nav.spec.ts](../tests/e2e/community-nav.spec.ts) — 1 casos

- comunidad conserva sus cuatro secciones al navegar y recargar ([línea 3](../tests/e2e/community-nav.spec.ts#L3))

### [tests/e2e/comunicado.spec.ts](../tests/e2e/comunicado.spec.ts) — 5 casos

- abrir un comunicado lleva a su pantalla de lectura con enlace propio ([línea 4](../tests/e2e/comunicado.spec.ts#L4))
- un comunicado largo se lee con sus apartados, listas, citas e imágenes ([línea 30](../tests/e2e/comunicado.spec.ts#L30))
- un comunicado inexistente lo dice en vez de quedarse en blanco ([línea 77](../tests/e2e/comunicado.spec.ts#L77))
- los pasos recorridos del reporte se pueden reabrir ([línea 87](../tests/e2e/comunicado.spec.ts#L87))
- vaciar un paso anterior vuelve a cerrar los siguientes ([línea 113](../tests/e2e/comunicado.spec.ts#L113))

### [tests/e2e/council-memory.spec.ts](../tests/e2e/council-memory.spec.ts) — 2 casos

- la memoria del Consejo permite consultar hitos y fuentes en móvil ([línea 3](../tests/e2e/council-memory.spec.ts#L3))
- el banco de consulta abre sin internet después de instalar la PWA ([línea 44](../tests/e2e/council-memory.spec.ts#L44))

### [tests/e2e/first-run.spec.ts](../tests/e2e/first-run.spec.ts) — 4 casos

- la bienvenida se muestra la primera vez y después abre el inicio ([línea 4](../tests/e2e/first-run.spec.ts#L4))
- elegir vereda muestra su punto documentado y avisa cuando no lo hay ([línea 26](../tests/e2e/first-run.spec.ts#L26))
- la ayuda de redacción acompaña al recuento de palabras ([línea 60](../tests/e2e/first-run.spec.ts#L60))
- el mapa permite corregir la ubicación y volver al punto de la vereda ([línea 84](../tests/e2e/first-run.spec.ts#L84))

### [tests/e2e/management.spec.ts](../tests/e2e/management.spec.ts) — 7 casos

- un reporte guardado se puede quitar de este dispositivo y no vuelve ([línea 11](../tests/e2e/management.spec.ts#L11))
- guardar borrador conserva lo escrito y lo anuncia como borrador ([línea 48](../tests/e2e/management.spec.ts#L48))
- un expediente entregado no ofrece retirarse de este dispositivo ([línea 80](../tests/e2e/management.spec.ts#L80))
- lo que nunca salió lo dice y se puede retomar como borrador ([línea 96](../tests/e2e/management.spec.ts#L96))
- calendario navega a mes vacío y filtra periodo ([línea 128](../tests/e2e/management.spec.ts#L128))
- un reporte de otra cuenta no aparece en Mis reportes ([línea 154](../tests/e2e/management.spec.ts#L154))
- lo guardado con el nombre anterior se conserva al abrir ([línea 213](../tests/e2e/management.spec.ts#L213))

### [tests/e2e/polish.spec.ts](../tests/e2e/polish.spec.ts) — 13 casos

- bienvenida, tema oscuro y navegación ([línea 4](../tests/e2e/polish.spec.ts#L4))
- el acceso comparte el escenario de la bienvenida ([línea 67](../tests/e2e/polish.spec.ts#L67))
- el acceso se adapta al teléfono sin perder el formulario ([línea 84](../tests/e2e/polish.spec.ts#L84))
- el acceso con Google lleva su marca de cuatro colores ([línea 104](../tests/e2e/polish.spec.ts#L104))
- acceso presenta formulario sin simular una sesión ([línea 119](../tests/e2e/polish.spec.ts#L119))
- mapa filtra por estado y comunidad presenta fuentes ([línea 128](../tests/e2e/polish.spec.ts#L128))
- las estadísticas señalan lo que más espera y llevan al expediente ([línea 173](../tests/e2e/polish.spec.ts#L173))
- el tema oscuro conserva el color de las gráficas y del mapa ([línea 203](../tests/e2e/polish.spec.ts#L203))
- el asistente de análisis no existe para quien no es del Consejo ([línea 230](../tests/e2e/polish.spec.ts#L230))
- la redacción con IA se cierra en el servidor, no solo en la interfaz ([línea 248](../tests/e2e/polish.spec.ts#L248))
- el informe se arma con la portada y el cierre del Consejo ([línea 265](../tests/e2e/polish.spec.ts#L265))
- la portada del informe declara el filtro con el que se emitió ([línea 292](../tests/e2e/polish.spec.ts#L292))
- ninguna superficie se estira al llegar al tope ([línea 319](../tests/e2e/polish.spec.ts#L319))

### [tests/e2e/production-boundaries.spec.ts](../tests/e2e/production-boundaries.spec.ts) — 11 casos

- el listado del territorio abre el detalle del reporte ([línea 4](../tests/e2e/production-boundaries.spec.ts#L4))
- el territorio dice dónde hay casos abiertos, no solo dónde ocurren ([línea 18](../tests/e2e/production-boundaries.spec.ts#L18))
- una instalación sin reportes no inventa ninguno ([línea 44](../tests/e2e/production-boundaries.spec.ts#L44))
- el mapa nombra las veredas documentadas y las encuadra todas ([línea 66](../tests/e2e/production-boundaries.spec.ts#L66))
- la página del territorio no expone los mandos de prueba ([línea 94](../tests/e2e/production-boundaries.spec.ts#L94))
- la API del Consejo rechaza acceso anónimo ([línea 104](../tests/e2e/production-boundaries.spec.ts#L104))
- oscuro conserva contraste y banner a color, detalle navega como página ([línea 109](../tests/e2e/production-boundaries.spec.ts#L109))
- la aplicación llega con sus cabeceras de seguridad ([línea 147](../tests/e2e/production-boundaries.spec.ts#L147))
- los buscadores no recorren expedientes ni el panel del Consejo ([línea 168](../tests/e2e/production-boundaries.spec.ts#L168))
- una dirección que no existe se explica y ofrece salida ([línea 177](../tests/e2e/production-boundaries.spec.ts#L177))
- un punto del mapa enseña lo que tiene y lleva al expediente ([línea 196](../tests/e2e/production-boundaries.spec.ts#L196))

### [tests/e2e/push-ajuste.spec.ts](../tests/e2e/push-ajuste.spec.ts) — 1 casos

- sin soporte de avisos, Mi cuenta no ofrece el interruptor ([línea 16](../tests/e2e/push-ajuste.spec.ts#L16))

### [tests/e2e/pwa.spec.ts](../tests/e2e/pwa.spec.ts) — 5 casos

- la interfaz de reportes abre sin señal después de instalar la PWA ([línea 4](../tests/e2e/pwa.spec.ts#L4))
- los comunicados se leen sin red y dicen que son una copia ([línea 53](../tests/e2e/pwa.spec.ts#L53))
- un reporte guardado se abre sin red desde su propia dirección ([línea 89](../tests/e2e/pwa.spec.ts#L89))
- el historial de la comunidad abre sin red ([línea 126](../tests/e2e/pwa.spec.ts#L126))
- sin señal, cada lista dice que va corta ([línea 150](../tests/e2e/pwa.spec.ts#L150))

### [tests/e2e/registration.spec.ts](../tests/e2e/registration.spec.ts) — 2 casos

- registro valida confirmación sin crear cuenta ([línea 2](../tests/e2e/registration.spec.ts#L2))
- IA rechaza solicitudes sin identidad ([línea 24](../tests/e2e/registration.spec.ts#L24))

### [tests/e2e/reporte-sin-cuenta.spec.ts](../tests/e2e/reporte-sin-cuenta.spec.ts) — 2 casos

- enviar sin sesión deja el reporte esperando y lleva al acceso ([línea 17](../tests/e2e/reporte-sin-cuenta.spec.ts#L17))
- el acceso con volver=reporte carga y ofrece entrar ([línea 78](../tests/e2e/reporte-sin-cuenta.spec.ts#L78))

### [tests/e2e/session-shell.spec.ts](../tests/e2e/session-shell.spec.ts) — 7 casos

- sin sesión el shell no finge una identidad ni ofrece gestión ([línea 5](../tests/e2e/session-shell.spec.ts#L5))
- la bandeja de novedades explica que es personal ([línea 22](../tests/e2e/session-shell.spec.ts#L22))
- la dirección del Consejo sin el rol lo dice y ofrece salida ([línea 51](../tests/e2e/session-shell.spec.ts#L51))
- el formulario ofrece el catálogo territorial documentado y advierte su estado ([línea 79](../tests/e2e/session-shell.spec.ts#L79))
- la cabecera lleva identidad y reserva el estado de red para cuando falta señal ([línea 95](../tests/e2e/session-shell.spec.ts#L95))
- ninguna pantalla desborda el ancho del teléfono ([línea 132](../tests/e2e/session-shell.spec.ts#L132))
- cada pantalla lleva sus propias cifras del territorio ([línea 156](../tests/e2e/session-shell.spec.ts#L156))

### [tests/e2e/voice-access.spec.ts](../tests/e2e/voice-access.spec.ts) — 4 casos

- dictado se revisa y añade sin reemplazar el relato ([línea 3](../tests/e2e/voice-access.spec.ts#L3))
- dictado no disponible conserva el formulario ([línea 46](../tests/e2e/voice-access.spec.ts#L46))
- acceso móvil permite revisar contraseña y cambiar tema ([línea 62](../tests/e2e/voice-access.spec.ts#L62))
- noticias administrativas requieren autenticación ([línea 86](../tests/e2e/voice-access.spec.ts#L86))

### [tests/e2e/welcome-theme.spec.ts](../tests/e2e/welcome-theme.spec.ts) — 3 casos

- bienvenida centra el aviso y mantiene contraste en ambos temas ([línea 2](../tests/e2e/welcome-theme.spec.ts#L2))
- login y registro comparten tema sin perder controles ([línea 16](../tests/e2e/welcome-theme.spec.ts#L16))
- la bienvenida ofrece entrar, y se lee en los dos temas ([línea 35](../tests/e2e/welcome-theme.spec.ts#L35))

## Alcance

Los nombres documentan el comportamiento buscado, no sustituyen la revisión de las aserciones ni demuestran que un servicio externo real respondió. Las pruebas unitarias con dobles verifican contratos de código; las de navegador recorren la aplicación local; las pruebas de Firestore con emulador y las de campo tienen procedimientos distintos.
