ALTER TABLE songs ADD COLUMN status TEXT DEFAULT 'new';
CREATE INDEX idx_songs_status ON songs(status);
