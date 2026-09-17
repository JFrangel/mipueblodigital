# Mi Pueblo Digital

Aplicación de gestión de incidencias del **Gran Consejo Comunitario Río
Satinga**, Olaya Herrera, Nariño. La comunidad reporta lo que pasa en el
territorio; el Consejo lo recibe, lo gestiona y responde.

## Qué hace hoy

- **Reportar** con fotografía, vereda y punto en el mapa, con sesión real de
  Firebase. Sin señal, el reporte queda en cola y sale solo cuando vuelve la red.
- **Seguir el propio reporte** desde cualquier teléfono: el historial es de la
  cuenta, no del aparato.
- **Bandeja del Consejo** con estado, prioridad, responsable, control de versión
  optimista y auditoría de cada actuación.
- **Publicación comunitaria en dos niveles**: la ficha que consta sola pasadas
  las horas de gracia, y el resumen que el Consejo redacta tras revisar.
- **Retirada de un expediente con su motivo**, que le llega a quien reportó.
- **Comunicados** con portada, imágenes y anclado.
- **Mapa, estadísticas y calendario** sobre los reportes reales del territorio.
- **Eliminación de cuenta** con anonimización de los expedientes.

La aplicación **no lleva datos inventados**: lo que se ve es lo que la comunidad
reportó. Una instalación nueva arranca vacía, y cada pantalla dice de dónde sale
lo que enseña.

## Ejecutar

Requiere Node.js 24 y npm.

```bash
npm ci
npm run dev
```

Abrir http://127.0.0.1:3000. Copiar `.env.example` como `.env` y rellenarlo: sin
credenciales de Firebase no hay sesión, y sin las de Supabase no se guardan
fotografías.

## Verificar

```bash
npm run lint && npm run typecheck && npm test && npm run test:e2e
```

`test:e2e` compila antes de correr el navegador, porque **Playwright prueba
contra `.next`**: ejecutarlo sin compilar verifica la compilación anterior. La
primera vez hace falta `npx playwright install chromium`. Ejecutar `build` y
`dev` a la vez compite por `.next`.

Estado: **191 pruebas unitarias** (33 archivos) y **60 de navegador**, con lint y
typecheck limpios.

## Desplegar

Servidor Next.js, no exportación estática: las rutas protegidas y los detalles
dinámicos lo necesitan. `npm run build` y `npm start`.

El rol del Consejo es una reivindicación del token, no un campo de la base:
escribirlo a mano en Firestore no hace administrador a nadie. El primero se
concede con `node scripts/conceder-admin.mjs correo@ejemplo.com`; a partir de
ahí, desde el propio Panel del Consejo.

## Documentación

| Documento                                                                 | Para quién                              |
| ------------------------------------------------------------------------- | --------------------------------------- |
| [Arquitectura](docs/arquitectura.md)                                      | Quien va a tocar el código o sostenerlo |
| [Empaquetado Android](docs/empaquetado-android.md)                        | Quien compile y publique la aplicación  |
| [Auditoría del modo sin conexión](docs/auditoria-offline-2026-09-16.md)   | Quien dude de qué funciona sin señal    |
| [Manual del ciudadano](docs/manual-ciudadano.md)                          | Quien reporta                           |
| [Manual operativo del Consejo](docs/manual-consejo.md)                    | Quien gestiona                          |
| [Plan de salida a producción](docs/plan-produccion-2026-09-14.md)         | Quien coordina el piloto                |
| [Especificación de producto](docs/specs/producto.md)                      | Sustentación                            |
| [21 historias y criterios originales](docs/specs/criterios-originales.md) | Sustentación                            |
| [Límites de operación y defensa](docs/specs/limites-operacion-defensa.md) | Sustentación                            |
| [Conexiones y credenciales](docs/conexiones-2026-09-08.md)                | Quien opera el servidor                 |

La guía `/documentacion/`, dentro de la aplicación, explica entradas, procesos,
salidas y variantes en el lenguaje del territorio.

## Antes de abrirla a la comunidad

Lo que falta no es código. Está detallado en
[Límites conocidos](docs/arquitectura.md#14-límites-conocidos); en resumen:

1. Validar el catálogo territorial con el Consejo. Cinco veredas no tienen punto
   documentado; sus reportes se gestionan igual, pero no se dibujan.
2. Probar las reglas de Firestore en emulador contra una cuenta ajena y otra
   desactivada.
3. Verificar la restauración de copias de seguridad.
4. Completar las pruebas de accesibilidad.
5. Ejecutar el piloto comunitario y designar formalmente a la persona
   mantenedora.

Una compilación correcta no es la validación de las 21 historias de usuario.
