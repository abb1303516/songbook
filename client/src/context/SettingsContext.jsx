import { createContext, useContext } from 'react';
import { useLocalSettings } from '../hooks/useLocalSettings';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const settingsHook = useLocalSettings();
  return (
    <SettingsContext.Provider value={settingsHook}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
