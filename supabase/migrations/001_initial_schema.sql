-- =====================================================
-- CUIDAR.ME - SCHEMA INICIAL DO SUPABASE
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. TABELA DE PERFIS DE USUÁRIO
-- =====================================================
CREATE TYPE user_role AS ENUM ('admin', 'equipe_saude', 'assistente', 'paciente', 'pendente');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  role user_role NOT NULL DEFAULT 'pendente',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Usuários podem ver todos os perfis" 
  ON profiles FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Allow users to insert their own profile (Fixes signup)
CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins podem atualizar qualquer perfil" 
  ON profiles FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- 2. TABELA DE PACIENTES
-- =====================================================
CREATE TYPE patient_plan AS ENUM ('freemium', 'premium', 'vip');
CREATE TYPE patient_status AS ENUM ('active', 'pending', 'inactive');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE perspective_type AS ENUM ('alimentacao', 'movimento', 'hidratacao', 'disciplina', 'bemEstar');

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Opcional: se paciente tem login
  full_name TEXT NOT NULL,
  whatsapp_number TEXT UNIQUE NOT NULL,
  email TEXT,
  avatar TEXT,
  
  -- Status e risco
  status patient_status NOT NULL DEFAULT 'pending',
  needs_attention BOOLEAN NOT NULL DEFAULT FALSE,
  risk_level risk_level,
  
  -- Assinatura
  plan patient_plan NOT NULL DEFAULT 'freemium',
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
  
  -- Dados pessoais
  birth_date DATE,
  gender TEXT,
  height_cm NUMERIC(5,2),
  initial_weight_kg NUMERIC(5,2),
  health_conditions TEXT,
  allergies TEXT,
  community_username TEXT UNIQUE,
  
  -- Última interação
  last_message TEXT,
  last_message_timestamp TIMESTAMPTZ,
  
  -- Gamificação
  total_points INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'Iniciante',
  badges TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_patients_whatsapp ON patients(whatsapp_number);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_patients_needs_attention ON patients(needs_attention) WHERE needs_attention = TRUE;
CREATE INDEX idx_patients_plan ON patients(plan);
CREATE INDEX idx_patients_user_id ON patients(user_id);

-- RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe pode ver todos os pacientes" 
  ON patients FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

CREATE POLICY "Pacientes podem ver apenas seu próprio registro" 
  ON patients FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Equipe pode atualizar pacientes" 
  ON patients FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

-- =====================================================
-- 3. TABELA DE PROTOCOLOS
-- =====================================================
CREATE TABLE protocols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  eligible_plans patient_plan[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_protocols_active ON protocols(is_active) WHERE is_active = TRUE;

-- RLS
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver protocolos ativos" 
  ON protocols FOR SELECT 
  USING (is_active = TRUE);

CREATE POLICY "Apenas admins podem gerenciar protocolos" 
  ON protocols FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- 4. TABELA DE PASSOS DO PROTOCOLO
-- =====================================================
CREATE TABLE protocol_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_gamification BOOLEAN NOT NULL DEFAULT FALSE,
  perspective perspective_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_protocol_steps_protocol ON protocol_steps(protocol_id);
CREATE INDEX idx_protocol_steps_day ON protocol_steps(protocol_id, day);

-- RLS
ALTER TABLE protocol_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver passos de protocolos" 
  ON protocol_steps FOR SELECT 
  USING (TRUE);

CREATE POLICY "Apenas admins podem gerenciar passos" 
  ON protocol_steps FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- 5. TABELA DE PROTOCOLOS ATRIBUÍDOS
-- =====================================================
CREATE TABLE patient_protocols (
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

-- Índices
CREATE INDEX idx_patient_protocols_patient ON patient_protocols(patient_id);
CREATE INDEX idx_patient_protocols_active ON patient_protocols(patient_id, is_active) 
  WHERE is_active = TRUE;

-- Índice único parcial: apenas um protocolo ativo por paciente
CREATE UNIQUE INDEX idx_unique_active_protocol ON patient_protocols(patient_id) 
  WHERE is_active = TRUE;

-- RLS
ALTER TABLE patient_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe pode ver protocolos de pacientes" 
  ON patient_protocols FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

-- =====================================================
-- 6. TABELA DE PROGRESSO SEMANAL DE GAMIFICAÇÃO
-- =====================================================
CREATE TABLE weekly_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  
  -- Progresso por perspectiva
  alimentacao_current INTEGER NOT NULL DEFAULT 0,
  alimentacao_goal INTEGER NOT NULL DEFAULT 5,
  movimento_current INTEGER NOT NULL DEFAULT 0,
  movimento_goal INTEGER NOT NULL DEFAULT 5,
  hidratacao_current INTEGER NOT NULL DEFAULT 0,
  hidratacao_goal INTEGER NOT NULL DEFAULT 5,
  disciplina_current INTEGER NOT NULL DEFAULT 0,
  disciplina_goal INTEGER NOT NULL DEFAULT 5,
  bem_estar_current INTEGER NOT NULL DEFAULT 0,
  bem_estar_goal INTEGER NOT NULL DEFAULT 5,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Apenas um registro por paciente por semana
  CONSTRAINT unique_patient_week UNIQUE (patient_id, week_start_date)
);

-- Índices
CREATE INDEX idx_weekly_progress_patient ON weekly_progress(patient_id);
CREATE INDEX idx_weekly_progress_week ON weekly_progress(week_start_date);

-- RLS
ALTER TABLE weekly_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe pode ver progresso semanal" 
  ON weekly_progress FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

-- =====================================================
-- 7. TABELA DE REQUISIÇÕES DE ATENÇÃO
-- =====================================================
CREATE TABLE attention_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  trigger_message TEXT NOT NULL,
  ai_summary TEXT NOT NULL,
  ai_suggested_reply TEXT NOT NULL,
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 3),
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_attention_requests_patient ON attention_requests(patient_id);
CREATE INDEX idx_attention_requests_unresolved ON attention_requests(is_resolved) 
  WHERE is_resolved = FALSE;
