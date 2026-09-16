# Criterios originales de la monografía
Referencia extraída del documento el 6 de septiembre de 2026. No representa ejecución ni validación. Los cambios propuestos se documentan por separado.

## HU-01

Narrativa:Como administrador, quiero iniciar sesión con mis credenciales
para acceder a las funcionalidades de configuración del sistema.
Criterios de aceptación:
1. La pantalla de inicio de sesión debe tener campos para correo, contraseña y un botón de "inicio con Google".
2. La contraseña debe tener entre 8-20 caracteres, incluyendo una mayúscula, un número y un carácter especial.
3. La contraseña debe estar enmascarada pero con opción de ser visible.
4. El botón de ingreso debe estar deshabilitado hasta que los campos sean válidos.
5. Mostrar mensaje de error claro para credenciales incorrectas o correo no registrado.
6. Al validar las credenciales, redirigir al sistema.
7. Debe existir un enlace para recuperar la contraseña.

## HU-02

Narrativa: Como Usuario, quiero iniciar sesión con mis credenciales
para poder reportar mis incidencias y hacerles seguimiento.
Criterios de aceptación:
1. Pantalla de inicio con campos para correo, contraseña e inicio con Google.
2. Correo y contraseña son obligatorios si no se usa Google.
3. Contraseña enmascarada con opción de visualización.
4. Validar formato de correo electrónico.
5. Contraseña con políticas de seguridad (8-20 caracteres, mayúscula, número, especial).
6. Botón "Ingresar" deshabilitado hasta que los campos estén llenos.
7. Al ingresar, verificar credenciales y rol para dar acceso al panel de usuario.
8. Mostrar mensajes de error claros para credenciales incorrectas o correo no registrado.
9. Incluir enlace para recuperar contraseña.

## HU-03

Narrativa: Como usuario, quiero registrarme en la aplicación con mi correo y una contraseña para obtener credenciales y acceder a la plataforma de forma segura.
Criterios de aceptación:
1. Debe existir un enlace/botón de "Registro" desde el inicio de sesión.
2. El formulario debe solicitar Nombre, correo, contraseña y confirmación de contraseña.
3. Validar el formato del correo electrónico.
4. La contraseña debe cumplir políticas de seguridad (8-20 caracteres, mayúscula, número, especial).
5. El botón "Registrarse" debe estar deshabilitado hasta que los campos estén completos y las contraseñas coinciden.
6. Mostrar un mensaje de error si el correo ya está registrado.
7. Enviar un correo de confirmación con un enlace de activación tras el registro exitoso.

## HU-04

Narrativa: Como usuario, quiero poder reportar una incidencia seleccionando una categoría y vereda, añadiendo una descripción detallada y adjuntando una foto como evidencia
para informar al Consejo sobre un problema de manera clara, estructurada y documentada.
Criterios de aceptación:
1. Formulario con campos obligatorios: Categoría, Vereda, Descripción, Evidencia (foto) y uno opcional: Número de celular.
2. Menú "Categoría" con opciones predefinidas.
3. Menú "Vereda" debe cargar una lista completa.
4. Descripción con máximo de 500 palabras y celular con máximo de 10 caracteres.
5. Botón "Reportar incidencia" deshabilitado hasta que se llenen los campos obligatorios.
6. Poder seleccionar una imagen del dispositivo como evidencia.
7. Botón "Cancelar" que descarte los cambios y redirija a la pantalla anterior.
8. Al guardar, redirigir y mostrar una notificación de éxito.

## HU-05

