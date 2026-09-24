-- NUCLEUS - Align medical records schema with the app.

ALTER TABLE public.medical_records
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS professional_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS appointment_type text DEFAULT 'Atendimento',
  ADD COLUMN IF NOT EXISTS appointment_date timestamptz,
  ADD COLUMN IF NOT EXISTS chief_complaint text,
  ADD COLUMN IF NOT EXISTS clinical_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS evolution text,
  ADD COLUMN IF NOT EXISTS conduct text,
  ADD COLUMN IF NOT EXISTS next_appointment date,
  ADD COLUMN IF NOT EXISTS ai_draft text,
  ADD COLUMN IF NOT EXISTS signed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.medical_records
SET
  specialty = COALESCE(specialty, 'Geral'),
  appointment_type = COALESCE(appointment_type, 'Atendimento'),
  appointment_date = COALESCE(appointment_date, created_at, now()),
  clinical_data = COALESCE(clinical_data, '{}'::jsonb),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, created_at, now())
WHERE specialty IS NULL
   OR appointment_type IS NULL
   OR appointment_date IS NULL
   OR clinical_data IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

NOTIFY pgrst, 'reload schema';
