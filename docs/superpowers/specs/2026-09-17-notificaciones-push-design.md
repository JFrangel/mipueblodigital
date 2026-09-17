# Notificaciones que llegan al teléfono — diseño

17 de septiembre de 2026

## 1. Qué se construye y por qué

Hoy Mi Pueblo Digital tiene una campana **dentro** de la aplicación: consulta
`/api/notifications` mientras la pantalla está abierta y visible, enseña la
bandeja y lanza un aviso flotante cuando llega algo nuevo. Funciona, y no sirve
para lo que hace falta: **con la aplicación cerrada no avisa de nada**. Quien
reporta un derrumbe se entera de la respuesta del Consejo cuando se acuerda de
abrir la aplicación, y el Consejo se entera de un reporte nuevo igual.

En un territorio donde la señal va y viene, eso convierte cada respuesta en algo
que hay que ir a buscar. Este trabajo hace que el teléfono avise solo.

No sustituye a la campana: la bandeja sigue siendo el registro de lo que pasó, y
la notificación es el golpecito en el hombro.

## 2. Decisiones tomadas

| Decisión               | Elegido                                    |
| ---------------------- | ------------------------------------------ |
| Quién recibe           | El vecino **y** el Consejo                 |
| Cuándo se pide permiso | Al enviar el primer reporte                |
| Dónde                  | La aplicación instalada **y** el navegador |

El momento del permiso importa más de lo que parece. Android 13 en adelante
exige permiso explícito y, negado una vez, recuperarlo obliga a entrar en los
ajustes del sistema: nadie lo hace. Se pide justo después de mandar el primer
reporte, que es el único momento en que la persona ya sabe qué le vamos a
mandar y por qué le interesa.

## 3. Arquitectura

Cinco piezas, cada una con un trabajo y un límite claro.

### 3.1. El registro de aparatos

`pushTokens/{uid}/devices/{token}` en Firestore:

```
{ platform: "android" | "web", at: ISO8601, agent: string }
```

Anidado bajo el identificador de la persona a propósito. Mandarle un aviso es
listar una subcolección —sin índices ni consultas cruzadas— y borrar su cuenta
es borrar el subárbol, que `src/server/anonymize.ts` borra junto a sus avisos:
el token y el user-agent de un aparato son un identificador que dura tanto como
el teléfono, y quien ejerce HU-19.5 pide también que eso se vaya.

Lo que esta forma **no** resuelve: el mismo token puede quedar anotado bajo dos
personas —el teléfono prestado, si la baja al cerrar sesión no llegó a salir—,
porque la clave es el token pero el espacio de nombres es el uid. Cerrarlo en el
servidor exigiría una consulta de grupo de colecciones con su índice, y este
proyecto no despliega índices; queda anotado en el módulo.

Una persona tiene varios aparatos —el teléfono, el de la casa, el del navegador
del locutorio— y todos cuentan. La clave del documento es el propio token, así
que volver a registrar el mismo aparato reescribe en vez de duplicar.

**Ningún cliente escribe aquí.** Se pasa siempre por la API con el SDK de
servidor. La regla comodín del final de `firebase/firestore.rules` ya lo deniega;
se añade una entrada explícita para que quien lea las reglas lo sepa sin
deducirlo.

### 3.2. `src/platform/push.ts` — una puerta, dos mundos

Dentro del APK el token lo da `@capacitor-firebase/messaging`; en el navegador,
`firebase/messaging` con una clave VAPID. Son dos bibliotecas distintas con dos
formas de pedir permiso.

Este módulo las esconde detrás de tres funciones:

```ts
disponible(): Promise<boolean>   // ¿este aparato puede recibir avisos?
registrar(): Promise<"ok" | "denegado" | "no-disponible">
darDeBaja(): Promise<void>
```

El resto del código no se entera de cuál de los dos hay debajo. Es el mismo
patrón que `src/platform/native.ts` usa para entrar con Google, y por la misma
razón: la diferencia es del aparato, no de la aplicación.

El complemento nativo se carga con `import()` dinámico y solo cuando hace falta,
para que el navegador no se lo baje nunca.

### 3.3. `src/server/push.ts` — mandar

```ts
avisar(destino: { uid: string } | { consejo: true }, aviso: Aviso): Promise<void>
```

Resuelve los tokens, manda con `firebase-admin` y **borra los que ya no
existen**. Esto último no es un detalle: FCM responde
`messaging/registration-token-not-registered` cuando alguien desinstaló la
aplicación o formateó el teléfono, y sin limpiarlos el registro se llena de
aparatos fantasma que se arrastran en cada envío.

El Consejo se resuelve consultando `accounts` por `role == "admin"` y
descartando las cuentas que no estén vivas (`active !== true` o `deleted`). Dos
precisiones que cuestan avisos indebidos si se olvidan: `role` es el **segundo**
de los dos caminos de `src/server/admin-auth.ts` —el primero es la
reivindicación del token, y se lee el segundo para no recorrer `listUsers()` en
cada envío, de modo que conceder el rol tiene que escribir ese campo sin
tragarse el fallo—; y ni la solicitud de eliminación ni la anonimización quitan
el rol, solo dejan `active: false`, así que sin ese filtro una cuenta que el
Consejo ya cortó seguiría recibiendo el título y la vereda de cada reporte.

`sendEachForMulticast` acepta 500 tokens por llamada; se trocea por si algún día
hacen falta más.

### 3.4. El enganche

Los avisos se escriben hoy en siete sitios, todos dentro de transacciones de
Firestore. El envío se engancha junto a los cuatro que la sección 4 nombra —los
otros tres se quedan solo en la bandeja— y **fuera de la transacción**: se envía
después de que confirme, y con `void`, exactamente como
`src/app/api/incidents/route.ts` ya hace con `buildBackup`.

