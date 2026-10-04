# Pruebas, resultados y rendimiento

Actualización del 3 de octubre (noche): tras corregir los textos de privacidad y
las fuentes de la memoria del Consejo y ampliar su guía, **465/465 unitarias y
77/77 pruebas de navegador**. Reglas, tipos, lint (sin avisos) y build pasan; la última sección
detalla la verificación independiente de ese día. Detalle de entradas,
aserciones, dobles y alcance del editor histórico en
[la entrega del editor histórico](editor-historia-cabecera-2026-10-03.md).
Los resultados de fechas anteriores se conservan como bitácora histórica.

Fecha de corte: 3 de octubre de 2026 (America/Bogota). El [catálogo individual](catalogo-pruebas.md) enumera **cada caso y su archivo** a partir del reporte JSON de Vitest y de `playwright test --list --reporter=json`; evita una cifra sin trazabilidad. Este documento explica qué comprueba cada capa, cómo repetirla y qué queda sin demostrar. Un nombre de prueba no es una evidencia de que se haya ejecutado.

## 1. Matriz de verificación

| Capa | Comando | Qué comprueba | Qué no demuestra |
| --- | --- | --- | --- |
| Formato/lint | `npm run lint` | Reglas estáticas ESLint de todo el proyecto | Comportamiento, accesibilidad o seguridad de servicios externos |
| Tipos | `npm run typecheck` | Contratos TypeScript | Permisos efectivos, errores de red, experiencia en teléfono |
| Unitarias y rutas aisladas | `npm test` | 465 casos en 55 archivos; lógica, almacenes, contratos de API con dobles | Firebase/Supabase reales, conectividad, dispositivo físico |
| Build | `npm run build` | Compilación de producción Next, rutas y empaquetado web | Que el backend esté configurado ni que las cuentas reales funcionen |
| Navegador | `npx playwright test` tras build; o `npm run test:e2e` | 77 casos en 16 archivos ejecutados; flujos de interfaz Chromium local | Android real, velocidades de río, autorización de recursos externos |
| Reglas de base | `npm run test:rules` | Reglas de Firestore en emulador con los casos de [`rules.mjs`](../tests/integration/rules.mjs) | API Admin, consola real, configuración de producción |
| Integraciones manuales | [`auth.mjs`](../tests/integration/auth.mjs) y [`remote-incidents.mjs`](../tests/integration/remote-incidents.mjs) | Flujos reales si se facilitan credenciales y entorno aislado | No deben ejecutarse sobre datos comunitarios sin preparar el entorno |
| Rendimiento local | `npm run test:perf` con servidor de producción local | Cinco cargas nuevas por ruta, DOMContentLoaded, load y tiempo de respuesta | Carga concurrente, experiencia de campo o Web Vitals reales |

### Unitarias: qué se comprueba por familia

- **Dominio y datos** (`tests/unit/domain`, `publication`, `priority` mediante `admin`, `delivery`, `outbox*`, `storage`, `territory`, `veredas*`): validación del reporte, estados, cálculo, cola con límite de 10 envíos/50 MiB, idempotencia, migraciones IndexedDB, coordenadas y veredas sin ubicación asumida.
- **Seguridad y privacidad** (`auth`, `roles`, `membership`, `community-projection`, `report-lookup`, `evidence`, `anonymize`, `retract`, `incident-api`): rechazo de roles enviados por el cliente, aislamiento de un expediente ajeno, aprobación y espera de publicación, archivo/foto privada, eliminación parcial/reintento y recibo solo tras verificar evidencia. Los dobles de base no son una prueba de reglas desplegadas.
- **Administración y comunicación** (`admin`, `management-metrics`, `notifications`, `news-*`, `push-*`, `reading*`, `writing-api`, `statistics-export`): cambios de estado y versiones, comunicados, bandejas, avisos, exportación y límites de lectura/escritura.
- **Móvil y sin conexión** (`service-worker`, `activation`, `native-auth`, `sin-cuenta`, `outbox-traspaso`, `voice-transcript`, `voz`): arranque, traspaso de envíos anónimos, caché, dictado y capacidades nativas simuladas. Un emulador JS no sustituye un APK instalado.
- **IA** (`openrouter`): formato del material y control de la respuesta; el modelo externo y sus términos pueden cambiar y requieren prueba operativa de proveedor.

Cada archivo y cada nombre exacto aparecen en [el catálogo](catalogo-pruebas.md); la [guía por archivo](guia-pruebas-por-archivo.md) explica el propósito de las 54 suites unitarias y las 16 de navegador. La cantidad se obtiene de la salida de la herramienta en cada ejecución y debe actualizarse cuando cambie el código.

### Navegador: qué se recorre

