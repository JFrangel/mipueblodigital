# Mi Pueblo Digital — plan completo de implementación

> Para ejecución por agentes: usar superpowers:executing-plans, completando y verificando cada tarea en esta sesión. Mantener casillas actualizadas; no marcar una integración por una simulación.

**Objetivo:** construir una aplicación comunitaria cuidada, accesible y verificable que cumpla las 21 historias de la monografía, funcione como PWA y en Android/iOS e integre IA supervisada.

**Arquitectura:** cliente estático Next.js compartido con Capacitor, módulos por función y backend en Firebase Cloud Functions. Firebase gestiona identidad y datos; Supabase Storage privado guarda evidencias, autorizado desde servidor. IndexedDB conserva borradores y coordina envíos recuperables.

**Tecnologías:** Next.js, React, TypeScript, Tailwind, Capacitor, Firebase Auth/Firestore/Functions/FCM, Supabase Storage, Leaflet, Recharts, Vitest, Testing Library, Playwright y comprobaciones de accesibilidad. Fijar versiones estables compatibles y lockfile al iniciar T01; las bibliotecas de UI no sustituyen diseño propio.

**Especificación:** `docs/specs/producto.md`. Criterios fuente: `docs/specs/criterios-originales.md`. Dirección visual: `design/v03/01-direccion-combinada.png` y módulos de `design/v02/`.

## Restricciones globales

- Interfaz en español; fechas visibles en America/Bogota y almacenamiento de instantes en UTC.
- Categoría, vereda, descripción y fotografía obligatorias al enviar. Borradores incompletos permitidos.
- Descripción: máximo 500 palabras. Celular opcional: hasta 10 dígitos. Notas administrativas: máximo 30 palabras.
- Registro y cambio de contraseña: 8–20 caracteres, al menos una mayúscula, un número y un carácter especial, conforme a la monografía. No almacenar contraseñas ni hashes en perfiles.
- Ciudadanos no pueden cambiar estados, prioridad, asignación, rol ni publicaciones oficiales.
- Lectura pública usa una proyección autorizada del caso. Identidad, teléfono, ubicación exacta y notas internas permanecen separados.
- Guardado local no equivale a recepción del Consejo. La confirmación de envío requiere acuse del servidor.
- La IA ofrece sugerencias editables; nunca publica, cambia estados ni asigna responsables automáticamente.
- Mantener ruta de captura manual cuando IA, mapas, cámara o geolocalización no estén disponibles.
- No trasladar los porcentajes de pruebas del Word a la nueva app: existen inconsistencias entre conclusiones y tabla 25.

## Entregas y dependencias

| Entrega | Tareas | Resultado comprobable |
| --- | --- | --- |
| A — Interfaz navegable | T01–T04 | Diseño combinado ejecutable con datos explícitamente de demo, pantallas y estados principales |
| B — Reporte completo | T05–T08 | Identidad, evidencia privada y envío recuperable real en emulador/staging |
| C — Gestión comunitaria | T09–T13 | Historial, Consejo, mapa, comunicados y estadísticas completos |
| D — Cuenta e inteligencia | T14–T16 | Datos de cuenta, notificaciones e IA evaluada |
| E — Aplicación híbrida y entrega | T17–T19 | PWA, Android, validación iOS, pruebas de campo y documentación |

Dependencias: T01 → T02 → T03 → T04; T03 → T05; T05 → T06 → T07 → T08; T08 → T09 → T10; T09 → T11; T05 → T12; T09 + T12 → T13; T05 + T07 → T14; T10 + T12 → T15; T07 + T10 → T16; T08 → T17; todo → T18 → T19. Se pueden trabajar componentes visuales con repositorios de demo mientras se habilitan servicios; no confundir ese avance con integración.

No fijar fechas de entrega ficticias. Medir tiempos por tarea una vez terminadas las primeras cuatro y ajustar planificación con esa evidencia. Kanban: Por hacer, En curso, En revisión, Terminado; una tarea de implementación activa y una en revisión como máximo. Registrar lead time, cycle time y throughput por entrega.

## Estructura de archivos propuesta

