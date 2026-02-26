-- Worms RPG database tables
-- Run in Supabase Dashboard SQL Editor: https://supabase.com/dashboard/project/tdjyqykkngyflqkjuzai/sql

-- Community terrain storage
CREATE TABLE IF NOT EXISTS tc_worms_terrains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  terrain_type TEXT NOT NULL DEFAULT 'custom',
  terrain_config JSONB NOT NULL,
  preview_url TEXT,
  plays INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worms_terrains_user ON tc_worms_terrains(user_id);
CREATE INDEX IF NOT EXISTS idx_worms_terrains_created ON tc_worms_terrains(created_at DESC);

-- Terrain voting
CREATE TABLE IF NOT EXISTS tc_worms_terrain_votes (
  user_id UUID REFERENCES auth.users(id),
  terrain_id UUID REFERENCES tc_worms_terrains(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, terrain_id)
);

-- Match history
CREATE TABLE IF NOT EXISTS tc_worms_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  opponent_type TEXT NOT NULL CHECK (opponent_type IN ('cpu', 'human')),
  result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
  terrain_id UUID REFERENCES tc_worms_terrains(id) ON DELETE SET NULL,
  terrain_type TEXT,
  duration_seconds INT,
  worms_remaining INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worms_matches_user ON tc_worms_matches(user_id);

-- Enable RLS
ALTER TABLE tc_worms_terrains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tc_worms_terrain_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tc_worms_matches ENABLE ROW LEVEL SECURITY;

-- RLS policies: allow service role full access (backend uses service role key)
CREATE POLICY "Service role full access" ON tc_worms_terrains FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON tc_worms_terrain_votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON tc_worms_matches FOR ALL USING (true) WITH CHECK (true);
