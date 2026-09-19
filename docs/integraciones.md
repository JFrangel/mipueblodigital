# Lo que esta aplicación le pide a alguien de fuera

19 de septiembre de 2026

Mi Pueblo Digital depende de siete servicios que no controla. Este documento
dice **qué le pide a cada uno, qué sale del territorio, qué pasa cuando no
contestan y cuánto cuesta**. Está escrito para quien vaya a sostener la
aplicación y para quien tenga que responder por ella ante la comunidad.

La regla que atraviesa todo: **ninguna de estas siete puede tumbar un reporte.**
Un reporte se escribe, se guarda y sale sin que ninguna de ellas conteste.

| | Para qué | Si no contesta |
| --- | --- | --- |
| [Firebase Auth](#1-firebase-auth) | Quién es cada quien | No se entra. Lo guardado espera |
| [Firestore](#2-firestore) | Los expedientes y todo lo demás | La cola de envío espera señal |
| [Archivo de fotografías](#3-el-archivo-de-fotografías) | El original de cada evidencia | Queda la copia reducida |
| [OpenRouter](#4-openrouter-las-tres-ayudas-de-redacción) | Tres ayudas de redacción | Se dice, y se sigue escribiendo |
| [FCM](#5-los-avisos-que-llegan-al-teléfono) | Avisos con la app cerrada | La campana de dentro sigue |
| [Reconocimiento de voz](#6-el-dictado) | Dictar el relato | Se escribe |
| [OpenStreetMap](#7-el-mapa) | Las teselas del mapa | Se dice y se sigue sin mapa |

---

## 1. Firebase Auth

Identidad por correo y contraseña, y con la cuenta de Google del teléfono.

**Dentro del APK hay dos Firebase y no se conocen.** El complemento firma en el
Firebase nativo de Android; el resto de la aplicación lee el de JavaScript, que
vive en la ventana web. Firmar solo en el nativo produce el fallo más
desconcertante posible: el selector de cuentas abre, la persona elige la suya,
todo va bien por dentro y **la pantalla no se mueve**. Por eso
`src/platform/native.ts` hace el trayecto entero. Ver `docs/arquitectura.md §5`.

Lo que sale: el correo. Nada más.

## 2. Firestore

La base de datos. Los expedientes, las cuentas, los comunicados, las novedades,
los aparatos apuntados a los avisos y las propuestas de vereda.

Las reglas (`firebase/firestore.rules`) niegan por defecto y abren tres cosas: la
propia cuenta, los reportes públicos y los puntos de vereda aceptados. **Todo lo
demás pasa por una ruta de `/api/`, que comprueba quién pregunta.** El SDK de
servidor se salta las reglas, así que las rutas vuelven a comprobarlo todo.

## 3. El archivo de fotografías

Un almacén externo, por HTTP, con la clave en el servidor. Guarda el **original**
de cada evidencia; junto al expediente queda además una copia reducida, porque
el archivo puede pausarse por falta de uso y un expediente sin fotografía no se
puede mirar. Ver `docs/evidencias-base64.md`.

Lo que sale del territorio: la fotografía. Es el dato más sensible que maneja
esta aplicación, y es el primero que se borra cuando alguien pide eliminar su
cuenta.

## 4. OpenRouter: las tres ayudas de redacción

Un modelo de lenguaje, a través de OpenRouter. **Solo modelos gratuitos**: el
servidor lo comprueba y se niega a llamar a uno de pago
(`src/server/openrouter.ts`). Variables: `OPENROUTER_API_KEY` y, opcional,
`OPENROUTER_MODEL`.

Las tres exigen **correo verificado**, que es lo único que esta aplicación
reserva a un correo verificado: consumen crédito de un tercero y tienen cupo
diario por cuenta.

### 4.1. Ayuda a redactar el reporte · `POST /api/ai/improve`

Quien reporta escribe, y puede pedir que le pulan el texto. **Sale el relato tal
como lo escribió.** Es lo que más sale del territorio de las tres, y por eso el
botón está donde se ve y no encendido de antemano.

Entre 20 caracteres y 500 palabras; el cuerpo se corta a 16 KB leyéndolo.

### 4.2. Lectura de las cifras · `POST /api/ai/reading`

**Reservada al Consejo.** Cualquiera puede leer las cifras calculadas en su
propio dispositivo, pero hacerlas salir hacia un proveedor externo es una
decisión de quien responde por el territorio.

El servidor **no calcula nada ni ve un expediente**: recibe las frases que el
navegador ya calculó y pide que las una en un párrafo. Esa es la frontera —el
modelo redacta, no analiza— y por eso se valida que la respuesta no sea más
larga que lo enviado: si lo fuera, sería señal de que agregó de su cosecha.

### 4.3. Análisis de la bandeja · `POST /api/admin/analysis`

También del Consejo. Salen **conteos verificados** —por estado, categoría,
vereda y prioridad— y, de los casos cerrados, la nota pública con la que se
cerraron. Ni relatos, ni nombres, ni teléfonos, ni notas internas.

La respuesta se valida antes de entregarla: **si trae cifras o porcentajes se
descarta**, porque las cifras se muestran aparte y un modelo que las repite es
un modelo que puede equivocarse en ellas.

## 5. Los avisos que llegan al teléfono

Firebase Cloud Messaging. En el APK, por el complemento nativo; en el navegador,
por el SDK web con clave VAPID (`NEXT_PUBLIC_FIREBASE_VAPID_KEY`).

Se piden **al enviar el primer reporte**, no al abrir la aplicación: en Android
13 en adelante, un «no» dicho a destiempo obliga a entrar en los ajustes del
sistema para deshacerlo, y nadie lo hace.

Lo que viaja en el aviso es deliberadamente poco. **Un aviso se lee en la
pantalla de bloqueo de un teléfono que puede estar prestado**, así que no lleva
relatos ni nombres: dice qué pasó y a dónde ir. Ver `docs/arquitectura.md §10`.

Sin la clave VAPID, el navegador no ofrece el interruptor y **la aplicación
instalada sigue igual**: es la pieza que hace que una configuración a medias no
se lleve por delante a quien tiene el APK.

## 6. El dictado

Dos motores distintos detrás de un mismo botón (`src/platform/voz.ts`).

**En el navegador**, la API de voz del propio navegador, que manda el audio a su
servicio de reconocimiento. Sin red no empieza, y se dice antes de esperar en
blanco.

**En el APK, el reconocedor de Android** — el mismo motor del micrófono del
teclado. La API del navegador **no funciona dentro de la ventana de Android**:
el constructor existe, porque es Chromium, pero detrás no hay servicio de voz.
Eso, más que `RECORD_AUDIO` no estaba declarado, hacía que Android negara la
petición sin enseñar ningún diálogo: la persona leía «no se autorizó el
micrófono» sin haber tenido nunca nada que autorizar. Medido en emulador el 18
de septiembre de 2026.

**Ningún audio se guarda**, ni aquí ni en el teléfono. Lo que queda es el texto,
dentro de la descripción, editable como cualquier otra.

Los dos reconocedores comparten un defecto y por eso comparten remedio
(`src/domain/dictado.ts`): **reemiten la misma frase creciendo** en vez de
cerrarla, y acumular eso multiplica el texto palabra por palabra. Es la cicatriz
de tres intentos y tiene sus propias pruebas.

## 7. El mapa

Teselas de OpenStreetMap y la biblioteca Leaflet, las dos **bajo demanda y solo
con conexión**: abrir el formulario en el río no debe costar la descarga de una
biblioteca de mapas. Si no cargan, se dice y el reporte sigue: viaja con el
nombre de la vereda.

---

## 8. La ubicación, que no es un servicio de nadie

No sale del teléfono hacia ningún tercero: la da el propio aparato
(`src/platform/ubicacion.ts`). Se documenta aquí porque comparte con las demás
la única regla que importa: **se pide a propósito, cada vez, y nunca sola.**

En un territorio de casas dispersas y presencia armada, una coordenada es una
persona parada en un sitio a una hora. Por eso no hay «recordar mi ubicación»,
no hay captura automática al abrir el formulario, y **no se pide la ubicación en
segundo plano** —el manifiesto no declara ese permiso, y está escrito allí para
que nadie lo añada por si acaso—.

Una lectura con más de 500 m de margen se rechaza: es peor que el punto
documentado de la vereda, y ofrecerla como «tu ubicación» sería mentir con una
cifra delante.

---

## 9. Lo que cuesta

| | Coste |
| --- | --- |
| Firebase (Auth, Firestore, FCM) | Plan gratuito. Firestore cobra por lectura a partir de un tope diario |
| OpenRouter | **Cero**: solo modelos gratuitos, y el servidor se niega a llamar a otro |
| Archivo de fotografías | Según el proveedor. **Se pausa por falta de uso**, de ahí la copia reducida |
| OpenStreetMap | Gratuito, con una política de uso que esta aplicación cumple de sobra |
| Reconocimiento de voz | Cero: lo pone el navegador o el teléfono |
| Vercel | Plan gratuito |

Lo que puede sorprender en una factura es Firestore, y el sitio por donde
crecería son las lecturas del mapa y de la bandeja del Consejo. Las dos están
paginadas y con tope de páginas, a propósito.

---

## 10. Lo que hay que configurar fuera del código

```
NEXT_PUBLIC_FIREBASE_API_KEY          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID       NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY        (sin ella, el navegador no ofrece avisos)
FIREBASE_SERVICE_ACCOUNT              (el SDK de servidor)
OPENROUTER_API_KEY                    (sin ella, las tres ayudas se apagan solas)
OPENROUTER_MODEL                      (opcional; tiene que acabar en «:free»)
MPD_APP_URL                           (solo para compilar el APK)
```

Y en la consola de Firebase: el dominio autorizado para entrar con Google, la
huella SHA-1 del APK, y la clave VAPID en Cloud Messaging.

**Pendiente y anotado desde el 17 de septiembre: rotar la clave de la cuenta de
servicio.** Estuvo dentro de despliegues que ya se borraron.
