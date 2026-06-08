import { CreditCard, Edit2, Activity, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { t } from '../../translations';
import type { AppConfig, Expense } from '../../types';
import React, { useState } from 'react';

interface ExpensesTabProps {
  config: AppConfig;
  expenseFormData: any;
  setExpenseFormData: (val: any) => void;
  handleExpenseSubmit: (e: React.FormEvent) => void;
  expenseCategories: string[];
  expenses?: Expense[];
  formatCurrency?: (val: number) => string;
  openEditModal?: (type: string, data: any) => void;
  confirmDelete?: (type: string, id: string) => void;
  showForm: boolean;
  setShowForm: (val: boolean) => void;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  config,
  expenseFormData,
  setExpenseFormData,
  handleExpenseSubmit,
  expenseCategories,
  expenses = [],
  formatCurrency = (val) => `$${val.toFixed(2)}`,
  openEditModal,
  confirmDelete,
  showForm,
  setShowForm
}) => {
  const [dateFilter, setDateFilter] = useState('');
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  return (
    <div className="grid-layout">
      {showForm && (
      <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
        <h2 className="section-title"><CreditCard size={24} color="#ef4444" />{t('Gasto de Equipo', config.language)} </h2>
        <form onSubmit={handleExpenseSubmit}>
          <div className="form-group">
            <label className="form-label">{t('Categoría', config.language)}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
              {expenseCategories.map(cat => {
                const isSelected = expenseFormData.category === cat;
                return (
                  <div 
                    key={cat}
                    onClick={() => setExpenseFormData({ ...expenseFormData, category: cat })}
                    style={{
                      padding: '0.6rem 0.8rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', transition: 'all 0.2s ease', textAlign: 'center', flex: '1', minWidth: '90px',
                      background: isSelected ? '#ef444420' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isSelected ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                      color: isSelected ? '#ef4444' : '#94a3b8'
                    }}
                  >
                    {cat}
                  </div>
                );
              })}
            </div>
          </div>
          {expenseFormData.category === 'Otro' && (
            <div className="form-group">
              <label className="form-label">¿Cuál es el gasto?</label>
              <input type="text" className="input-field" placeholder="Especifique..." value={expenseFormData.otherCategory || ''} onChange={e => setExpenseFormData({ ...expenseFormData, otherCategory: e.target.value })} required />
            </div>
          )}
          <div className="form-group"><label className="form-label">{t('Monto ($)', config.language)} </label><input type="number" min="1" step="0.1" className="input-field" placeholder="0.00" value={expenseFormData.amount} onChange={e => setExpenseFormData({ ...expenseFormData, amount: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">{t('Fecha', config.language)} </label><input type="date" className="input-field" value={expenseFormData.eventDate} onChange={e => setExpenseFormData({ ...expenseFormData, eventDate: e.target.value })} required style={{ colorScheme: 'dark' }} /></div>
          <div className="form-group"><label className="form-label">{t('Descripción', config.language)} </label><input type="text" className="input-field" placeholder="Ej. Pago de inscripción" value={expenseFormData.description} onChange={e => setExpenseFormData({ ...expenseFormData, description: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">{t('Responsable', config.language)} </label><input type="text" className="input-field" placeholder="Ej. Juan Pérez" value={expenseFormData.responsible || ''} onChange={e => setExpenseFormData({ ...expenseFormData, responsible: e.target.value })} /></div>
          
          <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
            <CreditCard size={18} /> {t('Guardar Gasto', config.language)} 
          </button>
          <button type="button" onClick={() => { setShowForm(false); setExpenseFormData({ category: '', otherCategory: '', amount: '', eventDate: new Date().toISOString().split('T')[0], description: '', responsible: '' }); }} className="btn-secondary" style={{ marginTop: '0.5rem' }}>
            {t('Cancelar', config.language)}
          </button>
        </form>
      </div>
      )}
      {!showForm && (
      <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
        <button onClick={() => setShowForm(true)} className="btn-primary" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', width: '100%' }}>
          <CreditCard size={18} /> Agregar Nuevo Gasto
        </button>
      </div>
      )}

      <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
        <h3 className="section-title" style={{ color: '#ef4444' }}>
          <Activity size={22} /> {t('Historial de Gastos', config.language)}
        </h3>
        
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">{t('Filtrar por Fecha', config.language)}</label>
          <input
            type="date"
            className="input-field"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            style={{ colorScheme: 'dark', width: '100%' }}
          />
        </div>
        
        {(() => {
          const filteredByDate = dateFilter
            ? expenses.filter(e => (e.eventDate && e.eventDate.startsWith(dateFilter)) || (e.date && e.date.startsWith(dateFilter)))
            : expenses;
          const sorted = [...filteredByDate].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
          const recentExpenses = showAllExpenses ? sorted : sorted.slice(0, 5);

          return recentExpenses.length === 0 ? (
            <div className="empty-state">
              <Activity size={48} color="#94a3b8" style={{ opacity: 0.3 }} />
              <h3>{t('No hay gastos registrados', config.language)}</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentExpenses.map(expense => (
                  <div key={expense.id} className="player-card" style={{ padding: '0.75rem', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>{expense.category}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{expense.description}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(expense.eventDate).toLocaleDateString(config.language === 'es' ? 'es-ES' : 'en-US')}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(expense.amount)}</span>
                        {openEditModal && (
                          <button 
                            className="btn-icon" 
                            onClick={() => openEditModal('expense', expense)}
                            title="Editar gasto"
                            style={{ 
                              opacity: 1,
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {confirmDelete && (
                          <button 
                            className="btn-icon" 
                            onClick={() => confirmDelete('expense', expense.id)}
                            title="Eliminar gasto"
                            style={{ 
                              opacity: 1,
                              cursor: 'pointer',
                              color: '#ef4444'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {sorted.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllExpenses(!showAllExpenses)}
                  style={{
                    marginTop: '0.5rem',
                    background: 'transparent',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    color: config.primaryColor || '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '16px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = `1px solid ${config.primaryColor || '#ef4444'}`;
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = '1px dashed rgba(255,255,255,0.1)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {showAllExpenses ? (
                    <>
                      <ChevronUp size={18} /> Ver menos
                    </>
                  ) : (
                    <>
                      <ChevronDown size={18} /> Ver más ({sorted.length - 5})
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })()}
      </div>

    </div>
  );
};
