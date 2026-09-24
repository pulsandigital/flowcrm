-- NUCLEUS - Security, LGPD, audit trail and granular access
-- Production hardening for tenant isolation, private storage and legal records.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.current_profile_clinic_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.clinic_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(p.role, 'staff')
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_profile_permissions()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(p.permissions, '{}'::jsonb)
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.current_profile_role() IN ('admin', 'owner')
$$;

CREATE OR REPLACE FUNCTION public.has_clinic_permission(permission_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  role_allowed boolean := false;
BEGIN
  BEGIN
    SELECT EXISTS (
      SELECT 1
      FROM public.clinic_role_permissions crp
      WHERE crp.clinic_id = public.current_profile_clinic_id()
        AND crp.role = public.current_profile_role()
        AND crp.permission_key = permission_key
        AND crp.allowed = true
    )
    INTO role_allowed;
  EXCEPTION WHEN undefined_table THEN
    role_allowed := false;
  END;

  RETURN public.is_clinic_admin()
    OR COALESCE((public.current_profile_permissions() ->> permission_key)::boolean, false)
    OR role_allowed;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_clinic(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT target_clinic_id IS NOT NULL
    AND target_clinic_id = public.current_profile_clinic_id()
$$;

REVOKE ALL ON FUNCTION public.current_profile_clinic_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_profile_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_profile_permissions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_clinic_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_clinic_permission(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_clinic(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_profile_clinic_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_profile_permissions() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_clinic_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_clinic_permission(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_clinic(uuid) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_table text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_created
  ON public.audit_logs(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs(entity_table, entity_id);

CREATE TABLE IF NOT EXISTS public.lgpd_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  requester_type text NOT NULL DEFAULT 'patient'
    CHECK (requester_type IN ('patient', 'professional', 'admin', 'guardian')),
  subject_name text NOT NULL,
  subject_email text,
  subject_cpf text,
  request_type text NOT NULL
    CHECK (request_type IN ('access', 'correction', 'deletion', 'portability', 'consent_revocation', 'anonymization', 'information')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'completed', 'rejected')),
  description text,
  response text,
  due_at timestamptz NOT NULL DEFAULT (now() + interval '15 days'),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  handled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lgpd_requests_clinic_status
  ON public.lgpd_requests(clinic_id, status, due_at);

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('privacy_policy', 'terms_of_use', 'saas_contract', 'dpa', 'lgpd_consent')),
  version text NOT NULL DEFAULT '1.0',
  title text NOT NULL,
  body text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, type, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_active
  ON public.legal_documents(clinic_id, type, active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_documents_global_unique
  ON public.legal_documents(type, version)
  WHERE clinic_id IS NULL;

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user
  ON public.legal_acceptances(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_patient
  ON public.legal_acceptances(patient_id, document_id);

CREATE TABLE IF NOT EXISTS public.clinic_role_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  role text NOT NULL,
  permission_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, role, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_clinic_role_permissions_clinic
  ON public.clinic_role_permissions(clinic_id, role);

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_clinic_created
  ON public.security_events(clinic_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.legal_acceptances FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_role_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.security_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_admin_select ON public.audit_logs;
CREATE POLICY audit_logs_admin_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id) AND public.has_clinic_permission('audit.read'));

DROP POLICY IF EXISTS audit_logs_service_insert ON public.audit_logs;
CREATE POLICY audit_logs_service_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_clinic(clinic_id)
    AND public.has_clinic_permission('audit.write')
  );

DROP POLICY IF EXISTS lgpd_requests_select ON public.lgpd_requests;
CREATE POLICY lgpd_requests_select ON public.lgpd_requests
  FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id) AND public.has_clinic_permission('lgpd.read'));

DROP POLICY IF EXISTS lgpd_requests_insert ON public.lgpd_requests;
CREATE POLICY lgpd_requests_insert ON public.lgpd_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_clinic(clinic_id) AND public.has_clinic_permission('lgpd.write'));

DROP POLICY IF EXISTS lgpd_requests_update ON public.lgpd_requests;
CREATE POLICY lgpd_requests_update ON public.lgpd_requests
  FOR UPDATE TO authenticated
  USING (public.can_access_clinic(clinic_id) AND public.has_clinic_permission('lgpd.write'))
  WITH CHECK (public.can_access_clinic(clinic_id) AND public.has_clinic_permission('lgpd.write'));

DROP POLICY IF EXISTS legal_documents_select ON public.legal_documents;
CREATE POLICY legal_documents_select ON public.legal_documents
  FOR SELECT TO authenticated
  USING (
    clinic_id IS NULL
    OR public.can_access_clinic(clinic_id)
  );

DROP POLICY IF EXISTS legal_documents_admin_write ON public.legal_documents;
CREATE POLICY legal_documents_admin_write ON public.legal_documents
  FOR ALL TO authenticated
  USING (
    clinic_id IS NOT NULL
    AND public.can_access_clinic(clinic_id)
    AND public.has_clinic_permission('legal.write')
  )
  WITH CHECK (
    clinic_id IS NOT NULL
    AND public.can_access_clinic(clinic_id)
    AND public.has_clinic_permission('legal.write')
  );

DROP POLICY IF EXISTS legal_acceptances_select ON public.legal_acceptances;
CREATE POLICY legal_acceptances_select ON public.legal_acceptances
  FOR SELECT TO authenticated
  USING (
    public.can_access_clinic(clinic_id)
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS legal_acceptances_insert ON public.legal_acceptances;
CREATE POLICY legal_acceptances_insert ON public.legal_acceptances
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_clinic(clinic_id)
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS clinic_role_permissions_select ON public.clinic_role_permissions;
CREATE POLICY clinic_role_permissions_select ON public.clinic_role_permissions
  FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));