```text
src/app/                         páginas estáticas y layouts
src/components/ui/               controles accesibles compartidos
src/components/layout/           navegación y contenedores responsive
src/features/auth/               acceso, registro y sesión
src/features/home/               inicio ciudadano y administrador
src/features/incidents/          formulario, listas, detalle y seguimiento
src/features/admin/              asignación, estado, notas y auditoría
src/features/map/                mapa y lista territorial
src/features/news/               lectura y gestión de publicaciones
src/features/stats/              métricas y calendario
src/features/account/            perfil, tema, seguridad y eliminación
src/features/notifications/      bandeja y registro de dispositivos
src/features/ai/                 revisión de sugerencias
src/domain/                      contratos y reglas puras
src/data/demo/                   fixtures y adaptadores de demostración
src/data/firebase/               adaptadores reales
src/offline/                     IndexedDB, archivos y cola
src/platform/                    cámara, ubicación y estado de aplicación
src/styles/                      tokens y temas
public/brand/                    logo y recursos optimizados
functions/src/                   validaciones y operaciones de servidor
firebase/                        reglas e índices
tests/unit/                      reglas de dominio
tests/integration/               emuladores, archivos y cola
tests/e2e/                       recorridos de usuario
docs/qa/                         evidencias, defectos y resultados
```

## Contratos que comparten los módulos

Crear en `src/domain/contracts.ts`. Fechas en milisegundos UTC en dominio; adaptar Timestamp del proveedor solo en repositorios. La ubicación pública pertenece a otro DTO, no al objeto privado enviado al navegador comunitario.

```ts
export type Role = 'citizen' | 'admin';
export type Category = 'recursos_naturales' | 'conflictos_territoriales'
  | 'infraestructura' | 'socioeconomicos' | 'otro';
export type IncidentStatus = 'pendiente' | 'en_proceso' | 'solucionado'
  | 'no_solucionado' | 'descartado' | 'bloqueado_conflicto' | 'escalado';
export type Priority = 'baja' | 'media' | 'alta' | 'critica';
export interface IncidentDraft {
  clientRequestId: string; ownerUid: string; category?: Category;
  veredaId?: string; description: string; phone?: string;
  location?: { lat: number; lng: number; accuracy?: number };
  localAttachmentIds: string[];
}
export interface Incident extends IncidentDraft {
  id: string; status: IncidentStatus; priority: Priority;
  assigneeId: string | null; version: number;
  attachmentIds: string[]; createdAt: number; updatedAt: number;
}
export interface IncidentFilter {
  category?: Category; veredaId?: string; status?: IncidentStatus;
  mine?: boolean; cursor?: string;
}
export interface Page<T> { items: T[]; nextCursor?: string }
export interface IncidentRepository {
  listOwn(filter: IncidentFilter): Promise<Page<Incident>>;
  getOwn(id: string): Promise<Incident>;
  confirm(draft: IncidentDraft, attachmentIds: string[]): Promise<Incident>;
}
export interface ChangeStatusCommand {
  id: string; next: IncidentStatus; expectedVersion: number;
  note: string; visibility: 'public' | 'internal'; mutationId: string;
}
export interface AiSuggestion {
  original: string; proposed: string; category?: Category;
  missingFields: string[]; sourceIds: string[];
}
```

DTO público adicional en T06: id, categoría, vereda, descripción publicada, estado, createdAt, updatedAt y ubicación aproximada opcional; excluye ownerUid, phone y referencias de evidencia privada. Servidor deriva identidad del token; ignora cualquier ownerUid que el cliente intente asignar a otra persona.

## T01 — Base ejecutable y controles de calidad

**Crear:** `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `.github/workflows/ci.yml`, `README.md`.

**Produce:** proyecto que arranca, exporta a `out/` y ejecuta verificaciones locales. No requiere secretos ni servicios remotos.

- [ ] Comprobar versiones de Node/npm/Git y compatibilidad de paquetes estables; registrar versiones elegidas. Inicializar Git si sigue ausente, conservando diseños/documentos; no añadir archivos temporales ni secretos.
- [ ] Configurar Next.js con TypeScript estricto, exportación estática y páginas sin backend embebido. Instalar dependencias con lockfile.
- [ ] Crear scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:integration`, `test:e2e`; `test` ejecuta `vitest run`, `typecheck` ejecuta `tsc --noEmit` y `test:e2e` ejecuta `playwright test`.
- [ ] Añadir entorno `NEXT_PUBLIC_DATA_MODE=demo`, variables públicas del cliente y lista separada de secretos de Functions. El README explica que demo no envía reportes reales.
- [ ] Ejecutar `npm run build`, `npm run lint`, `npm run typecheck`; verificar CI con instalación reproducible y mismos comandos. Revisar diff y registrar commit de base.

## T02 — Identidad, componentes y navegación

