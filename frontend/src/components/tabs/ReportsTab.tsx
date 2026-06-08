import React from 'react';
import { Search, BarChart2, TrendingUp, TrendingDown, ClipboardCheck, Sliders, Eye, AlertCircle, CheckCircle, Loader, Share2, FileText, FileSpreadsheet } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import type { Plugin } from '@capacitor/core';
import { t } from '../../translations';
import type { Payment, Expense, AppConfig, Game } from '../../types';

// Registrar plugin personalizado
interface ExportPlugin extends Plugin {
  exportPDF(options: { data: string; fileName: string }): Promise<{ success: boolean; uri: string; message: string }>;
  exportExcel(options: { data: string; fileName: string }): Promise<{ success: boolean; uri: string; message: string }>;
}

// Intentar registrar, pero no fallar si no existe
let ExportPluginImpl: ExportPlugin | null = null;
try {
  ExportPluginImpl = registerPlugin<ExportPlugin>('ExportPlugin') as unknown as ExportPlugin;
} catch {
  console.warn('[INIT] ExportPlugin no disponible, usaremos Filesystem');
}

interface ReportsTabProps {
  config: AppConfig;
  payments: Payment[];
  expenses: Expense[];
  games: Game[];
  reportType: string;
  reportPlayerFilter: string;
  chartView: string;
  setChartView: (val: string) => void;
  reportSearch: string;
  setReportSearch: (val: string) => void;
  allConcepts: string[];
  formatDate: (val: string) => string;
  formatCurrency: (val: number) => string;
  isDateInRange: (dateToCheck: string) => boolean;
  renderSearchBar: (placeholder: string, value: string, setter: (val: string) => void, list?: string[]) => React.ReactNode;
  setIsReportFilterModalOpen: (val: boolean) => void;
  startDate: string;
  endDate: string;
  reportSpecificDate?: string;
  groupConcepts: any[]; // PaymentConcept[]
  setViewingReceipt?: (val: string | null) => void;
}

const isPaymentForGame = (p: Payment, g: Game) => {
  if (p.gameId) {
    return p.gameId === g.id;
  }
  if (!p.notes) return false;
  const expectedOpponent = `Vs ${g.opponent}`.toLowerCase();
  const notesMatch = p.notes.toLowerCase().includes(expectedOpponent);
  if (!notesMatch) return false;
  
  const pDate = (p.eventDate || p.date || '').split('T')[0];
  const gDate = (g.eventDate || g.date || '').split('T')[0];
  return pDate === gDate;
};

