-- NUCLEUS - onboarding real e base white label
-- Garante que todo usuario novo receba uma clinica/workspace e um perfil admin.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS brand_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#2563EB',
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.slugify(value TEXT)
RETURNS TEXT AS $$
  SELECT trim(both '-' from regexp_replace(lower(unaccent(coalesce(value, 'nucleus'))), '[^a-z0-9]+', '-', 'g'));
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.unique_clinic_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  suffix INTEGER := 0;
BEGIN
  base_slug := coalesce(nullif(public.slugify(base_name), ''), 'nucleus');
  candidate := base_slug;

  WHILE EXISTS (SELECT 1 FROM public.clinics WHERE slug = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::TEXT;
  END LOOP;

  RETURN candidate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  clinic_id_from_meta UUID;
  new_clinic_id UUID;
  user_email TEXT;
  user_name TEXT;
  clinic_name TEXT;
BEGIN
  user_email := NEW.email;
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(user_email, '@', 1),
    'Novo usuario'
  );
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
      settings
    )
    VALUES (
      clinic_name,
      public.unique_clinic_slug(clinic_name),
      user_email,
      clinic_name,
      '#2563EB',
      jsonb_build_object(
        'businessName', clinic_name,
        'language', 'pt-BR',
        'timezone', 'America/Sao_Paulo',
        'primaryColor', '#2563EB'
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
    active
  )
  VALUES (
    NEW.id,
    new_clinic_id,
    user_email,
    user_name,
    NEW.raw_user_meta_data->>'avatar_url',
    'admin',
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    clinic_id = COALESCE(public.profiles.clinic_id, EXCLUDED.clinic_id),
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    role = COALESCE(public.profiles.role, 'admin'),
    active = TRUE,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
DECLARE
  p RECORD;
  new_clinic_id UUID;
  clinic_name TEXT;
BEGIN
  FOR p IN
    SELECT id, email, full_name
    FROM public.profiles
    WHERE clinic_id IS NULL
  LOOP
    clinic_name := COALESCE(NULLIF(p.full_name, ''), split_part(p.email, '@', 1), 'Nucleus') || ' - Nucleus';

    INSERT INTO public.clinics (
      name,
      slug,
      email,
      brand_name,
      primary_color,
      settings
    )
    VALUES (
      clinic_name,
      public.unique_clinic_slug(clinic_name),
      p.email,
      clinic_name,
      '#2563EB',
      jsonb_build_object(
        'businessName', clinic_name,
        'language', 'pt-BR',
        'timezone', 'America/Sao_Paulo',
        'primaryColor', '#2563EB'
      )
    )
    RETURNING id INTO new_clinic_id;

    UPDATE public.profiles
    SET clinic_id = new_clinic_id,
        role = COALESCE(role, 'admin'),
        active = TRUE,
        updated_at = NOW()
    WHERE id = p.id;
  END LOOP;
END $$;
