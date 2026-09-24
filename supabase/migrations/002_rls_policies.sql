-- ═══════════════════════════════════════════════════════════════
-- NUCLEUS — Row Level Security (RLS)
-- Cada clínica só enxerga os próprios dados
-- ═══════════════════════════════════════════════════════════════

-- Helper: retorna clinic_id do usuário autenticado
CREATE OR REPLACE FUNCTION auth_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: retorna role do usuário autenticado
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Habilitar RLS em todas as tabelas ───────────────────────
ALTER TABLE clinics           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns         ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- ─── CLINICS ─────────────────────────────────────────────────
-- Usuário só vê a própria clínica
CREATE POLICY "clinic_isolation" ON clinics
  FOR ALL USING (id = auth_clinic_id());

-- ─── PROFILES ────────────────────────────────────────────────
-- Usuários veem apenas colegas da mesma clínica
CREATE POLICY "profiles_same_clinic" ON profiles
  FOR ALL USING (clinic_id = auth_clinic_id());

-- ─── LEADS ───────────────────────────────────────────────────
CREATE POLICY "leads_same_clinic" ON leads
  FOR ALL USING (clinic_id = auth_clinic_id());

-- ─── CONVERSATIONS ────────────────────────────────────────────
CREATE POLICY "conversations_same_clinic" ON conversations
  FOR ALL USING (clinic_id = auth_clinic_id());

-- ─── MESSAGES ────────────────────────────────────────────────
CREATE POLICY "messages_same_clinic" ON messages
  FOR ALL USING (clinic_id = auth_clinic_id());

-- ─── PATIENTS ────────────────────────────────────────────────
CREATE POLICY "patients_same_clinic" ON patients
  FOR ALL USING (clinic_id = auth_clinic_id());

-- ─── MEDICAL RECORDS ─────────────────────────────────────────
-- Médicos/enfermeiros veem tudo | Secretária não vê conteúdo clínico
CREATE POLICY "records_clinical_staff" ON medical_records
  FOR ALL USING (
    clinic_id = auth_clinic_id()
    AND auth_role() IN ('admin','doctor','nurse')
  );

-- ─── APPOINTMENTS ─────────────────────────────────────────────
CREATE POLICY "appointments_same_clinic" ON appointments
  FOR ALL USING (clinic_id = auth_clinic_id());

-- ─── TASKS ────────────────────────────────────────────────────
-- Usuário vê tarefas da clínica (admins veem tudo, outros só as atribuídas)
CREATE POLICY "tasks_clinic_or_assigned" ON tasks
  FOR ALL USING (
    clinic_id = auth_clinic_id()
    AND (
      auth_role() IN ('admin','doctor')
      OR assigned_to = auth.uid()
      OR created_by = auth.uid()
    )
  );

-- ─── INVOICES ─────────────────────────────────────────────────
-- Apenas admin e financeiro veem cobranças
CREATE POLICY "invoices_financial_only" ON invoices
  FOR ALL USING (
    clinic_id = auth_clinic_id()
    AND auth_role() IN ('admin','financial')
  );

-- ─── CAMPAIGNS ────────────────────────────────────────────────
CREATE POLICY "campaigns_same_clinic" ON campaigns
  FOR ALL USING (clinic_id = auth_clinic_id());

-- ─── DOCUMENTS ────────────────────────────────────────────────
CREATE POLICY "documents_clinical_staff" ON patient_documents
  FOR ALL USING (
    clinic_id = auth_clinic_id()
    AND auth_role() IN ('admin','doctor','nurse')
  );

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA — Clínica e usuário demo para testes
-- ═══════════════════════════════════════════════════════════════
INSERT INTO clinics (id, name, slug, email, phone, plan) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Clínica Saúde Integrada',
   'clinica-saude-integrada',
   'contato@clinicasaude.com.br',
   '(11) 3000-0000',
   'pro');
