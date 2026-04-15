-- Add transpose to songs (per-song, synced across devices)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS transpose INTEGER DEFAULT 0;

-- Global settings table (themes, font, display preferences)
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'
);

-- Insert default global settings
INSERT INTO settings (key, value) VALUES ('global', '{
  "theme": "dark",
  "customThemes": {},
  "fontSize": 16,
  "lineHeight": 1.4,
  "showChords": true,
  "useH": true
}') ON CONFLICT (key) DO NOTHING;