Los archivos `tests/e2e` cubren bienvenida, tema claro/oscuro, sesión, registro, reporte y borrador, voz, bandeja, navegación de Comunidad, comunicados, gestión del Consejo, límites de producción, PWA y primer arranque. La nueva prueba `council-memory.spec.ts` recorre la línea de tiempo en 390 px, filtros, búsqueda, fuentes, ausencia de desbordamiento y apertura sin red después de cachear la PWA. `playwright.config.ts` levanta `next start` en `127.0.0.1:3100` y conserva traza al fallar. Conviene correr una sola compilación estable; `next dev` y `next build` compiten por `.next`.

### Reproducir el inventario completo

En PowerShell, desde la raíz del proyecto:

```powershell
npm ci
npx vitest run --reporter=json --outputFile="$env:TEMP\mpd-vitest.json"
npx playwright test --list --reporter=json > "$env:TEMP\mpd-playwright.json"
node scripts/generar-catalogo-pruebas.mjs "$env:TEMP\mpd-vitest.json" "$env:TEMP\mpd-playwright.json"
```

El generador conserva los títulos individuales con enlaces al archivo. El JSON temporal no se versiona; los resultados de la ejecución se consignan en la sección final. Para comprobar los flujos de navegador: `npm run test:e2e`. Instalar Chromium con `npx playwright install chromium` si falta.

## 2. Rendimiento reproducible

`scripts/medir-rendimiento.mjs` abre con Chromium un **contexto nuevo** por muestra, sin service worker, tras levantar `npm run build` y `npx next start --hostname 127.0.0.1 --port 3100`. Mide `/bienvenida/`, `/comunidad/` y `/memoria/`; registra respuesta HTTP, `responseEnd`, `DOMContentLoaded`, `load` y bytes de la navegación cuando el navegador los reporta. Calcula p50 y p95 de cinco cargas por ruta. La salida JSON queda en `docs/resultado-rendimiento-local.json`. Repetir así:

```powershell
npm run build
npx next start --hostname 127.0.0.1 --port 3100
# En otra terminal:
npm run test:perf
```

`MPD_BASE_URL`, `MPD_PERF_SAMPLES` (1–20) y `MPD_PERF_OUTPUT` permiten cambiar servidor, repeticiones y archivo. Registrar siempre versión de Node, navegador, fecha y máquina. **No interpretar estos tiempos localhost como experiencia con señal móvil ni como prueba de capacidad concurrente.** No se ha medido aquí la latencia real de Firebase/Supabase, geolocalización, foto de 10 MiB ni el costo de 300 reportes en un punto del mapa. Para eso hacen falta datos sintéticos sin PII, una instancia de pruebas, métricas de servidor y teléfonos representativos de la comunidad.

Propuesta de aceptación para un piloto, **no resultado medido**: en teléfonos de gama media y red acordada con el Consejo, p75 LCP < 2,5 s, p75 INP < 200 ms, p75 CLS < 0,1; sin conexión, respuesta de guardado en cola < 2 s para foto típica; con 300 marcadores en una zona, interacción fluida y sin duplicar expedientes. Son objetivos a validar con medición real, no certificación Lighthouse ni garantía en el territorio. Instrumentar además tasa de envío confirmado, tiempo cola→recibo, errores por tipo y consumo de datos, siempre sin registrar relatos o fotos en telemetría.


## 3. Registro de la ejecución del 29-30 de septiembre (histórico)

La ejecución final después de la segunda ampliación de contenido del Consejo obtuvo las cifras de abajo. Son de ese corte: las vigentes están en la última sección, «Verificación independiente — 3 de octubre de 2026».

| Verificación | Resultado observado | Interpretación |
| --- | --- | --- |
| `npm run lint` | Salida 0 | Sin infracciones ESLint. |
| `npm run typecheck` | Salida 0 | TypeScript acepta los contratos en ese corte. |
| `npm test` | **430/430**; 51 archivos | Casos unitarios y de rutas aisladas aprobados. |
| `npm run build` | Salida 0 | Compilación Next de producción aprobada. |
| `npm run test:rules` | Salida 0 en emulador Firestore | Reglas locales, incluida la denegación de lectura directa de proyecciones públicas. |
| `npx playwright test --workers=4 --reporter=dot` | **72/72**; 15 archivos; 36,4 s en la verificación final de diseño | Flujos Chromium locales, incluida memoria del Consejo y PWA sin red. |

La política de visibilidad incluida en ese corte exige revisión administrativa y después 24 horas desde `publishedAt`; el resumen aprobado se sirve sin evidencia privada. Las pruebas de emulador no certifican que esas reglas se hayan desplegado en Firebase. Los tests sobre autenticación, almacenamiento y API externa usan dobles, salvo que su archivo indique explícitamente integración real.

La [medición JSON reproducible](resultado-rendimiento-local.json) se efectuó sobre `next start` local, con Node **24.18.0**, Chromium **153.0.8010.12**, cinco muestras independientes por ruta y todas las respuestas HTTP **200**:

