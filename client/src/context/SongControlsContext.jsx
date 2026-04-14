import { createContext, useContext, useState, useCallback } from 'react';

const SongControlsContext = createContext(null);

export function SongControlsProvider({ children }) {
  const [controls, setControls] = useState(null);

  const registerControls = useCallback((data) => setControls(data), []);
  const unregisterControls = useCallback(() => setControls(null), []);

  return (
    <SongControlsContext.Provider value={{ controls, registerControls, unregisterControls }}>
      {children}
    </SongControlsContext.Provider>
  );
}

export function useSongControls() {
  const ctx = useContext(SongControlsContext);
  if (!ctx) throw new Error('useSongControls must be used within SongControlsProvider');
  return ctx;
}