DROP POLICY IF EXISTS clinic_role_permissions_admin_write ON public.clinic_role_permissions;
CREATE POLICY clinic_role_permissions_admin_write ON public.clinic_role_permissions
  FOR ALL TO authenticated
  USING (public.can_access_clinic(clinic_id) AND public.is_clinic_admin())
  WITH CHECK (public.can_access_clinic(clinic_id) AND public.is_clinic_admin());

DROP POLICY IF EXISTS security_events_admin_select ON public.security_events;
CREATE POLICY security_events_admin_select ON public.security_events
  FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id) AND public.has_clinic_permission('security.read'));

DROP POLICY IF EXISTS security_events_admin_write ON public.security_events;
CREATE POLICY security_events_admin_write ON public.security_events
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_clinic(clinic_id) AND public.has_clinic_permission('security.write'));

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'clinics',
    'profiles',
    'leads',
    'conversations',
    'messages',
    'patients',
    'medical_records',
    'appointments',
    'tasks',
    'invoices',
    'campaigns',
    'patient_documents',
    'professional_plan_rates',
    'specialty_plan_rates',
    'clinic_integrations',
    'notifications',
    'clinic_specialties',
    'team_invites'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_data jsonb;
  old_data jsonb;
  new_data jsonb;
  target_clinic_id uuid;
  row_id text;