La regla, que en ese archivo está escrita y aquí se repite: un envío que falla no
puede tumbar un reporte que ya se guardó. Un recibo confirmado es un recibo
confirmado aunque el teléfono de la persona esté apagado.

### 3.5. El service worker

`public/sw.js` gana dos oyentes: `push`, que dibuja la notificación, y
`notificationclick`, que enfoca la pestaña abierta o abre una nueva en la
dirección del aviso.

**Sin importar los scripts de Firebase.** La carga llega como JSON y se lee a
mano: meter `firebase-messaging-compat` desde gstatic chocaría con la política
de contenido que la aplicación ya tiene puesta, y añadiría 80 kB a un archivo
que hoy es legible de arriba abajo.

## 4. Qué se manda y qué no

Mandar todo es ruido, y el ruido enseña a la gente a ignorar el aviso.

**Al vecino:**

- Su reporte cambió de estado.
- El Consejo retiró su reporte, con la razón.

**No** cuando su reporte se recibe: acaba de mandarlo, ya lo sabe.

**Al Consejo:**

- Entró un reporte nuevo.
- Alguien pidió borrar su cuenta.

**No** por los cambios que hacen entre ellos. Eso está en la bandeja compartida,
y avisar a cinco personas de lo que acaba de hacer la sexta es spam.

Cada aviso lleva `data.url` con la pantalla que abre —`/reporte/{id}/`— para que
tocarlo lleve al expediente y no a la portada.

## 5. El ciclo de vida del token

1. **Al conceder el permiso** (tras el primer reporte) se pide el token y se
   registra.
2. **En cada arranque con sesión**, si ya hay permiso, se vuelve a registrar. Los
   tokens rotan solos y esto los recoge sin que nadie note nada.
3. **Al cerrar sesión se da de baja.** No es opcional: en el río los teléfonos se
   prestan, y sin esto la siguiente persona que entre en ese aparato recibiría
   los avisos de la anterior. Va dentro de `cerrarSesion()` en
   `src/platform/native.ts`, que desde el arreglo del acceso con Google es el
   único sitio por donde se sale.
4. **Desde Mi cuenta** se puede apagar cuando se quiera, y eso borra el token.
   Quien no quiere que le suene el teléfono tiene que poder decirlo sin
   desinstalar nada.

## 6. Qué pasa cuando algo falta

La aplicación no se rompe y no miente. Cada caso tiene su camino:

| Situación                          | Qué hace                                                     |
| ---------------------------------- | ------------------------------------------------------------ |
| Sin clave VAPID configurada        | El navegador no ofrece avisos. **El APK sigue funcionando.**  |
| Navegador sin soporte              | No se ofrece. No aparece un interruptor que no hace nada.     |
| Permiso denegado                   | Se dice, y queda el interruptor de Mi cuenta para reintentar. |
| Sin sesión                         | No se registra nada: un aviso es de alguien.                  |
| FCM caído o token muerto           | Se traga en silencio; el aviso sigue en la bandeja de dentro. |

La bandeja de dentro es la red de seguridad de todo esto: **si el push falla, la
información no se pierde**, solo llega más tarde.

## 7. Lo que hay que configurar fuera del código

1. **Clave VAPID** — Consola de Firebase → Configuración del proyecto → Cloud
   Messaging → Certificados push web → Generar par de claves. Va como
   `NEXT_PUBLIC_FIREBASE_VAPID_KEY`. **Es lo único que bloquea la mitad del
   navegador**; sin ella el APK funciona igual.
2. **`NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`** — hoy no está en el `.env`, y
   el SDK web lo necesita. Es el `project_number` de `google-services.json`.
3. **API de Cloud Messaging habilitada** en el proyecto de Google Cloud. Suele
   venir activa en los proyectos de Firebase; se comprueba en el primer envío.
4. **Icono monocromo de notificación** — Android pide una silueta blanca sobre
   transparente. Sin ella enseña un cuadrado blanco. Se genera desde el mismo
   emblema con `scripts/iconos-android.mjs`, que ya hace las otras piezas de
   marca.

**El APK hay que recompilarlo e instalarlo.** Esto añade un complemento nativo,
así que, a diferencia de los últimos arreglos, no viaja solo con el despliegue.

## 8. Pruebas

**Unitarias** (Vitest), donde está la lógica que puede equivocarse:

- El reparto: a quién le toca cada aviso, y que el propio «recibido» no se manda.
- La resolución del Consejo desde `accounts`.
- La limpieza de tokens muertos con la respuesta de FCM.
- El troceado por encima de 500 tokens.
- Las rutas `/api/push/registro` y `/api/push/baja`: exigen sesión y validan.

**De navegador** (Playwright):

- Mi cuenta enseña el interruptor cuando el aparato puede, y no lo enseña cuando
  no puede.
- Sin sesión no se ofrece nada.

**A mano, en el emulador Android**, que es lo único que prueba de verdad que el
teléfono suena: con sesión iniciada, mandar un reporte, conceder el permiso,
cambiar el estado desde el panel del Consejo y ver llegar la notificación con la
aplicación cerrada.

## 9. Lo que queda fuera

- **Agrupar avisos** por expediente. Hasta que haya volumen no hace falta.
- **Horario de silencio.** Se puede querer más adelante; hoy es complejidad sin
  demanda.
- **iOS.** No hay APK de iOS en este proyecto.
- **Avisos de comunicados** a toda la comunidad. Es un envío masivo con sus
  propios problemas —tópicos de FCM, gente que no lo pidió— y merece su propia
  conversación.