Narrativa: Como usuario, quiero consultar un historial completo de incidencias, con la capacidad de filtrarlas por categoría, vereda y estado
para mantenerme informado tanto del estado general de la comunidad como del seguimiento de mis propios reportes.
Criterios de aceptación
1. Por defecto, al cargar la pantalla, se debe mostrar una lista con todas las incidencias públicas, ordenadas de la más reciente a la más antigua y con el título “Historial de incidencias” en la parte superior.
La pantalla debe incluir los siguientes controles de filtrado:
Menú desplegable para "Categoría".
Menú desplegable para "Vereda".
Menú desplegable para "Estado".
Casilla de verificación (checkbox) con la etiqueta "Mis Incidencias".
2. El menú desplegable de "Categoría" debe contener la opción por defecto "Todas las categorías" y las opciones específicas: Explotación irregular de recursos naturales, Conflictos territoriales, Deficiencias en infraestructura, Problemas sociales y económicos, Otro.
3. El menú desplegable de "Vereda" debe contener la opción por defecto "Todas las veredas" y la lista completa de veredas predefinidas del territorio (Bocas de Satinga, Alto Satinga, Bajo Satinga, Vuelta Larga, etc.).
4. El menú desplegable de "Estado" debe contener la opción por defecto "Todos" y las opciones específicas: Pendiente, En Proceso, Solucionado, No Solucionado, Descartado, Bloqueado por conflicto, Escalado a otra entidad.
5. Cuando el usuario marca la casilla "Mis Incidencias", la lista debe actualizarse instantáneamente para mostrar únicamente las incidencias reportadas por él.
6. Cuando el usuario desmarca la casilla "Mis Incidencias", la lista debe volver a su estado original, mostrando todas las incidencias públicas.
7. Cada incidencia en la lista debe mostrar la información esencial: Categoría, Vereda, Estado y fecha del reporte.
8. Cada incidencia listada debe tener un botón "Ver Detalles" para acceder a la información completa.
9. Al presionar "Ver Detalles", se debe abrir una vista que muestre la información completa del reporte: Categoría, Vereda, Descripción detallada, evidencia y Estado.
10. La sección "Notas" debe mostrar cualquier comentario dejado por el administrador con su fecha. Si no hay notas, debe mostrar el mensaje "Sin notas aún".
11. Debe haber un botón “Timeline” que muestre una línea de tiempo descendente con el orden cronológico de los reportes.
12. La vista de detalles debe tener un botón "Cerrar" que devuelva al usuario a la pantalla del historial.

## HU-06

Narrativa: Como usuario, quiero ver una pantalla de inicio al ingresar a la aplicación que me resuma el estado de mis incidencias, la actividad reciente en la comunidad y las últimas noticias para tener una visión general y acceder rápidamente a las funciones más importantes.
Criterios de aceptación
1. Al iniciar sesión, la pantalla por defecto debe ser "Inicio".
2. Mostrar un menú de navegación lateral (Inicio, Reportar, Mapa, Noticias, Historial, Estadísticas).
3. Sección "Acciones rápidas" con botones para "Reportar incidencia" y "Ver mapa".
4. Componente "Estado de incidencias" con el conteo de reportes personales (Pendientes, En Proceso, Resueltas) y enlace "Ver todas".
5. Componente "Últimas noticias" con los comunicados más recientes y enlace "Ver todas".
6. Componente "Actividad reciente" con los últimos reportes públicos y enlace "Ver historial".
7. Mostrar información del usuario (nombre, foto, rol) y un botón de "Cerrar Sesión".

## HU-07

Narrativa: Como usuario, quiero ver todas las incidencias reportadas en un mapa interactivo para comprender la distribución geográfica de los problemas en el territorio y su estado actual.
Criterios de aceptación
1. Cargar un mapa interactivo centrado en la región geográfica del Gran Consejo Comunitario Río Satinga.
2. Mostrar marcadores visuales en la ubicación de cada incidencia pública.
3. Permitir la navegación por el mapa (zoom y arrastre).
4. Al hacer clic en un marcador, mostrar una ventana emergente con información resumida (Categoría, descripción breve, Estado con indicador visual).
5. La ventana emergente debe tener un botón para cerrar y volver al mapa.

## HU-08

Narrativa: Como usuario, quiero ver una lista de todas las noticias y alertas publicadas para mantenerme informado sobre los comunicados del Consejo Comunitario..
Criterios de aceptación
1. Mostrar una lista de comunicados en formato de tarjetas, ordenada cronológicamente (más recientes primero).
2. Cada tarjeta debe mostrar: Título, Tipo, Severidad y descripción breve.
3. Las noticias "Anclado" deben aparecer al principio.
4. Cada tarjeta debe tener un botón de "Ver detalles" y "Compartir".

## HU-09

