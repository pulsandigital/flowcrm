-- WhatsApp real: estrutura de canais e isolamento por clinica.
-- A migracao e idempotente e tambem alinha bancos legados com o frontend atual.

CREATE TABLE IF NOT EXISTS public.whatsapp_channels (
  id text PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  number text DEFAULT '',
  status text NOT NULL DEFAULT 'disconnected',
  color text NOT NULL DEFAULT '#059669',
  assignee text DEFAULT '',
  leads_count integer NOT NULL DEFAULT 0,
  messages_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS clinic_id uuid,
  ADD COLUMN IF NOT EXISTS contact jsonb,
  ADD COLUMN IF NOT EXISTS channel_id text,
  ADD COLUMN IF NOT EXISTS last_message_time timestamptz,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assignee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS loss_reason text,
  ADD COLUMN IF NOT EXISTS loss_reason_note text;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS clinic_id uuid,
  ADD COLUMN IF NOT EXISTS sender text,
  ADD COLUMN IF NOT EXISTS "timestamp" timestamptz,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_author text;

DO $$
DECLARE
  only_clinic uuid;
BEGIN
  SELECT id INTO only_clinic
  FROM public.clinics
  ORDER BY created_at
  LIMIT 1;

  UPDATE public.whatsapp_channels
  SET clinic_id = only_clinic
  WHERE clinic_id IS NULL;

  UPDATE public.conversations
  SET clinic_id = only_clinic
  WHERE clinic_id IS NULL;

  UPDATE public.messages m
  SET clinic_id = c.clinic_id
  FROM public.conversations c
  WHERE m.clinic_id IS NULL
    AND m.conversation_id = c.id;

  UPDATE public.messages
  SET clinic_id = only_clinic
  WHERE clinic_id IS NULL;

  UPDATE public.conversations
  SET contact = jsonb_build_object(
    'id', coalesce(contact_phone, id::text),
    'name', coalesce(contact_name, contact_phone, 'Contato'),
    'phone', coalesce(contact_phone, ''),
    'company', '',
    'email', '',
    'tags', '[]'::jsonb,
    'status', 'lead',
    'assignee', coalesce(assignee, assigned_to, ''),
    'createdAt', coalesce(created_at, now()),
    'lastActivity', coalesce(last_at, created_at, now()),
    'avatar', upper(left(coalesce(contact_name, 'C'), 2))
  )
  WHERE contact IS NULL;

  UPDATE public.conversations
  SET last_message_time = coalesce(last_message_time, last_at, created_at, now())
  WHERE last_message_time IS NULL;

  UPDATE public.messages
  SET
    sender = coalesce(sender, CASE WHEN direction = 'outbound' THEN 'user' ELSE 'contact' END),
    "timestamp" = coalesce("timestamp", sent_at, now()),
    is_deleted = coalesce(is_deleted, false),
    is_edited = coalesce(is_edited, false)
  WHERE sender IS NULL OR "timestamp" IS NULL;
END
$$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_channels_clinic
  ON public.whatsapp_channels(clinic_id);
CREATE INDEX IF NOT EXISTS idx_conversations_clinic_channel
  ON public.conversations(clinic_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_clinic_conversation
  ON public.messages(clinic_id, conversation_id);

ALTER TABLE public.whatsapp_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_channels_same_clinic ON public.whatsapp_channels;
CREATE POLICY whatsapp_channels_same_clinic ON public.whatsapp_channels
  FOR ALL
  USING (clinic_id = public.auth_clinic_id())
  WITH CHECK (clinic_id = public.auth_clinic_id());

DROP POLICY IF EXISTS conversations_same_clinic ON public.conversations;
CREATE POLICY conversations_same_clinic ON public.conversations
  FOR ALL
  USING (clinic_id = public.auth_clinic_id())
  WITH CHECK (clinic_id = public.auth_clinic_id());

DROP POLICY IF EXISTS messages_same_clinic ON public.messages;
CREATE POLICY messages_same_clinic ON public.messages
  FOR ALL
  USING (clinic_id = public.auth_clinic_id())
  WITH CHECK (clinic_id = public.auth_clinic_id());
