import React, { useRef, useState } from 'react';
import { StickyNote, Plus, Trash2, Edit3, Calendar, ChevronDown, Check, X, AlertCircle, Download, Upload, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { t } from '../../translations';
import type { Note, AppConfig } from '../../types';

interface NotesTabProps {
  config: AppConfig;
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  activeTeamId: string;
  NOTE_API_URL: string;
  mutateData: (url: string, method: string, payload: unknown, setter: React.Dispatch<React.SetStateAction<Note[]>>, cacheKey: string, onSuccess: (success: boolean) => void) => Promise<void>;
  formatDate: (dateString: string) => string;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  config,
  notes,
  setNotes,
  activeTeamId,
  NOTE_API_URL,
  mutateData,
  formatDate
}) => {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Local notes expansion
  const [showAllNotes, setShowAllNotes] = useState(false);

  const openCreateModal = () => {
    setTitle('');
    setContent('');
    setErrorMsg('');
    setIsEditing(false);
    setCurrentNoteId(null);
    setShowForm(true);
  };

  const openEditModal = (note: Note) => {
    setTitle(note.title || '');
    setContent(note.content || '');
    setErrorMsg('');
    setIsEditing(true);
    setCurrentNoteId(note.id || note._id || null);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMsg('El contenido de la nota es obligatorio.');
      return;
    }

    const payload = {
      title: title.trim(),
      content: content.trim()
    };

    if (isEditing && currentNoteId) {
      // Editar
      mutateData(
        `${NOTE_API_URL}/${currentNoteId}`,
        'PUT',
        payload,
        setNotes,
        `softball_notes_${activeTeamId}`,
        (success) => {
          if (success) {
            setShowForm(false);
          } else {
            setErrorMsg('No se pudo guardar la nota.');
          }
        }
      );
    } else {
      // Crear
      mutateData(
        NOTE_API_URL,
        'POST',
        payload,
        setNotes,
        `softball_notes_${activeTeamId}`,
        (success) => {
          if (success) {
            setShowForm(false);
          } else {
            setErrorMsg('No se pudo crear la nota.');
          }
        }
      );
    }
  };

  const handleDelete = (noteId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta nota?')) {
      mutateData(
        `${NOTE_API_URL}/${noteId}`,
        'DELETE',
        noteId,
        setNotes,
        `softball_notes_${activeTeamId}`,
        () => {}
      );
    }
  };

  const openNoteView = (note: Note) => {
    setSelectedNote(note);
  };

  const closeNoteView = () => {
    setSelectedNote(null);
  };

  const downloadJsonFile = (fileName: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportNote = (note: Note) => {
    const fileName = `${(note.title || 'nota').replace(/\s+/g, '_').substring(0, 40)}_${new Date().toISOString().slice(0, 10)}.json`;
    const payload = {
      title: note.title || '',
      content: note.content,
      createdAt: note.createdAt || new Date().toISOString()
    };
    downloadJsonFile(fileName, payload);
  };

  const exportAllNotes = () => {
    const fileName = `Notas_Softball_${new Date().toISOString().slice(0, 10)}.json`;
    const payload = sortedNotes.map((note) => ({
      title: note.title || '',
      content: note.content,
      createdAt: note.createdAt || new Date().toISOString()
    }));
    downloadJsonFile(fileName, payload);
  };

  const exportNotesAsPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    let cursorY = 20;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Notas del Equipo', margin, cursorY);
    cursorY += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Equipo: ${config.teamName || 'Softball'}`, margin, cursorY);
    cursorY += 10;
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin, cursorY);
    cursorY += 12;

    if (sortedNotes.length === 0) {
      doc.setFontSize(12);
      doc.text('No hay notas disponibles para exportar.', margin, cursorY);
    } else {
      sortedNotes.forEach((note, index) => {
        const title = note.title || 'Nota sin título';
        const contentLines = doc.splitTextToSize(note.content || '', pageWidth - margin * 2);

        if (cursorY + 24 + contentLines.length * 6 > doc.internal.pageSize.getHeight()) {
          doc.addPage();
          cursorY = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${title}`, margin, cursorY);
        cursorY += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Creado: ${formatDate(note.createdAt || '')}`, margin, cursorY);
        cursorY += 8;

        doc.setFontSize(11);
        const contentHeight = contentLines.length * 6;
        if (cursorY + contentHeight > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          cursorY = 20;
        }
        doc.text(contentLines, margin, cursorY);
        cursorY += contentHeight + 10;

        if (index < sortedNotes.length - 1 && cursorY > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          cursorY = 20;
        }
      });
    }

    const fileName = `Notas_Softball_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImportMessage(null);
    setIsImporting(true);

    try {
      const text = await file.text();
      const imported = JSON.parse(text);

      if (!Array.isArray(imported)) {
        throw new Error('El archivo debe contener un arreglo de notas.');
      }

      const notesToImport = imported
        .filter((item) => item && typeof item === 'object' && typeof (item as any).content === 'string')
        .map((item) => ({
          title: String((item as any).title || ''),
          content: String((item as any).content || ''),
          createdAt: String((item as any).createdAt || new Date().toISOString())
        }))
        .filter((note) => note.content.trim().length > 0);

      if (notesToImport.length === 0) {
        throw new Error('No se encontraron notas válidas en el archivo.');
      }

      const existingKeys = new Set(notes.map((note) => `${note.title || ''}||${note.content || ''}||${note.createdAt || ''}`));
      let importedCount = 0;

      for (const note of notesToImport) {
        const key = `${note.title}||${note.content}||${note.createdAt}`;
        if (existingKeys.has(key)) continue;
        const success = await mutateData(
          NOTE_API_URL,
          'POST',
          note,
          setNotes,
          `softball_notes_${activeTeamId}`,
          () => {}
        );
        if (success) {
          existingKeys.add(key);
          importedCount += 1;
        }
      }

      if (importedCount === 0) {
        setImportMessage({ type: 'info', message: 'No se importaron notas nuevas porque ya existían o no tenían contenido válido.' });
      } else {
        setImportMessage({ type: 'success', message: `${importedCount} nota${importedCount === 1 ? '' : 's'} importada${importedCount === 1 ? '' : 's'} correctamente.` });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al importar el archivo.';
      setImportMessage({ type: 'error', message });
    } finally {
      setIsImporting(false);
    }
  };

  // Sort notes from most recent to oldest
  const sortedNotes = [...notes].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  // Limit view to 5 notes unless "Ver más" is clicked
  const displayedNotes = showAllNotes ? sortedNotes : sortedNotes.slice(0, 5);

  return (
    <div className="grid-layout">
      <div className="glass-panel" style={{ width: '100%', gridColumn: '1 / -1' }}>
        
        {/* Encabezado con Botón Premium de crear */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem',
          marginBottom: '1.5rem' 
        }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            <StickyNote size={24} color={config.primaryColor || '#38bdf8'} /> 
            {t('Notas del Equipo', config.language)}
          </h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button 
              className="btn-secondary"
              onClick={exportNotesAsPDF}
              style={{ 
                width: 'auto', 
                padding: '0.55rem 1rem', 
                background: 'rgba(255,255,255,0.05)',
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.85rem',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.12)'
              }}
            >
              <FileText size={16} /> Exportar todas PDF
            </button>

            <button 
              className="btn-secondary"
              onClick={exportAllNotes}
              style={{ 
                width: 'auto', 
                padding: '0.55rem 1rem', 
                background: 'rgba(255,255,255,0.05)',
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.85rem',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.12)'
              }}
            >
              <Download size={16} /> Exportar todas JSON
            </button>

            <button 
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              style={{ 
                width: 'auto', 
                padding: '0.55rem 1rem', 
                background: 'rgba(255,255,255,0.05)',
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.85rem',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.12)',
                opacity: isImporting ? 0.6 : 1,
                cursor: isImporting ? 'not-allowed' : 'pointer'
              }}
            >
              <Upload size={16} /> {isImporting ? 'Importando...' : 'Importar notas'}
            </button>

            <button 
              className="btn-primary"
              onClick={openCreateModal}
              style={{ 
                width: 'auto', 
                padding: '0.6rem 1.2rem', 
                background: `linear-gradient(135deg, ${config.primaryColor || '#38bdf8'} 0%, #2563eb 100%)`, 
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.9rem',
                borderRadius: '10px'
              }}
            >
              <Plus size={18} /> Nueva Nota
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />

        {importMessage && (
          <div style={{
            marginTop: '1rem',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            background: importMessage.type === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${importMessage.type === 'success' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
            color: importMessage.type === 'success' ? '#16a34a' : '#dc2626'
          }}>
            {importMessage.message}
          </div>
        )}

        {/* Listado en Cascada a Pantalla Completa */}
        {sortedNotes.length === 0 ? (
          <div className="empty-state">
            <StickyNote size={48} style={{ opacity: 0.3 }} />
            <h3>No hay notas registradas</h3>
            <p style={{ maxWidth: '300px', margin: '0 auto', fontSize: '0.9rem' }}>
              Usa el botón superior para crear recordatorios, pautas de juego o anuncios para el equipo.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {displayedNotes.map((note, idx) => {
              const noteId = note.id || note._id || '';
              return (
                <div 
                  key={noteId}
                  className="selection-card"
                  onClick={() => openNoteView(note)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderLeft: `5px solid ${config.primaryColor || '#38bdf8'}`,
                    padding: '1.25rem',
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    transition: 'all 0.25s ease',
                    animation: `fadeInUp 0.35s ease forwards`,
                    animationDelay: `${idx * 0.06}s`,
                    opacity: 0,
                    transform: 'translateY(12px)',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h4 style={{ 
                        margin: 0, 
                        color: '#f8fafc', 
                        fontWeight: '800', 
                        fontSize: '1.2rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {note.title || 'Nota sin título'}
                      </h4>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.3rem', 
                        fontSize: '0.75rem', 
                        color: '#94a3b8', 
                        marginTop: '0.2rem',
                        fontWeight: '500'
                      }}>
                        <Calendar size={12} />
                        <span>{formatDate(note.createdAt || '')}</span>
                      </div>
                    </div>
                    
                    {/* Botones de acción rápidos */}
                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openEditModal(note); }} 
                        className="btn-icon" 
                        style={{ color: '#94a3b8', padding: '6px' }}
                        title="Editar Nota"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); exportNote(note); }}
                        className="btn-icon" 
                        style={{ color: '#22c55e', padding: '6px' }}
                        title="Exportar Nota"
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(noteId); }} 
                        className="btn-icon" 
                        style={{ color: '#ef4444', padding: '6px' }}
                        title="Eliminar Nota"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <p style={{ 
                    margin: 0, 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    fontSize: '0.95rem', 
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    marginTop: '0.75rem'
                  }}>
                    {note.content}
                  </p>
                </div>
              );
            })}

            {/* Botón Ver Más */}
            {sortedNotes.length > 5 && !showAllNotes && (
              <button 
                onClick={() => setShowAllNotes(true)}
                style={{ 
                  marginTop: '0.5rem', 
                  background: 'transparent', 
                  border: '1px dashed rgba(255,255,255,0.1)', 
                  color: config.primaryColor || '#38bdf8', 
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
                  animation: `fadeInUp 0.35s ease forwards`, 
                  animationDelay: `0.3s`, 
                  opacity: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = `1px solid ${config.primaryColor || '#38bdf8'}`;
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px dashed rgba(255,255,255,0.1)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <ChevronDown size={18} /> {t('Ver más notas', config.language)} ({sortedNotes.length - 5})
              </button>
            )}
          </div>
        )}

      </div>

      {/* Formulario / Modal Premium para Crear o Editar Nota */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
                <StickyNote size={20} color={config.primaryColor || '#38bdf8'} />
                {isEditing ? 'Editar Nota' : 'Crear Nueva Nota'}
              </h3>
              <button className="btn-icon" onClick={() => setShowForm(false)} style={{ padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {errorMsg && (
                  <div style={{ 
                    padding: '0.75rem 1rem', 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                    borderRadius: '8px', 
                    color: '#ef4444', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    fontSize: '0.85rem'
                  }}>
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Título (Opcional):</label>
                  <input 
                    type="text"
                    className="input-field"
                    placeholder="Título de la nota"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contenido:</label>
                  <textarea 
                    className="input-field"
                    placeholder="Escribe tu nota aquí..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    style={{ 
                      resize: 'none', 
                      minHeight: '120px', 
                      fontFamily: 'inherit',
                      padding: '0.75rem 1rem' 
                    }}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowForm(false)}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  style={{ 
                    width: 'auto', 
                    padding: '0.5rem 1.5rem', 
                    background: `linear-gradient(135deg, ${config.primaryColor || '#38bdf8'} 0%, #2563eb 100%)`, 
                    color: '#0f172a',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.9rem'
                  }}
                >
                  <Check size={18} />
                  {isEditing ? 'Guardar Cambios' : 'Crear Nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedNote && (
        <div className="modal-overlay" onClick={closeNoteView}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '760px', width: '100%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
                  <StickyNote size={20} color={config.primaryColor || '#38bdf8'} />
                  {selectedNote.title || 'Nota sin título'}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                  <Calendar size={14} />
                  <span>{formatDate(selectedNote.createdAt || '')}</span>
                </div>
              </div>
              <button className="btn-icon" onClick={closeNoteView} style={{ padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ color: 'rgba(255,255,255,0.92)', fontSize: '1rem', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {selectedNote.content}
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={closeNoteView}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
              >
                Cerrar
              </button>
              <button 
                type="button" 
                className="btn-primary"
                onClick={() => exportNote(selectedNote)}
                style={{ 
                  width: 'auto', 
                  padding: '0.5rem 1.25rem', 
                  background: `linear-gradient(135deg, ${config.primaryColor || '#38bdf8'} 0%, #2563eb 100%)`, 
                  color: '#0f172a',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.9rem'
                }}
              >
                <Download size={16} /> Exportar nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
