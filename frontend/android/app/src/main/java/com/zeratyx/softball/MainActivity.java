package com.zeratyx.softball;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int REQUEST_STORAGE_PERMISSIONS = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Registrar el plugin personalizado
        registerPlugin(ExportPlugin.class);
        
        requestStoragePermissions();
    }

    private void requestStoragePermissions() {
        // Para Android 11+ (API 30+), no necesitamos MANAGE_EXTERNAL_STORAGE
        // Storage Access Framework maneja los permisos automáticamente
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ usa scoped storage automáticamente
            // ACTION_CREATE_DOCUMENT no requiere permisos especiales
            return;
        }

        // Para Android 10 (API 29), aún usamos READ/WRITE pero el SAF los maneja
        String[] permissions = new String[]{
            Manifest.permission.READ_EXTERNAL_STORAGE,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
        };

        boolean needsRequest = false;
        for (String permission : permissions) {
            if (permission != null && 
                ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                needsRequest = true;
                break;
            }
        }

        if (needsRequest) {
            ActivityCompat.requestPermissions(this, permissions, REQUEST_STORAGE_PERMISSIONS);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == REQUEST_STORAGE_PERMISSIONS) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
            
            if (!allGranted) {
                // Los permisos fueron denegados, pero la exportación puede funcionar
                // con ACTION_CREATE_DOCUMENT ya que no requiere permisos especiales
                android.util.Log.w("MainActivity", "Storage permissions denied, but SAF export should still work");
            }
        }
    }
}
