-- Add gamification column to patients table
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS gamification JSONB DEFAULT '{"totalPoints": 0, "level": "Iniciante", "badges": [], "weeklyProgress": {"perspectives": {}}}'::jsonb;

-- Ensure total_points and level exist and are synced (optional but good for safety)
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Iniciante';
