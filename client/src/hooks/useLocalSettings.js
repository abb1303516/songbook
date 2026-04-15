import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchSettings, saveSettings as saveSettingsApi } from '../api/songs';

const LOCAL_KEY = 'songbook-local';

const THEMES = {
  dark: {
    text: '#e0e0e0',
    chords: '#6bb3ff',
    bg: '#1a1a2e',
    surface: '#22223a',
    border: '#2c2c44',
    textMuted: '#71718a',
    chorusBg: 'rgba(255,255,255,0.05)',
    chorusBorder: 'rgba(255,255,255,0.15)',
    bridgeBg: 'rgba(255,255,255,0.03)',
    bridgeBorder: 'rgba(255,255,255,0.08)',
  },
  light: {
    text: '#1a1a1a',
    chords: '#2563eb',
    bg: '#fafafa',
    surface: '#ffffff',
    border: '#d8d4ca',
    textMuted: '#888880',
    chorusBg: 'rgba(0,0,0,0.03)',
    chorusBorder: 'rgba(0,0,0,0.1)',
    bridgeBg: 'rgba(0,0,0,0.015)',
    bridgeBorder: 'rgba(0,0,0,0.05)',
  },
  contrast: {
    text: '#ffffff',
    chords: '#ffcc00',
    bg: '#000000',
    surface: '#111111',
    border: '#333333',
    textMuted: '#aaaaaa',
    chorusBg: 'rgba(255,255,255,0.08)',
    chorusBorder: 'rgba(255,255,255,0.2)',
    bridgeBg: 'rgba(255,255,255,0.04)',
    bridgeBorder: 'rgba(255,255,255,0.1)',
  },
  warm: {
    text: '#e8dcc8',
    chords: '#d4956a',
    bg: '#2d2418',
    surface: '#382e20',
    border: '#4a3c2a',
    textMuted: '#9a8a70',
    chorusBg: 'rgba(255,220,180,0.06)',
    chorusBorder: 'rgba(255,220,180,0.15)',
    bridgeBg: 'rgba(255,220,180,0.03)',
    bridgeBorder: 'rgba(255,220,180,0.08)',
  },
};

// Server-synced settings defaults (customThemes synced, theme is per-device)
const SERVER_DEFAULTS = {
  customThemes: {},
  fontSize: 16,
  lineHeight: 1.4,
  showChords: true,
  useH: true,
};

// Per-device settings (localStorage only)
function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveLocal(data) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function buildColors(theme, customThemes) {
  const base = THEMES[theme] || THEMES.dark;
  const overrides = customThemes?.[theme] || {};
  return { ...base, ...overrides };
}

export function useLocalSettings() {
  // Server settings (synced)
  const [serverSettings, setServerSettings] = useState(SERVER_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  // Per-device settings (localStorage): theme choice, fitScale, sidebar
  const [localSettings, setLocalSettings] = useState(() => {
    const saved = loadLocal();
    return { theme: 'dark', ...saved };
  });

  // Fetch from server on mount
  useEffect(() => {
    fetchSettings()
      .then(data => {
        if (data && typeof data === 'object') {
          const { theme, ...serverData } = data; // theme ignored from server, it's per-device
          setServerSettings({ ...SERVER_DEFAULTS, ...serverData });
        }
      })
      .catch(() => { /* use defaults */ })
      .finally(() => setLoaded(true));
  }, []);

  // Debounced save to server (theme NOT included — it's per-device)
  const saveToServer = useCallback((newSettings) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const { customThemes, fontSize, lineHeight, showChords, useH } = newSettings;
      saveSettingsApi({ customThemes, fontSize, lineHeight, showChords, useH }).catch(() => {});
    }, 500);
  }, []);

  // Derived colors: theme from local, customThemes from server
  const currentTheme = localSettings.theme || 'dark';
  const colors = buildColors(currentTheme, serverSettings.customThemes);

  // Combined settings object for consumers
  const settings = {
    ...serverSettings,
    theme: currentTheme,
    colors,
  };

  const updateSettings = useCallback((updates) => {
    setServerSettings(prev => {
      const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      saveToServer(next);
      return next;
    });
  }, [saveToServer]);

  // Per-song local settings (fitScale only — per-device)
  const getSongSettings = useCallback((songId) => {
    const defaults = { fitScale: null };
    return { ...defaults, ...localSettings.songSettings?.[songId] };
  }, [localSettings.songSettings]);

  const updateSongSettings = useCallback((songId, updates) => {
    setLocalSettings(prev => {
      const next = {
        ...prev,
        songSettings: {
          ...prev.songSettings,
          [songId]: { ...prev.songSettings?.[songId], ...updates },
        },
      };
      saveLocal(next);
      return next;
    });
  }, []);

  const applyTheme = useCallback((themeName) => {
    if (!THEMES[themeName]) return;
    setLocalSettings(prev => {
      const next = { ...prev, theme: themeName };
      saveLocal(next);
      return next;
    });
  }, []);

  const saveThemeColor = useCallback((colorKey, colorValue) => {
    setServerSettings(prev => {
      const customThemes = { ...prev.customThemes };
      const themeName = localSettings.theme || 'dark';
      customThemes[themeName] = { ...customThemes[themeName], [colorKey]: colorValue };
      const next = { ...prev, customThemes };
      saveToServer(next);
      return next;
    });
  }, [saveToServer, localSettings.theme]);

  const resetTheme = useCallback(() => {
    setServerSettings(prev => {
      const customThemes = { ...prev.customThemes };
      const themeName = localSettings.theme || 'dark';
      delete customThemes[themeName];
      const next = { ...prev, customThemes };
      saveToServer(next);
      return next;
    });
  }, [saveToServer, localSettings.theme]);

  return { settings, updateSettings, getSongSettings, updateSongSettings, applyTheme, saveThemeColor, resetTheme, loaded };
}

export { THEMES };
