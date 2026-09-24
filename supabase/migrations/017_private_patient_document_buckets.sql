-- Nucleus - buckets privados e isolamento de arquivos por clinica/paciente.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES
  (
    'patient-attachments',
    'patient-attachments',
    FALSE,
    26214400,
    ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'medical-documents',
    'medical-documents',
    FALSE,
    26214400,
    ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  )
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS patient_files_staff_select ON storage.objects;
CREATE POLICY patient_files_staff_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('patient-attachments', 'medical-documents')
    AND (storage.foldername(name))[1] IN (
      SELECT p.clinic_id::TEXT
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.active = TRUE
    )
  );

DROP POLICY IF EXISTS patient_files_staff_insert ON storage.objects;
CREATE POLICY patient_files_staff_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('patient-attachments', 'medical-documents')
    AND (storage.foldername(name))[1] IN (
      SELECT p.clinic_id::TEXT
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.active = TRUE
    )
  );

DROP POLICY IF EXISTS patient_files_staff_update ON storage.objects;
CREATE POLICY patient_files_staff_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('patient-attachments', 'medical-documents')
    AND (storage.foldername(name))[1] IN (
      SELECT p.clinic_id::TEXT
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.active = TRUE
    )
  )
  WITH CHECK (
    bucket_id IN ('patient-attachments', 'medical-documents')
    AND (storage.foldername(name))[1] IN (
      SELECT p.clinic_id::TEXT
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.active = TRUE
    )
  );

DROP POLICY IF EXISTS patient_files_staff_delete ON storage.objects;
CREATE POLICY patient_files_staff_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('patient-attachments', 'medical-documents')
    AND (storage.foldername(name))[1] IN (
      SELECT p.clinic_id::TEXT
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.active = TRUE
    )
  );

DROP POLICY IF EXISTS medical_documents_portal_select ON storage.objects;
CREATE POLICY medical_documents_portal_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'medical-documents'
    AND (storage.foldername(name))[1] = public.current_portal_clinic_id()::TEXT
    AND (storage.foldername(name))[2] = public.current_portal_patient_id()::TEXT
  );
