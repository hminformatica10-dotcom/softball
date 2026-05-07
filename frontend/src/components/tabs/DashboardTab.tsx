import React from 'react';
import { 
  DollarSign, 
  CreditCard, 
  UserPlus, 
  BarChart2, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  Plus
} from 'lucide-react';
import type { Player, Payment, Expense, AppConfig } from '../../types';

interface DashboardTabProps {
  config: AppConfig;
  players: Player[];
  payments: Payment[];
  expenses: Expense[];
  setActiveTab: (tab: string) => void;
  formatDate: (date: string) => string;
  formatCurrency: (val: number) => string;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  config,
  players,
  payments,
  expenses,
  setActiveTab,
  formatDate,
  formatCurrency
}) => {
  // Lógica de Saludo Dinámico
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buen día!';
    if (hour < 18) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  };

  // Actividad Reciente (Combinar pagos y gastos)
  const recentActivity = [
    ...payments.filter(p => p.description !== 'Deuda Pendiente').map(p => ({
      id: p.id,
      title: p.playerName,
      subtitle: p.description,
      amount: p.amount,
      date: p.eventDate || p.date || '',
      type: 'income'
    })),
    ...expenses.map(e => ({
      id: e.id,
      title: e.category,
      subtitle: e.description,
      amount: e.amount,
      date: e.eventDate || e.date || '',
      type: 'expense'
    }))
  ]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 5);

  // Alertas (Morosidad activa)
  const activeDebtors = Array.from(new Set(
    payments
      .filter(p => p.description === 'Deuda Pendiente')
      .map(p => p.playerId)
  )).map(pid => {
    const p = players.find(player => player.id === pid);
    const totalDebt = payments
      .filter(pay => pay.playerId === pid && pay.description === 'Deuda Pendiente')
      .reduce((acc, curr) => acc + curr.amount, 0);
    return { id: pid, name: p?.name || 'Desconocido', amount: totalDebt };
  }).filter(d => d.amount > 0);

  const [isFabOpen, setIsFabOpen] = React.useState(false);

  return (
    <div className="dashboard-container" style={{ paddingBottom: '5rem', paddingTop: '1rem' }}>
      {/* 1. Saludo Dinámico */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-color)' }}>
          {getGreeting()}
        </h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>{config.teamName}</p>
      </div>

      {/* 2. Acciones Rápidas (Grid 2x2) */}
      <section className="selection-grid" style={{ marginBottom: '2rem' }}>
        <div 
          className="glass-panel" 
          onClick={() => setActiveTab('Pagos')}
          style={{ padding: '1.25rem', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', transition: 'all 0.2s', borderRadius: '20px' }}
        >
          <div style={{ background: 'rgba(34, 197, 94, 0.15)', padding: '1rem', borderRadius: '16px' }}>
            <DollarSign size={28} color="#22c55e" />
          </div>
          <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.9rem' }}>Registrar Pago</span>
        </div>

        <div 
          className="glass-panel" 
          onClick={() => setActiveTab('Gastos')}
          style={{ padding: '1.25rem', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', transition: 'all 0.2s', borderRadius: '20px' }}
        >
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '1rem', borderRadius: '16px' }}>
            <CreditCard size={28} color="#ef4444" />
          </div>
          <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.9rem' }}>Registrar Gasto</span>
        </div>

        <div 
          className="glass-panel" 
          onClick={() => setActiveTab('Jugadores')}
          style={{ padding: '1.25rem', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', transition: 'all 0.2s', borderRadius: '20px' }}
        >
          <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '1rem', borderRadius: '16px' }}>
            <UserPlus size={28} color="#38bdf8" />
          </div>
          <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.9rem' }}>Jugadores</span>
        </div>

        <div 
          className="glass-panel" 
          onClick={() => setActiveTab('Reportes')}
          style={{ padding: '1.25rem', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', transition: 'all 0.2s', borderRadius: '20px' }}
        >
          <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '1rem', borderRadius: '16px' }}>
            <BarChart2 size={28} color="#a855f7" />
          </div>
          <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.9rem' }}>Reportes</span>
        </div>
      </section>

      <div className="grid-layout" style={{ gap: '2rem' }}>
        {/* 3. Actividad Reciente */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="section-title" style={{ margin: 0, fontSize: '1.2rem' }}>
              <Clock size={20} color={config.primaryColor} /> Actividad Reciente
            </h2>
            <button 
              onClick={() => setActiveTab('Reportes')}
              style={{ background: 'none', border: 'none', color: config.primaryColor, fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Ver todo
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {recentActivity.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}><h3>No hay movimientos</h3></div>
            ) : (
              recentActivity.map(act => (
                <div key={act.id} className="player-card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#f8fafc' }}>{act.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{act.subtitle} • {formatDate(act.date)}</div>
                    </div>
                    <div style={{ 
                      fontWeight: '700', 
                      color: act.type === 'income' ? '#22c55e' : '#ef4444' 
                    }}>
                      {act.type === 'income' ? '+' : '-'}{formatCurrency(act.amount)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 4. Alertas (Morosidad) */}
        {activeDebtors.length > 0 && (
          <section>
            <h2 className="section-title" style={{ fontSize: '1.2rem' }}>
              <AlertCircle size={20} color="#f59e0b" /> Alertas
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {activeDebtors.map(debtor => (
                <div key={debtor.id} className="player-card" style={{ 
                  background: 'rgba(245, 158, 11, 0.05)', 
                  border: '1px solid rgba(245, 158, 11, 0.1)',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                      <div style={{ background: '#f59e0b20', padding: '0.5rem', borderRadius: '50%' }}>
                        <AlertCircle size={18} color="#f59e0b" />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#f8fafc' }}>{debtor.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Deuda pendiente</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', color: '#f59e0b' }}>{formatCurrency(debtor.amount)}</div>
                      <button 
                        onClick={() => setActiveTab('Morosidad')}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}
                      >
                        Cobrar <ChevronRight size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 5. Botón Flotante (+) */}
      <div style={{ 
        position: 'fixed', 
        bottom: '80px', 
        right: '20px', 
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.8rem'
      }}>
        {isFabOpen && (
          <>
            <button 
              onClick={() => { setActiveTab('Pagos'); setIsFabOpen(false); }}
              className="glass-panel"
              style={{ 
                padding: '0.8rem 1.2rem', 
                borderRadius: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.6rem',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.4)'
              }}
            >
              <DollarSign size={18} color="#22c55e" />
              <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#f8fafc' }}>Nuevo Pago</span>
            </button>
            <button 
              onClick={() => { setActiveTab('Gastos'); setIsFabOpen(false); }}
              className="glass-panel"
              style={{ 
                padding: '0.8rem 1.2rem', 
                borderRadius: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.6rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.4)'
              }}
            >
              <CreditCard size={18} color="#ef4444" />
              <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#f8fafc' }}>Nuevo Gasto</span>
            </button>
          </>
        )}
        <button 
          onClick={() => setIsFabOpen(!isFabOpen)}
          style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '50%', 
            background: config.primaryColor,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 24px ${config.primaryColor}50`,
            cursor: 'pointer',
            transition: 'transform 0.2s',
            transform: isFabOpen ? 'rotate(45deg)' : 'none'
          }}
        >
          <Plus size={32} color="#fff" />
        </button>
      </div>
    </div>
  );
};
