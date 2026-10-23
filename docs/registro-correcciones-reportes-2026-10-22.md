# Registro de correcciones: consultas, sincronización y revisión final

Fecha de cierre: 22 de octubre de 2026, hora de Colombia.

## Alcance y estado

Este documento reúne el trabajo realizado desde el hallazgo de **inconsistencias en cómo las pantallas consultan los datos** hasta las correcciones de la última revisión. Complementa `correccion-consistencia-reportes-2026-10-21.md`, que conserva el registro de las etapas anteriores.

Los cambios están en el proyecto local. No se desplegó la aplicación, no se publicaron índices y no se modificaron expedientes reales. Las reproducciones utilizan datos de prueba. Los manuales ciudadanos y del Consejo no se editaron todavía.

El trabajo previo de catálogo editable, varias fotografías, visitas técnicas, notas con imagen, paginación y exportación completa se documenta en `plan-mejoras-consejo-2026-10-21.md` y `verificacion-mejoras-consejo-2026-10-21.md`. Este registro comienza con las inconsistencias que se detectaron después.

## 1. Las listas tenían reportes, pero los resúmenes mostraban cero

### Causa

El historial personal combinaba los reportes del servidor con las copias del dispositivo. El resumen superior y las tarjetas del inicio contaban únicamente las copias locales. Además, no todas las pantallas iniciaban la consulta de la cuenta. «Reportes recientes» mostraba datos locales aunque enlazaba al historial comunitario.

La consulta comunitaria convertía algunos fallos en una lista vacía. Por eso una respuesta fallida podía presentarse como «no hay reportes».

### Corrección y comportamiento resultante

- Inicio, resumen personal e historial usan la misma combinación de datos de la cuenta y copias locales de esa persona.
- La cuenta se consulta también cuando el dispositivo no tiene reportes guardados.
- «Reportes recientes» usa los resúmenes comunitarios autorizados por el servidor. Los expedientes privados permanecen en las vistas de su autor.
- El mapa y las estadísticas reciben el conjunto reunido por la pantalla principal.
- Los estados de carga, error, desconexión y respuesta completa son distintos. Una consulta pendiente o fallida no se presenta como un cero confirmado.
- Un fallo conserva la última lista disponible de la misma cuenta y ofrece reintentar. Las estadísticas advierten cuando los datos son parciales.
- Recuperar conexión, volver a la ventana o guardar un reporte vuelve a consultar. Se recorren todas las páginas y se detectan cursores repetidos.
- Cambiar de cuenta oculta la información anterior, cancela consultas pendientes e ignora lecturas locales que terminan tarde.
- Reconectar invalida la confirmación anterior antes de permitir la limpieza de copias locales: una respuesta antigua no autoriza borrar reportes durante una consulta nueva.

### Archivos principales

`src/components/workspace.tsx`, `src/data/remote-report-list.ts`, `src/data/account-reports.ts`, `src/data/community-map.ts` y `src/features/statistics.tsx`.

## 2. Reportes enviados después de recuperar señal

### Causa

Un reporte en cola tenía un identificador `LOCAL-…`. Al confirmarse, la copia local pasaba a «enviado», pero conservaba ese identificador. El servidor usaba el del recibo. Al combinar ambas fuentes podían aparecer dos registros; la limpieza podía considerar que la copia local ya no existía en el servidor.

### Corrección

- La confirmación reemplaza la clave local por el identificador del recibo y retira la clave anterior en una misma transacción de IndexedDB.
- Se conservan las fotos y notas locales y se usa la fecha de recepción del servidor.
- Repetir la confirmación no crea otra copia.
- Al leer el historial se revisan los recibos conservados en la bandeja para reparar copias de versiones anteriores.
- La entrega emite `case-delivered`; la pantalla vuelve a leer el almacenamiento y actualiza la consulta personal.
- El formulario usa la fecha del recibo cuando existe y la fecha de preparación del envío mientras permanece en cola.

Archivos: `src/data/local-store.ts`, `src/data/sync-outbox.ts`, `src/features/report.tsx` y `src/components/workspace.tsx`.

