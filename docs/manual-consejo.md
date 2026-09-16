# Manual operativo del Consejo Comunitario — Mi Pueblo Digital

Guía para las personas del Gran Consejo Comunitario Río Satinga que gestionan
expedientes y publican comunicados. Describe lo que la aplicación hace hoy y
señala expresamente lo que todavía depende de una decisión del Consejo.

## 1. Quién puede entrar y cómo se otorga el rol

La gestión exige tres condiciones simultáneas:

1. **Cuenta con el correo verificado.** Reportar no lo exige; gestionar sí.
2. **Cuenta activa** en el servidor (`accounts/<uid>.active = true`).
3. **Rol de administrador**, otorgado como reivindicación `admin` en el token.

El rol **no se otorga desde la aplicación**: es deliberado. Se asigna fuera de
ella, con el procedimiento administrativo que el Consejo defina, y debe quedar
registrado quién lo pidió, quién lo aprobó y cuándo. Mientras una cuenta no tenga
el rol, el enlace **Panel del Consejo** no aparece en el menú y las funciones de
gestión responden «Esta función requiere el rol de administrador».

Cerrar sesión y volver a entrar refresca el rol si acaba de asignarse.

## 2. Panel de gestión de expedientes

Entra por **Panel del Consejo**.

1. **Cargar expedientes** trae la primera página (25 casos). **Cargar más**
   continúa; el listado no se recarga solo, para que nadie pierda un filtro a
   mitad de trabajo.
2. **Filtros:** Categoría, Vereda, Prioridad y Estado. Se aplican de inmediato
   sobre lo que ya está cargado y el contador indica «X de Y expedientes
   cargados». Si un caso no aparece, puede estar en una página aún no cargada.
3. **Columnas:** Categoría y vereda, descripción, prioridad, responsable y
   estado, con la acción **Ver detalles**.

### Trabajar un caso

Al abrir un expediente puedes cambiar:

- **Estado**, entre los siete definidos: Pendiente, En proceso, Solucionado,
  No solucionado, Descartado, Bloqueado por conflicto y Escalado a otra entidad.
- **Prioridad**: Baja, Media, Alta o Crítica. Todo caso entra como Media. La
  prioridad la asigna el Consejo; el formulario ciudadano no la ofrece, para que
  nadie escale su propio reporte.
- **Responsable**: hasta 100 caracteres.
- **Nota para el ciudadano**: **máximo 30 palabras**. La verá quien reportó y
  genera un aviso en su bandeja de novedades.
- **Nota interna**: solo para el equipo. **No sale nunca del panel.**
- **Revisión de sensibilidad** y **visibilidad del resumen** (§3).

**Cada cambio exige un motivo:** hay que dejar una nota pública o una interna. El
guardado escribe, en una sola transacción, el nuevo estado, el evento de
auditoría con tu identidad y la fecha, y la notificación correspondiente. Si algo
falla, no se guarda nada a medias.

**La fotografía llega sola al abrir el expediente.** Estuvo detrás de un botón
—«Revisar fotografía privada»— y en la práctica quedaba escondida: se decidía la
prioridad y el responsable de un caso sin haber mirado lo que la persona
reportó. Lo que llega es una **copia reducida**, que pesa lo que una imagen de
pantalla; debajo, **Ver la fotografía original** trae el archivo tal como se
envió, que es el que sirve como prueba. La aplicación dice siempre cuál de las
dos estás mirando. No reenvíes el original por otros medios.

### Retirar un expediente

Al pie de la ficha, **Retirar este reporte**. Es para lo que no se arregla con un
estado: un duplicado, uno hecho por error, uno que no corresponde al territorio,
o uno cuyo relato no se puede sostener. Cerrarlo como «Descartado» dice otra
cosa y lo deja contando en el mapa y en las cifras.

Retirar **borra de verdad**: el expediente sale de la bandeja, del mapa, de las
cifras y de lo que ve la comunidad, y con él su fotografía. No se puede deshacer.

**El motivo es obligatorio y no lo escribe la aplicación.** Le llega a quien
reportó, a su bandeja de novedades, **tal como lo escribas**, y es lo único que
le queda para saber qué pasó con lo suyo. Escríbelo pensando en que lo va a leer
esa persona: «Está repetido con el expediente del muelle del mismo día» sirve;
«no aplica» no.

Queda un acta —quién lo retiró, cuándo y por qué— que no guarda el relato ni el
teléfono. Si quien reportó abre después el enlace de su expediente, la
aplicación le dice que se retiró, la fecha y el motivo, en vez de decirle que no
lo encuentra. A ninguna otra persona se le cuenta.

