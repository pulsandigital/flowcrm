import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Printer,
  RotateCcw,
  Search,
  Send,
  TrendingUp,
} from 'lucide-react';

type ScaleOption = {
  label: string;
  value: number;
};

type ScaleItem = {
  id: string;
  text: string;
};

type ScaleDefinition = {
  id: string;
  specialty: string;
  name: string;
  status: 'ready' | 'licensed';
  source: string;
  description: string;
  instructions: string;
  options: ScaleOption[];
  items: ScaleItem[];
  interpretation: Array<{ min: number; max: number; label: string; tone: string }>;
  note?: string;
};

const LIKERT_0_4 = [
  { label: 'Nada', value: 0 },
  { label: 'Um pouco', value: 1 },
  { label: 'Moderado', value: 2 },
  { label: 'Bastante', value: 3 },
  { label: 'Extremamente', value: 4 },
];

const FREQUENCY_0_3 = [
  { label: 'Nunca', value: 0 },
  { label: 'Varios dias', value: 1 },
  { label: 'Mais da metade dos dias', value: 2 },
  { label: 'Quase todos os dias', value: 3 },
];

const READY_SCALES: ScaleDefinition[] = [
  {
    id: 'social-anxiety-screening',
    specialty: 'Psiquiatria',
    name: 'Triagem de ansiedade social',
    status: 'ready',
    source: 'Instrumento interno de triagem. Substitua por escala licenciada quando aplicavel.',
    description: 'Avalia medo, evitacao e desconforto fisiologico em situacoes sociais recentes.',
    instructions: 'Indique quanto cada situacao incomodou o paciente nos ultimos 7 dias.',
    options: LIKERT_0_4,
    items: [
      { id: 's1', text: 'Medo de ser observado ou avaliado por outras pessoas.' },
      { id: 's2', text: 'Desconforto ao falar com pessoas desconhecidas.' },
      { id: 's3', text: 'Evitacao de reunioes, festas ou eventos sociais.' },
      { id: 's4', text: 'Medo de ficar vermelho, tremer ou parecer nervoso.' },
      { id: 's5', text: 'Dificuldade para realizar tarefas quando outras pessoas estao olhando.' },
      { id: 's6', text: 'Preocupacao excessiva antes de interacoes sociais.' },
      { id: 's7', text: 'Evitacao de apresentar ideias, opinioes ou trabalhos em publico.' },
      { id: 's8', text: 'Sintomas fisicos como palpitacao, suor ou tensao em situacoes sociais.' },
    ],
    interpretation: [
      { min: 0, max: 7, label: 'Baixo impacto', tone: 'text-teal-700 bg-teal-50 border-teal-100' },
      { min: 8, max: 15, label: 'Atencao clinica', tone: 'text-amber-700 bg-amber-50 border-amber-100' },
      { min: 16, max: 32, label: 'Impacto elevado', tone: 'text-red-700 bg-red-50 border-red-100' },
    ],
  },
  {
    id: 'anxiety-frequency',
    specialty: 'Psicologia',
    name: 'Triagem breve de ansiedade',
    status: 'ready',
    source: 'Instrumento interno de rastreio para acompanhamento clinico.',
    description: 'Rastreia frequencia de sintomas ansiosos percebidos nas ultimas duas semanas.',
    instructions: 'Marque a frequencia dos sintomas nas ultimas duas semanas.',
    options: FREQUENCY_0_3,
    items: [
      { id: 'a1', text: 'Sentiu-se nervoso(a), ansioso(a) ou no limite.' },
      { id: 'a2', text: 'Teve dificuldade para controlar preocupacoes.' },
      { id: 'a3', text: 'Preocupou-se excessivamente com diferentes situacoes.' },
      { id: 'a4', text: 'Teve dificuldade para relaxar.' },
      { id: 'a5', text: 'Ficou inquieto(a) ou agitado(a).' },
      { id: 'a6', text: 'Irritou-se com facilidade.' },
      { id: 'a7', text: 'Sentiu medo de que algo ruim pudesse acontecer.' },
    ],
    interpretation: [
      { min: 0, max: 4, label: 'Sintomas leves ou ausentes', tone: 'text-teal-700 bg-teal-50 border-teal-100' },
      { min: 5, max: 9, label: 'Sintomas moderados', tone: 'text-amber-700 bg-amber-50 border-amber-100' },
      { min: 10, max: 21, label: 'Sintomas elevados', tone: 'text-red-700 bg-red-50 border-red-100' },
    ],
  },
  {
    id: 'pain-function',
    specialty: 'Fisioterapia',
    name: 'Dor e funcionalidade',
    status: 'ready',
    source: 'Escala interna de acompanhamento funcional.',
    description: 'Ajuda o profissional a acompanhar dor, movimento e limitacao funcional.',
    instructions: 'Marque o impacto percebido pelo paciente na ultima semana.',
    options: LIKERT_0_4,
    items: [
      { id: 'p1', text: 'Dor durante atividades de rotina.' },
      { id: 'p2', text: 'Limitacao para caminhar, subir escadas ou se deslocar.' },
      { id: 'p3', text: 'Rigidez ou dificuldade de movimento.' },
      { id: 'p4', text: 'Interferencia da dor no sono.' },
      { id: 'p5', text: 'Medo de movimentar a regiao dolorosa.' },
    ],
    interpretation: [
      { min: 0, max: 5, label: 'Baixa limitacao', tone: 'text-teal-700 bg-teal-50 border-teal-100' },
      { min: 6, max: 12, label: 'Limitacao moderada', tone: 'text-amber-700 bg-amber-50 border-amber-100' },
      { min: 13, max: 20, label: 'Limitacao importante', tone: 'text-red-700 bg-red-50 border-red-100' },
    ],
  },
  {
    id: 'nutrition-adherence',
    specialty: 'Nutricao',
    name: 'Adesao ao plano alimentar',
    status: 'ready',
    source: 'Escala interna para retorno nutricional.',
    description: 'Monitora adesao, fome, organizacao alimentar e barreiras comportamentais.',
    instructions: 'Responda considerando os ultimos 7 dias.',
    options: LIKERT_0_4,
    items: [
      { id: 'n1', text: 'Dificuldade para seguir os horarios combinados.' },
      { id: 'n2', text: 'Episodios de fome intensa fora do planejado.' },
      { id: 'n3', text: 'Dificuldade para organizar compras ou refeicoes.' },
      { id: 'n4', text: 'Consumo alimentar por ansiedade, estresse ou impulso.' },
      { id: 'n5', text: 'Dificuldade para manter hidratacao adequada.' },
    ],
    interpretation: [
      { min: 0, max: 5, label: 'Boa adesao', tone: 'text-teal-700 bg-teal-50 border-teal-100' },
      { min: 6, max: 12, label: 'Barreiras relevantes', tone: 'text-amber-700 bg-amber-50 border-amber-100' },
      { min: 13, max: 20, label: 'Baixa adesao', tone: 'text-red-700 bg-red-50 border-red-100' },
    ],
  },
];

