import React from 'react';
import { Calendar, Activity, Search, Edit2, Trash2 } from 'lucide-react';
import { t } from '../../translations';
import type { Game, AppConfig } from '../../types';

interface GamesTabProps {
  config: AppConfig;
  gameFormData: any;
  setGameFormData: (val: any) => void;
  handleGameSubmit: (e: React.FormEvent) => void;
  filteredGames: Game[];
  loadingGames: boolean;
  gameSearch: string;
  setGameSearch: (val: string) => void;
  renderSearchBar: (placeholder: string, value: string, setter: (val: string) => void) => React.ReactNode;
  renderDateFilter: () => React.ReactNode;
  formatDate: (dateString: string) => string;
  formatCurrency: (val: number) => string;
  openEditModal: (type: string, item: any) => void;
  confirmDelete: (type: string, id: string) => void;
  showForm: boolean;
  setShowForm: (val: boolean) => void;
}

export const GamesTab: React.FC<GamesTabProps> = ({
  config,
  gameFormData,
  setGameFormData,
  handleGameSubmit,
  filteredGames,
  loadingGames,
  gameSearch,
  setGameSearch,
  renderSearchBar,
  renderDateFilter,
  formatDate: _formatDate,
  formatCurrency,
  openEditModal,
  confirmDelete,
  showForm,
  setShowForm
}) => {
  return (
    <div className="grid-layout">
      {showForm && (
        <div className="glass-panel">
          <h2 className="section-title"><Calendar size={22} color={config.primaryColor} />Registro de Juego</h2>
          <form onSubmit={handleGameSubmit}>
            <div className="form-group"><label className="form-label">{t('Oponente / Vs', config.language)} </label><input type="text" className="input-field" placeholder="Ej. Los Tigres" value={gameFormData.opponent} onChange={e => setGameFormData({ ...gameFormData, opponent: e.target.value })} required /></div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label className="form-label">{t('Fecha', config.language)} </label><input type="date" className="input-field" value={gameFormData.eventDate} onChange={e => setGameFormData({ ...gameFormData, eventDate: e.target.value })} required style={{ colorScheme: 'dark' }} /></div>
              <div className="form-group"><label className="form-label">{t('Hora', config.language)} </label><input type="time" className="input-field" value={gameFormData.time} onChange={e => setGameFormData({ ...gameFormData, time: e.target.value })} style={{ colorScheme: 'dark' }} /></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label className="form-label">{t('Lugar / Estadio', config.language)} </label><input type="text" className="input-field" placeholder="Ej. Estadio" value={gameFormData.location || ''} onChange={e => setGameFormData({ ...gameFormData, location: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Cuota por juego ($) </label><input type="number" className="input-field" placeholder="Ej. 10" value={gameFormData.feePerPerson || ''} onChange={e => setGameFormData({ ...gameFormData, feePerPerson: e.target.value })} /></div>
            </div>
            <div className="form-group"><label className="form-label">Pago de terreno ($) </label><input type="number" className="input-field" placeholder="Ej. 500" value={gameFormData.fieldPayment || ''} onChange={e => setGameFormData({ ...gameFormData, fieldPayment: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">{t('Resultado', config.language)} </label>
              <select className="input-field" value={gameFormData.result} onChange={e => setGameFormData({ ...gameFormData, result: e.target.value })}>
                <option value="Pendiente">Pendiente</option><option value="Victoria">Victoria</option><option value="Derrota">Derrota</option><option value="Empate">Empate</option><option value="Suspendido">Suspendido</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn-primary" style={{ background: config.primaryColor, flex: 1 }}><Calendar size={18} />Guardar Registro</button>
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setGameFormData({ opponent: '', eventDate: new Date().toISOString().split('T')[0], time: '', location: '', result: 'Pendiente', feePerPerson: '', fieldPayment: '' }); }} style={{ flex: 1 }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
        <div className="glass-panel">
          <h2 className="section-title"><Calendar size={22} color={config.primaryColor} />Registro de Juego</h2>
          <button className="btn-primary" onClick={() => setShowForm(true)} style={{ background: config.primaryColor, width: '100%', padding: '1rem' }}>
            <Calendar size={20} style={{ marginRight: '0.5rem' }} /> Agregar Registro de Juego
          </button>
        </div>
      )}
      <div className="glass-panel">
        <h2 className="section-title"><Activity size={22} color="#8b5cf6" />{t('Calendario Reciente', config.language)} ({filteredGames.length})</h2>
        {renderDateFilter()}
        <div style={{ marginBottom: '1rem' }}>
          {renderSearchBar(t('Buscar por oponente...', config.language), gameSearch, setGameSearch)}
        </div>

        {loadingGames ? <div className="empty-state"><Activity size={48} className="animate-spin" /><h3>Cargando...</h3></div> : filteredGames.length === 0 ? <div className="empty-state"><Search size={48} color="#94a3b8" style={{ opacity: 0.3 }} /><h3>Nada que mostrar</h3></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredGames.map(game => (
              <div key={game.id} className="player-card" style={{ borderLeft: `4px solid ${game.result === 'Victoria' ? '#22c55e' : game.result === 'Derrota' ? '#ef4444' : game.result === 'Pendiente' ? '#f59e0b' : '#94a3b8'}` }}>
                <div className="flex-responsive" style={{ gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '12px', minWidth: '55px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800' }}>
                        {new Date(game.eventDate || game.date || 0).toLocaleDateString(config.language === 'en' ? 'en-US' : 'es-ES', { month: 'short', timeZone: 'UTC' })}
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', lineHeight: '1' }}>
                        {new Date(game.eventDate || game.date || 0).getUTCDate()}
                      </div>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Vs {game.opponent}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                        <span style={{ 
                          padding: '1px 6px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase',
                          background: game.result === 'Victoria' ? '#22c55e20' : game.result === 'Derrota' ? '#ef444420' : '#f59e0b20',
                          color: game.result === 'Victoria' ? '#22c55e' : game.result === 'Derrota' ? '#ef4444' : '#f59e0b',
                          border: `1px solid ${game.result === 'Victoria' ? '#22c55e30' : game.result === 'Derrota' ? '#ef444430' : '#f59e0b30'}`
                        }}>
                          {game.result}
                        </span>
                        {game.time && <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>• {game.time}</span>}
                        {game.location && <span style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>• {game.location}</span>}
                        {game.feePerPerson ? <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>• Cuota {formatCurrency(Number(game.feePerPerson))}</span> : null}
                        {game.fieldPayment ? <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>• Terreno {formatCurrency(Number(game.fieldPayment))}</span> : null}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-start' }}>
                    <button className="btn-icon" onClick={() => openEditModal('game', game)} style={{ padding: '0.5rem' }}><Edit2 size={16} /></button>
                    <button className="btn-icon" onClick={() => confirmDelete('game', game.id)} style={{ padding: '0.5rem', color: '#ef4444' }}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
