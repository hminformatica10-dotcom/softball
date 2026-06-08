import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Trash2, Calendar, ChevronDown, ChevronUp, Download, Loader, CheckCircle, AlertCircle, Share2, FileText, FileSpreadsheet } from 'lucide-react';
import { t } from '../../translations';
import type { Game, Player, Payment, AppConfig } from '../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Plugin } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

interface ExportPlugin extends Plugin {
  exportPDF(options: { data: string; fileName: string }): Promise<{ success: boolean; uri: string; message: string }>;
  exportExcel(options: { data: string; fileName: string }): Promise<{ success: boolean; uri: string; message: string }>;
}

let ExportPluginImpl: ExportPlugin | null = null;
try {
  ExportPluginImpl = registerPlugin<ExportPlugin>('ExportPlugin') as unknown as ExportPlugin;
} catch {
  console.warn('[INIT] ExportPlugin no disponible en AttendanceTab, usaremos Filesystem');
}


interface ConfirmActionModal {
  isOpen: boolean;
  title: string;
  message: string;
  requiresInput?: boolean;
  inputLabel?: string;
  onConfirm: (val?: string) => void;
}

type MutateFunction = (url: string, method: string, payload: unknown, setter: React.Dispatch<React.SetStateAction<Payment[]>>, cacheKey: string, onSuccess: () => void) => Promise<void>;

