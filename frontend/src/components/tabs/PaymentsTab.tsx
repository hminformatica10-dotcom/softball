import React, { useState } from 'react';
import { DollarSign, Activity, Trash2, PlusCircle, LayoutGrid, User, Layers, ArrowLeft, CheckCircle2, Edit2, X, Lock } from 'lucide-react';
import { t } from '../../translations';
import { isOlderThan24h } from '../../utils';
import type { Player, Payment, AppConfig, PaymentConcept } from '../../types';

interface PaymentsTabProps {
  config: AppConfig;
  paymentFormData: any;
  setPaymentFormData: (val: any) => void;
  handlePaymentSubmit: (e: React.FormEvent) => void;
  players: Player[];
  filteredPayments: Payment[];
  formatCurrency: (val: number) => string;
  
  // New Props
  groupConcepts: PaymentConcept[];
  loadingConcepts: boolean;
  handleConceptSubmit: (name: string, amount: number) => void;
  deleteConcept: (id: string) => void;
  openEditModal?: (type: string, data: any) => void;
  onDeletePaymentsByDate?: (date: string, password: string) => Promise<void>;
  onDeletePayment?: (paymentId: string, password: string) => Promise<void>;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  config,
  paymentFormData,
  setPaymentFormData,
  handlePaymentSubmit,
  players,
  filteredPayments,
  formatCurrency,
  
