# Plan de salida a producción — 14 de septiembre de 2026

Auditoría completa del repositorio frente a las 21 historias de la monografía y al plan
`docs/superpowers/plans/2026-09-06-mi-pueblo-digital.md`. Este documento corrige el estado
declarado en el encargo: varias tareas que se creían pendientes ya están implementadas, y
las brechas reales son otras.

Verificación al iniciar la auditoría: `npm run typecheck` correcto, `npm test` 43 pruebas
en 14 archivos correctas.

## 1. Corrección del estado percibido

| Pendiente reportado | Estado real verificado |
| --- | --- |
| «El formulario solo guarda en IndexedDB con owner demo» | **Hecho.** `src/features/report.tsx:56` tiene `submitRemote()`: encola en la bandeja y llama `syncOutbox` → `POST /api/incidents/`. El botón «Guardar reporte de demo» es una segunda acción deliberada, rotulada. |
| «Falta consumir GET /api/incidents/» | **Hecho.** `src/features/remote-reports.tsx` lista los expedientes del ciudadano autenticado y descarga la evidencia privada. |
| «Falta bandeja de salida y reintentos» | **Hecho en el modelo de datos.** `src/data/outbox.ts` tiene cola por cuenta, arriendo entre pestañas, espera exponencial acotada a 15 min, límite de 10 reportes / 50 MB e identificador idempotente; `src/data/sync-outbox.ts` ejecuta el ciclo. Brecha real: rendimiento y reintento en segundo plano (§3). |
| «Falta pantalla Mis envíos» | **Hecho.** `src/features/outbox.tsx` con estados Borrador/En cola/Enviando/Requiere atención/Confirmado. |
| «Falta mutación real de estados» | **Hecho.** `PATCH /api/admin/incidents/[id]` con transacción, `expectedVersion`, `mutationId` idempotente, evento de auditoría y notificación en la misma transacción. |
| «La campana muestra un mensaje estático» | **Hecho.** `src/components/workspace.tsx:245` monta `<Notifications />` contra `/api/notifications/`. Brecha real: el punto rojo del icono es decorativo y no refleja no leídas (§2.1). |
| «Falta PWA» | **Hecho parcialmente.** `src/app/manifest.ts`, `public/sw.js` y `public/offline.html` existen y el shell se precachea. Falta Background Sync (§3) y empaquetado Capacitor (§6). |

## 2. Brechas reales, por prioridad

### 2.1 P0 — Identidad de sesión ausente en el shell *(bloquea HU-12, HU-16, HU-18, HU-19)*

Es la brecha de mayor impacto y la causa raíz de varios incumplimientos:

- `src/components/workspace.tsx` codifica `«JP»` y `«José Padilla · Perfil de demostración»`
  en la barra lateral y superior. HU-16.5 exige que el nombre se actualice **en toda la
  aplicación** al guardarlo.
- El enlace «Panel del Consejo» es visible para cualquiera. HU-12.1/12.2 lo reserva a
  administradores, y HU-19.1 reserva «Eliminar cuenta» al rol ciudadano.
- No hay botón «Cerrar sesión» en el shell (HU-12.6); solo dentro de `/cuenta/`.
- El contador de «Mis reportes» cuenta ejemplos locales (`owner === "demo"`).
- El avatar que el ciudadano elige en `AvatarPicker` nunca se muestra.
- **Coste técnico:** cada funcionalidad abre su propia suscripción `onAuthStateChanged`
  (`report`, `outbox`, `remote-reports`, `notifications`, `council-inbox`, `account`,
  `news-editor`). Son siete suscripciones y siete `getIdToken()` independientes.

**Solución:** un almacén de sesión compartido (`src/data/session.ts`) con una sola
suscripción `onIdTokenChanged`, lectura de la reivindicación `admin`, caché del avatar y
del nombre para pintado inmediato, y un hook `useSession()` sobre `useSyncExternalStore`.

### 2.2 P0 — Eliminación de cuenta sin anonimización *(HU-19.5)*

`POST /api/account/deletion` solo registra la solicitud y deshabilita el acceso; el propio
mensaje admite que «la anonimización todavía debe completarla el equipo». HU-19.5 exige
eliminar o anonimizar los datos. Falta además la frase de confirmación «ELIMINAR MI CUENTA»
(HU-19.3) y ocultar la opción a administradores (HU-19.1).

