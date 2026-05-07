const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace nav items titles
const navItemsRegex = /title: '([^']+)',/g;
content = content.replace(navItemsRegex, "title: t('$1', config.language),");

// Replace JSX text matching keys in our dict
const stringsToTranslate = [
    "Configuración y Equipos",
    "Seleccionar Equipo Activo",
    "Editar Nombre del Equipo",
    "Color Principal",
    "Gestión de Datos",
    "Exportar Backup (.json)",
    "Importar Backup",
    "Eliminar",
    "Cerrar",
    "Actualizar",
    "Roster Actual",
    "Registrar Jugador",
    "Nombre Completo",
    "Número de Camiseta",
    "Posición",
    "Guardar Jugador",
    "Historial",
    "Registrar Gasto",
    "Categoría",
    "Monto ($)",
    "Fecha del Gasto",
    "Descripción o Motivo",
    "Guardar Gasto",
    "Registar Pago",
    "Jugador",
    "Concepto",
    "Guardar Pago",
    "Calendario de Juegos",
    "Oponente / Vs",
    "Fecha del Juego",
    "Hora (Opcional)",
    "Lugar / Estadio (Opcional)",
    "Resultado",
    "Guardar Juego",
    "Control de Asistencia y Pagos por Juego",
    "Reporte de Ingresos y Gastos",
    "Tipo de Reporte"
];

for (let str of stringsToTranslate) {
    // JSX Text: >Text< -> >{t("Text", config.language)}<
    // We escape special characters in str for regex
    let escapedStr = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let jsxTextRegex = new RegExp(`>\\s*${escapedStr}\\s*(?=<|\\()`, 'g');
    content = content.replace(jsxTextRegex, `>{t('${str}', config.language)} `);
    
    // Also label text like: <label className="form-label">Text</label>
    let labelRegex = new RegExp(`<label className="form-label">${escapedStr}</label>`, 'g');
    content = content.replace(labelRegex, `<label className="form-label">{t('${str}', config.language)}</label>`);
}

// Special cases
content = content.replace(/>Resumen de \{config\.teamName\}<\/h3>/g, '>{t("Resumen de", config.language)} {config.teamName}</h3>');
content = content.replace(/<h3>No se encontraron jugadores<\/h3>/g, '<h3>{t("No se encontraron jugadores", config.language)}</h3>');
content = content.replace(/<h3>No se encontraron juegos<\/h3>/g, '<h3>{t("No se encontraron juegos", config.language)}</h3>');

fs.writeFileSync('src/App.tsx', content);
console.log("Translation applied.");