**Crear:** `src/styles/tokens.css`, `src/styles/themes.css`, `public/brand/logo.svg`, `public/brand/hero.webp`, `src/components/ui/{button,field,dialog,status-badge}.tsx`, `src/components/layout/{app-shell,bottom-nav,sidebar}.tsx`, `src/app/inicio/page.tsx`, `tests/e2e/navigation.spec.ts`.

**Consume:** T01 y tokens de la especificación. **Produce:** shell responsive y componentes reutilizables con foco y temas.

- [ ] Construir logo vectorial del río y hero optimizado; usar tipografía local con licencia registrada. No recortar el mockup como interfaz.
- [ ] Implementar botón, campo, diálogo y estado semánticos. Dialog mantiene foco, devuelve foco al cerrar y tiene nombre accesible.
- [ ] Implementar navegación móvil y lateral de escritorio, con todas las rutas de la especificación; el botón Reportar tiene etiqueta visible y área táctil ≥44 px.
- [ ] Verificar manualmente 320/390/768/1440 px, teclado, tema oscuro y texto al 200 %. Guardar capturas en `docs/qa/visual/`.
- [ ] Ejecutar prueba de navegación y build; revisar diferencias visuales con v03, corregir solapamientos y registrar commit.

```ts
// tests/e2e/navigation.spec.ts
import { test, expect } from '@playwright/test';
test('reportar se alcanza desde inicio', async ({ page }) => {
  await page.goto('/inicio/');
  await page.getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Reportar', exact: true }).click();
  await expect(page).toHaveURL(/\/reportar\//);
});
```

## T03 — Dominio y datos coherentes de demostración

**Crear:** `src/domain/{contracts,validation,status-transitions}.ts`, `src/data/demo/{fixtures,incident-repository}.ts`, `tests/unit/incident-validation.test.ts`, `tests/unit/status-transitions.test.ts`.

**Produce:** `validateIncidentDraft(draft): string[]`, `canTransition(from, to): boolean`, adaptador `IncidentRepository` y fixtures deterministas.

- [ ] Escribir pruebas de 500/501 palabras, teléfono vacío/10/11 dígitos, evidencia ausente, categoría inválida y transición no admitida; ejecutarlas para comprobar fallo inicial.
- [ ] Implementar contratos anteriores y reglas puras. `validateIncidentDraft` devuelve códigos como `description_too_long`, `evidence_required`; convertir a español en UI.
- [ ] Crear fixtures de los siete estados, cinco categorías, casos propios/ajenos, notas privadas/públicas y fechas coherentes. Catálogo de veredas se etiqueta demostración.
- [ ] Aplicar tabla de transiciones de la especificación; el servidor volverá a validarla, no confiar solo en cliente.
- [ ] Ejecutar `npm run test -- tests/unit/incident-validation.test.ts tests/unit/status-transitions.test.ts`; revisar y registrar commit.

```ts
import { expect, test } from 'vitest';
import { validateIncidentDraft } from '../../src/domain/validation';
test('rechaza más de 500 palabras', () => {
  expect(validateIncidentDraft({clientRequestId:'r1',ownerUid:'u1',
    category:'infraestructura',veredaId:'demo-1',
    description:Array(501).fill('palabra').join(' '),
    localAttachmentIds:['a1']})).toContain('description_too_long');
});
```

## T04 — Primer recorrido visual completo

**Crear:** `src/features/home/home-screen.tsx`, `src/features/incidents/{report-wizard,own-list,incident-detail,case-timeline}.tsx`, `src/app/{reportar,mis-reportes,incidencia}/page.tsx`, `tests/e2e/demo-report.spec.ts`.

**Consume:** repositorio demo T03. **Produce:** primer entregable visible A.

- [ ] Construir inicio combinado: hero, resumen propio con Pendientes/En proceso/Solucionadas, reportes con fotos, noticias y actividad pública separadas.
- [ ] Crear cuatro pasos accesibles: categoría → vereda/ubicación → relato/foto → revisión. Mostrar progreso; volver no elimina datos; cancelar advierte si se descarta contenido.
- [ ] Implementar lista propia, detalle y eventos; no mostrar Solucionado como logrado si es solo un paso futuro. Vincular filas y fotos al mismo fixture.
- [ ] Probar recorrido con foto de fixture, volver de revisión, corregir relato y confirmar en modo demo. Mostrar confirmación rotulada de demostración, sin fingir recepción real.
- [ ] Ejecutar `npm run test:e2e -- tests/e2e/demo-report.spec.ts`, revisar capturas y abrir la app al usuario. Esta entrega no acredita backend ni IA.

## T05 — Autenticación, registro y roles reales