  groupConcepts = [],
  loadingConcepts,
  handleConceptSubmit,
  deleteConcept,
  openEditModal,
  onDeletePaymentsByDate,
  onDeletePayment
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'individual' | 'conceptos'>('individual');
  const [selectedConcept, setSelectedConcept] = useState<PaymentConcept | null>(null);
  const [showNewConceptModal, setShowNewConceptModal] = useState(false);
  const [newConceptData, setNewConceptData] = useState({ name: '', amount: '' });
  const [addingAbonoFor, setAddingAbonoFor] = useState<string | null>(null);
  const [abonoAmount, setAbonoAmount] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [deleteByDateModal, setDeleteByDateModal] = useState({ isOpen: false, date: '', loading: false });
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletePaymentModal, setDeletePaymentModal] = useState<{ isOpen: boolean, payment: Payment | null, loading: false }>({ isOpen: false, payment: null, loading: false });

  const onCreateConcept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConceptData.name || !newConceptData.amount) return;
    handleConceptSubmit(newConceptData.name, Number(newConceptData.amount));
    setShowNewConceptModal(false);
    setNewConceptData({ name: '', amount: '' });
  };

  const onQuickPay = (player: Player, concept: PaymentConcept, remaining: number) => {
    // We use the existing handlePaymentSubmit logic by updating the global form data first
    setPaymentFormData({
      ...paymentFormData,
      playerId: player.id,
      amount: remaining.toString(),
      description: concept.name,
      notes: `Pago Total: ${concept.name}`,
      conceptId: concept.id,
      eventDate: new Date().toISOString().split('T')[0]
    });
    
    // Using setTimeout to ensure state is updated before submit
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handlePaymentSubmit(fakeEvent);
    }, 0);
  };

  const onAddAbono = (player: Player, concept: PaymentConcept) => {
    if (!abonoAmount || isNaN(Number(abonoAmount))) return;
    
    setPaymentFormData({
      ...paymentFormData,
      playerId: player.id,
      amount: abonoAmount,
      description: concept.name,
      notes: `Abono: ${concept.name}`,
      conceptId: concept.id,
      eventDate: new Date().toISOString().split('T')[0]
    });

    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handlePaymentSubmit(fakeEvent);
      setAddingAbonoFor(null);
      setAbonoAmount('');
    }, 0);
  };

  const renderIndividualForm = () => (
    <div className="glass-panel" style={{ height: 'fit-content' }}>
      <h3 className="section-title" style={{ color: '#22c55e' }}>
        <User size={22} /> {t('Pago Individual', config.language)}
      </h3>
      <form onSubmit={(e) => {
        setPaymentFormData({...paymentFormData, conceptId: null, description: 'Pago Individual'});
        setTimeout(() => handlePaymentSubmit(e), 0);
      }}>
        <div className="form-group">
          <label className="form-label">{t('Jugador', config.language)}</label>
          <select 
            className="input-field" 
            value={paymentFormData.playerId} 
            onChange={e => setPaymentFormData({ ...paymentFormData, playerId: e.target.value })} 
            required
          >
            <option value="" disabled>{t('Seleccione un jugador', config.language)}</option>
            {[...players].sort((a,b) => a.name.localeCompare(b.name)).map(p => (
              <option key={p.id} value={p.id}>{p.name} - #{p.jerseyNumber}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">{t('Monto ($)', config.language)}</label>
          <input 
            type="number" 
            step="0.01" 
            className="input-field" 
            placeholder="0.00" 
            value={paymentFormData.amount} 
            onChange={e => setPaymentFormData({ ...paymentFormData, amount: e.target.value })} 
            required 
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('Fecha', config.language)}</label>
          <input 
            type="date" 
            className="input-field" 
            value={paymentFormData.eventDate || new Date().toISOString().split('T')[0]} 
            onChange={e => setPaymentFormData({ ...paymentFormData, eventDate: e.target.value })} 
            required 
            style={{ colorScheme: 'dark' }} 
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('Concepto / Nota', config.language)}</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Ej. Cuota mensual" 
            value={paymentFormData.notes || ''} 
            onChange={e => setPaymentFormData({ ...paymentFormData, notes: e.target.value })} 
            required
          />
        </div>

        <button type="submit" className="btn-primary" style={{ background: `linear-gradient(135deg, #22c55e 0%, #16a34a 100%)` }}>
          <DollarSign size={20} /> {t('Registrar Pago', config.language)}
        </button>
      </form>
    </div>
  );

  const renderIndividualView = () => {
    const individualPayments = filteredPayments.filter(p => !p.conceptId);
    const filteredByDate = dateFilter ? individualPayments.filter(p => p.eventDate.includes(dateFilter)) : individualPayments;
    const recentPayments = filteredByDate.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()).slice(0, dateFilter ? undefined : 5);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', gridColumn: '1 / -1' }}>
        {renderIndividualForm()}
        
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 className="section-title" style={{ color: '#22c55e' }}>
            <Activity size={22} /> {t('Historial de Pagos Individuales', config.language)}
          </h3>
          
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">{t('Filtrar por Fecha', config.language)}</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="date" 
                className="input-field" 
                value={dateFilter} 
                onChange={e => setDateFilter(e.target.value)} 
                style={{ colorScheme: 'dark', flex: 1 }} 
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDeleteByDateModal({ isOpen: true, date: dateFilter, loading: false })}
                  className="btn-icon"
                  title="Eliminar todos los pagos de esta fecha"
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: '12px',
                    color: '#22c55e',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Trash2 size={16} /> {t('Eliminar todo', config.language)}
                </button>
              )}
            </div>
          </div>
          
          {recentPayments.length === 0 ? (
            <div className="empty-state">
              <Activity size={48} color="#94a3b8" style={{ opacity: 0.3 }} />
              <h3>{t('No hay pagos registrados', config.language)}</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentPayments.map(payment => {
                const player = players.find(p => p.id === payment.playerId);
                return (
                  <div key={payment.id} className="player-card" style={{ padding: '0.75rem', borderLeft: '4px solid #22c55e' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>{player?.name || 'Jugador desconocido'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{payment.notes || payment.description}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(payment.eventDate).toLocaleDateString(config.language === 'es' ? 'es-ES' : 'en-US')}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#22c55e' }}>{formatCurrency(payment.amount)}</span>
                        {openEditModal && (
                          <button 
                            className="btn-icon" 
                            onClick={() => openEditModal('payment', payment)}
                            title={isOlderThan24h(payment.registrationDate) ? "Este pago requiere contraseña para editar" : "Editar pago"}
                            style={{ 
                              opacity: 1,
                              cursor: 'pointer'
                            }}
                          >
                            {isOlderThan24h(payment.registrationDate) ? <Lock size={16} color="#f59e0b" /> : <Edit2 size={16} />}
                          </button>
                        )}
                        <button 
                          className="btn-icon" 
                          onClick={() => setDeletePaymentModal({ isOpen: true, payment, loading: false })}
                          title="Eliminar pago (requiere contraseña)"
                          style={{ 
                            opacity: 1,
                            cursor: 'pointer',
                            color: '#ef4444'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
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

  const handleDeleteByDate = async () => {
    if (!deletePassword) {
      setDeleteError('Ingresa la contraseña');
      return;
    }

    try {
      setDeleteByDateModal({ ...deleteByDateModal, loading: true });
      await onDeletePaymentsByDate?.(deleteByDateModal.date, deletePassword);
      setDeleteByDateModal({ isOpen: false, date: '', loading: false });
      setDeletePassword('');
      setDeleteError('');
      setShowDeletePassword(false);
    } catch (err: any) {
      setDeleteError(err.message || 'Error al eliminar pagos');
    } finally {
      setDeleteByDateModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeletePayment = async () => {
    if (!deletePassword) {
      setDeleteError('Ingresa la contraseña');
      return;
    }

    if (!deletePaymentModal.payment) return;

    try {
      setDeletePaymentModal({ ...deletePaymentModal, loading: true });
      await onDeletePayment?.(deletePaymentModal.payment.id, deletePassword);
      setDeletePaymentModal({ isOpen: false, payment: null, loading: false });
      setDeletePassword('');
      setDeleteError('');
      setShowDeletePassword(false);
    } catch (err: any) {
      setDeleteError(err.message || 'Error al eliminar pago');
    } finally {
      setDeletePaymentModal(prev => ({ ...prev, loading: false }));
    }
  };

  const renderConceptosDashboard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', gridColumn: '1 / -1' }}>
      <button 
        className="btn-primary" 
        onClick={() => setShowNewConceptModal(true)}
        style={{ background: config.primaryColor }}
      >
        <PlusCircle size={24} /> {t('Nuevo Concepto Grupal', config.language)}
      </button>

      {loadingConcepts ? (
        <div className="empty-state"><Activity size={48} className="animate-spin" /><h3>Cargando...</h3></div>
      ) : groupConcepts.length === 0 ? (
        <div className="empty-state">
          <Layers size={48} color="#94a3b8" style={{ opacity: 0.3 }} />
          <h3>No hay conceptos grupales</h3>
          <p style={{ maxWidth: '300px', margin: '0.5rem auto' }}>Crea conceptos para llevar el control detallado de un pago grupal.</p>
        </div>
      ) : (
        <div className="selection-grid">
          {groupConcepts.map(concept => {
            const conceptPayments = filteredPayments.filter(p => p.conceptId === concept.id);
            const totalPaid = conceptPayments.reduce((acc, curr) => acc + curr.amount, 0);
            
            return (
              <div 
                key={concept.id} 
                className="selection-card" 
                onClick={() => setSelectedConcept(concept)}
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '16px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                   <div style={{ background: `${config.primaryColor}20`, color: config.primaryColor, padding: '0.4rem', borderRadius: '10px' }}>
                     <Layers size={22} />
                   </div>
                   <button className="btn-icon" onClick={(e) => { e.stopPropagation(); if(confirm("¿Eliminar?")) deleteConcept(concept.id); }}>
                     <Trash2 size={16} color="#ef4444" />
                   </button>
                </div>
                <h4 style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 'bold', marginBottom: '0.2rem' }}>{concept.name}</h4>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  {t('Meta', config.language)}: <span style={{ color: config.primaryColor, fontWeight: 'bold' }}>{formatCurrency(concept.totalAmount)}</span>
                </div>
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 'bold' }}>{formatCurrency(totalPaid)}</span>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>Entrar <ArrowLeft size={12} style={{ transform: 'rotate(180deg)' }} /></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderConceptDetailView = (concept: PaymentConcept) => {
    const conceptPayments = filteredPayments.filter(p => p.conceptId === concept.id);
    const sortedPlayers = [...players].sort((a,b) => a.name.localeCompare(b.name));
    
    const paidInFullCount = sortedPlayers.filter(pl => {
      const total = conceptPayments.filter(pay => pay.playerId === pl.id).reduce((s, p) => s + p.amount, 0);
      return total >= concept.totalAmount;
    }).length;

    const inProgressCount = sortedPlayers.filter(pl => {
      const total = conceptPayments.filter(pay => pay.playerId === pl.id).reduce((s, p) => s + p.amount, 0);
      return total > 0 && total < concept.totalAmount;
    }).length;

    return (
      <div className="glass-panel" style={{ width: '100%', gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <button className="btn-icon" onClick={() => setSelectedConcept(null)} style={{ background: 'rgba(255,255,255,0.05)' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>{concept.name}</h2>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Meta: {formatCurrency(concept.totalAmount)}</div>
          </div>
        </div>

        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem', 
          padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#22c55e', fontSize: '1.4rem', fontWeight: '800' }}>{paidInFullCount}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>Listo</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ color: '#f59e0b', fontSize: '1.4rem', fontWeight: '800' }}>{inProgressCount}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>Abono</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ef4444', fontSize: '1.4rem', fontWeight: '800' }}>{sortedPlayers.length - paidInFullCount - inProgressCount}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>Falta</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {sortedPlayers.map(player => {
            const playerPayments = conceptPayments.filter(p => p.playerId === player.id);
            const totalPaid = playerPayments.reduce((s, p) => s + p.amount, 0);
            const remaining = concept.totalAmount - totalPaid;
            const isCompleted = totalPaid >= concept.totalAmount;
            const hasStarted = totalPaid > 0;
            
            return (
              <div 
                key={player.id} 
                className="player-card" 
                style={{ 
                  borderLeft: `5px solid ${isCompleted ? '#22c55e' : (hasStarted ? '#f59e0b' : '#ef4444')}`,
                  padding: '1rem'
                }}
              >
                <div className="flex-responsive" style={{ gap: '0.75rem' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
                    <div style={{ fontSize: '0.75rem', color: isCompleted ? '#22c55e' : (hasStarted ? '#f59e0b' : '#94a3b8'), marginTop: '0.1rem', fontWeight: 'bold' }}>
                      {isCompleted ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14} /> Pagado</span>
                      ) : (
                        <span>{formatCurrency(totalPaid)} / {formatCurrency(concept.totalAmount)}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {addingAbonoFor === player.id ? (
                      <div style={{ display: 'flex', gap: '0.4rem', animation: 'fadeIn 0.2s ease', width: '100%', justifyContent: 'flex-start' }}>
                        <input 
                          type="number" 
                          className="input-field" 
                          style={{ width: '80px', padding: '0.4rem' }} 
                          placeholder="$$"
                          value={abonoAmount}
                          onChange={e => setAbonoAmount(e.target.value)}
                          autoFocus
                        />
                        <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', flex: 1 }} onClick={() => onAddAbono(player, concept)}>OK</button>
                        <button className="btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setAddingAbonoFor(null)}><X size={16} /></button>
                      </div>
                    ) : (
                      <>
                        {!isCompleted && (
                          <>
                            <button 
                              className="btn-secondary" 
                              style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', flex: 1, minWidth: '70px', borderColor: `${config.primaryColor}50`, color: config.primaryColor }}
                              onClick={() => { setAddingAbonoFor(player.id); setAbonoAmount(''); }}
                            >
                              + Abono
                            </button>
                            <button 
                              className="btn-primary" 
                              style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', flex: 1, minWidth: '70px', background: '#22c55e' }}
                              onClick={() => onQuickPay(player, concept, remaining)}
                            >
                              Pagar
                            </button>
                          </>
                        )}
                        {hasStarted && (
                           <>
                             <button 
                               className="btn-secondary" 
                               style={{ 
                                 fontSize: '0.75rem', padding: '0.4rem 0.6rem', flex: 1, minWidth: '70px', 
                                 borderColor: isOlderThan24h(playerPayments[0]?.registrationDate) ? 'rgba(255,255,255,0.1)' : `${config.primaryColor}50`, 
                                 color: isOlderThan24h(playerPayments[0]?.registrationDate) ? '#94a3b8' : config.primaryColor 
                               }}
                               onClick={() => {
                                 const pToEdit = playerPayments[0];
                                 if (openEditModal && pToEdit) openEditModal('payment', pToEdit);
                               }}
                               title={isOlderThan24h(playerPayments[0]?.registrationDate) ? "Este pago ya no puede ser editado directamente (Requiere contraseña)" : "Editar pago"}
                             >
                               {isOlderThan24h(playerPayments[0]?.registrationDate) ? <Lock size={14} style={{ marginRight: '4px' }} /> : <Edit2 size={14} style={{ marginRight: '4px' }} />} Editar
                             </button>

                           </>
                        )}
                        {isCompleted && <CheckCircle2 size={20} color="#22c55e" />}
                      </>
                    )}
                  </div>
                </div>
                
                {!isCompleted && (
                  <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(100, (totalPaid / concept.totalAmount) * 100)}%`, 
                      background: hasStarted ? '#f59e0b' : '#ef4444', 
                      height: '100%', 
                      transition: 'width 0.5s ease' 
                    }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="grid-layout">
      {/* Sub-Tab Navigation Header */}
      <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '0.4rem', display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
        <button 
          onClick={() => { setActiveSubTab('individual'); setSelectedConcept(null); }}
          className={activeSubTab === 'individual' ? 'btn-primary' : 'btn-secondary'}
          style={{ 
            flex: 1, padding: '0.6rem 0.4rem', borderRadius: '12px', border: 'none',
            background: activeSubTab === 'individual' ? `${config.primaryColor}20` : 'transparent',
            color: activeSubTab === 'individual' ? config.primaryColor : '#94a3b8',
            fontSize: '0.85rem'
          }}
        >
          <LayoutGrid size={18} /> {t('Individual', config.language)}
        </button>
        <button 
          onClick={() => setActiveSubTab('conceptos')}
          className={activeSubTab === 'conceptos' ? 'btn-primary' : 'btn-secondary'}
          style={{ 
            flex: 1, padding: '0.6rem 0.4rem', borderRadius: '12px', border: 'none',
            background: activeSubTab === 'conceptos' ? `${config.primaryColor}20` : 'transparent',
            color: activeSubTab === 'conceptos' ? config.primaryColor : '#94a3b8',
            fontSize: '0.85rem'
          }}
        >
          <Layers size={18} /> {t('Grupal', config.language)}
        </button>
      </div>

      {activeSubTab === 'individual' ? (
        renderIndividualView()
      ) : (
        <>
          {selectedConcept ? renderConceptDetailView(selectedConcept) : renderConceptosDashboard()}
          
          {showNewConceptModal && (
            <div className="modal-overlay" style={{ zIndex: 1100 }}>
              <div className="modal-content" style={{ maxWidth: '420px' }}>
                <div className="modal-header">
                  <h3 className="modal-title">Nuevo Concepto Grupal</h3>
                  <button className="btn-icon" onClick={() => setShowNewConceptModal(false)}><X size={24} /></button>
                </div>
                <form onSubmit={onCreateConcept} className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Nombre del Concepto</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Ej. Uniforme, Inscripción..." 
                      value={newConceptData.name} 
                      onChange={e => setNewConceptData({...newConceptData, name: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monto por Jugador ($)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="0.00" 
                      value={newConceptData.amount} 
                      onChange={e => setNewConceptData({...newConceptData, amount: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="modal-footer" style={{ marginTop: '1rem' }}>
                    <button type="button" className="btn-secondary" onClick={() => setShowNewConceptModal(false)}>Cancelar</button>
                    <button type="submit" className="btn-primary" style={{ background: config.primaryColor }}>Crear Concepto</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete by Date Modal */}
      {deleteByDateModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 4000 }}>
          <div className="modal-content" style={{ maxWidth: '380px', border: `1px solid ${config.primaryColor}30` }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
                <div style={{ background: `${config.primaryColor}15`, padding: '1rem', borderRadius: '50%' }}>
                  <Lock size={32} color={config.primaryColor} />
                </div>
                <h3 className="modal-title" style={{ textAlign: 'center' }}>Eliminar Pagos por Fecha</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>Se eliminarán todos los pagos del {new Date(deleteByDateModal.date).toLocaleDateString(config.language === 'es' ? 'es-ES' : 'en-US')}. Esta acción requiere contraseña administrativa.</p>
              </div>
            </div>
            <div className="modal-body" style={{ paddingTop: '1.5rem' }}>
              <div className="form-group">
                <div style={{ position: 'relative' }}>
                  <input
                    type={showDeletePassword ? "text" : "password"}
                    className="input-field"
                    value={deletePassword}
                    onChange={e => { setDeletePassword(e.target.value); setDeleteError(''); }}
                    placeholder="Contraseña administrativa"
                    autoFocus
                    style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: deletePassword && !showDeletePassword ? '4px' : 'normal' }}
                  />
                  <button type="button" onClick={() => setShowDeletePassword(!showDeletePassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {deleteError && <p style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.5rem', fontWeight: 'bold' }}>{deleteError}</p>}
              </div>
              <button
                className="btn-primary"
                style={{ background: config.primaryColor, width: '100%', marginTop: '0.5rem' }}
                onClick={handleDeleteByDate}
                disabled={deleteByDateModal.loading}
              >
                {deleteByDateModal.loading ? 'Eliminando...' : 'Confirmar Eliminación'}
              </button>
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', justifyContent: 'center' }}>
              <button className="btn-secondary" style={{ border: 'none' }} onClick={() => { setDeleteByDateModal({ isOpen: false, date: '', loading: false }); setDeletePassword(''); setDeleteError(''); setShowDeletePassword(false); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Individual Payment Modal */}
      {deletePaymentModal.isOpen && deletePaymentModal.payment && (
        <div className="modal-overlay" style={{ zIndex: 4000 }}>
          <div className="modal-content" style={{ maxWidth: '380px', border: `1px solid #ef444430` }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
                <div style={{ background: '#ef444415', padding: '1rem', borderRadius: '50%' }}>
                  <Trash2 size={32} color="#ef4444" />
                </div>
                <h3 className="modal-title" style={{ textAlign: 'center' }}>Eliminar Pago</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
                  Se eliminará el pago de {formatCurrency(deletePaymentModal.payment.amount)} de {deletePaymentModal.payment.playerName}. Esta acción requiere contraseña administrativa.
                </p>
              </div>
            </div>
            <div className="modal-body" style={{ paddingTop: '1.5rem' }}>
              <div className="form-group">
                <div style={{ position: 'relative' }}>
                  <input
                    type={showDeletePassword ? "text" : "password"}
                    className="input-field"
                    value={deletePassword}
                    onChange={e => { setDeletePassword(e.target.value); setDeleteError(''); }}
                    placeholder="Contraseña administrativa"
                    autoFocus
                    style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: deletePassword && !showDeletePassword ? '4px' : 'normal' }}
                  />
                  <button type="button" onClick={() => setShowDeletePassword(!showDeletePassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {deleteError && <p style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.5rem', fontWeight: 'bold' }}>{deleteError}</p>}
              </div>
              <button
                className="btn-danger"
                style={{ width: '100%', marginTop: '0.5rem' }}
                onClick={handleDeletePayment}
                disabled={deletePaymentModal.loading}
              >
                {deletePaymentModal.loading ? 'Eliminando...' : 'Confirmar Eliminación'}
              </button>
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', justifyContent: 'center' }}>
              <button className="btn-secondary" style={{ border: 'none' }} onClick={() => { setDeletePaymentModal({ isOpen: false, payment: null, loading: false }); setDeletePassword(''); setDeleteError(''); setShowDeletePassword(false); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