La reparación requiere que aún exista el recibo en la bandeja. No reconstruye copias locales ya eliminadas ni recibos borrados. El reporte recibido por el servidor se consulta por la cuenta.

## 3. Ubicaciones comunitarias y catálogo de veredas

### Causa y corrección

Los reportes comunitarios recibían las coordenadas de su vereda al terminar la consulta. Si el catálogo actualizado llegaba después, o cambiaba la ubicación, esas coordenadas quedaban congeladas.

`locateMapCase`, en `src/domain/map-catalogue.ts`, recalcula la ubicación comunitaria a partir del catálogo vigente. `src/features/territory.tsx` repite esa proyección cuando cambia el catálogo. Incluye nombres anteriores, nuevas coordenadas y retirada de coordenadas. Los puntos propios no se sustituyen por los del catálogo.

Un reporte sin ubicación documentada continúa en las listas y cifras aunque no pueda dibujarse como marcador. No se inventa una ubicación.

## 4. Confirmaciones de Android en segundo plano

### Causa y corrección

La revisión posterior detectó que `reconcileNative` utilizaba un camino distinto al envío web: no pasaba el identificador del recibo a `markCaseDelivered` ni avisaba a la pantalla. La corrección anterior estaba incompleta en ese camino.

`src/platform/native-outbox.ts` ahora transmite el identificador y la fecha del recibo y emite el mismo evento de actualización que el envío web. Solo lo hace cuando la confirmación corresponde al envío y a su cuenta, según la comprobación de `confirmNativeReceipt`.

Se verificó el puente mediante una prueba con el complemento nativo simulado. Falta la comprobación en un teléfono Android físico; no se generó ni distribuyó una APK nueva en este trabajo.

## 5. Eliminación de cuenta interrumpida durante la limpieza de notas

### Causa

El proceso cambiaba el propietario del expediente a un seudónimo antes de limpiar sus notas. Si esa limpieza fallaba, el reintento buscaba únicamente expedientes del propietario original y ya no encontraba el historial pendiente. Podía declarar la eliminación completa dejando notas personales.

Además, la limpieza del historial solo recorría hasta 500 actuaciones.

### Corrección

- La limpieza de notas busca los expedientes por el mismo seudónimo conservado durante el proceso de eliminación. Así retoma los historiales pendientes, incluidos los de un intento anterior.
- Una limpieza fallida mantiene `complete: false`; el reintento debe completarla antes de declarar finalizado el proceso.
- Se recorren páginas de expedientes y de actuaciones con orden estable y cursor. Las actuaciones se escriben en lotes de 450, dentro del límite de Firestore.
- Se vacían los textos de las notas y se conserva la trazabilidad de estado, actor y fecha.

Archivo: `src/server/anonymize.ts`. La ruta de eliminación sigue conservando el seudónimo mientras el proceso es parcial y lo descarta cuando termina.

Esta corrección no ejecuta una limpieza sobre producción. Recupera trabajos parciales cuyo proceso aún conserva el seudónimo; no recupera una relación descartada por una eliminación antigua ya marcada como completada.

## 6. Respuestas tardías en el formulario del Consejo

### Causa

Abrir un expediente publicado iniciaba una consulta de su resumen aprobado. Esa respuesta podía llegar después de cerrar el expediente y abrir otro, y rellenar el formulario actual con el resumen anterior. También podía sobrescribir texto que se acababa de editar.

### Corrección

La consulta del resumen pertenece ahora a un efecto asociado al identificador del expediente, su publicación, su vereda y la cuenta activa. Al cerrar, cambiar de expediente o cambiar de cuenta, se cancela la consulta y se descarta su respuesta. Los campos de título y resumen que ya contienen una edición se conservan.

Archivo: `src/features/council-inbox.tsx`. El navegador reproduce el cambio A → B con la respuesta de A retrasada y comprueba además una edición mientras llega el resumen aprobado.

