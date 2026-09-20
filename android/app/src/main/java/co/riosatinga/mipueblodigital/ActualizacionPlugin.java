package co.riosatinga.mipueblodigital;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.SystemClock;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

/**
 * Descargar la versión nueva e instalarla, sin salir de la aplicación.
 *
 * **Por qué no basta con abrir el navegador.** La ventana de Capacitor no sabe
 * descargar archivos —no le pone un `DownloadListener` al WebView—, así que un
 * enlace a un `.apk` desde dentro no hace nada. La salida anterior era mandar a
 * la persona al navegador del teléfono: allí la descarga sí ocurre, pero luego
 * hay que encontrar el archivo en la bandeja de descargas, tocarlo, entender un
 * diálogo de permisos y volver. Son cuatro pasos fuera de la aplicación, y cada
 * uno es un sitio donde alguien se queda.
 *
 * Aquí lo hace el sistema de principio a fin: **el gestor de descargas de
 * Android** se ocupa del archivo —con su aviso, su barra y sus reintentos, que
 * es lo que hace falta con la señal del río—, y al terminar se abre el
 * instalador. La persona solo dice «Instalar».
 *
 * **Se descarga a la carpeta privada de la aplicación**, no a la de descargas
 * del teléfono. Así no hace falta ningún permiso de almacenamiento, no aparece
 * suelto en la bandeja de descargas de nadie, y el instalador lo lee por el
 * `FileProvider` que Capacitor ya declara.
 *
 * **Lo que no hace es borrarse solo al terminar**, y decía que sí. Comprobado
 * en el emulador después de una actualización de verdad: instalada la versión
 * nueva, el archivo seguía ahí ocupando sus casi ocho megas. No se puede borrar
 * al abrir el instalador —el instalador lo está leyendo en ese momento, por el
 * `FileProvider`, y quitárselo de debajo rompe la instalación—, así que lo
 * recoge `limpiarDescarga` en el arranque siguiente, cuando ya consta que no
 * hay ninguna actualización esperando.
 */
@CapacitorPlugin(name = "Actualizacion")
public class ActualizacionPlugin extends Plugin {

    /** Siempre el mismo nombre: cada descarga pisa la anterior. */
    private static final String ARCHIVO = "mi-pueblo-digital.apk";
    private static final String TIPO = "application/vnd.android.package-archive";
    /** Cada cuánto se mira el avance. Ver `vigilar`. */
    private static final long LATIDO_MS = 400;
    /**
     * Cuánto se aguanta sin que entre un solo byte antes de rendirse.
     *
     * **No es un plazo para la descarga entera**: con la señal del río, siete
     * megas pueden tardar lo que tengan que tardar y cortar eso sería el peor
     * error posible. Es un plazo para el silencio. El gestor de Android
     * reintenta solo cuando se le cae la conexión —así fue como salió esto, en
     * una prueba donde la descarga se quedó en el 95 % esperando red—, pero si
     * la señal no vuelve, reintenta indefinidamente y quien mira la pantalla se
     * queda con un «Descargando…» que no termina nunca.
     */
    private static final long SIN_AVANCE_MS = 180_000;

    /**
     * Cuánto se espera a que el gestor confirme una descarga que ya está entera.
     *
     * **Existe porque «entero» y «terminado» no son lo mismo para Android**, y
     * esa diferencia dejaba la actualización clavada en el 99 %. Medido: el
     * archivo en disco pesaba los 7.351.737 bytes exactos —completo, verificado
     * contra el tamaño publicado— y el gestor seguía en `WAITING_TO_RETRY`,
     * reintentando la última lectura que se le había cortado. Nunca llegaba a
     * `STATUS_SUCCESSFUL`, así que el instalador no se abría nunca.
     *
     * Y el plazo de silencio de arriba tampoco salvaba: cada reintento mueve el
     * contador de bytes aunque sea un poco, así que para `SIN_AVANCE_MS` la
     * descarga «avanzaba» eternamente. Hacía falta mirar otra cosa: que los
     * bytes ya estén todos.
     *
     * Pasado esto se instala lo que hay. **No se puede cancelar antes**:
     * `DownloadManager.remove` borra el archivo, que es justo lo que no se
     * quiere. Y si el archivo estuviera mal, el instalador de Android lo
     * rechaza él mismo con su propio aviso —la firma no cuadraría—, que es
     * infinitamente mejor que una barra parada para siempre.
     */
    private static final long ENTERO_SIN_CONFIRMAR_MS = 15_000;

    /**
     * ¿Puede esta aplicación lanzar una instalación?
     *
     * Android lo pregunta **por aplicación** desde la versión 8: no basta con
     * que el teléfono permita orígenes desconocidos, hay que permitírselo a
     * esta en concreto. Se consulta antes de descargar y no después, porque
     * bajar siete megas para chocarse luego con un «no» es gastarle a alguien
     * el plan de datos para nada.
     */
    @PluginMethod
    public void puedeInstalar(PluginCall call) {
        JSObject respuesta = new JSObject();
        respuesta.put("puede", tieneElPermiso());
        call.resolve(respuesta);
    }

