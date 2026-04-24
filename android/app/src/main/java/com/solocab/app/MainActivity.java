package com.solocab.app;

import com.getcapacitor.BridgeActivity;
import com.solocab.app.permissions.SoloCabPermissionsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(SoloCabPermissionsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
