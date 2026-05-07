import React, { useState } from 'react';
import { AlertCircle, X, CheckCircle, Trash2, ArrowRight } from 'lucide-react';
import { t } from '../../translations';
import type { Player, Payment, AppConfig } from '../../types';

interface Debtor {
  id: string;
  name: string;
  total: number;
  items: Payment[];
}

interface SaveToQueueAndStorageParams {
  url: string;
  method: string;
  body: unknown | null;
  headers: Record<string, string>;
  teamId: string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

interface DebtsTabProps {
  config: AppConfig;
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  players: Player[];
  activeTeamId: string;
  PAYMENT_API_URL: string;
  saveToQueueAndStorage: (params: SaveToQueueAndStorageParams) => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
  formatCurrency: (val: number) => string;
  formatDate: (val: string) => string;
}

export const DebtsTab: React.FC<DebtsTabProps> = ({
  config,
  payments,
  setPayments,
  players,
  activeTeamId,
  PAYMENT_API_URL,
  saveToQueueAndStorage,
  getAuthHeaders,
  formatCurrency,
  formatDate
}) => {
  const [selectedDebtorId, setSelectedDebtorId] = useState<string | null>(null);
  const [isNewDebtModalOpen, setIsNewDebtModalOpen] = useState(false);
  const [newDebtData, setNewDebtData] = useState({
    playerId: '',
    amount: '',
    notes: '',
    eventDate: ''
  });

  const debts = payments.filter(p => p.description === 'Deuda Pendiente');
  const debtorsMap = new Map<string, { id: string; name: string; total: number; items: Payment[] }>();
  
  debts.forEach(d => {
      if (!debtorsMap.has(d.playerId)) {
        debtorsMap.set(d.playerId, { id: d.playerId, name: d.playerName, total: 0, items: [] });
      }
      const entry = debtorsMap.get(d.playerId);
      entry!.total += d.amount;
      entry!.items.push(d);
  });

  const activeDebtors = Array.from(debtorsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const selectedDebtor = selectedDebtorId ? debtorsMap.get(selectedDebtorId) : null;

  const handleAddNewDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebtData.playerId || !newDebtData.amount || !newDebtData.eventDate) return;

    const player = players.find(p => p.id === newDebtData.playerId);
    const payload = {
      playerId: newDebtData.playerId,
      playerName: player?.name || 'Jugador',
      amount: parseFloat(newDebtData.amount),
      description: 'Deuda Pendiente',
      notes: newDebtData.notes,
      eventDate: new Date(newDebtData.eventDate + 'T12:00:00').toISOString() // Avoid timezone shift
    };

    try {
      if (!navigator.onLine) {
        const fakeId = `offline_${Date.now()}`;
        const offlinePayment = { ...payload, id: fakeId, registrationDate: new Date().toISOString() } as Payment;
        saveToQueueAndStorage({ url: PAYMENT_API_URL, method: 'POST', body: payload, teamId: activeTeamId });
        setPayments(prev => [...prev, offlinePayment]);
      } else {
        const res = await fetch(PAYMENT_API_URL, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const saved = await res.json();
          setPayments(prev => [...prev, saved]);
        }
      }
      setIsNewDebtModalOpen(false);
      setNewDebtData({ playerId: '', amount: '', notes: '', eventDate: '' });
    } catch (e) {
      alert("Error al guardar la deuda.");
    }
  };

