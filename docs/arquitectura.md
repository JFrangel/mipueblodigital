# Arquitectura de Mi Pueblo Digital

Referencia técnica completa del sistema de gestión de incidencias del **Gran
Consejo Comunitario Río Satinga** (Olaya Herrera, Nariño).

Este documento describe **lo que el código hace hoy**, con la ruta del archivo
que lo hace. Cuando algo no está resuelto, se dice en [§13](#13-límites-conocidos)
en lugar de omitirlo. Los manuales de uso viven aparte:
[del ciudadano](manual-ciudadano.md) y [del Consejo](manual-consejo.md).

---

## Índice

1. [Las tres decisiones que lo explican todo](#1-las-tres-decisiones-que-lo-explican-todo)
2. [Mapa del repositorio](#2-mapa-del-repositorio)
3. [Quién manda sobre cada dato](#3-quién-manda-sobre-cada-dato)
4. [Modelo de datos](#4-modelo-de-datos)
5. [Identidad y permisos](#5-identidad-y-permisos)
6. [La API, ruta por ruta](#6-la-api-ruta-por-ruta)
7. [Privacidad: las tres proyecciones](#7-privacidad-las-tres-proyecciones)
8. [Ciclo de vida de un reporte](#8-ciclo-de-vida-de-un-reporte)
9. [Sin conexión](#9-sin-conexión)
10. [La interfaz](#10-la-interfaz)
11. [Configuración](#11-configuración)
12. [Verificación y operación](#12-verificación-y-operación)
13. [Límites conocidos](#13-límites-conocidos)

---

## 1. Las tres decisiones que lo explican todo

Casi cada detalle del sistema se deduce de tres decisiones. Conviene tenerlas
delante antes de leer el resto.

### 1.1. El servidor manda; el aparato guarda una copia

Un reporte enviado vive en el servidor del Consejo. Lo que queda en el teléfono
es **una fotografía del día en que salió**: trae la imagen y el punto del mapa,
que solo están ahí, pero su estado envejece en cuanto el Consejo mueve el caso.

Siempre que las dos fuentes discrepan, **el estado lo pone el servidor y lo
demás lo conserva el aparato**. La regla está escrita tres veces, una por cada
sitio donde se juntan:

| Dónde                 | Función                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| «Mis reportes»        | `mergeAccountReports` — [`src/domain/account-reports.ts`](../src/domain/account-reports.ts)          |
| Mapa e historial      | `mergeMapCases` — [`src/data/community-map.ts`](../src/data/community-map.ts)                        |
| Detalle de un reporte | `useReportLookup` + el solapado en [`src/components/workspace.tsx`](../src/components/workspace.tsx) |

De la misma decisión sale que **lo que el servidor ya no tiene se borra del
aparato**: `orphanedReports` señala las copias de expedientes retirados y el
espacio de trabajo las quita de IndexedDB. Solo cuando el servidor contestó la
lista **entera**: con media lista, lo que falta puede estar en la otra mitad.

### 1.2. Cada pantalla dice de dónde salió lo que enseña

No hay una lista que mezcle fuentes en silencio. «Mis reportes» dice que es de
la cuenta; el historial de Comunidad dice que es lo que la comunidad puede ver;
el mapa dice «tus reportes y los que la comunidad puede ver»; un boletín servido
del caché lleva la cabecera `X-Guardado`. Una cifra que el sistema no puede
conocer se deja en blanco, no en cero.

### 1.3. La privacidad se decide en el servidor, campo a campo

Ninguna proyección se arma esparciendo el documento (`...d`): el expediente
lleva al lado el teléfono de quien reportó, su identificador de cuenta y el de
la evidencia. Cada campo que sale está escrito a mano en
[`src/server/community-view.ts`](../src/server/community-view.ts) y en las rutas,
y las reglas de Firestore cierran el acceso directo desde el navegador
([`firebase/firestore.rules`](../firebase/firestore.rules)): **todo lo que se ve
pasó antes por una ruta que comprobó quién pregunta**.

---

## 2. Mapa del repositorio

```
src/
  app/            Rutas de Next.js (App Router)
    [section]/    Todas las pantallas del espacio de trabajo, en una sola ruta
    acceso/       Entrada y registro
    bienvenida/   Primera visita
    noticia/[id]/ Comunicado público
    reporte/[id]/ Detalle de un expediente
    api/          25 rutas de servidor (§6)
    globals.css   Hoja única de la aplicación
  components/     Piezas compartidas de interfaz (workspace, ui, case-list…)
  features/       Pantallas completas (report, council-inbox, territory…)
  domain/         Lógica pura, sin navegador ni red — es lo que más se prueba
  data/           Estado del cliente: almacenes, sesión, red, avisos
  platform/       Lo que toca el aparato: cámara, imágenes, avatar
  server/         Solo servidor: autenticación, evidencia, proyecciones
  content/        La guía del proyecto que se lee dentro de la aplicación
public/
  sw.js           Service worker
  offline.html    Página de respaldo, con su propio estilo
tests/
  unit/           33 archivos, 191 pruebas (Vitest)
  e2e/            60 pruebas de navegador (Playwright)
  fixtures/       Casos de muestra; el producto no lleva datos inventados
docs/             Esta documentación
scripts/          Utilidades de operación (§12.3)
firebase/         Reglas de Firestore
```

Dos reglas de colocación que el código respeta:

- **`domain/` no importa nada de `data/`, `app/` ni React.** Por eso se puede
  probar entera sin navegador, y por eso las 191 pruebas unitarias corren en dos
  segundos.
- **`server/` no se importa nunca desde el cliente.** Contiene las credenciales
  y las proyecciones.

---

## 3. Quién manda sobre cada dato

| Dato                                    | Dueño    | Dónde vive                        | Qué pasa si se pierde                   |
| --------------------------------------- | -------- | --------------------------------- | --------------------------------------- |
| Expediente (estado, notas, responsable) | Servidor | Firestore `incidents`             | Se pierde el caso                       |
| Fotografía original                     | Servidor | Supabase `mpd_evidence_originals` | Se pierde la prueba                     |
| Copia reducida de la fotografía         | Servidor | Firestore `incidentEvidence`      | Se vuelve a pedir el original           |
| Resumen público                         | Servidor | Firestore `publicIncidents`       | Deja de constar ante la comunidad       |
| Acta de retirada                        | Servidor | Firestore `removedIncidents`      | Nadie puede responder qué pasó          |
| Copia local de un reporte               | Aparato  | IndexedDB `mi-pueblo`             | No se pierde nada: el servidor lo tiene |
| Borrador sin enviar                     | Aparato  | IndexedDB `mi-pueblo/drafts`      | **Se pierde**: nunca salió              |
| Cola de envío                           | Aparato  | IndexedDB `mi-pueblo-outbox`      | **Se pierde**: todavía no había llegado |
| Tema, avatar, marcas de leído           | Aparato  | `localStorage`                    | Preferencias, no datos                  |

La columna de la derecha es la que importa para las copias de seguridad: **lo
único irrecuperable que vive fuera del servidor es lo que aún no se ha enviado**.

---

## 4. Modelo de datos

### 4.1. Firestore

| Colección                                              | Clave                | Contenido                                                                                                               | Quién escribe                                            |
| ------------------------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `accounts/{uid}`                                       | uid                  | `active`, `role`, nombre, avatar                                                                                        | `POST /api/account/activate`                             |
| `avatars/{uid}`                                        | uid                  | Retrato en Base64, aparte para no arrastrarlo en cada lectura                                                           | `PATCH /api/account/avatar`                              |
| `incidents/{id}`                                       | sha256 del contenido | El expediente: relato, categoría, vereda, punto, estado, prioridad, responsable, versión, sensibilidad, teléfono, dueño | `POST /api/incidents`, `PATCH /api/admin/incidents/{id}` |
| `incidents/{id}/events/{mutationId}`                   | uuid                 | Cada actuación: estado, nota pública, nota interna, autor, fecha                                                        | El Consejo                                               |
| `incidentEvidence/{id}`                                | id del expediente    | Copia reducida de la fotografía                                                                                         | `POST /api/incidents` (en segundo plano)                 |
| `incidentIntake/{id}`                                  | id del expediente    | Acuse de recepción idempotente: `hash`, `owner`, `evidenceId`                                                           | `POST /api/incidents`                                    |
| `incidentLimits/{uid}`                                 | uid                  | Cupo diario de envíos                                                                                                   | `POST /api/incidents`                                    |
| `publicIncidents/{id}`                                 | id del expediente    | El resumen que redactó el Consejo                                                                                       | `PATCH /api/admin/incidents/{id}`                        |
| `removedIncidents/{id}`                                | id del expediente    | Acta de retirada: quién, cuándo, **por qué**, de quién era                                                              | `POST /api/admin/incidents/{id}/retirada`                |
| `news/{id}`                                            | uuid                 | Comunicado: bloques, estado, anclado, autoría                                                                           | El Consejo                                               |
| `newsCovers/{id}`                                      | id del comunicado    | Portada fotográfica, aparte del comunicado                                                                              | El Consejo                                               |
| `notifications/{uid}/items/{id}`                       | compuesta            | Novedades personales                                                                                                    | Las rutas que mueven un expediente                       |
| `councilNotifications/{id}`                            | compuesta            | Bandeja compartida del Consejo                                                                                          | Ídem                                                     |
| `communityAnnouncements/{id}`                          | uuid                 | Avisos a toda la comunidad                                                                                              | El Consejo                                               |
| `councilRoleEvents/{id}`                               | uuid                 | Quién dio o quitó el rol, y cuándo                                                                                      | `POST /api/admin/roles`                                  |
| `accountDeletionRequests/{uid}`                        | uid                  | Estado de una solicitud de eliminación                                                                                  | `POST /api/account/deletion`                             |
| `writingAiLimits`, `readingAiLimits`, `serverAiLimits` | uid                  | Cupos de la asistencia de IA                                                                                            | Las rutas de IA                                          |

**El identificador de un expediente es el sha256 de su contenido.** De ahí sale
la idempotencia del envío —reintentar el mismo reporte no crea dos— y también
una consecuencia que hay que tener presente: quien vuelve a mandar exactamente
el mismo reporte después de que se lo retiren, crea otro **con el mismo
identificador**. La retirada lo contempla ([§8.4](#84-retirada)).

Las reglas de Firestore ([`firebase/firestore.rules`](../firebase/firestore.rules))
cierran el acceso desde el navegador a todo salvo dos cosas: el documento de la
propia cuenta (`allow get` para su dueño) y los resúmenes publicados, y estos
últimos solo si llevan exactamente los campos permitidos. Un comodín final
(`match /{document=**}`) niega todo lo demás, así que **una colección nueva nace
cerrada**.

### 4.2. Supabase

Dos tablas por PostgREST, con la clave de servicio que nunca sale del servidor
([`src/server/evidence.ts`](../src/server/evidence.ts)):

- **`mpd_evidence_originals`** — la fotografía tal como se envió, en Base64, con
  `owner_uid`, `incident_id` y `sha256`. El servidor **verifica el hash después
  de guardarla** antes de emitir el recibo.
- **`mpd_news_media`** — imágenes de los comunicados.

El esquema está en [`docs/sql/`](sql/).

### 4.3. En el navegador

| Almacén                         | Clave                                  | Qué guarda                                                           |
| ------------------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| IndexedDB `mi-pueblo` v1        | `cases` (por `id`)                     | Copia local de cada reporte, **firmada con la cuenta que lo guardó** |
|                                 | `drafts`                               | Un borrador por cuenta: `owner:{uid}`, o `current` sin sesión        |
| IndexedDB `mi-pueblo-outbox` v2 | `reports`, `payloads`                  | Cola de envío: hasta 10 reportes y 50 MB                             |
| `localStorage`                  | `mpd-theme`                            | Tema claro u oscuro                                                  |
|                                 | `mpd-avatar:{uid}`, `mpd-member:{uid}` | Para dibujar la cabecera antes de que conteste el servidor           |
|                                 | marcas de leído                        | Hasta dónde llegó cada quien en las novedades                        |

La base se llamó `mi-pueblo-demo` mientras la aplicación guardaba reportes
fabricados. Ese nombre se lee en el inspector del navegador, así que al pasar a
producción cambió a `mi-pueblo`, **con traslado**: la primera vez que un aparato
abre esta versión, `trasladar()` copia sus casos y sus borradores a la base
nueva y borra la vieja. Un cambio de nombre a secas perdería lo único
irrecuperable del sistema —lo que todavía no ha salido del teléfono—, que es
justamente lo de quien reportó sin señal. Lo fija una prueba de navegador.

Un borrador se lee además **sin confiar en su forma** (`comoBorrador`): lo
escribió una versión de la aplicación que puede no ser esta, y uno sin `photos`
—que existió— se llevaba por delante la pantalla entera al hacer
`photos.length`. Un dato viejo no puede tumbar una pantalla.

El campo `account` de cada caso local no es un adorno: sin él, el almacén era de
todos, y quien entrara después en el mismo teléfono veía en «Mis reportes» los
de quien estuvo antes, con su relato y su fotografía. `readLocalCases(uid)`
devuelve solo lo de esa cuenta. Los registros anteriores a esta versión no
llevan firma y **no se reclaman**: dárselos a la primera cuenta que entre sería
transferir en silencio los reportes de alguien.

---

## 5. Identidad y permisos

### 5.1. Los tres niveles

| Nivel         | Cómo se comprueba | Qué exige                                        |
| ------------- | ----------------- | ------------------------------------------------ |
| **Identidad** | `requireIdentity` | Un token de Firebase válido                      |
| **Miembro**   | `requireMember`   | Identidad **y** `accounts/{uid}.active === true` |
| **Consejo**   | `requireAdmin`    | Miembro **y** el rol                             |

Están en [`src/server/admin-auth.ts`](../src/server/admin-auth.ts). Cada ruta de
la API llama a uno de los tres en su primera línea; la única excepción es
`POST /api/account/activate`, que verifica el token a mano porque es justamente
la ruta que crea la cuenta que las otras exigen.

`requireMember` distingue dos situaciones que antes decían lo mismo: no hay
perfil todavía —se arregla solo— y el Consejo lo deshabilitó —no se arregla
desde la aplicación—.

### 5.2. El rol del Consejo

El rol es una **reivindicación del token** (`admin`), no un campo de la base.
Escribir «admin» a mano en la consola de Firestore no hace administrador a
nadie, porque la aplicación y el servidor leen la reivindicación. Se acepta
además el campo `role` del documento de la cuenta como segundo camino, para que
quien tenga la consola pueda otorgarlo ahí.

Solo el SDK de servidor puede ponerla, de ahí
[`scripts/conceder-admin.mjs`](../scripts/conceder-admin.mjs), que concede el
**primer** administrador. A partir de ahí el propio Panel del Consejo designa a
los demás, y cada cambio queda en `councilRoleEvents`.

### 5.3. Qué pasa sin el rol

`/admin/` no es una consola degradada: dice **«Esta pantalla es del Consejo»** y
ofrece la salida a «Mis reportes». Hubo una versión que caía en una gestión
sobre las copias de este aparato, con su «Espacio de gestión» y su «Bandeja de
incidencias»; no le servía a nadie —lo que se anotaba ahí no salía del
navegador— y bajo una dirección que dice «admin» hacía creer que se tenían
permisos que no se tienen.

---

## 6. La API, ruta por ruta

25 rutas. La columna «Guardia» es el nivel de [§5.1](#51-los-tres-niveles).

### 6.1. Cuenta

| Ruta                    | Método     | Guardia   | Qué hace                                                                                                                                   |
| ----------------------- | ---------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/api/account/activate` | POST       | token     | Crea `accounts/{uid}`. No consume roles ni identificadores del cliente. El correo verificado **no** cierra el paso, ni aquí ni al reportar |
| `/api/account/avatar`   | GET, PATCH | miembro   | Retrato de la cuenta                                                                                                                       |
| `/api/account/deletion` | POST       | identidad | HU-19: retira el acceso y anonimiza los expedientes en la misma llamada. Idempotente y reanudable                                          |

### 6.2. Reportes

| Ruta                           | Método | Guardia | Qué hace                                                                                                                                            |
| ------------------------------ | ------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/incidents`               | POST   | miembro | Recibe un reporte. Dos transacciones: acuse idempotente y recibo. Verifica el hash de la fotografía antes de confirmar. Máximo **10 nuevos al día** |
| `/api/incidents`               | GET    | miembro | El historial de la cuenta, paginado de 25 en 25, con su punto del mapa                                                                              |
| `/api/incidents/{id}`          | GET    | miembro | Un expediente suelto ([§7.3](#73-un-expediente-suelto))                                                                                             |
| `/api/incidents/{id}/evidence` | GET    | miembro | La fotografía, solo al dueño o al Consejo. `?vista=copia` sirve la reducida                                                                         |
| `/api/incidents/{id}/history`  | GET    | miembro | Las actuaciones, solo al dueño o al Consejo. Las notas internas y el autor, solo al Consejo                                                         |
| `/api/community/reports`       | GET    | miembro | Lo que consta ante la comunidad ([§7.1](#71-lo-que-la-comunidad-ve))                                                                                |

### 6.3. Consejo

| Ruta                                 | Método            | Guardia | Qué hace                                                                                                                                 |
| ------------------------------------ | ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/admin/incidents`               | GET               | Consejo | La bandeja completa                                                                                                                      |
| `/api/admin/incidents/{id}`          | PATCH             | Consejo | Cambia estado, prioridad, responsable, sensibilidad y publicación. Exige motivo, control de versión optimista y deja evento de auditoría |
| `/api/admin/incidents/{id}/retirada` | POST              | Consejo | Retira un expediente con su motivo ([§8.4](#84-retirada))                                                                                |
| `/api/admin/roles`                   | GET, POST         | Consejo | Listado de cuentas y designación                                                                                                         |
| `/api/admin/statistics`              | GET               | Consejo | Cifras agregadas del territorio                                                                                                          |
| `/api/admin/analysis`                | POST              | Consejo | Lectura asistida de la bandeja                                                                                                           |
| `/api/admin/news`                    | GET               | Consejo | Los comunicados, incluidos los borradores                                                                                                |
| `/api/admin/news/{id}`               | PUT               | Consejo | Editar, anclar, archivar                                                                                                                 |
| `/api/admin/news/{id}/media`         | GET, POST, DELETE | Consejo | Imágenes del cuerpo                                                                                                                      |
| `/api/admin/news/{id}/portada`       | GET, PUT, DELETE  | Consejo | Portada                                                                                                                                  |

### 6.4. Público y avisos

| Ruta                             | Método     | Guardia | Qué hace                                                              |
| -------------------------------- | ---------- | ------- | --------------------------------------------------------------------- |
| `/api/news`                      | GET        | —       | Comunicados **publicados**                                            |
| `/api/news/{id}`                 | GET        | —       | Uno, si está publicado                                                |
| `/api/news/{id}/portada`         | GET        | —       | Su portada, si está publicado. `Cache-Control: public, max-age=86400` |
| `/api/news/{id}/media/{mediaId}` | GET        | —       | Sus imágenes, si está publicado                                       |
| `/api/notifications`             | GET, PATCH | miembro | Bandeja personal; `?scope=council` exige el rol                       |

Las cuatro rutas sin guardia comprueban `status === "published"` antes de
devolver nada: **la portada de un borrador no se ve adivinando la dirección**.

### 6.5. Asistencia de IA

| Ruta                  | Guardia                     | Cupo                         |
| --------------------- | --------------------------- | ---------------------------- |
| `/api/ai/improve`     | miembro + correo verificado | 10 al día, 1 por minuto      |
| `/api/ai/reading`     | Consejo                     | Ídem, con su propio contador |
| `/api/admin/analysis` | Consejo                     | Ídem                         |

Solo se admiten modelos gratuitos: el servidor rechaza cualquier modelo cuyo
nombre no termine en `:free`. Sin `OPENROUTER_API_KEY` la aplicación funciona
igual y la asistencia sencillamente no aparece.

---

## 7. Privacidad: las tres proyecciones

### 7.1. Lo que la comunidad ve

`sharedView` — [`src/server/community-view.ts`](../src/server/community-view.ts).
Es la proyección con más que perder del sistema, y vive en **un solo sitio**
precisamente por eso: la usan el listado y la consulta de un expediente suelto,
y dos copias de una decisión de privacidad se separan la primera vez que alguien
añade un campo en una y no en la otra.

Dos niveles:

- **Automático.** Pasadas las horas de gracia (`PUBLIC_REPORT_DELAY_HOURS`, 24
  por defecto), un reporte que nadie marcó como delicado consta **tal como lo
  escribió quien reportó**: su título y su relato, con categoría, vereda, estado
  y fecha. Ese texto no lo ha leído nadie antes de publicarse; la marca de
  sensible es el freno, y el Consejo puede ponerla en cualquier momento.
- **Revisado.** Cuando el Consejo lo estudia, lo declara seguro y redacta un
  título, un resumen y una vereda públicos, esa versión reemplaza a la
  automática y **no espera plazo alguno**: el plazo protege lo que consta sin que
  nadie lo mire, y una revisión es exactamente lo contrario.

En los dos niveles, **el estado y la fecha salen del expediente vivo**, no del
resumen. Si no fuera así, un caso resuelto después de publicarse seguiría
leyéndose «en proceso» para siempre.

**La fotografía no entra en ninguno de los dos.** Es evidencia: la ven quien
reportó y el Consejo, por una ruta que comprueba quién pide.

### 7.2. El historial propio

`GET /api/incidents` devuelve solo `where("owner", "==", uid)`, con el relato
completo y **el punto que marcó quien reportó** —es suyo y lo está pidiendo él—.
No devuelve el teléfono ni el identificador de la evidencia.

### 7.3. Un expediente suelto

`GET /api/incidents/{id}` reparte lo mismo que el listado, según quién pregunte:

| Quién                          | Qué recibe                                           |
| ------------------------------ | ---------------------------------------------------- |
| Quien lo reportó, y el Consejo | El expediente como se mandó                          |
| Cualquier otro miembro         | Lo que la comunidad ve, si consta                    |
| Nadie de los anteriores        | `404`, sin distinguir «no existe» de «no es para ti» |
| Quien lo reportó, si se retiró | `410` con el acta: fecha y motivo                    |

La última fila es la que evita que un enlace viejo conteste «no lo encontramos»
de algo que se retiró a propósito. A un tercero no se le cuenta: por qué se
retiró el reporte de otro es deliberación del Consejo sobre alguien que no es él.

---

## 8. Ciclo de vida de un reporte

### 8.1. Envío

1. El formulario prepara la fotografía **en el teléfono**
   ([`src/platform/evidence.ts`](../src/platform/evidence.ts)): tope de 24
   millones de píxeles y 10 MB, reduciendo si hace falta.
2. Si hay señal, `POST /api/incidents`. Si no, entra en la cola
   ([§9.2](#92-la-cola-de-envío)).
3. El servidor calcula el identificador —sha256 del contenido—, reserva el
   acuse, sube el original a Supabase y **verifica el hash de lo guardado**
   antes de crear el expediente y emitir el recibo.
4. En segundo plano guarda una copia reducida en `incidentEvidence`, para poder
   mirar la fotografía sin traerse varios megas.
5. Se escriben dos avisos: a quien reportó y a la bandeja del Consejo.

### 8.2. Gestión

`PATCH /api/admin/incidents/{id}` exige un motivo —público o interno— y el
número de versión que se tenía delante. Si otra persona guardó antes, contesta
**409** y no escribe nada. Todo ocurre en una transacción: estado, evento de
auditoría con autor y fecha, resumen público si toca, y las dos notificaciones.

### 8.3. Publicación

Marcar un expediente como público exige que la revisión de sensibilidad esté en
«sin contenido sensible» y que haya título, resumen y vereda públicos escritos a
mano. Despublicarlo borra `publicIncidents/{id}`.

### 8.4. Retirada

`POST /api/admin/incidents/{id}/retirada`. Retirar es **borrar de verdad**: el
expediente sale de la colección, su resumen público también, y la fotografía
original se borra del archivo privado. Lo que queda es el acta —quién, cuándo y
por qué—; sin ella, retirar sería indistinguible de perder.

- **El motivo es obligatorio** (10 a 600 caracteres, 80 palabras) y llega a
  quien reportó **tal como se escribió**.
- Después de la transacción se barren las actuaciones, las evidencias y **los
  avisos anteriores de ese expediente**, que llevarían a una pantalla que ya no
  existe. El aviso de la retirada sobrevive porque no lleva `incidentId`.
- Si algo de eso falla, la respuesta dice `complete: false` y la interfaz pide
  reintentar.
- **Es idempotente respecto al estado, no al identificador.** «Ya está retirado»
  significa que el expediente no está; si está y hay acta, es un reenvío que
  reusó el identificador y hay que retirarlo otra vez.

Es un `POST` y no un `DELETE` a propósito: el motivo es texto libre que puede
nombrar a alguien, así que no puede viajar en la dirección ni en una cabecera
—acabaría en los registros de acceso—, tiene que ir en el cuerpo, y el cuerpo de
un `DELETE` lo descartan algunos intermediarios.

### 8.5. Eliminación de la cuenta

`POST /api/account/deletion` (HU-19). El expediente permanece para la
trazabilidad comunitaria —categoría, vereda, estado y fechas siguen contando—
pero deja de apuntar a una persona: el dueño pasa a ser un seudónimo aleatorio,
el relato y el teléfono se retiran, y la fotografía original se borra. El
seudónimo se descarta al terminar, de modo que el registro final no reconstruye
la correspondencia. Exige autenticación reciente (300 s).

---

## 9. Sin conexión

### 9.1. El service worker

[`public/sw.js`](../public/sw.js). Tres cachés con tres políticas:

| Qué                                    | Caché                | Política                                                 |
| -------------------------------------- | -------------------- | -------------------------------------------------------- |
| Pantallas y sus fragmentos de JS y CSS | `mi-pueblo-shell-v6` | Precargado al instalar; red primero, caché como respaldo |
| Comunicados públicos                   | `mi-pueblo-news-v1`  | Red primero; la copia vieja se sirve con `X-Guardado`    |
| Todo lo demás de la API                | —                    | **Nunca se guarda**                                      |

La regla que lo garantiza es una línea: cualquier petición que lleve cabecera
`authorization` sale del _service worker_ sin tocarse. Por ahí viajan
expedientes, fotografías y cuentas.

### 9.2. La cola de envío

[`src/data/outbox.ts`](../src/data/outbox.ts). Hasta **10 reportes y 50 MB**.
Un reporte encolado sale solo en cuanto vuelva la señal, por Background Sync
(`mpd-outbox`): el worker no recibe nunca el token, así que le pide a una
pestaña abierta que vacíe la cola. Si no hay ninguna, el navegador reintenta más
tarde. Al llegar el acuse, `markCaseDelivered` cierra el viaje en la copia
local, que si no seguiría diciendo «esperando señal» meses después.

### 9.3. Lo que no funciona sin señal

El mapa (las teselas vienen de la red), las estadísticas del Consejo, la
asistencia de IA y cualquier expediente que no esté ya en este aparato.

---

## 10. La interfaz

### 10.1. Rutas

Todas las pantallas del espacio de trabajo son **una sola ruta de Next**,
`src/app/[section]/page.tsx`, con `generateStaticParams`. Fuera de ella quedan
`/acceso/`, `/bienvenida/`, `/noticia/{id}/` y `/reporte/{id}/`. `trailingSlash`
está activo: todas las direcciones terminan en barra, incluidas las de la API.

### 10.2. Estado compartido

Siete almacenes con `useSyncExternalStore`, uno por cosa que varias pantallas
necesitan saber a la vez: sesión, tema, red, novedades, fecha de hoy, avisos de
entrega y _toasts_. No hay contexto de React ni biblioteca de estado.

La regla `react-hooks/set-state-in-effect` está activa, así que ningún efecto
llama a `setState` de forma síncrona: o se encadenan promesas, o el valor entra
como estado inicial.

### 10.3. Avisos

[`src/data/toasts.ts`](../src/data/toasts.ts) y
[`src/components/toasts.tsx`](../src/components/toasts.tsx). Hasta tres a la
vez, 5 segundos los normales y 10 los de error, en dos regiones persistentes
(`role="status"` y `role="alert"`) para que un lector de pantalla los anuncie.
**Toda acción que escribe algo enseña uno**: guardar, editar, publicar, retirar.

### 10.4. Temas y tamaños

Tema claro y oscuro, con la preferencia guardada. Cada pantalla se prueba a
ancho de teléfono: una prueba e2e recorre todas comprobando que **ninguna
desborda a lo ancho**.

---

## 11. Configuración

Todo está en [`.env.example`](../.env.example), con una regla que conviene
repetir: **nada que empiece por `NEXT_PUBLIC_` es secreto**, viaja al navegador.

| Variable                                                               | Obligatoria | Para qué                                |
| ---------------------------------------------------------------------- | ----------- | --------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_*`                                               | sí          | Sesión en el navegador                  |
| `GOOGLE_APPLICATION_CREDENTIALS` **o** `FIREBASE_SERVICE_ACCOUNT_KEY`  | sí          | Firebase del lado del servidor          |
| `SUPABASE_URL` + `SUPABASE_SECRET_KEY` (o `SUPABASE_SERVICE_ROLE_KEY`) | sí          | Archivo de fotografías                  |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`                               | no          | Asistencia de IA                        |
| `PUBLIC_REPORT_DELAY_HOURS`                                            | no          | Horas de gracia (1–720, por defecto 24) |

La política de seguridad de contenido se declara por origen en
[`next.config.ts`](../next.config.ts). `unsafe-eval` solo existe en desarrollo.
`script-src` incluye `apis.google.com` y `frame-src` los dominios de Firebase
porque el acceso con Google abre su propio marco; quitarlos rompe el inicio de
sesión sin ningún mensaje.

---

## 12. Verificación y operación

### 12.1. Las cinco comprobaciones

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright test
```

`npm run test:e2e` hace las dos últimas juntas. **El navegador prueba contra
`.next`**, así que una prueba e2e sin compilar antes verifica el build anterior
—es un error fácil y silencioso—. La primera vez: `npx playwright install chromium`.

Estado actual: **191 pruebas unitarias en 33 archivos** y **60 de navegador**,
con lint y typecheck limpios.

Qué prueba cada capa: `domain/` se prueba entera sin navegador y es donde está
la lógica que decide; las rutas de la API se prueban con dobles de Firestore, y
lo que fijan es sobre todo **qué no sale** en cada proyección; las de navegador
recorren los caminos completos —reportar, gestionar, publicar, retirar— y vigilan
lo que solo se ve en pantalla: desbordes en el teléfono, contraste en oscuro, la
simetría de los mandos.

### 12.2. Despliegue

Servidor Next.js, no exportación estática: las rutas protegidas y los detalles
dinámicos lo necesitan. `npm run build` y `npm start`. Conviene ejecutar `build`
y `dev` por separado: compiten por `.next`.

### 12.3. Utilidades

| Guion                                                     | Qué hace                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`conceder-admin.mjs`](../scripts/conceder-admin.mjs)     | Concede o retira el rol del Consejo                                      |
| [`sembrar-noticias.mjs`](../scripts/sembrar-noticias.mjs) | Siembra los comunicados iniciales                                        |
| [`vaciar-reportes.mjs`](../scripts/vaciar-reportes.mjs)   | Borrón y cuenta nueva antes de abrir. **Sin `--borrar` no escribe nada** |

`vaciar-reportes` no es la retirada del panel: aquella deja acta y avisa a quien
reportó, porque es una decisión sobre un caso que alguien envió de verdad. Esto
es borrar la base de pruebas antes de abrir, y no avisa a nadie.

---

## 13. Límites conocidos

Lo que hoy no está resuelto. Está aquí para que nadie lo descubra en el piloto.

1. **El catálogo territorial no está validado por el Consejo.** Sale del EOT de
   2007 y de fuentes abiertas; los nombres pueden cambiar y los puntos son
   aproximados. La aplicación lo dice en el formulario y en el mapa. **Cinco
   veredas no tienen punto documentado**: sus reportes se envían y se gestionan
   igual, pero no se dibujan, y las dos pantallas lo declaran.
2. **No hay notificaciones push.** Los avisos se ven al abrir la aplicación.
   Falta generar la clave VAPID en la consola de Firebase.
3. **El historial propio se pagina hasta 200 reportes** (8 páginas de 25) y lo
   público igual. Más allá de ese tope, la limpieza de copias locales
   retiradas se inhibe a propósito, para no borrar por no haber mirado.
4. **La cola de envío es por aparato**, no por cuenta: lo que quedó encolado en
   un teléfono no sale desde otro.
5. **`incidentIntake` sobrevive a una retirada.** No impide volver a crear el
   expediente —la segunda transacción sí lo crea— pero el reenvío no consume
   cupo diario.
6. **El acta de retirada no tiene listado propio.** Se consulta abriendo la
   dirección del expediente retirado, y solo la ven su dueño y el Consejo.
7. **Sin piloto comunitario.** Nada de lo anterior sustituye a probarlo con
   gente del territorio.

Antes de habilitar cuentas reales: validar el catálogo con el Consejo, probar
las reglas de Firestore en emulador contra una cuenta ajena y otra desactivada,
verificar la restauración de copias de seguridad, completar las pruebas de
accesibilidad, ejecutar el piloto y designar formalmente a la persona
mantenedora.
