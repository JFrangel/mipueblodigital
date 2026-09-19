# Arrancar sin haber visto nunca la red — diseño

19 de septiembre de 2026

## 1. Qué se quiere, exactamente

Que alguien reciba el APK por Bluetooth en el río, lo instale, lo abra **sin
señal** y pueda **escribir un reporte**, que saldrá solo cuando aparezca la red.

Eso es todo. No se pretende que vea los comunicados de ayer ni sus expedientes:
un teléfono recién instalado no los ha recibido nunca y nadie espera lo
contrario. Lo que hoy no es razonable es que **la aplicación ni siquiera abra**.

## 2. Por qué hoy no se puede

El APK no lleva la aplicación dentro: es una ventana a la aplicación servida por
HTTPS (`server.url`). Y el motivo es real —las rutas de `/api/` comprueban quién
pregunta, hablan con Firestore y con el archivo de fotografías— pero tiene una
consecuencia que no se eligió: **en el primer arranque no hay código**. Ni HTML,
ni JavaScript, ni service worker. No hay nada que ejecutar.

Lo que falta en ese primer arranque **no son los datos: es el programa**.

### 2.1. Y el origen lo complica más de lo que parece

La tentación es meter en el APK una páginita suelta que guarde el reporte y ya.
**No funciona.** El almacén de un navegador es por origen: lo que escriba una
página servida desde `localhost` es invisible para la aplicación, que vive en
`https://mipueblodigital.vercel.app`. El reporte se quedaría en un cajón que
nadie va a abrir nunca.

Así que la única salida de verdad es **mover la aplicación al aparato**, no
añadirle un anexo.

## 3. Lo que hay que mover, y lo que no

| | Dónde vive hoy | Dónde tendría que vivir |
| --- | --- | --- |
| El código: HTML, JS, CSS | El servidor | **Dentro del APK** |
| Las 29 rutas de `/api/` | El servidor | El servidor, sin tocarlas |
| Los datos | El servidor | El servidor |

Seis páginas y veintinueve rutas de API. Y **no hay nada en las páginas que
impida exportarlas**: ni `dynamic`, ni `revalidate`, ni `cookies()`, ni
`headers()`. El segmento dinámico ya declara `generateStaticParams`. Eso es una
buena noticia y conviene decirla: la parte que parecía el muro no lo es.

## 4. Dos maneras, y no cuestan lo mismo

### 4.1. Opción A · La aplicación en `localhost`, la API en su dominio

Exportación estática dentro del APK, se quita `server.url`, y las 19 llamadas a
`fetch("/api/…")` pasan a apuntar al dominio.

**Lo que arrastra**, y es mucho:

- **CORS en las veintinueve rutas.** La aplicación pasa a ser de otro origen.
- **El origen local hay que autorizarlo en Firebase**, y la política de contenido
  (`connect-src 'self'`) tiene que abrirse al dominio de la API.
- Y lo que de verdad pesa: **la API queda expuesta a otro origen**. En una
  aplicación donde se reporta minería ilegal, abrir la puerta de las peticiones
  a un origen distinto no es un ajuste de configuración.

### 4.2. Opción B · La aplicación en el APK, pero **con el mismo nombre de dominio**

`server.hostname: "mipueblodigital.vercel.app"` y sin `server.url`. Capacitor
sirve el código desde el APK **bajo ese mismo origen**.

Y entonces no cambia nada de lo demás: el mismo almacén, las mismas cookies, el
mismo dominio autorizado de Firebase, la misma política de contenido, **cero
CORS**. Un reporte escrito en el primer arranque queda en el mismo cajón que
luego abre la aplicación, que es justamente lo que el §2.1 hace imposible de
cualquier otra manera.

**El pero.** Leyendo el código de Capacitor: `isMainUrl()` es cierto para
**cualquier** petición a ese nombre cuando no hay `server.url`, así que
`/api/…` se buscaría dentro del APK y daría 404. La salida es el complemento
**CapacitorHttp**, que sustituye `fetch` en JavaScript para que las peticiones
salgan por la capa nativa, sin pasar por las reglas de origen de la ventana.

