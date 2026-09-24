import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';
import { useInsertLead } from '../hooks/useLeads';
import { useInsertPatient } from '../hooks/usePatients';

type ImportTarget = 'patients' | 'leads';

type ImportRow = Record<string, string>;

type Mapping = Record<string, string>;

const SOURCES = [
  'Feegow',
  'QuarkClinic',
  'Ninsaude Clinic',
  'iClinic',
  'Doctoralia',
  'Simples Dental',
  'Controle Medico / Controle Odonto',
  'Planilha propria',
  'Outro sistema',
];

const PATIENT_FIELDS = [
  { key: 'name', label: 'Nome', required: true },
  { key: 'cpf', label: 'CPF', required: false },
  { key: 'phone', label: 'Telefone', required: false },
  { key: 'email', label: 'E-mail', required: false },
  { key: 'dob', label: 'Data de nascimento', required: false },
  { key: 'city', label: 'Cidade', required: false },
  { key: 'state', label: 'Estado', required: false },
  { key: 'specialty', label: 'Especialidade', required: false },
  { key: 'plan', label: 'Plano / convenio', required: false },
  { key: 'professional', label: 'Profissional responsavel', required: false },
  { key: 'notes', label: 'Observacoes', required: false },
];

const LEAD_FIELDS = [
  { key: 'name', label: 'Nome', required: true },
  { key: 'phone', label: 'Telefone', required: false },
  { key: 'email', label: 'E-mail', required: false },
  { key: 'origin', label: 'Origem', required: false },
  { key: 'channel', label: 'Canal', required: false },
  { key: 'city', label: 'Cidade', required: false },
  { key: 'specialty', label: 'Especialidade', required: false },
  { key: 'responsible', label: 'Responsavel', required: false },
  { key: 'secondaryResponsible', label: 'Responsavel secundario', required: false },
  { key: 'flowOwner', label: 'Fluxo WhatsApp', required: false },
  { key: 'value', label: 'Valor de fechamento', required: false },
  { key: 'notes', label: 'Observacoes', required: false },
];

