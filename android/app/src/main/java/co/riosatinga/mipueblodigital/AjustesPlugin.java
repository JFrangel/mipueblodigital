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
