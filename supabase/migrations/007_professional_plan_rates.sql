-- NUCLEUS - Professional plan rates.
-- Stores how much each professional receives for each plan.

CREATE TABLE IF NOT EXISTS public.professional_plan_rates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  professional_name text NOT NULL,
  plan text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (clinic_id, professional_name, plan)
);

ALTER TABLE public.professional_plan_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "professional_plan_rates_same_clinic" ON public.professional_plan_rates;
CREATE POLICY "professional_plan_rates_same_clinic" ON public.professional_plan_rates
  FOR ALL
  USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

INSERT INTO public.professional_plan_rates (clinic_id, professional_name, plan, amount)
SELECT DISTINCT
  clinic_id,
  professional,
  plan,
  COALESCE(plan_fee, 0)
FROM public.patients
WHERE clinic_id IS NOT NULL
  AND professional IS NOT NULL
  AND professional <> ''
  AND plan IS NOT NULL
  AND plan <> ''
ON CONFLICT (clinic_id, professional_name, plan)
DO UPDATE SET
  amount = EXCLUDED.amount,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
