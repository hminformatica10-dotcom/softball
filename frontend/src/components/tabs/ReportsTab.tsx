import React from 'react';
import { Search, Download, BarChart2, TrendingUp, TrendingDown, ClipboardCheck, Sliders, Eye } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { t } from '../../translations';
import type { Payment, Expense, AppConfig } from '../../types';

interface ReportsTabProps {
  config: AppConfig;
  payments: Payment[];
  expenses: Expense[];
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

export const ReportsTab: React.FC<ReportsTabProps> = ({
  config,
  payments,
  expenses,
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
  const [showExportMenu, setShowExportMenu] = React.useState(false);

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

  const filteredReportExpenses = reportType === 'Ingresos' ? [] : expenses.filter(e => {
    const matchSearch = e.category.toLowerCase().includes(reportSearch.toLowerCase()) ||
                        e.description.toLowerCase().includes(reportSearch.toLowerCase());
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
    doc.text("REPORTE FINANCIERO OFICIAL", 15, 30);
    
    const reportDateRange = reportSpecificDate ? formatDate(reportSpecificDate) : 
                          (startDate || endDate ? `${formatDate(startDate || 'Inicio')} - ${formatDate(endDate || 'Hoy')}` : "Todo el historial");
    doc.text(`Periodo: ${reportDateRange}`, 210 - 15, 30, { align: 'right' });

    // --- SUMMARY CARDS ---
    let currentY = 55;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("Resumen Financiero", 15, currentY);
    
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

    // --- DETAILED TABLES ---
    currentY += 40;

    // 1. INCOME TABLE
    const incomes = combinedTransactions.filter(t => t.type === 'ingreso' && t.description !== 'Deuda Pendiente');
    if (incomes.length > 0) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(`Detalle de Ingresos (${incomes.length})`, 15, currentY);
      
      const result = autoTable(doc, {
        startY: currentY + 4,
        head: [["Fecha", "Jugador", "Concepto", "Monto"]],
        body: incomes.map(tx => {
          let conceptText = tx.description;
          if (tx.conceptId) {
            const gc = groupConcepts.find(c => c.id === tx.conceptId || c._id === tx.conceptId);
            if (gc) conceptText = `[Grup] ${gc.name}`;
          }
          return [formatDate(tx.eventDate), tx.title, conceptText, formatCurrency(tx.amount)];
        }),
        headStyles: { fillColor: teamColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: 15, right: 15 }
      });
      currentY = result.finalY + 15;
    }

    // 2. EXPENSE TABLE
    const transExpenses = combinedTransactions.filter(t => t.type === 'gasto');
    if (transExpenses.length > 0) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(`Detalle de Gastos (${transExpenses.length})`, 15, currentY);
      
      const result = autoTable(doc, {
        startY: currentY + 4,
        head: [["Fecha", "Categoría", "Descripción", "Monto"]],
        body: transExpenses.map(tx => [formatDate(tx.eventDate), tx.title, tx.description, formatCurrency(tx.amount)]),
        headStyles: { fillColor: [226, 232, 240], textColor: [71, 85, 105], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: 15, right: 15 }
      });
      currentY = result.finalY + 15;
    }

    // 3. DEBTS TABLE (If any in filter)
    const debts = combinedTransactions.filter(t => t.description === 'Deuda Pendiente');
    if (debts.length > 0) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(14);
      doc.text(`Deudas Pendientes por Cobrar (${debts.length})`, 15, currentY);
      
      autoTable(doc, {
        startY: currentY + 4,
        head: [["Fecha", "Jugador", "Referencia", "Monto"]],
        body: debts.map(tx => [formatDate(tx.eventDate), tx.title, "Deuda Asistencia", formatCurrency(tx.amount)]),
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

  const sharePDFWhatsApp = async () => {
    try {
      const doc = await generatePDF();
      const fileName = `Reporte_${config.teamName}_${new Date().toISOString().split('T')[0]}.pdf`.replace(/\s+/g, '_');
      
      if (Capacitor.isNativePlatform()) {
        const base64PDF = doc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({ 
          path: fileName, 
          data: base64PDF, 
          directory: Directory.Cache 
        });
        await Share.share({ title: 'Reporte Contable', url: savedFile.uri });
      } else {
        doc.save(fileName);
      }
    } catch (err: any) { alert("Error al compartir PDF: " + err.message); }
  };

  const savePDFToPhone = async () => {
    try {
      const doc = await generatePDF();
      const fileName = `Reporte_${config.teamName}_${new Date().toISOString().split('T')[0]}.pdf`.replace(/\s+/g, '_');
      
      if (Capacitor.isNativePlatform()) {
        const base64PDF = doc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({ 
          path: fileName, 
          data: base64PDF, 
          directory: Directory.Cache 
        });
        await Share.share({ title: 'Guardar Reporte PDF', url: savedFile.uri, dialogTitle: 'Selecciona dónde guardar' });
      } else {
        doc.save(fileName);
      }
    } catch (err: any) { alert("Error al guardar PDF: " + err.message); }
  };

  const shareExcelWhatsApp = async () => {
    try {
      const dataToExport = combinedTransactions.map(tx => {
        let conceptText = tx.title;
        if (tx.conceptId) {
          const gc = groupConcepts.find(c => c.id === tx.conceptId || c._id === tx.conceptId);
          if (gc) conceptText = `[Grup] ${gc.name}`;
        }
        return {
          "Fecha": formatDate(tx.eventDate || ''),
          "Tipo": tx.type === 'ingreso' ? (tx.description === 'Deuda Pendiente' ? 'DEUDA' : 'INGRESO') : 'GASTO',
          "Concepto": conceptText,
          "Descripción": tx.description,
          "Nota": tx.notes || '',
          "Monto": tx.amount
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Finanzas");
      const fileName = `Reporte_${config.teamName}.xlsx`;
      if (Capacitor.isNativePlatform()) {
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
        const savedFile = await Filesystem.writeFile({ path: fileName, data: buffer, directory: Directory.Cache });
        await Share.share({ title: 'Reporte Excel', url: savedFile.uri });
      } else XLSX.writeFile(workbook, fileName);
    } catch (err: any) { alert("Error al compartir Excel: " + err.message); }
  };

  const saveExcelToPhone = async () => {
    try {
      const dataToExport = combinedTransactions.map(tx => {
        let conceptText = tx.title;
        if (tx.conceptId) {
          const gc = groupConcepts.find(c => c.id === tx.conceptId || c._id === tx.conceptId);
          if (gc) conceptText = `[Grup] ${gc.name}`;
        }
        return {
          "Fecha": formatDate(tx.eventDate || ''),
          "Tipo": tx.type === 'ingreso' ? (tx.description === 'Deuda Pendiente' ? 'DEUDA' : 'INGRESO') : 'GASTO',
          "Concepto": conceptText,
          "Descripción": tx.description,
          "Nota": tx.notes || '',
          "Monto": tx.amount
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Finanzas");
      const fileName = `Reporte_${config.teamName}.xlsx`;
      if (Capacitor.isNativePlatform()) {
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
        const savedFile = await Filesystem.writeFile({ path: fileName, data: buffer, directory: Directory.Cache });
        await Share.share({ title: 'Guardar Reporte Excel', url: savedFile.uri, dialogTitle: 'Selecciona dónde guardar' });
      } else {
        XLSX.writeFile(workbook, fileName);
      }
    } catch (err: any) { alert("Error al guardar Excel: " + err.message); }
  };

  const exportToPDF = async () => {
    try {
      const doc = await generatePDF();
      const fileName = `Reporte_${config.teamName}_${new Date().toISOString().split('T')[0]}.pdf`.replace(/\s+/g, '_');
      
      if (Capacitor.isNativePlatform()) {
        const base64PDF = doc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({ 
          path: fileName, 
          data: base64PDF, 
          directory: Directory.Cache 
        });
        await Share.share({ title: 'Reporte Contable', url: savedFile.uri });
      } else {
        doc.save(fileName);
      }
    } catch (err: any) { alert("Error al generar PDF: " + err.message); }
  };

  const exportToExcel = async () => {
    try {
      const dataToExport = combinedTransactions.map(tx => {
        let conceptText = tx.title;
        if (tx.conceptId) {
          const gc = groupConcepts.find(c => c.id === tx.conceptId || c._id === tx.conceptId);
          if (gc) conceptText = `[Grup] ${gc.name}`;
        }
        return {
          "Fecha": formatDate(tx.eventDate || ''),
          "Tipo": tx.type === 'ingreso' ? (tx.description === 'Deuda Pendiente' ? 'DEUDA' : 'INGRESO') : 'GASTO',
          "Concepto": conceptText,
          "Descripción": tx.description,
          "Nota": tx.notes || '',
          "Monto": tx.amount
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Finanzas");
      const fileName = `Reporte_${config.teamName}.xlsx`;
      if (Capacitor.isNativePlatform()) {
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
        const savedFile = await Filesystem.writeFile({ path: fileName, data: buffer, directory: Directory.Cache });
        await Share.share({ title: 'Reporte Excel', url: savedFile.uri });
      } else XLSX.writeFile(workbook, fileName);
    } catch (err: any) { alert("Error Excel: " + err.message); }
  };

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
            <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
              <button type="button" onClick={() => setShowExportMenu(prev => !prev)} className="btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '0.6rem', gap: '0.4rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Download size={18} /> Exportar
              </button>
              {showExportMenu && (
                <div style={{ position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, width: '100%', background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', zIndex: 1000, overflow: 'hidden' }}>
                  <button type="button" onClick={() => { setShowExportMenu(false); sharePDFWhatsApp(); }} className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem 1rem', gap: '0.6rem', border: 'none', background: 'transparent', color: '#f8fafc', fontSize: '0.9rem' }}>
                    <Download size={16} /> PDF por WhatsApp
                  </button>
                  <button type="button" onClick={() => { setShowExportMenu(false); savePDFToPhone(); }} className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem 1rem', gap: '0.6rem', border: 'none', background: 'transparent', color: '#f8fafc', fontSize: '0.9rem' }}>
                    <Download size={16} /> Guardar PDF en teléfono
                  </button>
                  <button type="button" onClick={() => { setShowExportMenu(false); shareExcelWhatsApp(); }} className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem 1rem', gap: '0.6rem', border: 'none', background: 'transparent', color: '#f8fafc', fontSize: '0.9rem' }}>
                    <Download size={16} /> Excel por WhatsApp
                  </button>
                  <button type="button" onClick={() => { setShowExportMenu(false); saveExcelToPhone(); }} className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem 1rem', gap: '0.6rem', border: 'none', background: 'transparent', color: '#f8fafc', fontSize: '0.9rem' }}>
                    <Download size={16} /> Guardar Excel en teléfono
                  </button>
                </div>
              )}
            </div>
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
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(filteredExpensesTotal)}</div>
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
        <h2 className="section-title"><ClipboardCheck size={22} color="#a855f7" /> {t('Movimientos', config.language)} ({displayedTransactions.length}{!showingAllForDate && combinedTransactions.length > 5 ? ` de ${combinedTransactions.length}` : ''})</h2>
        {displayedTransactions.length === 0 ? (
          <div className="empty-state"><h3>No hay registros</h3></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {displayedTransactions.map((tx: any) => {
               const isDebt = tx.description === 'Deuda Pendiente';
               const isIncome = tx.type === 'ingreso';
               
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
                    borderLeft: `4px solid ${isIncome ? (isDebt ? '#f59e0b' : '#22c55e') : '#ef4444'}`,
                    padding: '1rem'
                  }}
                >
                  <div className="flex-responsive" style={{ gap: '0.5rem' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{conceptLabel}</span>
                        <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: isIncome ? (isDebt ? '#f59e0b20' : '#22c55e20') : '#ef444420', color: isIncome ? (isDebt ? '#f59e0b' : '#22c55e') : '#ef4444', fontWeight: 'bold' }}>
                           {isIncome ? (isDebt ? 'DEUDA' : 'INGRESO') : 'GASTO'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                        <span style={{fontWeight: 'bold', color: '#e2e8f0'}}>{isIncome && !isDebt ? tx.title : tx.description}</span> • {formatDate(tx.eventDate)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ fontWeight: '800', fontSize: '1.2rem', color: isIncome ? (isDebt ? '#f59e0b' : '#22c55e') : '#ef4444' }}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
