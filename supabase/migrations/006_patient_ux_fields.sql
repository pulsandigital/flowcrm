-- NUCLEUS - Patient UX fields.
-- Stores form selections as structured data instead of appending them to notes.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS plan_fee numeric(10,2),
  ADD COLUMN IF NOT EXISTS professional text;

UPDATE public.patients
SET
  city = COALESCE(city, split_part(address, ' - ', 1)),
  state = COALESCE(state, nullif(split_part(address, ' - ', 2), '')),
  specialty = COALESCE(
    specialty,
    nullif(substring(notes from 'Especialidade: ([^\n\r]+)'), '')
  ),
  professional = COALESCE(
    professional,
    nullif(substring(notes from 'Profissional: ([^\n\r]+)'), '')
  ),
  plan = COALESCE(plan, health_plan),
  plan_fee = COALESCE(
    plan_fee,
    CASE COALESCE(plan, health_plan)
      WHEN 'Particular' THEN 250
      WHEN 'Unimed' THEN 110
      WHEN 'Bradesco Saúde' THEN 140
      WHEN 'SulAmérica' THEN 130
      WHEN 'Amil' THEN 105
      WHEN 'Hapvida NotreDame Intermédica' THEN 85
      WHEN 'Porto Saúde' THEN 135
      WHEN 'Omint' THEN 170
      WHEN 'Care Plus' THEN 165
      WHEN 'Prevent Senior' THEN 95
      WHEN 'Cassi' THEN 120
      WHEN 'Saúde Caixa' THEN 120
      WHEN 'Geap' THEN 90
      WHEN 'Golden Cross' THEN 100
      ELSE 0
    END
  )
WHERE city IS NULL
   OR state IS NULL
   OR specialty IS NULL
   OR professional IS NULL
   OR plan IS NULL
   OR plan_fee IS NULL;

NOTIFY pgrst, 'reload schema';