**Crear:** `src/features/auth/{auth-provider,login,register,recovery,verification}.tsx`, `src/data/firebase/auth.ts`, `functions/src/auth/require-actor.ts`, `firebase/firestore.rules`, `tests/integration/auth.test.ts`.

**Interfaces:** `requireActor(token): Promise<{uid:string;role:Role}>`; UI consume proveedor de sesión, sin leer secretos.

- [ ] Configurar emuladores y probar que ciudadano no obtiene datos administrativos ni cambia su rol.
- [ ] Implementar correo/contraseña, confirmación, ojos de contraseña, Google, recuperación y verificación; botones deshabilitados por validación con explicación visible.
- [ ] Derivar permisos de identidad verificada y estado activo en servidor. Asignar ciudadano por defecto; designación inicial de admin solo mediante procedimiento administrativo auditado.
- [ ] Probar credenciales incorrectas, correo no verificado, sesión expirada, Google cancelado y reautenticación. No aplicar restricciones de creación de contraseña a cuentas de proveedor externo.
- [ ] Ejecutar pruebas en emulador; documentar configuración OAuth necesaria para staging y registrar commit. Validación nativa de OAuth continúa en T17.

## T06 — Persistencia, proyección pública y autorización

**Crear:** `src/data/firebase/incident-repository.ts`, `src/domain/public-incident.ts`, `functions/src/incidents/{confirm,list-public,publish-projection}.ts`, `firebase/firestore.indexes.json`, `tests/integration/incident-access.test.ts`.

- [ ] Probar autor A frente a usuario B, administrador, anónimo y cuenta desactivada; intentar modificar ownerUid, rol, estado y ubicación pública desde cliente.
- [ ] Implementar colecciones de la especificación, índices según filtros y lecturas paginadas. Emplear ids estables y timestamps de servidor.
- [ ] Construir `PublicIncident` mediante lista explícita de campos; nunca serializar Incident completo y ocultar propiedades con CSS.
- [ ] Implementar API de confirmación con clientRequestId vinculado al uid. Repetir solicitud devuelve mismo id; contenido incompatible con id reutilizado produce conflicto.
- [ ] Ejecutar `npm run test:integration -- tests/integration/incident-access.test.ts`; comprobar que notas privadas y teléfonos no aparecen en payload público. Revisar y registrar commit.

## T07 — Evidencias privadas y entrega de archivos

**Crear:** `src/platform/camera.ts`, `src/features/incidents/evidence-picker.tsx`, `functions/src/files/{prepare-upload,verify-upload,authorize-download,cleanup}.ts`, `tests/integration/evidence.test.ts`.

**Interfaces:** `prepareUpload(caseRequestId, mime, bytes)` devuelve objectKey y destino temporal autorizado; `authorizeDownload(attachmentId)` verifica usuario y devuelve URL temporal. Cliente no elige libremente ruta de otro usuario.

- [ ] Consultar documentación actual de Storage por MCP y verificar proyecto autorizado antes de modificarlo. En local usar adaptador de prueba; crear bucket privado solo en proyecto específico de desarrollo.
- [ ] Probar acceso a archivo ajeno, firma vencida, tipo falso, tamaño excesivo y referencia a archivo inexistente.
- [ ] Implementar cámara/archivo, previsualización, eliminación antes de enviar y compresión. Validar bytes/MIME del lado servidor; foto requerida en confirmación.
- [ ] Separar subida de confirmación de caso, limpieza de huérfanos y retiro de EXIF; no guardar URLs firmadas en Firestore.
- [ ] Ejecutar pruebas de integración con Storage de prueba y comprobar rechazo a descarga no autorizada; registrar límites efectivos y commit.

## T08 — Borradores, cola y recuperación sin conexión

**Crear:** `src/offline/{db,outbox,sync-worker}.ts`, `src/features/incidents/outbox-screen.tsx`, `src/app/envios/page.tsx`, `tests/integration/outbox.test.ts`, `tests/e2e/offline.spec.ts`.

**Interfaces:** `saveDraft(draft): Promise<void>`, `enqueueDraft(id): Promise<void>`, `flushOutbox(): Promise<void>`; estados de transporte de la especificación.

- [ ] Probar primero interrupción tras subir imagen y antes de confirmación; dos pestañas intentando enviar; reinicio y cuota local agotada.
- [ ] Guardar datos y blobs por usuario; recuperar sin sesión cruzada. No marcar saved hasta completar transacción local.
- [ ] Implementar exclusión por operación, reintento con espera creciente, acuse idempotente y tratamiento de autorización vencida. En conflicto de edición no sobrescribir silenciosamente.
- [ ] Implementar pantalla Mis envíos y mensajes distintos para borrador, pendiente, error y enviado. Reintentar manualmente y al volver online/primer plano.
- [ ] Ejecutar 10 reintentos del mismo caso y comprobar un solo id; recargar offline y conservar borrador. Registrar evidencia y commit.

