package co.riosatinga.mipueblodigital;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.nio.charset.StandardCharsets;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.util.Arrays;
import androidx.work.Data;
import androidx.work.ListenableWorker;
import androidx.work.testing.TestListenableWorkerBuilder;

/** Verifica Android Keystore real; un test JVM no puede simular esta clave. */
@RunWith(AndroidJUnit4.class)
public class EnviosStorageTest {
    @Test
    public void cifraLaFotografiaYRecuperaElMismoEnvio() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String requestId = java.util.UUID.randomUUID().toString();
        JSONObject payload = new JSONObject();
        payload.put("description", "dato-privado-de-prueba");
        payload.put("photo", "data:image/png;base64,YWJj");
        JSONObject item = new JSONObject();
        item.put("requestId", requestId);
        item.put("owner", "test-owner");
        item.put("payload", payload);
        try {
            EnviosPlugin.save(context, item);
            byte[] disk;
            try (FileInputStream in = new FileInputStream(EnviosPlugin.file(context, requestId))) {
                disk = EnviosPlugin.readBytes(in, 65536);
            }
            String raw = new String(disk, StandardCharsets.UTF_8);
            assertFalse(raw.contains("dato-privado-de-prueba"));
            assertFalse(raw.contains("data:image/png"));
            JSONObject restored = EnviosPlugin.load(context, requestId);
            assertEquals(requestId, restored.getString("requestId"));
            assertEquals("dato-privado-de-prueba", restored.getJSONObject("payload").getString("description"));
            assertTrue(EnviosPlugin.file(context, requestId).getAbsolutePath().contains("no_backup"));
        } finally {
            EnviosPlugin.file(context, requestId).delete();
        }
    }

    @Test
    public void cambiaElIvYRechazaUnArchivoAlterado() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String id = java.util.UUID.randomUUID().toString();
        JSONObject item = new JSONObject().put("requestId", id).put("owner", "test");
        try {
            EnviosPlugin.save(context, item);
            byte[] first;
            try (FileInputStream in = new FileInputStream(EnviosPlugin.file(context, id))) {
                first = EnviosPlugin.readBytes(in, 65536);
            }
            EnviosPlugin.save(context, item);
            byte[] second;
            try (FileInputStream in = new FileInputStream(EnviosPlugin.file(context, id))) {
                second = EnviosPlugin.readBytes(in, 65536);
            }
            assertFalse(Arrays.equals(Arrays.copyOf(first, 12), Arrays.copyOf(second, 12)));
            second[second.length - 1] ^= 1;
            try (FileOutputStream out = new FileOutputStream(EnviosPlugin.file(context, id))) {
                out.write(second);
            }
            boolean rejected = false;
            try { EnviosPlugin.load(context, id); } catch (Exception expected) { rejected = true; }
            assertTrue("GCM debe rechazar contenido alterado", rejected);
        } finally { EnviosPlugin.file(context, id).delete(); }
    }

    @Test
    public void noTransmiteSiNoCoincideLaSesionNiReintentaUnRechazo() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String id = java.util.UUID.randomUUID().toString();
        JSONObject item = new JSONObject().put("requestId", id).put("owner", "not-a-real-user")
            .put("state", "queued");
        try {
            EnviosPlugin.save(context, item);
            EnvioWorker worker = TestListenableWorkerBuilder.from(context, EnvioWorker.class)
                .setInputData(new Data.Builder().putString("requestId", id).build()).build();
            assertEquals(ListenableWorker.Result.failure(), worker.doWork());
            assertTrue(EnviosPlugin.file(context, id).exists());
            item.put("state", "attention");
            EnviosPlugin.save(context, item);
            assertEquals(ListenableWorker.Result.failure(), worker.doWork());
        } finally { EnviosPlugin.file(context, id).delete(); }
    }
}
