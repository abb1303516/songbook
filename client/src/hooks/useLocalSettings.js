import { useState, useCallback } from 'react';

const STORAGE_KEY = 'songbook-settings';

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

const DEFAULT_SETTINGS = {
  theme: 'dark',
  colors: { ...THEMES.dark },
  mono: false,
  chordSizeOffset: 0,
  showChords: true,
  autoScrollSpeed: 30,
  songSettings: {},
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...saved };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function useLocalSettings() {
  const [settings, setSettingsState] = useState(loadSettings);

  const updateSettings = useCallback((updates) => {
    setSettingsState(prev => {
      const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      saveSettings(next);
      return next;
    });
  }, []);

  const getSongSettings = useCallback((songId) => {
    const defaults = { transpose: 0, fontSize: 16, lineHeight: 1.4, fitScale: null };
    return { ...defaults, ...settings.songSettings[songId] };
  }, [settings.songSettings]);

  const updateSongSettings = useCallback((songId, updates) => {
    updateSettings(prev => ({
      ...prev,
      songSettings: {
        ...prev.songSettings,
        [songId]: { ...prev.songSettings[songId], ...updates },
      },
    }));
  }, [updateSettings]);

  const applyTheme = useCallback((themeName) => {
    const themeColors = THEMES[themeName];
    if (themeColors) {
      updateSettings({ theme: themeName, colors: { ...themeColors } });
    }
  }, [updateSettings]);

  return { settings, updateSettings, getSongSettings, updateSongSettings, applyTheme };
}

export { THEMES };
