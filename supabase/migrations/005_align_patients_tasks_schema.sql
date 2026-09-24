-- NUCLEUS - Align production patients/tasks schema with the app.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id),
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS health_plan text,
  ADD COLUMN IF NOT EXISTS health_plan_number text,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS blood_type text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id),
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id),
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS module text DEFAULT 'crm',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS done_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.patients
SET
  full_name = COALESCE(full_name, name, 'Paciente sem nome'),
  status = CASE
    WHEN status IN ('ativo', 'active') THEN 'active'
    WHEN status IN ('inativo', 'inactive') THEN 'inactive'
    WHEN status IN ('arquivado', 'archived') THEN 'archived'
    ELSE COALESCE(status, 'active')
  END,
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, created_at, now())
WHERE full_name IS NULL
   OR status IS NULL
   OR status IN ('ativo', 'inativo', 'arquivado')
   OR created_at IS NULL
   OR updated_at IS NULL;

UPDATE public.tasks
SET
  module = COALESCE(module, 'crm'),
  priority = CASE
    WHEN priority = 'urgente' THEN 'urgent'
    WHEN priority = 'alta' THEN 'high'
    WHEN priority = 'media' THEN 'medium'
    WHEN priority = 'baixa' THEN 'low'
    ELSE COALESCE(priority, 'medium')
  END,
  status = CASE
    WHEN status = 'pendente' THEN 'todo'
    WHEN status = 'em_progresso' THEN 'in_progress'
    WHEN status = 'concluida' THEN 'done'
    WHEN status = 'cancelada' THEN 'cancelled'
    ELSE COALESCE(status, 'todo')
  END,
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, created_at, now())
WHERE module IS NULL
   OR priority IS NULL
   OR status IS NULL
   OR priority IN ('urgente', 'alta', 'media', 'baixa')
   OR status IN ('pendente', 'em_progresso', 'concluida', 'cancelada')
   OR created_at IS NULL
   OR updated_at IS NULL;

NOTIFY pgrst, 'reload schema';
