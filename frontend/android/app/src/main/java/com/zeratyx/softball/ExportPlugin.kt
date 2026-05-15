package com.zeratyx.softball

import android.net.Uri
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

/**
 * ExportPlugin - Plugin de Capacitor para exportación de archivos con Storage Access Framework
 * Soporta Android 10+ con scoped storage
 */
@CapacitorPlugin(name = "ExportPlugin")
class ExportPlugin : Plugin() {

    private var currentCall: PluginCall? = null
    private var fileData: ByteArray? = null
    private var fileName: String? = null
    private var createDocumentLauncher: ActivityResultLauncher<String>? = null

    override fun load() {
        super.load()
        activity?.activityResultRegistry?.let { registry ->
            createDocumentLauncher = registry.register(
                "export-plugin-create-document",
                ActivityResultContracts.CreateDocument("*/*")
            ) { uri: Uri? ->
                if (uri != null) {
                    saveFileToUri(uri)
                } else {
                    rejectCall("Cancelado por el usuario")
                }
            }
        }
    }

    /**
     * Exportar PDF con diálogo nativo de Android
     */
    @PluginMethod
    fun exportPDF(call: PluginCall) {
        try {
            val base64Data = call.getString("data")
            val suggestedName = call.getString("fileName") ?: generateFileName("pdf")

            if (base64Data.isNullOrEmpty()) {
                call.reject("No hay datos para exportar")
                return
            }

            currentCall = call
            fileData = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT)
            fileName = suggestedName

            createDocumentLauncher?.launch(suggestedName) ?: call.reject("No se puede iniciar el selector de archivos")

        } catch (e: Exception) {
            call.reject("Error al iniciar exportación: ${e.message}")
        }
    }

    /**
     * Exportar Excel con diálogo nativo de Android
     */
    @PluginMethod
    fun exportExcel(call: PluginCall) {
        try {
            val base64Data = call.getString("data")
            val suggestedName = call.getString("fileName") ?: generateFileName("xlsx")

            if (base64Data.isNullOrEmpty()) {
                call.reject("No hay datos para exportar")
                return
            }

            currentCall = call
            fileData = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT)
            fileName = suggestedName

            createDocumentLauncher?.launch(suggestedName) ?: call.reject("No se puede iniciar el selector de archivos")

        } catch (e: Exception) {
            call.reject("Error al iniciar exportación: ${e.message}")
        }
    }

    /**
     * Guardar archivo a través del Uri proporcionado por el SAF
     */
    private fun saveFileToUri(uri: Uri) {
        val call = currentCall ?: return

        try {
            val data = fileData ?: throw IllegalArgumentException("No hay datos para guardar")

            // Escribir el archivo usando ContentResolver
            context?.contentResolver?.openOutputStream(uri)?.use { outputStream ->
                outputStream.write(data)
                outputStream.flush()

                val result = JSObject()
                result.put("success", true)
                result.put("uri", uri.toString())
                result.put("fileName", fileName)
                result.put("message", "Archivo guardado correctamente: $fileName")

                // Mostrar notificación de éxito
                showSuccessNotification("Archivo guardado", fileName ?: "Reporte")

                call.resolve(result)
            } ?: throw IOException("No se pudo abrir el stream de escritura")

        } catch (e: Exception) {
            val errorMsg = "Error al guardar archivo: ${e.message}"
            showErrorNotification("Error", errorMsg)
            call.reject(errorMsg, e)
        } finally {
            currentCall = null
            fileData = null
            fileName = null
        }
    }

    /**
     * Generar nombre de archivo con fecha y hora
     */
    private fun generateFileName(format: String): String {
        val timeFormat = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault())
        val timestamp = timeFormat.format(Date())
        return when (format.lowercase()) {
            "pdf" -> "Reporte_$timestamp.pdf"
            "xlsx" -> "Reporte_$timestamp.xlsx"
            else -> "Archivo_$timestamp.$format"
        }
    }

    /**
     * Mostrar notificación de éxito
     */
    private fun showSuccessNotification(title: String, message: String) {
        try {
            val activity = activity as? AppCompatActivity
            activity?.runOnUiThread {
                // Aquí puedes mostrar un Toast, Snackbar o notificación
                android.widget.Toast.makeText(
                    context,
                    "$title: $message",
                    android.widget.Toast.LENGTH_LONG
                ).show()
            }
        } catch (e: Exception) {
            // Fallback silencioso
        }
    }

    /**
     * Mostrar notificación de error
     */
    private fun showErrorNotification(title: String, message: String) {
        try {
            val activity = activity as? AppCompatActivity
            activity?.runOnUiThread {
                android.widget.Toast.makeText(
                    context,
                    "$title: $message",
                    android.widget.Toast.LENGTH_LONG
                ).show()
            }
        } catch (e: Exception) {
            // Fallback silencioso
        }
    }

    /**
     * Utility para rechazar call con mensaje de error
     */
    private fun rejectCall(message: String) {
        currentCall?.reject(message)
        currentCall = null
    }
}