CREATE INDEX idx_attention_requests_priority ON attention_requests(priority, created_at);

-- RLS
ALTER TABLE attention_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe pode ver requisições de atenção" 
  ON attention_requests FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

-- =====================================================
-- 8. TABELA DE MENSAGENS (CONVERSAS)
-- =====================================================
CREATE TYPE message_sender AS ENUM ('patient', 'me', 'system');

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  sender message_sender NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_messages_patient ON messages(patient_id, created_at DESC);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe pode ver mensagens" 
  ON messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

CREATE POLICY "Pacientes podem ver suas próprias mensagens" 
  ON messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE id = patient_id 
      AND user_id = auth.uid()
    )
  );

-- =====================================================
-- 9. TABELA DE MENSAGENS AGENDADAS
-- =====================================================
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'error');
CREATE TYPE message_source AS ENUM ('protocol', 'dynamic_reminder', 'manual');

CREATE TABLE scheduled_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_whatsapp_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  status message_status NOT NULL DEFAULT 'pending',
  source message_source NOT NULL,
  error_info TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_scheduled_messages_patient ON scheduled_messages(patient_id);
CREATE INDEX idx_scheduled_messages_pending ON scheduled_messages(status, send_at) 
  WHERE status = 'pending';

-- RLS
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe pode ver mensagens agendadas" 
  ON scheduled_messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