## T09 — Historial y seguimiento completos

**Crear:** `src/features/incidents/{history,filters,public-detail}.tsx`, `src/app/historial/page.tsx`, `tests/e2e/history.spec.ts`.

- [ ] Mostrar incidencias públicas por defecto, nuevas primero; filtros categoría, vereda, siete estados y Mis Incidencias.
- [ ] Mantener filtros y scroll al abrir/cerrar detalle; permitir vista cronológica descendente, categoría, vereda, fecha, relato, evidencia autorizada y notas.
- [ ] Probar sin resultados, Sin notas aún, caso retirado, adjunto no disponible y error recuperable.
- [ ] Probar que activar/desactivar Mis Incidencias cambia correctamente conjunto sin exponer expedientes privados ajenos.
- [ ] Ejecutar `npm run test:e2e -- tests/e2e/history.spec.ts`; comprobar paridad móvil/escritorio y commit.

## T10 — Panel del Consejo, notas y estados

**Crear:** `src/features/admin/{dashboard,case-table,case-inspector,status-dialog,note-editor}.tsx`, `src/app/admin/page.tsx`, `functions/src/incidents/{change-status,assign,add-note}.ts`, `tests/integration/admin-commands.test.ts`.

**Consume:** `ChangeStatusCommand`. **Produce:** transición atómica + evento de auditoría; la misma mutationId no duplica nota ni notificación.

- [ ] Probar ciudadano rechazado, nota de 31 palabras rechazada y expectedVersion vieja rechazada con conflicto.
- [ ] Crear resumen HU-12 y acceso exclusivo a Nueva noticia/Admin; bandeja con descripción, categoría/vereda, prioridad, asignación y estado.
- [ ] Añadir gestión expandible de notas públicas ≤30 palabras y modo interno claramente separado. Mostrar fecha y actor; no filtrar datos privados solo en presentación.
- [ ] Implementar cambio de estado con motivo, permisos y transacción. Resolver conflicto mostrando versión actual y conservando borrador del administrador.
- [ ] Ejecutar pruebas y abrir dos sesiones de admin para conflicto; comprobar auditoría y registrar commit.

## T11 — Mapa territorial y ubicación

**Crear:** `src/features/map/{territory-map,location-picker,map-list}.tsx`, `src/platform/geolocation.ts`, `src/app/mapa/page.tsx`, `tests/e2e/map.spec.ts`.

- [ ] Validar proveedor cartográfico, atribución, condiciones de caché y límites antes de configurarlo. No descargar mapas masivamente por defecto.
- [ ] Cargar Leaflet bajo demanda; centrar usando datos territoriales validados. En demo mostrar Mapa ilustrativo, sin afirmar límites geográficos reales.
- [ ] Implementar zoom, arrastre, agrupación, marcador, popup con categoría/descripción/estado y cerrar. Lista equivalente para teclado y falta de mapa.
- [ ] Ubicación: GPS opcional con precisión visible y ajuste manual; si se deniega, seleccionar vereda y punto manual sin perder relato. Publicar solo precisión autorizada.
- [ ] Ejecutar prueba con geolocalización concedida/denegada y servidor de tiles fallando. Comprobar que listado sigue utilizable; registrar commit.

## T12 — Noticias, alertas, eventos y gestión editorial

**Crear:** `src/features/news/{news-list,news-detail,news-filters,publication-editor}.tsx`, `src/app/noticias/page.tsx`, `src/app/admin/publicaciones/page.tsx`, `functions/src/publications/{save,publish-scheduled,delete}.ts`, `tests/e2e/news.spec.ts`.

- [ ] Definir tipos Alerta/Evento/Boletín y severidades Crítica/Alta/Media/Baja/Informativa; fuente Oficial/Comunidad sin habilitar publicación ciudadana no especificada.
- [ ] Implementar búsqueda por título, orden reciente/antiguo/anclado, filtros tipo/severidad/fuente, timeline, detalle y compartir con alternativa de copiar enlace.
- [ ] Crear formulario con título/tipo/severidad/resumen/contenido obligatorios, ubicación/autor/programación opcionales. Cancelar no guarda.
- [ ] Implementar anclar/desanclar, editar con datos precargados y borrar lógicamente con confirmación. Programación usa reloj de servidor e idempotencia; contenido futuro no se filtra al público.
- [ ] Probar usuario sin permiso, fallo al borrar, edición sin cambios, publicación futura y orden anclado. Ejecutar e2e, revisar y commit.