## 7. Verificación y cómo repetirla

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 554 pruebas unitarias en 76 archivos aprobadas en la revisión del apartado 13 |
| `npm run typecheck` | Aprobado |
| `npm run lint` | Aprobado sin advertencias en la comprobación final |
| `npm run build` | Compilación de producción aprobada |
| `npx playwright test` | Batería completa: 91 recorridos aprobados en 19 archivos |
| `node scripts/probar-listas-reportes.mjs` | Hook real en Chromium: carga, error, conservación de lista, aislamiento de cuentas y reconexión |
| `node scripts/probar-formulario-consejo.mjs` | Formulario real en Chromium: respuesta tardía de A no altera B, se conserva una edición en curso y una retirada parcial permite terminar su limpieza |
| `node scripts/probar-historial-reportes.mjs` | Hook y lista reales en Chromium: aislamiento de expedientes y cuentas, páginas tardías descartadas, desactivación y reintento de página fallida |
| `node scripts/probar-eliminacion-consejo.mjs` | Formulario del Consejo: eliminación parcial, reintento y resultado completo |
| `node scripts/probar-consulta-expediente.mjs` | Detalle: actualización tras una escritura y ocultación inmediata al cambiar de cuenta |
| `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` | Sin variables, imports ni parámetros sin uso detectados por TypeScript |
| `node scripts/revisar-modulos-sin-uso.mjs` | 212 fuentes de `src` revisadas; sin módulos fuera del grafo de entradas auditadas |

La comprobación final ejecutó toda la batería con `npx playwright test`. Los recorridos relacionados de inicio, historial, mapa, sesiones, panel, modo oscuro, móvil y funcionamiento sin conexión también pueden ejecutarse por separado con:

```powershell
npx playwright test tests/e2e/app.spec.ts tests/e2e/production-boundaries.spec.ts tests/e2e/session-shell.spec.ts tests/e2e/management.spec.ts tests/e2e/pwa.spec.ts tests/e2e/mejoras-consejo.spec.ts
```

Las nuevas regresiones unitarias están en `tests/unit/delivery-receipt.test.ts`, `tests/unit/map-catalogue.test.ts`, `tests/unit/native-receipt.test.ts`, `tests/unit/workspace-reports.test.ts`, `tests/unit/anonymize.test.ts` y `tests/unit/retract.test.ts`. Los escenarios del navegador están en `tests/browser/` y sus scripts de ejecución en `scripts/`.

Los scripts de navegador usan las implementaciones reales del hook y del formulario, con las fronteras de autenticación, red y funciones nativas simuladas. No equivalen a una prueba conectada a los proveedores de producción ni a una prueba en dispositivo físico.

## 8. Identidad visual, manuales y puesta en funcionamiento

Se mantienen los componentes, colores, tarjetas, botones y estilos del proyecto. Los cambios visibles se concentran en cifras coherentes, mensajes de carga/error/desconexión y acciones de reintento. No se rediseñaron las pantallas.

La documentación de usuario deberá explicar la diferencia entre historial personal y resúmenes comunitarios, la última información disponible sin conexión, las confirmaciones de envíos y los estados parciales de eliminación. Para los cambios funcionales anteriores también quedan los apartados de catálogo, fotografías, visitas, notas, paginación y descarga completa ya identificados en sus documentos.

Antes de publicar se debe validar el entorno de destino y aplicar los índices pendientes documentados por el trabajo anterior, incluido el índice de propietario, fecha e identificador de `firebase/firestore.indexes.json`. Esta sesión no realiza ese despliegue.

## 9. Nueva revisión solicitada: hallazgos corregidos

La revisión posterior al cierre encontró los dos problemas siguientes. Primero se reprodujeron sin modificar la aplicación; después el usuario autorizó corregirlos. Las descripciones recogen el comportamiento anterior; la solución aplicada está en el apartado 10.

