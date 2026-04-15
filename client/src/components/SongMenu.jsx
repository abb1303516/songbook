import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateSongStatus, updateSetlist, deleteSong } from '../api/songs';
import { useSettings } from '../context/SettingsContext';
import { useAdmin } from '../context/AdminContext';
import { useSongs } from '../context/SongsContext';

const STATUS_CYCLE = ['new', 'learning', 'known'];
const STATUS_LABELS = { new: 'Новые', learning: 'Учу', known: 'Знаю' };

export default function SongMenu({ songId, songStatus, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { colors } = settings;
  const { isAdmin } = useAdmin();
  const { setlists, reload } = useSongs();

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const status = songStatus || 'new';

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded cursor-pointer transition-colors"
        style={{ color: colors.textMuted }}
        onMouseEnter={e => { e.currentTarget.style.color = colors.text; }}
        onMouseLeave={e => { e.currentTarget.style.color = colors.textMuted; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 top-8 z-50 rounded-lg py-1 min-w-[180px]"
          style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
        >
          {/* Edit */}
          {isAdmin && (
            <button
              onClick={() => { setOpen(false); navigate(`/admin/songs/${songId}`); }}
              className="block w-full text-left px-3 py-1.5 text-xs cursor-pointer hover:opacity-80"
              style={{ color: colors.text }}
            >
              Редактировать
            </button>
          )}

          {/* Status */}
          <div className="px-3 py-1 text-xs" style={{ color: colors.textMuted }}>Статус:</div>
          {STATUS_CYCLE.map(s => (
            <button
              key={s}
              onClick={async () => {
                try {
                  await updateSongStatus(songId, s);
                  if (onStatusChange) onStatusChange(s);
                  reload();
                } catch (e) { /* ignore */ }
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-1.5 text-xs cursor-pointer hover:opacity-80"
              style={{ color: status === s ? colors.chords : colors.text }}
            >
              {status === s ? '✓ ' : '  '}{STATUS_LABELS[s]}
            </button>
          ))}

          {/* Setlists */}
          {setlists.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs mt-1" style={{ color: colors.textMuted, borderTop: `1px solid ${colors.border}` }}>Сет-листы:</div>
              {setlists.map(sl => {
                const inList = (sl.song_ids || []).includes(songId);
                return (
                  <button
                    key={sl.id}
                    onClick={async () => {
                      const ids = sl.song_ids || [];
                      try {
                        if (inList) {
                          await updateSetlist(sl.id, { song_ids: ids.filter(i => i !== songId) });
                        } else {
                          await updateSetlist(sl.id, { song_ids: [...ids, songId] });
                        }
                        reload();
                      } catch (e) { /* ignore */ }
                      setOpen(false);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs cursor-pointer hover:opacity-80"
                    style={{ color: inList ? colors.chords : colors.text }}
                  >
                    {inList ? '✓ ' : '  '}{sl.name}
                  </button>
                );
              })}
            </>
          )}

          {/* Delete */}
          {isAdmin && (
            <button
              onClick={async () => {
                if (!confirm('Удалить песню?')) return;
                try {
                  await deleteSong(songId);
                  reload();
                  navigate('/');
                } catch (e) { alert(e.message); }
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-1.5 text-xs mt-1 cursor-pointer hover:opacity-80"
              style={{ color: '#e05555', borderTop: `1px solid ${colors.border}` }}
            >
              Удалить
            </button>
          )}
        </div>
      )}
    </div>
  );
}