## T13 — Estadísticas verificables y calendario

**Crear:** `src/domain/statistics.ts`, `src/features/stats/{dashboard,monthly-calendar,category-chart,status-chart}.tsx`, `src/app/estadisticas/page.tsx`, `tests/unit/statistics.test.ts`, `tests/e2e/statistics.spec.ts`.

**Produce:** `summarizeStatuses(statuses): {total:number;solved:number;pending:number;rate:number}` y selección de fecha local.

- [ ] Escribir prueba para cero casos, siete estados y 24 solucionados de 40 = 60 %. Definir periodo, cohorte y exclusión de registros borrados.
- [ ] Implementar total/solucionadas/pendientes/tasa; gráfico circular por categoría y barras por estado conforme HU-10/11. Añadir tabla accesible, sin sustituir gráficas requeridas.
- [ ] Calendario mensual navegable, día seleccionado con lista de casos y estado No hay incidencias; probar cruce UTC/Bogotá.
- [ ] Separar métricas públicas de totales administrativos; paginar no debe limitar el denominador a la página visible. Recalcular agregados de forma idempotente.
- [ ] Ejecutar unitarias/e2e y comparar números con fixtures; registrar commit.

```ts
import { test, expect } from 'vitest';
import { summarizeStatuses } from '../../src/domain/statistics';
test('cohorte de cuarenta reportes', () => {
  const values = [...Array(24).fill('solucionado'),
    ...Array(10).fill('pendiente'), ...Array(6).fill('en_proceso')];
  expect(summarizeStatuses(values).rate).toBe(60);
});
test('conjunto vacío', () => expect(summarizeStatuses([]).rate).toBe(0));
```

## T14 — Perfil, tema, contraseña y eliminación

**Crear:** `src/features/account/{profile,security,preferences,delete-account-dialog}.tsx`, `src/app/{cuenta,seguridad}/page.tsx`, `functions/src/accounts/delete-account.ts`, `tests/integration/account.test.ts`.

- [ ] Editar nombre/avatar manteniendo correo no editable; Guardar solo si cambia. Sincronizar nombre en interfaz sin recargar sesión.
- [ ] Tema claro/oscuro inmediato y persistente; Sistema como extensión opcional, sin eliminar las dos opciones del Word.
- [ ] Cambiar contraseña con actual/nueva/confirmación y reautenticación; ruta adecuada para Google, recuperar correo y tratamiento de errores.
- [ ] Eliminar cuenta solo ciudadano, confirmación explícita y reautenticación; proceso idempotente que desactiva cuenta, revoca acceso, borra/anonimiza datos, archivos y tokens, y termina en cierre de sesión. Prueba de fallo parcial con recuperación.
- [ ] Ejecutar pruebas de lectura tras eliminación y limpieza local; documentar conservación de auditoría anonimizada y registrar commit.

## T15 — Notificaciones y mensajes de estado

**Crear:** `src/features/notifications/{notification-center,notification-preferences}.tsx`, `src/platform/push.ts`, `functions/src/notifications/deliver.ts`, `tests/integration/notifications.test.ts`.

- [ ] Construir bandeja dentro de app con leído/no leído y destino; el servicio funciona aunque se deniegue push.
- [ ] Registrar dispositivos por usuario tras permiso contextual; retirar token al salir y cuando proveedor lo invalide.
- [ ] Enviar una notificación por evento confirmado; contenido breve sin teléfono, ubicación privada ni nota interna.
- [ ] Probar duplicación del evento, permisos denegados, clic en caso inaccesible y fallo transitorio de entrega. No revertir un caso guardado porque falló la notificación.
- [ ] Ejecutar pruebas de integración y prueba real de push en staging; diferenciar resultado web/nativo en reporte y commit.

## T16 — IA supervisada y dictado

**Crear:** `src/features/ai/{suggestion-review,case-summary}.tsx`, `functions/src/ai/{provider,improve-report,summarize-case,transcribe,quota}.ts`, `tests/integration/ai.test.ts`, `docs/qa/ai-evaluation.md`.

**Interfaces:** mejorar relato devuelve `AiSuggestion`; resumen recibe id del caso y modo interno/público, servidor selecciona fuentes autorizadas. Ninguna operación IA recibe herramientas de mutación de casos.