const CATALOG_SCALE_NAMES = [
  'Geral - APACHE II - Acute Physiology and Chronic Health Evaluation II',
  'Pediatria - Apgar Score',
  'Enfermagem - Braden Scale for Predicting Pressure Sore Risk',
  'Geral - COPSOQ II - Versao Curta',
  'Psiquiatria - DIVA-5 - Parte 1: Sintomas de Deficit de Atencao',
  'Psiquiatria - DIVA-5 - Parte 2: Sintomas de Hiperatividade/Impulsividade',
  'Psiquiatria - DIVA-5 - Parte 3: Prejuizos devido aos sintomas',
  'Nutricionista | Psiquiatria - EAT-26',
  'Geral - Escala de APGAR Familiar',
  'Urgencia - Escala de Coma de Glasgow',
  'Enfermagem - Escala de Queda de Morse',
  'Geral - ABEP 2021 - Classificacao economica Brasil',
  'Geriatria - Escala de Katz - Atividades Basicas de Vida Diaria',
  'Geral - FIBSER - Frequency, Intensity and Burden of Side Effects Ratings',
  'Nutricao - IDQ - Index of Diet Quality',
  'Geral - IPAQ - Questionario Internacional de Atividade Fisica',
  'Neurologia | Psiquiatria - B-CafEQ-BR - Brief Version of Caffeine Expectancy Questionnaire',
  'Psiquiatria - CBI-S - Inventario de Burnout de Copenhagen',
  'Geriatria | Psiquiatria - NPI-Q - Inventario Neuropsiquiatrico',
  'Neurologia - LANNS',
  'Neurologia | Neuropediatria | Pediatria | Psiquiatria - M-CHAT',
  'Neurologia | Neuropediatria | Pediatria | Psiquiatria - SDQ-POR',
  'Neurologia | Pediatria | Neuropediatria | Psiquiatria - MTA-SNAP IV',
  'Neurologia | Pneumologia | Psiquiatria - CSD-M - Diario do Sono',
  'Neurologia | Pneumologia | Psiquiatria - ISI - Indice de gravidade de insonia',
  'Neurologia | Psiquiatria - AIVD - Escala de Lawton',
  'Neurologia | Psiquiatria - IQCODE',
  'Neurologia | Psiquiatria - QA - Quociente do Espectro do Autismo',
  'Neurologia | Psiquiatria - Consumo de cafeina e estimulantes',
  'Oncologia - UW-QOL - University of Washington Quality of Life',
  'Pediatria | Psiquiatria - CDI - Inventario de Depressao Infantil',
  'Psiquiatria - PID-5',
  'Pneumologia | Psiquiatria - Teste de Fagerstrom',
  'Psiquiatria - ACE - Experiencias adversas na infancia',
  'Psiquiatria - AFECTS - Escala de Temperamento Emocional e Afetivo',
  'Psiquiatria - ASQ - Questionario de triagem para autismo',
  'Psiquiatria - ASRS-18 - Adult Self Report Symptom',
  'Psiquiatria - ASSIST - Alcohol, Smoking and Substance Involvement Screening Test',
  'Psiquiatria - AUDIT - Alcohol Use Disorders Identification Test',
  'Psiquiatria - Avaliacao clinica de urgencia',
  'Psiquiatria - BPRS - Escala breve de avaliacao psiquiatrica',
  'Psiquiatria - Brief PHQ - Modulo de Ansiedade/Panico',
  'Psiquiatria - CAGE - Uso problematico de alcool',
  'Psiquiatria - CES-D - Escala de Depressao do Centro de Estudos Epidemiologicos',
  'Psiquiatria - DASS-21 - Depression Anxiety Stress Scale',
  'Psiquiatria - EAC - Escala de areas corporais',
  'Psiquiatria - EAR/RSES - Escala de Autoestima de Rosenberg',
  'Psiquiatria - ECAP/BES - Escala de Compulsao Alimentar Periodica',
  'Psiquiatria - EITF/TIS - Escala de Influencia dos Tres Fatores',
  'Psiquiatria - EPDS - Escala de Depressao Pos-parto de Edimburgo',
  'Psiquiatria - ESE - Escala de Sonolencia de Epworth',
  'Psiquiatria - GAD-7 - Generalized Anxiety Disorder',
  'Psiquiatria - GDS-30 - Escala de Depressao Geriatrica',
  'Psiquiatria - HADS - Escala Hospitalar de Ansiedade e Depressao',
  'Psiquiatria - HAM-A - Escala de ansiedade de Hamilton',
  'Psiquiatria - HAM-D - Escala de depressao de Hamilton',
  'Psiquiatria - HCL-32 - Questionario de Hipomania',
  'Psiquiatria - HCL-32 VB - Questionario de Autoavaliacao de Hipomania',
  'Psiquiatria - IDS-SR30 - Inventario de Sintomatologia Depressiva',
  'Psiquiatria - WHO-5 - Indice de Bem-estar da OMS',
  'Psiquiatria - IPC - Inventario de Problemas do Comportamento',
  'Psiquiatria - LSAS - Escala de Fobia Social de Liebowitz',
  'Psiquiatria - MADRS - Montgomery-Asberg Depression Rating Scale',
  'Psiquiatria - MBCQ - Male Body Checking Questionnaire',
  'Psiquiatria - MINI - Item C - Risco de Suicidio',
  'Psiquiatria - MINI - Item M - Anorexia Nervosa',
  'Psiquiatria - Morisky Medication Adherence Scale 8-item',
  'Psiquiatria - OCI-R - Inventario de Obsessoes e Compulsoes',
  'Psiquiatria - PCL-C - Posttraumatic Stress Disorder Checklist',
  'Psiquiatria - PDQ-4 - Personality Diagnostic Questionnaire',
  'Psiquiatria - PGI-I - Patient Global Impression of Improvement',
  'Psiquiatria - PHQ-4 - Triagem breve para depressao e ansiedade',
  'Psiquiatria - PHQ-9 - Patient Health Questionnaire',
  'Psiquiatria - PSWQ - Penn State Worry Questionnaire',
  'Psiquiatria - QIDS-SR16 - Inventario Rapido de Sintomatologia Depressiva',
  'Psiquiatria - RAP - Checklist de sintomas pos-traumaticos',
  'Psiquiatria - SDQ - Strengths and Difficulties Questionnaire',
  'Psiquiatria - SPIN - Inventario de Fobia Social',
  'Psiquiatria - SRQ-20 - Self Reporting Questionnaire',
  'Psiquiatria - Y-BOCS - Yale-Brown Obsessive-Compulsive Scale',
  'Psiquiatria - YMRS - Young Mania Rating Scale',
  'Psiquiatria | Neurologia - CBCL 6-18',
  'Psiquiatria | PIA - SCARED-R',
  'Pediatria - SNAP-IV - Familiares',
  'Otorrinolaringologia - THI',
  'Geral - WHODAS 2.0 - Avaliacao de incapacidade',
];

