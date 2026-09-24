import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Edit2,
  FileText,
  HelpCircle,
  Landmark,
  Loader2,
  Plus,
  Receipt,
  Save,
  Search,
  TrendingDown,
  TrendingUp,
  Trash2,
  X,
} from 'lucide-react';
import { useFinancial, useInsertTransaction, useUpdateTransaction, useDeleteTransaction } from '../hooks/useFinancial';
import { usePatients } from '../hooks/usePatients';
import { supabase } from '../lib/supabase';

const METHODS = ['PIX', 'Cartão', 'Boleto', 'Dinheiro', 'Transferência', 'Convênio'];
const SERVICES = ['Consulta', 'Retorno', 'Sessão', 'Avaliação', 'Pacote', 'Exame', 'Procedimento', 'Outro'];

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pendente: { label: 'Pendente', cls: 'badge-gold' },
  pago: { label: 'Pago', cls: 'badge-green' },
  atrasado: { label: 'Atrasado', cls: 'badge bg-red-50 text-red-600' },
  cancelado: { label: 'Cancelado', cls: 'badge-gray' },
};

const BLANK = {
  patientName: '',
  type: 'receita',
  service: 'Consulta',
  amount: '',
  dueDate: '',
  paidDate: '',
  status: 'pendente',
  method: 'PIX',
  notes: '',
  patientId: '',
  sendToPatientPortal: true,
  issueInvoice: false,
  invoiceNumber: '',
  invoiceTakerDocument: '',
  invoiceTakerEmail: '',
  invoiceTakerAddress: '',
  invoiceMunicipality: '',
  invoiceServiceCode: '',
  invoiceTaxRate: '',
  invoiceDescription: '',
  issueReceipt: false,
  receiptNumber: '',
  receiptPayerDocument: '',
  receiptPayerEmail: '',
  receiptPaymentDate: '',
  receiptPaymentMethod: 'Cartão',
  receiptReference: '',
  receiptIssuer: '',
  receiptNotes: '',
};

type FinanceTab = 'bank_accounts' | 'receivable' | 'payable' | 'charges' | 'invoices' | 'receipts';

