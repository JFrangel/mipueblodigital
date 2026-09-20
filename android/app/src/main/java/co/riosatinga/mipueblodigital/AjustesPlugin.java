package co.riosatinga.mipueblodigital;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Abre la pantalla de permisos de esta aplicación en los ajustes del teléfono.
 *
 * Existe por un caso concreto: en Android, un permiso al que se le dijo que no
 * ya no se puede volver a pedir desde la aplicación —el sistema deja de mostrar
 * el diálogo—, y la única salida son los ajustes. Hasta ahora la aplicación
 * recitaba el camino: «Ajustes del teléfono › Aplicaciones › Mi Pueblo Digital
 * › Permisos». En un teléfono eso es mandar a alguien a buscar por su cuenta
 * algo que se abre de un toque, y en el río esa diferencia es la que separa
 * arreglarlo de rendirse.
 *
 * Es un complemento local y no una dependencia nueva: son veinte líneas, no
 * añade nada al peso del APK más que ellas, y no hereda el problema de
 * compatibilidad de un paquete de terceros con cada versión de Capacitor.
 */
@CapacitorPlugin(name = "Ajustes")
public class AjustesPlugin extends Plugin {

    /**
     * Abre una dirección en el navegador del teléfono.
     *
     * Existe por el APK nuevo: la ventana de Capacitor **no sabe descargar
     * archivos**. No le pone un DownloadListener al WebView, así que un enlace
     * a un .apk desde dentro de la aplicación no hace absolutamente nada —ni
     * descarga, ni error, ni aviso—. El botón de actualizar parecería roto.
     *
     * Sacándolo al navegador del sistema, la descarga la hace quien sabe
     * hacerla, con su barra de progreso y su aviso al terminar, y el archivo
     * queda donde la persona ya sabe buscarlo.
     */
    @PluginMethod
    public void abrirEnlace(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) {
            /* Solo HTTPS: esto abre lo que le manden desde la ventana web, y
               una dirección en claro por aquí sería un archivo que cualquiera
               en el camino puede cambiar antes de que llegue al teléfono. */
            call.reject("la dirección tiene que ser https");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("no se pudo abrir");
        }
    }

    @PluginMethod
    public void abrirPermisos(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
            /* La actividad de ajustes no es nuestra, así que arranca en su
               propia tarea: sin esto, volver atrás desde ajustes traería la
               pantalla de ajustes dentro de la pila de la aplicación. */
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            /* Un teléfono puede no tener esa pantalla —los hay recortados—, y
               entonces quien llama vuelve a decir el camino de palabra. */
            call.reject("no se pudo abrir");
        }
    }
}
