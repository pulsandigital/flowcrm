-- Nucleus - acesso real e isolado ao Portal do Paciente.

CREATE TABLE IF NOT EXISTS public.patient_portal_accounts (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.patient_portal_accounts
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS patient_portal_accounts_clinic_idx
  ON public.patient_portal_accounts(clinic_id);

ALTER TABLE public.patient_portal_accounts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_portal_patient_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT patient_id
  FROM public.patient_portal_accounts
  WHERE auth_user_id = auth.uid()
    AND active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_portal_clinic_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id
  FROM public.patient_portal_accounts
  WHERE auth_user_id = auth.uid()
    AND active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_patient_portal_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.patient_portal_accounts
    WHERE auth_user_id = auth.uid()
      AND active = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.current_portal_patient_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_portal_clinic_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_patient_portal_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_portal_patient_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_portal_clinic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_patient_portal_user() TO authenticated;

DROP POLICY IF EXISTS patient_portal_account_own_select ON public.patient_portal_accounts;
CREATE POLICY patient_portal_account_own_select
  ON public.patient_portal_accounts
  FOR SELECT
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS patient_portal_account_staff_select ON public.patient_portal_accounts;
CREATE POLICY patient_portal_account_staff_select
  ON public.patient_portal_accounts
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS patients_portal_own_select ON public.patients;
CREATE POLICY patients_portal_own_select
  ON public.patients
  FOR SELECT
  USING (
    id = public.current_portal_patient_id()
    AND clinic_id = public.current_portal_clinic_id()
  );

DROP POLICY IF EXISTS appointments_portal_own_select ON public.appointments;
CREATE POLICY appointments_portal_own_select
  ON public.appointments
  FOR SELECT
  USING (
    patient_id = public.current_portal_patient_id()
    AND clinic_id = public.current_portal_clinic_id()
  );

DROP POLICY IF EXISTS invoices_portal_own_select ON public.invoices;
CREATE POLICY invoices_portal_own_select
  ON public.invoices
  FOR SELECT
  USING (
    patient_id = public.current_portal_patient_id()
    AND clinic_id = public.current_portal_clinic_id()
    AND patient_portal_visible = TRUE
  );

DROP POLICY IF EXISTS patient_documents_portal_own_select ON public.patient_documents;
CREATE POLICY patient_documents_portal_own_select
  ON public.patient_documents
  FOR SELECT
  USING (
    patient_id = public.current_portal_patient_id()
    AND clinic_id = public.current_portal_clinic_id()
  );

DROP POLICY IF EXISTS patient_documents_portal_own_insert ON public.patient_documents;
CREATE POLICY patient_documents_portal_own_insert
  ON public.patient_documents
  FOR INSERT
  WITH CHECK (
    patient_id = public.current_portal_patient_id()
    AND clinic_id = public.current_portal_clinic_id()
    AND uploaded_by IS NULL
  );

DROP POLICY IF EXISTS clinics_portal_own_select ON public.clinics;
CREATE POLICY clinics_portal_own_select
  ON public.clinics
  FOR SELECT
  USING (id = public.current_portal_clinic_id());

DROP POLICY IF EXISTS medical_records_portal_signed_select ON public.medical_records;
CREATE POLICY medical_records_portal_signed_select
  ON public.medical_records
  FOR SELECT
  USING (
    patient_id = public.current_portal_patient_id()
    AND clinic_id = public.current_portal_clinic_id()
    AND signed = TRUE
  );

DROP POLICY IF EXISTS patient_attachments_portal_select ON storage.objects;
CREATE POLICY patient_attachments_portal_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'patient-attachments'
    AND (storage.foldername(name))[1] = public.current_portal_clinic_id()::TEXT
    AND (storage.foldername(name))[2] = public.current_portal_patient_id()::TEXT
  );

DROP POLICY IF EXISTS patient_attachments_portal_insert ON storage.objects;
CREATE POLICY patient_attachments_portal_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'patient-attachments'
    AND (storage.foldername(name))[1] = public.current_portal_clinic_id()::TEXT
    AND (storage.foldername(name))[2] = public.current_portal_patient_id()::TEXT
  );