Narrativa: Como usuario, quiero usar herramientas para buscar, filtrar y ordenar la lista de noticias para encontrar rápidamente la información específica que necesito.
Criterios de aceptación
1. Debe existir una barra de búsqueda para filtrar por título.
2. Debe haber menús para filtrar por "Tipo" (Alertas, Eventos, Boletines) y para cambiar el "orden" (Más recientes, Más antiguas, Ancladas primero).
3. Un botón de "Filtros rápidos" debe permitir filtrar por "Severidad" (Crítica, Alta, Media, Baja, Informativa).
4. Pestañas para filtrar por fuente: "Todas", "Oficiales" y "Comunidad".
5. Incluir un botón "timeline" para vista cronológica.

## HU-10

Narrativa: Como usuario, quiero ver un resumen general y un calendario interactivo de incidencias para entender el volumen de reportes y consultar la actividad de días específicos.
Criterios de aceptación
1. Mostrar título "Estadísticas de la Comunidad".
2. Incluir 4 tarjetas de resumen: Total Incidencias, Solucionadas, Pendientes y Tasa Solución (calculada como % solucionadas / total).
3. Presentar un calendario interactivo que resalte los días con reportes.
4. Permitir la navegación entre meses.
5. Debajo del calendario, listar las incidencias del día seleccionado.
6. La lista de incidencias debe actualizarse automáticamente al hacer clic en un día.
7. Mostrar el mensaje "No hay incidencias." si un día no tiene reportes.

## HU-11

Narrativa: Como usuario quiero ver gráficos que desglosen las incidencias por categoría y estado para identificar visualmente cuáles son los problemas más comunes y cómo se están gestionando.
Criterios de aceptación
1. En la pantalla de estadísticas, debajo del calendario, mostrar un gráfico circular titulado "Incidencias por Categoría".
2. El gráfico circular debe representar la proporción de incidencias en cada categoría.
3. Incluir una leyenda clara que asocie cada color con una categoría.
4. Mostrar un gráfico de barras titulado "Incidencias por Estado".
5. El gráfico de barras debe mostrar el número total de incidencias para los estados principales (Pendiente, En Proceso, Solucionado).
6. Los datos de ambos gráficos deben corresponder a las estadísticas generales de toda la comunidad.

## HU-12

Narrativa: Como administrador quiero una pantalla de inicio que me ofrezca un resumen de la actividad de la comunidad y acceso rápido a mis funciones de gestión, como la creación de noticias y el panel de administración para poder supervisar y actuar.
Criterios de aceptación
1. El menú de navegación debe incluir un enlace a la sección "Admin".
2. La sección "Acciones rápidas" debe tener botones para "Reportar incidencia", "Ver mapa" y un botón exclusivo para administradores: "Nueva noticia".
3. El componente "Estado de incidencias" debe mostrar un resumen de los reportes del administrador.
4. El gráfico "Índice de solución" debe mostrar la métrica general.
5. Los componentes "Últimas noticias" y "Actividad reciente" deben mostrar la información de la comunidad.
6. Debe existir un botón para "Cerrar Sesión".

## HU-13

Narrativa: Como administrador quiero poder añadir notas a una incidencia para documentar el proceso de gestión y comunicar el progreso a la comunidad.
Criterios de aceptación
1. En la vista "Detalles de la Incidencia", debe haber una sección expandible "Gestión de Notas".
2. Al expandir, se debe mostrar un área de texto para "Añadir nota...".
3. El administrador debe poder escribir texto (máximo 30 palabras) y guardarlo.
4. La nota guardada debe aparecer en la lista de "Notas (todas)" y ser visible en "Notas públicas".
5. Debe haber un botón "Cerrar" para salir de la vista de detalles.

## HU-14

Narrativa: Como administrador quiero crear y publicar una nueva noticia, alerta o evento para informar a la comunidad sobre acontecimientos importantes.
Criterios de aceptación
1. En la pantalla de "Noticias y Alertas", debe haber un botón "+ Publicar".
2. Al hacer clic, se abre una ventana modal "Nueva publicación".
3. El formulario debe tener campos obligatorios: Título, Tipo, Severidad, Resumen y Contenido.
4. Campos opcionales: Ubicación, Autor, y fecha de programación.
5. Casilla para "Anclar publicación".
6. Botón "Publicar" deshabilitado hasta que los campos obligatorios estén completos.
7. Al publicar, la noticia aparece en la lista principal.
8. Botón "Cancelar" para cerrar la modal sin guardar.

## HU-15

