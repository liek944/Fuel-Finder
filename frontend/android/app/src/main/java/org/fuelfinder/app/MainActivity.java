package org.fuelfinder.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import org.fuelfinder.app.background.BackgroundLocationPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    registerPlugin(BackgroundLocationPlugin.class);
  }
}
