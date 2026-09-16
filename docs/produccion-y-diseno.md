# Diseño y preparación operativa

## Identidad y experiencia

Se añade bienvenida en `/bienvenida/`, ilustración original de árbol y río, logo vectorial, segundo banner seleccionable y tema oscuro de neutros grafito. El efecto de vidrio se concentra en la bienvenida; las fichas conservan superficies legibles. El detalle separa evidencia, estado actual, registro cronológico y última actualización, sin inventar fechas ni visitas técnicas.

Se consultó la [skill de diseño de Appllama](https://github.com/Appllama/appllama-skills/blob/main/skills/appllama-app-design-skill/SKILL.md). Su MCP no está conectado. Se adaptaron criterios al proyecto Next existente; no se afirma prueba nativa iOS ni reproducción exacta de Wabi.

## Territorio y fuentes

El [EOT municipal de 2007 archivado por ESAP](https://repositoriocdim.esap.edu.co/bitstreams/73366870-71c2-4050-82fe-873f691e287c/download) identifica centros poblados de la zona del río Satinga. La lista se muestra como referencia histórica en Comunidad; no reemplaza un catálogo vigente aprobado por el Consejo. [Colombia Aprende](https://redaprende.colombiaaprende.edu.co/metadatos/recurso/territorios-narrados-titulo-28-las-marias/) contextualiza Las Marías. No se deducen límites, autoridades actuales o contactos a partir de estos documentos.

## Firebase

SDK instalado y cliente en `src/data/firebase/client.ts`. `/acceso/` usa Firebase Auth para ingresar, recuperar contraseña y salir; si falta configuración, deshabilita el ingreso. No se guardan contraseñas en IndexedDB. Copiar `.env.example` a `.env.local` y completar la configuración web pública del proyecto autorizado. Nunca colocar una cuenta de servicio ni claves privadas en variables NEXT_PUBLIC.

Las reglas de Firestore separan expedientes privados, cuentas y proyecciones públicas. Solo autores y administradores activos pueden leer expedientes. Las escrituras directas se rechazan: deberán pasar por funciones autenticadas con validación y auditoría. La proyección pública rechaza documentos con campos fuera de la lista permitida.

Pruebas locales: `npx firebase emulators:exec --only auth --project demo-mi-pueblo "node tests/integration/auth.mjs"` y el equivalente `--only firestore` con `node tests/integration/rules.mjs`. Firestore requiere Java 21; se preparó un runtime portátil en `.runtime/java`, ignorado por Git. No se desplegaron reglas en ningún proyecto remoto.

## Pendientes para abrir el servicio

| Área | Implementado | Falta para operación |
| --- | --- | --- |
| Identidad | SDK, acceso y prueba en emulador | Proyecto, proveedores, alta de usuarios, verificación de correo, políticas y roles institucionales |
| Reportes | Validación, evidencia Base64 original sin recompresión, persistencia y gestión local | Funciones autenticadas, Storage privado, confirmación remota idempotente, auditoría inmutable |
| Mapa | Agrupación, lista, filtros, encuadre y error de tiles | Coordenadas reales verificadas, consulta por área, agregados remotos y proveedor dimensionado |
| Estadísticas | Filtros, calendario, exportación y cálculo reproducible | Agregados autorizados remotos, cohortes, carga y control de acceso |
| Comunidad | Búsqueda, tipo, orden y fuentes territoriales | Editor autorizado, programación, anclado, borrado lógico, auditoría y distribución |
| IA | Lectura determinista identificada | Proveedor servidor, límites, citas, revisión humana y evaluación |
| Operación | Plan y pruebas locales | Responsable, presupuesto, respaldos/restauración, monitoreo, piloto, accesibilidad y aplicaciones nativas |

No basta con quitar la palabra demo: esta tabla define trabajo que aún no está terminado. No se han recibido identificadores ni configuración del proyecto remoto.

