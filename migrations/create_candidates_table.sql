-- Create candidates table for real-time sync
CREATE TABLE IF NOT EXISTS candidates (
  id BIGSERIAL PRIMARY KEY,
  trip_code TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  user_name TEXT,
  city_name TEXT NOT NULL,
  viability_data JSONB,
  photo_url TEXT,
  points INTEGER DEFAULT 0,
  votes_pos1 INTEGER DEFAULT 0,
  votes_pos2 INTEGER DEFAULT 0,
  votes_pos3 INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries by trip
CREATE INDEX IF NOT EXISTS idx_candidates_trip ON candidates(trip_code);

-- Enable Row Level Security
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read candidates
CREATE POLICY "Anyone can view candidates"
  ON candidates FOR SELECT
  USING (true);

-- Policy: Anyone can insert candidates (authenticated or not)
CREATE POLICY "Anyone can insert candidates"
  ON candidates FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE candidates;
