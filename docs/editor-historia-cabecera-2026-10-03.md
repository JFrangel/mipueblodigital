# Entrega: cabecera municipal y editor histórico

Fecha: 3 de octubre de 2026. Diseño aprobado por el usuario en esta conversación.

## Problema y resultado

Bocas de Satinga figuraba en la investigación territorial, pero no en el catálogo
que ofrecía el formulario. Ahora es seleccionable, se encuentra buscando Olaya
Herrera y tiene rótulo en el mapa aun sin incidencias. El expediente mantiene el
nombre canónico «Bocas de Satinga»; el rótulo explica que es cabecera municipal.
Las 18 veredas históricas permanecen intactas; el catálogo operativo tiene 19 lugares.

El 3 de octubre se descargó el archivo original del DANE y se inspeccionó su fila
52490000: departamento 52, municipio 52490, nombre BOCAS DE SATINGA, clase CM,
longitud −78.325814 y latitud 2.347457. No se dedujeron coordenadas de documentos
que confunden grados/minutos ni se tomó como centro urbano una sede institucional.
La coordenada es referencia urbana; el ciudadano conserva el ajuste manual.

Fuente: https://geoportal.dane.gov.co/descargas/divipola/DIVIPOLA_CentrosPoblados.xlsx
La copia de investigación está en `.runtime`, excluida del repositorio/despliegue.

La pestaña Historia permite a administradores editar los hitos base y crear otros,
con título, descripción, precisión de fecha, hora opcional, período, aclaración y
fuentes. La cronología se ordena por fecha del hecho. Borrador no publica;
Publicado en comunidad publica; Archivado retira conservando el documento.

## Seguridad y privacidad

- `requireAdmin` exige autenticación y autorización administrativa del proyecto.
- `readJson` limita el cuerpo real de la petición a 40 KB, sin confiar en Content-Length.
- La validación acepta fechas existentes, versiones enteras no negativas, textos
  acotados y de una a ocho fuentes HTTPS sin credenciales embebidas.
- Los textos se renderizan como texto React, sin ejecutar HTML de la descripción.
- El servidor no descarga las URLs; no es un proxy ni un mecanismo de carga de actas.
- Transacción de Firestore: lectura de versión, conflicto 409, nueva versión y
  auditoría atómica. El autor sale de la sesión validada, nunca del formulario.
- La proyección pública no contiene autor, fecha de creación administrativa ni auditoría.
- Las reglas niegan lectura/escritura directa de `councilHistory` y subcolecciones.
  El comodín existente ya lo negaba; la nueva regla documenta explícitamente el rechazo.
- La copia offline contiene solo resúmenes y fuentes públicas. No cargar datos
  sensibles: un dispositivo desconectado no puede recibir una retirada posterior.

## Pruebas y alcance

Ejecución final del 3 de octubre de 2026: **457/457 pruebas unitarias en 54
archivos**, **76/76 pruebas de navegador en 16 archivos**, sin omisiones ni
flakiness; reglas Firestore en emulador, lint sin errores, tipos y build pasan.
Playwright tardó 45,59 s en la ejecución final. No es una medición de rendimiento
de la app: es duración de la suite. Los JSON locales están en `.runtime`;
`docs/catalogo-pruebas.md` se regeneró con los nombres de cada caso.

La primera ejecución de navegador pasó 74/75: el test del mapa esperaba los
12 rótulos anteriores. Se actualizó a 13 y se añadió aserción específica de
cabecera municipal. La repetición final anterior incluye esa corrección y el
nuevo caso de endpoints administrativos sin sesión.

`tests/unit/council-history.test.ts`: inserción histórica 1994 entre 1993/1995;
semilla archivada sin reaparición; borrador excluido; reemplazo sin duplicados;
orden de año/mes/día y formato local; fechas inexistentes; año/mes/bisiesto;
hora con fecha incompleta; fuentes javascript/HTTP/credenciales; fuente obligatoria;
eliminación de campos ajenos; identidades y validez del catálogo base.

