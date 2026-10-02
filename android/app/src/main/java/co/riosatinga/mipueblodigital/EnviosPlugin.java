package co.riosatinga.mipueblodigital;

import android.net.Uri;
import android.app.NotificationManager;

import androidx.annotation.NonNull;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.KeyStore;
import java.util.Arrays;
import java.util.concurrent.TimeUnit;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

/**
 * Espejo nativo de la bandeja web. WorkManager no puede leer IndexedDB: recibe
 * el mismo payload y requestId, y el servidor hace idempotente el segundo envío
 * si la ventana web y Android alcanzan la red a la vez.
 *
 * El archivo queda en noBackupFilesDir (privado y excluido de copia de Android).
 * No se guardan tokens: el trabajador renueva el de Firebase Auth nativo al
 * despertar. Si la sesión nativa no coincide, se conserva el reporte sin
 * transmitirlo a nombre de otra persona.
 */
@CapacitorPlugin(name = "Envios")
public class EnviosPlugin extends Plugin {
    private static final String KEY_ALIAS = "mpd-envios-v1";
    private static final int IV_BYTES = 12;

    private static synchronized SecretKey secret() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        java.security.Key existing = store.getKey(KEY_ALIAS, null);
        if (existing instanceof SecretKey) return (SecretKey) existing;
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setKeySize(256)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .build());
        return generator.generateKey();
    }

    private static byte[] encrypt(byte[] plain) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        // Keystore crea un IV nuevo al inicializar: Android no permite que la
        // aplicación se lo imponga a una clave con aleatoriedad obligatoria.
        cipher.init(Cipher.ENCRYPT_MODE, secret());
        byte[] iv = cipher.getIV();
        if (iv.length != IV_BYTES) throw new IllegalStateException("IV inesperado.");
        byte[] encrypted = cipher.doFinal(plain);
        byte[] packed = Arrays.copyOf(iv, iv.length + encrypted.length);
        System.arraycopy(encrypted, 0, packed, iv.length, encrypted.length);
        return packed;
    }

    // Compatible con API 24. readAllBytes de java.nio.file necesita API 26.
    static byte[] readBytes(InputStream in, int maximum) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int count;
        while ((count = in.read(buffer)) != -1) {
            if (out.size() + count > maximum) throw new IllegalStateException("Archivo demasiado grande.");
            out.write(buffer, 0, count);
        }
        return out.toByteArray();
    }

    private static JSONObject readFile(File file) throws Exception {
        byte[] packed;
        try (FileInputStream in = new FileInputStream(file)) {
            packed = readBytes(in, 64 * 1024 * 1024);
        }
        if (packed.length <= IV_BYTES + 16) throw new IllegalStateException("Envío incompleto.");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, secret(),
            new GCMParameterSpec(128, Arrays.copyOf(packed, IV_BYTES)));
        byte[] plain = cipher.doFinal(packed, IV_BYTES, packed.length - IV_BYTES);
        return new JSONObject(new String(plain, StandardCharsets.UTF_8));
    }
    static File folder(android.content.Context context) {
        File directory = new File(context.getNoBackupFilesDir(), "envios");
        if (!directory.exists() && !directory.mkdirs())
            throw new IllegalStateException("No se pudo crear la bandeja privada.");
        return directory;
    }

    static String fileName(String requestId) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(requestId.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : digest) hex.append(String.format("%02x", b & 0xff));
            return hex + ".bin";
        } catch (Exception error) {
            throw new IllegalStateException(error);
        }
    }

    static File file(android.content.Context context, String requestId) {
        return new File(folder(context), fileName(requestId));
    }

    static synchronized void save(android.content.Context context, JSONObject item) throws Exception {
        File target = file(context, item.getString("requestId"));
        File temp = new File(target.getPath() + ".tmp");
        try (FileOutputStream out = new FileOutputStream(temp)) {
            out.write(encrypt(item.toString().getBytes(StandardCharsets.UTF_8)));
            out.getFD().sync();
        }
        if (!temp.renameTo(target)) {
            if (target.exists() && !target.delete()) throw new IllegalStateException("No se pudo reemplazar el envío.");
            if (!temp.renameTo(target)) throw new IllegalStateException("No se pudo guardar el envío.");
        }
    }

    static synchronized JSONObject load(android.content.Context context, String requestId) throws Exception {
        File target = file(context, requestId);
        if (!target.isFile()) return null;
        return readFile(target);
    }

    static synchronized boolean saveIfStillOwned(android.content.Context context, JSONObject item) throws Exception {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null || !user.getUid().equals(item.optString("owner")) ||
            load(context, item.getString("requestId")) == null) return false;
        save(context, item);
        return true;
    }

    static void schedule(android.content.Context context, String requestId) {
        Constraints connected = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED).build();
        OneTimeWorkRequest work = new OneTimeWorkRequest.Builder(EnvioWorker.class)
            .setInputData(new androidx.work.Data.Builder().putString("requestId", requestId).build())
            .setConstraints(connected)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
            .build();
        WorkManager.getInstance(context).enqueueUniqueWork("envio:" + requestId,
            ExistingWorkPolicy.KEEP, work);
    }

    @PluginMethod
    public void ready(PluginCall call) {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        JSObject response = new JSObject();
        response.put("ready", user != null && user.getUid().equals(call.getString("owner")));
        call.resolve(response);
    }

    @PluginMethod
    public void contains(PluginCall call) {
        String owner = call.getString("owner");
        String requestId = call.getString("requestId");
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (owner == null || requestId == null || user == null ||
            !owner.equals(user.getUid())) { call.reject("La sesión nativa no coincide."); return; }
        try {
            JSONObject item = load(getContext(), requestId);
            JSObject response = new JSObject();
            response.put("present", item != null && owner.equals(item.optString("owner")));
            call.resolve(response);
        } catch (Exception error) {
            call.reject("No se pudo comprobar el envío.", error);
        }
    }

    @PluginMethod
    public void stage(PluginCall call) {
        String owner = call.getString("owner");
        String requestId = call.getString("requestId");
        String key = call.getString("key");
        JSObject payload = call.getObject("payload");
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null || !user.getUid().equals(owner)) {
            call.reject("La sesión nativa no coincide con el reporte.");
            return;
        }
        if (owner == null || key == null || requestId == null ||
            !requestId.matches("[0-9a-fA-F-]{36}") || payload == null) {
            call.reject("Faltan datos de la bandeja.");
            return;
        }
        // Servidor fijado en capacitor.config; no el destino de una navegación
        // externa ni getUrl() de WebView desde el hilo del complemento.
        String server = getBridge().getServerUrl();
        Uri page = server == null ? Uri.EMPTY : Uri.parse(server);
        if (!"https".equals(page.getScheme()) || page.getHost() == null) {
            call.reject("La aplicación debe estar servida por HTTPS.");
            return;
        }
        try {
            synchronized (EnviosPlugin.class) {
                JSONObject existing = load(getContext(), requestId);
                if (existing != null && !owner.equals(existing.optString("owner")))
                    throw new IllegalStateException("El envío pertenece a otra cuenta.");
                if (existing == null) {
                    JSONObject item = new JSONObject();
                    item.put("owner", owner);
                    item.put("key", key);
                    item.put("requestId", requestId);
                    item.put("endpoint", "https://" + page.getAuthority() + "/api/incidents/");
                    item.put("payload", new JSONObject(payload.toString()));
                    item.put("state", "queued");
                    save(getContext(), item);
                }
            }
            schedule(getContext(), requestId);
            call.resolve();
        } catch (Exception error) {
            call.reject("No se pudo proteger el envío en Android.", error);
        }
    }

    @PluginMethod
    public void receipts(PluginCall call) {
        JSArray result = new JSArray();
        try {
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            String owner = call.getString("owner");
            if (user == null || !user.getUid().equals(owner)) {
                call.reject("La sesión nativa no coincide.");
                return;
            }
            for (File entry : folder(getContext()).listFiles()) {
                if (!entry.getName().endsWith(".bin")) continue;
                JSONObject item;
                try { item = readFile(entry); }
                catch (Exception damaged) { continue; } // No bloquea recibos íntegros.
                if (!owner.equals(item.optString("owner"))) continue;
                if ("confirmed".equals(item.optString("state")) || "attention".equals(item.optString("state"))) {
                    JSONObject status = new JSONObject();
                    status.put("key", item.optString("key"));
                    status.put("requestId", item.optString("requestId"));
                    status.put("state", item.optString("state"));
                    if (item.has("receipt")) status.put("receipt", item.getJSONObject("receipt"));
                    result.put(status);
                }
            }
            JSObject response = new JSObject();
            response.put("items", result);
            call.resolve(response);
        } catch (Exception error) {
            call.reject("No se pudo leer la bandeja de Android.", error);
        }
    }

    @PluginMethod
    public void acknowledge(PluginCall call) {
        String requestId = call.getString("requestId");
        String owner = call.getString("owner");
        if (requestId == null || owner == null) { call.reject("Faltan datos."); return; }
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null || !owner.equals(user.getUid())) {
            call.reject("La sesión nativa no coincide."); return;
        }
        try {
            JSONObject item = load(getContext(), requestId);
            if (item != null && owner.equals(item.optString("owner"))) {
                WorkManager.getInstance(getContext()).cancelUniqueWork("envio:" + requestId);
                NotificationManager notifications = (NotificationManager)
                    getContext().getSystemService(android.content.Context.NOTIFICATION_SERVICE);
                if (notifications != null) notifications.cancel(requestId.hashCode());
                if (!file(getContext(), requestId).delete())
                    throw new IllegalStateException("No se pudo limpiar el envío.");
            }
            call.resolve();
        } catch (Exception error) {
            call.reject("No se pudo limpiar el envío.", error);
        }
    }

    @PluginMethod
    public void clearOwner(PluginCall call) {
        String owner = call.getString("owner");
        if (owner == null) { call.reject("Falta la cuenta."); return; }
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null || !owner.equals(user.getUid())) {
            call.reject("La sesión nativa no coincide."); return;
        }
        try {
            synchronized (EnviosPlugin.class) {
                for (File entry : folder(getContext()).listFiles()) {
                    if (!entry.getName().endsWith(".bin")) continue;
                    JSONObject item = readFile(entry);
                    if (owner.equals(item.optString("owner"))) {
                        WorkManager.getInstance(getContext()).cancelUniqueWork("envio:" + item.optString("requestId"));
                        NotificationManager notifications = (NotificationManager)
                            getContext().getSystemService(android.content.Context.NOTIFICATION_SERVICE);
                        if (notifications != null)
                            notifications.cancel(item.optString("requestId").hashCode());
                        if (!entry.delete()) throw new IllegalStateException("No se pudo borrar el envío.");
                    }
                }
            }
            call.resolve();
        } catch (Exception error) {
            call.reject("No se pudo limpiar la bandeja nativa.", error);
        }
    }
}