Si el aviso dice que quedó **a medias**, vuelve a pulsar: el expediente ya salió
de las listas, pero algo —la fotografía o el historial— no terminó de borrarse.

### Cuando dos personas editan a la vez

El expediente lleva un número de versión. Si otra persona guardó antes que tú,
verás **«Otra persona actualizó el caso. Recarga antes de guardar»** y tu cambio
**no se aplica**. Vuelve a cargar los expedientes, revisa lo que hizo la otra
persona y decide. Es una protección deliberada: evita que un cambio pise otro sin
que nadie se entere.

Si pulsas Guardar dos veces por una conexión lenta, el sistema reconoce que es la
misma operación y no duplica ni la nota ni el aviso.

## 3. Privacidad: de expediente privado a resumen público

Un reporte **nace privado**. Para que la comunidad vea algo hacen falta tres
pasos, en este orden:

1. **Revisión de sensibilidad.** Marca «Revisado · sin contenido sensible» solo
   después de mirar la fotografía y el relato. Si hay lesiones, menores o
   personas identificables, marca «Sensible · privado» y ahí termina.
2. **Plazo.** Debe haber transcurrido el plazo de publicación configurado
   (24 horas de forma predeterminada) desde que el caso se recibió.
3. **Reescritura.** Con «Compartir resumen tras 24 horas» debes redactar un
   **título público**, un **resumen de hasta 30 palabras** y una **vereda
   pública**, sin nombres, teléfonos ni datos que identifiquen a nadie.

El sistema rechaza publicar si falta cualquiera de los tres. **La fotografía
original nunca se publica**, esté el caso revisado o no. Volver a «Privado»
retira el resumen de la comunidad.

Escribe el resumen tú: no copies el relato del ciudadano.

## 3.1 El informe del observatorio

En **Estadísticas**, el botón **Descargar informe** arma un documento con todo
lo que hay en pantalla y abre el cuadro de impresión del navegador. Ahí se elige
**«Guardar como PDF»**.

- El informe **respeta los filtros**: lo que se declare en la portada —periodo,
  categoría, vereda y número de registros— es exactamente el conjunto con el que
  se calcularon las cifras. Un informe sin sus filtros declarados no prueba nada.
- Sale en claro aunque la aplicación esté en tema oscuro, y sin los mandos de la
  pantalla.
- Funciona **sin conexión**: el documento se arma en el propio dispositivo.
- El informe **abre con la lectura del conjunto**: las cifras traducidas a
  frases que se pueden leer en asamblea. Después van los cuadros que las
  sostienen.

### Datos en CSV

Al lado del informe, **Datos en CSV** baja la tabla de registros para una hoja
de cálculo.

- Sale con los **nombres que usa el Consejo**, no con las claves internas:
  «Ambiente» y no «recursos_naturales», «En proceso» y no «en_proceso».
- Columnas: código, título, categoría, estado, vereda, responsable, fecha en
  letra, fecha ISO, días abiertos y si sigue abierto. La fecha va dos veces
  porque una ordena bien y la otra se entiende bien.
- El **separador es punto y coma**, que es lo que espera Excel en español. Con
  coma, Excel vuelca todo en una sola columna y el archivo parece roto.
- El **nombre del archivo carga el filtro y la fecha**, para que quien lo abra
  dentro de un año sepa de dónde salió.

### La lectura del conjunto

Al pie de Estadísticas, **Asistente de análisis** traduce las cifras a frases.
**Solo lo ven las cuentas con rol del Consejo.** No es secretismo: la lectura
nombra expedientes concretos y señala cuáles no tienen responsable, y eso es
material de trabajo interno, no un listado público. Las cifras, los cuadros, el
mapa y el informe siguen a la vista de toda la comunidad, con su salvedad al
pie.

Es un **cálculo local: ningún modelo interviene**. La ayuda de IA de la
aplicación se usa al redactar un reporte, no al leer los datos.

Cada frase sale de un cálculo reproducible y **lo que el dato no sostiene no se
dice**: si el reparto por día de la semana es plano, no se nombra ningún día;
si no hay casos abiertos, no se habla de espera. Cierra siempre con la salvedad
de que las cifras describen los registros recibidos y no dicen nada de quienes
no reportaron. **Ver fuentes y método** detalla cada cálculo.

#### Redactar con IA para la asamblea

Debajo de los hallazgos, **Redactar con IA** los une en un párrafo listo para
leer en voz alta.

El servidor la rechaza para cualquier cuenta sin rol del Consejo, aunque la
petición llegue por fuera de la aplicación: esconder el botón no es cerrar la
puerta. Importa porque esta redacción **envía cifras del territorio a un
proveedor externo**, y quién puede hacer salir un dato del territorio es una
decisión del Consejo.