`tests/unit/council-history-api.test.ts`: guardado y autor auditado; rechazo de
versión antigua sin escritura; administrador rechazado; fecha e ID inválidos.
Estas pruebas utilizan dobles del SDK: comprueban el contrato y la intención
transaccional, no sustituyen una prueba con dos administradores reales en producción.

`tests/unit/territory.test.ts`: cabecera y coordenada DANE; 18 veredas históricas
conservadas; unicidad/orden; coordenadas dentro del marco permitido.

`tests/integration/rules.mjs`: emulador Firestore, rechazo de lectura, escritura y
auditoría para ciudadano, administrador cliente y visitante anónimo.

`tests/e2e/cabecera-history.spec.ts`: navegador contra compilación de producción;
búsqueda del municipio y selección canónica; API editorial anónima 401; cronología
con publicación remota simulada de 1994; recuperación de copia pública al fallar red.
`production-boundaries.spec.ts`: 13 rótulos documentados, incluida la cabecera,
sin crear coordenadas para lugares sin fuente. Las publicaciones simuladas no
escriben en la base real ni crean historia institucional de prueba.

El editor autenticado debe también revisarse con el custodio designado, comprobando
un borrador y publicación autorizados y un conflicto entre dos administradores.
No se declara hecha esa prueba humana/real con las pruebas automatizadas anteriores.

### Comprobación visual y despliegue reales

Después de publicar se abrió la pestaña Historia desde la sesión administrativa
existente del usuario. La API devolvió los 13 hitos y se abrió la ficha de 1991.
Se revisó el formulario en escritorio (1897 px de viewport) y emulación móvil
390 × 844, incluida la zona de fuentes; se revisaron los temas oscuro y claro.
El catálogo y formulario se apilan en móvil, con lista de altura limitada y
desplazamiento propio. En escritorio se distribuyen en dos columnas. Se
restauraron el tema oscuro y el tamaño original. No se modificó ni publicó
ningún hito institucional durante esta revisión de lectura y diseño.

Código publicado: commit `979a34b`, rama `develop`. Vercel confirmó Ready para
`dpl_EFcVR1LnsP8gJBmuoYoaTXqTB8ok`, creado el 3 de octubre a las 08:30:20
America/Bogota, y el dominio principal apunta a esa entrega.

- https://mipueblodigital.vercel.app/memoria/ → 200.
- https://mipueblodigital.vercel.app/mapa/ → 200.
- https://mipueblodigital.vercel.app/admin/ → 200 (la interfaz comprueba sesión/rol).
- `/api/history/` → 200, 13 hitos, sin campos administrativos privados.
- `/api/admin/history/` sin sesión → 401.

Antes de desplegar, `vercel deploy --dry --json` enumeró 220 archivos: cero
archivos privados o directorios de credenciales/diseño/runtime. `.env.example`
es la plantilla pública; los entornos reales y la monografía se excluyeron.
El despliegue fue normal, sin archivo comprimido. Las comprobaciones de permisos
y de diseño no equivalen a editar datos de producción ni al piloto del Consejo.

## Operación

Guía editorial completa: `docs/banco-consulta-consejo.md`. Los datos nuevos van a
Firestore, no requieren una actualización APK por cada hito. La APK actual carga
el sitio remoto, por lo que estos cambios web no modifican su motor nativo ni su
versión. El editor exige conexión y conserva la ficha al cambiar de pestaña;
avisa antes de descartar cambios al elegir otra ficha o cerrar la página.

Límite inicial de lectura: 1000 documentos editoriales. Si se supera, responde
con error explícito y exige ampliar paginación; evita publicar un catálogo parcial
que haría reaparecer hitos retirados. La historia investigada inicial funciona como
respaldo identificado cuando nunca se pudo obtener una copia remota.
