# Volver después de haberse ido — diseño

18 de septiembre de 2026

## 1. Qué pasa hoy

Alguien pide eliminar su cuenta. `POST /api/account/deletion` le retira el
acceso, anonimiza sus expedientes y avisa al Consejo. Todo eso funciona.

Lo que pasa después no. Si esa persona cambia de idea y vuelve a entrar, el
servicio de identidad contesta `auth/user-disabled`, ese código **no está en el
mapa de mensajes** de `src/domain/auth.ts`, y cae al texto de reserva:

> No se pudo completar el acceso. Revisa tus datos o recupera tu contraseña.

Es un callejón sin salida que además engaña. Mandarla a recuperar la contraseña
la lleva a un correo que sí llega, a un formulario que sí funciona y a una
cuenta que sigue sin abrirse. La pantalla le echa la culpa a sus datos cuando lo
que pasa es que la puerta está cerrada y ella misma la cerró.

Y del otro lado no hay nada. La Novedad que llega al panel —«Solicitud de
eliminación de cuenta»— es una línea de texto sin acción ninguna, y el Consejo
no tiene ninguna forma de volver a abrir esa puerta, ni por la aplicación ni por
la consola: la reivindicación del token y el documento de cuenta hay que tocarlos
los dos, y el registro de la solicitud bloquea cualquier intento posterior.

## 2. Decisiones tomadas

| Decisión                    | Elegido                                     |
| --------------------------- | ------------------------------------------- |
| Qué devuelve restablecer    | **Solo la puerta.** Una cuenta vacía        |
| Por dónde se pide           | **En persona**, en el Consejo               |
| Dónde actúa el Consejo      | La pestaña **Quién administra** del panel   |
| Quién puede                 | Solo el Consejo. Nadie se restablece a sí   |

### 2.1. Lo que restablecer **no** puede devolver, y hay que decirlo

La eliminación de hoy no aparta los datos: los destruye. Borra la fotografía
original del archivo privado, **sobrescribe** el título y el relato con
`[Relato retirado a solicitud de la persona que lo reportó.]`, vacía el teléfono
y, al terminar, tira el seudónimo a propósito para que la correspondencia entre
`anon-a1b2…` y la persona no se pueda reconstruir. No hay copia en ninguna parte.
Es exactamente lo que HU-19 promete, y está bien que así sea.

Así que restablecer **abre la puerta a una cuenta vacía**: el mismo correo, el
mismo identificador, cero reportes. Lo que esa persona contó sigue contando para
el territorio —categoría, vereda, estado y fechas siguen en las cifras del
Consejo— pero ya no es suyo y no volverá a serlo.

Esto tiene que estar dicho en tres sitios o alguien va a prometer lo que el
sistema no puede cumplir:

1. En la confirmación que ve quien administra, **antes** de pulsar.
2. En lo que ve quien vuelve a entrar, la primera vez.
3. En `docs/arquitectura.md §8.5`.

Se descartó el plazo de gracia —programar la eliminación a treinta días y
anonimizar al vencer— porque significa que los datos de alguien que pidió
desaparecer siguen ahí un mes después de pedirlo.

## 3. Las cuatro piezas

### 3.1. La puerta dice la verdad

`src/domain/auth.ts`, un código nuevo en el mapa:

```
"auth/user-disabled":
  "Esta cuenta está cerrada. Si quieres volver a usarla, acércate al Consejo
   Comunitario del Río Satinga y pide que te la restablezcan."
```

**Uno, no dos.** El plan pedía mapear también `auth/email-already-in-use`, para
que quien probara a registrarse otra vez con el mismo correo encadenara hasta el
mensaje bueno. Al construirlo se cayó `tests/unit/auth.test.ts`, que exige que
ese código diga **lo mismo** que un correo desconocido, y la prueba tenía razón:
ese error sale del formulario de registro, donde cualquiera puede teclear el
correo de otra persona. Un mensaje distinto ahí deja enumerar quién tiene cuenta
en esta aplicación, que en un territorio pequeño no es un dato menor. Se queda
con el texto de reserva, y el porqué está escrito junto al mapa para que nadie lo
«arregle» dentro de seis meses.

`auth/user-disabled` sí, y la diferencia importa: ese código lo manda el
servicio de identidad en la respuesta, así que cualquiera que mire la red lo lee
igual, diga lo que diga la pantalla. Callarlo no esconde nada de quien sabe
buscarlo; solo deja a ciegas a la persona a la que le está pasando.

**El APK, por su cuenta.** El acceso nativo firma primero contra el Firebase de
Android (`FirebaseAuthentication.signInWithGoogle()`, `skipNativeAuth: false`) y
ese revienta **antes** que el SDK web, con una excepción cuyo `code` es
`ERROR_USER_DISABLED` y no `auth/user-disabled`. Sin traducirlo, esa persona lee
en el APK «revisa tus datos» mientras en el navegador lee la verdad.
`src/platform/native.ts` lo reconoce por el nombre del error de Android y lo
traduce, y solo cuando el complemento no trae ya un código `auth/…` bueno.