DROP POLICY IF EXISTS patient_attachments_portal_delete ON storage.objects;
CREATE POLICY patient_attachments_portal_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'patient-attachments'
    AND owner_id = auth.uid()::TEXT
    AND (storage.foldername(name))[1] = public.current_portal_clinic_id()::TEXT
    AND (storage.foldername(name))[2] = public.current_portal_patient_id()::TEXT
  );

CREATE OR REPLACE FUNCTION public.get_patient_portal_bootstrap()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  portal_account public.patient_portal_accounts%ROWTYPE;
  result JSONB;
BEGIN
  SELECT *
  INTO portal_account
  FROM public.patient_portal_accounts
  WHERE auth_user_id = auth.uid()
    AND active = TRUE
  LIMIT 1;

  IF portal_account.auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Acesso ao Portal do Paciente nao autorizado.';
  END IF;

  SELECT jsonb_build_object(
    'patient', (
      SELECT jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'email', p.email,
        'phone', p.phone,
        'cpf', p.cpf,
        'dob', p.dob,
        'gender', p.gender,
        'health_plan', p.health_plan,
        'health_plan_number', p.health_plan_number,
        'status', p.status
      )
      FROM public.patients p
      WHERE p.id = portal_account.patient_id
        AND p.clinic_id = portal_account.clinic_id
    ),
    'clinic', (
      SELECT jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'brand_name', c.brand_name,
        'logo_url', c.logo_url,
        'professional_name', c.professional_name,
        'professional_photo_url', c.professional_photo_url,
        'primary_color', c.primary_color,
        'support_email', c.support_email,
        'support_phone', c.support_phone,
        'portal_title', c.portal_title
      )
      FROM public.clinics c
      WHERE c.id = portal_account.clinic_id
    ),
    'appointments', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'title', a.title,
          'specialty', a.specialty,
          'appointment_type', a.appointment_type,
          'starts_at', a.starts_at,
          'ends_at', a.ends_at,
          'location', a.location,
          'is_online', a.is_online,
          'meet_link', a.meet_link,
          'status', a.status,
          'patient_response', a.patient_response,
          'patient_response_reason', a.patient_response_reason,
          'professional_name', pr.full_name
        )
        ORDER BY a.starts_at DESC
      )
      FROM public.appointments a
      LEFT JOIN public.profiles pr ON pr.id = a.professional_id
      WHERE a.patient_id = portal_account.patient_id
        AND a.clinic_id = portal_account.clinic_id
    ), '[]'::JSONB),
    'invoices', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'description', i.description,
          'amount', i.amount,
          'status', i.status,
          'payment_method', i.payment_method,
          'payment_date', i.payment_date,
          'due_date', i.due_date,
          'provider_status', i.provider_status,
          'payment_url', i.payment_url,
          'pix_payload', i.pix_payload,
          'pix_qr_code_base64', i.pix_qr_code_base64,
          'pix_expires_at', i.pix_expires_at,
          'receipt_document_url', i.receipt_document_url
        )
        ORDER BY i.created_at DESC
      )
      FROM public.invoices i
      WHERE i.patient_id = portal_account.patient_id
        AND i.clinic_id = portal_account.clinic_id
        AND i.patient_portal_visible = TRUE
    ), '[]'::JSONB),
    'documents', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'name', d.name,
          'type', d.type,
          'file_url', d.file_url,
          'file_size', d.file_size,
          'mime_type', d.mime_type,
          'created_at', d.created_at
        )
        ORDER BY d.created_at DESC
      )
      FROM public.patient_documents d
      WHERE d.patient_id = portal_account.patient_id
        AND d.clinic_id = portal_account.clinic_id
    ), '[]'::JSONB),
    'history', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', mr.id,
          'appointment_date', mr.appointment_date,
          'specialty', mr.specialty,
          'appointment_type', mr.appointment_type,
          'evolution', mr.evolution,
          'conduct', mr.conduct,
          'professional_name', pr.full_name
        )
        ORDER BY mr.appointment_date DESC
      )
      FROM public.medical_records mr
      LEFT JOIN public.profiles pr ON pr.id = mr.professional_id
      WHERE mr.patient_id = portal_account.patient_id
        AND mr.clinic_id = portal_account.clinic_id
        AND mr.signed = TRUE
    ), '[]'::JSONB)
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_patient_portal_bootstrap() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_patient_portal_bootstrap() TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_to_patient_appointment(
  p_appointment_id UUID,
  p_response TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  portal_account public.patient_portal_accounts%ROWTYPE;
  appointment_row public.appointments%ROWTYPE;
  patient_name TEXT;
BEGIN
  IF p_response NOT IN ('confirmed', 'declined') THEN
    RAISE EXCEPTION 'Resposta invalida.';
  END IF;

  SELECT * INTO portal_account
  FROM public.patient_portal_accounts
  WHERE auth_user_id = auth.uid() AND active = TRUE;

  IF portal_account.auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Acesso nao autorizado.';
  END IF;

  SELECT * INTO appointment_row
  FROM public.appointments
  WHERE id = p_appointment_id
    AND patient_id = portal_account.patient_id
    AND clinic_id = portal_account.clinic_id;

  IF appointment_row.id IS NULL THEN
    RAISE EXCEPTION 'Agendamento nao encontrado.';
  END IF;

  UPDATE public.appointments
  SET patient_response = p_response,
      patient_response_reason = NULLIF(TRIM(p_reason), ''),
      patient_response_at = NOW(),
      status = CASE WHEN p_response = 'confirmed' THEN 'confirmed' ELSE status END,
      updated_at = NOW()
  WHERE id = appointment_row.id;

  SELECT full_name INTO patient_name
  FROM public.patients
  WHERE id = portal_account.patient_id;

  INSERT INTO public.notifications (
    clinic_id,
    user_id,
    patient_id,
    appointment_id,
    type,
    title,
    message,
    action_url,
    metadata
  )
  VALUES (
    portal_account.clinic_id,
    appointment_row.professional_id,
    portal_account.patient_id,
    appointment_row.id,
    'appointment_response',
    CASE WHEN p_response = 'confirmed'
      THEN 'Consulta confirmada pelo paciente'
      ELSE 'Consulta recusada pelo paciente'
    END,
    COALESCE(patient_name, 'Paciente') ||
      CASE WHEN p_response = 'confirmed'
        THEN ' confirmou a consulta.'
        ELSE ' informou que nao podera comparecer.' ||
          CASE WHEN NULLIF(TRIM(p_reason), '') IS NULL THEN '' ELSE ' Motivo: ' || TRIM(p_reason) END
      END,
    '/care/schedule',
    jsonb_build_object('response', p_response, 'reason', p_reason)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_patient_appointment(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_patient_appointment(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_patient_portal_profile(
  p_email TEXT,
  p_phone TEXT,
  p_dob DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  portal_account public.patient_portal_accounts%ROWTYPE;
BEGIN
  SELECT * INTO portal_account
  FROM public.patient_portal_accounts
  WHERE auth_user_id = auth.uid() AND active = TRUE;

  IF portal_account.auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Acesso nao autorizado.';
  END IF;

  UPDATE public.patients
  SET email = NULLIF(TRIM(p_email), ''),
      phone = NULLIF(TRIM(p_phone), ''),
      dob = p_dob,
      updated_at = NOW()
  WHERE id = portal_account.patient_id
    AND clinic_id = portal_account.clinic_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_patient_portal_profile(TEXT, TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_patient_portal_profile(TEXT, TEXT, DATE) TO authenticated;

-- Mantem profissionais no onboarding atual e impede a criacao de clinica para pacientes.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  account_type TEXT;
  patient_id_from_meta UUID;
  clinic_id_from_meta UUID;
  new_clinic_id UUID;
  user_email TEXT;
  user_name TEXT;
  clinic_name TEXT;
  user_specialty TEXT;
  user_role TEXT;
BEGIN
  user_email := NEW.email;
  account_type := COALESCE(NULLIF(NEW.raw_user_meta_data->>'account_type', ''), 'professional');

  IF account_type = 'patient' THEN
    BEGIN
      patient_id_from_meta := NULLIF(NEW.raw_user_meta_data->>'patient_id', '')::UUID;
      clinic_id_from_meta := NULLIF(NEW.raw_user_meta_data->>'clinic_id', '')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Convite de paciente invalido.';
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE p.id = patient_id_from_meta
        AND p.clinic_id = clinic_id_from_meta
        AND lower(COALESCE(p.email, '')) = lower(COALESCE(user_email, ''))
    ) THEN
      RAISE EXCEPTION 'Convite de paciente nao corresponde ao cadastro.';
    END IF;

    INSERT INTO public.patient_portal_accounts (
      auth_user_id,
      patient_id,
      clinic_id,
      active
    )
    VALUES (
      NEW.id,
      patient_id_from_meta,
      clinic_id_from_meta,
      TRUE
    )
    ON CONFLICT (auth_user_id) DO UPDATE SET
      patient_id = EXCLUDED.patient_id,
      clinic_id = EXCLUDED.clinic_id,
      active = TRUE,
      updated_at = NOW();

    RETURN NEW;
  END IF;

  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(user_email, '@', 1),
    'Novo usuario'
  );
  user_specialty := NULLIF(NEW.raw_user_meta_data->>'specialty', '');
  user_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'admin');
  clinic_name := COALESCE(
    NEW.raw_user_meta_data->>'clinic_name',
    NEW.raw_user_meta_data->>'company_name',
    user_name || ' - Nucleus'
  );

  BEGIN
    clinic_id_from_meta := NULLIF(NEW.raw_user_meta_data->>'clinic_id', '')::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    clinic_id_from_meta := NULL;
  END;

  IF clinic_id_from_meta IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id_from_meta) THEN
    new_clinic_id := clinic_id_from_meta;
  ELSE
    INSERT INTO public.clinics (
      name,
      slug,
      email,
      brand_name,
      primary_color,
      owner_user_id,
      default_specialty,
      onboarding_completed,
      onboarding_step,
      subscription_status,
      settings
    )
    VALUES (
      clinic_name,
      public.unique_clinic_slug(clinic_name),
      user_email,
      clinic_name,
      '#059669',
      NEW.id,
      user_specialty,
      FALSE,
      'profile',
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'subscription_status', ''), 'trialing'),
      jsonb_build_object(
        'businessName', clinic_name,
        'language', 'pt-BR',
        'timezone', 'America/Sao_Paulo',
        'primaryColor', '#059669'
      )
    )
    RETURNING id INTO new_clinic_id;
  END IF;

  INSERT INTO public.profiles (
    id,
    clinic_id,
    email,
    full_name,
    avatar_url,
    role,
    specialty,
    crm,
    rqe,
    council_state,
    is_primary_professional,
    active,
    accepted_at
  )
  VALUES (
    NEW.id,
    new_clinic_id,
    user_email,
    user_name,
    NEW.raw_user_meta_data->>'avatar_url',
    user_role,
    user_specialty,
    NULLIF(NEW.raw_user_meta_data->>'crm', ''),
    NULLIF(NEW.raw_user_meta_data->>'rqe', ''),
    NULLIF(NEW.raw_user_meta_data->>'council_state', ''),
    (user_role = 'admin'),
    TRUE,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    clinic_id = COALESCE(public.profiles.clinic_id, EXCLUDED.clinic_id),
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    role = COALESCE(public.profiles.role, EXCLUDED.role),
    specialty = COALESCE(public.profiles.specialty, EXCLUDED.specialty),
    crm = COALESCE(public.profiles.crm, EXCLUDED.crm),
    rqe = COALESCE(public.profiles.rqe, EXCLUDED.rqe),
    council_state = COALESCE(public.profiles.council_state, EXCLUDED.council_state),
    is_primary_professional = COALESCE(public.profiles.is_primary_professional, EXCLUDED.is_primary_professional),
    active = TRUE,
    accepted_at = COALESCE(public.profiles.accepted_at, NOW()),
    updated_at = NOW();

  IF user_specialty IS NOT NULL THEN
    INSERT INTO public.clinic_specialties (clinic_id, specialty, enabled)
    VALUES (new_clinic_id, user_specialty, TRUE)
    ON CONFLICT (clinic_id, specialty) DO UPDATE SET enabled = TRUE;
  END IF;

  UPDATE public.team_invites
  SET status = 'accepted',
      auth_user_id = NEW.id,
      accepted_at = NOW()
  WHERE lower(email) = lower(user_email)
    AND clinic_id = new_clinic_id
    AND status = 'pending';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