1. **Retirada incompleta que no retoma la limpieza.** En `src/app/api/admin/incidents/[id]/retirada/route.ts`, una vez borrado el expediente y creada el acta, un fallo del archivo privado devuelve una retirada parcial. Repetir la petición entra en el retorno de `result.repeated`, responde `complete: true` y no ejecuta de nuevo el barrido ni la eliminación del archivo. Reproducido con el doble de la ruta: la primera llamada queda incompleta; la segunda confirma la limpieza sin una segunda llamada al archivo privado. Los archivos pendientes pueden permanecer almacenados aunque el expediente ya no sea accesible desde la aplicación.
2. **Respuesta tardía del historial de actuaciones.** `src/data/remote-history.ts` comprueba que el componente siga montado y que la cuenta coincida, pero no invalida las consultas del expediente anterior al cambiar el identificador. Reproducido en Chromium con el hook real: se retiene la respuesta de A, se cambia a B y se reciben sus actuaciones; al liberar A, sus actuaciones sustituyen las de B. Es una consulta distinta de la del resumen aprobado del formulario del Consejo ya corregida en el apartado 6.

Las reproducciones utilizaron archivos temporales de prueba que se retiraron al finalizar. No se tocaron datos de producción ni se desplegaron cambios.

## 10. Corrección de retirada parcial e historial de actuaciones

### Retirada reanudable

- La ruta de retirada ya no interpreta que tener acta y no tener expediente significa haber terminado la limpieza. Un reintento recupera del acta la cuenta propietaria y vuelve a barrer las actuaciones, notificaciones, copias de evidencia y archivo privado.
- El acta y los avisos se crean únicamente durante la retirada inicial. Terminar la limpieza no vuelve a avisar a quien reportó ni cambia el motivo original.
- El resultado de cada barrido se comprueba. Si un lote llega a su límite o falla un proveedor, `complete` sigue siendo falso; otra petición continúa sobre lo que quede.
- El panel conserva abierto el formulario si la retirada es parcial. Explica que el reporte ya salió de las listas y ofrece **Terminar limpieza**. El motivo queda bloqueado y deja de ofrecerse **Conservar el reporte**, porque ya fue retirado. Al finalizar la limpieza se cierra la ficha.
- El reintento se hace desde ese formulario mientras permanece abierto; no se añadió una tarea automática de limpieza ni una nueva pantalla de retiradas pendientes.

Archivos: `src/app/api/admin/incidents/[id]/retirada/route.ts`, `src/features/council-inbox.tsx` y `tests/unit/retract.test.ts`.

### Historial ligado al expediente y a la cuenta

- `useRemoteHistory` identifica cada consulta por expediente, cuenta, habilitación y cursor. Cambiar el contexto limpia inmediatamente las actuaciones, errores y cursor anteriores.
- Se cancela la petición anterior con `AbortController`; además se descarta cualquier respuesta que llegue después de su cancelación o que ya no corresponda a la cuenta activa.
- La protección cubre tanto la primera página como las páginas adicionales. Las respuestas descartadas tampoco cambian los indicadores de carga del historial actual.
- Una página fallida conserva los registros ya cargados y puede pedirse de nuevo desde **Reintentar actuaciones**. El error se limpia al reintentar. Se impiden nuevas peticiones de paginación mientras hay una en curso y se detecta que el servidor repita el cursor recibido.

Archivos: `src/data/remote-history.ts`, `src/features/remote-history.tsx`, `tests/browser/history-list.tsx` y `scripts/probar-historial-reportes.mjs`.

### Evidencia de regresión

Las dos regresiones unitarias de retirada fallaron antes del cambio: el reintento no volvía a llamar al archivo privado y el límite de copias pendientes producía un `complete: true` incorrecto. Después del cambio pasan, junto con las pruebas de ausencia de actas y avisos duplicados.

En Chromium se reprodujo primero que A sobrescribía el historial de B; la prueba ahora verifica que B permanece intacto. También comprueba una página adicional fallida y su reintento desde la interfaz, una página que termina después de desactivar la consulta y el cambio a otra cuenta sin mostrar información de la anterior. La prueba del formulario reproduce una retirada parcial y su segundo intento satisfactorio.

La batería actual de 535 pruebas unitarias está aprobada, así como lint y la compilación de producción con comprobación de tipos. Se mantienen los límites del apartado 7: las regresiones usan proveedores simulados y no sustituyen una validación en producción o en Android físico. Los manuales y el despliegue siguen pendientes.

## 11. Revisión en profundidad posterior: hallazgos y corrección posterior