Requiere además correo verificado, y hay un límite de un uso por minuto y diez
al día.

Lo que conviene tener claro antes de usarlo:

- **El modelo redacta, no analiza.** Las cifras ya están calculadas cuando salen
  hacia él. No las revisa, no las corrige y no las completa.
- **No sale el título de ningún expediente.** El título lo escribe quien
  reporta y puede llevar un nombre propio; fuera de la aplicación viaja la
  cifra, no el título. En pantalla el Consejo sí lo ve, porque ya tiene acceso
  al expediente.
- **El párrafo va rotulado** como redactado con IA, siempre debajo de los
  hallazgos. **Si las dos versiones no coinciden, la que vale es la calculada.**
- **Quitar** lo descarta. Al cambiar un filtro desaparece solo: ese párrafo
  hablaba de otro conjunto.
- Si el proveedor falla, se avisa y **la lectura calculada sigue completa**.

En el informe en PDF el párrafo entra con su rótulo, para que quien lo lea sepa
cuál de los dos textos escribió una máquina.

## 4. Noticias, alertas y encuentros

En el panel, sección **Redacción del Consejo**.

- **Cargar comunicados** lista hasta 100, con lo anclado primero.
- **Nuevo comunicado** abre el formulario. Título de 5 a 140 caracteres y
  contenido de 20 a 5000. El botón de guardar permanece deshabilitado hasta que
  el formulario es válido.
- **Tipo:** Encuentro, Boletín o Alerta.
- **Visibilidad:** Borrador privado, Publicado en comunidad o Archivado.

Cada tarjeta tiene un **menú de acciones** (tres puntos):

| Acción                 | Efecto                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Anclar / Desanclar** | Lo anclado encabeza el listado de la comunidad con la insignia «Anclado». Al desanclar vuelve a su orden por fecha.                              |
| **Editar**             | Abre el comunicado con sus datos cargados.                                                                                                       |
| **Eliminar**           | Pide confirmación y hace un **borrado lógico**: deja de verse en la comunidad, pero el comunicado y su historial se conservan para la auditoría. |

Publicar genera además un aviso comunitario; archivar lo retira. Toda edición
queda registrada con la cuenta que la hizo.

### 4.1 Dar formato al comunicado

Sobre el cuadro de contenido hay una barra con cinco estilos. **Seleccione el
texto y pulse el estilo**; el cursor no se mueve de sitio.

| Botón     | Para qué sirve                                        | Lo que queda escrito                   |
| --------- | ----------------------------------------------------- | -------------------------------------- |
| **N**     | Resaltar una cifra, una fecha o un acuerdo.           | `**cincuenta y tres personas**`        |
| _C_       | Una cita breve, un nombre propio o un término.        | `_Gran Consejo_`                       |
| **H**     | Título de apartado, para dividir un comunicado largo. | `## Lo que falta`                      |
| **Lista** | Enumerar compromisos o puntos pendientes.             | `- El tramo alto`                      |
| **Cita**  | Destacar una frase o la voz de la asamblea.           | `> La memoria se corrige entre todos.` |

Las marcas se aplican a todas las líneas seleccionadas a la vez. Pulsar el mismo
botón sobre un texto ya marcado lo desmarca.

**Vista previa** muestra el comunicado tal como lo verá la comunidad. Es el
mismo dibujo que usa la pantalla de lectura: lo que se ve ahí es lo que se
publica.

Dos reglas que conviene recordar:

- **Deje una línea en blanco entre apartados.** Es lo que separa un párrafo del
  siguiente; sin ella todo se lee de corrido.
- Los comunicados antiguos, escritos antes de la barra, se siguen viendo bien:
  una línea corta y suelta se sigue tomando como título de apartado.

### 4.2 La firma del comunicado

Al pie de la columna lateral, cada comunicado se despide con una frase escrita
a mano y el nombre del Consejo. En **Firma del comunicado** se ve arriba cómo
quedará y se escribe debajo.

- **Escriba la suya**, hasta 60 caracteres. Son dos renglones a mano, no un
  párrafo.
- **Otra frase** recorre el repertorio de la comunidad, una por pulsación. El
  cuadro también las ofrece al escribir.
- **Déjela en blanco** y el comunicado firma solo, con una frase del repertorio.
  No se sortea en cada visita: a cada comunicado le corresponde siempre la
  misma, así que quien comparte el enlace y quien lo abre ven lo mismo.

### 4.3 Imágenes del comunicado