**Solución:** rutina de anonimización idempotente y reanudable en servidor: sustituye el
propietario por un seudónimo derivado, borra teléfono y descripción personal, retira la
evidencia privada de Supabase, elimina la bandeja de notificaciones y conserva el expediente
y su auditoría bajo el seudónimo para la trazabilidad comunitaria.

### 2.3 P0 — Bandeja del Consejo sin filtros ni prioridad *(HU-15)*

`src/features/council-inbox.tsx` lista expedientes sin los cuatro filtros exigidos
(Categoría, Vereda, Prioridad, Estado), sin columnas y sin campo de prioridad: el modelo de
incidencia no tiene `priority`, aunque los contratos del plan lo declaran.

### 2.4 P0 — Gestión editorial incompleta *(HU-20, HU-21)*

El anclado existe en dominio, API y ordenamiento del feed, pero el editor no ofrece el menú
de acciones por tarjeta (anclar/desanclar, editar, eliminar) ni el diálogo de confirmación
de borrado lógico exigidos por HU-20.1–20.5 y HU-21.1–21.6.

### 2.5 P1 — Rendimiento del modo sin conexión

Ver §3. El diseño funcional es correcto; el coste por lectura no lo es.

### 2.6 P2 — Territorio, empaquetado y entrega

Coordenadas sin validar por el Consejo (T11), Capacitor ausente (T17), piloto comunitario
(T18) y manuales (T19).

## 3. Modo sin conexión: diagnóstico de rendimiento y decisión de diseño

El problema no es la lógica de cola, es **dónde vive la fotografía**.

1. `prepareEvidence` devuelve la imagen como *data URL* Base64. Una foto de 10 MB se
   convierte en una cadena JavaScript de ~13,4 MB.
2. `outbox.ts` guarda esa cadena dentro del mismo registro que los metadatos.
3. `outgoingFor(owner)` hace `getAll` sobre el índice del almacén y **deserializa todos los
   registros con sus fotografías**.
4. `src/features/outbox.tsx` invoca `outgoingFor` **cada 15 segundos, en todas las secciones**
   (el indicador compacto está montado siempre).

Resultado: hasta 50 MB de cadenas Base64 reconstruidas cada 15 segundos solo para pintar
«2 envíos pendientes». En un teléfono de gama media esto produce pausas de recolección de
basura visibles justo en el escenario que la app promete resolver.

**Decisión:** separar metadatos y carga útil en dos almacenes de IndexedDB
(`reports` y `payloads`), con migración de la versión 1 a la 2. El listado pasa a leer solo
metadatos —decenas de bytes por registro— y la fotografía se carga únicamente al reclamar un
envío para transmitirlo. No cambia el contrato de red ni el comportamiento observable.

Medidas complementarias:

- No leer IndexedDB ni sincronizar con la pestaña oculta.
- Registrar **Background Sync**: al recuperar señal el navegador despierta al *service worker*,
  que pide a un cliente activo que vacíe la cola. El token de sesión nunca entra al *worker*.
- Vaciar la cola inmediatamente al volver a estar en línea, no en el siguiente tic.

Alternativas descartadas: guardar `Blob` en lugar de Base64 reduciría otro 25 % la memoria,
pero obliga a reescribir el contrato de `ReportPayload`, `prepareEvidence`, los borradores y
cuatro pruebas; queda registrado como mejora posterior, no como requisito de salida.

## 4. Orden de ejecución propuesto

| # | Entrega | Historias | Estado |
| --- | --- | --- | --- |
| 1 | Almacén de sesión compartido | base de 12, 16, 18, 19 | ✅ hecho |
| 2 | Shell con identidad, rol, cierre de sesión y campana real | HU-12, HU-16 | ✅ hecho |
| 3 | Anonimización de cuenta en servidor | HU-19 | ✅ hecho |
| 4 | Filtros y prioridad en la bandeja del Consejo | HU-15 | ✅ hecho |
| 5 | Menú de acciones editorial | HU-20, HU-21 | ✅ hecho |
| 6 | Rendimiento sin conexión y Background Sync | T08, T17 | ✅ hecho |
| 7 | Catálogo territorial documentado en el formulario | HU-07 | ✅ hecho, validación pendiente del Consejo |
| 8 | Manuales de ciudadano y del Consejo | T19 | ✅ hecho |
| 9 | Empaquetado Capacitor | T17 | ⏳ pendiente |
| 10 | Piloto comunitario | T18 | ⏳ pendiente |

