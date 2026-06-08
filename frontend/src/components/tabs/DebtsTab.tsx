import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { t } from '../../translations';
import type { Player, Payment, AppConfig, Game } from '../../types';

interface SaveToQueueAndStorageParams {
  url: string;
  method: string;
  body: unknown | null;
  headers?: Record<string, string>;
  teamId: string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

const createOfflinePaymentId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `offline_${Math.floor(Math.random() * 1e9)}`;
};

const buildOfflinePayment = (payload: Omit<Payment, 'id'>): Payment => ({
  ...payload,
  id: createOfflinePaymentId(),
  registrationDate: new Date().toISOString()
});

interface DebtsTabProps {
  config: AppConfig;
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  players: Player[];
  games: Game[];
  activeTeamId: string;
  PAYMENT_API_URL: string;
  saveToQueueAndStorage: (params: SaveToQueueAndStorageParams) => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
  formatCurrency: (val: number) => string;
  formatDate: (val: string) => string;
  normalizeDate: (dateString: string) => string;
}

export const DebtsTab: React.FC<DebtsTabProps> = ({
  config,
  payments,
  setPayments,
  players,
  games,
  activeTeamId,
  PAYMENT_API_URL,
  saveToQueueAndStorage,
  getAuthHeaders,
  formatCurrency,
  formatDate
  ,
  normalizeDate
}) => {
  // New: find unpaid players for the most recent game
  const sortedGames = [...games].sort((a, b) => new Date(b.eventDate || b.date || 0).getTime() - new Date(a.eventDate || a.date || 0).getTime());
  const latestGame = sortedGames[0] || null;
  const latestGameFee = latestGame ? Number(latestGame.feePerPerson || 0) : 0;

  const unpaidPlayers = useMemo(() => {
    if (!latestGame) return [] as Player[];
    return players.filter(p => p.isActive !== false).filter(p => {
      const matchesLatestGame = (pay: Payment) => {
        if (pay.gameId) return pay.gameId === latestGame.id;
        const expected = `Vs ${latestGame.opponent}`.toLowerCase();
        const notesMatch = !!(pay.notes && pay.notes.toLowerCase().includes(expected));
        if (!notesMatch) return false;
        const pDate = (pay.eventDate || pay.date || '').split('T')[0];
        const gDate = (latestGame.eventDate || latestGame.date || '').split('T')[0];
        return pDate === gDate;
      };

      const payment = payments.find(pay => pay.playerId === p.id && matchesLatestGame(pay));
      const absent = payments.find(pay => pay.playerId === p.id && pay.description === 'Ausente' && matchesLatestGame(pay));
      const paid = payment && payment.description !== 'Deuda Pendiente' && payment.description !== 'Ausente';
      return !paid && !absent;
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [players, payments, latestGame]);

  const handleSettle = async (player: Player) => {
    if (!latestGame) return;
    const gameDateStr = formatDate(latestGame.eventDate || latestGame.date || '');
    const amount = Number(latestGame.feePerPerson) || Number(prompt(`Monto a cobrar para ${player.name}:`, String(latestGame.feePerPerson || '0'))) || 0;
    const payload = { playerId: player.id, playerName: player.name, amount, description: 'Pago de Play', notes: `Juego Vs ${latestGame.opponent} (${gameDateStr})`, eventDate: normalizeDate(latestGame.eventDate || latestGame.date || ''), gameId: latestGame.id };

    try {
      if (!navigator.onLine) {
        const offlinePayment = buildOfflinePayment(payload as Omit<Payment, 'id'>);
        saveToQueueAndStorage({ url: PAYMENT_API_URL, method: 'POST', body: payload, teamId: activeTeamId });
        setPayments(prev => [...prev, offlinePayment]);
      } else {
        const res = await fetch(PAYMENT_API_URL, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
        if (res.ok) {
          const saved = await res.json();
          setPayments(prev => [...prev, saved]);
        }
      }
      alert(`${player.name} marcado como pagado.`);
    } catch {
      alert('Error al registrar pago.');
    }
  };

  const handleMarkAbsent = async (player: Player) => {
    if (!latestGame) return;
    if (!confirm(`¿Marcar a ${player.name} como ausente?`)) return;
    const gameDateStr = formatDate(latestGame.eventDate || latestGame.date || '');
    const payload = { playerId: player.id, playerName: player.name, amount: 0, description: 'Ausente', notes: `Juego Vs ${latestGame.opponent} (${gameDateStr})`, eventDate: normalizeDate(latestGame.eventDate || latestGame.date || ''), gameId: latestGame.id };

    try {
      if (!navigator.onLine) {
        const offlinePayment = buildOfflinePayment(payload as Omit<Payment, 'id'>);
        saveToQueueAndStorage({ url: PAYMENT_API_URL, method: 'POST', body: payload, teamId: activeTeamId });
        setPayments(prev => [...prev, offlinePayment]);
      } else {
        const res = await fetch(PAYMENT_API_URL, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
        if (res.ok) {
          const saved = await res.json();
          setPayments(prev => [...prev, saved]);
        }
      }
      alert(`${player.name} marcado como ausente.`);
    } catch {
      alert('Error al marcar ausencia.');
    }
  };

  return (
    <div className="grid-layout">
      <div className="glass-panel" style={{ width: '100%', gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 className="section-title"><AlertCircle size={24} color="#ef4444" /> {t('Pendientes de Cobro', config.language)}</h2>
        </div>

        {!latestGame ? (
          <div className="empty-state">
            <CheckCircle size={48} color="#22c55e" style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <h3>No hay juegos registrados</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Registra un juego para ver la lista de pendientes.</p>
          </div>
        ) : unpaidPlayers.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} color="#22c55e" style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <h3>¡Todo cobrado!</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay jugadores pendientes para el último partido.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ marginBottom: '0.5rem', color: '#94a3b8' }}>
              Último juego: Vs {latestGame.opponent} — {formatDate(latestGame.eventDate || latestGame.date || '')}
              {latestGameFee > 0 && (
                <div style={{ marginTop: '0.25rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
                  Monto por jugador: {formatCurrency(latestGameFee)}
                </div>
              )}
            </div>
            {unpaidPlayers.map(player => (
              <div key={player.id} className="player-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#f8fafc' }}>{player.name} <span style={{fontSize: '0.8em', color: '#94a3b8', fontWeight: '400'}}>#{player.jerseyNumber}</span></div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleSettle(player)} className="btn-primary" style={{ background: '#22c55e', padding: '0.5rem 0.8rem' }}>Saldar deuda</button>
                  <button onClick={() => handleMarkAbsent(player)} className="btn-secondary" style={{ padding: '0.5rem 0.8rem', borderColor: '#ef4444', color: '#ef4444' }}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
