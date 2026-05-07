import { CreditCard, Camera, X } from 'lucide-react';
import { t } from '../../translations';
import type { AppConfig } from '../../types';
import React from 'react';

interface ExpensesTabProps {
  config: AppConfig;
  expenseFormData: any;
  setExpenseFormData: (val: any) => void;
  handleExpenseSubmit: (e: React.FormEvent) => void;
  expenseCategories: string[];
  setViewingReceipt?: (val: string | null) => void;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  config,
  expenseFormData,
  setExpenseFormData,
  handleExpenseSubmit,
  expenseCategories,
  setViewingReceipt
}) => {
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setExpenseFormData({ ...expenseFormData, receipt: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid-layout">
      <div className="glass-panel">
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
          
          <div className="form-group">
            <label className="form-label">Foto del Recibo (Opcional)</label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
               <label className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', cursor: 'pointer', borderColor: expenseFormData.receipt ? '#22c55e' : 'rgba(255,255,255,0.1)', color: expenseFormData.receipt ? '#22c55e' : '#94a3b8', padding: '0.6rem', fontSize: '0.9rem' }}>
                 <Camera size={18} /> {expenseFormData.receipt ? 'Cambiar Foto' : 'Tomar Foto'}
                 <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoCapture} />
               </label>
               {expenseFormData.receipt && (
                 <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img 
                      src={expenseFormData.receipt} 
                      alt="Preview" 
                      onClick={() => setViewingReceipt?.(expenseFormData.receipt)}
                      style={{ height: '48px', width: '48px', borderRadius: '10px', objectFit: 'cover', cursor: 'pointer', border: `2px solid #22c55e50` }} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setExpenseFormData({ ...expenseFormData, receipt: '' })} 
                      style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                    >
                      <X size={12} color="white" />
                    </button>
                 </div>
               )}
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
            <CreditCard size={18} /> {t('Guardar Gasto', config.language)} 
          </button>
        </form>
      </div>
    </div>
  );
};