-- =====================================================
-- 10. TABELA DE MÉTRICAS DE SAÚDE
-- =====================================================
CREATE TABLE health_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC(5,2),
  glucose_level NUMERIC(5,2),
  waist_circumference_cm NUMERIC(5,2),
  sleep_duration_hours NUMERIC(4,2),
  physical_activity TEXT,
  meal_checkin CHAR(1) CHECK (meal_checkin IN ('A', 'B', 'C')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_health_metrics_patient ON health_metrics(patient_id, date DESC);

-- RLS
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe pode ver métricas de saúde" 
  ON health_metrics FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

-- =====================================================
-- 11. TABELA DE VÍDEOS EDUCATIVOS
-- =====================================================
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  video_url TEXT NOT NULL,
  eligible_plans patient_plan[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_videos_active ON videos(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_videos_category ON videos(category);

-- RLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver vídeos ativos" 
  ON videos FOR SELECT 
  USING (is_active = TRUE);

CREATE POLICY "Apenas admins podem gerenciar vídeos" 
  ON videos FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- 12. TABELA DE VÍDEOS ENVIADOS
-- =====================================================
CREATE TYPE video_feedback AS ENUM ('liked', 'disliked');

CREATE TABLE sent_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  feedback video_feedback,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_sent_videos_patient ON sent_videos(patient_id);
CREATE INDEX idx_sent_videos_video ON sent_videos(video_id);

-- RLS
ALTER TABLE sent_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe pode ver vídeos enviados" 
  ON sent_videos FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

-- =====================================================
-- 13. TABELA DE TÓPICOS DA COMUNIDADE
-- =====================================================
CREATE TABLE community_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  author_username TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_community_topics_author ON community_topics(author_id);
CREATE INDEX idx_community_topics_pinned ON community_topics(is_pinned, last_activity_at DESC);
CREATE INDEX idx_community_topics_activity ON community_topics(last_activity_at DESC);

-- RLS
ALTER TABLE community_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos os pacientes podem ver tópicos" 
  ON community_topics FOR SELECT 
  USING (TRUE);

CREATE POLICY "Pacientes podem criar tópicos" 
  ON community_topics FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE id = author_id 
      AND user_id = auth.uid()
    )
  );

-- =====================================================
-- 14. TABELA DE COMENTÁRIOS DA COMUNIDADE
-- =====================================================
CREATE TABLE community_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES community_topics(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  author_username TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_community_comments_topic ON community_comments(topic_id, created_at);
CREATE INDEX idx_community_comments_author ON community_comments(author_id);

-- RLS
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos os pacientes podem ver comentários" 
  ON community_comments FOR SELECT 
  USING (TRUE);

CREATE POLICY "Pacientes podem criar comentários" 
  ON community_comments FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE id = author_id 
      AND user_id = auth.uid()
    )
  );

-- =====================================================
-- 15. TABELA DE REAÇÕES (TÓPICOS E COMENTÁRIOS)
-- =====================================================
CREATE TYPE reaction_emoji AS ENUM ('👍', '🎉', '💪', '💡');
CREATE TYPE reaction_target_type AS ENUM ('topic', 'comment');

CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type reaction_target_type NOT NULL,
  target_id UUID NOT NULL,
  author_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  emoji reaction_emoji NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Uma reação por usuário por target
  CONSTRAINT unique_user_reaction UNIQUE (target_type, target_id, author_id)
);

-- Índices
CREATE INDEX idx_reactions_target ON reactions(target_type, target_id);
CREATE INDEX idx_reactions_author ON reactions(author_id);

-- RLS
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos os pacientes podem ver reações" 
  ON reactions FOR SELECT 
  USING (TRUE);

CREATE POLICY "Pacientes podem criar reações" 
  ON reactions FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE id = author_id 
      AND user_id = auth.uid()
    )
  );

-- =====================================================
-- 16. TABELA DE CONFIGURAÇÕES DO SISTEMA
-- =====================================================
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins podem gerenciar configurações" 
  ON system_config FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_protocols_updated_at BEFORE UPDATE ON protocols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_protocols_updated_at BEFORE UPDATE ON patient_protocols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_progress_updated_at BEFORE UPDATE ON weekly_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_topics_updated_at BEFORE UPDATE ON community_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER PARA ATUALIZAR CONTADOR DE COMENTÁRIOS
-- =====================================================
CREATE OR REPLACE FUNCTION update_topic_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_topics 
    SET comment_count = comment_count + 1,
        last_activity_at = NOW()
    WHERE id = NEW.topic_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_topics 
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.topic_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_topic_comment_count_trigger
AFTER INSERT OR DELETE ON community_comments
FOR EACH ROW EXECUTE FUNCTION update_topic_comment_count();

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

-- View de pacientes com protocolo ativo
CREATE VIEW patients_with_active_protocol AS
SELECT 
  p.*,
  pp.protocol_id,
  pp.start_date AS protocol_start_date,
  pp.current_day AS protocol_current_day,
  pp.weight_goal_kg,
  pr.name AS protocol_name
FROM patients p
LEFT JOIN patient_protocols pp ON p.id = pp.patient_id AND pp.is_active = TRUE
LEFT JOIN protocols pr ON pp.protocol_id = pr.id;

-- View de requisições de atenção não resolvidas
CREATE VIEW unresolved_attention_requests AS
SELECT 
  ar.id,
  ar.patient_id,
  ar.reason,
  ar.trigger_message,
  ar.ai_summary,
  ar.ai_suggested_reply,
  ar.priority AS request_priority,
  ar.is_resolved,
  ar.resolved_by,
  ar.resolved_at,
  ar.created_at,
  p.full_name AS patient_name,
  p.whatsapp_number,
  p.plan,
  p.priority AS patient_priority