function catalogScale(title: string, index: number): ScaleDefinition {
  const [specialtyRaw, ...nameParts] = title.split(' - ');
  const specialty = specialtyRaw.split('|')[0].trim() || 'Geral';
  const name = nameParts.join(' - ') || title;

  return {
    id: `catalog-${index}`,
    specialty,
    name,
    status: 'licensed',
    source: 'Catalogo de referencia. Cadastre a versao autorizada/licenciada antes de aplicar.',
    description: 'Modelo reservado para cadastro autorizado, pontuacao e aplicacao futura.',
    instructions: 'Insira os itens, alternativas e regras de pontuacao conforme licenca ou fonte autorizada.',
    options: LIKERT_0_4,
    items: [],
    interpretation: [],
    note: 'Este instrumento aparece no catalogo, mas precisa de validacao de uso, fonte e permissao antes de ser aplicado a pacientes.',
  };
}

const ALL_SCALES = [
  ...READY_SCALES,
  ...CATALOG_SCALE_NAMES.map(catalogScale),
];

const specialties = ['Todas', ...Array.from(new Set(ALL_SCALES.map(scale => scale.specialty))).sort()];

export default function CareScales() {
  const [specialty, setSpecialty] = useState('Todas');
  const [scaleId, setScaleId] = useState(ALL_SCALES[0].id);
  const [search, setSearch] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const searchTerm = search.trim().toLowerCase();
  const filteredScales = ALL_SCALES.filter(scale => {
    const matchesSpecialty = specialty === 'Todas' || scale.specialty === specialty;
    const searchable = `${scale.specialty} ${scale.name}`.toLowerCase();
    const matchesSearch = !searchTerm || searchable.includes(searchTerm);
    return matchesSpecialty && matchesSearch;
  });

  const availableScales = filteredScales.length ? filteredScales : ALL_SCALES;
  const selectedScale = ALL_SCALES.find(scale => scale.id === scaleId) ?? availableScales[0] ?? ALL_SCALES[0];

  const total = useMemo(() => Object.values(answers).reduce((sum, value) => sum + Number(value), 0), [answers]);
  const answeredCount = selectedScale.items.filter(item => answers[item.id] !== undefined).length;
  const isComplete = selectedScale.items.length > 0 && answeredCount === selectedScale.items.length;
  const result = selectedScale.interpretation.find(range => total >= range.min && total <= range.max);

  const setSpecialtyFilter = (value: string) => {
    const nextScales = ALL_SCALES.filter(scale => value === 'Todas' || scale.specialty === value);
    setSpecialty(value);
    setScaleId((nextScales[0] ?? ALL_SCALES[0]).id);
    setAnswers({});
  };

  const setScale = (value: string) => {
    setScaleId(value);
    setAnswers({});
  };

  const printScale = () => window.print();

  return (
    <div className="care-scales-page p-6 space-y-5 animate-slide-up">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-primary-600" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Escalas</h1>
            <span className="badge badge-green">Nucleus Care</span>
          </div>
          <p className="care-scale-page-subtitle text-sm text-slate-500 dark:text-slate-300">
            Aplicacao rapida, pontuacao e interpretacao por especialidade.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary btn-sm" onClick={() => setAnswers({})}><RotateCcw size={14} /> Limpar</button>
          <button className="btn-secondary btn-sm" onClick={printScale}><Printer size={14} /> Imprimir</button>
          <button className="btn-primary btn-sm"><Send size={14} /> Enviar ao paciente</button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
        <aside className="space-y-4">
          <div className="card p-5">
            <label className="label">Especialidade</label>
            <select className="input" value={specialty} onChange={event => setSpecialtyFilter(event.target.value)}>
              {specialties.map(item => <option key={item}>{item}</option>)}
            </select>

            <label className="label mt-4">Buscar escala</label>
            <div className="relative">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Digite nome, sigla ou area..."
              />
            </div>

            <label className="label mt-4">Escala</label>
            <select className="input" value={selectedScale.id} onChange={event => setScale(event.target.value)}>
              {availableScales.map(scale => (
                <option key={scale.id} value={scale.id}>{scale.specialty} - {scale.name}</option>
              ))}
            </select>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{filteredScales.length} modelos encontrados</span>
              <span>{READY_SCALES.length} prontos para uso</span>
            </div>

            <div className="mt-3 max-h-80 overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-700">
              {availableScales.map(scale => {
                const active = scale.id === selectedScale.id;
                return (
                  <button
                    key={scale.id}
                    type="button"
                    onClick={() => setScale(scale.id)}
                    className={`flex w-full items-start gap-3 border-b border-slate-100 px-3 py-3 text-left text-sm last:border-b-0 transition-colors dark:border-slate-700 ${
                      active
                        ? 'care-scale-list-active bg-teal-700 text-white shadow-sm dark:bg-teal-600 dark:text-white'
                        : 'care-scale-list-item bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <TrendingUp size={15} className={active ? 'mt-0.5 text-white' : 'mt-0.5 text-slate-400'} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{scale.name}</span>
                      <span className={`block text-xs ${active ? 'text-teal-50' : 'text-slate-500 dark:text-slate-400'}`}>{scale.specialty}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList size={18} className="text-primary-600" />
              <h2 className="section-title">Resultado</h2>
            </div>
            {selectedScale.status === 'licensed' ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
                <AlertTriangle size={17} className="mb-2" />
                {selectedScale.note}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Pontuacao</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">{total}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {answeredCount} de {selectedScale.items.length} itens respondidos
                  </div>
                </div>
                {isComplete && result ? (
                  <div className={`rounded-xl border p-4 text-sm font-semibold ${result.tone}`}>
                    <CheckCircle2 size={17} className="mb-2" />
                    {result.label}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Responda todos os itens para liberar a interpretacao.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={18} className="text-teal-600" />
              <h2 className="section-title">Seguranca clinica</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Escalas apoiam triagem e acompanhamento. Diagnostico, conduta e validade de instrumentos seguem responsabilidade profissional e autorizacao de uso.
            </p>
          </div>
        </aside>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 p-5 dark:border-slate-700">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="care-scale-detail-title text-lg font-bold text-slate-900 dark:text-slate-50">{selectedScale.name}</h2>
                  <span className="badge badge-blue">{selectedScale.specialty}</span>
                  {selectedScale.status === 'ready' && <span className="badge badge-green">Pronta para uso</span>}
                  {selectedScale.status === 'licensed' && <span className="badge badge-gold">Requer licenca</span>}
                </div>
                <p className="care-scale-detail-description mt-1 text-sm text-slate-500 dark:text-slate-300">{selectedScale.description}</p>
              </div>
              <button className="btn-secondary btn-sm"><Download size={14} /> Exportar PDF</button>
            </div>
          </div>

          <div className="p-5">
            <div className="care-scale-info mb-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{selectedScale.instructions}</p>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Fonte: {selectedScale.source}</p>
            </div>

            {selectedScale.status === 'licensed' ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
                <FileText size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-500" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-50">Instrumento aguardando cadastro autorizado</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-300">
                  A estrutura de catalogo esta pronta, mas os itens oficiais devem ser inseridos apenas quando houver autorizacao, licenca ou fonte permitida pela clinica.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedScale.items.map((item, index) => (
                  <div key={item.id} className="care-scale-question rounded-2xl border border-slate-100 p-4 dark:border-slate-700">
                    <div className="care-scale-question-title mb-3 font-semibold text-slate-900 dark:text-slate-50">{index + 1}. {item.text}</div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {selectedScale.options.map(option => {
                        const checked = answers[item.id] === option.value;
                        return (
                          <label
                            key={option.value}
                            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                              checked
                                ? 'care-scale-option care-scale-option-selected border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-500/60 dark:bg-primary-900/40 dark:text-primary-100'
                                : 'care-scale-option border-slate-100 bg-white text-slate-600 hover:border-primary-200 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            <input
                              type="radio"
                              name={item.id}
                              className="h-4 w-4 accent-primary-600"
                              checked={checked}
                              onChange={() => setAnswers(prev => ({ ...prev, [item.id]: option.value }))}
                            />
                            {option.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