export default function DataImport() {
  const [source, setSource] = useState(SOURCES[0]);
  const [target, setTarget] = useState<ImportTarget>('patients');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [status, setStatus] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const insertPatient = useInsertPatient();
  const insertLead = useInsertLead();

  const fields = target === 'patients' ? PATIENT_FIELDS : LEAD_FIELDS;
  const preview = useMemo(() => rows.slice(0, 8).map(row => mapRow(row, mapping)), [rows, mapping]);
  const requiredMissing = fields.filter(field => field.required && !mapping[field.key]);
  const invalidRows = preview.filter(row => !row.name?.trim()).length;

  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setStatus('Lendo arquivo...');
    setResult(null);

    const text = await file.text();
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      setRows([]);
      setColumns([]);
      setMapping({});
      setStatus('Arquivo Excel detectado. Exporte a planilha como CSV antes de importar, para preservar as colunas.');
      return;
    }

    const parsed = file.name.toLowerCase().endsWith('.json') ? parseJson(text) : parseCsv(text);
    setRows(parsed.rows);
    setColumns(parsed.columns);
    const nextMapping = buildAutoMapping(parsed.columns, target);
    setMapping(nextMapping);
    setStatus(`${parsed.rows.length} registro(s) encontrados. Confira o mapeamento antes de importar.`);
  };

  const runImport = async () => {
    if (requiredMissing.length) {
      setStatus('Mapeie os campos obrigatorios antes de importar.');
      return;
    }

    setImporting(true);
    setResult(null);
    const errors: string[] = [];
    let success = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const mapped = mapRow(rows[index], mapping);
      if (!mapped.name?.trim()) {
        errors.push(`Linha ${index + 2}: nome vazio.`);
        continue;
      }

      try {
        if (target === 'patients') {
          await insertPatient.mutateAsync({
            name: mapped.name,
            dob: normalizeDate(mapped.dob),
            cpf: mapped.cpf,
            phone: mapped.phone,
            email: mapped.email,
            city: mapped.city,
            state: mapped.state,
            specialty: mapped.specialty,
            plan: mapped.plan,
            professional: mapped.professional,
            status: 'ativo',
            notes: buildImportNotes(mapped.notes, source, fileName),
          });
        } else {
          await insertLead.mutateAsync({
            name: mapped.name,
            phone: mapped.phone,
            email: mapped.email,
            channel: mapped.channel || mapped.origin || 'Outro',
            temperature: 'warm',
            stage: 'Novo lead',
            origin: mapped.origin || mapped.channel || 'Importacao',
            tags: ['importado'],
            assignee: '',
            responsible: mapped.responsible,
            secondaryResponsible: mapped.secondaryResponsible,
            flowOwner: mapped.flowOwner,
            status: 'Novo lead',
            city: mapped.city,
            specialty: mapped.specialty,
            score: 50,
            notes: buildImportNotes(mapped.notes, source, fileName),
            value: Number(String(mapped.value ?? '').replace(/\./g, '').replace(',', '.')) || 0,
          });
        }
        success += 1;
      } catch (error: any) {
        errors.push(`Linha ${index + 2}: ${error?.message ?? 'erro desconhecido'}`);
      }
    }

    setImporting(false);
    setResult({ success, errors });
    setStatus(errors.length ? 'Importacao concluida com pendencias.' : 'Importacao concluida com sucesso.');
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-6 animate-slide-up">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Importacao de dados</h1>
            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700">Implantacao</span>
          </div>
          <p className="text-sm text-slate-500">Traga pacientes e leads de outras plataformas para a Nucleus sem comecar do zero.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard title="Origem" value={source} icon={<Database size={18} />} />
        <SummaryCard title="Destino" value={target === 'patients' ? 'Pacientes' : 'Leads'} icon={<UploadCloud size={18} />} />
        <SummaryCard title="Registros lidos" value={String(rows.length)} icon={<FileSpreadsheet size={18} />} />
        <SummaryCard title="Campos mapeados" value={`${Object.values(mapping).filter(Boolean).length}/${fields.length}`} icon={<CheckCircle2 size={18} />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="card p-5 space-y-5">
          <div>
            <h2 className="section-title">1. Arquivo de origem</h2>
            <p className="section-subtitle">Exporte da plataforma antiga em CSV ou JSON e envie aqui.</p>
          </div>

          <div>
            <label className="label">Plataforma de origem</label>
            <select className="input" value={source} onChange={event => setSource(event.target.value)}>
              {SOURCES.map(item => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Importar como</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setTarget('patients')} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${target === 'patients' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`}>Pacientes</button>
              <button type="button" onClick={() => setTarget('leads')} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${target === 'leads' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`}>Leads</button>
            </div>
          </div>

          <label className="flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center transition hover:border-primary-300 hover:bg-primary-50/40">
            <UploadCloud size={30} className="text-primary-600" />
            <span className="mt-3 text-sm font-bold text-slate-900">{fileName || 'Enviar CSV ou JSON'}</span>
            <span className="mt-1 text-xs text-slate-500">Use CSV separado por virgula, ponto e virgula ou tabulacao. Excel deve ser exportado como CSV.</span>
            <input className="hidden" type="file" accept=".csv,.json,.xlsx,.xls,text/csv,application/json" onChange={event => handleFile(event.target.files?.[0])} />
          </label>

          {status && (
            <div className="rounded-xl border border-primary-100 bg-primary-50 p-3 text-sm text-primary-800">{status}</div>
          )}

          {requiredMissing.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Campos obrigatorios sem mapeamento: {requiredMissing.map(field => field.label).join(', ')}.
            </div>
          )}

          <button
            type="button"
            disabled={!rows.length || importing || requiredMissing.length > 0}
            onClick={runImport}
            className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? <RefreshCw size={16} className="animate-spin" /> : <Database size={16} />}
            {importing ? 'Importando...' : 'Importar para a Nucleus'}
          </button>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="section-title">2. Mapeamento de colunas</h2>
                <p className="section-subtitle">Confirme qual coluna da planilha alimenta cada campo da Nucleus.</p>
              </div>
              {rows.length > 0 && invalidRows === 0 && <span className="badge badge-green">Previa valida</span>}
              {invalidRows > 0 && <span className="badge bg-amber-50 text-amber-700">{invalidRows} linha(s) sem nome</span>}
            </div>

            {rows.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {fields.map(field => (
                  <div key={field.key}>
                    <label className="label">{field.label}{field.required ? ' *' : ''}</label>
                    <select
                      className="input"
                      value={mapping[field.key] ?? ''}
                      onChange={event => setMapping(prev => ({ ...prev, [field.key]: event.target.value }))}
                    >
                      <option value="">Nao importar</option>
                      {columns.map(column => <option key={column} value={column}>{column}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 p-5">
              <h2 className="section-title">3. Previa da importacao</h2>
              <p className="section-subtitle">Confira as primeiras linhas antes de gravar no banco.</p>
            </div>
            {preview.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Nome</th>
                      <th className="px-4 py-3 text-left">Telefone</th>
                      <th className="px-4 py-3 text-left">E-mail</th>
                      <th className="px-4 py-3 text-left">{target === 'patients' ? 'Especialidade' : 'Origem'}</th>
                      <th className="px-4 py-3 text-left">Observacoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((row, index) => (
                      <tr key={`${row.name}-${index}`}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.name || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{row.phone || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{row.email || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{target === 'patients' ? row.specialty || '-' : row.origin || row.channel || '-'}</td>
                        <td className="max-w-[320px] truncate px-4 py-3 text-slate-500">{row.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {result && (
            <div className={`rounded-2xl border p-4 ${result.errors.length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="flex items-center gap-2 font-bold text-slate-900">
                {result.errors.length ? <AlertCircle size={18} className="text-amber-600" /> : <CheckCircle2 size={18} className="text-emerald-600" />}
                Resultado da importacao
              </div>
              <p className="mt-1 text-sm text-slate-600">{result.success} registro(s) importados com sucesso.</p>
              {result.errors.length > 0 && (
                <div className="mt-3 max-h-40 overflow-auto rounded-xl bg-white/70 p-3 text-xs text-amber-900">
                  {result.errors.map(error => <div key={error}>{error}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">{icon}</div>
      <div className="truncate text-lg font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{title}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center p-6 text-center">
      <FileSpreadsheet size={28} className="text-slate-300" />
      <div className="mt-3 text-sm font-semibold text-slate-700">Nenhum arquivo carregado</div>
      <div className="mt-1 text-xs text-slate-500">Envie uma planilha para liberar o mapeamento e a previa.</div>
    </div>
  );
}

function buildImportNotes(notes: string, source: string, fileName: string) {
  return [
    notes,
    `Importado de: ${source}`,
    fileName ? `Arquivo de origem: ${fileName}` : '',
    `Data da importacao: ${new Date().toLocaleString('pt-BR')}`,
  ].filter(Boolean).join('\n');
}

function buildAutoMapping(columns: string[], target: ImportTarget): Mapping {
  const fields = target === 'patients' ? PATIENT_FIELDS : LEAD_FIELDS;
  const mapping: Mapping = {};
  fields.forEach(field => {
    const match = columns.find(column => normalize(column) === normalize(field.label) || normalize(column).includes(normalize(field.key)));
    if (match) mapping[field.key] = match;
  });
  if (!mapping.name) mapping.name = findColumn(columns, ['nome', 'paciente', 'lead', 'cliente']);
  if (!mapping.phone) mapping.phone = findColumn(columns, ['telefone', 'celular', 'whatsapp', 'fone']);
  if (!mapping.email) mapping.email = findColumn(columns, ['email', 'e-mail']);
  if (!mapping.cpf) mapping.cpf = findColumn(columns, ['cpf', 'documento']);
  if (!mapping.dob) mapping.dob = findColumn(columns, ['nascimento', 'data de nascimento', 'birth']);
  if (!mapping.specialty) mapping.specialty = findColumn(columns, ['especialidade', 'servico']);
  if (!mapping.origin) mapping.origin = findColumn(columns, ['origem', 'canal', 'source']);
  return mapping;
}

function findColumn(columns: string[], candidates: string[]) {
  return columns.find(column => candidates.some(candidate => normalize(column).includes(normalize(candidate)))) ?? '';
}

function mapRow(row: ImportRow, mapping: Mapping) {
  return Object.entries(mapping).reduce<Record<string, string>>((acc, [field, column]) => {
    acc[field] = row[column] ?? '';
    return acc;
  }, {});
}

function parseJson(text: string) {
  const json = JSON.parse(text);
  const rows = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
  const normalizedRows = rows.map((row: any) => flattenRow(row));
  const columns = Array.from(new Set(normalizedRows.flatMap(row => Object.keys(row))));
  return { rows: normalizedRows, columns };
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  const headerInfo = findHeaderLine(lines);
  const delimiter = headerInfo.delimiter;
  const headers = splitCsvLine(lines[headerInfo.index] ?? '', delimiter)
    .map(header => header.trim())
    .filter(Boolean);
  const rows = lines.slice(headerInfo.index + 1).map(line => {
    const values = splitCsvLine(line, delimiter);
    return headers.reduce<ImportRow>((acc, header, index) => {
      acc[header] = values[index]?.trim() ?? '';
      return acc;
    }, {});
  }).filter(row => Object.values(row).some(Boolean));
  return { rows, columns: headers };
}

function findHeaderLine(lines: string[]) {
  const candidates = lines.map((line, index) => {
    const delimiter = detectDelimiter(line);
    const columns = splitCsvLine(line, delimiter).map(value => value.trim()).filter(Boolean);
    const knownScore = columns.reduce((score, column) => score + headerScore(column), 0);
    return { index, delimiter, columnCount: columns.length, knownScore };
  });

  const withRealColumns = candidates
    .filter(candidate => candidate.columnCount > 1)
    .sort((a, b) => {
      if (b.knownScore !== a.knownScore) return b.knownScore - a.knownScore;
      return b.columnCount - a.columnCount;
    });

  return withRealColumns[0] ?? candidates[0] ?? { index: 0, delimiter: ',' };
}

function headerScore(column: string) {
  const value = normalize(column);
  const known = [
    'nome', 'paciente', 'cliente', 'lead', 'telefone', 'celular', 'whatsapp',
    'email', 'cpf', 'documento', 'nascimento', 'cidade', 'estado', 'uf',
    'especialidade', 'plano', 'convenio', 'profissional', 'observacoes',
    'origem', 'canal', 'campanha', 'valor',
  ];
  return known.some(item => value.includes(item)) ? 1 : 0;
}

function splitCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

function detectDelimiter(header: string) {
  const options = [
    { value: ';', count: (header.match(/;/g) ?? []).length },
    { value: ',', count: (header.match(/,/g) ?? []).length },
    { value: '\t', count: (header.match(/\t/g) ?? []).length },
  ];
  return options.sort((a, b) => b.count - a.count)[0]?.value ?? ',';
}

function normalize(value: string) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeDate(value: string) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return value;
  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function flattenRow(row: Record<string, any>, prefix = ''): ImportRow {
  return Object.entries(row ?? {}).reduce<ImportRow>((acc, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flattenRow(value, nextKey));
    } else {
      acc[nextKey] = Array.isArray(value) ? value.join(', ') : String(value ?? '');
    }
    return acc;
  }, {});
}