interface AttendanceTabProps {
  config: AppConfig;
  games: Game[];
  setGames: React.Dispatch<React.SetStateAction<Game[]>>;
  GAME_API_URL: string;
  paymentControlGameId: string;
  setPaymentControlGameId: (val: string) => void;
  players: Player[];
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  activeTeamId: string;
  PAYMENT_API_URL: string;
  mutateData: MutateFunction;
  formatDate: (dateString: string) => string;
  formatCurrency: (val: number) => string;
  normalizeDate: (dateString: string) => string;
  setConfirmActionModal: (val: ConfirmActionModal) => void;
  setConfirmActionInput: (val: string) => void;
  confirmDelete: (type: string, id: string) => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  config,
  games,
  setGames,
  GAME_API_URL,
  paymentControlGameId,
  setPaymentControlGameId,
  players,
  payments,
  setPayments,
  activeTeamId,
  PAYMENT_API_URL,
  mutateData,
  formatDate,
  formatCurrency,
  normalizeDate,
  setConfirmActionModal,
  setConfirmActionInput,
  confirmDelete
}) => {
  const [isGameListOpen, setIsGameListOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const hexToRgb = (hex: string): [number, number, number] => {
    try {
      const h = hex.replace('#', '');
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return [r, g, b];
    } catch { return [56, 189, 248]; }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setExportMessage({ type, text });
    setTimeout(() => setExportMessage(null), 4000);
  };

  const generateGameFileName = (opponent: string, format: 'pdf' | 'xlsx'): string => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
    const opponentSafe = (opponent || 'Juego').replace(/\s+/g, '_').substring(0, 20);
    return `Asistencia_Vs_${opponentSafe}_${dateStr}.${format}`;
  };

  const generateGamePDF = (
    selectedGame: Game, 
    payersData: any[], 
    totalAmountPaid: number, 
    terrenoPayment: number, 
    surplus: number, 
    countPaid: number, 
    countAbsent: number, 
    countUnpaid: number
  ) => {
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
    doc.text("CONTROL DE ASISTENCIA Y PAGOS POR JUEGO", 15, 30);
    
    const gameDateStr = formatDate(selectedGame.eventDate || selectedGame.date || '');
    doc.text(`Juego: Vs ${selectedGame.opponent} (${gameDateStr})`, 210 - 15, 30, { align: 'right' });

    // --- SUMMARY CARDS ---
    let currentY = 50;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Resumen de Asistencia", 15, currentY);
    
    currentY += 4;
    // Asistencia Cards
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, currentY, 180, 15, 3, 3, 'FD');
    
    doc.setFontSize(9);
    doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
    doc.text("PAGARON", 35, currentY + 6, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(34, 197, 94);
    doc.text(String(countPaid), 35, currentY + 11, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
    doc.text("FALTARON", 105, currentY + 6, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(String(countAbsent), 105, currentY + 11, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
    doc.text("FALTA COBRAR", 175, currentY + 6, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(239, 68, 68);
    doc.text(String(countUnpaid), 175, currentY + 11, { align: 'center' });

    // --- FINANCIAL CARDS ---
    currentY += 23;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Resumen Financiero", 15, currentY);
    
    currentY += 4;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, currentY, 180, 20, 3, 3, 'FD');
    
    doc.setFontSize(9);
    doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
    doc.text("TOTAL RECAUDADO", 45, currentY + 7, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(34, 197, 94);
    doc.text(formatCurrency(totalAmountPaid), 45, currentY + 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
    doc.text("PAGO DE TERRENO", 105, currentY + 7, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(239, 68, 68);
    doc.text(formatCurrency(terrenoPayment), 105, currentY + 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
    doc.text("SOBRANTE", 165, currentY + 7, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(surplus >= 0 ? 37 : 239, surplus >= 0 ? 99 : 68, surplus >= 0 ? 235 : 68);
    doc.text(formatCurrency(surplus), 165, currentY + 15, { align: 'center' });

    // --- DETAILED ROSTER TABLE ---
    currentY += 30;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Listado de Jugadores", 15, currentY);

    autoTable(doc, {
      startY: currentY + 4,
      head: [["Dorsal", "Jugador", "Estado", "Monto Pagado"]],
      body: payersData.map(item => {
        let statusText = 'Falta Cobrar';
        if (item.status === 'paid') statusText = 'Pagó';
        else if (item.status === 'absent') statusText = 'Ausente';
        else if (item.status === 'debt') statusText = `Deuda (${formatCurrency(item.displayPayment?.amount || 0)})`;

        return [
          `#${item.player.jerseyNumber || ''}`,
          item.player.name,
          statusText,
          item.status === 'paid' ? formatCurrency(item.paidAmount) : formatCurrency(0)
        ];
      }),
      headStyles: { fillColor: teamColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 15, right: 15 }
    });

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

  const exportGamePDF = async (
    selectedGame: Game, 
    payersData: any[], 
    totalAmountPaid: number, 
    terrenoPayment: number, 
    surplus: number, 
    countPaid: number, 
    countAbsent: number, 
    countUnpaid: number
  ) => {
    try {
      setIsExporting(true);
      const doc = generateGamePDF(selectedGame, payersData, totalAmountPaid, terrenoPayment, surplus, countPaid, countAbsent, countUnpaid);
      const base64PDF = doc.output('datauristring').split(',')[1];

      if (!base64PDF) throw new Error('No se pudo generar el PDF');

      const fileName = generateGameFileName(selectedGame.opponent, 'pdf');

      if (!Capacitor.isNativePlatform()) {
        doc.save(fileName);
        showMessage('success', `✓ PDF descargado: ${fileName}`);
        setShowExportMenu(false);
        return;
      }

      if (ExportPluginImpl) {
        try {
          const result = await ExportPluginImpl.exportPDF({ data: base64PDF, fileName });
          showMessage('success', `✓ ${result.message}`);
          setShowExportMenu(false);
          return;
        } catch (pluginError: any) {
          console.warn('[EXPORT-PDF] ExportPlugin falló, usando Filesystem:', pluginError.message);
        }
      }

      await Filesystem.writeFile({
        path: fileName,
        data: base64PDF,
        directory: Directory.Documents,
        recursive: true
      });
      showMessage('success', `✓ PDF guardado: ${fileName}`);
      setShowExportMenu(false);
    } catch (error: any) {
      console.error('[EXPORT-PDF] Error:', error);
      showMessage('error', `✗ ${error?.message || String(error)}`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportGameExcel = async (
    selectedGame: Game, 
    payersData: any[], 
    totalAmountPaid: number, 
    terrenoPayment: number, 
    surplus: number, 
    countPaid: number, 
    countAbsent: number, 
    countUnpaid: number
  ) => {
    try {
      setIsExporting(true);

      const dataToExport = payersData.map(item => {
        let statusText = 'Falta Cobrar';
        if (item.status === 'paid') statusText = 'Pagó';
        else if (item.status === 'absent') statusText = 'Ausente';
        else if (item.status === 'debt') statusText = `Deuda (${formatCurrency(item.displayPayment?.amount || 0)})`;

        return {
          "Dorsal": item.player.jerseyNumber || '',
          "Jugador": item.player.name,
          "Estado": statusText,
          "Monto Pagado": item.status === 'paid' ? item.paidAmount : 0
        };
      });

      // Añadir fila de totales y resúmenes
      dataToExport.push({ "Dorsal": "", "Jugador": "", "Estado": "", "Monto Pagado": 0 }); // fila vacía
      dataToExport.push({ "Dorsal": "RESUMEN", "Jugador": "Total Recaudado", "Estado": "", "Monto Pagado": totalAmountPaid });
      dataToExport.push({ "Dorsal": "", "Jugador": "Pago de Terreno", "Estado": "", "Monto Pagado": terrenoPayment });
      dataToExport.push({ "Dorsal": "", "Jugador": "Sobrante", "Estado": "", "Monto Pagado": surplus });
      dataToExport.push({ "Dorsal": "", "Jugador": "Pagaron", "Estado": String(countPaid), "Monto Pagado": 0 });
      dataToExport.push({ "Dorsal": "", "Jugador": "Faltaron", "Estado": String(countAbsent), "Monto Pagado": 0 });
      dataToExport.push({ "Dorsal": "", "Jugador": "Falta Cobrar", "Estado": String(countUnpaid), "Monto Pagado": 0 });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia y Pagos");
      
      const base64Excel = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

      if (!base64Excel) throw new Error('No se pudo generar el Excel');

      const fileName = generateGameFileName(selectedGame.opponent, 'xlsx');

      if (!Capacitor.isNativePlatform()) {
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia y Pagos");
        XLSX.writeFile(workbook, fileName);
        showMessage('success', `✓ Excel descargado: ${fileName}`);
        setShowExportMenu(false);
        return;
      }

      if (ExportPluginImpl) {
        try {
          const result = await ExportPluginImpl.exportExcel({ data: base64Excel, fileName });
          showMessage('success', `✓ ${result.message}`);
          setShowExportMenu(false);
          return;
        } catch (pluginError: any) {
          console.warn('[EXPORT-EXCEL] ExportPlugin falló, usando Filesystem:', pluginError.message);
        }
      }

      await Filesystem.writeFile({
        path: fileName,
        data: base64Excel,
        directory: Directory.Documents,
        recursive: true
      });
      showMessage('success', `✓ Excel guardado: ${fileName}`);
      setShowExportMenu(false);
    } catch (error: any) {
      console.error('[EXPORT-EXCEL] Error:', error);
      showMessage('error', `✗ ${error?.message || String(error)}`);
    } finally {
      setIsExporting(false);
    }
  };

  const shareGamePDF = async (
    selectedGame: Game, 
    payersData: any[], 
    totalAmountPaid: number, 
    terrenoPayment: number, 
    surplus: number, 
    countPaid: number, 
    countAbsent: number, 
    countUnpaid: number
  ) => {
    try {
      setIsExporting(true);
      const doc = generateGamePDF(selectedGame, payersData, totalAmountPaid, terrenoPayment, surplus, countPaid, countAbsent, countUnpaid);
      const base64PDF = doc.output('datauristring').split(',')[1];

      if (!base64PDF) throw new Error('No se pudo generar el PDF');

      const fileName = generateGameFileName(selectedGame.opponent, 'pdf');

      if (!Capacitor.isNativePlatform()) {
        doc.save(fileName);
        showMessage('success', `✓ PDF descargado: ${fileName}`);
        setShowExportMenu(false);
        return;
      }

      await Filesystem.writeFile({
        path: fileName,
        data: base64PDF,
        directory: Directory.Cache,
        recursive: true
      });

      const uriResult: any = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache
      });

      let fileUri = uriResult?.uri || uriResult;
      if (!fileUri) throw new Error('No se pudo obtener la URI del archivo');

      if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
        fileUri = `file://${fileUri}`;
      }

      await Share.share({
        title: 'Compartir Asistencia',
        text: `Asistencia y Pagos - Vs ${selectedGame.opponent} (${formatDate(selectedGame.eventDate || selectedGame.date || '')})`,
        url: fileUri,
        dialogTitle: 'Compartir reporte de asistencia'
      });

      showMessage('success', '✓ Reporte compartido exitosamente');
      setShowExportMenu(false);
    } catch (error: any) {
      console.error('[SHARE] Error:', error);
      showMessage('error', `✗ ${error?.message || String(error)}`);
    } finally {
      setIsExporting(false);
    }
  };


  const updateGameTotals = useCallback((game: Game) => {
    if (!game) return;
    // Recalcula total desde pagos actuales
    const total = payments.reduce((sum, p) => {
      const isForGame = p.gameId ? p.gameId === game.id : (() => {
        const expectedNotesFragment = `Vs ${game.opponent}`.toLowerCase();
        const notesMatch = !!(p.notes && p.notes.toLowerCase().includes(expectedNotesFragment));
        if (!notesMatch) return false;
        const pDate = (p.eventDate || p.date || '').split('T')[0];
        const gDate = (game.eventDate || game.date || '').split('T')[0];
        return pDate === gDate;
      })();
      
      if (isForGame) {
        if (['Pago de Play', 'Pago Triangular', 'Pago Cuadrangular', 'Pago Torneo'].includes(p.description)) {
          return sum + (Number(p.amount) || 0);
        }
      }
      return sum;
    }, 0);
    const terreno = Number(game.fieldPayment || 0);
    const surplus = total - terreno;

    if (Number(game.collectedTotal || 0) === total && Number(game.surplus || 0) === surplus) {
      return;
    }

    const updated = { ...game, collectedTotal: total, surplus } as Game & { id: string };
    // Persistir en backend la información del juego
    mutateData(GAME_API_URL, 'PUT', updated, setGames, `softball_games_${activeTeamId}`, () => {});
  }, [payments, mutateData, GAME_API_URL, setGames, activeTeamId]);

  useEffect(() => {
    if (!paymentControlGameId) return;
    const selectedGame = games.find(g => g.id === paymentControlGameId);
    if (selectedGame) {
      updateGameTotals(selectedGame);
    }
    // Recalculate whenever payments or games change
  }, [paymentControlGameId, payments, games, updateGameTotals]);

  const parseGameFee = (value: string | number | undefined): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const normalized = String(value).trim().replace(',', '.').replace(/[^0-9.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const markPlayerPaid = (player: Player) => {
    const selectedGame = games.find(g => g.id === paymentControlGameId);
    if (!selectedGame) return;

    const gameFee = parseGameFee(selectedGame.feePerPerson);
    
    // Si no hay cuota definida, pedir al usuario que ingrese el monto
    if (!gameFee || gameFee <= 0) {
      setConfirmActionInput('0');
      setConfirmActionModal({
        isOpen: true,
        title: 'Registrar Pago',
        message: `¿Cuánto pagó ${player.name} por este juego?`,
        requiresInput: true,
        inputLabel: 'Monto ($)',
        onConfirm: (val?: string) => {
          const amount = Number(val) || 0;
          if (amount <= 0) {
            alert('Por favor ingresa un monto válido');
            return;
          }
          
          // Evitar duplicados
          const already = payments.find(p => p.playerId === player.id && p.gameId === selectedGame.id && ['Pago de Play', 'Pago Triangular', 'Pago Cuadrangular', 'Pago Torneo'].includes(p.description));
          if (already) return;

          const payload = {
            playerId: player.id,
            playerName: player.name,
            amount: amount,
            description: 'Pago de Play',
            notes: `Juego Vs ${selectedGame.opponent} (${formatDate(selectedGame.eventDate || selectedGame.date || '')})`,
            eventDate: normalizeDate(selectedGame.eventDate),
            gameId: selectedGame.id,
            fieldPayment: selectedGame.fieldPayment !== undefined ? Number(selectedGame.fieldPayment) : undefined
          } as unknown as Payment;

          try {
            mutateData(PAYMENT_API_URL, 'POST', payload, setPayments, `softball_payments_${activeTeamId}`, (success: boolean) => {
              if (success) {
                updateGameTotals(selectedGame);
              }
            });
          } catch (err) {
            console.error('Error marking player paid', err);
          }
        }
      });
      return;
    }

    // Evitar duplicados: existe un pago tipo 'Pago de Play' para este jugador y juego?
    const already = payments.find(p => p.playerId === player.id && p.gameId === selectedGame.id && ['Pago de Play', 'Pago Triangular', 'Pago Cuadrangular', 'Pago Torneo'].includes(p.description));
    if (already) return; // ya marcado como pagado

    const payload = {
      playerId: player.id,
      playerName: player.name,
      amount: gameFee,
      description: 'Pago de Play',
      notes: `Juego Vs ${selectedGame.opponent} (${formatDate(selectedGame.eventDate || selectedGame.date || '')})`,
      eventDate: normalizeDate(selectedGame.eventDate),
      gameId: selectedGame.id,
      fieldPayment: selectedGame.fieldPayment !== undefined ? Number(selectedGame.fieldPayment) : undefined
    } as unknown as Payment;

    try {
      mutateData(PAYMENT_API_URL, 'POST', payload, setPayments, `softball_payments_${activeTeamId}`, (success: boolean) => {
        if (success) {
          // Recalcular totales y persistir en el juego
          updateGameTotals(selectedGame);
        }
      });
    } catch (err) {
      console.error('Error marking player paid', err);
    }
  };

  const sortedGames = [...games].sort((a, b) => new Date(b.eventDate || b.date || 0).getTime() - new Date(a.eventDate || a.date || 0).getTime());
  const displayedGames = showAll ? sortedGames : sortedGames.slice(0, 3);

  return (
    <div className="grid-layout">
      <div className="glass-panel" style={{ width: '100%', gridColumn: '1 / -1' }}>
        <h2 className="section-title"><ClipboardCheck size={24} color={config.primaryColor} />{t('Asistencia y Pagos', config.language)} </h2>
        
        {!paymentControlGameId && (
        <div style={{ marginBottom: '1.5rem' }}>
          
          <button 
            className="btn-primary" 
            onClick={() => setIsGameListOpen(!isGameListOpen)}
            style={{ width: '100%', padding: '1rem', background: `linear-gradient(135deg, ${config.primaryColor} 0%, #2563eb 100%)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} />
              <span style={{ fontSize: '1.05rem' }}>{t('Seleccionar Partido', config.language)}</span>
            </div>
            {isGameListOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {isGameListOpen && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {displayedGames.map((g, idx) => {
                return (
                  <div 
                    key={g.id} 
                    className="selection-card"
                    onClick={() => { setPaymentControlGameId(g.id); setIsGameListOpen(false); setShowAll(false); }}
                    style={{ 
                      width: '100%',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      padding: '1.25rem',
                      borderRadius: '16px',
                      transition: 'all 0.2s ease',
                      animation: `fadeInUp 0.4s ease forwards`,
                      animationDelay: `${idx * 0.08}s`,
                      opacity: 0,
                      transform: 'translateY(10px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className="selection-card-icon" style={{ color: config.primaryColor, background: `${config.primaryColor}20`, padding: '0.75rem', borderRadius: '14px' }}>
                        <Calendar size={24} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '800', color: '#f8fafc', fontSize: '1.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Vs {g.opponent}</div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem', fontWeight: '500' }}>{formatDate(g.eventDate || g.date || '')}</div>
                      </div>
                      <div style={{ color: config.primaryColor, background: `${config.primaryColor}10`, padding: '0.5rem', borderRadius: '50%' }}>
                        <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {sortedGames.length > 3 && !showAll && (
                <button 
                  onClick={() => setShowAll(true)} 
                  style={{ 
                    marginTop: '0.5rem', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', color: config.primaryColor, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', 
                    fontWeight: '700', fontSize: '0.9rem', width: '100%', padding: '1rem', borderRadius: '16px',
                    animation: `fadeInUp 0.4s ease forwards`, animationDelay: `${displayedGames.length * 0.08}s`, opacity: 0
                  }}
                >
                  <ChevronDown size={18} /> {t('Ver más juegos pasados', config.language)} ({sortedGames.length - 3})
                </button>
              )}
              {sortedGames.length === 0 && (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>No se encontraron juegos registrados.</p>
              )}
            </div>
          )}
        </div>
        )}

        {paymentControlGameId ? (() => {
            const selectedGame = games.find(g => g.id === paymentControlGameId);
            if (!selectedGame) return null;
            const gameDateStr = formatDate(selectedGame.eventDate || selectedGame.date || '');
            const expectedNotesFragment1 = `Vs ${selectedGame.opponent}`;
            const paidDescriptions = ['Pago de Play', 'Pago Triangular', 'Pago Cuadrangular', 'Pago Torneo'];
            const attendanceDescriptions = [...paidDescriptions, 'Ausente', 'Deuda Pendiente'];

            const matchesSelectedGame = (payment: Payment) => {
              if (payment.gameId) {
                return payment.gameId === selectedGame.id;
              }
              const expectedNotesFragment = `Vs ${selectedGame.opponent}`.toLowerCase();
              const notesMatch = !!(payment.notes && payment.notes.toLowerCase().includes(expectedNotesFragment));
              if (!notesMatch) return false;
              const pDate = (payment.eventDate || payment.date || '').split('T')[0];
              const gDate = (selectedGame.eventDate || selectedGame.date || '').split('T')[0];
              return pDate === gDate;
            };

            const getPlayerGamePayments = (playerId: string) =>
              payments.filter(pay => pay.playerId === playerId && attendanceDescriptions.includes(pay.description) && matchesSelectedGame(pay));

            const payers = [...players].filter(p => p.isActive !== false).sort((a, b) => a.name.localeCompare(b.name)).map(p => {
              const playerPayments = getPlayerGamePayments(p.id);
              const paidPayments = playerPayments.filter(pay => paidDescriptions.includes(pay.description));
              const absentPayment = playerPayments.find(pay => pay.description === 'Ausente');
              const debtPayment = playerPayments.find(pay => pay.description === 'Deuda Pendiente');
              return {
                player: p,
                payments: playerPayments,
                paidAmount: paidPayments.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0),
                status: paidPayments.length > 0 ? 'paid' : absentPayment ? 'absent' : debtPayment ? 'debt' : 'unpaid',
                displayPayment: paidPayments.length > 0 ? paidPayments[paidPayments.length - 1] : absentPayment || debtPayment,
              };
            });

            const countPaid = payers.filter(p => p.status === 'paid').length;
            const countAbsent = payers.filter(p => p.status === 'absent').length;
            const countUnpaid = payers.filter(p => p.status === 'unpaid').length;
            const totalAmountPaid = payments.reduce((sum, pay) => {
              if (paidDescriptions.includes(pay.description) && matchesSelectedGame(pay)) {
                return sum + (Number(pay.amount) || 0);
              }
              return sum;
            }, 0);
            const terrenoPayment = Number(selectedGame.fieldPayment || 0);
            const surplus = totalAmountPaid - terrenoPayment;

            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', padding: '1rem', background: `${config.primaryColor}15`, borderRadius: '12px', border: `1px solid ${config.primaryColor}40` }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>Vs {selectedGame.opponent}</h3>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>{gameDateStr}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className="btn-secondary" onClick={() => { setPaymentControlGameId(''); setIsGameListOpen(true); setShowAll(false); }} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', whiteSpace: 'nowrap' }}>
                      Cambiar Partido
                    </button>
                    
                    <div style={{ position: 'relative' }}>
                      <button 
                        disabled={isExporting}
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="btn-primary" 
                        style={{ 
                          fontSize: '0.8rem', 
                          padding: '0.4rem 0.8rem', 
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                          color: '#0f172a',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          width: 'auto',
                          opacity: isExporting ? 0.6 : 1,
                          cursor: isExporting ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isExporting ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
                        Exportar
                      </button>
                      
                      {showExportMenu && !isExporting && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: '0.5rem',
                          background: 'rgba(15, 23, 42, 0.98)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '12px',
                          backdropFilter: 'blur(10px)',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                          zIndex: 1000,
                          minWidth: '170px',
                          overflow: 'hidden'
                        }}>
                          <button 
                            onClick={() => { void exportGamePDF(selectedGame, payers, totalAmountPaid, terrenoPayment, surplus, countPaid, countAbsent, countUnpaid); }}
                            style={{
                              width: '100%',
                              padding: '0.7rem 0.9rem',
                              border: 'none',
                              background: 'transparent',
                              color: '#f8fafc',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              transition: 'background 0.2s',
                              borderBottom: '1px solid rgba(255,255,255,0.1)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <FileText size={14} /> PDF
                          </button>
                          
                          <button 
                            onClick={() => { void exportGameExcel(selectedGame, payers, totalAmountPaid, terrenoPayment, surplus, countPaid, countAbsent, countUnpaid); }}
                            style={{
                              width: '100%',
                              padding: '0.7rem 0.9rem',
                              border: 'none',
                              background: 'transparent',
                              color: '#f8fafc',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              transition: 'background 0.2s',
                              borderBottom: '1px solid rgba(255,255,255,0.1)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <FileSpreadsheet size={14} /> Excel
                          </button>
                          
                          <button 
                            onClick={() => { void shareGamePDF(selectedGame, payers, totalAmountPaid, terrenoPayment, surplus, countPaid, countAbsent, countUnpaid); }}
                            style={{
                              width: '100%',
                              padding: '0.7rem 0.9rem',
                              border: 'none',
                              background: 'transparent',
                              color: '#f8fafc',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <Share2 size={14} /> Compartir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {exportMessage && (
                  <div style={{
                    marginBottom: '1.25rem',
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

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '0.5rem', 
                  marginBottom: '1.25rem', 
                  padding: '1rem', 
                  background: 'rgba(255,255,255,0.03)', 
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#22c55e', fontSize: '1.4rem', fontWeight: '800' }}>{countPaid}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Pagó</div>
                  </div>
                  <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ color: '#94a3b8', fontSize: '1.4rem', fontWeight: '800' }}>{countAbsent}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Faltó</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#ef4444', fontSize: '1.4rem', fontWeight: '800' }}>{countUnpaid}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Falta</div>
                  </div>
                </div>
                
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                }}>
                  <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px dashed rgba(34, 197, 94, 0.3)', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ fontWeight: '800', color: '#22c55e', fontSize: '1.2rem' }}>{formatCurrency(totalAmountPaid)}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginTop: '0.5rem' }}>Total Recaudado</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px dashed rgba(239, 68, 68, 0.3)', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ fontWeight: '800', color: '#ef4444', fontSize: '1.2rem' }}>{formatCurrency(terrenoPayment)}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginTop: '0.5rem' }}>Pago de Terreno</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px dashed rgba(59, 130, 246, 0.3)', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ fontWeight: '800', color: surplus >= 0 ? '#2563eb' : '#ef4444', fontSize: '1.2rem' }}>{formatCurrency(surplus)}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginTop: '0.5rem' }}>Sobrante</div>
                  </div>
                </div>

                {payers.length === 0 ? <div className="empty-state"><h3>Roster vacío.</h3></div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {payers.map(({ player, status, paidAmount, displayPayment }) => (
                      <div key={player.id} className="player-card" style={{ borderLeft: `5px solid ${status === 'absent' ? '#94a3b8' : status === 'debt' ? '#f59e0b' : status === 'paid' ? '#22c55e' : '#ef4444'}` }}>
                        <div className="flex-responsive" style={{ gap: '0.75rem' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name} <span style={{fontSize: '0.8em', color: '#94a3b8', fontWeight: 'normal'}}>#{player.jerseyNumber}</span></div>
                            <div style={{ fontSize: '0.75rem', color: status === 'absent' ? '#94a3b8' : status === 'debt' ? '#f59e0b' : status === 'paid' ? '#22c55e' : '#ef4444', marginTop: '0.1rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                              {status === 'paid' ? `Pagó ${formatCurrency(paidAmount)}` : status === 'absent' ? 'Ausente' : status === 'debt' ? `Deuda ${formatCurrency(displayPayment?.amount || 0)}` : 'Falta Cobrar'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                            {status === 'unpaid' ? (
                              <>
                                <button onClick={() => markPlayerPaid(player)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1, minWidth: '70px', background: '#22c55e' }}>Pagó</button>
                                <button 
                                  onClick={() => {
                                    setConfirmActionModal({
                                      isOpen: true,
                                      title: 'Ausencia',
                                      message: `¿${player.name} faltó?`,
                                      onConfirm: () => {
                                        try {
                                          const payload = { playerId: player.id, playerName: player.name, amount: 0, description: 'Ausente', notes: `Juego Vs ${selectedGame.opponent} (${gameDateStr})`, eventDate: normalizeDate(selectedGame.eventDate), gameId: selectedGame.id };
                                          mutateData(PAYMENT_API_URL, 'POST', payload, setPayments, `softball_payments_${activeTeamId}`, () => { updateGameTotals(selectedGame); });
                                        } catch { alert("Error"); }
                                      }
                                    });
                                  }} 
                                  className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1, minWidth: '70px' }}
                                >Ausente</button>
                                <button 
                                  onClick={() => {
                                    setConfirmActionInput('10');
                                    setConfirmActionModal({
                                      isOpen: true,
                                      title: 'Asignar Deuda',
                                      message: `¿Deseas marcar una deuda a ${player.name}?`,
                                      requiresInput: true,
                                      inputLabel: 'Monto de la Deuda ($)',
                                      onConfirm: (val?: string) => {
                                        const amount = Number(val) || 10;
                                        try {
                                          const payload = { playerId: player.id, playerName: player.name, amount, description: 'Deuda Pendiente', notes: `Juego Vs ${selectedGame.opponent} (${gameDateStr})`, eventDate: normalizeDate(selectedGame.eventDate), gameId: selectedGame.id };
                                          mutateData(PAYMENT_API_URL, 'POST', payload, setPayments, `softball_payments_${activeTeamId}`, () => { updateGameTotals(selectedGame); });
                                        } catch { alert("Error"); }
                                      }
                                    });
                                  }} 
                                  className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', flex: 1, minWidth: '70px' }}
                                >Deuda</button>
                              </>
                            ) : (
                               <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                 <button className="btn-icon" onClick={() => confirmDelete('payment', displayPayment?.id || '')} style={{ color: '#ef4444' }}><Trash2 size={20} /></button>
                               </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })() : null}
      </div>
    </div>
  );
};
