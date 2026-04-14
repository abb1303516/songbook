import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchSongs, fetchSetlists } from '../api/songs';

const SongsContext = createContext(null);

export function SongsProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([fetchSongs(), fetchSetlists()])
      .then(([s, sl]) => { setSongs(s); setSetlists(sl); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <SongsContext.Provider value={{ songs, setSongs, setlists, setSetlists, loading, reload }}>
      {children}
    </SongsContext.Provider>
  );
}

export function useSongs() {
  const ctx = useContext(SongsContext);
  if (!ctx) throw new Error('useSongs must be used within SongsProvider');
  return ctx;
}
