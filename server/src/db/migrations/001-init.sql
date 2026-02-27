CREATE TABLE songs (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    artist      TEXT DEFAULT '',
    key         TEXT DEFAULT '',
    chordpro    TEXT NOT NULL,
    tags        TEXT[] DEFAULT '{}',
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE setlists (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    song_ids    TEXT[] DEFAULT '{}',
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_songs_artist ON songs(artist);
CREATE INDEX idx_songs_tags ON songs USING GIN(tags);
