-- NUCLEUS - configuracao de producao, white label e integracoes reais
-- Rode no Supabase SQL Editor antes de usar a central de Producao / White Label.

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS professional_name TEXT,
  ADD COLUMN IF NOT EXISTS professional_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS portal_title TEXT,
  ADD COLUMN IF NOT EXISTS portal_domain TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain_status TEXT DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS support_email TEXT,
  ADD COLUMN IF NOT EXISTS support_phone TEXT,
  ADD COLUMN IF NOT EXISTS terms_url TEXT,
  ADD COLUMN IF NOT EXISTS privacy_url TEXT,
  ADD COLUMN IF NOT EXISTS production_status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS production_notes TEXT;

CREATE TABLE IF NOT EXISTS public.clinic_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_configured',
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  public_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, provider)
);

CREATE INDEX IF NOT EXISTS clinic_integrations_clinic_idx
  ON public.clinic_integrations(clinic_id);

ALTER TABLE public.clinic_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinic_integrations_select ON public.clinic_integrations;
CREATE POLICY clinic_integrations_select ON public.clinic_integrations
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS clinic_integrations_insert ON public.clinic_integrations;
CREATE POLICY clinic_integrations_insert ON public.clinic_integrations
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS clinic_integrations_update ON public.clinic_integrations;
CREATE POLICY clinic_integrations_update ON public.clinic_integrations
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE OR REPLACE FUNCTION public.touch_clinic_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clinic_integrations_touch_updated_at ON public.clinic_integrations;
CREATE TRIGGER clinic_integrations_touch_updated_at
  BEFORE UPDATE ON public.clinic_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_clinic_integrations_updated_at();
