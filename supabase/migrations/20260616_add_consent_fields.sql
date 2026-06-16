-- Consent audit fields for LGPD, WhatsApp messaging, and AI-assisted support.
-- Nullable for existing records; new patient-facing flows should populate them.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_version TEXT,
  ADD COLUMN IF NOT EXISTS consent_source TEXT;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_version TEXT,
  ADD COLUMN IF NOT EXISTS consent_source TEXT;
