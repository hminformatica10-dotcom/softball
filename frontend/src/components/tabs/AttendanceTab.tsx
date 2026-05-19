import React, { useState } from 'react';
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
  handleQuickPayment: (player: Player, gameDateStr: string, gameOpponent: string, rawDate: string, gameFee?: number | string) => void;
  setConfirmActionModal: (val: ConfirmActionModal) => void;
  setConfirmActionInput: (val: string) => void;
  confirmDelete: (type: string, id: string) => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  config,
  games,
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
            
            const payers = [...players].sort((a, b) => a.name.localeCompare(b.name)).map(p => {
              const hasPaid = payments.find(pay => 
                pay.playerId === p.id && 
                ['Pago de Play', 'Pago Triangular', 'Pago Cuadrangular', 'Pago Torneo', 'Ausente'].includes(pay.description) && 
                pay.notes && 
                pay.notes.includes(expectedNotesFragment1)
              );
              return { player: p, payment: hasPaid };
            });
            
            const countPaid = payers.filter(p => p.payment && p.payment.description !== 'Ausente').length;
            const countAbsent = payers.filter(p => p.payment && p.payment.description === 'Ausente').length;
            const countUnpaid = payers.length - countPaid - countAbsent;
            const totalAmountPaid = payers.reduce((sum, p) => {
              if (p.payment && p.payment.description !== 'Ausente' && p.payment.description !== 'Deuda Pendiente') {
                return sum + (Number(p.payment.amount) || 0);
              }
              return sum;
            }, 0);

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
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px dashed rgba(34, 197, 94, 0.3)',
                  borderRadius: '16px'
                }}>
                  <div style={{ fontWeight: '800', color: '#22c55e', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Recaudado:</span> 
                    {formatCurrency(totalAmountPaid)}
                  </div>
                </div>

                {payers.length === 0 ? <div className="empty-state"><h3>Roster vacío.</h3></div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {payers.map(({ player, payment }) => (
                      <div key={player.id} className="player-card" style={{ borderLeft: `5px solid ${payment ? (payment.description === 'Ausente' ? '#94a3b8' : (payment.description === 'Deuda Pendiente' ? '#f59e0b' : '#22c55e')) : '#ef4444'}` }}>
                        <div className="flex-responsive" style={{ gap: '0.75rem' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name} <span style={{fontSize: '0.8em', color: '#94a3b8', fontWeight: 'normal'}}>#{player.jerseyNumber}</span></div>
                            <div style={{ fontSize: '0.75rem', color: payment ? (payment.description === 'Ausente' ? '#94a3b8' : (payment.description === 'Deuda Pendiente' ? '#f59e0b' : '#22c55e')) : '#ef4444', marginTop: '0.1rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                              {payment ? (payment.description === 'Ausente' ? 'Ausente' : (payment.description === 'Deuda Pendiente' ? `Deuda ${formatCurrency(payment.amount)}` : `Pagó ${formatCurrency(payment.amount)}`)) : 'Falta Cobrar'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                            {!payment ? (
                              <>
                                <button onClick={() => handleQuickPayment(player, gameDateStr, selectedGame.opponent, selectedGame.eventDate, selectedGame.feePerPerson)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1, minWidth: '70px', background: '#22c55e' }}>Pagó</button>
                                <button 
                                  onClick={() => {
                                    setConfirmActionModal({
                                      isOpen: true,
                                      title: 'Ausencia',
                                      message: `¿${player.name} faltó?`,
                                      onConfirm: () => {
                                        try {
                                          const payload = { playerId: player.id, playerName: player.name, amount: 0, description: 'Ausente', notes: `Juego Vs ${selectedGame.opponent} (${gameDateStr})`, eventDate: normalizeDate(selectedGame.eventDate) };
                                          mutateData(PAYMENT_API_URL, 'POST', payload, setPayments, `softball_payments_${activeTeamId}`, () => {});
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
                                          const payload = { playerId: player.id, playerName: player.name, amount, description: 'Deuda Pendiente', notes: `Juego Vs ${selectedGame.opponent} (${gameDateStr})`, eventDate: normalizeDate(selectedGame.eventDate) };
                                          mutateData(PAYMENT_API_URL, 'POST', payload, setPayments, `softball_payments_${activeTeamId}`, () => {});
                                        } catch { alert("Error"); }
                                      }
                                    });
                                  }} 
                                  className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', flex: 1, minWidth: '70px' }}
                                >Deuda</button>
                              </>
                            ) : (
                               <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>

                                 <button className="btn-icon" onClick={() => confirmDelete('payment', payment.id)} style={{ color: '#ef4444' }}><Trash2 size={20} /></button>
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
          </div>
        )}
      </div>
    </div>
  );
};
