# Auditoría del modo sin conexión — 16 de septiembre de 2026

Auditoría completa de lo que la aplicación hace cuando no hay señal. **No se
hizo leyendo el código**: se montó un banco de pruebas que corta la red en un
navegador real y recorre las catorce direcciones de la aplicación, una por una,
mirando qué se abre y **qué dice** cada pantalla.

Este documento registra lo medido, lo que se corrigió y lo que sigue sin
resolverse. La descripción permanente del sistema está en
[arquitectura.md §9](arquitectura.md#9-sin-conexión).

---

## 1. Medición inicial

Estado de los cachés tras una visita con señal:

```
mi-pueblo-shell-v8 : 31 entradas
mi-pueblo-news-v1  :  1 entrada
mi-pueblo-pages-v1 :  8 entradas
```

Recorrido de las catorce direcciones con la red cortada:

| Dirección                                                                                                     | Antes        | Ahora    |
| ------------------------------------------------------------------------------------------------------------- | ------------ | -------- |
| `/inicio/` `/mis-reportes/` `/mapa/` `/comunidad/` `/estadisticas/` `/cuenta/` `/documentacion/` `/reportar/` | abre         | abre     |
| `/historial/`                                                                                                 | **respaldo** | abre     |
| `/reporte/{id}/`                                                                                              | **respaldo** | abre     |
| `/noticia/{id}/`                                                                                              | **respaldo** | abre     |
| `/acceso/` `/bienvenida/` `/admin/`                                                                           | respaldo     | respaldo |

---

## 2. Hallazgos

### 2.1. El expediente guardado no se podía abrir · **corregido**

El peor de todos. Un reporte guardado en este mismo teléfono tenía su caso en el
almacén y **su pantalla caía en la página de respaldo**. La causa: la dirección
lleva el identificador dentro, así que el _service worker_ no la puede
precachear —no la conoce hasta que el reporte existe— y, como dentro de la
aplicación se navega sin recargar, tampoco la ve pasar nunca. No había manera de
que llegara al caché por sí sola.

Ahora las pide la aplicación mientras hay señal
([`src/data/offline-pages.ts`](../src/data/offline-pages.ts)): los veinte
últimos expedientes y los ocho comunicados de cabecera, cada uno donde ya vive
su lista. Lo guardado es el armazón de la pantalla, sin ningún dato.

### 2.2. `/historial/` no estaba precacheado · **corregido**

Está en la barra de navegación de Comunidad y se había quedado fuera de la lista
de precarga. Una línea.

### 2.3. El observatorio contaba un teléfono, no el territorio · **corregido**

El hallazgo más grave, y **no era solo de lo offline**: `/estadisticas/` recibía
el almacén de este navegador en lugar del territorio. Bajo el rótulo
«OBSERVATORIO COMUNITARIO · Datos para cuidar mejor» presentaba «1 registros en
el periodo», «Tasa de solución 0 %» y «Espera mediana 10 días» calculados sobre
el único reporte que ese teléfono tenía guardado, **con señal y sin ella**.

Es el mismo error que ya se había corregido en el mapa y en el historial, en la
pantalla que faltaba. Ahora lee el territorio: lo propio más lo que la comunidad
puede ver.

### 2.4. Listas que prometían más de lo que enseñaban · **corregido**

Sin señal, «Mis reportes» mostraba la copia del aparato bajo un rótulo que
promete «lo que el Consejo tiene a tu nombre, más lo que aún no ha salido de
este dispositivo». Con un reporte hecho desde otro teléfono, la lista parecía
completa y no lo era, y nada en pantalla lo decía.

Ahora las tres pantallas declaran que van cortas, cada una en sus términos, y
una prueba de navegador lo fija.

### 2.5. «No se pudo traer la fotografía» · **corregido**

Suena a que la prueba se perdió. Ahora distingue los dos motivos: sin conexión
dice que **sigue guardada en el servidor del Consejo**; con conexión, que falló
el servidor.

### 2.6. Los comunicados individuales no se guardan · **sin resolver**

`mi-pueblo-news-v1` conserva la lista (`/api/news/`), pero el dato de cada
comunicado (`/api/news/{id}/`) solo entra al caché si alguien lo abrió con
señal. Abrir sin red uno que nunca se abrió da «No pudimos abrir este
comunicado. Puede que ya no esté publicado o que falte conexión» —correcto, pero
evitable—. La pantalla ya se guarda; falta guardar su dato al lado.

### 2.7. `/acceso/`, `/bienvenida/` y `/admin/` caen en el respaldo · **sin resolver**

Las tres necesitan servidor y no van a funcionar sin señal, así que el respaldo
no es incorrecto. Lo que sí es mejorable es **lo que dice**: la página de
respaldo habla de reportes, y quien llega ahí desde «Iniciar sesión» no recibe
respuesta a lo que preguntó.

### 2.8. Primera visita sin caché: pantalla en blanco · **no es resoluble**

Si el aparato nunca abrió la aplicación con señal, no hay _service worker_
instalado y el navegador enseña su propio error. No hay nada que la aplicación
pueda hacer: **hace falta una primera visita con red**, y conviene decirlo al
entregar teléfonos en el territorio.

---

## 3. Lo que sí funciona, comprobado

- **Reportar sin señal**, recorriendo los pasos del formulario hasta la
  descripción, con el reporte a la cola y salida automática al volver la red.
- **Los comunicados**, con la marca «copia guardada» para que nadie lea un
  boletín de hace tres días creyéndolo de hoy.
- **El expediente propio**, con su relato, su estado y su seguimiento.
- **La guía del proyecto**, entera.
- **El mapa abre**, aunque sin el dibujo del terreno.

---

## 4. Lo que sigue sin funcionar sin señal

Las teselas del mapa, las estadísticas del Consejo, la asistencia de IA, entrar
o crear una cuenta, y cualquier expediente que este aparato no tenga guardado.

### 4.1. Añadido el 19 de septiembre de 2026

Lo que se construyó después de esta auditoría, y cómo se comporta sin señal.

| | Sin señal |
| --- | --- |
| **Dictado por voz** | **No.** Los dos motores —el del navegador y el de Android— mandan el audio a un servicio remoto. Se dice antes de empezar, no después de esperar en blanco |
| **«Usar mi ubicación»** | **Sí.** El GPS no necesita red. Bajo los árboles tarda entre veinte y cuarenta segundos, y la pantalla lo avisa |
| **El mapa de esa ubicación** | **No.** El punto se guarda igual y viaja con el reporte; lo que falta es el dibujo |
| **Proponer una vereda nueva** | **Sí.** Nombre y punto viajan en la cola de envío como cualquier reporte |
| **Los puntos de vereda aceptados** | **Sí**, los que ya se hayan traído: se guardan en este navegador y se leen al arrancar sin esperar a nadie. Sin ellos vale el catálogo compilado, que es como se ha visto siempre |
| **Avisos con la aplicación cerrada** | **No**, y no es una carencia: un aviso es una cosa que llega por la red. Lo que sí llega es lo acumulado, al volver la señal |

Lo importante de la ubicación: **no sale del teléfono hacia ningún tercero**. Es
el aparato el que la da, así que es de las pocas cosas de esta aplicación que
funcionan igual de bien en el río que en una ciudad.

---

## 5. Verificación

`lint` · `typecheck` · **196 pruebas unitarias** · compilación · **65 pruebas de
navegador**, de las cuales cinco son de modo sin conexión:

1. Abrir el formulario de reporte sin red y avanzar de paso.
2. Leer los comunicados sin red, con su marca de copia.
3. Abrir un expediente guardado desde su propia dirección.
4. Abrir el historial de la comunidad.
5. Que las tres listas declaren que van cortas.

Más cinco pruebas unitarias que ejecutan `sw.js` en una máquina virtual y fijan
que ninguna petición con sesión toca el caché.
