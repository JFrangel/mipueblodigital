package co.riosatinga.mipueblodigital;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.google.android.gms.tasks.Tasks;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import org.json.JSONObject;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.Semaphore;

/** Envío persistente: despierta con red aunque la actividad/WebView esté cerrada. */
public class EnvioWorker extends Worker {
    private static final String CHANNEL = "mpd-envios";
    // Una foto Base64 puede ser grande. Evita descifrar/transmitir varias a la
    // vez cuando la conexión despierta todos los trabajos de la cola.
    private static final Semaphore UPLOAD = new Semaphore(1, true);

    public EnvioWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    private void notification(String requestId, String title, String body, boolean progress) {
        Context context = getApplicationContext();
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= 26)
            manager.createNotificationChannel(new NotificationChannel(CHANNEL,
                "Envíos de reportes", NotificationManager.IMPORTANCE_LOW));
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setContentTitle(title)
            .setContentText(body)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setOnlyAlertOnce(true)
            .setOngoing(progress)
            .setAutoCancel(!progress)
            .setContentIntent(PendingIntent.getActivity(context, requestId.hashCode(),
                new Intent(context, MainActivity.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        if (progress) builder.setProgress(0, 0, true);
        manager.notify(requestId.hashCode(), builder.build());
    }

    @NonNull @Override
    public Result doWork() {
        if (!UPLOAD.tryAcquire()) return Result.retry();
        try { return upload(); } finally { UPLOAD.release(); }
    }

    private Result upload() {
        String requestId = getInputData().getString("requestId");
        if (requestId == null) return Result.failure();
        try {
            JSONObject item = EnviosPlugin.load(getApplicationContext(), requestId);
            if (item == null || "confirmed".equals(item.optString("state"))) return Result.success();
            if ("attention".equals(item.optString("state"))) return Result.failure();
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user == null || !user.getUid().equals(item.optString("owner")))
                // Una cuenta distinta jamás debe firmar este reporte. Se queda
                // local para que el titular pueda recuperarlo al volver a entrar.
                return Result.failure();
            String token = Tasks.await(user.getIdToken(true), 30, TimeUnit.SECONDS).getToken();
            if (token == null) return Result.retry();
            notification(requestId, "Enviando reporte", "Conectando con el Consejo…", true);
            JSONObject body = item.getJSONObject("payload");
            body.put("requestId", requestId);
            byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
            HttpURLConnection connection = (HttpURLConnection) new URL(item.getString("endpoint")).openConnection();
            try {
                connection.setRequestMethod("POST");
                connection.setInstanceFollowRedirects(false);
                connection.setRequestProperty("Authorization", "Bearer " + token);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setConnectTimeout(20000);
                connection.setReadTimeout(60000);
                connection.setDoOutput(true);
                connection.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream out = connection.getOutputStream()) {
                    out.write(bytes);
                }
                int code = connection.getResponseCode();
                FirebaseUser stillOwner = FirebaseAuth.getInstance().getCurrentUser();
                if (isStopped() || stillOwner == null ||
                    !stillOwner.getUid().equals(item.optString("owner")) ||
                    EnviosPlugin.load(getApplicationContext(), requestId) == null)
                    return Result.success();
                if (code >= 200 && code < 300) {
                    try (InputStream in = connection.getInputStream()) {
                        JSONObject receipt = new JSONObject(new String(EnviosPlugin.readBytes(in, 65536), StandardCharsets.UTF_8));
                        if (receipt.optString("id").isEmpty() || receipt.optString("receivedAt").isEmpty()) {
                            notification(requestId, "Envío en espera", "Aún no tenemos confirmación del Consejo.", false);
                            return Result.retry();
                        }
                        JSONObject safe = new JSONObject();
                        safe.put("id", receipt.getString("id"));
                        safe.put("receivedAt", receipt.getString("receivedAt"));
                        item.remove("payload");
                        item.put("receipt", safe);
                        item.put("state", "confirmed");
                        if (!EnviosPlugin.saveIfStillOwned(getApplicationContext(), item))
                            return Result.success();
                    }
                    notification(requestId, "Reporte entregado", "El Consejo recibió tu reporte.", false);
                    return Result.success();
                }
                if (code == 400 || code == 403 || code == 409 || code == 413) {
                    item.put("state", "attention");
                    if (!EnviosPlugin.saveIfStillOwned(getApplicationContext(), item))
                        return Result.success();
                    notification(requestId, "Revisa tu reporte", "El envío requiere tu atención en la aplicación.", false);
                    return Result.failure();
                }
                // Un 401 puede ser un token caducado: el siguiente intento
                // renovará la sesión nativa antes de enviar el mismo requestId.
                notification(requestId, "Envío en espera", "Reintentaremos cuando haya conexión.", false);
                return Result.retry();
            } finally {
                connection.disconnect();
            }
        } catch (Exception error) {
            try {
                if (!isStopped() && EnviosPlugin.load(getApplicationContext(), requestId) != null)
                    notification(requestId, "Envío en espera", "Reintentaremos cuando haya conexión.", false);
            } catch (Exception ignored) { /* La bandeja web conserva la copia. */ }
            return Result.retry();
        }
    }
}
