import React, { useState } from 'react';
import { DollarSign, Activity, Trash2, PlusCircle, LayoutGrid, User, Layers, ArrowLeft, CheckCircle2, Edit2, X, Search, Calendar, ChevronDown, AlertCircle } from 'lucide-react';
import { t } from '../../translations';
import type { Player, Payment, AppConfig, PaymentConcept, Game } from '../../types';

type PaymentFormData = {
  playerId: string;
  amount: string;
  description: string;
  otherDescription: string;
  abonoDescription: string;
  notes: string;
  responsible: string;
  gameId: string;
  eventDate: string;
  conceptId?: string;
};

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
  handlePaymentPayloadSubmit: (payload: Partial<PaymentFormData>) => Promise<boolean>;
  deleteConcept: (id: string) => void;
  openEditModal?: (type: string, data: any) => void;
  onDeletePayment?: (paymentId: string, password?: string) => Promise<void>;
  showForm: boolean;
  setShowForm: (val: boolean) => void;
  
  // Added for filters
  games?: Game[];
  formatDate?: (val: string) => string;
  onDeleteBulkPayments?: (paymentIds: string[], password?: string) => Promise<void>;
  mode?: 'individual' | 'conceptos';
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
  onDeletePayment,
  showForm,
  setShowForm,
  games = [],
  formatDate,
  onDeleteBulkPayments,
  mode = 'individual'
}) => {
  const [selectedConcept, setSelectedConcept] = useState<PaymentConcept | null>(null);
  const [showNewConceptModal, setShowNewConceptModal] = useState(false);
  const [newConceptData, setNewConceptData] = useState({ name: '', amount: '' });
  const [groupPaymentModal, setGroupPaymentModal] = useState({
    isOpen: false,
    player: null as Player | null,
    type: '' as 'Pago' | 'Abono' | 'Deuda' | '',
    amount: '',
    notes: '',
    responsible: '',
    eventDate: new Date().toISOString().split('T')[0]
  });
  
  // Filter States
  const [searchResponsible, setSearchResponsible] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [showGameDropdown, setShowGameDropdown] = useState(false);

  // Bulk Delete States
  const [deleteBulkModal, setDeleteBulkModal] = useState<{ isOpen: boolean, loading: boolean }>({ isOpen: false, loading: false });
  const [bulkDeleteError, setBulkDeleteError] = useState('');

  const [deleteError, setDeleteError] = useState('');
  const [deletePaymentModal, setDeletePaymentModal] = useState<{ isOpen: boolean, payment: Payment | null, loading: false }>({ isOpen: false, payment: null, loading: false });

  const onCreateConcept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConceptData.name || !newConceptData.amount) return;
    handleConceptSubmit(newConceptData.name, Number(newConceptData.amount));
    setShowNewConceptModal(false);
    setNewConceptData({ name: '', amount: '' });
  };

  const renderIndividualForm = () => (
    <>
      {showForm && (
      <div className="glass-panel" style={{ height: 'fit-content' }}>
        <h3 className="section-title" style={{ color: '#22c55e' }}>
          <User size={22} /> {t('Pago Individual', config.language)}
        </h3>
        <form onSubmit={(e) => {
          setPaymentFormData({...paymentFormData, conceptId: null, description: 'Pago Individual'});
          setTimeout(() => handlePaymentSubmit(e), 0);
        }}>
        {/* Jugador field removed per request */}
        
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

        <div className="form-group">
          <label className="form-label">{t('Responsable', config.language)}</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ej. Juan Perez"
            value={paymentFormData.responsible || ''}
            onChange={e => setPaymentFormData({ ...paymentFormData, responsible: e.target.value })}
            required
          />
        </div>

        <button type="submit" className="btn-primary" style={{ background: `linear-gradient(135deg, #22c55e 0%, #16a34a 100%)` }}>
          <DollarSign size={20} /> {t('Registrar Pago', config.language)}
        </button>
        <button type="button" onClick={() => { setShowForm(false); setPaymentFormData({ playerId: '', amount: '', eventDate: new Date().toISOString().split('T')[0], notes: '', responsible: '' }); }} className="btn-secondary" style={{ marginTop: '0.5rem' }}>
          {t('Cancelar', config.language)}
        </button>
        </form>
      </div>
      )}
      {!showForm && (
      <div className="glass-panel" style={{ height: 'fit-content' }}>
        <button onClick={() => setShowForm(true)} className="btn-primary" style={{ background: `linear-gradient(135deg, #22c55e 0%, #16a34a 100%)`, width: '100%' }}>
          <DollarSign size={20} /> Agregar Nuevo Pago
        </button>
      </div>
      )}
    </>
  );

  const renderIndividualView = () => {
    const individualPayments = filteredPayments.filter(p => !p.conceptId && p.description !== 'Ausente' && p.description !== 'Deuda Pendiente');
    
    // Filtering logic
    const filteredPaymentsList = individualPayments.filter(p => {
      // 1. Filter by responsible search text
      const matchResponsible = !searchResponsible || (p.responsible || '').toLowerCase().includes(searchResponsible.toLowerCase());
      
      // 2. Filter by game select dropdown
      let matchGame = true;
      if (selectedGameId !== 'all') {
        if (p.gameId) {
          matchGame = p.gameId === selectedGameId;
        } else {
          const selectedGame = (games || []).find(g => g.id === selectedGameId);
          if (selectedGame && selectedGame.opponent) {
            const expectedOpponent = `Vs ${selectedGame.opponent}`.toLowerCase();
            const notesMatch = !!(p.notes && p.notes.toLowerCase().includes(expectedOpponent));
            if (notesMatch) {
              const pDate = (p.eventDate || p.date || '').split('T')[0];
              const gDate = (selectedGame.eventDate || selectedGame.date || '').split('T')[0];
              matchGame = pDate === gDate;
            } else {
              matchGame = false;
            }
          } else {
            matchGame = false;
          }
        }
      }
      
      // 3. Filter by date picker
      const matchDate = !filterDate || (p.eventDate && p.eventDate === filterDate) || (p.date && p.date.startsWith(filterDate));
      
      return matchResponsible && matchGame && matchDate;
    });

    const hasActiveFilters = searchResponsible !== '' || selectedGameId !== 'all' || filterDate !== '';
    const sortedPayments = [...filteredPaymentsList].sort((a, b) => new Date(b.registrationDate || b.eventDate || b.date || 0).getTime() - new Date(a.registrationDate || a.eventDate || a.date || 0).getTime());
    
    // If no filters are active, show first 5 (unless showAllRecent is true)
    const recentPayments = (hasActiveFilters || showAllRecent) ? sortedPayments : sortedPayments.slice(0, 5);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', gridColumn: '1 / -1' }}>
        {renderIndividualForm()}
        
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 className="section-title" style={{ color: '#22c55e' }}>
            <Activity size={22} /> {t('Historial de Pagos Individuales', config.language)}
          </h3>
          
          {/* SECCIÓN DE FILTROS Y BÚSQUEDA */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            padding: '1.25rem',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            marginBottom: '1.25rem'
          }}>
            {/* Búsqueda por Responsable */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                <User size={14} color="#22c55e" /> Responsable
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Buscar por responsable..." 
                  value={searchResponsible}
                  onChange={e => setSearchResponsible(e.target.value)}
                  style={{ 
                    padding: '0.6rem 0.8rem', 
                    fontSize: '0.85rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    color: '#f8fafc'
                  }}
                />
              </div>
            </div>

            {/* Búsqueda por Juego */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                <Search size={14} color="#22c55e" /> Partido / Juego
              </label>
              <div style={{ position: 'relative' }}>
                <button 
                  type="button" 
                  onClick={() => setShowGameDropdown(!showGameDropdown)}
                  className="input-field"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    padding: '0.6rem 0.8rem',
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    minHeight: '40px'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedGameId === 'all' 
                      ? 'Todos los juegos' 
                      : `Vs ${games.find(g => g.id === selectedGameId)?.opponent || ''}`
                    }
                  </span>
                  <ChevronDown size={16} style={{ opacity: 0.8, color: '#22c55e' }} />
                </button>

                {showGameDropdown && (
                  <>
                    <div 
                      onClick={() => setShowGameDropdown(false)} 
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 998,
                        background: 'transparent'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '0.35rem',
                      background: 'rgba(15, 23, 42, 0.98)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
                      zIndex: 999,
                      maxHeight: '220px',
                      overflowY: 'auto',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)'
                    }}>
                      <div 
                        onClick={() => { setSelectedGameId('all'); setShowGameDropdown(false); }}
                        style={{
                          padding: '0.7rem 0.9rem',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: selectedGameId === 'all' ? '#22c55e' : '#cbd5e1',
                          background: selectedGameId === 'all' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.2s',
                          fontWeight: selectedGameId === 'all' ? '700' : '400'
                        }}
                        onMouseEnter={(e) => { if (selectedGameId !== 'all') e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { if (selectedGameId !== 'all') e.currentTarget.style.background = 'transparent'; }}
                      >
                        Todos los juegos
                      </div>
                      {([...games]).sort((a, b) => new Date(b.eventDate || b.date || 0).getTime() - new Date(a.eventDate || a.date || 0).getTime()).map(game => {
                        const isSelected = selectedGameId === game.id;
                        const gameDateStr = formatDate ? formatDate(game.eventDate || game.date || '') : (game.eventDate || game.date || '');
                        return (
                          <div 
                            key={game.id}
                            onClick={() => { setSelectedGameId(game.id); setShowGameDropdown(false); }}
                            style={{
                              padding: '0.7rem 0.9rem',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              color: isSelected ? '#22c55e' : '#cbd5e1',
                              background: isSelected ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              transition: 'background 0.2s',
                              fontWeight: isSelected ? '700' : '400'
                            }}
                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                          >
                            Vs {game.opponent} <span style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '4px' }}>({gameDateStr})</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Búsqueda por Fecha */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                <Calendar size={14} color="#22c55e" /> Fecha
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="date" 
                  className="input-field" 
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  style={{ 
                    padding: '0.6rem 0.8rem', 
                    fontSize: '0.85rem', 
                    colorScheme: 'dark',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    color: '#f8fafc'
                  }}
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', marginTop: '-0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setSearchResponsible('');
                  setSelectedGameId('all');
                  setFilterDate('');
                }}
                className="btn-secondary"
                style={{
                  flex: 1,
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderRadius: '12px'
                }}
              >
                <X size={14} /> Limpiar Filtros
              </button>
              
              {filteredPaymentsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDeleteBulkModal({ isOpen: true, loading: false })}
                  className="btn-danger"
                  style={{
                    flex: 1,
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.8rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.4rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: 'none',
                    color: '#ffffff'
                  }}
                >
                  <Trash2 size={14} /> Eliminar {filteredPaymentsList.length} Filtrados
                </button>
              )}
            </div>
          )}
          
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
                        {payment.responsible && <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Responsable: {payment.responsible}</div>}
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatDate ? formatDate(payment.eventDate) : new Date(payment.eventDate).toLocaleDateString(config.language === 'es' ? 'es-ES' : 'en-US')}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#22c55e' }}>{formatCurrency(payment.amount)}</span>
                        {openEditModal && (
                          <button 
                            className="btn-icon" 
                            onClick={() => openEditModal('payment', payment)}
                            title="Editar pago"
                            style={{ 
                              opacity: 1,
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={16} />
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

              {!hasActiveFilters && sortedPayments.length > 5 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAllRecent(!showAllRecent)}
                  style={{ marginTop: '0.75rem', width: '100%', borderRadius: '12px' }}
                >
                  {showAllRecent ? 'Mostrar menos (últimos 5)' : `Ver todos (${sortedPayments.length})`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleExecuteBulkDelete = async (paymentIds: string[]) => {
    if (!paymentIds || paymentIds.length === 0) return;

    try {
      setDeleteBulkModal({ isOpen: true, loading: true });
      await onDeleteBulkPayments?.(paymentIds);
      
      setDeleteBulkModal({ isOpen: false, loading: false });
      setBulkDeleteError('');
      
      setSearchResponsible('');
      setSelectedGameId('all');
      setFilterDate('');
    } catch (err: any) {
      setBulkDeleteError(err.message || 'Error al eliminar pagos masivos');
    } finally {
      setDeleteBulkModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeletePayment = async () => {
    if (!deletePaymentModal.payment) return;

    try {
      setDeletePaymentModal({ ...deletePaymentModal, loading: true });
      await onDeletePayment?.(deletePaymentModal.payment.id);
      setDeletePaymentModal({ isOpen: false, payment: null, loading: false });
      setDeleteError('');
    } catch (err: any) {
      setDeleteError(err.message || 'Error al eliminar pago');
    } finally {
      setDeletePaymentModal(prev => ({ ...prev, loading: false }));
    }
  };

  const renderConceptosDashboard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', gridColumn: '1 / -1' }}>
      {!showNewConceptModal ? (
        <button 
          className="btn-primary" 
          onClick={() => setShowNewConceptModal(true)}
          style={{ 
            background: `linear-gradient(135deg, ${config.primaryColor} 0%, rgba(30, 41, 59, 0.9) 100%)`,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            padding: '0.8rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '1.05rem',
            fontWeight: 'bold',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer'
          }}
        >
          <PlusCircle size={20} /> {t('Nuevo Concepto Grupal', config.language)}
        </button>
      ) : (
        <div className="glass-panel" style={{ 
          padding: '1.25rem',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: `1px solid rgba(255,255,255,0.08)`,
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          animation: 'fadeIn 0.3s ease-out',
          marginBottom: '0.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircle size={18} color={config.primaryColor} /> Nuevo Concepto Grupal
            </h4>
            <button className="btn-icon" onClick={() => setShowNewConceptModal(false)} style={{ padding: '4px' }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={onCreateConcept} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Nombre del Concepto</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Ej. Uniforme, Inscripción..." 
                value={newConceptData.name} 
                onChange={e => setNewConceptData({...newConceptData, name: e.target.value})} 
                required 
                style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px' }}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Monto por Jugador ($)</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="0.00" 
                value={newConceptData.amount} 
                onChange={e => setNewConceptData({...newConceptData, amount: e.target.value})} 
                required 
                style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowNewConceptModal(false)} style={{ flex: 1, borderRadius: '10px', fontSize: '0.9rem' }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1, background: config.primaryColor, borderRadius: '10px', fontSize: '0.9rem' }}>
                Crear Concepto
              </button>
            </div>
          </form>
        </div>
      )}

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
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 'bold' }}>{formatCurrency(totalPaid)}</span>
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
    const activePlayers = players.filter(p => p.isActive !== false);
    const sortedPlayers = [...activePlayers].sort((a, b) => a.name.localeCompare(b.name));
    
    const paidInFullCount = sortedPlayers.filter(pl => {
      const total = conceptPayments
        .filter(pay => pay.playerId === pl.id && pay.description !== 'Deuda Pendiente')
        .reduce((s, p) => s + p.amount, 0);
      return total >= concept.totalAmount;
    }).length;

    const inProgressCount = sortedPlayers.filter(pl => {
      const total = conceptPayments
        .filter(pay => pay.playerId === pl.id && pay.description !== 'Deuda Pendiente')
        .reduce((s, p) => s + p.amount, 0);
      return total > 0 && total < concept.totalAmount;
    }).length;

    const unpaidCount = sortedPlayers.length - paidInFullCount - inProgressCount;

    // Financial Metrics
    const totalAmountPaid = conceptPayments
      .filter(p => p.description !== 'Deuda Pendiente')
      .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
    const totalGoal = (concept.totalAmount || 0) * sortedPlayers.length;
    const remainingAmount = Math.max(0, totalGoal - totalAmountPaid);

    return (
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', padding: '1rem', background: `${config.primaryColor}15`, borderRadius: '12px', border: `1px solid ${config.primaryColor}40` }}>
          <div>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>{concept.name}</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>Meta por persona: {formatCurrency(concept.totalAmount)}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="btn-secondary" onClick={() => setSelectedConcept(null)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', whiteSpace: 'nowrap' }}>
              Cambiar Concepto
            </button>
          </div>
        </div>

        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem', 
          padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#22c55e', fontSize: '1.4rem', fontWeight: '800' }}>{paidInFullCount}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Listo</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ color: '#f59e0b', fontSize: '1.4rem', fontWeight: '800' }}>{inProgressCount}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Parcial</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ef4444', fontSize: '1.4rem', fontWeight: '800' }}>{unpaidCount}</div>
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
            <div style={{ fontWeight: '800', color: '#ef4444', fontSize: '1.2rem' }}>{formatCurrency(totalGoal)}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginTop: '0.5rem' }}>Meta de Recaudación</div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px dashed rgba(59, 130, 246, 0.3)', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ fontWeight: '800', color: remainingAmount > 0 ? '#3b82f6' : '#22c55e', fontSize: '1.2rem' }}>{formatCurrency(remainingAmount)}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginTop: '0.5rem' }}>Restante</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {sortedPlayers.map(player => {
            const playerPayments = conceptPayments.filter(p => p.playerId === player.id);
            const totalPaid = playerPayments
              .filter(p => p.description !== 'Deuda Pendiente')
              .reduce((s, p) => s + p.amount, 0);
            
            const debtPayment = playerPayments.find(p => p.description === 'Deuda Pendiente');
            const hasDebt = !!debtPayment;
            
            const isCompleted = totalPaid >= concept.totalAmount;
            const hasStarted = totalPaid > 0 && !isCompleted;
            
            const status = isCompleted ? 'paid' : hasDebt ? 'debt' : hasStarted ? 'abono' : 'unpaid';

            return (
              <div 
                key={player.id} 
                className="player-card" 
                style={{ 
                  borderLeft: `5px solid ${status === 'paid' ? '#22c55e' : status === 'abono' ? '#f59e0b' : '#ef4444'}`,
                  padding: '1rem'
                }}
              >
                <div className="flex-responsive" style={{ gap: '0.75rem' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {player.name} <span style={{ fontSize: '0.8em', color: '#94a3b8', fontWeight: 'normal' }}>#{player.jerseyNumber}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: status === 'paid' ? '#22c55e' : status === 'abono' ? '#f59e0b' : '#ef4444', marginTop: '0.1rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {status === 'paid' 
                        ? `Pagó completo (${formatCurrency(totalPaid)})` 
                        : status === 'abono' 
                          ? `Abonó ${formatCurrency(totalPaid)} / ${formatCurrency(concept.totalAmount)}`
                          : status === 'debt'
                            ? `Deuda ${formatCurrency(debtPayment?.amount || 0)}`
                            : 'Falta Cobrar'
                      }
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                    {status === 'unpaid' ? (
                      <>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1, minWidth: '70px', background: '#22c55e' }}
                          onClick={() => handleFullGroupPayment(player, concept)}
                          title="Registrar pago completo"
                        >
                          Pagó
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1, minWidth: '70px' }}
                          onClick={() => openGroupPaymentModal(player, 'Abono', concept)}
                          title="Registrar abono"
                        >
                          Abonar
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', flex: 1, minWidth: '70px' }}
                          onClick={() => openGroupPaymentModal(player, 'Deuda', concept)}
                          title="Registrar deuda"
                        >
                          Deuda
                        </button>
                      </>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button 
                          type="button"
                          className="btn-icon" 
                          onClick={() => {
                            const lastPayment = playerPayments[playerPayments.length - 1];
                            if (lastPayment) setDeletePaymentModal({ isOpen: true, payment: lastPayment, loading: false });
                          }} 
                          style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          title="Eliminar registro"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const openGroupPaymentModal = (player: Player, type: 'Pago' | 'Abono' | 'Deuda', concept?: PaymentConcept) => {
    setGroupPaymentModal({
      isOpen: true,
      player,
      type,
      amount: concept ? String(concept.totalAmount || '') : '',
      notes: '',
      responsible: '',
      eventDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleFullGroupPayment = async (player: Player, concept: PaymentConcept) => {
    const amount = Number(concept.totalAmount || 0);
    if (!amount || !player?.id) return;

    const payload: Partial<PaymentFormData> = {
      playerId: player.id,
      amount: String(amount),
      description: 'Pago',
      notes: `Pago completo de ${concept.name}`,
      responsible: '',
      eventDate: new Date().toISOString().split('T')[0],
      conceptId: concept.id
    };

    await handlePaymentPayloadSubmit(payload);
  };

  const handleGroupPaymentSubmit = async (e: React.FormEvent, concept: PaymentConcept) => {
    e.preventDefault();
    if (!groupPaymentModal.player || !groupPaymentModal.amount) return;

    const description = groupPaymentModal.type === 'Pago'
      ? 'Pago'
      : groupPaymentModal.type === 'Deuda'
        ? 'Deuda Pendiente'
        : 'Abono';

    const payload: Partial<PaymentFormData> = {
      playerId: groupPaymentModal.player.id,
      amount: groupPaymentModal.amount,
      description,
      notes: groupPaymentModal.notes || (groupPaymentModal.type === 'Deuda'
        ? `Deuda pendiente de ${concept.name}`
        : groupPaymentModal.type === 'Pago'
          ? `Pago completo de ${concept.name}`
          : `Abono de ${concept.name}`),
      responsible: groupPaymentModal.responsible,
      eventDate: groupPaymentModal.eventDate,
      conceptId: concept.id
    };

    const success = await handlePaymentPayloadSubmit(payload);
    if (success) {
      setGroupPaymentModal({ isOpen: false, player: null, type: '', amount: '', notes: '', responsible: '', eventDate: new Date().toISOString().split('T')[0] });
    }
  };

  return (
    <div className="grid-layout">
      {mode === 'individual' ? (
        renderIndividualView()
      ) : (
        <div className="glass-panel" style={{ width: '100%', gridColumn: '1 / -1' }}>
          <h2 className="section-title">
            <Layers size={24} color={config.primaryColor} /> {t('Pagos Grupales', config.language)}
          </h2>
          {selectedConcept ? renderConceptDetailView(selectedConcept) : renderConceptosDashboard()}

          {groupPaymentModal.isOpen && selectedConcept && (
            <div className="modal-overlay" style={{ zIndex: 1200 }}>
              <div className="modal-content" style={{ maxWidth: '420px' }}>
                <div className="modal-header">
                  <h3 className="modal-title">{groupPaymentModal.type === 'Pago' ? 'Registrar Pago' : groupPaymentModal.type === 'Deuda' ? 'Registrar Deuda' : 'Registrar Abono'}</h3>
                  <button className="btn-icon" onClick={() => setGroupPaymentModal({ isOpen: false, player: null, type: '', amount: '', notes: '', responsible: '', eventDate: new Date().toISOString().split('T')[0] })}><X size={24} /></button>
                </div>
                <form onSubmit={(e) => handleGroupPaymentSubmit(e, selectedConcept)} className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Jugador</label>
                    <input type="text" className="input-field" value={groupPaymentModal.player?.name || ''} readOnly />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Concepto</label>
                    <input type="text" className="input-field" value={selectedConcept.name} readOnly />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monto ($)</label>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="0.00"
                      value={groupPaymentModal.amount}
                      onChange={e => setGroupPaymentModal(prev => ({ ...prev, amount: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha</label>
                    <input
                      type="date"
                      className="input-field"
                      value={groupPaymentModal.eventDate}
                      onChange={e => setGroupPaymentModal(prev => ({ ...prev, eventDate: e.target.value }))}
                      required
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Responsable</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ej. Juan Perez"
                      value={groupPaymentModal.responsible}
                      onChange={e => setGroupPaymentModal(prev => ({ ...prev, responsible: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notas</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Detalle opcional"
                      value={groupPaymentModal.notes}
                      onChange={e => setGroupPaymentModal(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                  <div className="modal-footer" style={{ marginTop: '1rem' }}>
                    <button type="button" className="btn-secondary" onClick={() => setGroupPaymentModal({ isOpen: false, player: null, type: '', amount: '', notes: '', responsible: '', eventDate: new Date().toISOString().split('T')[0] })}>Cancelar</button>
                    <button type="submit" className="btn-primary" style={{ background: config.primaryColor }}>{groupPaymentModal.type === 'Pago' ? 'Registrar Pago' : groupPaymentModal.type === 'Deuda' ? 'Registrar Deuda' : 'Registrar Abono'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete by Date Modal */}

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
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', textAlign: 'center', margin: 0, fontWeight: '500' }}>
                  ¿Estás seguro de que deseas eliminar permanentemente el pago de <strong>{formatCurrency(deletePaymentModal.payment.amount)}</strong> de <strong>{deletePaymentModal.payment.playerName}</strong>?
                </p>
              </div>
            </div>
            <div className="modal-body" style={{ paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {deleteError && <p style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold' }}>{deleteError}</p>}
              

              <button
                className="btn-danger"
                style={{ width: '100%' }}
                onClick={handleDeletePayment}
                disabled={deletePaymentModal.loading}
              >
                {deletePaymentModal.loading ? 'Eliminando...' : 'Confirmar Eliminación'}
              </button>
              
              <button 
                className="btn-secondary" 
                style={{ width: '100%', border: 'none', background: 'rgba(255,255,255,0.05)', marginTop: '0.25rem' }} 
                onClick={() => { setDeletePaymentModal({ isOpen: false, payment: null, loading: false }); setDeleteError(''); }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Bulk Payments Modal */}
      {deleteBulkModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 4000 }}>
          <div className="modal-content" style={{ maxWidth: '380px', border: `1px solid #ef444430` }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
                <div style={{ background: '#ef444415', padding: '1rem', borderRadius: '50%' }}>
                  <Trash2 size={32} color="#ef4444" />
                </div>
                <h3 className="modal-title" style={{ textAlign: 'center' }}>Eliminación Masiva</h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', textAlign: 'center', margin: 0, fontWeight: '500' }}>
                  ¿Estás seguro de que deseas eliminar permanentemente los <strong>{filteredPaymentsList.length} pagos</strong> resultantes de la búsqueda actual? Esta acción es irreversible.
                </p>
              </div>
            </div>
            <div className="modal-body" style={{ paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {bulkDeleteError && <p style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold' }}>{bulkDeleteError}</p>}
              

              <button
                className="btn-danger"
                style={{ width: '100%' }}
                onClick={() => handleExecuteBulkDelete(filteredPaymentsList.map(p => p.id))}
                disabled={deleteBulkModal.loading}
              >
                {deleteBulkModal.loading ? 'Eliminando...' : 'Confirmar Eliminación Masiva'}
              </button>
              
              <button 
                className="btn-secondary" 
                style={{ width: '100%', border: 'none', background: 'rgba(255,255,255,0.05)', marginTop: '0.25rem' }} 
                onClick={() => { setDeleteBulkModal({ isOpen: false, loading: false }); setBulkDeleteError(''); }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


