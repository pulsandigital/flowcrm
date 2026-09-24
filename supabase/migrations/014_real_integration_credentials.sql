-- Credenciais privadas e estado operacional das integracoes da clinica.
-- Os valores sao criptografados pela Edge Function antes de chegarem ao banco.

ALTER TABLE public.clinic_integrations
  ADD COLUMN IF NOT EXISTS credentials_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS credentials_iv TEXT,
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

DROP POLICY IF EXISTS clinic_integrations_delete ON public.clinic_integrations;
CREATE POLICY clinic_integrations_delete ON public.clinic_integrations
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner', 'administrator')
    )
  );

