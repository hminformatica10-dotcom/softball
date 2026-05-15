# 🔧 Guía Técnica - Exportación con Storage Access Framework

## Arquitectura de la Solución

```
┌─────────────────────────────────────────────────────────────┐
│                    React/Capacitor (TypeScript)              │
│                       ReportsTab.tsx                          │
│  - exportPDFModern() / exportExcelModern()                   │
│  - Genera Base64 de PDF/Excel                               │
│  - Llama ExportPluginImpl.exportPDF/Excel()                  │
└──────────────────┬──────────────────────────────────────────┘
                   │ (Capacitor Bridge)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│               Kotlin Native (ExportPlugin.kt)                │
│  - ExportPlugin extends Plugin                              │
│  - registerForActivityResult(CreateDocument)                │
│  - saveFileToUri(uri: Uri)                                  │
└──────────────────┬──────────────────────────────────────────┘
                   │ (Android Framework)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│          Android Storage Access Framework (SAF)              │
│  - ACTION_CREATE_DOCUMENT                                   │
│  - ContentResolver.openOutputStream(uri)                    │
│  - Acceso a: Descargas, Google Drive, OneDrive, etc         │
└─────────────────────────────────────────────────────────────┘
```

---

## Detalles de Implementación

### ExportPlugin.kt - Flujo de Exportación

```kotlin
// 1. Usuario toca botón "Exportar PDF"
@PluginMethod
fun exportPDF(call: PluginCall) {
    // Extrae Base64 de React
    val base64Data = call.getString("data")
    
    // Genera nombre automático
    val suggestedName = generateFileName("pdf")
    
    // Guarda en variables instance para luego
    currentCall = call
    fileData = Base64.decode(base64Data)
    fileName = suggestedName
    
    // Abre el diálogo nativo SAF
    createDocumentLauncher.launch(suggestedName)
}

// 2. Usuario selecciona ubicación → Callback automático
val createDocumentLauncher = registerForActivityResult(
    ActivityResultContracts.CreateDocument("*/*")
) { uri: Uri? ->
    if (uri != null) {
        saveFileToUri(uri)  // URI recibida, guardar ahora
    } else {
        rejectCall("Cancelado por el usuario")  // Usuario canceló
    }
}

// 3. Guardar el archivo
private fun saveFileToUri(uri: Uri) {
    context?.contentResolver?.openOutputStream(uri)?.use { outputStream ->
        outputStream.write(fileData)  // Escribe sin permisos especiales
        outputStream.flush()
        
        call.resolve(...)  // Retorna éxito a React
    }
}
```

### ReportsTab.tsx - Flujo de Exportación

```typescript
// 1. Usuario toca botón
onClick={() => exportPDFModern()}

// 2. Función preparación de datos
const exportPDFModern = async () => {
    setIsExporting(true)
    
    // Genera PDF con jsPDF
    const doc = await generatePDF()
    
    // Convierte a Base64
    const base64PDF = doc.output('datauristring').split(',')[1]
    
    // Llama plugin nativo
    const result = await ExportPluginImpl.exportPDF({
        data: base64PDF,
        fileName: generateFileName('pdf')
    })
    
    // Muestra resultado
    showMessage('success', result.message)
}

// 3. Fallback para web
if (!Capacitor.isNativePlatform()) {
    doc.save(fileName)  // Descarga directa
}
```

---

## Ventajas del Storage Access Framework

| Aspecto | Antiguo (FileProvider) | Nuevo (SAF) |
|--------|----------------------|-------------|
| **Permisos requeridos** | READ/WRITE_EXTERNAL + MANAGE | Ninguno especial |
| **Android 11+** | No funciona bien | ✅ Nativo |
| **Google Drive** | No soporta directo | ✅ Integrado |
| **OneDrive/Dropbox** | No soporta | ✅ Integrado |
| **Ubicación guardar** | Solo app-specific | ✅ Usuario elige |
| **API Level** | 19+ | 19+ |
| **Scoped Storage** | Conflicto | ✅ Automático |

---

## Seguridad y Permisos

### Android 10 (API 29)
```xml
<!-- Permitidos pero no requeridos por SAF -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### Android 11-12 (API 30-32)
```xml
<!-- SAF no requiere permisos, Scoped Storage obligatorio -->
<!-- Permisos heredados deshabilitados automáticamente -->
```

### Android 13+ (API 33+)
```xml
<!-- Solo READ_MEDIA_* si necesitas LEER multimedia -->
<!-- Para ESCRIBIR: SAF no requiere permisos -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
```

---

## Variables de Ambiente

No requiere variables especiales en `local.properties` para la exportación.

La firma del APK (si aplica) va en:
```properties
# local.properties
RELEASE_STORE_FILE=path/to/keystore.jks
RELEASE_STORE_PASSWORD=password
RELEASE_KEY_ALIAS=alias
RELEASE_KEY_PASSWORD=password
```

---

## Validación de Guarda

El plugin valida:

```kotlin
// 1. Datos no vacíos
if (base64Data.isNullOrEmpty()) {
    call.reject("No hay datos para exportar")
}