| Ruta | p50 `load` | p95 `load` | p95 `DOMContentLoaded` |
| --- | ---: | ---: | ---: |
| `/bienvenida/` | 143 ms | 160 ms | 91 ms |
| `/comunidad/` | 145 ms | 146 ms | 28 ms |
| `/memoria/` | 164 ms | 174 ms | 109 ms |

La primera carga de bienvenida fue la más lenta de su serie (160 ms) y el cálculo p95 con solo cinco observaciones debe leerse como máximo cercano, no como percentil estable. El `transferBytes` registrado corresponde a la **navegación principal**, no al peso de todas las imágenes, fuentes y scripts. No se simuló red lenta, CPU limitada, usuarios simultáneos ni backend remoto. Estas cifras sirven para detectar regresiones locales bajo la misma metodología; la aceptación de campo continúa pendiente. También se inspeccionó visualmente `/memoria/` a 390 y 1280 px después del build: la cronología y la biblioteca conservaron legibilidad, fuentes y adaptación de columnas; las capturas de revisión son temporales y no contienen datos de usuarios.

## Verificación de la entrega 2.2 — 2 de octubre de 2026

435 unitarias, 73 recorridos de navegador y cuatro pruebas Android instrumentadas pasaron. Las reglas Firestore pasaron en el emulador; tipos, lint sin errores y build de producción también. Se repitió la medición local de cinco cargas por ruta: p95 load de bienvenida 186 ms, comunidad 144 ms, memoria 194 ms. La evidencia, alcance, comandos y limitaciones están en [la auditoría de entrega](auditoria-entrega-2026-10-02.md). Las ejecuciones históricas de este documento conservan sus fechas; la copia JSON de rendimiento corresponde a esta última medición.

## Verificación independiente — 3 de octubre de 2026

Repetida desde cero por el asistente Claude (Anthropic), a petición de Jose Padilla, sobre el commit `3c7586a` y, en lo marcado con \*, sobre el árbol corregido y ampliado de ese mismo día (la guía del Consejo con derechos, organización, territorio y glosario). Ninguna cifra se copió del informe anterior.

| Verificación | Resultado | Notas |
| --- | --- | --- |
| `npm test` \* | **465/465**, 55 archivos | Ocho casos nuevos: dos protegen la ficha pública de la historia (sin versión, estado ni autor) y la biblioteca de fuentes (solo HTTPS, sin repetir); seis cubren la guía del Consejo (fuentes, títulos y extensiones). |
| `npx playwright test --workers=4` \* | **77/77**, 16 archivos, 30,7 s | Tras compilar el árbol ampliado. El caso nuevo recorre la ley, los derechos y los tres consejos del municipio en móvil. |
| `npm run typecheck` \* | Salida 0 | |
| `npm run lint` \* | Salida 0, **0 avisos** | Antes había 2 avisos de variable sin usar en `src/server/council-history.ts`. |
| `npm run build` \* | Salida 0 | |
| `npm run test:rules` | Salida 0 en emulador | Sobre `3c7586a`; las correcciones no tocan `firebase/firestore.rules`. |
| Catálogo de pruebas | Idéntico al regenerado | Sobre `3c7586a`, `node scripts/generar-catalogo-pruebas.mjs` no cambió una línea. Tras añadir los casos nuevos solo cambian los totales, el recuento de los archivos tocados y los títulos nuevos. |
| Guía por archivo | Coincide archivo por archivo | La suma de sus tablas da 465 y 77. |
| APK 2.2 | Coincide | El SHA-256 y el tamaño de `public/descargas/mi-pueblo-digital.apk` son los de `version.json`. |
| Pruebas instrumentadas de Android | **No se repitieron** | Necesitan un emulador o un teléfono. |

Rendimiento local reproducido sobre `3c7586a` con el mismo Node 24.18.0 y Chromium 153.0.8010.12, cinco cargas nuevas por ruta, todas con HTTP 200:

| Ruta | p50 `load` | p95 `load` | JSON versionado (p50 / p95) |
| --- | ---: | ---: | ---: |
| `/bienvenida/` | 140 ms | 156 ms | 139 / 186 ms |
| `/comunidad/` | 139 ms | 144 ms | 136 / 144 ms |
| `/memoria/` | 144 ms | 200 ms | 140 / 194 ms |

Con cinco muestras el p95 es casi el máximo y cambia de una corrida a otra; lo que se repite es el orden de magnitud (unos 140 ms de carga en localhost). Sigue sin medirse red móvil, concurrencia ni servicios remotos, como dice la sección 2.

Los hechos y los enlaces de la memoria del Consejo se contrastaron aparte: la [tabla de la investigación](investigacion-consejo-rio-satinga.md#revisión-de-fuentes--3-de-octubre-de-2026) dice qué se comprobó contra cada texto y qué no se pudo confirmar.