export const ReportsTab: React.FC<ReportsTabProps> = ({
  config,
  payments,
  expenses,
  games = [],
  reportType,
  reportPlayerFilter,
  chartView,
  setChartView,
  reportSearch,
  setReportSearch,
  allConcepts,
  formatDate,
  formatCurrency,
  isDateInRange,
  renderSearchBar,
  setIsReportFilterModalOpen,
  startDate,
  endDate,
  reportSpecificDate,
  groupConcepts = [],
  setViewingReceipt
}) => {
  const [activeChart, setActiveChart] = React.useState(chartView);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportMessage, setExportMessage] = React.useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showMovementsManual, setShowMovementsManual] = React.useState(false);

  // Sync internal state with prop if needed
  React.useEffect(() => {
    setActiveChart(chartView);
  }, [chartView]);

  const filteredReportPayments = reportType === 'Gastos' ? [] : payments.filter(p => {
    const matchSearch = p.playerName.toLowerCase().includes(reportSearch.toLowerCase()) || 
                       p.description.toLowerCase().includes(reportSearch.toLowerCase());
    const matchPlayer = !reportPlayerFilter || p.playerId === reportPlayerFilter;
    return matchSearch && matchPlayer && isDateInRange(p.eventDate || p.date || '');
  });

  const synthesizedGameExpenses = React.useMemo(() => {
    return (games || [])
      .filter(game => Number(game.fieldPayment || 0) > 0)
      .map(game => ({
        id: `game-field-${game.id}`,
        category: 'Pago de Terreno',
        amount: Number(game.fieldPayment),
        description: `Pago de campo - Juego Vs ${game.opponent}`,
        gameId: game.id,
        eventDate: game.eventDate || game.date || '',
        date: game.eventDate || game.date || '',
        responsible: '',
        receipt: undefined
      }));
  }, [games]);

  const realExpensesWithoutFieldPayments = React.useMemo(() => {
    return expenses.filter(e => e.category !== 'Pago de Terreno');
  }, [expenses]);

  const allExpenses = React.useMemo(() => {
    return [...realExpensesWithoutFieldPayments, ...synthesizedGameExpenses];
  }, [realExpensesWithoutFieldPayments, synthesizedGameExpenses]);

  const filteredReportExpenses = reportType === 'Ingresos' ? [] : allExpenses.filter(e => {
    const matchSearch = (e.category || '').toLowerCase().includes(reportSearch.toLowerCase()) ||
                        (e.description || '').toLowerCase().includes(reportSearch.toLowerCase());
    return matchSearch && isDateInRange(e.eventDate || e.date || '');
  });

  // METRICS
  // Total projected (includes unpaid debts)
  
  // Real liquid income (money already paid)
  // We exclude 'Deuda Pendiente' from liquid income
  const liquidIncome = filteredReportPayments
    .filter(p => p.description !== 'Deuda Pendiente')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const filteredExpensesTotal = filteredReportExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const fieldPaymentExpenses = filteredReportExpenses.filter(e => e.category === 'Pago de Terreno');
  const otherReportExpenses = filteredReportExpenses.filter(e => e.category !== 'Pago de Terreno');
  const fieldPaymentTotal = fieldPaymentExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const otherExpensesTotal = otherReportExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const liquidBalance = liquidIncome - filteredExpensesTotal;

  // DATA GROUPING
  const incomeByConcept = filteredReportPayments.reduce((acc, curr) => {
    let conceptName = curr.description;
    
    // If it has a conceptId, try to get the Group Concept name
    if (curr.conceptId) {
      const gc = groupConcepts.find(c => c.id === curr.conceptId || c._id === curr.conceptId);
      if (gc) conceptName = `[Grup] ${gc.name}`;
      else if (curr.description.startsWith('Abono:') || curr.description.startsWith('Pago Total:')) {
         // Keep the description if it's already descriptive
      }
    }
    
    acc[conceptName] = (acc[conceptName] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);
  
  const incomeData = Object.keys(incomeByConcept).map(key => ({ name: key, value: incomeByConcept[key] })).filter(item => item.value > 0);

  const expensesByCategory = filteredReportExpenses.reduce((acc, curr) => {
    const cat = curr.category;
    acc[cat] = (acc[cat] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);
  const expenseData = Object.keys(expensesByCategory).map(key => ({ name: key, value: expensesByCategory[key] })).filter(item => item.value > 0);

  const monthlyDataMap: Record<string, { ingresos: number, gastos: number }> = {};
  
  filteredReportPayments.forEach(p => {
    if (p.description === 'Deuda Pendiente') return; // Only tracked real income for trend
    if (!p.eventDate) return;
    const date = new Date(p.eventDate);
    if (isNaN(date.getTime())) return;
    const monthYear = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!monthlyDataMap[monthYear]) monthlyDataMap[monthYear] = { ingresos: 0, gastos: 0 };
    monthlyDataMap[monthYear].ingresos += p.amount;
  });

  filteredReportExpenses.forEach(e => {
    if (!e.eventDate) return;
    const date = new Date(e.eventDate);
    if (isNaN(date.getTime())) return;
    const monthYear = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!monthlyDataMap[monthYear]) monthlyDataMap[monthYear] = { ingresos: 0, gastos: 0 };
    monthlyDataMap[monthYear].gastos += e.amount;
  });

  const monthlyTrendData = Object.keys(monthlyDataMap).sort().map(key => {
    const [year, month] = key.split('-');
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const label = `${monthNames[parseInt(month) - 1]} ${year}`;
    return {
      name: label,
      Ingresos: monthlyDataMap[key].ingresos,
      Gastos: monthlyDataMap[key].gastos,
      Balance: monthlyDataMap[key].ingresos - monthlyDataMap[key].gastos
    };
  });

  const COLORS_INCOME = ['#22c55e', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#4ade80', '#86efac'];
  const COLORS_EXPENSE = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#f87171', '#fca5a5'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', padding: '12px', borderRadius: '8px', color: '#f8fafc', backdropFilter: 'blur(10px)', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
          <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>{label || payload[0]?.name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ margin: '4px 0', color: entry.color || entry.fill, fontWeight: '500' }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const combinedTransactions = [
    ...filteredReportPayments.map(p => ({
      id: `payment-${p.id}`,
      originalId: p.id,
      type: 'ingreso',
      eventDate: p.eventDate || p.date || '',
      amount: p.amount,
      title: p.playerName,
      description: p.description,
      notes: p.notes,
      conceptId: p.conceptId
    })),
    ...filteredReportExpenses.map(e => ({
      id: `expense-${e.id}`,
      originalId: e.id,
      type: 'gasto',
      eventDate: e.eventDate || e.date || '',
      amount: e.amount,
      title: e.category,
      description: e.description,
      notes: '',
      conceptId: undefined,
      receipt: e.receipt
    }))
  ].sort((a, b) => new Date(b.eventDate || 0).getTime() - new Date(a.eventDate || 0).getTime());

  const showingAllForDate = reportSpecificDate && reportSpecificDate !== '';
  const displayedTransactions = showingAllForDate ? combinedTransactions : combinedTransactions.slice(0, 5);

  const hexToRgb = (hex: string): [number, number, number] => {
    try {
      const h = hex.replace('#', '');
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return [r, g, b];
    } catch { return [56, 189, 248]; }
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const teamColor = hexToRgb(config.primaryColor || '#38bdf8');
    const secondaryTextColor = [100, 116, 139];

    // --- HEADER ---
    doc.setFillColor(teamColor[0], teamColor[1], teamColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(config.teamName || 'Reporte Softball', 15, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("REPORTE FINANCIERO OFICIAL (POR JUEGOS)", 15, 30);
    
    const reportDateRange = reportSpecificDate ? formatDate(reportSpecificDate) : 
                          (startDate || endDate ? `${formatDate(startDate || 'Inicio')} - ${formatDate(endDate || 'Hoy')}` : "Todo el historial");
    doc.text(`Periodo: ${reportDateRange}`, 210 - 15, 30, { align: 'right' });

    // --- SUMMARY CARDS ---
    let currentY = 55;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen Financiero General", 15, currentY);
    
    currentY += 8;
    // Cards container
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, currentY, 180, 25, 3, 3, 'FD');
    
    // Income
    doc.setFontSize(9);
    doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
    doc.text("INGRESOS TOTALES", 25, currentY + 8);
    doc.setFontSize(12);
    doc.setTextColor(34, 197, 94);
    doc.text(formatCurrency(liquidIncome), 25, currentY + 18);
    
    // Expenses
    doc.setFontSize(9);
    doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
    doc.text("GASTOS TOTALES", 85, currentY + 8);
    doc.setFontSize(12);
    doc.setTextColor(239, 68, 68);
    doc.text(formatCurrency(filteredExpensesTotal), 85, currentY + 18);
    
    // Balance
    doc.setFontSize(9);
    doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
    doc.text("SALDO NETO", 145, currentY + 8);
    doc.setFontSize(12);
    doc.setTextColor(teamColor[0], teamColor[1], teamColor[2]);
    doc.text(formatCurrency(liquidBalance), 145, currentY + 18);

    currentY += 40;

    // --- GROUP TRANSACTIONS BY GAME ---
    const safeGames = games || [];
    const sortedGamesForReport = [...safeGames].sort((a, b) => new Date(b.eventDate || b.date || 0).getTime() - new Date(a.eventDate || a.date || 0).getTime());
    
    const gameGroups = sortedGamesForReport.map(game => {
      const gameDateStr = formatDate(game.eventDate || game.date || '');
      const gamePayments = filteredReportPayments.filter(p => isPaymentForGame(p, game));

      const gameIncome = gamePayments
        .filter(p => p.description !== 'Deuda Pendiente')
        .reduce((sum, p) => sum + p.amount, 0);

      const gameFieldExpense = Number(game.fieldPayment || 0);
      const gameSurplus = gameIncome - gameFieldExpense;

      return {
        game,
        payments: gamePayments,
        income: gameIncome,
        expense: gameFieldExpense,
        surplus: gameSurplus,
        gameDateStr
      };
    }).filter(group => group.payments.length > 0 || group.expense > 0);

    // Other/General transactions
    const otherPayments = filteredReportPayments.filter(p => {
      return !safeGames.some(g => isPaymentForGame(p, g));
    });

    const fieldPaymentExpenses = filteredReportExpenses.filter(e => e.category === 'Pago de Terreno');
    const otherExpenses = filteredReportExpenses.filter(e => e.category !== 'Pago de Terreno');

    // 1. Render Game Sections
    if (gameGroups.length > 0) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Detalle de Finanzas por Juegos", 15, currentY);
      currentY += 8;

      for (const group of gameGroups) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }

        doc.setTextColor(teamColor[0], teamColor[1], teamColor[2]);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Partido: Vs ${group.game.opponent} (${group.gameDateStr})`, 15, currentY);
        currentY += 4;

        // Build combined game transaction list (payments and ground expense)
        const gameRows: any[] = [];
        
        // Add payments
        group.payments.forEach(p => {
          if (p.description === 'Deuda Pendiente') return;
          gameRows.push([
            formatDate(p.eventDate || ''),
            p.playerName,
            p.description,
            "Ingreso",
            formatCurrency(p.amount)
          ]);
        });

        autoTable(doc, {
          startY: currentY,
          head: [["Fecha", "Concepto / Jugador", "Detalle", "Tipo", "Monto"]],
          body: gameRows.length > 0 ? gameRows : [["-", "Sin transacciones registradas", "-", "-", "$0.00"]],
          headStyles: { fillColor: teamColor, textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          margin: { left: 15, right: 15 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 6;
        
        // Subtotals block
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`Recaudado: ${formatCurrency(group.income)}  |  Costo Campo: ${formatCurrency(group.expense)}  |  Balance: ${formatCurrency(group.surplus)}`, 16, currentY);
        currentY += 12;
      }
    }

    // 2. Render Other/General Payments Section
    const incomesNotGame = otherPayments.filter(t => t.description !== 'Deuda Pendiente');
    if (incomesNotGame.length > 0) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Otros Ingresos (No asociados a juegos)", 15, currentY);
      currentY += 8;

      const incomesGroupedByConcept = incomesNotGame.reduce((acc, tx) => {
        let conceptKey = tx.description;
        if (tx.conceptId) {
          const gc = groupConcepts.find(c => c.id === tx.conceptId || c._id === tx.conceptId);
          if (gc) conceptKey = `[Grup] ${gc.name}`;
        }
        if (!acc[conceptKey]) acc[conceptKey] = [];
        acc[conceptKey].push(tx);
        return acc;
      }, {} as Record<string, typeof incomesNotGame>);

      for (const conceptKey of Object.keys(incomesGroupedByConcept)) {
        const groupPayments = incomesGroupedByConcept[conceptKey];
        const subtotal = groupPayments.reduce((sum, tx) => sum + tx.amount, 0);

        if (currentY > 240) { doc.addPage(); currentY = 20; }
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(conceptKey, 18, currentY);
        currentY += 6;

        autoTable(doc, {
          startY: currentY,
          head: [["Fecha", "Jugador", "Concepto", "Monto"]],
          body: groupPayments.map(tx => [formatDate(tx.eventDate), tx.playerName, tx.description, formatCurrency(tx.amount)]),
          headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          margin: { left: 15, right: 15 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 4;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`Subtotal ${conceptKey}: ${formatCurrency(subtotal)}`, 18, currentY);
        currentY += 12;
      }
    }

    // 3. Render Pago de Terreno expenses
    if (fieldPaymentExpenses.length > 0) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Pago de Terreno", 15, currentY);

      autoTable(doc, {
        startY: currentY + 4,
        head: [["Fecha", "Categoría", "Descripción", "Monto"]],
        body: fieldPaymentExpenses.map(tx => [formatDate(tx.eventDate), tx.category, tx.description, formatCurrency(tx.amount)]),
        headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: 15, right: 15 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 4. Render Other/General Expenses Section
    if (otherExpenses.length > 0) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Otros Gastos / Egresos Generales", 15, currentY);

      autoTable(doc, {
        startY: currentY + 4,
        head: [["Fecha", "Categoría", "Descripción", "Monto"]],
        body: otherExpenses.map(tx => [formatDate(tx.eventDate), tx.category, tx.description, formatCurrency(tx.amount)]),
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: 15, right: 15 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 4. Render Debts Table (If any)
    const debts = filteredReportPayments.filter(t => t.description === 'Deuda Pendiente');
    if (debts.length > 0) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`Deudas Pendientes por Cobrar (${debts.length})`, 15, currentY);
      
      autoTable(doc, {
        startY: currentY + 4,
        head: [["Fecha", "Jugador", "Referencia", "Monto"]],
        body: debts.map(tx => [formatDate(tx.eventDate), tx.playerName, "Deuda Asistencia", formatCurrency(tx.amount)]),
        headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'bold' },
        margin: { left: 15, right: 15 }
      });
    }

    // --- FOOTER ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
      doc.text(
        `Generado el ${new Date().toLocaleString()} - ZeratyX Soft Ball App - Página ${i} de ${pageCount}`,
        105, 290, { align: 'center' }
      );
    }
    return doc;
  };

  /**
   * Generar nombre de archivo con fecha y hora
   */
  const generateFileName = (format: 'pdf' | 'xlsx'): string => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
    const teamNameSafe = (config.teamName || 'Reporte').replace(/\s+/g, '_').substring(0, 20);
    
    if (format === 'pdf') {
      return `Reporte_${teamNameSafe}_${dateStr}.pdf`;
    } else {
      return `Reporte_${teamNameSafe}_${dateStr}.xlsx`;
    }
  };

  /**
   * Mostrar mensaje temporal (auto-oculta después de 4 segundos)
   */
  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setExportMessage({ type, text });
    setTimeout(() => setExportMessage(null), 4000);
  };

  /**
   * Exportar PDF - Funciona en Web, Android e iOS
   */
  const exportPDFModern = async () => {
    try {
      setIsExporting(true);
      console.log('[EXPORT-PDF] Iniciando exportación PDF...');
      
      const doc = await generatePDF();
      const base64PDF = doc.output('datauristring').split(',')[1];

      if (!base64PDF) {
        throw new Error('No se pudo generar el PDF');
      }

      console.log('[EXPORT-PDF] Base64 PDF generado, tamaño:', base64PDF.length, 'bytes');
      const fileName = generateFileName('pdf');
      console.log('[EXPORT-PDF] Nombre de archivo:', fileName);

      if (!Capacitor.isNativePlatform()) {
        // Fallback web: descargar directamente
        console.log('[EXPORT-PDF] Plataforma web, descargando...');
        const doc = await generatePDF();
        doc.save(fileName);
        showMessage('success', `✓ PDF descargado: ${fileName}`);
        return;
      }

      // Android/iOS: intentar con plugin personalizado primero
      if (ExportPluginImpl) {
        try {
          console.log('[EXPORT-PDF] Intentando usar ExportPlugin personalizado...');
          const result = await ExportPluginImpl.exportPDF({
            data: base64PDF,
            fileName: fileName
          });
          console.log('[EXPORT-PDF] Éxito con ExportPlugin:', result);
          showMessage('success', `✓ ${result.message}`);
          return;
        } catch (pluginError: any) {
          console.warn('[EXPORT-PDF] ExportPlugin falló, usando Filesystem:', pluginError.message);
        }
      }

      // Fallback Android/iOS: usar Filesystem
      console.log('[EXPORT-PDF] Guardando en Filesystem...');
      await Filesystem.writeFile({
        path: fileName,
        data: base64PDF,
        directory: Directory.Documents,
        recursive: true
      });

      console.log('[EXPORT-PDF] Archivo guardado en Documents');
      showMessage('success', `✓ PDF guardado: ${fileName}`);

    } catch (error: any) {
      console.error('[EXPORT-PDF] Error:', error);
      const errorMsg = error?.message || String(error) || 'Error desconocido';
      showMessage('error', `✗ ${errorMsg}`);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Exportar Excel - Funciona en Web, Android e iOS
   */
  const exportExcelModern = async () => {
    try {
      setIsExporting(true);
      console.log('[EXPORT-EXCEL] Iniciando exportación Excel...');

      // --- GROUP TRANSACTIONS BY GAME ---
      const safeGames = games || [];
      const sortedGamesForReport = [...safeGames].sort((a, b) => new Date(b.eventDate || b.date || 0).getTime() - new Date(a.eventDate || a.date || 0).getTime());
      
      const gameGroups = sortedGamesForReport.map(game => {
        const gameDateStr = formatDate(game.eventDate || game.date || '');
        const gamePayments = filteredReportPayments.filter(p => isPaymentForGame(p, game));

        const gameIncome = gamePayments
          .filter(p => p.description !== 'Deuda Pendiente')
          .reduce((sum, p) => sum + p.amount, 0);

        const gameFieldExpense = Number(game.fieldPayment || 0);
        const gameSurplus = gameIncome - gameFieldExpense;

        return {
          game,
          payments: gamePayments,
          income: gameIncome,
          expense: gameFieldExpense,
          surplus: gameSurplus,
          gameDateStr
        };
      }).filter(group => group.payments.length > 0 || group.expense > 0);

      // Other/General transactions
      const otherPayments = filteredReportPayments.filter(p => {
        return !safeGames.some(g => isPaymentForGame(p, g));
      });

      const fieldPaymentExpenses = filteredReportExpenses.filter(e => e.category === 'Pago de Terreno');
      const otherExpenses = filteredReportExpenses.filter(e => e.category !== 'Pago de Terreno');

      const aoaData: any[][] = [];
      aoaData.push([config.teamName || 'Reporte Softball']);
      aoaData.push(["REPORTE FINANCIERO OFICIAL (POR JUEGOS)"]);
      const reportDateRange = reportSpecificDate ? formatDate(reportSpecificDate) : 
                            (startDate || endDate ? `${formatDate(startDate || 'Inicio')} - ${formatDate(endDate || 'Hoy')}` : "Todo el historial");
      aoaData.push([`Periodo: ${reportDateRange}`]);
      aoaData.push([]); // Spacer
      
      // Resumen General
      aoaData.push(["RESUMEN FINANCIERO GENERAL"]);
      aoaData.push(["INGRESOS TOTALES", "GASTOS TOTALES", "SALDO NETO"]);
      aoaData.push([liquidIncome, filteredExpensesTotal, liquidBalance]);
      aoaData.push([]); // Spacer
      aoaData.push([]); // Spacer

      if (gameGroups.length > 0) {
        aoaData.push(["DETALLE DE FINANZAS POR JUEGOS"]);
        aoaData.push([]); // Spacer
        
        for (const group of gameGroups) {
          aoaData.push([`Partido: Vs ${group.game.opponent} (${group.gameDateStr})`]);
          aoaData.push(["Fecha", "Concepto / Jugador", "Detalle", "Tipo", "Monto"]);
          
          // Add payments
          group.payments.forEach(p => {
            if (p.description === 'Deuda Pendiente') return;
            aoaData.push([
              formatDate(p.eventDate || ''),
              p.playerName,
              p.description,
              "Ingreso",
              p.amount
            ]);
          });
          
          
          // Subtotal row
          aoaData.push([
            "", 
            "SUBTOTAL JUEGO", 
            `Recaudado: ${formatCurrency(group.income)} | Costo Campo: ${formatCurrency(group.expense)}`, 
            "Balance", 
            group.surplus
          ]);
          aoaData.push([]); // Spacer row
        }
      }

      // General Incomes (not associated to games)
      const incomesNotGame = otherPayments.filter(t => t.description !== 'Deuda Pendiente');
      if (incomesNotGame.length > 0) {
        aoaData.push(["OTROS INGRESOS (NO ASOCIADOS A JUEGOS)"]);
        const incomesGroupedByConcept = incomesNotGame.reduce((acc, tx) => {
          let conceptKey = tx.description;
          if (tx.conceptId) {
            const gc = groupConcepts.find(c => c.id === tx.conceptId || c._id === tx.conceptId);
            if (gc) conceptKey = `[Grup] ${gc.name}`;
          }
          if (!acc[conceptKey]) acc[conceptKey] = [];
          acc[conceptKey].push(tx);
          return acc;
        }, {} as Record<string, typeof incomesNotGame>);

        for (const conceptKey of Object.keys(incomesGroupedByConcept)) {
          const groupPayments = incomesGroupedByConcept[conceptKey];
          const subtotal = groupPayments.reduce((sum, tx) => sum + tx.amount, 0);
          aoaData.push([conceptKey]);
          aoaData.push(["Fecha", "Jugador", "Concepto", "Tipo", "Monto"]);
          groupPayments.forEach(tx => {
            aoaData.push([
              formatDate(tx.eventDate),
              tx.playerName,
              tx.description,
              "Ingreso",
              tx.amount
            ]);
          });
          aoaData.push(["", "", `Subtotal ${conceptKey}` , "", subtotal]);
          aoaData.push([]);
        }
      }

      // Pago de Terreno Expenses
      if (fieldPaymentExpenses.length > 0) {
        aoaData.push(["PAGO DE TERRENO"]);
        aoaData.push(["Fecha", "Categoría", "Descripción", "Tipo", "Monto"]);
        
        fieldPaymentExpenses.forEach(tx => {
          aoaData.push([
            formatDate(tx.eventDate),
            tx.category,
            tx.description,
            "Gasto",
            tx.amount
          ]);
        });
        aoaData.push([]); // Spacer row
      }

      // General Expenses
      if (otherExpenses.length > 0) {
        aoaData.push(["OTROS GASTOS / EGRESOS GENERALES"]);
        aoaData.push(["Fecha", "Categoría", "Descripción", "Tipo", "Monto"]);
        
        otherExpenses.forEach(tx => {
          aoaData.push([
            formatDate(tx.eventDate),
            tx.category,
            tx.description,
            "Gasto",
            tx.amount
          ]);
        });
        aoaData.push([]); // Spacer row
      }

      // Debts
      const debts = filteredReportPayments.filter(t => t.description === 'Deuda Pendiente');
      if (debts.length > 0) {
        aoaData.push([`DEUDAS PENDIENTES POR COBRAR (${debts.length})`]);
        aoaData.push(["Fecha", "Jugador", "Referencia", "Tipo", "Monto"]);
        
        debts.forEach(tx => {
          aoaData.push([
            formatDate(tx.eventDate),
            tx.playerName,
            "Deuda Asistencia",
            "Deuda",
            tx.amount
          ]);
        });
        aoaData.push([]); // Spacer row
      }

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Finanzas");
      
      const fileName = generateFileName('xlsx');
      console.log('[EXPORT-EXCEL] Nombre de archivo:', fileName);

      if (!Capacitor.isNativePlatform()) {
        // Fallback web: descargar directamente
        console.log('[EXPORT-EXCEL] Plataforma web, descargando...');
        XLSX.writeFile(workbook, fileName);
        showMessage('success', `✓ Excel descargado: ${fileName}`);
        return;
      }

      const base64Excel = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

      if (!base64Excel) {
        throw new Error('No se pudo generar el Excel');
      }

      console.log('[EXPORT-EXCEL] Base64 Excel generado, tamaño:', base64Excel.length, 'bytes');

      // Android/iOS: intentar con plugin personalizado primero
      if (ExportPluginImpl) {
        try {
          console.log('[EXPORT-EXCEL] Intentando usar ExportPlugin personalizado...');
          const result = await ExportPluginImpl.exportExcel({
            data: base64Excel,
            fileName: fileName
          });
          console.log('[EXPORT-EXCEL] Éxito con ExportPlugin:', result);
          showMessage('success', `✓ ${result.message}`);
          return;
        } catch (pluginError: any) {
          console.warn('[EXPORT-EXCEL] ExportPlugin falló, usando Filesystem:', pluginError.message);
        }
      }

      // Fallback Android/iOS: usar Filesystem
      console.log('[EXPORT-EXCEL] Guardando en Filesystem...');
      await Filesystem.writeFile({
        path: fileName,
        data: base64Excel,
        directory: Directory.Documents,
        recursive: true
      });

      console.log('[EXPORT-EXCEL] Archivo guardado en Documents');
      showMessage('success', `✓ Excel guardado: ${fileName}`);

    } catch (error: any) {
      console.error('[EXPORT-EXCEL] Error:', error);
      const errorMsg = error?.message || String(error) || 'Error desconocido';
      showMessage('error', `✗ ${errorMsg}`);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Compartir PDF usando el dialog nativo de Android/iOS
   */
  const shareReportAsNative = async () => {
    try {
      setIsExporting(true);
      console.log('[SHARE] Iniciando compartición nativa del reporte...');
      
      // Generar PDF
      const doc = await generatePDF();
      const base64PDF = doc.output('datauristring').split(',')[1];

      if (!base64PDF) {
        throw new Error('No se pudo generar el PDF');
      }

      const fileName = generateFileName('pdf');
      console.log('[SHARE] Nombre de archivo:', fileName);

      if (!Capacitor.isNativePlatform()) {
        // Web: solo descargar
        console.log('[SHARE] Plataforma web, descargando PDF...');
        const doc = await generatePDF();
        doc.save(fileName);
        showMessage('success', `✓ PDF descargado: ${fileName}`);
        return;
      }

      // Android/iOS: guardar en cache y compartir
      try {
        console.log('[SHARE] Guardando archivo temporal...');
        
        await Filesystem.writeFile({
          path: fileName,
          data: base64PDF,
          directory: Directory.Cache,
          recursive: true
        });

        console.log('[SHARE] Obteniendo URI del archivo...');
        const uriResult: any = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache
        });

        let fileUri = uriResult?.uri || uriResult;
        if (!fileUri) {
          throw new Error('No se pudo obtener la URI del archivo');
        }

        // Asegurar esquema
        if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
          fileUri = `file://${fileUri}`;
        }

        console.log('[SHARE] URI obtenida:', fileUri);
        console.log('[SHARE] Abriendo diálogo de compartir...');

        // Compartir usando API nativa
        await Share.share({
          title: 'Compartir Reporte',
          text: `Reporte financiero de ${config.teamName || 'Softball'} - ${new Date().toLocaleDateString()}`,
          url: fileUri,
          dialogTitle: 'Compartir reporte financiero'
        });

        console.log('[SHARE] Éxito');
        showMessage('success', '✓ Reporte compartido exitosamente');

      } catch (fileError: any) {
        console.error('[SHARE] Error en Filesystem/Share:', fileError);
        const errorMsg = fileError?.message || String(fileError) || 'Error al compartir';
        showMessage('error', `✗ ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('[SHARE] Error general:', error);
      const msg = error?.message || String(error) || 'No se pudo compartir el reporte';
      showMessage('error', `✗ ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Aliased para compatibilidad con código existente (si es necesario en el futuro)
  // const sharePDFWhatsApp = exportPDFModern;
  // const savePDFToPhone = exportPDFModern;
  // const shareExcelWhatsApp = exportExcelModern;
  // const saveExcelToPhone = exportExcelModern;
  // const exportToPDF = exportPDFModern;
  // const exportToExcel = exportExcelModern;

  const hasActiveFilters = reportPlayerFilter !== '' || startDate !== '' || endDate !== '' || reportType !== 'Todos' || (reportSpecificDate !== '' && reportSpecificDate !== undefined);

  const chartChips = [
    { id: 'Ninguno', label: 'Lista', icon: <ClipboardCheck size={18} /> },
    { id: 'Tendencia', label: 'Tendencia', icon: <BarChart2 size={18} /> },
    { id: 'Ingresos', label: 'Ingresos', icon: <TrendingUp size={18} /> },
    { id: 'Gastos', label: 'Gastos', icon: <TrendingDown size={18} /> }
  ];

  return (
    <div className="grid-layout">
      <div className="glass-panel" style={{ width: '100%', gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}><Sliders size={22} color={config.primaryColor} /> {t('Reporte Financiero', config.language)}</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-start' }}>
             <button onClick={() => setIsReportFilterModalOpen(true)} className="btn-primary" style={{ flex: 1, minWidth: '100px', background: hasActiveFilters ? `linear-gradient(135deg, ${config.primaryColor} 0%, #2563eb 100%)` : 'rgba(255,255,255,0.05)', border: hasActiveFilters ? 'none' : '1px solid rgba(255,255,255,0.1)', padding: '0.6rem', gap: '0.4rem', fontSize: '0.85rem' }}>
              <Search size={18} /> {t('Filtrar', config.language)}
              {hasActiveFilters && <span style={{ background: '#ef4444', borderRadius: '50%', width: '8px', height: '8px', marginLeft: '2px' }}></span>}
            </button>
            <button 
              type="button"
              onClick={() => { void exportPDFModern(); }}
              disabled={isExporting}
              className="btn-primary" 
              style={{ 
                flex: 1, 
                minWidth: '100px', 
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', 
                color: '#ffffff',
                fontWeight: '700',
                padding: '0.6rem', 
                gap: '0.4rem', 
                fontSize: '0.85rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: isExporting ? 0.6 : 1,
                cursor: isExporting ? 'not-allowed' : 'pointer',
                border: 'none'
              }}
            >
              <FileText size={18} /> PDF
            </button>
            
            <button 
              type="button"
              onClick={() => { void exportExcelModern(); }}
              disabled={isExporting}
              className="btn-primary" 
              style={{ 
                flex: 1, 
                minWidth: '100px', 
                background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', 
                color: '#ffffff',
                fontWeight: '700',
                padding: '0.6rem', 
                gap: '0.4rem', 
                fontSize: '0.85rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: isExporting ? 0.6 : 1,
                cursor: isExporting ? 'not-allowed' : 'pointer',
                border: 'none'
              }}
            >
              <FileSpreadsheet size={18} /> Excel
            </button>
            
            <button 
              type="button"
              onClick={() => { void shareReportAsNative(); }}
              disabled={isExporting}
              className="btn-primary" 
              style={{ 
                flex: 1, 
                minWidth: '100px', 
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', 
                color: '#ffffff',
                fontWeight: '700',
                padding: '0.6rem', 
                gap: '0.4rem', 
                fontSize: '0.85rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: isExporting ? 0.6 : 1,
                cursor: isExporting ? 'not-allowed' : 'pointer',
                border: 'none'
              }}
            >
              <Share2 size={18} /> Compartir
            </button>
          </div>
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {chartChips.map(chip => {
              const active = activeChart === chip.id;
              return (
                <div 
                  key={chip.id}
                  onClick={() => { setActiveChart(chip.id); setChartView(chip.id); }}
                  style={{
                    padding: '0.5rem 0.8rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', transition: 'all 0.2s',
                    background: active ? `${config.primaryColor}20` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? config.primaryColor : 'rgba(255,255,255,0.1)'}`,
                    color: active ? config.primaryColor : '#94a3b8',
                    display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '1', minWidth: '94px', justifyContent: 'center'
                  }}
                >
                  {chip.icon} {chip.label}
                </div>
              );
            })}
          </div>
          {renderSearchBar(t('Buscar concepto o descripción...', config.language), reportSearch, setReportSearch, allConcepts)}
          
          {/* Mensaje de exportación */}
          {exportMessage && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: exportMessage.type === 'success' 
                ? 'rgba(34, 197, 94, 0.1)'
                : exportMessage.type === 'error'
                ? 'rgba(239, 68, 68, 0.1)'
                : 'rgba(14, 165, 233, 0.1)',
              border: `1px solid ${exportMessage.type === 'success' 
                ? 'rgba(34, 197, 94, 0.3)'
                : exportMessage.type === 'error'
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(14, 165, 233, 0.3)'}`,
              color: exportMessage.type === 'success'
                ? '#22c55e'
                : exportMessage.type === 'error'
                ? '#ef4444'
                : '#0ea5e9'
            }}>
              {exportMessage.type === 'success' && <CheckCircle size={18} />}
              {exportMessage.type === 'error' && <AlertCircle size={18} />}
              {exportMessage.type === 'info' && <Loader size={18} className="animate-spin" />}
              <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{exportMessage.text}</span>
            </div>
          )}
        </div>
        
        <div className="selection-grid">
           <div className="selection-card" style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '16px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.3rem', fontWeight: 'bold', textTransform: 'uppercase' }}>INGRESOS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#22c55e' }}>{formatCurrency(liquidIncome)}</div>
           </div>
           
           <div className="selection-card" style={{ padding: '1rem', background: 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.2)', borderRadius: '16px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.3rem', fontWeight: 'bold', textTransform: 'uppercase' }}>SALDO</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0ea5e9' }}>{formatCurrency(liquidBalance)}</div>
           </div>

           <div className="selection-card" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.3rem', fontWeight: 'bold', textTransform: 'uppercase' }}>GASTOS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(otherExpensesTotal)}</div>
           </div>

           <div className="selection-card" style={{ padding: '1rem', background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '16px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.3rem', fontWeight: 'bold', textTransform: 'uppercase' }}>PAGO DE TERRENO</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(fieldPaymentTotal)}</div>
           </div>
        </div>
      </div>

      {activeChart !== 'Ninguno' && (
        <div className="glass-panel" style={{ width: '100%', gridColumn: '1 / -1', minHeight: '350px' }}>
          <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>
            {activeChart === 'Tendencia' ? <BarChart2 size={22} color="#8b5cf6" /> : (activeChart === 'Ingresos' ? <TrendingUp size={22} color="#22c55e" /> : <TrendingDown size={22} color="#ef4444" />)}
            {activeChart} Visual
          </h2>
          <div style={{ width: '100%', height: '300px', margin: '0 auto' }}>
            <ResponsiveContainer width="100%" height="100%">
              {activeChart === 'Tendencia' ? (
                <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={activeChart === 'Ingresos' ? incomeData : expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(activeChart === 'Ingresos' ? incomeData : expenseData).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={(activeChart === 'Ingresos' ? COLORS_INCOME : COLORS_EXPENSE)[index % COLORS_INCOME.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ width: '100%', gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: (showMovementsManual || reportSearch.trim().length > 0 || hasActiveFilters) ? '1rem' : '0' }}>
          <h2 className="section-title" style={{ margin: 0 }}><ClipboardCheck size={22} color="#a855f7" /> {t('Movimientos', config.language)} ({combinedTransactions.length})</h2>
          {!(reportSearch.trim().length > 0 || hasActiveFilters) && (
            <button 
              className="btn-secondary" 
              onClick={() => setShowMovementsManual(!showMovementsManual)}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              {showMovementsManual ? 'Ocultar' : 'Ver Movimientos'}
            </button>
          )}
        </div>

        {(showMovementsManual || reportSearch.trim().length > 0 || hasActiveFilters) && (
          <>
            {displayedTransactions.length === 0 ? (
              <div className="empty-state"><h3>No hay registros</h3></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Ingresos */}
                {displayedTransactions.filter((tx: any) => tx.type === 'ingreso').length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#22c55e', marginBottom: '0.75rem' }}>Ingresos</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {displayedTransactions.filter((tx: any) => tx.type === 'ingreso').map((tx: any) => {
                        const isDebt = tx.description === 'Deuda Pendiente';
                        let conceptLabel = tx.title;
                        if (tx.conceptId) {
                          const gc = groupConcepts.find(c => c.id === tx.conceptId || c._id === tx.conceptId);
                          if (gc) conceptLabel = gc.name;
                        }

                        return (
                          <div 
                            key={tx.id} 
                            className="player-card" 
                            style={{ 
                              borderLeft: `4px solid ${isDebt ? '#f59e0b' : '#22c55e'}`,
                              padding: '1rem'
                            }}
                          >
                            <div className="flex-responsive" style={{ gap: '0.5rem' }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: '700', fontSize: '1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{conceptLabel}</span>
                                  <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: isDebt ? '#f59e0b20' : '#22c55e20', color: isDebt ? '#f59e0b' : '#22c55e', fontWeight: 'bold' }}>
                                    {isDebt ? 'DEUDA' : 'INGRESO'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                                  <span style={{fontWeight: 'bold', color: '#e2e8f0'}}>{!isDebt ? tx.title : tx.description}</span> • {formatDate(tx.eventDate)}
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                                <div style={{ fontWeight: '800', fontSize: '1.2rem', color: isDebt ? '#f59e0b' : '#22c55e' }}>
                                  +{formatCurrency(tx.amount)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pago de Terreno */}
                {displayedTransactions.filter((tx: any) => tx.type === 'gasto' && tx.title === 'Pago de Terreno').length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#f59e0b', marginBottom: '0.75rem' }}>Pago de Terreno</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {displayedTransactions.filter((tx: any) => tx.type === 'gasto' && tx.title === 'Pago de Terreno').map((tx: any) => (
                        <div 
                          key={tx.id} 
                          className="player-card" 
                          style={{ 
                            borderLeft: `4px solid #f59e0b`,
                            padding: '1rem'
                          }}
                        >
                          <div className="flex-responsive" style={{ gap: '0.5rem' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>Pago de Terreno</span>
                                <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: '#f59e0b20', color: '#f59e0b', fontWeight: 'bold' }}>
                                  TERRENO
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                                <span style={{fontWeight: 'bold', color: '#e2e8f0'}}>{tx.description}</span> • {formatDate(tx.eventDate)}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <div style={{ fontWeight: '800', fontSize: '1.2rem', color: '#f59e0b' }}>
                                -{formatCurrency(tx.amount)}
                              </div>
                              {tx.receipt && (
                                <button 
                                  onClick={() => setViewingReceipt?.(tx.receipt)}
                                  title={t('Ver Recibo', config.language)}
                                  style={{ 
                                    display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '0.3rem 0.6rem', borderRadius: '8px', fontSize: '0.7rem', cursor: 'pointer' 
                                  }}
                                >
                                  <Eye size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gastos */}
                {displayedTransactions.filter((tx: any) => tx.type === 'gasto' && tx.title !== 'Pago de Terreno').length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#ef4444', marginBottom: '0.75rem' }}>Gastos</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {displayedTransactions.filter((tx: any) => tx.type === 'gasto' && tx.title !== 'Pago de Terreno').map((tx: any) => (
                        <div 
                          key={tx.id} 
                          className="player-card" 
                          style={{ 
                            borderLeft: `4px solid #ef4444`,
                            padding: '1rem'
                          }}
                        >
                          <div className="flex-responsive" style={{ gap: '0.5rem' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{tx.title}</span>
                                <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: '#ef444420', color: '#ef4444', fontWeight: 'bold' }}>
                                  GASTO
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                                <span style={{fontWeight: 'bold', color: '#e2e8f0'}}>{tx.description}</span> • {formatDate(tx.eventDate)}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <div style={{ fontWeight: '800', fontSize: '1.2rem', color: '#ef4444' }}>
                                -{formatCurrency(tx.amount)}
                              </div>
                              {tx.receipt && (
                                <button 
                                  onClick={() => setViewingReceipt?.(tx.receipt)}
                                  title={t('Ver Recibo', config.language)}
                                  style={{ 
                                    display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '0.3rem 0.6rem', borderRadius: '8px', fontSize: '0.7rem', cursor: 'pointer' 
                                  }}
                                >
                                  <Eye size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