Narrativa: Como administrador quiero ver todas las incidencias en un panel de gestión y usar filtros avanzados para localizar rápidamente los reportes que necesitan mi atención.
Criterios de aceptación
1. Al entrar en "Admin", mostrar "Panel de Gestión" con todas las incidencias.
2. Deben existir filtros por: Categoría, Vereda, Prioridad y Estado.
3. La lista debe actualizarse automáticamente al usar los filtros.
4. La lista debe mostrar columnas: Categoría/Vereda, Descripción, Prioridad, Asignado a, y Estado.
5. Cada fila debe tener una acción "Ver Detalles".

## HU-16

Narrativa: Como usuario quiero poder editar mi nombre y subir una foto de perfil para personalizar mi cuenta y que los demás me reconozcan.
Criterios de aceptación
1. Debe existir una sección de "Perfil" o "Mi Cuenta" accesible desde el menú principal.
2. El campo del nombre del usuario debe ser editable.
3. El correo electrónico no debe ser editable.
4. El botón "Guardar cambios" debe estar deshabilitado hasta que se realice una modificación.
5. Al guardar, la información del perfil (nombre) debe actualizarse en toda la aplicación.

## HU-17

Narrativa: Como usuario quiero poder cambiar mi contraseña de forma segura para proteger mi cuenta.
Criterios de aceptación
1. En la sección de "Cuenta", debe haber una opción para "Cambiar contraseña".
2. El formulario debe solicitar: "Contraseña actual", "Nueva contraseña" y "Confirmar nueva contraseña".
3. La nueva contraseña debe cumplir con las políticas de seguridad.
4. El botón "Guardar" debe estar deshabilitado hasta que los campos estén completos y las contraseñas coinciden.
5. Mostrar un error si la contraseña actual es incorrecta.
6. Mostrar un mensaje de confirmación tras el cambio exitoso.

## HU-18

Narrativa: Como usuario, quiero poder cambiar entre un tema claro y un tema oscuro en la aplicación para adaptar la visualización a mis preferencias.
Criterios de aceptación
1. En la sección "Cuenta" o "Preferencias", debe haber un interruptor para seleccionar el tema.
2. Las opciones deben ser "Modo Claro" y "Modo Oscuro".
3. El cambio debe ser inmediato en toda la interfaz.
4. La preferencia debe guardarse para futuras sesiones.

## HU-19

Narrativa: Como usuario, quiero poder eliminar mi propia cuenta y mis datos personales de forma permanente para tener control sobre mi información.
Criterios de aceptación
1. Opción "Eliminar cuenta" visible solo para rol ciudadano en la sección "Cuenta".
2. Al hacer clic, mostrar una modal de advertencia sobre la acción irreversible.
3. Requerir confirmación explícita (escribir contraseña o frase "ELIMINAR MI CUENTA").
4. Botón de confirmación deshabilitado hasta que se complete la acción.
5. Eliminar/anonimizar los datos del usuario de la base de datos.
6. Desconectar al usuario y redirigirlo al inicio de sesión.

## HU-20

Narrativa: Como administrador, quiero anclar una publicación para destacar información.
Criterios de aceptación
1. Cada tarjeta de "Noticias y Alertas" debe tener un menú de acciones (icono de tres puntos).
2. El menú debe contener la opción: Anclar/Desanclar.
3. Al seleccionar "Anclar", la publicación se destaca con una insignia "Anclado" y se mueve al inicio de la lista.
4. Al seleccionar "Desanclar", se retira la insignia y vuelve a su posición original.
5. El orden de la lista se actualiza inmediatamente.

## HU-21

Narrativa: Como administrador, quiero editar y eliminar una publicación para corregir, actualizar o suprimir información.
Criterios de aceptación
1. Cada tarjeta de "Noticias y Alertas" muestra un menú de acciones con opciones: Editar y eliminar.
2. Al seleccionar Editar, se abre una modal "Editar publicación" con los campos precargados.
3. Se aplican las mismas validaciones y el botón "Guardar cambios" permanece deshabilitado hasta cumplirlas.
4. Al guardar, la tarjeta se actualiza. El botón "Cancelar" cierra la modal sin guardar. Se registra auditoría de la edición.
5. Al seleccionar Eliminar, aparece un diálogo de confirmación.
6. Si se confirma, la publicación se oculta (borrado lógico) y se muestra un mensaje de éxito; si hay error, la tarjeta permanece visible con un mensaje de error.