// 2. Decodificación Base64 exitosa
fileData = Base64.decode(base64Data)  // Lanza excepción si falla

// 3. Stream de escritura disponible
context?.contentResolver?.openOutputStream(uri)?.use { outputStream ->
    // ¿outputStream es null? Use lanza excepción
    outputStream.write(data)
    outputStream.flush()
}

// 4. Todo OK, retorna URI y nombre
call.resolve(JSObject().apply {
    put("success", true)
    put("uri", uri.toString())
    put("fileName", fileName)
})
```

---

## Manejo de Errores Comunes

### Error: "No se pudo generar el PDF"
**Causa:** `doc.output('datauristring')` retornó null o malformado  
**Solución:** Verificar que existan datos en `filteredReportPayments` o `filteredReportExpenses`

### Error: "No hay datos para exportar"
**Causa:** Base64 vacío o null  
**Solución:** Verificar que los datos se leyeron correctamente del servicio

### Error: "No se pudo abrir el stream de escritura"
**Causa:** Dispositivo sin espacio o URI inválida  
**Solución:** Liberar espacio, verificar permisos de carpeta de destino

### Error: Plugin no encontrado
**Causa:** ExportPlugin no registrado en MainActivity  
**Solución:** Agregar `registerPlugin(ExportPlugin.class)` en onCreate()

---

## Testing Unitario (Recomendado Futuro)

```kotlin
// ExportPlugin.kt - Test
class ExportPluginTest {
    @Test
    fun testGenerateFileName() {
        val fileName = plugin.generateFileName("pdf")
        assertTrue(fileName.startsWith("Reporte_"))
        assertTrue(fileName.endsWith(".pdf"))
    }
    
    @Test
    fun testBase64Decode() {
        val base64 = "SGVsbG8gV29ybGQ="
        val decoded = Base64.decode(base64)
        assertEquals("Hello World", String(decoded))
    }
}
```

```typescript
// ReportsTab.test.tsx - Test
describe('ReportsTab Export', () => {
    test('generateFileName returns correct format', () => {
        const fileName = generateFileName('pdf');
        expect(fileName).toMatch(/Reporte_\d{8}_\d{6}\.pdf/);
    });
    
    test('showMessage displays success message', () => {
        showMessage('success', 'Test message');
        expect(exportMessage.type).toBe('success');
    });
});
```

---

## Monitoreo en Producción

### Logs a capturar
```
[EXPORT-PDF] Iniciando exportación PDF moderna con SAF...
[EXPORT-PDF] Base64 PDF generado, tamaño: {size} bytes
[EXPORT-PDF] Nombre de archivo: {fileName}
[EXPORT-PDF] Resultado: {result}
```

### Métricas importantes
- Tiempo de generación de PDF/Excel
- Tamaño de archivo generado
- Tasa de éxito de guardado
- Dispositivos más comunes donde falla

### Firebase Analytics (Recomendado)
```kotlin
Firebase.analytics.logEvent(FirebaseAnalytics.Event.CUSTOM) {
    param("export_type", "pdf")
    param("file_size_kb", fileData.size / 1024)
    param("success", true)
    param("device_manufacturer", Build.MANUFACTURER)
}
```

---

## Compatibilidad Hacia Atrás

| API Level | Android Version | Estado |
|-----------|-----------------|--------|
| 24-28 | 7.0 - 9 | ⚠️ Sin export (legacy) |
| 29 | 10 | ✅ SAF funciona |
| 30-31 | 11 | ✅ SAF funciona |
| 32 | 12 | ✅ SAF funciona |
| 33-34 | 13-14 | ✅ SAF funciona |
| 35-36 | 15+ | ✅ SAF funciona |

**Nota:** El proyecto tiene `minSdkVersion 24`, pero SAF requiere API 19+, así que está cubierto.

---

## Diferencias con Solución Anterior

### Antes (PROBLEMAS ❌)
```kotlin
Filesystem.writeFile(
    path: fileName,
    data: base64PDF,
    directory: Directory.Cache  // ❌ Temporal, puede ser borrado
)
Share.share(url: fileUri)  // ❌ Depende del diálogo de compartir
```

### Después (SOLUCIÓN ✅)
```kotlin
context?.contentResolver?.openOutputStream(uri)?.use { os ->
    os.write(fileData)  // ✅ Ubicación elegida por usuario
}
// ✅ Usuario elige Descargas, Google Drive, OneDrive, etc.
// ✅ Archivo guardado permanentemente
// ✅ Sin depender de Share API
```

---

## Recursos Útiles

- [Android Developers - Storage Access Framework](https://developer.android.com/guide/topics/providers/document-provider)
- [Capacitor Android Plugins](https://capacitorjs.com/docs/plugins)
- [ActivityResultContracts Documentation](https://developer.android.com/training/basics/intents/result)
- [ContentResolver Usage](https://developer.android.com/guide/topics/providers/content-providers)
