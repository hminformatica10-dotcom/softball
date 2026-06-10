import React from 'react';
import { 
  CreditCard, 
  BarChart2,
  MapPin,
  Search
} from 'lucide-react';
import type { Player, Payment, Expense, AppConfig } from '../../types';

interface DashboardTabProps {
  config: AppConfig;
  players: Player[];
  payments: Payment[];
  expenses: Expense[];
  setActiveTab: (tab: string) => void;
  formatCurrency: (val: number) => string;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  config,
  players,
  payments,
  expenses,
  setActiveTab,
  formatCurrency
}) => {
  const totalIncome = payments.reduce((acc, payment) => acc + Number(payment.amount || 0), 0);
  const totalExpenses = expenses.reduce((acc, expense) => acc + Number(expense.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  const actionItems = [
    {
      id: 'Pagos',
      title: 'Historial',
      subtitle: `${payments.length} pagos registrados`,
      Icon: Search,
      color: '#22c55e'
    },
    {
      id: 'Jugadores',
      title: 'Equipo',
      subtitle: `${players.length} jugadores en la plantilla`,
      Icon: MapPin,
      color: '#38bdf8'
    },
    {
      id: 'Gastos',
      title: 'Gastos',
      subtitle: `${expenses.length} gastos registrados`,
      Icon: CreditCard,
      color: '#ef4444'
    },
    {
      id: 'Reportes',
      title: 'Balance',
      subtitle: `Saldo ${formatCurrency(balance)}`,
      Icon: BarChart2,
      color: '#a855f7'
    }
  ];

  return (
    <div className="dashboard-container" style={{ paddingBottom: '1rem', paddingTop: '1rem' }}>
      <div style={{ marginBottom: '2rem', animation: 'fadeInDown 0.4s ease-out' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', maxWidth: '420px', margin: '0 auto', borderRadius: '24px' }}>
          <img src="/logo.png" alt={config.teamName} style={{ height: '84px', objectFit: 'contain', marginBottom: '1rem' }} />
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-color)', fontWeight: 800 }}>{config.teamName}</h1>
          <p style={{ margin: '0.5rem auto 0', maxWidth: '320px', color: '#94a3b8', fontSize: '0.95rem' }}>Bienvenido al panel de control de tu equipo. Accede rápido a la información más importante.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {actionItems.map(item => {
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="glass-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                width: '100%',
                borderRadius: '20px',
                padding: '1rem 1rem 1rem 1rem',
                textAlign: 'left',
                cursor: 'pointer',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(255, 255, 255, 0.04)'
              }}
            >
              <div style={{ width: '52px', height: '52px', borderRadius: '18px', background: `${item.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={24} color={item.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>{item.title}</div>
                <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.2rem' }}>{item.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