`src/server/admin-auth.ts` — `requireMember()` dice hoy «Tu cuenta está
deshabilitada. Contacta al Consejo Comunitario» tanto si la cerró la persona como
si no. Cuando `accounts/{uid}.deleted === true` debe decir que la cerró ella, que
es un dato que cambia lo que hace a continuación.

### 3.2. Dónde actúa el Consejo

**Quién administra**, que es la pestaña donde el Consejo ya administra a las
personas. No en Novedades: una Novedad se marca como leída y se va hacia abajo
entre otras cincuenta, y una petición que puede llegar tres meses después tiene
que poder encontrarse. El feed avisa; la pestaña actúa.

`src/app/api/admin/roles/route.ts` — `everyone()` ya tiene el registro de
identidad de cada persona, así que solo añade un campo:

```
cerrada: user.disabled === true
```

`src/features/council-roles.tsx` — en la fila de una cuenta cerrada, un distintivo
**Cerrada** y un botón **Restablecer**. El buscador ya está: la persona llega al
Consejo, el Consejo la busca por su nombre o su correo, y la fila lo dice.

Al pulsar, un panel de confirmación con el mismo patrón que ya usa **Retirar** en
la bandeja, y que dice sin rodeos qué vuelve y qué no:

> Se le abre la cuenta a María Caicedo con su mismo correo. Vuelve a entrar y a
> reportar desde hoy.
> **Lo que reportó antes no vuelve.** Se anonimizó cuando pidió eliminarla y eso
> no se deshace: sus reportes siguen contando para el territorio, pero sin su
> nombre y sin su relato.

`src/app/api/account/deletion/route.ts` — la Novedad que se crea gana una línea
`note: "Se atiende desde Quién administra."`. Es un campo que la bandeja ya pinta:
no hace falta tocar nada más.

### 3.3. La ruta que restablece

`POST /api/admin/accounts/restablecer/`, cuerpo `{ email }`, guardia
`requireAdmin`. En este orden, **y el orden es la mitad del diseño**:

1. Validar el correo y buscar la identidad. Sin ella, 404 con el mismo texto que
   ya usa el rol: «No hay ninguna cuenta con ese correo».
2. Si la cuenta **no** está cerrada, 409. Restablecer lo que está abierto no es
   inocuo: escribiría `active: true` sobre algo que quizá el Consejo apagó por
   otro motivo.
3. En una transacción de Firestore:
   - `accounts/{uid}` → `{ active: true, deleted: false, restoredAt, restoredBy }`.
     **`role` no se toca.** La eliminación rechaza a las cuentas del Consejo
     (403), así que aquí solo llegan ciudadanas; escribir el rol sería la única
     forma de que un fallo lo convirtiera en otra cosa.
   - `accountDeletionRequests/{uid}` → `{ state: "restored", restoredAt,
     restoredBy, requestedAt: null, pseudonym: null }`. El **§4** explica por qué
     estos dos nulos no son limpieza.
   - `councilNotifications/deletion-{uid}` → `{ resolved: true, resolvedAt,
     resolvedBy }`, para que la Novedad deje de parecer pendiente.
4. **Después**, y solo si lo anterior salió: `auth.updateUser(uid, { disabled:
   false })`.
5. `accountRestoreEvents` ← `{ actor, target, targetEmail, at }`. Cada
   restablecimiento deja constancia de quién lo hizo, igual que cada cambio de
   rol.

El orden importa por lo que pasa cuando falla la mitad:

- Identidad primero y Firestore después: la puerta se abre, `accounts.active`
  sigue en `false`, y esa persona entra a una aplicación que le contesta 403 en
  todo. Peor que no haber hecho nada.
- Firestore primero e identidad después: la puerta sigue cerrada y el documento
  dice activa. Esa persona no nota nada, el Consejo vuelve a pulsar y se arregla.

Se elige el segundo. Es la misma razón por la que la eliminación retira el acceso
antes de tocar los datos, mirada del otro lado.

### 3.4. Lo que ve quien vuelve

Entra, y su cuenta está vacía. Sin explicación eso parece una avería.

`src/data/session.ts` ya lee `accounts/{uid}` en cada arranque —las reglas lo
permiten (`allow get` al dueño)— para resolver el rol. De esa misma lectura sale
`restoredAt`, sin ninguna petición nueva.

Con ese dato, una tarjeta en la portada de `/inicio/`, hermana visual de
`src/components/acceso-necesario.tsx`:

> **Tu cuenta volvió a abrirse**
> El Consejo la restableció el 18 de septiembre. Desde hoy puedes reportar otra
> vez. Lo que reportaste antes sigue contando para el territorio, pero quedó
> anónimo cuando pediste eliminar la cuenta, y eso no se deshace.

Se cierra en este aparato y no vuelve a salir (marca en `localStorage`, como la
de los avisos). No puede guardarse en el servidor: las reglas declaran
`accounts/{uid}` como `write: if false`, y abrir un hueco en esa regla para
esconder una tarjeta sería un precio absurdo.

## 4. El fallo que hay que evitar

Es el que no se ve, y por eso va en su propio apartado.

