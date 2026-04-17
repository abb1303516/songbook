import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteSetlist } from '../api/songs';
import { useSettings } from '../context/SettingsContext';
import { useSongs } from '../context/SongsContext';

export default function SetlistMenu({ setlistId, setlistName, onActionComplete, activeColor }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { colors } = settings;
  const { reload } = useSongs();

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="p-0.5 rounded cursor-pointer"
        style={{ color: activeColor || colors.textMuted }}
        title="Действия с сет-листом"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 top-6 z-50 rounded-lg py-1 min-w-[140px]"
          style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
        >
          <button
            onClick={() => { setOpen(false); onActionComplete?.(); navigate(`/admin/setlists/${setlistId}`); }}
            className="block w-full text-left px-3 py-1.5 text-xs cursor-pointer hover:opacity-80"
            style={{ color: colors.text }}
          >
            Редактировать
          </button>
          <button
            onClick={async () => {
              if (!confirm(`Удалить сет-лист "${setlistName}"?`)) { setOpen(false); return; }
              try {
                await deleteSetlist(setlistId);
                reload();
              } catch (e) { alert(e.message); }
              setOpen(false);
              onActionComplete?.();
            }}
            className="block w-full text-left px-3 py-1.5 text-xs cursor-pointer hover:opacity-80"
            style={{ color: '#e05555', borderTop: `1px solid ${colors.border}` }}
          >
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}
