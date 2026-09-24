import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialDb } from '../lib/db';
import { supabase } from '../lib/supabase';

const STATUS_TO_DB: Record<string, string> = {
  pendente: 'pending',
  pago: 'paid',
  atrasado: 'overdue',
  cancelado: 'cancelled',
};

const STATUS_FROM_DB: Record<string, string> = {
  pending: 'pendente',
  paid: 'pago',
  overdue: 'atrasado',
  cancelled: 'cancelado',
  refunded: 'cancelado',
};

const METHOD_TO_DB: Record<string, string> = {
  PIX: 'pix',
  Cartão: 'credit_card',
  Boleto: 'boleto',
  Dinheiro: 'cash',
  Transferência: 'transfer',
  Convênio: 'health_plan',
};

const METHOD_FROM_DB: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão',
  debit_card: 'Cartão',
  boleto: 'Boleto',
  cash: 'Dinheiro',
  transfer: 'Transferência',
  health_plan: 'Convênio',
};

async function getCurrentClinicId() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Usuario nao autenticado.');

  const { data, error } = await supabase
    .from('profiles')
    .select('clinic_id')
    .eq('id', userId)
    .single();

  if (error || !data?.clinic_id) {
    throw new Error('Perfil sem clinica vinculada. Saia e entre novamente.');
  }

  return data.clinic_id as string;
}

const readNoteMeta = (notes: string | null | undefined, key: string) => {
  const match = String(notes ?? '').match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'));
  return match?.[1]?.trim() ?? '';
};

const mapTransaction = (row: any) => ({
  ...row,
  patientName: row.patientName || readNoteMeta(row.notes, 'Paciente/descricao') || row.patients?.full_name || row.description || '',
  patientId: row.patient_id ?? readNoteMeta(row.notes, 'Paciente ID'),
  type: readNoteMeta(row.notes, 'Tipo') || row.type || 'receita',
  service: row.service ?? row.description ?? 'Consulta',
  dueDate: row.dueDate ?? row.due_date ?? '',
  paidDate: row.paidDate ?? row.payment_date ?? '',
  method: METHOD_FROM_DB[row.payment_method] ?? row.method ?? 'PIX',
  status: STATUS_FROM_DB[row.status] ?? row.status ?? 'pendente',
  provider: row.provider ?? '',
  providerStatus: row.provider_status ?? '',
  paymentUrl: row.payment_url ?? row.invoice_url ?? '',
  pixPayload: row.pix_payload ?? '',
  pixQrCodeBase64: row.pix_qr_code_base64 ?? '',
  pixExpiresAt: row.pix_expires_at ?? '',
  sendToPatientPortal: Boolean(row.patient_portal_visible) || (readNoteMeta(row.notes, 'Enviar ao portal do paciente') || '').toLowerCase() === 'sim',
  issueInvoice: (readNoteMeta(row.notes, 'Emissao de NF') || '').toLowerCase() === 'sim',
  invoiceNumber: row.invoice_number ?? readNoteMeta(row.notes, 'Numero da NF'),
  invoiceDocumentUrl: row.invoice_document_url ?? '',
  invoiceStatus: row.invoice_status ?? '',
  invoiceTakerDocument: readNoteMeta(row.notes, 'NF CPF/CNPJ do tomador'),
  invoiceTakerEmail: readNoteMeta(row.notes, 'NF email do tomador'),
  invoiceTakerAddress: readNoteMeta(row.notes, 'NF endereco do tomador'),
  invoiceMunicipality: readNoteMeta(row.notes, 'NF municipio de emissao'),
  invoiceServiceCode: readNoteMeta(row.notes, 'NF codigo de servico'),
  invoiceTaxRate: readNoteMeta(row.notes, 'NF aliquota ISS'),
  invoiceDescription: readNoteMeta(row.notes, 'NF descricao do servico'),
  issueReceipt: (readNoteMeta(row.notes, 'Emissao de comprovante') || '').toLowerCase() === 'sim',
  receiptNumber: row.receipt_number ?? readNoteMeta(row.notes, 'Numero do comprovante'),
  receiptDocumentUrl: row.receipt_document_url ?? '',
  receiptStatus: row.receipt_status ?? '',
  receiptPayerDocument: readNoteMeta(row.notes, 'Comprovante CPF/CNPJ do pagador'),
  receiptPayerEmail: readNoteMeta(row.notes, 'Comprovante email do pagador'),
  receiptPaymentDate: readNoteMeta(row.notes, 'Comprovante data do pagamento'),
  receiptPaymentMethod: readNoteMeta(row.notes, 'Comprovante metodo'),
  receiptReference: readNoteMeta(row.notes, 'Comprovante referencia'),
  receiptIssuer: readNoteMeta(row.notes, 'Comprovante emitente'),
  receiptNotes: readNoteMeta(row.notes, 'Comprovante observacoes'),
});

