package co.riosatinga.mipueblodigital;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        /* Los complementos propios se registran antes de que el puente arranque;
           después, la ventana ya está montada y no los ve. */
        registerPlugin(AjustesPlugin.class);
        registerPlugin(ActualizacionPlugin.class);
        registerPlugin(EnviosPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