BEGIN
  old_data := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  new_data := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
  row_data := COALESCE(new_data, old_data, '{}'::jsonb);
  target_clinic_id := COALESCE(NULLIF(row_data ->> 'clinic_id', '')::uuid, public.current_profile_clinic_id());
  row_id := COALESCE(row_data ->> 'id', NULL);

  INSERT INTO public.audit_logs (
    clinic_id,
    actor_id,
    action,
    entity_table,
    entity_id,
    metadata
  )
  VALUES (
    target_clinic_id,
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    row_id,
    jsonb_build_object(
      'old', old_data,
      'new', new_data,
      'schema', TG_TABLE_SCHEMA
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'clinics',
    'profiles',
    'leads',
    'conversations',
    'messages',
    'patients',
    'medical_records',
    'appointments',
    'tasks',
    'invoices',
    'campaigns',
    'patient_documents',
    'professional_plan_rates',
    'specialty_plan_rates',
    'clinic_integrations',
    'notifications',
    'clinic_specialties',
    'team_invites',
    'lgpd_requests',
    'legal_documents',
    'legal_acceptances',
    'clinic_role_permissions',
    'security_events'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', table_name, table_name);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()',
        table_name,
        table_name
      );
    END IF;
  END LOOP;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('clinic-assets', 'clinic-assets', false, 10485760, ARRAY['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('patient-attachments', 'patient-attachments', false, 52428800, ARRAY['application/pdf','image/png','image/jpeg','image/webp']),
  ('medical-documents', 'medical-documents', false, 52428800, ARRAY['application/pdf','image/png','image/jpeg','image/webp']),
  ('financial-documents', 'financial-documents', false, 52428800, ARRAY['application/pdf','image/png','image/jpeg','image/webp']),
  ('legal-documents', 'legal-documents', false, 20971520, ARRAY['application/pdf','text/plain','text/markdown'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS private_clinic_storage_select ON storage.objects;
CREATE POLICY private_clinic_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('clinic-assets', 'patient-attachments', 'medical-documents', 'financial-documents', 'legal-documents')
    AND (storage.foldername(name))[1] = public.current_profile_clinic_id()::text
  );

DROP POLICY IF EXISTS private_clinic_storage_insert ON storage.objects;
CREATE POLICY private_clinic_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('clinic-assets', 'patient-attachments', 'medical-documents', 'financial-documents', 'legal-documents')
    AND (storage.foldername(name))[1] = public.current_profile_clinic_id()::text
  );

DROP POLICY IF EXISTS private_clinic_storage_update ON storage.objects;
CREATE POLICY private_clinic_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('clinic-assets', 'patient-attachments', 'medical-documents', 'financial-documents', 'legal-documents')
    AND (storage.foldername(name))[1] = public.current_profile_clinic_id()::text
  )
  WITH CHECK (
    bucket_id IN ('clinic-assets', 'patient-attachments', 'medical-documents', 'financial-documents', 'legal-documents')
    AND (storage.foldername(name))[1] = public.current_profile_clinic_id()::text
  );

DROP POLICY IF EXISTS private_clinic_storage_delete ON storage.objects;
CREATE POLICY private_clinic_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('clinic-assets', 'patient-attachments', 'medical-documents', 'financial-documents', 'legal-documents')
    AND (storage.foldername(name))[1] = public.current_profile_clinic_id()::text
    AND public.has_clinic_permission('storage.delete')
  );

INSERT INTO public.legal_documents (clinic_id, type, version, title, body, active, published_at)
VALUES
  (
    NULL,
    'privacy_policy',
    '1.0',
    'Politica de Privacidade da Plataforma Nucleus',
    $doc$
A Nucleus trata dados pessoais e dados sensiveis de saude para viabilizar prontuario, agenda, comunicacao, pagamentos, documentos, integracoes e suporte operacional aos profissionais e clinicas contratantes.

Os profissionais e clinicas sao controladores dos dados de seus pacientes. A Nucleus atua como operadora quando processa dados em nome da clinica, adotando isolamento por clinica, controle de acesso, registros de auditoria, armazenamento privado e mecanismos de atendimento aos direitos previstos na LGPD.

Dados tratados podem incluir cadastro do usuario, informacoes profissionais, dados de pacientes, registros clinicos, documentos, anexos, dados de pagamento, logs tecnicos e eventos de seguranca. O uso de integracoes externas, como gateways de pagamento, mensageria, agenda e inteligencia artificial, depende da configuracao feita pela clinica e deve ser informado ao paciente quando aplicavel.

O titular pode solicitar acesso, correcao, portabilidade, revisao, eliminacao quando cabivel, revogacao de consentimento e informacoes sobre compartilhamento. Registros de prontuario podem seguir prazos legais de guarda, inclusive a Lei 13.787/2018.

Este texto e um modelo operacional inicial e deve ser revisado juridicamente antes da publicacao final.
$doc$,
    true,
    now()
  ),
  (
    NULL,
    'terms_of_use',
    '1.0',
    'Termos de Uso da Plataforma Nucleus',
    $doc$
Ao utilizar a Nucleus, o usuario declara ser profissional autorizado, integrante de equipe autorizada ou paciente com acesso concedido pela clinica. O usuario deve manter suas credenciais em sigilo e usar a plataforma somente para finalidades licitas e profissionais.

A Nucleus oferece recursos de CRM, agenda, prontuario, financeiro, documentos, portal do paciente, integracoes e automacoes. A responsabilidade tecnica e assistencial pelas condutas registradas pertence ao profissional de saude. Sugestoes automatizadas, quando existentes, sao apoio operacional e nao substituem julgamento clinico.

E proibido compartilhar credenciais, tentar acessar dados de outra clinica, extrair dados sem autorizacao, violar sigilo profissional ou usar a plataforma para finalidade incompatibil com saude, privacidade e seguranca.

Este texto e um modelo operacional inicial e deve ser revisado juridicamente antes da publicacao final.
$doc$,
    true,
    now()
  ),
  (
    NULL,
    'saas_contract',
    '1.0',
    'Contrato SaaS Nucleus',
    $doc$
Este contrato disciplina o licenciamento de uso da plataforma Nucleus em modelo SaaS para profissionais e clinicas de saude. A contratante recebe direito de uso nao exclusivo, intransferivel e condicionado ao plano contratado.

A Nucleus se compromete a manter controles de seguranca, isolamento por clinica, backups conforme politica operacional, disponibilidade razoavel, evolucao da plataforma e suporte dentro dos limites do plano contratado. A contratante e responsavel pela veracidade dos dados inseridos, pelas credenciais de usuarios convidados, pelos consentimentos necessarios e pela conformidade profissional aplicavel.

Pagamentos, inadimplencia, cancelamento, limites de responsabilidade, suporte, propriedade intelectual, uso de integracoes, confidencialidade e tratamento de dados devem ser detalhados no contrato comercial final.

Este texto e um modelo operacional inicial e deve ser revisado juridicamente antes da publicacao final.
$doc$,
    true,
    now()
  )
ON CONFLICT (type, version) WHERE clinic_id IS NULL DO UPDATE
SET title = EXCLUDED.title,
    body = EXCLUDED.body,
    active = EXCLUDED.active,
    published_at = COALESCE(public.legal_documents.published_at, EXCLUDED.published_at),
    updated_at = now();

INSERT INTO public.clinic_role_permissions (clinic_id, role, permission_key, allowed)
SELECT c.id, role_name, permission_key, true
FROM public.clinics c
CROSS JOIN (
  VALUES
    ('admin', 'audit.read'),
    ('admin', 'security.read'),
    ('admin', 'security.write'),
    ('admin', 'legal.write'),
    ('admin', 'lgpd.read'),
    ('admin', 'lgpd.write'),
    ('admin', 'storage.delete'),
    ('admin', 'users.manage'),
    ('admin', 'settings.manage'),
    ('doctor', 'clinical.read'),
    ('doctor', 'clinical.write'),
    ('doctor', 'documents.write'),
    ('nurse', 'clinical.read'),
    ('nurse', 'clinical.write'),
    ('secretary', 'agenda.read'),
    ('secretary', 'agenda.write'),
    ('financial', 'finance.read'),
    ('financial', 'finance.write'),
    ('marketing', 'marketing.read'),
    ('marketing', 'marketing.write')
) AS defaults(role_name, permission_key)
ON CONFLICT (clinic_id, role, permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  severity text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.security_events (clinic_id, user_id, event_type, severity, description, metadata)
  VALUES (
    public.current_profile_clinic_id(),
    auth.uid(),
    event_type,
    severity,
    description,
    COALESCE(metadata, '{}'::jsonb)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_security_event(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, text, jsonb) TO authenticated, service_role;