Eso es exactamente para lo que existe, y aun así **es el camino menos transitado
de los dos**. Sustituir `fetch` globalmente tiene aristas conocidas, y esta
aplicación usa `AbortSignal.timeout` en casi todas sus llamadas y manda las
fotografías en Base64 dentro del JSON. Hay que comprobarlo, no suponerlo.

### 4.3. Cuál, y por qué

**La B**, si la comprobación del §6 sale bien. No por elegancia: porque la A
obliga a abrir la API a otro origen y eso, en esta aplicación, es una decisión
de seguridad y no de arquitectura.

## 5. El coste que no se ve: las actualizaciones

Hoy se despliega y todo el mundo lo tiene a la siguiente vez que abre. Con el
código dentro del APK, **un cambio de pantalla exige un APK nuevo**, y aquí eso
significa volver a repartir diez megas por Bluetooth, río arriba.

Es el argumento más fuerte para no hacer nada de esto, y tiene respuesta: **lo
que va dentro del APK es el suelo, no el techo.** En cuanto hay red una vez, el
service worker guarda la versión del servidor y esa es la que manda a partir de
entonces. El APK solo tiene que servir para el primer arranque y para el día en
que el service worker no esté.

Con la opción B esto sale gratis, porque el origen es el mismo y el service
worker ya existente sigue sirviendo. Con la A habría que rehacerlo.

## 6. Cómo saber si sale, antes de construirlo

Un tanteo de un día, y **antes de tocar nada más**:

1. `server.hostname` puesto al dominio, `server.url` fuera, y en `webDir` una
   página de prueba con dos cosas: un `fetch` a una ruta de `/api/` que no
   necesite sesión, y una escritura en IndexedDB.
2. Se instala sin señal. ¿Abre? ¿Escribe en el almacén?
3. Se enciende la red. ¿Contesta la API? ¿Con CapacitorHttp y sin él?
4. Se carga la aplicación de verdad en ese origen. ¿Ve lo que escribió la página
   de prueba?

**Si el paso 4 falla, el plan entero no sirve** y hay que volver a la opción A
con su coste, o quedarse como está. Ese paso es el que hay que hacer primero.

## 7. Qué hace falta construir, si sale

1. **Una segunda compilación.** `next build` normal para el servidor y otra con
   `output: "export"` para el APK, desde el mismo código, con una variable que
   las distinga. Las rutas de `/api/` no entran en la exportación —no pueden— y
   por eso hacen falta dos y no una.
2. **`webDir` pasa a ser la exportación**, y la página de «falta la primera
   conexión» deja de tener sentido: ya no falta.
3. **CapacitorHttp**, si el tanteo dice que hace falta.
4. **Repasar lo que el primer arranque puede prometer.** Con la aplicación
   cargada pero sin haber hablado nunca con el servidor, hay pantallas que no
   tienen nada que enseñar. La regla que este proyecto ya tiene escrita vale
   aquí entera: **una cifra que el sistema no puede saber va en blanco, no en
   cero**, y cada pantalla dice de dónde sale lo que enseña.
5. **Y la sesión.** Reportar exige cuenta, y entrar exige red. El camino sin
   cuenta ya existe —los reportes se acumulan y salen al entrar— así que el
   primer arranque sin señal termina donde ya sabe terminar.

## 8. Cuánto es

| | |
| --- | --- |
| El tanteo del §6 | Un día, y decide todo lo demás |
| La segunda compilación y el empaquetado | Dos o tres días |
| Repasar pantallas y sesión | Dos días |
| Pruebas en emulador del ciclo entero | Un día |

Una semana larga, con un día de riesgo concentrado al principio. Y **no hay
prisa**: el APK de hoy funciona, y lo que hace falta mientras tanto es lo del
§9, que cuesta cero.

## 9. Mientras tanto, lo que sí cuesta cero

Que quien entregue teléfonos lo sepa: **instalar, abrir una vez donde haya
señal, y ya**. Después funciona en el río.

Quien se salte ese paso no se queda a ciegas —desde el 19 de septiembre ve una
página en español que lo explica, con un botón que reintenta cuando aparece la
señal— pero no puede reportar todavía. Esa es exactamente la distancia que este
plan recorta.
