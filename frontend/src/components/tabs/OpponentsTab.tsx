import React, { useState } from 'react';
import { Shield, Plus, Search, MapPin, Tag, User, Phone, FileText, Edit2, Trash2, Check } from 'lucide-react';
import type { Opponent, AppConfig } from '../../types';

interface OpponentsTabProps {
  config: AppConfig;
  opponents: Opponent[];
  setOpponents: React.Dispatch<React.SetStateAction<Opponent[]>>;
  activeTeamId: string;
  OPPONENT_API_URL: string;
  mutateData: any;
  openEditModal: (type: string, item: any) => void;
  confirmDelete: (type: string, id: string) => void;
}

export const OpponentsTab: React.FC<OpponentsTabProps> = ({
  config,
  opponents,
  setOpponents,
  activeTeamId,
  OPPONENT_API_URL,
  mutateData,
  openEditModal,
  confirmDelete
}) => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [coach, setCoach] = useState('');
  const [phone, setPhone] = useState('');
  const [notesText, setNotesText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpponentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      city: city.trim(),
      category: category.trim(),
      coach: coach.trim(),
      phone: phone.trim(),
      notes: notesText.trim()
    };

    mutateData(
      OPPONENT_API_URL,
      'POST',
      payload,
      setOpponents,
      `softball_opponents_${activeTeamId}`,
      (success: boolean) => {
        if (success) {
          setName('');
          setCity('');
          setCategory('');
          setCoach('');
          setPhone('');
          setNotesText('');
          setShowForm(false);
        } else {
          alert('No se pudo crear el oponente.');
        }
      }
    );
  };

  const filteredOpponents = opponents.filter(opp => {
    const query = searchQuery.toLowerCase();
    return (
      opp.name.toLowerCase().includes(query) ||
      (opp.city && opp.city.toLowerCase().includes(query)) ||
      (opp.category && opp.category.toLowerCase().includes(query)) ||
      (opp.coach && opp.coach.toLowerCase().includes(query))
    );
  });

  return (
    <div className="grid-layout">
      {showForm && (
        <div className="glass-panel">
          <h2 className="section-title">
            <Shield size={24} color={config.primaryColor} /> Registrar Oponente
          </h2>
          <form onSubmit={handleOpponentSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre del Equipo *</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. Los Tigres"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ciudad (Opcional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. Santo Domingo"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría (Opcional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. B, C, Libre"
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Entrenador / Manager (Opcional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. Juan Pérez"
                value={coach}
                onChange={e => setCoach(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono (Opcional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. 809-555-0199"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Observaciones (Opcional)</label>
              <textarea
                className="input-field"
                placeholder="Detalles sobre el equipo, nivel de juego, etc."
                value={notesText}
                onChange={e => setNotesText(e.target.value)}
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, #2563eb 100%)`, flex: 1 }}
              >
                <Check size={20} /> Guardar Oponente
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setName('');
                  setCity('');
                  setCategory('');
                  setCoach('');
                  setPhone('');
                  setNotesText('');
                }}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
        <div className="glass-panel">
          <h2 className="section-title">
            <Shield size={24} color={config.primaryColor} /> Registrar Oponente
          </h2>
          <button
            className="btn-primary"
            onClick={() => setShowForm(true)}
            style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, #2563eb 100%)`, width: '100%', padding: '1rem' }}
          >
            <Plus size={20} style={{ marginRight: '0.5rem' }} /> Agregar Nuevo Oponente
          </button>
        </div>
      )}

      <div className="glass-panel">
        <h2 className="section-title">
          <Shield size={24} color="#8b5cf6" /> Oponentes Registrados ({filteredOpponents.length})
        </h2>
        
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.75rem 1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Search size={20} color="#94a3b8" style={{ marginRight: '0.5rem' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, ciudad, categoría, manager..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#f8fafc', width: '100%', outline: 'none', fontSize: '1rem' }}
          />
        </div>

        {opponents.length === 0 ? (
          <div className="empty-state">
            <Shield size={48} style={{ opacity: 0.3 }} />
            <h3>No hay oponentes registrados</h3>
            <p style={{ maxWidth: '300px', margin: '0 auto', fontSize: '0.9rem' }}>
              Registra equipos oponentes para poder programar juegos y relacionar los pagos correctamente.
            </p>
          </div>
        ) : filteredOpponents.length === 0 ? (
          <div className="empty-state">
            <Search size={48} color="#94a3b8" />
            <h3>No se encontraron oponentes</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredOpponents.map((opp) => (
              <div key={opp.id} className="player-card" style={{ borderLeft: `3px solid ${config.primaryColor}` }}>
                <div className="player-info" style={{ minWidth: 0, flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#f8fafc', marginBottom: '0.4rem' }}>
                    {opp.name}
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                    {opp.city && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MapPin size={14} color={config.primaryColor} /> {opp.city}
                      </span>
                    )}
                    {opp.category && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Tag size={14} color="#8b5cf6" /> Cat. {opp.category}
                      </span>
                    )}
                    {opp.coach && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={14} color="#ec4899" /> Dir: {opp.coach}
                      </span>
                    )}
                    {opp.phone && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Phone size={14} color="#10b981" /> {opp.phone}
                      </span>
                    )}
                  </div>

                  {opp.notes && (
                    <div style={{ 
                      marginTop: '0.5rem', 
                      fontSize: '0.85rem', 
                      color: 'rgba(255, 255, 255, 0.6)', 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '0.25rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '8px',
                      width: '100%'
                    }}>
                      <FileText size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{opp.notes}</span>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center', alignSelf: 'center' }}>
                  <button className="btn-icon" onClick={() => openEditModal('opponent', opp)} title="Editar">
                    <Edit2 size={18} />
                  </button>
                  <button className="btn-icon" onClick={() => confirmDelete('opponent', opp.id)} title="Eliminar" style={{ color: '#ef4444' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