- [ ] Verificar documentación y modelo disponible antes de activar proveedor; configurar clave solo en servidor, timeout y cupo. Propuesta inicial de prueba: 10 solicitudes diarias por usuario y 20 s por texto, ajustables según presupuesto acordado.
- [ ] Crear proveedor falso determinista para pruebas, claramente etiquetado en demo. Probar instrucciones maliciosas en relato, ids ajenos, fuentes inexistentes y salida con JSON inválido.
- [ ] Implementar comparación original/propuesta, aceptar/rechazar, categoría sugerida y campos faltantes. Fallo de IA conserva original y permite seguir reportando.
- [ ] Resumen y borrador público excluyen notas internas según modo; verificar citas de fuente. Dictado requiere micrófono y red, permite editar y descartar transcripción.
- [ ] Evaluar al menos 30 relatos ficticios diversos: hechos añadidos, categoría correcta, correcciones, tiempo y costes observados. No anunciar precisión sin resultados; ejecutar tests y documentar decisión de activación.

## T17 — PWA y empaquetado Android/iOS

**Crear:** `public/manifest.webmanifest`, `src/offline/service-worker.ts`, `capacitor.config.ts`, `src/platform/{network,app-lifecycle}.ts`, `docs/mobile-build.md`, proyectos nativos generados `android/`, `ios/`.

- [ ] Agregar manifest/iconos y caché versionada del shell; no cachear respuestas privadas indiscriminadamente. Actualización de app no elimina cola de borradores.
- [ ] Configurar `webDir: 'out'`, compilar export y sincronizar Capacitor. Verificar rutas con query y navegación atrás al abrir una notificación.
- [ ] Android: configurar SDK compatible, OAuth, cámara, ubicación y notificaciones; probar cierre forzado y reconexión en dispositivo/emulador.
- [ ] iOS: compilar y ejecutar en macOS/Xcode disponible; probar permisos, área segura, teclado, OAuth y push. Windows no verifica esta parte; registrar dependencia pendiente si no hay host.
- [ ] Verificar instalación PWA, arranque offline después de primera carga y transición entre versiones; documentar artefactos producidos sin publicar tiendas automáticamente.

## T18 — Verificación integral y piloto comunitario

**Crear:** `tests/e2e/end-to-end.spec.ts`, `docs/qa/{matriz,resultados,defectos,piloto}.md`.

- [ ] Vincular cada criterio original a prueba y evidencia, no solo cada título HU. Registrar esperado/real, fecha, versión y estado.
- [ ] Ejecutar lint/typecheck/unitarias/integración/build/e2e una vez sobre el candidato; repetir únicamente tras cambios o fallos relevantes. Bloquear entrega por fallos de autorización, pérdida o duplicación.
- [ ] Revisar visualmente todas las rutas en claro/oscuro y tamaños representativos; comprobar teclado, contraste, lector de pantalla, texto ampliado y red lenta. Medir rendimiento de build, no servidor de desarrollo.
- [ ] Proponer piloto con 5–8 habitantes y 2 responsables, sujeto a disponibilidad y consentimiento. Tareas: crear reporte, encontrar seguimiento, guardar offline, gestionar caso y leer comunicado. Metas propuestas: ≥80 % completa tareas principales sin ayuda y mediana SUS ≥75; resultados reales pueden exigir iteración.
- [ ] Corregir defectos, volver a medir tareas afectadas y registrar resultado honesto; si no hubo piloto, dejarlo pendiente y no declarar usabilidad validada.

## T19 — Entrega, operación y documentación académica

**Crear:** `docs/{manual-ciudadano,manual-consejo,operacion,arquitectura-final,trazabilidad-academica}.md`, configuración de hosting y guía de restauración.

- [ ] Preparar staging con datos ficticios y configuración separada; verificar dominio, HTTPS, variables, reglas y storage privado antes de carga real.
- [ ] Documentar respaldo/restauración, presupuestos y cuotas, fallos de sincronización, rotación de secretos, administración de usuarios y retirada de contenido.
- [ ] Preparar manuales con capturas de app real, diagramas y pruebas reproducibles. Actualizar correspondencia con monografía; corregir discrepancias de resultados sin reescribir evidencia histórica como nueva.
- [ ] Validar catálogo territorial, responsables, lineamientos de publicación y disponibilidad iOS antes de declarar alcance completo. Publicación real requiere configuración y autorización específicas disponibles en ese momento.
- [ ] Registrar versión entregada, incidencias conocidas y acta de demostración/recepción para el Consejo. No firmar por personas ni afirmar aceptación no recibida.

## Matriz de trazabilidad resumida