    private boolean tieneElPermiso() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            /* Antes de Android 8 esto era un interruptor único del teléfono y
               no había forma de preguntarlo desde aquí. Se sigue adelante: si
               está apagado, el instalador lo dirá él mismo. */
            return true;
        }
        return getContext().getPackageManager().canRequestPackageInstalls();
    }

    /**
     * Abrir la pantalla donde se concede ese permiso.
     *
     * Va directa a la de esta aplicación, no a la lista general: recitar
     * «Ajustes › Aplicaciones › Acceso especial › Instalar aplicaciones
     * desconocidas» es mandar a alguien a buscar por su cuenta algo que se abre
     * de un toque.
     */
    @PluginMethod
    public void pedirPermisoInstalar(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.resolve();
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("no se pudo abrir", "sin-pantalla");
        }
    }

    /**
     * Bajar el archivo y, al terminar, abrir el instalador.
     *
     * El avance se manda a la ventana web como evento `progreso` mientras tanto,
     * para que la tarjeta de aviso pueda enseñar una barra: el aviso del sistema
     * queda arriba y tapado, y alguien que no ve moverse nada en la pantalla que
     * está mirando piensa que se colgó y vuelve a pulsar.
     */
    @PluginMethod
    public void descargarEInstalar(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) {
            /* Solo HTTPS: esto instala lo que le manden desde la ventana web, y
               un archivo en claro por aquí es un archivo que cualquiera en el
               camino puede cambiar antes de que llegue al teléfono. */
            call.reject("la dirección tiene que ser https", "direccion");
            return;
        }
        if (!tieneElPermiso()) {
            call.reject("falta el permiso para instalar", "sin-permiso");
            return;
        }

        File destino = new File(
            getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS),
            ARCHIVO
        );
        if (destino.exists() && !destino.delete()) {
            call.reject("no se pudo dejar sitio para el archivo", "sin-sitio");
            return;
        }

        DownloadManager gestor = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        if (gestor == null) {
            call.reject("este teléfono no tiene gestor de descargas", "sin-gestor");
            return;
        }

        try {
            DownloadManager.Request peticion = new DownloadManager.Request(Uri.parse(url))
                .setTitle(getContext().getString(R.string.app_name))
                .setDescription("Descargando la versión nueva")
                .setMimeType(TIPO)
                .setDestinationUri(Uri.fromFile(destino))
                /* Dicho en voz alta aunque sea el valor de fábrica: aquí no hay
                   wifi. Si algún día alguien o algún fabricante cambia el
                   criterio por defecto, la actualización se quedaría en cola
                   «esperando wifi» para siempre en el único sitio donde no va a
                   haber wifi nunca, y desde la pantalla parecería colgada. */
                .setAllowedOverMetered(true)
                .setAllowedOverRoaming(true)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
            long id = gestor.enqueue(peticion);
            new Thread(() -> vigilar(call, gestor, id, destino)).start();
        } catch (Exception error) {
            call.reject("no se pudo empezar la descarga", "sin-empezar");
        }
    }

    /**
     * Tirar el archivo que ya no hace falta.
     *
     * **Se llama cuando consta que no hay actualización esperando**, y ese
     * «consta» es estrecho a propósito: el servidor contestó y dijo que la
     * versión instalada ya es la suya. No vale «no se pudo comprobar» —sin red,
     * con el JSON ilegible—, porque entonces podría haber una instalación a
     * medio empezar, con el diálogo de Android abierto encima leyendo justo
     * este archivo, y borrarlo ahí la rompe.
     *
     * Casi ocho megas en un teléfono donde caben pocos. No es un detalle.
     */
    @PluginMethod
    public void limpiarDescarga(PluginCall call) {
        File archivo = new File(
            getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS),
            ARCHIVO
        );
        JSObject respuesta = new JSObject();
        respuesta.put("borrado", archivo.exists() && archivo.delete());
        call.resolve(respuesta);
    }

    /**
     * Volver a abrir el instalador con el archivo que ya está bajado.
     *
     * **Para no cobrarle a nadie dos veces los mismos siete megas.** Si la
     * descarga terminó y lo que falló fue abrir el instalador, el APK está
     * entero en la carpeta de la aplicación: lo que hace falta es volver a
     * intentar lo último, no repetirlo todo. Con la señal del río esa
     * diferencia son varios minutos y un pedazo del plan de datos.
     *
     * Se rechaza si no hay archivo, para que arriba se pueda ofrecer descargar
     * en vez de prometer algo que no está.
     */
    @PluginMethod
    public void abrirInstalador(PluginCall call) {
        File archivo = new File(
            getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS),
            ARCHIVO
        );
        if (!archivo.exists() || archivo.length() == 0) {
            call.reject("no hay ningún archivo descargado", "sin-archivo");
            return;
        }
        instalar(call, archivo);
    }

    /**
     * Mirar el avance hasta que acabe.
     *
     * Se pregunta cada poco en vez de esperar el aviso de fin del sistema. Un
     * receptor de `ACTION_DOWNLOAD_COMPLETE` daría el final pero no el avance,
     * y desde Android 14 hay que declararle si acepta emisiones de fuera, que
     * es un detalle fácil de equivocar y que rompe la actualización justo en
     * los teléfonos más nuevos. Preguntar no falla en ninguna versión.
     */
    private void vigilar(PluginCall call, DownloadManager gestor, long id, File destino) {
        DownloadManager.Query consulta = new DownloadManager.Query().setFilterById(id);
        long ultimosBytes = -1;
        long ultimoAvance = SystemClock.elapsedRealtime();
        /** Desde cuándo están todos los bytes sin que el gestor lo confirme. */
        long enteroDesde = 0;
        while (true) {
            try (Cursor fila = gestor.query(consulta)) {
                if (fila == null || !fila.moveToFirst()) {
                    call.reject("la descarga desapareció", "perdida");
                    return;
                }
                int estado = fila.getInt(fila.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                long hechos = fila.getLong(
                    fila.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)
                );
                long total = fila.getLong(
                    fila.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)
                );

                if (estado == DownloadManager.STATUS_SUCCESSFUL) {
                    avisar(100, hechos, total, false);
                    instalar(call, destino);
                    return;
                }
                if (estado == DownloadManager.STATUS_FAILED) {
                    /**
                     * Se dice **por qué**, y no solo que no pudo.
                     *
                     * Antes todos los finales malos eran el mismo «la descarga
                     * no pudo terminar», así que desde un teléfono del río —que
                     * es donde falla— no había manera de saber si fue el
                     * servidor, el espacio, o la señal. Un fallo que no se
                     * puede distinguir no se puede arreglar: hay que adivinar,
                     * y adivinar sobre la red de otra persona no sale bien.
                     *
                     * El motivo del gestor es un número, y cuando viene de una
                     * respuesta del servidor **ese número es el código HTTP**
                     * —un 403 aquí es la protección automática de la plataforma
                     * negándole el archivo a la aplicación, que es real y ya
                     * pasó—. Se manda tal cual: quien lea esto en pantalla
                     * puede repetirlo por WhatsApp sin entenderlo, y eso basta.
                     */
                    int motivo = fila.getInt(fila.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));
                    gestor.remove(id);
                    call.reject("la descarga no pudo terminar (" + motivo + ")", "fallo");
                    return;
                }

                long ahora = SystemClock.elapsedRealtime();

                /* Los bytes ya están todos y el gestor no lo confirma. Se le da
                   un rato por si lo dice él, y si no, se instala lo que hay:
                   ver `ENTERO_SIN_CONFIRMAR_MS`. */
                if (total > 0 && hechos >= total) {
                    if (enteroDesde == 0) enteroDesde = ahora;
                    else if (ahora - enteroDesde > ENTERO_SIN_CONFIRMAR_MS) {
                        avisar(100, hechos, total, false);
                        instalar(call, destino);
                        return;
                    }
                } else {
                    enteroDesde = 0;
                }

                if (hechos > ultimosBytes) {
                    ultimosBytes = hechos;
                    ultimoAvance = ahora;
                } else if (ahora - ultimoAvance > SIN_AVANCE_MS) {
                    gestor.remove(id);
                    call.reject("la descarga se quedó sin señal", "sin-avance");
                    return;
                }

                /* `total` llega en −1 mientras el servidor no diga el tamaño.
                   Y `esperando` distingue «va lento» de «no entra nada»: sin
                   eso, una barra parada miente sobre lo que está pasando. */
                avisar(
                    total > 0 ? (int) ((hechos * 100) / total) : -1,
                    hechos,
                    total,
                    estado == DownloadManager.STATUS_PAUSED
                );
            } catch (Exception error) {
                call.reject("se perdió el rastro de la descarga", "fallo");
                return;
            }
            try {
                Thread.sleep(LATIDO_MS);
            } catch (InterruptedException corte) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    private void avisar(int porcentaje, long hechos, long total, boolean esperando) {
        JSObject dato = new JSObject();
        dato.put("porcentaje", porcentaje);
        dato.put("hechos", hechos);
        dato.put("total", total);
        dato.put("esperando", esperando);
        notifyListeners("progreso", dato);
    }

    /**
     * Abrir el instalador de Android con el archivo ya bajado.
     *
     * El permiso de lectura se **concede al vuelo** con la bandera: el archivo
     * vive en la carpeta privada de la aplicación y el instalador es otra
     * aplicación, así que sin eso vería una ruta que no puede abrir.
     */
    private void instalar(PluginCall call, File archivo) {
        try {
            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                archivo
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, TIPO);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            /**
             * El archivo **ya está bajado** y solo falló abrirlo.
             *
             * Es la avería que peor se contaba: desde fuera se veía «no se pudo
             * actualizar» y se mandaba a la persona al navegador a bajar otra
             * vez los mismos siete megas que ya tenía en el teléfono. Se
             * distingue con su propio código para que arriba se pueda ofrecer
             * lo único sensato, que es volver a abrir lo que ya está.
             */
            call.reject(
                "se descargó pero no se pudo abrir el instalador: " + error,
                "sin-instalador"
            );
        }
    }
}