`accountDeletionRequests/{uid}` se queda en `state: "completed"` para siempre.
La ruta de eliminación lo mira lo primero:

```
if (previous?.state === "completed")
  throw new ApiError(409, "Esta cuenta ya fue eliminada. …");
```

Si restablecer no toca ese documento, **esa persona no podrá volver a eliminar su
cuenta nunca**. El derecho no se gasta por haberlo ejercido una vez, y el fallo
no da la cara: se descubre meses después, cuando alguien lo pide otra vez y la
aplicación le dice que ya está eliminada mientras está usándola.

De ahí los tres campos del §3.3:

- `state: "restored"` levanta el 409.
- `requestedAt: null` — la ruta hace `previous?.requestedAt ?? at`, así que sin
  el nulo la segunda solicitud llevaría **la fecha de la primera**, de hace
  meses, y los plazos del Consejo se contarían desde un día que ya pasó.
- `pseudonym: null` — igual: `previous?.pseudonym ?? anon-uuid` reutilizaría el
  seudónimo viejo, y volvería a unir bajo un mismo nombre los expedientes de dos
  vidas distintas de la cuenta. Es justo lo contrario de lo que el seudónimo
  existe para evitar.

Y uno más, en la propia ruta de eliminación:

```
const nuevo = !previous;                              // hoy
const nuevo = !previous || previous.state === "restored";  // hace falta
```

`nuevo` decide si se avisa al Consejo. Tras un restablecimiento el documento
existe, así que `nuevo` sería `false` y **la segunda solicitud de eliminación no
avisaría a nadie**: se procesaría entera, en silencio, y el Consejo se enteraría
de que alguien se fue solo si le da por mirar.

## 5. Pruebas

Como el resto del proyecto: cada una tiene que caerse al mutar justo la línea que
defiende.

`tests/unit/auth.test.ts`

- `authError("auth/user-disabled")` devuelve el mensaje de cuenta cerrada, no el
  de reserva. **Mutación:** quitar la entrada del mapa.
- Lo mismo con `auth/email-already-in-use`.

`tests/unit/restablecer.test.ts` (nuevo)

- Sin rol de Consejo, 403. Con un correo desconocido, 404. Sobre una cuenta
  abierta, 409.
- Un restablecimiento escribe **las tres cosas**, comprobadas por separado para
  que dejar una fuera se note: `disabled: false`, `accounts.active: true`,
  `accountDeletionRequests.state: "restored"`.
- Si Firestore falla, `updateUser` **no llega a llamarse**. **Mutación:**
  invertir el orden.
- No concede `admin`, ni toca `role`.
- Deja constancia en `accountRestoreEvents`.

`tests/unit/…` sobre la ruta de eliminación — las dos que cierran el §4:

- Tras restablecer, una **segunda** solicitud de eliminación se acepta (no 409) y
  su `requestedAt` es de hoy, no de la primera vez.
- Y **avisa al Consejo**. Es la que se rompería sola con la implementación de hoy.

`tests/unit/membership.test.ts`

- `requireMember` distingue la cuenta cerrada por su dueña de la deshabilitada
  por el Consejo.

## 6. HU-19 no se toca

Conviene decirlo aparte, porque es el requisito de la tesis y es lo que este
trabajo podría haber estropeado sin que se notara.

De la ruta de eliminación cambian tres cosas, y ninguna toca lo que destruye:

- Una solicitud de una **vida anterior** de la cuenta —la que quedó en
  `restored`— deja de contar como el comienzo de esta. Para una primera
  eliminación no hay solicitud anterior, así que el camino es idéntico; para un
  reintento de una que quedó a medias, el estado es `pending` o `partial` y
  también. Solo cambia el caso nuevo, el que antes no existía.
- La Novedad del Consejo gana una línea diciendo dónde se atiende.
- El documento de la cuenta pierde la marca de un restablecimiento anterior, que
  no puede sobrevivir a que esa cuenta se vuelva a cerrar.

`src/server/anonymize.ts` no se toca. La autenticación reciente (300 s), el
rechazo de las cuentas del Consejo y el 409 de una eliminación ya completada,
tampoco.

Y restablecer no deshace nada de eso: escribe exactamente tres documentos —la
cuenta, el registro de la solicitud y la Novedad— y ninguno es un expediente.
Está fijado con una prueba que compara la lista entera de escrituras, así que
devolverle los reportes a alguien al restablecerlo se cae sola.

## 7. Lo que queda fuera

- **El plazo de gracia.** Decidido en el §2.
- **Devolver reportes, fotografías o relatos.** No es que cueste: no existen.
- **Recuperar la contraseña de una cuenta cerrada.** El servicio de identidad
  manda el correo igual —a propósito, para no revelar el estado de una cuenta a
  quien pregunta— y el enlace funciona, y la puerta sigue cerrada. No se puede
  arreglar desde aquí; se arregla porque el mensaje de la puerta ya no manda a
  nadie a recuperar la contraseña.
- **Que el Consejo cierre cuentas ajenas.** Hoy solo se cierran a petición de su
  dueña. Si alguna vez hiciera falta, esta ruta es la mitad del camino.
