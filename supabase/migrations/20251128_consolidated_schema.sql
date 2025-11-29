-- ============================================================================
-- CONSOLIDATED SCHEMA MIGRATION - CUIDAR.ME
-- Run this in Supabase SQL Editor to ensure all tables exist for the Pilot
-- ============================================================================

-- 1. ONBOARDING STATES
CREATE TABLE IF NOT EXISTS onboarding_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('freemium', 'premium', 'vip')),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  UNIQUE(patient_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_states_patient_id ON onboarding_states(patient_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_states_step ON onboarding_states(step);

-- 2. DAILY CHECKIN STATES (Active)
CREATE TABLE IF NOT EXISTS daily_checkin_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  step TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  points_earned INTEGER DEFAULT 0,
  
  UNIQUE(patient_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkin_states_patient_date ON daily_checkin_states(patient_id, date DESC);

-- 3. DAILY CHECKINS (History)
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hydration TEXT CHECK (hydration IN ('yes', 'almost', 'no')),
  water_liters DECIMAL(3,1),
  breakfast TEXT CHECK (breakfast IN ('A', 'B', 'C')),
  lunch TEXT CHECK (lunch IN ('A', 'B', 'C')),
  dinner TEXT CHECK (dinner IN ('A', 'B', 'C')),
  snacks TEXT CHECK (snacks IN ('yes', 'no')),
  meal_photo_url TEXT,
  activity TEXT CHECK (activity IN ('yes', 'no')),
  activity_type TEXT,
  activity_minutes INTEGER,
  wellbeing INTEGER CHECK (wellbeing BETWEEN 1 AND 5),
  sleep TEXT CHECK (sleep IN ('bad', 'ok', 'good')),
  weight_kg DECIMAL(5,2),
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(patient_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_patient_date ON daily_checkins(patient_id, date DESC);

-- 4. PATIENT PROTOCOLS (Ensure it exists)
CREATE TABLE IF NOT EXISTS patient_protocols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_day INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  weight_goal_kg NUMERIC(5,2),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_protocols_patient ON patient_protocols(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_protocols_active ON patient_protocols(patient_id, is_active) WHERE is_active = TRUE;

-- 5. SCHEDULED MESSAGES (Ensure metadata column exists)
-- This part is tricky with IF NOT EXISTS for columns, so we use a DO block
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scheduled_messages' AND column_name = 'metadata') THEN
        ALTER TABLE scheduled_messages ADD COLUMN metadata JSONB;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_messages_metadata') THEN
        CREATE INDEX idx_scheduled_messages_metadata ON scheduled_messages USING GIN (metadata);
    END IF;
END $$;

-- 6. PATIENTS (Ensure preferred_message_time exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'preferred_message_time') THEN
        ALTER TABLE patients ADD COLUMN preferred_message_time TEXT CHECK (preferred_message_time IN ('morning', 'afternoon', 'night'));
    END IF;
END $$;

-- 7. FUNCTIONS
CREATE OR REPLACE FUNCTION calculate_streak(p_patient_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  check_date DATE;
BEGIN
  check_date := CURRENT_DATE - INTERVAL '1 day';
  LOOP
    IF EXISTS (SELECT 1 FROM daily_checkins WHERE patient_id = p_patient_id AND date = check_date) THEN
      current_streak := current_streak + 1;
      check_date := check_date - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;
  END LOOP;
  RETURN current_streak;
END;
$$ LANGUAGE plpgsql;