| HU | Tareas | Evidencia mínima |
| --- | --- | --- |
| 01 | T05 | Acceso admin, errores, Google y recuperación |
| 02 | T05 | Acceso ciudadano y separación de permisos |
| 03 | T05 | Registro, coincidencia y correo de verificación |
| 04 | T03/T04/T07/T08 | Validación, foto, cancelar, guardado y acuse |
| 05 | T09 | Filtros, propios/públicos, detalle, notas, timeline |
| 06 | T02/T04 | Inicio, navegación, estados, noticias y actividad |
| 07 | T11 | Mapa centrado, popup, zoom y cierre |
| 08 | T12 | Lista, etiquetas, anclado, detalle y compartir |
| 09 | T12 | Búsqueda, tipo, severidad, fuente, orden y timeline |
| 10 | T13 | Resumen y calendario con selección por día |
| 11 | T13 | Circular por categoría, barras por estado y leyendas |
| 12 | T10 | Inicio admin, métricas personales y acciones exclusivas |
| 13 | T10 | Notas ≤30 palabras y visibilidad |
| 14 | T12 | Crear/cancelar/publicar comunicado |
| 15 | T10 | Bandeja y cuatro filtros administrativos |
| 16 | T14 | Nombre/avatar, correo fijo y guardar cambios |
| 17 | T14 | Contraseña y reautenticación |
| 18 | T02/T14 | Tema inmediato y persistente |
| 19 | T14 | Confirmación, anonimización, cierre y rechazo posterior |
| 20 | T12 | Anclar/desanclar y reordenamiento |
| 21 | T12 | Editar, cancelar, borrar lógico y auditoría |

Requisitos transversales: modularidad T01/T03/T06; roles T05/T06/T10; archivos privados T07; offline T08/T17; notificaciones T15; híbrida T17; IA T16; QA/piloto T18; manuales/entrega T19. Video y planes de IA del apéndice son extensiones registradas en la especificación y no se declararán terminadas con la primera versión fotográfica.

## Uso de herramientas y MCP

Se inventariaron herramientas disponibles. Se usarán por su utilidad concreta:

| Herramienta | Momento y finalidad |
| --- | --- |
| Archivos y shell | Construcción, Git local, pruebas y evidencias reproducibles |
| image_gen | Ilustración propia y refinamiento de recursos, no generar la UI como imagen |
| Browser/CUA | Inspeccionar la app real, rutas, tamaño, formularios y capturas |
| Web/documentación oficial | Verificar APIs y compatibilidad antes de implementarlas |
| Supabase MCP | Documentación y comprobación del Storage de un proyecto identificado y autorizado |
| GitHub MCP/CLI | Repositorio, revisión y CI cuando se vincule el repositorio del proyecto |
| open_in_codex | Mostrar plan, prototipo y resultados dentro de la aplicación |

Firebase y Netlify se gestionarán mediante SDK/CLI si no hay MCP específico callable. Vercel está disponible pero no se cambiará hosting por su mera disponibilidad. Figma no está instalado; no se necesita para comenzar con diseño propio y navegador. Herramientas de correo, comercio y bases de datos ajenas no contribuyen a esta tarea y no requieren acceso.

## Estado al terminar la planificación

- [x] Confirmar fuente y extraer 21 historias completas.
- [x] Conservar dirección visual combinada en el proyecto.
- [x] Documentar especificación, decisiones y contradicciones.
- [x] Definir tareas, dependencias, archivos y verificación.
- [x] T01 iniciado y proyecto ejecutable.
- [x] Primera interfaz abierta y verificada en navegador; entrega A todavía parcial.

Avance del 6 de septiembre: base Next estática, identidad visual, navegación, captura local con foto y borrador, mapa con escenario de 300 coordenadas idénticas, estadísticas deterministas y guía integrada. T01–T04 parcialmente implementadas; T11/T13 tienen demostraciones locales. CI preparada, no ejecutada en GitHub. No están completas las integraciones T05–T19 ni las 21 HU. Continúa con identidad y permisos en emulador, evidencia privada y sincronización, conservando los criterios originales.

## Ampliación aprobada: límites, operación e IA administrativa

Consultar [Límites, operación y defensa](../../specs/limites-operacion-defensa.md). Amplía T11 con 300 coordenadas idénticas, consulta por área y lista paginada; T13/T16 con narrativa IA supervisada sobre métricas deterministas; y T19 con responsables, presupuesto y restauración verificable. La ayuda integrada se conserva en src/content/knowledge.ts. Son requisitos de implementación y prueba, no integraciones concluidas.

