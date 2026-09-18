# Lo que el teléfono tiene que prestarnos — diseño

18 de septiembre de 2026

## 1. De qué va esto

Tres cosas que la aplicación instalada necesita del teléfono —el micrófono, la
ubicación y los avisos— y que hoy están en tres estados distintos:

| | En el navegador | En el APK |
| --- | --- | --- |
| **Avisos** | Funciona | **Funciona.** No hay nada que hacer |
| **Micrófono** | Funciona | **Roto.** «No se autorizó el micrófono» |
| **Ubicación** | No existe | No existe |

Los avisos ya están: `POST_NOTIFICATIONS` entra en el APK por el manifiesto del
complemento de mensajería —comprobado en el manifiesto fusionado de la
compilación—. Lo que falta de los avisos es desplegar el arreglo de esta mañana,
no un permiso.

Quedan dos, y **no son el mismo tipo de trabajo**: el micrófono es un fallo que
hay que reparar, y la ubicación es algo que nunca se construyó.

## 2. El micrófono

### 2.1. Qué pasa

`src/features/voice-input.tsx` dicta con la API de voz del navegador
(`webkitSpeechRecognition`). En el navegador va. En el APK, la persona pulsa
«Activar micrófono» y lee:

> No se autorizó el micrófono o el servicio de voz. Revisa los permisos del
> navegador.

Hay **dos causas posibles y ese mensaje no las distingue**:

1. **Falta el permiso.** `android/app/src/main/AndroidManifest.xml` declara un
   solo permiso: `INTERNET`. Cuando la página pide el micrófono, la ventana de
   Capacitor pide a Android `RECORD_AUDIO`, que no está declarado, y Android lo
   niega sin preguntar a nadie. → el error llega como `not-allowed`.
2. **La ventana de Android no tiene servicio de voz.** El WebView es Chromium,
   así que **el constructor existe** —por eso la aplicación no cae en su rama de
   «este navegador no admite dictado», que sería lo honesto— pero al arrancar no
   hay a quién pedirle el reconocimiento. → el error llega como
   `service-not-allowed`.

Las dos terminan en la misma frase, así que desde aquí no se puede saber cuál
es. **Y necesitan cosas distintas de la persona**: la primera se arregla dando
un permiso, la segunda no se arregla de ninguna manera y lo que hay que decirle
es que use el micrófono de su teclado.

### 2.2. Lo primero, separar las dos frases

Antes de tocar nada más. `not-allowed` y `service-not-allowed` dejan de decir lo
mismo. Es un arreglo pequeño que se sostiene solo —la aplicación deja de dar un
consejo que puede no servir— y además es **el instrumento de medida** del punto
siguiente.

### 2.3. Medirlo antes de construir

Con `RECORD_AUDIO` declarado, un APK y el emulador que ya existe en esta máquina
(`Medium_Phone_API_35`), con `webContentsDebuggingEnabled` encendido un rato,
se lee el código de error de verdad.

- Si dice **`not-allowed` y con el permiso declarado funciona**: se acabó el
  trabajo. Una línea de manifiesto.
- Si dice **`service-not-allowed`**: hay que traer el reconocimiento nativo.

Lo segundo es lo que espero —la ventana de Android lleva años sin servicio de
voz— pero el plan mide en vez de suponer, porque la diferencia entre las dos
salidas son unas horas y un complemento más en el APK.

### 2.4. Si hace falta el nativo

`@capacitor-community/speech-recognition`. Envuelve el `SpeechRecognizer` de
Android, que es **el mismo motor que hay detrás del micrófono del teclado**: lo
que la gente del río ya usa y ya sabe que funciona. Pide su propio permiso.

**Aviso de compatibilidad, que es el riesgo de este apartado:** su última versión
es la 7.0.1 y declara `@capacitor/core >=7.0.0`, así que acepta el 8 que usamos,
pero está hecho para el 7. Si al compilar choca con Capacitor 8, no se fuerza:
la salida es dejar el dictado como cosa del navegador y **decirlo en la tarjeta**
—«en la aplicación instalada, usa el micrófono de tu teclado»—, que no es una
derrota: ese micrófono funciona, está a un toque y la gente ya lo conoce.

