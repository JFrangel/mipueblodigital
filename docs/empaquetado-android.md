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

## 6. Estado

|                                                      |                           |
| ---------------------------------------------------- | ------------------------- |
| Capacitor 8.5.2 instalado                            | hecho                     |
| `capacitor.config.ts`, con la dirección por variable | hecho                     |
| Proyecto Android generado (`android/`, 65 archivos)  | hecho                     |
| Página de respaldo del primer arranque               | hecho                     |
| Órdenes `cap:sync`, `cap:open`, `cap:apk`            | hecho                     |
| Llave de firma fuera del repositorio                 | hecho                     |
| JDK 21, SDK y variables del equipo                   | hecho                     |
| **APK de depuración compilado** (7,83 MB)            | **hecho**                 |
| Avisos al teléfono: silueta, color y canal           | hecho                     |
| **Probar en un teléfono**                            | **pendiente**             |
| **APK de publicación, firmado**                      | **pendiente de la llave** |
| **Dominio, identificador y firma confirmados**       | **pendiente del Consejo** |

El APK que hay compilado apunta a `https://ejemplo.invalid`: sirve para
acreditar que la cadena de compilación funciona, **no para instalarlo**. El
primero que valga saldrá con el dominio de verdad.
