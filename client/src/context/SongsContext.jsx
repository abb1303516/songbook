import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchSongs, fetchSetlists } from '../api/songs';

const SongsContext = createContext(null);
const NAV_KEY = 'songbook-navlist';

function loadNavList() {
  try {
    const raw = sessionStorage.getItem(NAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function SongsProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navList, setNavListState] = useState(loadNavList);

  const setNavList = useCallback((list) => {
    setNavListState(list);
    try { sessionStorage.setItem(NAV_KEY, JSON.stringify(list)); } catch {}
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([fetchSongs(), fetchSetlists()])
      .then(([s, sl]) => { setSongs(s); setSetlists(sl); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <SongsContext.Provider value={{ songs, setSongs, setlists, setSetlists, loading, reload, navList, setNavList }}>
      {children}
    </SongsContext.Provider>
  );
}

export function useSongs() {
  const ctx = useContext(SongsContext);
  if (!ctx) throw new Error('useSongs must be used within SongsProvider');
  return ctx;
}