**La forma**, la misma que este proyecto ya usa para entrar con Google
(`src/platform/native.ts`): una puerta que esconde en qué mundo corre.

`src/platform/voz.ts`

```
disponible(): Promise<boolean>        ¿se puede dictar aquí?
escuchar(alTrozo, alFinal): Promise<Parar>
```

Dentro: en el APK el complemento; en el navegador, exactamente lo que
`voice-input.tsx` hace hoy, movido sin tocarlo.

**Lo que no se toca al mover.** La lógica de los trozos de `voice-input.tsx`
—guardar cada trozo en la posición que indica el evento en vez de acumular— es
una cicatriz de dos intentos fallidos y el comentario lo cuenta. **El
reconocedor nativo hace exactamente lo mismo**: reemite la misma frase creciendo.
Esa lógica se queda, y la prueba que la fija (`hubohubohubo…`) se queda
apuntando a la puerta.

**Y el minuto.** El reconocedor nativo se calla solo tras un silencio; el del
navegador sigue hasta que se le diga. La puerta iguala: sesenta segundos en los
dos, como hoy.

## 3. La ubicación

### 3.1. Esto no es un permiso, es una funcionalidad

La aplicación **no llama a la geolocalización en ninguna parte**. El punto de un
reporte se marca **a mano sobre el mapa**, y si no se marca se usa el punto de
referencia de la vereda (`src/domain/logic.ts`).

Así que no hay nada roto que reparar: hay un botón que no existe.

### 3.2. El botón, y por qué no sustituye al mapa

**Usar mi ubicación**, en el paso de ubicación del reporte, encima del mapa.

No reemplaza marcar a mano, y esto es del territorio y no de la interfaz: bajo
el dosel del bosque un teléfono puede errar doscientos metros, y **quien está
parado frente al derrumbe sabe mejor que el GPS dónde está el derrumbe**. El
botón rellena el punto; el mapa lo sigue dejando mover.

### 3.3. Tres estados, y el del medio es el que todos olvidan

- **Sin punto** — «Marca el punto en el mapa o usa tu ubicación.»
- **Buscando** — «Buscando tu ubicación…», con manera de cancelar. Un GPS bajo
  los árboles tarda entre veinte y cuarenta segundos, y una pantalla que no dice
  nada durante medio minuto parece rota.
- **Con punto** — de dónde salió y con cuánto margen: «Tu ubicación, con 12 m de
  margen» frente a «Marcado a mano».

**El margen no es adorno.** Una lectura con dos kilómetros de error es peor que
el punto de la vereda, y ofrecerla como «tu ubicación» sería mentir. Por encima
de 500 m no se usa: se dice que la señal no alcanza y se deja el mapa, que ahí
sí es mejor.

### 3.4. La puerta

`src/platform/ubicacion.ts`, misma forma:

- APK: `@capacitor/geolocation` (8.2.2, oficial, Capacitor 8), que pide el
  permiso de Android como hay que pedirlo.
- Navegador: `navigator.geolocation.getCurrentPosition` con
  `enableHighAccuracy`, treinta segundos de espera y `maximumAge: 0` —un punto
  guardado de hace una hora es de otro sitio—.
- Las dos devuelven lo mismo: `{ lat, lng, exactitud }` o el motivo por el que
  no hay punto.

### 3.5. El manifiesto

`ACCESS_COARSE_LOCATION` y `ACCESS_FINE_LOCATION`.

**`ACCESS_BACKGROUND_LOCATION` no**, y conviene dejarlo escrito para que nadie lo
añada «por si acaso». Esta aplicación solo necesita saber dónde está alguien
mientras esa persona está mirando el formulario y ha pulsado un botón. Pedir la
ubicación en segundo plano es una promesa que no hace falta hacerle a una
comunidad sobre dónde están sus miembros, y además es de las cosas por las que
Google Play rechaza una aplicación.