## 4.1 Qué se implementó en esta sesión

**Sesión compartida (`src/data/session.ts`).** Una sola suscripción `onIdTokenChanged`
publica identidad, rol y avatar a toda la aplicación mediante `useSyncExternalStore`.
El shell dejó de codificar «José Padilla»: muestra el nombre real, el avatar elegido y
si la cuenta es ciudadana o del Consejo. El enlace al Panel del Consejo y sus paneles
remotos solo se montan con la reivindicación `admin`; se añadió «Cerrar sesión»
(HU-12.6) y el punto de la campana refleja novedades sin leer reales.

**Novedades (`src/data/notifications.ts`).** Un almacén con recuento de referencias
sustituye las consultas duplicadas: un solo ciclo por ámbito, detenido sin
suscriptores, sin sesión o con la pestaña oculta.

**Eliminación de cuenta (`src/server/anonymize.ts`).** Rutina idempotente y reanudable
que borra la evidencia privada de Supabase, sustituye la autoría por un seudónimo
aleatorio, retira relato y teléfono, elimina notificaciones y registros de envío y
conserva categoría, vereda, estado y fechas. El seudónimo se descarta al completarse.
La interfaz exige la frase «ELIMINAR MI CUENTA», cierra la sesión y devuelve al acceso
con el resultado. `requireIdentity` permite reintentar sobre una cuenta ya desactivada.

**Bandeja del Consejo.** Campo `priority` en el modelo, con «media» por omisión y
asignable solo por el Consejo; cuatro filtros combinables, tabla con las cinco columnas
de HU-15.4 y acción «Ver detalles».

**Gestión editorial.** Menú de acciones por publicación con anclar/desanclar, editar y
borrado lógico confirmado; el guardado se deshabilita hasta que el formulario es válido.

**Rendimiento sin conexión.** `outbox.ts` separa metadatos y fotografía en dos almacenes
de IndexedDB, con migración probada de la versión 1 a la 2. Listar la bandeja ya no
reconstruye las imágenes. El ciclo pasó de 15 a 30 segundos y se detiene con la pestaña
oculta. El *service worker* atiende `sync` y pide a una pestaña abierta que vacíe la
cola al recuperar señal, sin recibir nunca el token.

**Catálogo territorial (`src/domain/territory.ts`).** El formulario ofrece las 18
veredas documentadas del EOT en lugar de cuatro nombres de demostración, con aviso
explícito de que faltan la validación y las coordenadas oficiales. El servidor rechaza
veredas fuera del catálogo.

**Verificación.** 54 pruebas unitarias en 17 archivos, 26 de navegador, `lint`,
`typecheck` y `build` correctos. Se corrigieron tres errores de lint preexistentes en
`report.tsx`, una prueba que exigía comillas rectas donde el texto usa tipográficas y
una carrera de hidratación en la prueba de PWA que la hacía fallar dos de cada cinco
ejecuciones.

## 5. Lo que no depende del código

Estas tareas no se pueden cerrar programando y deben abrirse en paralelo:

- **Catálogo territorial (HU-07).** Las coordenadas de `src/data/territorial-sources.ts`
  provienen de Mapcarta y del EOT de 2007 y están rotuladas como referencias aproximadas.
  Requieren acta de validación del Consejo Comunitario antes de publicarse como oficiales.
- **Designación del administrador inicial.** La reivindicación `admin` se otorga fuera de la
  aplicación; debe quedar documentado el procedimiento y quién lo ejecuta.
- **Credenciales de producción.** `FIREBASE_SERVICE_ACCOUNT_KEY`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY` y el dominio autorizado para Google.
- **Piloto (T18).** 5–8 habitantes y 2 miembros del Consejo, con consentimiento informado.
- **iOS.** No verificable desde Windows; queda como dependencia declarada.

## 6. Criterio de «listo para producción»

No declarar la salida sin: reglas de Firestore probadas en emulador contra cuenta ajena y
desactivada, recuperación de copia verificada, una ronda de piloto registrada, y los manuales
`docs/manual-ciudadano.md` y `docs/manual-consejo.md` escritos con capturas de la aplicación
real. Una compilación correcta no acredita las 21 historias.
