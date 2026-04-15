import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSetlist } from '../api/songs';
import { useSongs } from '../context/SongsContext';
import { useSettings } from '../context/SettingsContext';

export default function SetlistRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setNavList } = useSongs();
  const { settings } = useSettings();
  const { colors } = settings;

  useEffect(() => {
    fetchSetlist(id).then(sl => {
      if (sl?.songs?.length > 0) {
        setNavList(sl.songs.map(s => s.id));
        navigate(`/song/${sl.songs[0].id}?setlist=${id}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }).catch(() => navigate('/', { replace: true }));
  }, [id, navigate, setNavList]);

  return (
    <div className="flex-1 flex items-center justify-center" style={{ color: colors.textMuted }}>
      Загрузка сет-листа...
    </div>
  );
}
