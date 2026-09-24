-- ═══════════════════════════════════════════════════════════════
-- NUCLEUS HEALTH PLATFORM — Database Schema
-- Supabase PostgreSQL Migration
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────
-- 1. CLINICS (tenants)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE clinics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  logo_url    TEXT,
  plan        TEXT DEFAULT 'starter' CHECK (plan IN ('starter','pro','enterprise')),
  active      BOOLEAN DEFAULT TRUE,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 2. PROFILES (extends auth.users)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id     UUID REFERENCES clinics(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT DEFAULT 'staff' CHECK (role IN ('admin','doctor','nurse','secretary','marketing','financial','staff')),
  specialty     TEXT,
  active        BOOLEAN DEFAULT TRUE,
  permissions   JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 3. LEADS (CRM)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  origin          TEXT DEFAULT 'manual',
  channel         TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','instagram','facebook','google','site','referral','manual')),
  temperature     TEXT DEFAULT 'warm' CHECK (temperature IN ('hot','warm','cold')),
  stage           TEXT DEFAULT 'new' CHECK (stage IN ('new','contacted','qualified','proposal','negotiation','won','lost')),
  score           INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  assigned_to     UUID REFERENCES profiles(id),
  tags            TEXT[] DEFAULT '{}',
  notes           TEXT,
  value           NUMERIC(10,2),
  lost_reason     TEXT,
  converted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 4. CONVERSATIONS (WhatsApp / Omnichannel)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id     UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES leads(id),
  patient_id    UUID,
  channel       TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','instagram','facebook','site','email')),
  remote_id     TEXT,
  contact_name  TEXT,
  contact_phone TEXT,
  status        TEXT DEFAULT 'open' CHECK (status IN ('open','pending','resolved','archived')),
  assigned_to   UUID REFERENCES profiles(id),
  unread_count  INTEGER DEFAULT 0,
  last_message  TEXT,
  last_message_at TIMESTAMPTZ,
  tags          TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 5. MESSAGES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  from_me         BOOLEAN DEFAULT FALSE,
  sender_id       UUID REFERENCES profiles(id),
  content         TEXT NOT NULL,
  type            TEXT DEFAULT 'text' CHECK (type IN ('text','image','audio','video','document','location')),
  media_url       TEXT,
  remote_message_id TEXT,
  status          TEXT DEFAULT 'sent' CHECK (status IN ('sending','sent','delivered','read','failed')),
  edited          BOOLEAN DEFAULT FALSE,
  deleted         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 6. PATIENTS (Care)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE patients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id),
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  cpf             TEXT,
  dob             DATE,
  gender          TEXT CHECK (gender IN ('male','female','other','prefer_not')),
  address         TEXT,
  emergency_contact TEXT,
  health_plan     TEXT,
  health_plan_number TEXT,
  allergies       TEXT,
  blood_type      TEXT,
  notes           TEXT,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 7. MEDICAL RECORDS (Prontuários)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE medical_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES profiles(id),
  specialty       TEXT NOT NULL,
  appointment_type TEXT DEFAULT 'session',
  appointment_date TIMESTAMPTZ NOT NULL,
  chief_complaint TEXT,
  clinical_data   JSONB DEFAULT '{}',
  evolution       TEXT,
  conduct         TEXT,
  next_appointment DATE,
  ai_draft        TEXT,
  signed          BOOLEAN DEFAULT FALSE,
  signed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 8. APPOINTMENTS (Agenda)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id      UUID REFERENCES patients(id),
  lead_id         UUID REFERENCES leads(id),
  professional_id UUID REFERENCES profiles(id),
  title           TEXT,
  specialty       TEXT,
  appointment_type TEXT DEFAULT 'session',
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  location        TEXT DEFAULT 'Consultório 1',
  is_online       BOOLEAN DEFAULT FALSE,
  meet_link       TEXT,
  status          TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','cancelled','completed','no_show')),
  notes           TEXT,
  reminder_sent   BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 9. TASKS (CRM Tasks)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  lead_id     UUID REFERENCES leads(id),
  patient_id  UUID REFERENCES patients(id),
  assigned_to UUID REFERENCES profiles(id),
  created_by  UUID REFERENCES profiles(id),
  title       TEXT NOT NULL,
  description TEXT,
  module      TEXT DEFAULT 'crm' CHECK (module IN ('crm','care','finance','marketing','admin')),
  priority    TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status      TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','cancelled')),
  due_date    TIMESTAMPTZ,
  done_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 10. INVOICES (Financeiro)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id      UUID REFERENCES patients(id),
  appointment_id  UUID REFERENCES appointments(id),
  description     TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','cancelled','refunded')),
  payment_method  TEXT CHECK (payment_method IN ('pix','boleto','credit_card','debit_card','cash','transfer','health_plan')),
  payment_date    DATE,
  due_date        DATE,
  external_id     TEXT,
  invoice_url     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 11. CAMPAIGNS (Marketing)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE campaigns (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id     UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  platform      TEXT CHECK (platform IN ('meta','google','tiktok','organic','email','whatsapp')),
  status        TEXT DEFAULT 'active' CHECK (status IN ('draft','active','paused','finished')),
  budget        NUMERIC(10,2),
  spent         NUMERIC(10,2) DEFAULT 0,
  impressions   INTEGER DEFAULT 0,
  clicks        INTEGER DEFAULT 0,
  leads         INTEGER DEFAULT 0,
  conversions   INTEGER DEFAULT 0,
  cpl           NUMERIC(10,2),
  roas          NUMERIC(5,2),
  starts_at     DATE,
  ends_at       DATE,
  external_id   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 12. DOCUMENTS (Prontuário — documentos e anexos)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE patient_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_id   UUID REFERENCES medical_records(id),
  name        TEXT NOT NULL,
  type        TEXT DEFAULT 'document' CHECK (type IN ('document','exam','image','consent','report','prescription')),
  file_url    TEXT NOT NULL,
  file_size   INTEGER,
  mime_type   TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES (Performance)
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX idx_leads_clinic          ON leads(clinic_id);
CREATE INDEX idx_leads_stage           ON leads(stage);
CREATE INDEX idx_leads_assigned        ON leads(assigned_to);
CREATE INDEX idx_conversations_clinic  ON conversations(clinic_id);
CREATE INDEX idx_conversations_lead    ON conversations(lead_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_patients_clinic       ON patients(clinic_id);
CREATE INDEX idx_records_patient       ON medical_records(patient_id);
CREATE INDEX idx_records_clinic        ON medical_records(clinic_id);
CREATE INDEX idx_appointments_clinic   ON appointments(clinic_id);
CREATE INDEX idx_appointments_starts   ON appointments(starts_at);
CREATE INDEX idx_appointments_professional ON appointments(professional_id);
CREATE INDEX idx_tasks_clinic          ON tasks(clinic_id);
CREATE INDEX idx_tasks_assigned        ON tasks(assigned_to);
CREATE INDEX idx_invoices_clinic       ON invoices(clinic_id);
CREATE INDEX idx_invoices_status       ON invoices(status);
CREATE INDEX idx_campaigns_clinic      ON campaigns(clinic_id);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS — updated_at automático
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clinics_updated        BEFORE UPDATE ON clinics        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated       BEFORE UPDATE ON profiles       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_leads_updated          BEFORE UPDATE ON leads          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_conversations_updated  BEFORE UPDATE ON conversations  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_patients_updated       BEFORE UPDATE ON patients       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_records_updated        BEFORE UPDATE ON medical_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_appointments_updated   BEFORE UPDATE ON appointments   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated          BEFORE UPDATE ON tasks          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invoices_updated       BEFORE UPDATE ON invoices       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_campaigns_updated      BEFORE UPDATE ON campaigns      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: novo perfil ao criar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: novo lead → cria tarefa de follow-up automática
CREATE OR REPLACE FUNCTION create_lead_followup_task()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tasks (clinic_id, lead_id, title, priority, module, due_date)
  VALUES (
    NEW.clinic_id,
    NEW.id,
    'Fazer primeiro contato com ' || NEW.name,
    'high',
    'crm',
    NOW() + INTERVAL '24 hours'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_lead_created
  AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION create_lead_followup_task();