const toInvoicePayload = async (transaction: any) => {
  const clinicId = await getCurrentClinicId();
  const cleanNotes = String(transaction.notes ?? '')
    .split('\n')
    .filter(line => !/^(Paciente ID|Paciente\/descricao|Enviar ao portal do paciente|Tipo|Emissao de NF|Numero da NF|NF CPF\/CNPJ do tomador|NF email do tomador|NF endereco do tomador|NF municipio de emissao|NF codigo de servico|NF aliquota ISS|NF descricao do servico|Emissao de comprovante|Numero do comprovante|Comprovante CPF\/CNPJ do pagador|Comprovante email do pagador|Comprovante data do pagamento|Comprovante metodo|Comprovante referencia|Comprovante emitente|Comprovante observacoes):/i.test(line.trim()))
    .join('\n')
    .trim();
  return {
    clinic_id: clinicId,
    description: transaction.service || transaction.patientName || 'Receita',
    amount: Number(transaction.amount ?? 0),
    status: STATUS_TO_DB[transaction.status] ?? transaction.status ?? 'pending',
    payment_method: METHOD_TO_DB[transaction.method] ?? transaction.method ?? 'pix',
    due_date: transaction.dueDate || null,
    payment_date: transaction.paidDate || null,
    notes: [
      cleanNotes,
      transaction.patientId ? `Paciente ID: ${transaction.patientId}` : '',
      transaction.patientName ? `Paciente/descricao: ${transaction.patientName}` : '',
      transaction.sendToPatientPortal ? 'Enviar ao portal do paciente: sim' : '',
      transaction.type ? `Tipo: ${transaction.type}` : '',
      transaction.issueInvoice ? 'Emissao de NF: sim' : 'Emissao de NF: nao',
      transaction.invoiceNumber ? `Numero da NF: ${transaction.invoiceNumber}` : '',
      transaction.invoiceTakerDocument ? `NF CPF/CNPJ do tomador: ${transaction.invoiceTakerDocument}` : '',
      transaction.invoiceTakerEmail ? `NF email do tomador: ${transaction.invoiceTakerEmail}` : '',
      transaction.invoiceTakerAddress ? `NF endereco do tomador: ${transaction.invoiceTakerAddress}` : '',
      transaction.invoiceMunicipality ? `NF municipio de emissao: ${transaction.invoiceMunicipality}` : '',
      transaction.invoiceServiceCode ? `NF codigo de servico: ${transaction.invoiceServiceCode}` : '',
      transaction.invoiceTaxRate ? `NF aliquota ISS: ${transaction.invoiceTaxRate}` : '',
      transaction.invoiceDescription ? `NF descricao do servico: ${transaction.invoiceDescription}` : '',
      transaction.issueReceipt ? 'Emissao de comprovante: sim' : 'Emissao de comprovante: nao',
      transaction.receiptNumber ? `Numero do comprovante: ${transaction.receiptNumber}` : '',
      transaction.receiptPayerDocument ? `Comprovante CPF/CNPJ do pagador: ${transaction.receiptPayerDocument}` : '',
      transaction.receiptPayerEmail ? `Comprovante email do pagador: ${transaction.receiptPayerEmail}` : '',
      transaction.receiptPaymentDate ? `Comprovante data do pagamento: ${transaction.receiptPaymentDate}` : '',
      transaction.receiptPaymentMethod ? `Comprovante metodo: ${transaction.receiptPaymentMethod}` : '',
      transaction.receiptReference ? `Comprovante referencia: ${transaction.receiptReference}` : '',
      transaction.receiptIssuer ? `Comprovante emitente: ${transaction.receiptIssuer}` : '',
      transaction.receiptNotes ? `Comprovante observacoes: ${transaction.receiptNotes}` : '',
    ].filter(Boolean).join('\n') || null,
    patient_portal_visible: Boolean(transaction.sendToPatientPortal),
    invoice_number: transaction.invoiceNumber || null,
    invoice_status: transaction.issueInvoice ? 'requested' : null,
    receipt_number: transaction.receiptNumber || null,
    receipt_status: transaction.issueReceipt ? 'requested' : null,
  };
};

const withoutProductionColumns = (payload: any) => {
  const {
    patient_portal_visible,
    invoice_number,
    invoice_status,
    receipt_number,
    receipt_status,
    ...legacyPayload
  } = payload;
  return legacyPayload;
};

const isSchemaCacheError = (error: any) =>
  /schema cache|column .* does not exist|Could not find/i.test(String(error?.message ?? error ?? ''));

export function useFinancial() {
  return useQuery({
    queryKey: ['financial'],
    queryFn: async () => {
      const clinicId = await getCurrentClinicId();
      const { data, error } = await supabase
        .from('invoices')
        .select('*, patients(full_name)')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('Erro ao carregar financeiro com vínculo de pacientes:', error.message);
        const fallback = await supabase
          .from('invoices')
          .select('*')
          .eq('clinic_id', clinicId)
          .order('created_at', { ascending: false });
        if (fallback.error) {
          console.warn('Erro ao carregar financeiro:', fallback.error.message);
          return [];
        }
        return (fallback.data ?? []).map(mapTransaction);
      }
      return (data ?? []).map(mapTransaction);
    },
    staleTime: 30_000,
  });
}
export function useInsertTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transaction: any) => {
      const payload = await toInvoicePayload(transaction);
      const { data, error } = await financialDb.create(payload);
      if (!error) return data;
      if (!isSchemaCacheError(error)) throw new Error(error.message);
      const fallback = await financialDb.create(withoutProductionColumns(payload));
      if (fallback.error) throw new Error(fallback.error.message);
      return fallback.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financial'] }),
  });
}
export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { clinic_id, ...payload } = await toInvoicePayload(data);
      const { error } = await supabase.from('invoices').update(payload).eq('id', id);
      if (!error) return;
      if (!isSchemaCacheError(error)) throw new Error(error.message);
      const fallback = await supabase.from('invoices').update(withoutProductionColumns(payload)).eq('id', id);
      if (fallback.error) throw new Error(fallback.error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financial'] }),
  });
}
export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await financialDb.delete(id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financial'] }),
  });
}