  const handleLiquidate = async (debtor: Debtor) => {
      if (!confirm(`¿Liquidar toda la deuda de ${debtor.name} ($${formatCurrency(debtor.total)})?`)) return;
      
      try {
          const debtIds = debtor.items.map((d) => d.id);
          
          for (const debt of debtor.items) {
             const payload = { ...debt, description: 'Abono de Deuda', eventDate: debt.eventDate };
             
             if (!navigator.onLine) {
                 saveToQueueAndStorage({ url: `${PAYMENT_API_URL}/${payload.id}`, method: 'PUT', body: payload, teamId: activeTeamId });
             } else {
                 try {
                     await fetch(`${PAYMENT_API_URL}/${debt.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) });
                 } catch {
                     saveToQueueAndStorage({ url: `${PAYMENT_API_URL}/${payload.id}`, method: 'PUT', body: payload, teamId: activeTeamId });
                 }
             }
          }

          setPayments((prev: Payment[]) => {
            const updated = prev.map(p => {
              if (debtIds.includes(p.id)) return { ...p, description: 'Abono de Deuda' };
              return p;
            });
            localStorage.setItem(`softball_payments_${activeTeamId}`, JSON.stringify(updated));
            return updated;
          });
          
          alert(`Se liquidaron exitosamente $${formatCurrency(debtor.total)} de ${debtor.name}`);
          setSelectedDebtorId(null);
      } catch (e) {
          alert("Error al liquidar deudas de forma local.");
      }
  };

  const handleDeleteDebt = async (debtor: Debtor) => {
    if (!confirm(`¿Estás seguro de que deseas ELIMINAR permanentemente la deuda de ${debtor.name} ($${formatCurrency(debtor.total)})? Esta acción no se puede deshacer y no generará un ingreso.`)) return;
    
    try {
      const debtIds = debtor.items.map((d) => d.id);
      
      for (const id of debtIds) {
        if (!navigator.onLine) {
          saveToQueueAndStorage({ url: `${PAYMENT_API_URL}/${id}`, method: 'DELETE', body: null, teamId: activeTeamId });
        } else {
          try {
            await fetch(`${PAYMENT_API_URL}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
          } catch {
            saveToQueueAndStorage({ url: `${PAYMENT_API_URL}/${id}`, method: 'DELETE', body: null, teamId: activeTeamId });
          }
        }
      }

      setPayments((prev: Payment[]) => {
        const updated = prev.filter(p => !debtIds.includes(p.id));
        localStorage.setItem(`softball_payments_${activeTeamId}`, JSON.stringify(updated));
        return updated;
      });
      setSelectedDebtorId(null);
    } catch (e) {
      alert("Error al intentar eliminar las deudas.");
    }
  };

  return (
    <div className="grid-layout">
      <div className="glass-panel" style={{ width: '100%', gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 className="section-title"><AlertCircle size={24} color="#ef4444" /> {t('Pendientes de Cobro', config.language)}</h2>
          <button 
            className="btn-secondary" 
            onClick={() => setIsNewDebtModalOpen(true)} 
            style={{ borderColor: '#ef4444', color: '#ef4444', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            + {t('Nueva Deuda', config.language)}
          </button>
        </div>

        {activeDebtors.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} color="#22c55e" style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <h3>¡Excelente trabajo!</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay deudas pendientes registradas en el equipo.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeDebtors.map(debtor => (
              <div 
                key={debtor.id} 
                onClick={() => setSelectedDebtorId(debtor.id)}
                className="selection-card"
                style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  padding: '1rem 1.25rem', 
                  borderRadius: '16px', 
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid rgba(255,255,255,0.05)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc' }}>{debtor.name}</div>
                  <div style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 'bold' }}> {formatCurrency(debtor.total)} pendiente </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '50%', color: '#94a3b8' }}>
                  <ArrowRight size={20} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Nueva Deuda */}
      {isNewDebtModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title"><AlertCircle size={24} color="#ef4444" /> Registrar Deuda</h3>
              <button className="btn-icon" onClick={() => setIsNewDebtModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddNewDebt} className="modal-body">
              <div className="form-group">
                <label className="form-label">{t('Jugador', config.language)}</label>
                <select 
                  className="input-field" 
                  value={newDebtData.playerId} 
                  onChange={e => setNewDebtData({...newDebtData, playerId: e.target.value})} 
                  required
                >
                  <option value="" disabled>{t('Seleccione un jugador', config.language)}</option>
                  {[...players].sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                    <option key={p.id} value={p.id}>{p.name} - #{p.jerseyNumber}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monto ($)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="input-field" 
                  placeholder="0.00" 
                  value={newDebtData.amount} 
                  onChange={e => setNewDebtData({...newDebtData, amount: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={newDebtData.eventDate} 
                  onChange={e => setNewDebtData({...newDebtData, eventDate: e.target.value})} 
                  required 
                  style={{ colorScheme: 'dark' }} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Motivo (Opcional)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ej. Uniforme" 
                  value={newDebtData.notes} 
                  onChange={e => setNewDebtData({...newDebtData, notes: e.target.value})} 
                />
              </div>
              <div className="modal-footer" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsNewDebtModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: '#ef4444' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detalle */}
      {selectedDebtor && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Deuda: {selectedDebtor.name}</h3>
              <button className="btn-icon" onClick={() => setSelectedDebtorId(null)}><X size={24} /></button>
            </div>
            
            <div className="modal-body">
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1.25rem', borderRadius: '16px', textAlign: 'center', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Pendiente</div>
                <div style={{ color: '#ef4444', fontSize: '2.4rem', fontWeight: '900' }}>{formatCurrency(selectedDebtor.total)}</div>
              </div>

              <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: '800', letterSpacing: '0.05em' }}>Desglose detallado</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {selectedDebtor.items.map((i) => (
                  <div key={i.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '1rem' }}>{formatCurrency(i.amount)}</span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>{formatDate(i.eventDate)}</span>
                    </div>
                    {i.notes && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem', fontStyle: 'italic' }}>{i.notes}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>


                <button 
                  onClick={() => handleDeleteDebt(selectedDebtor)} 
                  className="btn-secondary"
                  style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444', fontSize: '0.85rem' }}
                >
                  <Trash2 size={18} /> Borrar
                </button>
              </div>

              <button 
                onClick={() => handleLiquidate(selectedDebtor)} 
                className="btn-primary"
                style={{ width: '100%', background: '#22c55e', fontWeight: '800' }}
              >
                <CheckCircle size={18} /> Liquidar Total
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