FROM attention_requests ar
JOIN patients p ON ar.patient_id = p.id
WHERE ar.is_resolved = FALSE
ORDER BY ar.priority DESC, ar.created_at ASC;

-- View de mensagens pendentes para envio
CREATE VIEW pending_scheduled_messages AS
SELECT *
FROM scheduled_messages
WHERE status = 'pending' 
  AND send_at <= NOW()
ORDER BY send_at ASC
LIMIT 50;

-- =====================================================
-- FUNÇÕES ÚTEIS
-- =====================================================

-- Função para obter progresso semanal (cria se não existir)
CREATE OR REPLACE FUNCTION get_or_create_weekly_progress(
  p_patient_id UUID,
  p_week_start DATE DEFAULT DATE_TRUNC('week', CURRENT_DATE)::DATE
)
RETURNS UUID AS $$
DECLARE
  v_progress_id UUID;
BEGIN
  -- Tentar buscar existente
  SELECT id INTO v_progress_id
  FROM weekly_progress
  WHERE patient_id = p_patient_id 
    AND week_start_date = p_week_start;
  
  -- Se não existir, criar
  IF v_progress_id IS NULL THEN
    INSERT INTO weekly_progress (patient_id, week_start_date)
    VALUES (p_patient_id, p_week_start)
    RETURNING id INTO v_progress_id;
  END IF;
  
  RETURN v_progress_id;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar progresso de gamificação
CREATE OR REPLACE FUNCTION update_gamification_progress(
  p_patient_id UUID,
  p_perspective perspective_type,
  p_points INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_week_start DATE := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  v_progress_id UUID;
  v_column_name TEXT;
BEGIN
  -- Garantir que existe registro de progresso semanal
  v_progress_id := get_or_create_weekly_progress(p_patient_id, v_week_start);
  
  -- Atualizar pontos totais do paciente
  UPDATE patients 
  SET total_points = total_points + p_points
  WHERE id = p_patient_id;
  
  -- Atualizar progresso da perspectiva
  v_column_name := p_perspective || '_current';
  
  EXECUTE format('
    UPDATE weekly_progress 
    SET %I = LEAST(%I + 1, %I)
    WHERE id = $1
  ', v_column_name, v_column_name, p_perspective || '_goal')
  USING v_progress_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir configuração padrão do Twilio
INSERT INTO system_config (key, value) VALUES 
  ('twilio_credentials', '{
    "accountSid": "",
    "authToken": "",
    "phoneNumber": ""
  }'::jsonb);

-- Inserir configuração de gamificação
INSERT INTO system_config (key, value) VALUES 
  ('gamification_config', '{
    "perspectiveGoals": {
      "alimentacao": 5,
      "movimento": 5,
      "hidratacao": 5,
      "disciplina": 5,
      "bemEstar": 5
    },
    "actions": [
      {
        "actionId": "check_in_refeicao",
        "perspective": "alimentacao",
        "points": {"A": 20, "B": 15, "C": 10},
        "checkinTriggerText": "Check-in de Refeição"
      },
      {
        "actionId": "registrar_atividade_fisica",
        "perspective": "movimento",
        "points": 40,
        "checkinTriggerText": "Check-in de Atividade Física"
      },
      {
        "actionId": "medicao_semanal",
        "perspective": "disciplina",
        "points": 50,
        "checkinTriggerText": "Check-in Semanal de Peso"
      },
      {
        "actionId": "planejamento_semanal",
        "perspective": "disciplina",
        "points": 30,
        "checkinTriggerText": "Planejamento Semanal"
      },
      {
        "actionId": "assistir_video_educativo",
        "perspective": "bemEstar",
        "points": 20
      },
      {
        "actionId": "participar_comunidade",
        "perspective": "bemEstar",
        "points": 25
      },
      {
        "actionId": "checkin_bem_estar",
        "perspective": "bemEstar",
        "points": 15,
        "checkinTriggerText": "Check-in de Bem-Estar"
      },
      {
        "actionId": "checkin_hidratacao",
        "perspective": "hidratacao",
        "points": 15,
        "checkinTriggerText": "Check-in de Hidratação"
      }
    ]
  }'::jsonb);

-- =====================================================
-- FIM DO SCHEMA INICIAL
-- =====================================================
