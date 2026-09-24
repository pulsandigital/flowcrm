-- NUCLEUS - RLS write policies
-- Makes INSERT/UPDATE checks explicit for tenant-scoped tables.

CREATE OR REPLACE FUNCTION auth_clinic_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT clinic_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "clinic_isolation" ON clinics;
CREATE POLICY "clinic_isolation" ON clinics
  FOR ALL
  USING (id = auth_clinic_id())
  WITH CHECK (id = auth_clinic_id());

DROP POLICY IF EXISTS "profiles_same_clinic" ON profiles;
CREATE POLICY "profiles_same_clinic" ON profiles
  FOR ALL
  USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

DROP POLICY IF EXISTS "leads_same_clinic" ON leads;
CREATE POLICY "leads_same_clinic" ON leads
  FOR ALL
  USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

DROP POLICY IF EXISTS "conversations_same_clinic" ON conversations;
CREATE POLICY "conversations_same_clinic" ON conversations
  FOR ALL
  USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

DROP POLICY IF EXISTS "messages_same_clinic" ON messages;
CREATE POLICY "messages_same_clinic" ON messages
  FOR ALL
  USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

DROP POLICY IF EXISTS "patients_same_clinic" ON patients;
CREATE POLICY "patients_same_clinic" ON patients
  FOR ALL
  USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

DROP POLICY IF EXISTS "records_clinical_staff" ON medical_records;
CREATE POLICY "records_clinical_staff" ON medical_records
  FOR ALL
  USING (
    clinic_id = auth_clinic_id()
    AND auth_role() IN ('admin','doctor','nurse')
  )
  WITH CHECK (
    clinic_id = auth_clinic_id()
    AND auth_role() IN ('admin','doctor','nurse')
  );

DROP POLICY IF EXISTS "appointments_same_clinic" ON appointments;
CREATE POLICY "appointments_same_clinic" ON appointments
  FOR ALL
  USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

DROP POLICY IF EXISTS "tasks_clinic_or_assigned" ON tasks;
CREATE POLICY "tasks_clinic_or_assigned" ON tasks
  FOR ALL
  USING (
    clinic_id = auth_clinic_id()
    AND (
      auth_role() IN ('admin','doctor')
      OR assigned_to = auth.uid()
      OR created_by = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id = auth_clinic_id()
    AND (
      auth_role() IN ('admin','doctor')
      OR assigned_to = auth.uid()
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "invoices_financial_only" ON invoices;
CREATE POLICY "invoices_financial_only" ON invoices
  FOR ALL
  USING (
    clinic_id = auth_clinic_id()
    AND auth_role() IN ('admin','financial')
  )
  WITH CHECK (
    clinic_id = auth_clinic_id()
    AND auth_role() IN ('admin','financial')
  );

DROP POLICY IF EXISTS "campaigns_same_clinic" ON campaigns;
CREATE POLICY "campaigns_same_clinic" ON campaigns
  FOR ALL
  USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

DROP POLICY IF EXISTS "documents_clinical_staff" ON patient_documents;
CREATE POLICY "documents_clinical_staff" ON patient_documents
  FOR ALL
  USING (
    clinic_id = auth_clinic_id()
    AND auth_role() IN ('admin','doctor','nurse')
  )
  WITH CHECK (
    clinic_id = auth_clinic_id()
    AND auth_role() IN ('admin','doctor','nurse')
  );
