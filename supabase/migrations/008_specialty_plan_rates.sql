-- NUCLEUS - Specialty plan rates.
-- Internal table for net reimbursement by specialty and health plan.
-- These values are for clinic/professional use and are not exposed to leads.

CREATE TABLE IF NOT EXISTS public.specialty_plan_rates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  specialty text NOT NULL,
  plan text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (clinic_id, specialty, plan)
);

ALTER TABLE public.specialty_plan_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "specialty_plan_rates_same_clinic" ON public.specialty_plan_rates;
CREATE POLICY "specialty_plan_rates_same_clinic" ON public.specialty_plan_rates
  FOR ALL
  USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

INSERT INTO public.specialty_plan_rates (clinic_id, specialty, plan, amount)
SELECT DISTINCT
  clinic_id,
  specialty,
  plan,
  COALESCE(plan_fee, 0)
FROM public.patients
WHERE clinic_id IS NOT NULL
  AND specialty IS NOT NULL
  AND specialty <> ''
  AND plan IS NOT NULL
  AND plan <> ''
ON CONFLICT (clinic_id, specialty, plan)
DO UPDATE SET
  amount = EXCLUDED.amount,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
