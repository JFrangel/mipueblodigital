# Empaquetado Android

Cómo se convierte Mi Pueblo Digital en una aplicación instalable, qué decisiones
lleva dentro y qué falta por hacer.

---

## 1. Qué lleva el APK, y qué no

**El APK no lleva la aplicación dentro.** Es una ventana a la aplicación servida
por HTTPS.

No es una comodidad: las rutas de `/api/` comprueban quién pregunta, hablan con
Firestore y con el archivo de fotografías. Eso no puede vivir dentro de un
teléfono. Una exportación estática dejaría fuera el envío de reportes, la
bandeja del Consejo y la publicación comunitaria, que son la aplicación.

**Lo que no se pierde con eso es justo lo que más importa en el río.** El
_service worker_ se instala igual dentro de la ventana, así que todo el trabajo
sin conexión sigue en pie: reportar sin señal, la cola de envío que sale sola al
volver la red, los expedientes guardados, los comunicados con su marca de copia.
Ver [arquitectura.md §9](arquitectura.md#9-sin-conexión) y la
[auditoría del modo sin conexión](auditoria-offline-2026-09-16.md).

Desde esta versión, **la cola sí puede enviarse con la app cerrada**: el
complemento nativo `EnviosPlugin` guarda una copia privada de cada envío y
`EnvioWorker` espera la red con WorkManager. El envío lleva el mismo
identificador idempotente que la cola web. Debe probarse en un teléfono real
apagando la red, cerrando la actividad, recuperando señal y comprobando recibo
y aviso del sistema. Android puede aplazar el trabajo por batería o restricciones
del fabricante y no lo ejecuta tras una detención forzada por el usuario.

**Prueba de aceptación en Android real antes de ampliar el piloto:**

1. Con una cuenta de correo y luego con Google, empezar un reporte, escribir y
   adjuntar una foto. Ir a otra sección, cerrar y reabrir: el borrador debe
   conservar texto, vereda, punto y foto, sin haberse enviado.
2. Dar permiso de avisos, activar modo avión, completar y **enviar** otro
   reporte. Debe aparecer en Mis envíos como en cola. Quitar la app de recientes
   (sin usar «Forzar detención»), recuperar datos móviles y esperar: la barra de
   Android debe pasar por «Enviando reporte» y «Reporte entregado» sin abrirla.
3. Abrir la app y comprobar que el mismo `requestId` produjo **un solo** caso y
   un recibo. Repetir dejando el teléfono sin red más de una hora para probar
   renovación del token. Repetir con dos reportes y señal intermitente.
4. Repetir con permiso de avisos denegado: el envío y el recibo deben funcionar
   aunque no haya notificación del sistema. Cerrar sesión con envíos pendientes,
   entrar con otra cuenta y comprobar que no recibe ni ve datos de la anterior.

La compilación de Gradle y las pruebas de navegador no sustituyen esta prueba:
la hora a la que Android ejecuta WorkManager depende del equipo y su política
de batería. «Forzar detención» desde Ajustes es una excepción del sistema y no
se debe presentar como una avería del envío.

Comprobado el 2 de octubre de 2026: `assembleDebug` y
`connectedDebugAndroidTest` pasaron en el emulador API 35 (`mpd35`). La prueba
instrumentada `EnviosStorageTest` escribió un reporte con foto en el directorio
privado, verificó que el texto y el prefijo Base64 no aparecieran en los bytes
del archivo y lo recuperó con el mismo `requestId`. Esto verifica el cifrado y
la lectura con Android Keystore; **no** demuestra todavía que el fabricante
despierte WorkManager con la app cerrada al volver la red. Ese escenario sigue
en la lista de aceptación del teléfono real.

La única página que viaja dentro del APK es
[`capacitor/www/index.html`](../capacitor/www/index.html), y se ve en un solo
caso: **el primer arranque sin señal de una instalación recién hecha**, cuando
la ventana todavía no ha alcanzado el servidor ni una vez y por tanto no hay
nada guardado. Dice qué pasa y que hace falta conectarse una vez.

---

## 2. La dirección no está escrita en el código

[`capacitor.config.ts`](../capacitor.config.ts) lee `MPD_APP_URL` y **se detiene
si falta**, o si no es HTTPS:

```bash
MPD_APP_URL=https://dominio-del-consejo npm run cap:sync
```

Un dominio inventado dentro de un archivo de configuración es la clase de cosa
que llega a producción sin que nadie la mire. Y Android bloquea el tráfico en
claro con razón: por ahí viajan sesiones y fotografías de la comunidad.

La dirección queda escrita en `android/app/src/main/assets/capacitor.config.json`,
que **no entra al repositorio** —lo ignora Capacitor— precisamente para que
nadie compile un APK apuntando a la dirección de otro.

---

## 3. El equipo que compila

**El APK ya se construye.** En el equipo de desarrollo, con estas piezas:

| Qué                                            | Dónde                                                       | Nota                    |
| ---------------------------------------------- | ----------------------------------------------------------- | ----------------------- |
| Android SDK, plataformas 33–36, build-tools 35 | `D:\Android\Sdk`                                            | Ya estaba               |
| Android Studio                                 | `D:ndroidstudio`                                            | Ya estaba               |
| Gradle 8.14.3                                  | `D:\Gradle`                                                 | Lo baja el envoltorio   |
| **JDK 21** (Temurin)                           | `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot` | **Hubo que instalarlo** |

El JDK 21 no es opcional y el error no lo dice claro. Android Studio trae el
suyo, el 17, y con él la compilación muere en
`error: invalid source release: 21`, sin nombrar a Java por ninguna parte:
Capacitor 8 compila contra 21.

Las tres variables quedaron puestas como variables de usuario
—`JAVA_HOME`, `ANDROID_HOME`, `GRADLE_USER_HOME`— y la ruta del SDK, en
`android/local.properties`, que no entra al repositorio porque es de este
equipo.

```bash
MPD_APP_URL=https://dominio-del-consejo npm run cap:sync
npm run cap:apk       # o npm run cap:open para Android Studio
```

El resultado queda en `android/app/build/outputs/apk/`.

### Probar en un teléfono contra el equipo de desarrollo

`MPD_APP_URL` exige HTTPS, así que **no se puede apuntar al `http://192.168…`
del portátil**. Es deliberado: por ahí viajan sesiones y fotografías. Para
probar antes de tener dominio, levanta un túnel HTTPS hacia el servidor local y
usa esa dirección; para la aplicación es un dominio como cualquier otro.

---

## 4. Decisiones que hay que confirmar antes de publicar

1. **El identificador de la aplicación.** Hoy es
   `co.riosatinga.mipueblodigital`. **No se puede cambiar después de publicar en
   Google Play**: queda unido a la aplicación para siempre. Confírmalo con el
   Consejo.
2. **El dominio definitivo**, con certificado válido y añadido a los dominios
   autorizados de Firebase Authentication. Sin eso, entrar con Google falla
   dentro de la ventana aunque funcione en el navegador.
3. **La llave de firma.** Acredita que un APK lo publicó el Consejo. El
   repositorio la rechaza a propósito (`*.jks`, `*.keystore` ignorados): quien
   clone el proyecto no debe poder firmar una aplicación que se instale encima
   de la verdadera. Guárdala donde el Consejo pueda recuperarla dentro de cinco
   años; perderla obliga a publicar la aplicación de nuevo, con otro nombre.
4. **Quién responde de la cuenta de Google Play**, que es una responsabilidad
   continuada y no una tarea.

---

## 4 bis. Los avisos al teléfono

`scripts/iconos-android.mjs` genera, además de los iconos del cajón y las
pantallas de arranque, **la silueta del aviso** en cinco densidades
(`ic_stat_notify`, 24 a 96 px).

Sale de `public/brand/notify-mark.svg` y no del emblema, y eso tiene su razón:
de un icono de notificación Android solo usa la transparencia, y el emblema es
una escena entera dentro de un recorte redondeado —su canal alfa es un
rectángulo lleno, 87 % de píxeles opacos—. Sacar la silueta de ahí daba
exactamente el cuadrado blanco que hace que una aplicación parezca rota en la
barra de arriba. El palafito de `notify-mark.svg` es esa misma imagen reducida
a lo que sobrevive a 24 dp.

**Si cambia el emblema hay que volver a ejecutar el guion**, y si cambia la
marca, dibujar también esta silueta: no se deriva de la otra.

El manifiesto declara tres cosas para FCM: la silueta, el color con que se tiñe
(`@color/mpd_aviso`, en `values/avisos.xml`) y el identificador del canal. El
canal en sí lo crea `src/platform/push.ts` al apuntar el aparato, que es donde
puede llevar nombre y descripción en español; si el identificador de los dos
sitios dejara de coincidir, los avisos caerían en un canal que el sistema
rotula «Miscellaneous» y nada fallaría a la vista.

El permiso `POST_NOTIFICATIONS` lo añade el propio complemento.

---

## 5. Lo que hay que probar en un teléfono de verdad

Ninguna de estas cosas la puede acreditar una prueba de escritorio. Están aquí
para que no se declaren hechas por haber compilado:

- Que la sesión sobreviva a cerrar y reabrir la aplicación, y a que el sistema
  la suspenda en segundo plano.
- Cámara y dictado, con los permisos del sistema.
- Cambio de red —datos a wifi, y a nada— y regreso: que la cola salga sola.
- Una cola real: varios envíos, cerrar la aplicación, reabrir, cuota agotada y
  cambio de cuenta.
- Fotografías de 10 MB contra el límite de cuerpo HTTP del alojamiento elegido.
- El botón físico de atrás, que en una ventana web no siempre hace lo que se
  espera.
- Recuperación de contraseña en el dominio definitivo.
- **Los avisos**: que salga la pregunta del permiso al enviar el primer
  reporte, que la notificación aparezca con la aplicación cerrada y con la
  silueta del palafito —no un cuadrado blanco—, que tocarla abra el expediente
  y no la portada, y que el interruptor de Mi cuenta la apague de verdad.

---

## 6. Estado al 2 de octubre de 2026

La distribución actual es un APK de depuración firmado con la misma clave que la versión 2.1, para preservar las actualizaciones de los teléfonos existentes. La versión 2.2 tiene `versionCode 14`, paquete `co.riosatinga.mipueblodigital`, Android mínimo API 24 y servidor `https://mipueblodigital.vercel.app`. Se verifica el certificado con `apksigner` y la versión interna con `aapt` antes de copiarla a `public/descargas/`.

Esta distribución no acredita una firma de lanzamiento para Play Store. Acordar la custodia de una clave de publicación con el Consejo y planificar la transición: una APK firmada con una clave distinta no reemplaza automáticamente las instaladas. No cambiar la firma sin un plan de conservación de borradores y envíos locales.

Las cuatro pruebas instrumentadas de API 35 comprobaron: identidad del paquete; foto y relato cifrados y recuperación del mismo identificador; IV nuevo por escritura y rechazo de archivo alterado; bloqueo de envío con cuenta ajena y estado que requiere atención. La prueba de reconexión y notificaciones con una sesión real y actividad cerrada sigue siendo una aceptación de campo pendiente.

El proceso de actualización, los comandos reproducibles y la evidencia de esta entrega están en [auditoría de la versión 2.2](auditoria-entrega-2026-10-02.md).