Esta revisión volvió a ejecutar las 535 pruebas unitarias y la comprobación de tipos, ambas aprobadas. Encontró los siguientes casos fuera de esa cobertura. Primero se diagnosticaron; las correcciones autorizadas después están en el apartado 12.

### Guardado tardío que interfiere con otro expediente

`src/features/council-inbox.tsx`, en `save`, conserva en su cierre el expediente y la sesión del momento de guardar. El botón superior de volver permanece disponible mientras espera el PATCH. Si se vuelve a la bandeja, se abre B y se empieza una nota, la respuesta tardía del guardado de A vuelve a seleccionar A y ejecuta `setNotes(blankNotes)`, perdiendo la edición de B. La comprobación `session.uid !== uid` también usa la sesión capturada; no consulta por sí sola la sesión actual.

Reproducción en Chromium con el componente real y fronteras simuladas: se retiene el PATCH de A, se abre B y se escribe su nota; al liberar el PATCH, la nota queda vacía. Es un camino de escritura distinto de las consultas de resumen e historial ya corregidas.

### Eliminación parcial cuyo reintento queda bloqueado por la identidad

`src/app/api/account/deletion/route.ts` deshabilita la cuenta y revoca sus sesiones antes de anonimizar. Sin embargo, su puerta de entrada, `requireIdentity` en `src/server/admin-auth.ts`, llama a `verifyIdToken(token, true)`. La implementación instalada de Firebase Admin (`node_modules/firebase-admin/lib/auth/base-auth.js`) comprueba con esa opción tanto revocación como deshabilitación y rechaza al usuario deshabilitado.

Por tanto, si la limpieza queda parcial después de cortar el acceso, repetir la petición ya no alcanza `anonymizeAccount`: devuelve 401. El cliente, además, cierra la sesión al recibir el resultado parcial. La corrección del apartado 5 hace reanudable la función de limpieza, pero el recorrido completo de usuario todavía no le permite llegar a ella en ese estado. No se encontró otra ruta administrativa de reanudación de esa limpieza.

Se comprobó la validación real de `requireIdentity` con un proveedor de identidad simulado que reproduce el rechazo de cuenta deshabilitada documentado por el código instalado: identidad aceptada antes de desactivar y 401 después.

### Cambio del catálogo que altera la firma de un reintento idéntico

`src/app/api/incidents/route.ts` resuelve el nombre contra el catálogo vigente y sustituye `data.vereda` antes de calcular la firma del contenido reservada en `incidentIntake`. Si el Consejo renombra la vereda entre el envío y su reintento, el mismo cuerpo original se normaliza con otro nombre y obtiene otra firma. La comparación con la reserva anterior devuelve 409, aunque la persona no cambió el reporte.

Reproducción con la ruta real y dobles de sus proveedores: enviar en Bellavista, renombrarla conservando Bellavista como alias, reenviar el mismo `requestId` y el mismo cuerpo. El primer envío devuelve 200 y el segundo 409 con el mensaje de contenido diferente. Esto puede dejar sin confirmar localmente un envío que sí existe en el servidor, por ejemplo si se perdió su primera respuesta.

Las reproducciones de esta revisión se ejecutaron en archivos temporales que se eliminaron al finalizar. No se tocaron datos reales, no se desplegó la aplicación y no se editaron los manuales. La aprobación de aquella batería no cubría estos escenarios; ahora tienen las regresiones descritas a continuación.

## 12. Correcciones finales, actualizaciones y código sin uso

### Guardados que terminan después de cambiar de pantalla

La bandeja liga cada guardado a la generación de la vista y a la cuenta que lo inició. Cambiar de expediente, cerrarlo, cambiar de cuenta o desmontar la vista invalida sus efectos sobre el formulario. La operación que ya recibió el servidor puede terminar, pero su respuesta no vuelve a abrir A ni borra lo que se esté escribiendo en B. También se descartan sus errores e indicadores de espera sobre la vista nueva.

`GestionConsejo` comprueba que su vista y su cuenta sigan vigentes antes de aplicar una respuesta. El detalle se monta con una clave por cuenta y expediente para separar estados de fotografías, formularios y consultas.

