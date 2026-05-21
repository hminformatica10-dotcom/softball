import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Trash2, Search, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { t } from '../../translations';
import type { Game, Player, Payment, AppConfig } from '../../types';

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
  handleQuickPayment: (player: Player, gameId: string, gameDateStr: string, gameOpponent: string, rawDate: string, gameFee?: number | string, fieldFee?: number | string) => void;
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
  handleQuickPayment,
  setConfirmActionModal,
  setConfirmActionInput,
  confirmDelete
}) => {
  const [isGameListOpen, setIsGameListOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!paymentControlGameId) return;
    const selectedGame = games.find(g => g.id === paymentControlGameId);
    if (selectedGame) {
      updateGameTotals(selectedGame);
    }
    // Recalculate whenever payments or games change
  }, [paymentControlGameId, payments, games]);

  const updateGameTotals = (game: Game) => {
    if (!game) return;
    // Recalcula total desde pagos actuales
    const total = payments.reduce((sum, p) => {
      if ((p.gameId && p.gameId === game.id) || (p.notes && p.notes.includes(`Vs ${game.opponent}`))) {
        if (['Pago de Play', 'Pago Triangular', 'Pago Cuadrangular', 'Pago Torneo'].includes(p.description)) {
          return sum + (Number(p.amount) || 0);
        }
      }
      return sum;
    }, 0);
    const terreno = Number(game.fieldPayment || 0);
    const surplus = total - terreno;

    const updated = { ...game, collectedTotal: total, surplus } as Game & { id: string };
    // Persistir en backend la información del juego
    mutateData(GAME_API_URL, 'PUT', updated, setGames, `softball_games_${activeTeamId}`, () => {});
  };

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
    if (!gameFee || gameFee <= 0) {
      alert('Debes registrar la cuota por juego del partido antes de marcar un pago.');
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
              return (payment.gameId && payment.gameId === selectedGame.id) || (payment.notes && payment.notes.includes(expectedNotesFragment1));
            };

            const getPlayerGamePayments = (playerId: string) =>
              payments.filter(pay => pay.playerId === playerId && attendanceDescriptions.includes(pay.description) && matchesSelectedGame(pay));

            const payers = [...players].sort((a, b) => a.name.localeCompare(b.name)).map(p => {
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
                  <button className="btn-secondary" onClick={() => { setPaymentControlGameId(''); setIsGameListOpen(true); setShowAll(false); }} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                    Cambiar Partido
                  </button>
                </div>
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
