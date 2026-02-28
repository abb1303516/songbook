import { Link } from 'react-router-dom';
import { HexColorPicker } from 'react-colorful';
import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { THEMES } from '../hooks/useLocalSettings';

const THEME_LABELS = {
  dark: 'Тёмная',
  light: 'Светлая',
  contrast: 'Контрастная',
  warm: 'Тёплая',
};

const COLOR_LABELS = [
  { key: 'text', label: 'Текст' },
  { key: 'chords', label: 'Аккорды' },
  { key: 'bg', label: 'Фон' },
  { key: 'chorusBg', label: 'Фон припева' },
];

export default function Settings() {
  const { settings, updateSettings, applyTheme } = useSettings();
  const { colors } = settings;
  const [activeColor, setActiveColor] = useState(null);

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg, color: colors.text }}>
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}
      >
        <Link to="/" className="p-1" style={{ color: colors.textMuted }} title="На главную">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </Link>
        <h1 className="text-lg font-semibold">Настройки</h1>
      </header>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Themes */}
        <section>
          <h2 className="text-sm font-semibold mb-2" style={{ color: colors.textMuted }}>Тема</h2>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(THEME_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => applyTheme(key)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: THEMES[key].bg,
                  color: THEMES[key].text,
                  border: settings.theme === key
                    ? `2px solid ${THEMES[key].chords}`
                    : `1px solid ${THEMES[key].border}`,
                }}
              >
                <span style={{ color: THEMES[key].chords }}>Am </span>
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Colors */}
        <section>
          <h2 className="text-sm font-semibold mb-2" style={{ color: colors.textMuted }}>Цвета</h2>
          <div className="space-y-2">
            {COLOR_LABELS.map(({ key, label }) => (
              <div key={key}>
                <button
                  onClick={() => setActiveColor(activeColor === key ? null : key)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
                >
                  <div
                    className="w-6 h-6 rounded border"
                    style={{
                      backgroundColor: colors[key],
                      borderColor: colors.border,
                    }}
                  />
                  <span>{label}</span>
                  <span className="ml-auto font-mono text-xs" style={{ color: colors.textMuted }}>
                    {colors[key]}
                  </span>
                </button>
                {activeColor === key && (
                  <div className="mt-2 flex justify-center">
                    <HexColorPicker
                      color={colors[key]?.startsWith('rgba') ? '#888888' : colors[key]}
                      onChange={(c) => updateSettings({
                        colors: { ...colors, [key]: c },
                        theme: 'custom',
                      })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Chord size */}
        <section>
          <h2 className="text-sm font-semibold mb-2" style={{ color: colors.textMuted }}>Размер аккордов</h2>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="-3"
              max="3"
              value={settings.chordSizeOffset}
              onChange={e => updateSettings({ chordSizeOffset: +e.target.value })}
              className="flex-1"
            />
            <span className="font-mono text-sm w-6 text-center">
              {settings.chordSizeOffset > 0 ? '+' : ''}{settings.chordSizeOffset}
            </span>
          </div>
        </section>

        {/* Toggles */}
        <section className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.mono}
              onChange={e => updateSettings({ mono: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Моноширинный шрифт</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.useH}
              onChange={e => updateSettings({ useH: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Нотация H (Hm вместо Bm)</span>
          </label>
        </section>
      </div>
    </div>
  );
}