La prueba de `scripts/probar-formulario-consejo.mjs` retiene el PATCH de A, cambia a B, escribe una nota y libera el guardado de A: la nota de B permanece.

### Cómo termina una eliminación parcial

La autenticación ordinaria conserva la comprobación de revocación y cuenta deshabilitada. No se abrió una excepción de acceso para la persona cuya cuenta se eliminó.

La reanudación se hace con el rol del Consejo, desde **Quién administra → Terminar una eliminación pendiente**. Se indica el correo de la cuenta y se pulsa **Completar eliminación pendiente**. La nueva ruta `POST /api/admin/accounts/eliminacion/` solo continúa una solicitud propia de esa cuenta que ya esté pendiente o parcial, con su seudónimo conservado y la cuenta inactiva. No inicia una eliminación nueva ni reabre la cuenta. Una solicitud ya completada responde como completada sin repetir la limpieza.

La lógica compartida está en `src/server/account-deletion.ts`; la solicitud inicial y la reanudación utilizan la misma implementación. Conserva la fecha original, mantiene el seudónimo cuando hay un fallo y solo lo retira al completar el proceso. La cuenta permanece cerrada.

Una reserva de ejecución en Firestore impide que dos intentos vigentes limpien simultáneamente la misma solicitud. Si el servidor se interrumpe sin liberar la reserva, esta caduca en cinco minutos; la interfaz recibe un conflicto explícito mientras esté vigente. El resultado solo puede escribirlo el intento que posee esa reserva.

La reapertura rechaza solicitudes pendientes o parciales. Primero debe completarse la limpieza y después podrá tramitarse un restablecimiento. La reapertura sigue sin devolver fotografías, relatos ni expedientes anonimizados.

Las pruebas cubren rol requerido, ausencia de solicitud previa, cuenta reabierta, repetición idempotente, fallo durante la limpieza, conservación del seudónimo, fecha original y reserva de ejecución. El formulario real se comprueba en Chromium con el proveedor simulado.

### Reintentos de envíos y cambios de catálogo

El servidor guarda `requestHash`, una firma del contenido original del envío antes de cambiar el nombre de la vereda según el catálogo vigente. Un reintento idéntico puede recuperar el recibo aunque la vereda se haya renombrado o retirado posteriormente. Se sigue rechazando reutilizar el identificador con otro contenido.

Para reservas anteriores sin `requestHash`, se comprueba la firma histórica con el nombre recibido, el nombre vigente y los alias conservados. No se elimina la protección de propietario ni la de integridad de las imágenes. Cuando el expediente ya está confirmado y pertenece a la cuenta, se devuelve su recibo sin volver a escribir las evidencias ni generar otro aviso.

La validación de localidades activas y de propuestas con GPS sigue aplicándose a los envíos nuevos. Los cambios están en `src/app/api/incidents/route.ts` y las regresiones en `tests/unit/incident-api.test.ts`.

### Qué se actualiza después de guardar o retirar

`src/data/report-updates.ts` emite un aviso local después de escrituras confirmadas. Las listas de cuenta y comunidad, el detalle, el historial y las cifras del Consejo vuelven a consultar sus fuentes. El aviso incluye el identificador para que las vistas de un expediente puedan ignorar cambios ajenos. No reemplaza los permisos del servidor ni publica el contenido de los expedientes.

El historial vuelve a consultar desde la primera página al recibir un cambio de su expediente. El panel de cuentas vuelve a consultar al regresar a su pestaña y descarta resultados de otra sesión. Una escritura confirmada que terminó después de dejar su formulario puede actualizar las consultas sin modificar la edición de la nueva vista.

En el detalle se encontró y corrigió además una caché que solo distinguía el código del reporte: ahora también distingue la cuenta. Cambiar de cuenta oculta inmediatamente el expediente anterior, cancela la consulta vieja y consulta con la identidad esperada. La prueba `scripts/probar-consulta-expediente.mjs` cubre tanto esa separación como el refresco tras guardar.

Estos avisos actualizan la ventana actual; no son una suscripción en tiempo real entre dispositivos. Los otros dispositivos necesitan volver a consultar según sus eventos de foco, reconexión o navegación.

