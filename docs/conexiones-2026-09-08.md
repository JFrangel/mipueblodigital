# Conexiones y cambios del 8 de septiembre de 2026

Verificación final: 18 pruebas unitarias y 15 recorridos de navegador aprobados, compilación y ESLint correctos. Se revisaron capturas de inicio oscuro y detalle completo. La búsqueda de la clave privada de OpenRouter en `.next/static` encontró cero coincidencias. Las pruebas no sustituyen la validación del recorrido remoto autenticado pendiente.

## Estado comprobado

- OpenRouter: la clave existente `apikey_openrouter` respondió 200 al endpoint de autenticación. El servidor admite también el nombre estándar `OPENROUTER_API_KEY`. Nunca se utiliza una variable pública para esa clave.
- Prueba sintética: `nvidia/nemotron-3-super-120b-a12b:free` respondió 200 en 2412 ms; `google/gemma-4-31b-it:free` respondió 429. Una sola prueba no establece un ranking general. Se eligió Nemotron inicialmente y se impiden modelos de pago. No se enviaron datos personales en las pruebas.
- Supabase: proyecto `ibprefpywmcjdvnjagri` reutilizado con autorización expresa del usuario y reactivado por MCP. Migración `mpd_original_evidence` aplicada; copia revisable en `docs/sql/evidencias-originales.sql`.
- Tabla `mpd_evidence_originals`: Base64, MIME, tamaño, SHA-256, autor e incidencia. RLS activo, sin acceso directo de `anon` o `authenticated`. Verificación SQL del hash y tamaño en transacción revertida. No se han subido fotografías de usuarios.
- Appllama: habilidad instalada en el directorio de habilidades de Codex; servidor MCP registrado como `appllama`. La autorización OAuth expiró sin callback. Completar su conexión desde la configuración MCP o `codex mcp login appllama`; requiere cuenta con acceso al servicio.

## Configuración privada pendiente

La configuración web de Firebase ya está en `.env`, pero no sustituye a la identidad del servidor. La comprobación de Application Default Credentials falló: falta configurar `GOOGLE_APPLICATION_CREDENTIALS` con la ruta a una cuenta de servicio autorizada, o una identidad de carga de trabajo equivalente en el despliegue. La cuenta debe pertenecer al proyecto Firebase correcto y tener permisos mínimos para Auth y Firestore.

También falta `SUPABASE_SERVICE_ROLE_KEY` del proyecto elegido. Guardarla solo en `.env` local o en el gestor de secretos del alojamiento. No pegar credenciales privadas en el chat, no versionarlas y no prefijarlas con `NEXT_PUBLIC`. `SUPABASE_URL` ya está configurada. Todavía debe implementarse el envío remoto idempotente y la recuperación de evidencias huérfanas.

La ruta `POST /api/admin/analysis/` verifica token revocado/desactivado, claim `admin` y documento `accounts/{uid}.active`. Usa conteos de estados reconocidos de Firestore; no recibe expedientes ni cifras del navegador. Las consultas por estado se ejecutan sucesivamente, por lo que no representan una instantánea transaccional del conjunto. Un control transaccional limita cada administrador a una petición por minuto entre instancias. Si falla el modelo, se conservan los conteos; el texto generado nunca se publica automáticamente. Falta probar el recorrido autenticado completo con un administrador autorizado.

## Alojamiento y riesgos pendientes

Se retiró `output: export`: usar un alojamiento compatible con servidor Next.js y `npm run build` + `npm start`, o su adaptador oficial. El antiguo `out/` no sirve el backend. Capacitor necesitará una estrategia de API remota y empaquetado separada; no está listo aún.

El asesor de Supabase informa que la tabla nueva no tiene políticas RLS: es intencional porque su uso es exclusivo del servidor. También señala visibilidad GraphQL de `public.image_registry`, de la versión anterior. No se modificó esa tabla; revisar su finalidad antes de cambiar sus permisos. [Explicación del asesor](https://supabase.com/docs/guides/database/database-linter?lint=0026_pg_graphql_anon_table_exposed).

`npm audit fix` aplicó correcciones compatibles, pero siguen 13 avisos moderados en dependencias transitivas, incluidos componentes de Firebase Admin. No se forzaron degradaciones mayores del SDK. Deben resolverse o evaluarse antes del despliegue público.

## Interfaz y territorio

Navegación Noticias/Historial/Estadísticas compartida; detalle como ruta `/reporte/{id}/` con regreso; color de texto oscuro corregido mediante herencia de tokens; banner conserva color; símbolo de árbol y río refinado; scrollbars integradas; agrupación desde cinco y pruebas configurables.

Se incorporaron cuatro referencias aproximadas en el mapa con fuente visible: Lérida Las Marías, Barro Caliente, Bellavista y San Isidro. Son referencias de Mapcarta basadas en OSM/GeoNames, no límites oficiales ni catálogo certificado del Consejo. Las consultas directas OSM/Overpass no estuvieron disponibles; no se inventaron las coordenadas restantes.

## Modelos gratuitos

[Catálogo oficial](https://openrouter.ai/collections/free-models), [Gemma 4 31B](https://openrouter.ai/google/gemma-4-31b-it:free), [Nemotron 3 Super](https://openrouter.ai/nvidia/nemotron-3-super-120b-a12b:free). Los modelos gratuitos tienen límites y disponibilidad variable; no garantizan continuidad de producción. Nemotron advierte sobre registro y uso de solicitudes: el diseño solo transmite conteos globales, nunca fotos, relatos, identidades o notas. Revisar esta política con el responsable institucional antes del piloto.
