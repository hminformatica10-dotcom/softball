import React from 'react';
import { UserPlus, Users, Activity, Search, Award, Edit2, Trash2 } from 'lucide-react';
import { t } from '../../translations';
import type { Player, AppConfig } from '../../types';

interface PlayersTabProps {
  config: AppConfig;
  players: Player[];
  filteredPlayers: Player[];
  loadingPlayers: boolean;
  playerSearch: string;
  setPlayerSearch: (val: string) => void;
  formData: any;
  setFormData: (val: any) => void;
  handlePlayerSubmit: (e: React.FormEvent) => void;
  openEditModal: (type: string, item: any) => void;
  confirmDelete: (type: string, id: string) => void;
  renderSearchBar: (placeholder: string, value: string, setter: (val: string) => void) => React.ReactNode;
  positions: string[];
  showForm: boolean;
  setShowForm: (val: boolean) => void;
}

export const PlayersTab: React.FC<PlayersTabProps> = ({
  config,
  filteredPlayers,
  loadingPlayers,
  playerSearch,
  setPlayerSearch,
  formData,
  setFormData,
  handlePlayerSubmit,
  openEditModal,
  confirmDelete,
  renderSearchBar,
  positions,
  showForm,
  setShowForm
}) => {
  return (
    <div className="grid-layout">
      {showForm && (
        <div className="glass-panel">
          <h2 className="section-title"><UserPlus size={24} color={config.primaryColor} />{t('Registrar Jugador', config.language)} </h2>
          <form onSubmit={handlePlayerSubmit}>
            <div className="form-group"><label className="form-label">{t('Nombre Completo', config.language)} </label><input type="text" className="input-field" placeholder="Ej. Alex Rivera" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
            <div className="form-group"><label className="form-label">{t('Número de Camiseta', config.language)} </label><input type="number" className="input-field" placeholder="Ej. 24" value={formData.jerseyNumber} onChange={e => setFormData({ ...formData, jerseyNumber: e.target.value })} required /></div>
            <div className="form-group"><label className="form-label">{t('Posición', config.language)} </label>
              <div className="position-selector">
                {positions.map(pos => (
                  <button
                    type="button"
                    key={pos}
                    className={`position-button ${formData.position === pos ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, position: pos })}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group"><label className="form-label">{t('Foto (Opcional)', config.language)}</label><input key={formData.photo || 'player-photo-input'} type="file" accept="image/*" className="input-field" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = ev => setFormData({ ...formData, photo: ev.target?.result as string }); reader.readAsDataURL(file); } }} />{formData.photo && <img src={formData.photo} alt="Preview" style={{ marginTop: '0.5rem', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />}</div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input type="checkbox" id="isActive" className="" checked={formData.isActive !== false} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
              <label htmlFor="isActive" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Jugador Activo</label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn-primary" style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, #2563eb 100%)`, flex: 1 }}><UserPlus size={20} />{t('Guardar Jugador', config.language)} </button>
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setFormData({ name: '', jerseyNumber: '', position: '', battingHand: 'Right', photo: '', isActive: true }); }} style={{ flex: 1 }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
        <div className="glass-panel">
          <h2 className="section-title"><UserPlus size={24} color={config.primaryColor} />{t('Registrar Jugador', config.language)} </h2>
          <button className="btn-primary" onClick={() => setShowForm(true)} style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, #2563eb 100%)`, width: '100%', padding: '1rem' }}>
            <UserPlus size={20} style={{ marginRight: '0.5rem' }} /> Agregar Nuevo Jugador
          </button>
        </div>
      )}
      <div className="glass-panel">
        <h2 className="section-title"><Users size={24} color="#8b5cf6" />{t('Roster Actual', config.language)} ({filteredPlayers.length})</h2>
        {renderSearchBar('Buscar por nombre, número o posición...', playerSearch, setPlayerSearch)}

        {loadingPlayers ? <div className="empty-state"><Activity size={48} className="animate-spin" /><h3>Cargando...</h3></div> : filteredPlayers.length === 0 ? <div className="empty-state"><Search size={48} color="#94a3b8" /><h3>{t("No se encontraron jugadores", config.language)}</h3></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredPlayers.map(player => (
              <div key={player.id} className="player-card">
                <div className="player-info" style={{ minWidth: 0, flex: 1 }}>
                  {player.photo ? (
                    <img src={player.photo} alt={player.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${config.primaryColor}50` }} />
                  ) : (
                    <div className="avatar" style={{ background: config.primaryColor, color: '#fff' }}>{player.jerseyNumber}</div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="badge" style={{ background: `${config.primaryColor}20`, color: config.primaryColor, borderColor: `${config.primaryColor}40` }}>
                        <Award size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />{player.position}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderRadius: '6px', background: player.isActive !== false ? '#22c55e20' : '#ef444420', color: player.isActive !== false ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
                    {player.isActive !== false ? 'Activo' : 'Inactivo'}
                  </div>
                  <button className="btn-icon" onClick={() => openEditModal('player', player)} title="Editar"><Edit2 size={18} /></button>
                  <button className="btn-icon" onClick={() => confirmDelete('player', player.id)} title="Eliminar" style={{ color: '#ef4444' }}><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
