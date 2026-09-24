-- Nucleus SaaS onboarding and specialty access foundation.

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_step text DEFAULT 'profile',
  ADD COLUMN IF NOT EXISTS default_specialty text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS checkout_provider text,
  ADD COLUMN IF NOT EXISTS checkout_customer_id text,
  ADD COLUMN IF NOT EXISTS checkout_subscription_id text,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS crm text,
  ADD COLUMN IF NOT EXISTS rqe text,
  ADD COLUMN IF NOT EXISTS council_state text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS is_primary_professional boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.clinic_specialties (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  specialty text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (clinic_id, specialty)
);

ALTER TABLE public.clinic_specialties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_specialties_same_clinic" ON public.clinic_specialties;
CREATE POLICY "clinic_specialties_same_clinic" ON public.clinic_specialties
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'staff',
  specialty text,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_team_invites_clinic ON public.team_invites(clinic_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON public.team_invites(lower(email));

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_invites_same_clinic" ON public.team_invites;
CREATE POLICY "team_invites_same_clinic" ON public.team_invites
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "team_invites_admin_write" ON public.team_invites;
CREATE POLICY "team_invites_admin_write" ON public.team_invites
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','financial','staff')
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','financial','staff')
    )
  );

UPDATE public.clinics c
SET onboarding_completed = true,
    onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
    owner_user_id = COALESCE(owner_user_id, p.id),
    default_specialty = COALESCE(default_specialty, p.specialty)
FROM public.profiles p
WHERE p.clinic_id = c.id
  AND COALESCE(c.onboarding_completed, false) = false
  AND EXISTS (
    SELECT 1
    FROM public.patients pa
    WHERE pa.clinic_id = c.id
    UNION ALL
    SELECT 1
    FROM public.leads l
    WHERE l.clinic_id = c.id
    UNION ALL
    SELECT 1
    FROM public.invoices i
    WHERE i.clinic_id = c.id
  );

UPDATE public.profiles p
SET is_primary_professional = true
WHERE role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.clinic_id = p.clinic_id
      AND p2.id <> p.id
      AND p2.created_at < p.created_at
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  clinic_id_from_meta UUID;
  new_clinic_id UUID;
  user_email TEXT;
  user_name TEXT;
  clinic_name TEXT;
  user_specialty TEXT;
  user_role TEXT;
BEGIN
  user_email := NEW.email;
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

  IF clinic_id_from_meta IS NOT NULL AND EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id_from_meta) THEN
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
      false,
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
    now()
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
    accepted_at = COALESCE(public.profiles.accepted_at, now()),
    updated_at = NOW();

  IF user_specialty IS NOT NULL THEN
    INSERT INTO public.clinic_specialties (clinic_id, specialty, enabled)
    VALUES (new_clinic_id, user_specialty, true)
    ON CONFLICT (clinic_id, specialty) DO UPDATE SET enabled = true;
  END IF;

  UPDATE public.team_invites
  SET status = 'accepted',
      auth_user_id = NEW.id,
      accepted_at = now()
  WHERE lower(email) = lower(user_email)
    AND clinic_id = new_clinic_id
    AND status = 'pending';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