### 3.6. Privacidad, que aquí no es un trámite

En esta aplicación se reportan minería ilegal y derrumbes en un territorio con
presencia armada. Una coordenada es una persona parada en un sitio a una hora.

- El botón se pulsa **cada vez**. Ni «recordar mi ubicación», ni captura
  automática al abrir el formulario.
- Lo que ya existe sigue: el reporte sensible, y la vista comunitaria que enseña
  la vereda y no el punto.
- La tarjeta dice, **antes** de pedir nada, para qué es la coordenada y quién la
  va a ver.

## 4. Lo que une a los tres

Tres permisos pedidos en tres momentos, y Android 13 en adelante castiga un «no»
dicho a destiempo: recuperarlo obliga a entrar en los ajustes del sistema, y eso
no lo hace nadie. Este proyecto ya decidió esto una vez, para los avisos: **se
pide en el momento en que la persona entiende para qué sirve.**

La misma regla para los tres:

| | Cuándo se pide |
| --- | --- |
| Micrófono | Al pulsar «Activar micrófono». Ya es así |
| Ubicación | Al pulsar «Usar mi ubicación». Nunca antes |
| Avisos | Tras enviar el primer reporte. Ya es así |

Y un sitio donde los tres se vean y se puedan arreglar: **Mi cuenta**, que ya
tiene la fila de los avisos. Se le añaden las otras dos, diciendo su estado y,
cuando estén negados, **abriendo los ajustes del sistema** — porque en Android 13
en adelante esa es la única vuelta atrás, y una aplicación que no la ofrece deja
a la persona encerrada para siempre en un «no» que dijo sin querer.

## 5. Pruebas

Como el resto: cada una tiene que caerse al mutar la línea que defiende.

- **`voz.ts`**: en el APK usa el complemento y **no toca**
  `webkitSpeechRecognition`; en el navegador al revés. El doble del complemento
  va como proxy, por la cicatriz del `then` que cuelga la promesa para siempre.
- **La lógica de los trozos** sobrevive a la mudanza: la prueba del
  `hubohubohubo…` se queda, apuntando a la puerta.
- **`ubicacion.ts`**: una lectura con mal margen **se rechaza**, no se usa. El
  plazo agotado se dice. El permiso negado se dice, y distingue «negado ahora»
  de «negado para siempre», que llevan a sitios distintos.
- **El manifiesto**: declara micrófono y ubicación, y **no** declara ubicación en
  segundo plano. Una prueba que lee el archivo, para que añadirlo cueste borrar
  una prueba a propósito.
- **Los dos mensajes del micrófono** dicen cosas distintas.

## 6. En qué orden, y qué cuesta cada trozo

1. **Separar las dos frases del micrófono** y declarar `RECORD_AUDIO`. Pequeño,
   se sostiene solo, y es lo que mide el punto 2.
2. **Medir en el emulador.** Decide si el 3 existe.
3. **El reconocimiento nativo**, si hace falta.
4. **La ubicación**: puerta, botón, manifiesto. Es independiente de 1–3 y se
   puede hacer en paralelo si conviene.
5. **Las filas de permisos en Mi cuenta.**
6. **APK nuevo.**

Los pasos 1, 4 y 5 están decididos. El 3 depende de una medición y de que un
complemento hecho para Capacitor 7 compile con el 8; si no compila, la salida
está escrita en §2.4 y no es un agujero.

## 7. Lo que queda fuera

- **Dictado sin conexión.** Ni el navegador ni el reconocedor de Android lo
  hacen sin red. La tarjeta ya lo dice; seguirá diciéndolo.
- **Seguir la ubicación mientras se rellena el formulario.** Un punto pedido a
  propósito, y ya.
- **Guardar el margen de error en el expediente.** Se enseña al elegir y decide
  si el punto vale; que además viaje al servidor es otra decisión, y no hace
  falta para esto.