function TransactionForm({ initial, onSave, onClose, loading, error, isEdit, patients = [] }: any) {
  const [f, setF] = useState(initial);
  const s = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const selectPatient = (patientId: string) => {
    const patient = patients.find((item: any) => item.id === patientId);
    setF((p: any) => ({
      ...p,
      patientId,
      patientName: patient?.name ?? p.patientName,
      patientEmail: patient?.email ?? '',
      patientPhone: patient?.phone ?? '',
      professional: patient?.professional ?? '',
      invoiceTakerEmail: patient?.email ?? p.invoiceTakerEmail ?? '',
      receiptPayerEmail: patient?.email ?? p.receiptPayerEmail ?? '',
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{isEdit ? 'Editar Cobrança' : 'Nova Cobrança'}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg" type="button">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div>
            <label className="label">Tipo</label>
            <div className="flex gap-2">
              {[
                { id: 'receita', label: 'Receita', icon: DollarSign },
                { id: 'despesa', label: 'Despesa', icon: CreditCard },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => s('type', id)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all inline-flex items-center justify-center gap-2 ${
                    f.type === id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Paciente cadastrado</label>
            <select className="input" value={f.patientId ?? ''} onChange={e => selectPatient(e.target.value)}>
              <option value="">Selecionar paciente...</option>
              {patients.map((patient: any) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} {patient.phone ? `- ${patient.phone}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Paciente / Descrição *</label>
            <input className="input" value={f.patientName} onChange={e => s('patientName', e.target.value)} placeholder="Ex: Sofia Lima" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Serviço</label>
              <select className="input" value={f.service} onChange={e => s('service', e.target.value)}>
                {SERVICES.map(sv => (
                  <option key={sv}>{sv}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Valor (R$) *</label>
              <input type="number" min={0} step={0.01} className="input" value={f.amount} onChange={e => s('amount', e.target.value)} placeholder="0,00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Vencimento</label>
              <input type="date" className="input" value={f.dueDate} onChange={e => s('dueDate', e.target.value)} />
            </div>
            <div>
              <label className="label">Data de pagamento</label>
              <input type="date" className="input" value={f.paidDate} onChange={e => s('paidDate', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Método</label>
              <select className="input" value={f.method} onChange={e => s('method', e.target.value)}>
                {METHODS.map(m => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={f.status} onChange={e => s('status', e.target.value)}>
                {['pendente', 'pago', 'atrasado', 'cancelado'].map(st => (
                  <option key={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea className="input resize-none" rows={2} value={f.notes} onChange={e => s('notes', e.target.value)} />
          </div>

          {f.type === 'receita' && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileText size={16} className="text-primary-600" />
                <h3 className="text-sm font-semibold text-slate-900">Documentos fiscais</h3>
              </div>
              <div className="space-y-3">
                <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-primary-600"
                    checked={Boolean(f.issueInvoice)}
                    onChange={e => s('issueInvoice', e.target.checked)}
                  />
                  <span className="flex-1">
                    <strong className="block">Emitir NF</strong>
                    <span className="text-xs text-slate-500">Marque quando a nota fiscal for emitida pela clínica/profissional.</span>
                  </span>
                </label>
                {f.issueInvoice && (
                  <div className="space-y-3 rounded-2xl border border-primary-100 bg-primary-50/40 p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Número da NF</label>
                        <input className="input" value={f.invoiceNumber ?? ''} onChange={e => s('invoiceNumber', e.target.value)} placeholder="Ex: NF-2026-0001" />
                      </div>
                      <div>
                        <label className="label">CPF/CNPJ do tomador</label>
                        <input className="input" value={f.invoiceTakerDocument ?? ''} onChange={e => s('invoiceTakerDocument', e.target.value)} placeholder="CPF ou CNPJ" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">E-mail do tomador</label>
                        <input className="input" value={f.invoiceTakerEmail ?? ''} onChange={e => s('invoiceTakerEmail', e.target.value)} placeholder="email@exemplo.com" />
                      </div>
                      <div>
                        <label className="label">Município de emissão</label>
                        <input className="input" value={f.invoiceMunicipality ?? ''} onChange={e => s('invoiceMunicipality', e.target.value)} placeholder="Ex: Fortaleza, CE" />
                      </div>
                    </div>
                    <div>
                      <label className="label">Endereço do tomador</label>
                      <input className="input" value={f.invoiceTakerAddress ?? ''} onChange={e => s('invoiceTakerAddress', e.target.value)} placeholder="Rua, número, bairro, cidade/UF" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Código de serviço</label>
                        <input className="input" value={f.invoiceServiceCode ?? ''} onChange={e => s('invoiceServiceCode', e.target.value)} placeholder="Ex: 04.03" />
                      </div>
                      <div>
                        <label className="label">Alíquota ISS (%)</label>
                        <input className="input" value={f.invoiceTaxRate ?? ''} onChange={e => s('invoiceTaxRate', e.target.value)} placeholder="Ex: 2,00" />
                      </div>
                    </div>
                    <div>
                      <label className="label">Descrição do serviço na NF</label>
                      <textarea className="input resize-none" rows={2} value={f.invoiceDescription ?? ''} onChange={e => s('invoiceDescription', e.target.value)} placeholder="Ex: Atendimento clínico/profissional de saúde" />
                    </div>
                  </div>
                )}

                <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-primary-600"
                    checked={Boolean(f.issueReceipt)}
                    onChange={e => s('issueReceipt', e.target.checked)}
                  />
                  <span className="flex-1">
                    <strong className="block">Emitir comprovante</strong>
                    <span className="text-xs text-slate-500">Gera o registro de comprovante para entregar ao paciente.</span>
                  </span>
                </label>
                {f.issueReceipt && (
                  <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Número do comprovante</label>
                        <input className="input" value={f.receiptNumber ?? ''} onChange={e => s('receiptNumber', e.target.value)} placeholder="Ex: COMP-2026-0001" />
                      </div>
                      <div>
                        <label className="label">Data do pagamento</label>
                        <input type="date" className="input" value={f.receiptPaymentDate ?? f.paidDate ?? ''} onChange={e => s('receiptPaymentDate', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">CPF/CNPJ do pagador</label>
                        <input className="input" value={f.receiptPayerDocument ?? ''} onChange={e => s('receiptPayerDocument', e.target.value)} placeholder="CPF ou CNPJ" />
                      </div>
                      <div>
                        <label className="label">E-mail do pagador</label>
                        <input className="input" value={f.receiptPayerEmail ?? ''} onChange={e => s('receiptPayerEmail', e.target.value)} placeholder="email@exemplo.com" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Forma de pagamento</label>
                        <select className="input" value={f.receiptPaymentMethod ?? f.method ?? 'PIX'} onChange={e => s('receiptPaymentMethod', e.target.value)}>
                          {METHODS.map(method => <option key={method}>{method}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Emitente / responsável</label>
                        <input className="input" value={f.receiptIssuer ?? ''} onChange={e => s('receiptIssuer', e.target.value)} placeholder="Clínica ou profissional" />
                      </div>
                    </div>
                    <div>
                      <label className="label">Referência do pagamento</label>
                      <input className="input" value={f.receiptReference ?? ''} onChange={e => s('receiptReference', e.target.value)} placeholder="Ex: Consulta de retorno - 26/05/2026" />
                    </div>
                    <div>
                      <label className="label">Observações do comprovante</label>
                      <textarea className="input resize-none" rows={2} value={f.receiptNotes ?? ''} onChange={e => s('receiptNotes', e.target.value)} placeholder="Ex: Valor recebido referente ao atendimento descrito." />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {f.type === 'receita' && (
            <label className="flex items-start gap-3 rounded-xl border border-primary-100 bg-primary-50 p-3 text-sm text-primary-800">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-primary-600"
                checked={Boolean(f.sendToPatientPortal)}
                onChange={e => s('sendToPatientPortal', e.target.checked)}
              />
              <span>
                <strong className="block">Enviar cobrança ao Portal do Paciente</strong>
                <span className="text-xs text-primary-700/80">O paciente verá essa cobrança na aba Pagamentos para pagar por PIX ou cartão.</span>
              </span>
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary" type="button">Cancelar</button>
          <button onClick={() => onSave(f)} disabled={loading || !f.patientName.trim() || !f.amount} className="btn-primary min-w-[120px] justify-center" type="button">
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Salvando...
              </>
            ) : isEdit ? 'Salvar' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Finance() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: transactions = [], isLoading, isError } = useFinancial();
  const { data: patients = [] } = usePatients();
  const insertMut = useInsertTransaction();
  const updateMut = useUpdateTransaction();
  const deleteMut = useDeleteTransaction();
  const routeTab: FinanceTab = location.pathname.includes('/bank-accounts')
    ? 'bank_accounts'
    : location.pathname.includes('/receivable')
      ? 'receivable'
      : location.pathname.includes('/payable')
        ? 'payable'
        : 'charges';
  const [activeTab, setActiveTab] = useState<FinanceTab>(routeTab);
  const [bankAccounts, setBankAccounts] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('nucleus_bank_accounts') || '[]');
    } catch {
      return [];
    }
  });
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank: '461 - Asaas IP',
    accountName: '',
    holder: '',
    agency: '',
    accountNumber: '',
    digit: '',
    active: true,
    notes: '',
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [formError, setFormError] = useState('');
  const [paymentActionId, setPaymentActionId] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [pixDetails, setPixDetails] = useState<any | null>(null);

  useEffect(() => {
    setActiveTab(routeTab);
  }, [routeTab]);

  const filtered = transactions.filter((t: any) =>
    (t.patientName ?? '').toLowerCase().includes(search.toLowerCase()) &&
    (statusFilter === 'todos' || t.status === statusFilter)
  );

  const receitas = transactions.filter((t: any) => t.type === 'receita');
  const fiscalItems = useMemo(() => receitas.filter((t: any) => t.status !== 'cancelado'), [receitas]);
  const paid = receitas.filter((t: any) => t.status === 'pago').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  const pending = receitas.filter((t: any) => t.status === 'pendente').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  const overdue = receitas.filter((t: any) => t.status === 'atrasado').reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const fmt = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const setFinanceTab = (tab: FinanceTab) => {
    setActiveTab(tab);
    const pathByTab: Record<FinanceTab, string> = {
      bank_accounts: '/finance/bank-accounts',
      receivable: '/finance/receivable',
      payable: '/finance/payable',
      charges: '/finance',
      invoices: '/finance',
      receipts: '/finance',
    };
    navigate(pathByTab[tab]);
  };

  const saveBankAccount = () => {
    const account = {
      id: `bank-${Date.now()}`,
      ...bankForm,
      createdAt: new Date().toISOString(),
    };
    const next = [account, ...bankAccounts];
    setBankAccounts(next);
    localStorage.setItem('nucleus_bank_accounts', JSON.stringify(next));
    setShowBankForm(false);
    setBankForm({
      bank: '461 - Asaas IP',
      accountName: '',
      holder: '',
      agency: '',
      accountNumber: '',
      digit: '',
      active: true,
      notes: '',
    });
  };

  const sendChargeToPatientPortal = (form: any, id?: string) => {
    if (!form.sendToPatientPortal || form.type !== 'receita') return;
    const charge = {
      id: id || `charge-${Date.now()}`,
      patientId: form.patientId || '',
      patientName: form.patientName,
      title: form.service || 'Consulta',
      dueDate: form.dueDate || new Date().toISOString().split('T')[0],
      amount: Number(form.amount ?? 0),
      status: form.status === 'pago' ? 'paid' : 'pending',
      method: form.method || 'PIX',
      professional: form.professional || '',
      notes: form.notes || '',
      createdAt: new Date().toISOString(),
    };
    const key = 'nucleus_patient_portal_charges';
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([charge, ...current.filter((item: any) => item.id !== charge.id)].slice(0, 100)));
    window.dispatchEvent(new CustomEvent('nucleus:patient-charge-created', { detail: charge }));
  };

  const handleInsert = async (form: any) => {
    setFormError('');
    try {
      const result: any = await insertMut.mutateAsync({ ...form, amount: Number(form.amount) });
      sendChargeToPatientPortal(form, result?.id);
      setShowForm(false);
    } catch (e: any) {
      setFormError(e.message ?? 'Erro ao salvar.');
    }
  };

  const handleUpdate = async (form: any) => {
    if (!editing) return;
    setFormError('');
    try {
      await updateMut.mutateAsync({ id: editing.id, data: { ...form, amount: Number(form.amount) } });
      setEditing(null);
    } catch (e: any) {
      setFormError(e.message ?? 'Erro ao salvar.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      setDeleting(null);
    } catch {
      // The mutation hook already exposes the error state in the cache.
    }
  };

  const markPaid = async (t: any) => {
    await updateMut.mutateAsync({ id: t.id, data: { ...t, status: 'pago', paidDate: new Date().toISOString().split('T')[0] } });
  };

  const markInvoiceIssued = async (t: any) => {
    const invoiceNumber = t.invoiceNumber || `NF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    await updateMut.mutateAsync({ id: t.id, data: { ...t, issueInvoice: true, invoiceNumber } });
  };

  const markReceiptIssued = async (t: any) => {
    const receiptNumber = t.receiptNumber || `COMP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    await updateMut.mutateAsync({ id: t.id, data: { ...t, issueReceipt: true, receiptNumber } });
  };

  const generateGatewayPayment = async (t: any, billingType: 'PIX' | 'CREDIT_CARD') => {
    setPaymentError('');
    setPaymentActionId(`${t.id}:${billingType}`);
    try {
      const response = await supabase.functions.invoke('asaas-payment', {
        body: { invoiceId: t.id, billingType },
      });
      if (response.error) throw response.error;
      if ((response.data as any)?.ok === false) {
        throw new Error((response.data as any)?.error || 'Não foi possível gerar a cobrança no gateway.');
      }
      await queryClient.invalidateQueries({ queryKey: ['financial'] });
    } catch (error: any) {
      setPaymentError(error?.message ?? 'Não foi possível gerar a cobrança no gateway.');
    } finally {
      setPaymentActionId('');
    }
  };

  const tabs = [
    { id: 'bank_accounts' as const, label: 'Contas bancárias', icon: Landmark, count: bankAccounts.length },
    { id: 'receivable' as const, label: 'Contas a receber', icon: ArrowDownCircle, count: receitas.filter((t: any) => t.type === 'receita').length },
    { id: 'payable' as const, label: 'Contas a pagar', icon: ArrowUpCircle, count: transactions.filter((t: any) => t.type === 'despesa').length },
    { id: 'charges' as const, label: 'Cobranças', icon: DollarSign, count: transactions.length },
    { id: 'invoices' as const, label: 'Emissão de NF', icon: FileText, count: receitas.filter((t: any) => t.issueInvoice).length },
    { id: 'receipts' as const, label: 'Comprovantes', icon: Receipt, count: receitas.filter((t: any) => t.issueReceipt).length },
  ];

  const metrics = [
    { label: 'Receita do Mês', value: fmt(paid + pending), icon: DollarSign, color: 'text-primary-600 bg-primary-50', trend: '+12%', up: true },
    { label: 'Recebido', value: fmt(paid), icon: CheckCircle2, color: 'text-teal-600 bg-teal-50', trend: `${paid + pending > 0 ? Math.round((paid / (paid + pending)) * 100) : 0}%`, up: true },
    { label: 'Pendente', value: fmt(pending), icon: AlertCircle, color: 'text-gold-600 bg-gold-50', trend: '', up: true },
    { label: 'Inadimplência', value: fmt(overdue), icon: TrendingDown, color: 'text-red-600 bg-red-50', trend: '', up: false },
  ];

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-sm text-slate-500">Nucleus Finance - Gestão Financeira</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => { setShowForm(true); setFormError(''); }} type="button">
          <Plus size={14} />
          Nova Cobrança
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFinanceTab(id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === id ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon size={16} />
            {label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'bank_accounts' && (
        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="grid gap-6 bg-gradient-to-r from-teal-800 to-cyan-800 p-6 text-white lg:grid-cols-[320px_1fr]">
              <div className="rounded-3xl bg-white/10 p-5">
                <div className="mb-5 flex h-56 items-center justify-center rounded-2xl bg-cyan-200/20 text-center">
                  <div>
                    <CreditCard size={52} className="mx-auto mb-3 text-cyan-100" />
                    <div className="text-sm font-semibold">PIX, cartão e boleto</div>
                    <div className="mt-1 text-xs text-cyan-100/80">Recebimento conectado ao Asaas</div>
                  </div>
                </div>
                <div className="rounded-2xl bg-cyan-300/25 p-4">
                  <div className="font-semibold">Taxas de antecipação de cartão</div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="block text-cyan-100">À vista</span><strong className="text-xl">1,25%</strong> ao mês</div>
                    <div><span className="block text-cyan-100">Parcelado</span><strong className="text-xl">1,70%</strong> ao mês</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <h2 className="text-2xl font-bold text-cyan-200">Receba seus pagamentos de forma simples, rápida e segura!</h2>
                <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/90">
                  Com a integração do Nucleus com o Asaas, você pode cadastrar sua conta bancária on-line e enviar cobranças diretamente para seus pacientes.
                </p>
                <div className="mt-6 space-y-3 text-sm font-semibold">
                  <div className="flex items-center gap-3"><CheckCircle2 size={18} className="text-cyan-200" /> Enviar links de pagamento para pacientes</div>
                  <div className="flex items-center gap-3"><CheckCircle2 size={18} className="text-cyan-200" /> Receber valores de forma automática e segura</div>
                  <div className="flex items-center gap-3"><CheckCircle2 size={18} className="text-cyan-200" /> Conciliar PIX, cartão, boleto e comprovantes</div>
                </div>
                <div className="mt-6 grid gap-3 border-t border-white/20 pt-5 text-sm sm:grid-cols-2">
                  <div><strong>PIX:</strong> R$ 1,99 por cobrança recebida</div>
                  <div><strong>Boleto:</strong> R$ 1,99 por cobrança recebida</div>
                  <div><strong>Cartão:</strong> 2,99% + R$ 0,29 à vista</div>
                  <div><strong>Parcelado:</strong> até 4,89% + R$ 0,29</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" type="button" onClick={() => setShowBankForm(true)}>
              <Landmark size={16} />
              Criar conta Asaas
            </button>
            <button className="btn-secondary" type="button">
              <HelpCircle size={16} />
              Como usar a conta Asaas
            </button>
            <button className="btn-secondary" type="button" onClick={() => setShowBankForm(true)}>
              <Plus size={16} />
              Incluir outra conta
            </button>
          </div>

          {showBankForm && (
            <div className="card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Landmark size={18} className="text-primary-600" />
                <h2 className="section-title">Cadastrar conta bancária</h2>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <select className="input" value={bankForm.bank} onChange={e => setBankForm(prev => ({ ...prev, bank: e.target.value }))}>
                  <option>461 - Asaas IP</option>
                  <option>001 - Banco do Brasil</option>
                  <option>033 - Santander</option>
                  <option>104 - Caixa Econômica Federal</option>
                  <option>237 - Bradesco</option>
                  <option>341 - Itau</option>
                  <option>260 - Nu Pagamentos</option>
                  <option>336 - C6 Bank</option>
                </select>
                <input className="input" value={bankForm.accountName} onChange={e => setBankForm(prev => ({ ...prev, accountName: e.target.value }))} placeholder="Nome da conta" />
                <input className="input" value={bankForm.holder} onChange={e => setBankForm(prev => ({ ...prev, holder: e.target.value }))} placeholder="Titular" />
                <div className="grid grid-cols-3 gap-3">
                  <input className="input" value={bankForm.agency} onChange={e => setBankForm(prev => ({ ...prev, agency: e.target.value }))} placeholder="Agência" />
                  <input className="input" value={bankForm.accountNumber} onChange={e => setBankForm(prev => ({ ...prev, accountNumber: e.target.value }))} placeholder="Número da conta" />
                  <input className="input" value={bankForm.digit} onChange={e => setBankForm(prev => ({ ...prev, digit: e.target.value }))} placeholder="Dígito" />
                </div>
                <textarea className="input resize-none lg:col-span-2" rows={3} value={bankForm.notes} onChange={e => setBankForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Observação" />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={bankForm.active} onChange={e => setBankForm(prev => ({ ...prev, active: e.target.checked }))} />
                  Conta ativa
                </label>
                <button className="btn-primary" type="button" onClick={saveBankAccount} disabled={!bankForm.accountName.trim() || !bankForm.holder.trim()}>
                  <Save size={16} />
                  Salvar
                </button>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>{['Titular', 'Nome da conta', 'Banco', 'Dados da conta', 'Status'].map(h => <th key={h} className="table-head px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody>
                {(bankAccounts.length ? bankAccounts : [{
                  id: 'demo-asaas-account',
                  holder: 'Conta Asaas do profissional',
                  accountName: 'Conta Asaas - Nucleus',
                  bank: '461 - Asaas IP',
                  agency: '0001',
                  accountNumber: '0000000',
                  digit: '0',
                  active: true,
                }]).map((account: any) => (
                  <tr key={account.id} className="table-row">
                    <td className="table-cell font-semibold text-slate-900">{account.holder}</td>
                    <td className="table-cell">{account.accountName}</td>
                    <td className="table-cell">{account.bank}</td>
                    <td className="table-cell">{account.agency || '----'} - {account.accountNumber || '----'}-{account.digit || '-'}</td>
                    <td className="table-cell"><span className={account.active ? 'badge badge-green' : 'badge badge-gray'}>{account.active ? 'Ativa' : 'Inativa'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'receivable' && (
        <FinanceLedger
          title="Contas a receber"
          description="Valores que devem entrar na clínica ou para o profissional."
          items={receitas}
          fmt={fmt}
          empty="Nenhuma conta a receber cadastrada."
          onNew={() => { setShowForm(true); setFormError(''); }}
        />
      )}

      {activeTab === 'payable' && (
        <FinanceLedger
          title="Contas a pagar"
          description="Despesas, fornecedores e pagamentos programados."
          items={transactions.filter((t: any) => t.type === 'despesa')}
          fmt={fmt}
          empty="Nenhuma conta a pagar cadastrada."
          onNew={() => { setShowForm(true); setFormError(''); }}
        />
      )}

      {activeTab === 'charges' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map(({ label, value, icon: Icon, color, trend, up }) => (
              <div key={label} className="card p-5">
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
                  <Icon size={18} />
                </div>
                <div className="text-xl font-bold text-slate-900">{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                {trend && (
                  <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${up ? 'text-teal-600' : 'text-red-500'}`}>
                    {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {trend}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Buscar por paciente ou serviço..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1">
              {['todos', 'pendente', 'pago', 'atrasado'].map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    statusFilter === status ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {status === 'todos' ? 'Todos' : STATUS_CFG[status]?.label ?? status}
                </button>
              ))}
            </div>
          </div>

          {isError && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={16} />
              Erro ao carregar financeiro.
            </div>
          )}

          {paymentError && (
            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <AlertCircle size={16} />
              {paymentError}
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="section-title">Cobranças e Transações</h2>
            </div>
            {isLoading ? (
              <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                <Loader2 size={28} className="animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <DollarSign size={24} className="text-slate-400" />
                </div>
                <p className="font-medium text-slate-700 mb-1">Nenhuma transação encontrada</p>
                <button className="btn-primary btn-sm mt-3" onClick={() => setShowForm(true)} type="button">
                  <Plus size={14} />
                  Nova Cobrança
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50/50">
                  <tr>{['Paciente', 'Serviço', 'Valor', 'Vencimento', 'Método', 'Status', 'Documentos', ''].map(h => <th key={h} className="table-head py-3 px-4 text-left">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map((t: any) => (
                    <tr key={t.id} className="table-row">
                      <td className="table-cell">
                        <div className="font-medium text-slate-800">{t.patientName}</div>
                        <div className="text-xs text-slate-400 capitalize">{t.type}</div>
                      </td>
                      <td className="table-cell"><span className="text-slate-600">{t.service}</span></td>
                      <td className="table-cell"><span className="font-bold text-slate-900">{fmt(Number(t.amount))}</span></td>
                      <td className="table-cell"><span className="text-slate-600">{t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-BR') : '-'}</span></td>
                      <td className="table-cell"><span className="badge badge-gray">{t.method}</span></td>
                      <td className="table-cell">
                        <span className={`badge ${STATUS_CFG[t.status]?.cls ?? 'badge-gray'}`}>{STATUS_CFG[t.status]?.label ?? t.status}</span>
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            onClick={() => markInvoiceIssued(t)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${t.issueInvoice ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            title={t.invoiceNumber || 'Emitir NF'}
                            type="button"
                          >
                            <FileText size={12} />
                            {t.issueInvoice ? 'NF emitida' : 'Emitir NF'}
                          </button>
                          <button
                            onClick={() => markReceiptIssued(t)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${t.issueReceipt ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            title={t.receiptNumber || 'Emitir comprovante'}
                            type="button"
                          >
                            <Receipt size={12} />
                            {t.issueReceipt ? 'Comprovante' : 'Emitir comp.'}
                          </button>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          {t.type === 'receita' && t.status !== 'pago' && (
                            <>
                              <button
                                onClick={() => generateGatewayPayment(t, 'PIX')}
                                disabled={paymentActionId === `${t.id}:PIX`}
                                title="Gerar PIX pelo Asaas"
                                className="px-2 py-1 text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors font-medium disabled:opacity-60"
                                type="button"
                              >
                                {paymentActionId === `${t.id}:PIX` ? 'Gerando...' : 'Gerar PIX'}
                              </button>
                              <button
                                onClick={() => generateGatewayPayment(t, 'CREDIT_CARD')}
                                disabled={paymentActionId === `${t.id}:CREDIT_CARD`}
                                title="Gerar pagamento por cartão"
                                className="px-2 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors font-medium disabled:opacity-60"
                                type="button"
                              >
                                {paymentActionId === `${t.id}:CREDIT_CARD` ? 'Gerando...' : 'Cartao'}
                              </button>
                            </>
                          )}
                          {t.paymentUrl && (
                            <a href={t.paymentUrl} target="_blank" rel="noreferrer" className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors font-medium">
                              Link
                            </a>
                          )}
                          {t.pixPayload && (
                            <button onClick={() => setPixDetails(t)} title="Ver QR Code PIX" className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors font-medium" type="button">
                              QR Pix
                            </button>
                          )}
                          {(t.status === 'pendente' || t.status === 'atrasado') && (
                            <button onClick={() => markPaid(t)} title="Marcar como pago" className="px-2 py-1 text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg transition-colors font-medium" type="button">
                              Recebido
                            </button>
                          )}
                          <button onClick={() => { setEditing(t); setFormError(''); }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" type="button">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => setDeleting(t)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" type="button">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'invoices' && (
        <FiscalList
          title="Emissão de NF"
          description="Controle as notas fiscais que precisam ser emitidas para cada cobrança."
          empty="Nenhuma cobrança disponível para emissão de NF."
          items={fiscalItems}
          fmt={fmt}
          kind="invoice"
          onAction={markInvoiceIssued}
          onEdit={(item: any) => { setEditing(item); setFormError(''); }}
        />
      )}

      {activeTab === 'receipts' && (
        <FiscalList
          title="Comprovantes"
          description="Emita e acompanhe os comprovantes entregues aos pacientes."
          empty="Nenhuma cobrança disponível para emissão de comprovante."
          items={fiscalItems}
          fmt={fmt}
          kind="receipt"
          onAction={markReceiptIssued}
          onEdit={(item: any) => { setEditing(item); setFormError(''); }}
        />
      )}

      {showForm && <TransactionForm initial={BLANK} patients={patients} onSave={handleInsert} onClose={() => setShowForm(false)} loading={insertMut.isPending} error={formError} />}
      {editing && (
        <TransactionForm
          isEdit
          patients={patients}
          initial={{
            patientName: editing.patientName,
            type: editing.type,
            service: editing.service,
            amount: editing.amount,
            dueDate: editing.dueDate,
            paidDate: editing.paidDate,
            status: editing.status,
            method: editing.method,
            notes: editing.notes,
            patientId: editing.patientId ?? '',
            sendToPatientPortal: false,
            issueInvoice: Boolean(editing.issueInvoice),
            invoiceNumber: editing.invoiceNumber ?? '',
            invoiceTakerDocument: editing.invoiceTakerDocument ?? '',
            invoiceTakerEmail: editing.invoiceTakerEmail ?? '',
            invoiceTakerAddress: editing.invoiceTakerAddress ?? '',
            invoiceMunicipality: editing.invoiceMunicipality ?? '',
            invoiceServiceCode: editing.invoiceServiceCode ?? '',
            invoiceTaxRate: editing.invoiceTaxRate ?? '',
            invoiceDescription: editing.invoiceDescription ?? '',
            issueReceipt: Boolean(editing.issueReceipt),
            receiptNumber: editing.receiptNumber ?? '',
            receiptPayerDocument: editing.receiptPayerDocument ?? '',
            receiptPayerEmail: editing.receiptPayerEmail ?? '',
            receiptPaymentDate: editing.receiptPaymentDate ?? editing.paidDate ?? '',
            receiptPaymentMethod: editing.receiptPaymentMethod ?? editing.method ?? 'PIX',
            receiptReference: editing.receiptReference ?? '',
            receiptIssuer: editing.receiptIssuer ?? '',
            receiptNotes: editing.receiptNotes ?? '',
          }}
          onSave={handleUpdate}
          onClose={() => setEditing(null)}
          loading={updateMut.isPending}
          error={formError}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 text-center mb-1">Excluir transação</h3>
            <p className="text-sm text-slate-500 text-center mb-5">
              Excluir cobrança de <strong>{deleting.patientName}</strong>?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleting(null)} className="btn-secondary flex-1 justify-center" type="button">Cancelar</button>
              <button onClick={handleDelete} disabled={deleteMut.isPending} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all disabled:opacity-60" type="button">
                {deleteMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {pixDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">PIX gerado</h3>
                <p className="mt-1 text-sm text-slate-500">{pixDetails.patientName || pixDetails.service} - {fmt(Number(pixDetails.amount ?? 0))}</p>
              </div>
              <button onClick={() => setPixDetails(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" type="button">
                <X size={18} />
              </button>
            </div>

            {pixDetails.pixQrCodeBase64 && (
              <div className="mt-5 flex justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <img src={`data:image/png;base64,${pixDetails.pixQrCodeBase64}`} alt="QR Code PIX" className="h-48 w-48 rounded-xl bg-white p-2" />
              </div>
            )}

            <div className="mt-4">
              <label className="label">PIX copia e cola</label>
              <textarea className="input min-h-[96px] resize-none font-mono text-xs" readOnly value={pixDetails.pixPayload ?? ''} />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {pixDetails.paymentUrl && (
                <a href={pixDetails.paymentUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                  Abrir cobrança
                </a>
              )}
              <button
                onClick={() => navigator.clipboard?.writeText(pixDetails.pixPayload ?? '')}
                className="btn-primary"
                type="button"
              >
                Copiar PIX
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FiscalList({ title, description, empty, items, fmt, kind, onAction, onEdit }: any) {
  const isInvoice = kind === 'invoice';

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            {isInvoice ? <FileText size={24} className="text-slate-400" /> : <Receipt size={24} className="text-slate-400" />}
          </div>
          <p className="font-medium text-slate-700 mb-1">{empty}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item: any) => {
            const issued = isInvoice ? item.issueInvoice : item.issueReceipt;
            const number = isInvoice ? item.invoiceNumber : item.receiptNumber;
            return (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-[220px]">
                  <div className="font-semibold text-slate-900">{item.patientName}</div>
                  <div className="text-sm text-slate-500">
                    {item.service || 'Serviço'} - {fmt(Number(item.amount ?? 0))}
                  </div>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <span className={`badge ${issued ? 'badge-green' : 'badge-gold'}`}>
                    {issued ? `${isInvoice ? 'NF emitida' : 'Comprovante emitido'} ${number ? `- ${number}` : ''}` : 'Aguardando emissão'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onAction(item)} className="btn-primary btn-sm" type="button">
                    {isInvoice ? <FileText size={14} /> : <Receipt size={14} />}
                    {issued ? 'Atualizar' : isInvoice ? 'Emitir NF' : 'Emitir comprovante'}
                  </button>
                  <button onClick={() => onEdit(item)} className="btn-secondary btn-sm" type="button">
                    <Edit2 size={14} />
                    Editar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FinanceLedger({ title, description, items, fmt, empty, onNew }: any) {
  const total = items.reduce((sum: number, item: any) => sum + Number(item.amount ?? 0), 0);
  const pending = items.filter((item: any) => item.status === 'pendente' || item.status === 'atrasado')
    .reduce((sum: number, item: any) => sum + Number(item.amount ?? 0), 0);
  const paid = items.filter((item: any) => item.status === 'pago')
    .reduce((sum: number, item: any) => sum + Number(item.amount ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <DollarSign size={18} />
          </div>
          <div className="text-2xl font-bold text-slate-900">{fmt(total)}</div>
          <div className="text-sm text-slate-500">Total previsto</div>
        </div>
        <div className="card p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
            <AlertCircle size={18} />
          </div>
          <div className="text-2xl font-bold text-slate-900">{fmt(pending)}</div>
          <div className="text-sm text-slate-500">Pendente</div>
        </div>
        <div className="card p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <CheckCircle2 size={18} />
          </div>
          <div className="text-2xl font-bold text-slate-900">{fmt(paid)}</div>
          <div className="text-sm text-slate-500">Pago/recebido</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 className="section-title">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <button className="btn-primary btn-sm" type="button" onClick={onNew}>
            <Plus size={14} />
            Novo registro
          </button>
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Building2 size={24} className="text-slate-400" />
            </div>
            <p className="font-medium text-slate-700">{empty}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50/70">
              <tr>{['Descricao', 'Servico', 'Valor', 'Vencimento', 'Metodo', 'Status'].map(h => <th key={h} className="table-head px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="table-row">
                  <td className="table-cell">
                    <div className="font-semibold text-slate-900">{item.patientName}</div>
                    <div className="text-xs text-slate-400 capitalize">{item.type}</div>
                  </td>
                  <td className="table-cell">{item.service || '-'}</td>
                  <td className="table-cell font-bold text-slate-900">{fmt(Number(item.amount ?? 0))}</td>
                  <td className="table-cell">{item.dueDate ? new Date(item.dueDate).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="table-cell"><span className="badge badge-gray">{item.method || '-'}</span></td>
                  <td className="table-cell">
                    <span className={`badge ${STATUS_CFG[item.status]?.cls ?? 'badge-gray'}`}>{STATUS_CFG[item.status]?.label ?? item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