### Código sin uso y estabilidad de las pruebas

- Se retiraron imports sobrantes de React en los escenarios del navegador y se configuró JSX automático donde correspondía.
- Se eliminó la duplicación de la finalización de eliminaciones al compartir la misma función entre las dos rutas.
- La comprobación estricta de TypeScript no detecta variables, imports ni parámetros sin uso en el proyecto incluido por `tsconfig.json`.
- El script `scripts/revisar-modulos-sin-uso.mjs` recorre imports desde los archivos de entrada reconocidos de Next y los scripts del proyecto, incluidos scripts en subcarpetas. Revisa JavaScript y TypeScript en `src`, independientemente de su inclusión en `tsconfig.json`, y falla si encuentra imports locales de código sin resolver. Revisó 212 fuentes sin módulos huérfanos detectados. `src/content/manuales-markdown.ts` se conserva porque lo usa `scripts/generar-manuales-md.mjs`; no era código muerto.
- Este análisis estático no demuestra que todas las ramas sean alcanzables en ejecución. No se eliminaron archivos basándose únicamente en que no aparecieran en una pantalla.
- La primera batería completa encontró dos expectativas antiguas: un recorrido buscaba un reporte privado en el bloque comunitario del inicio y otro dependía de las imágenes de un comunicado publicado que puede editarse. El primero navega ahora al historial personal; el segundo utiliza un comunicado y una imagen de prueba controlados para comprobar el lector, sin modificar contenidos reales.

### Estado al terminar

La comprobación final incluye 545 pruebas unitarias, 91 recorridos Playwright, cinco escenarios dirigidos en Chromium, lint, compilación de producción y TypeScript estricto para uso de símbolos. Los resultados están resumidos en el apartado 7. Se mantiene la identidad visual y no se editaron los manuales ni se desplegó la aplicación. La prueba en Android físico y la validación contra proveedores reales siguen pendientes.

## 13. Revisión del detector de código sin uso y de las pruebas del comunicado

Se revisó expresamente el apartado anterior para comprobar que sus resultados no ocultaran fallos. El detector anterior trataba cualquier fuente dentro de `src/app` como entrada, dependía del inventario de TypeScript, solo recorría scripts del primer nivel y omitía imports locales sin resolver. Ahora reconoce los nombres de entrada de Next, inventaría también JavaScript, recorre scripts en subcarpetas y devuelve un error ante imports locales de código que no resuelve.

Las cuatro regresiones de `tests/unit/module-audit.test.ts` ejecutan el script real sobre proyectos temporales. Reproducen un archivo huérfano dentro de `src/app`, JavaScript fuera del inventario de TypeScript, dependencias válidas desde un script anidado y un import inexistente. Fallaron con el detector anterior y pasan con el corregido. El inventario del proyecto sigue siendo de 212 fuentes sin módulos fuera del grafo. Esto comprueba dependencias estáticas; no demuestra que toda rama o exportación se ejecute ni analiza imports cuyo nombre se construye dinámicamente.

El recorrido del lector conserva sus comprobaciones de apartados, listas, citas, imagen cargada y ampliación. Su imagen controlada usa ahora un UUID válido para respetar el contrato del servidor. Para que la simulación de esa imagen no sustituya la comprobación de las rutas, `tests/unit/news-media-read.test.ts` añade cinco pruebas que invocan los manejadores reales del comunicado y su archivo: entrega de bytes WebP, rechazo de borradores y archivados, identificadores inválidos, archivo ausente y fallo del almacenamiento. Los proveedores externos se simulan; no se modifican comunicados reales. Si falla el archivo privado, el artículo conserva el texto y la petición de imagen devuelve 503 sin caché.

Verificación repetida después de estos cambios: **554 pruebas unitarias en 76 archivos y 91 recorridos Playwright aprobados**, junto con lint, TypeScript con `--noUnusedLocals --noUnusedParameters`, compilación de producción y `git diff --check`. Los cinco escenarios dirigidos del apartado 12 corresponden a la ejecución anterior y no se repitieron en esta revisión, que no modifica componentes de producción. Se actualizó este registro; los manuales y el despliegue permanecen sin cambios.