Hasta **20 imágenes** por comunicado, JPG, PNG o WebP de hasta 10 MB cada una.
Se guardan al añadirlas, sin esperar a **Guardar comunicado**, y solo se ven en
la comunidad cuando el comunicado está publicado.

El **pie de la siguiente imagen** se escribe antes de elegir el archivo: es el
texto que acompaña a la fotografía y lo que lee quien no puede verla.

La aplicación **no recomprime la fotografía**: guarda el archivo original tal
como salió de la cámara, hasta 24 megapíxeles (el triple que 4K). No se pierde
nitidez en el camino, así que una foto mal enfocada no mejora al subirla, y una
buena llega entera.

## 5. Bandeja de novedades del Consejo

En el panel verás **Novedades del Consejo**: reportes nuevos, cambios de estado
hechos por el equipo y solicitudes de eliminación de cuenta. Es un registro
compartido: sirve para repartir el trabajo, no reemplaza la reunión.

## 6. Solicitudes de eliminación de cuenta

Cuando alguien elimina su cuenta, el sistema, en la misma operación:

- retira su acceso y revoca sus sesiones;
- **borra del archivo privado las fotografías originales** que había enviado;
- **anonimiza sus expedientes**: sustituye la autoría por un seudónimo aleatorio
  y retira relato y teléfono;
- borra su bandeja de notificaciones y sus registros de envío.

**Categoría, vereda, estado y fechas se conservan** para que las estadísticas de
la comunidad sigan siendo ciertas. El seudónimo se descarta al terminar: después
de completarse no queda forma de saber quién reportó esos casos.

En la bandeja del Consejo aparece un aviso por cada solicitud. Si una queda
marcada como **parcial**, la eliminación no terminó: avisa a la persona
responsable del servicio para que se reintente. Hasta entonces el acceso ya está
retirado, pero quedan datos por anonimizar.

## 7. Análisis asistido

El panel ofrece un análisis remoto de las métricas. Está protegido por rol y
cuenta activa, tiene cupo diario por cuenta y describe los registros existentes.
**No demuestra causas ni representa a quienes no reportan.** Úsalo como apoyo de
redacción, nunca como fuente de una decisión.

## 8. Rutina de trabajo sugerida

**Cada jornada de atención**

1. Cargar expedientes y filtrar por Estado «Pendiente».
2. Revisar sensibilidad de los casos nuevos antes que nada.
3. Asignar prioridad y responsable.
4. Dejar una nota pública breve en los casos que avanzaron: es lo que la persona
   que reportó va a leer.

**Cada semana**

1. Filtrar por «En proceso» y comprobar que ninguno lleve demasiado tiempo quieto.
2. Publicar el comunicado o la alerta que corresponda.
3. Revisar solicitudes de eliminación pendientes o parciales.

## 9. Lo que la aplicación todavía no hace

Decirlo es parte del trabajo del Consejo ante la comunidad:

- **El catálogo de veredas no está validado.** Proviene del EOT de 2007 y de
  fuentes públicas. Hasta que el Consejo firme el catálogo oficial con sus
  coordenadas, la aplicación lo advierte en el formulario y no afirma límites
  territoriales.
- **No hay notificaciones push.** Los avisos se ven dentro de la aplicación
  mientras está abierta.
- **No hay aplicación nativa publicada en tiendas.** Se instala como aplicación
  web desde el navegador.
- **No hay adjuntos distintos de una fotografía** por reporte.
- **No hay registro de visitas técnicas en campo** más allá de las notas.
- **El acta de una retirada no tiene listado propio.** Se consulta abriendo la
  dirección del expediente retirado.
- **El historial propio y el listado público se paginan hasta 200 reportes.**
  Más allá de ese tope, la aplicación deja de limpiar por su cuenta las copias
  locales de expedientes retirados, a propósito: no borra por no haber mirado.

## 10. Responsabilidades operativas

Antes de abrir la aplicación a la comunidad, el Consejo debe designar por escrito:

| Responsabilidad                      | Qué implica                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **Persona mantenedora del servicio** | Custodia las credenciales, vigila el servicio y atiende los fallos.                            |
| **Persona responsable de datos**     | Atiende solicitudes de eliminación y de acceso, y vigila que no se publiquen datos personales. |
| **Turno de revisión**                | Quién revisa la bandeja y con qué frecuencia.                                                  |
| **Lineamiento editorial**            | Quién aprueba una alerta antes de publicarla.                                                  |
| **Copia de seguridad**               | Con qué periodicidad se respalda y **quién ha probado restaurarla**.                           |

Una copia de seguridad que nunca se ha restaurado no cuenta como copia de
seguridad.
