import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Copy,
  FileSignature,
  FileText,
  Pill,
  Printer,
  Save,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { usePatients } from '../hooks/usePatients';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { getBrandSettings } from '../lib/branding';
import { SPECIALTIES as ALL_SPECIALTIES, allowedSpecialtiesForProfile, canonicalSpecialty } from '../lib/specialties';

type DocumentType = 'attestation' | 'attendance' | 'prescription' | 'service_guide' | 'exam_authorization' | 'sp_sadt_guide' | 'hospitalization_guide' | 'consultation_guide';

interface FormState {
  patientId: string;
  patientName: string;
  patientCpf: string;
  specialty: string;
  professional: string;
  professionalDocument: string;
  crm: string;
  rqe: string;
  issuerId: string;
  clinicName: string;
  hospitalAddress: string;
  attendanceMode: 'presencial' | 'online';
  digitallySigned: string;
  signatureHash: string;
  healthPlan: string;
  guideNumber: string;
  operatorRegistry: string;
  cardNumber: string;
  authorizationCode: string;
  authorizationDate: string;
  password: string;
  passwordValidUntil: string;
  contractedCode: string;
  cnes: string;
  professionalCouncil: string;
  professionalCouncilNumber: string;
  councilUf: string;
  cbo: string;
  attendanceCharacter: string;
  accidentIndicator: string;
  consultationType: string;
  procedureTable: string;
  procedureValue: string;
  serviceCode: string;
  requestedExams: string;
  clinicalJustification: string;
  date: string;
  restDays: string;
  conduct: string;
  prescription: string;
  notes: string;
}

const SPECIALTIES = ['Clínica médica', ...ALL_SPECIALTIES.filter(item => item !== 'Clínica médica')];

const DOCUMENT_TYPES: { id: DocumentType; label: string; icon: typeof FileText; description: string }[] = [
  { id: 'attestation', label: 'Atestado', icon: ClipboardCheck, description: 'Afastamento, repouso ou recomendacao clinica.' },
  { id: 'attendance', label: 'Declaracao de comparecimento', icon: FileSignature, description: 'Comprovacao de presenca no atendimento.' },
  { id: 'prescription', label: 'Receita / prescricao', icon: Pill, description: 'Conduta, prescricao e orientacoes ao paciente.' },
  { id: 'service_guide', label: 'Guia de servico', icon: ClipboardList, description: 'Guia para convenio, servico e autorizacao.' },
  { id: 'exam_authorization', label: 'Aprovacao de exames', icon: BadgeCheck, description: 'Solicitacao de autorizacao para exames.' },
  { id: 'sp_sadt_guide', label: 'Guia SP/SADT', icon: ClipboardList, description: 'Solicitacao de servicos profissionais, exames e terapias.' },
  { id: 'hospitalization_guide', label: 'Guia de internacao', icon: Building2, description: 'Solicitacao de internacao com justificativa clinica.' },
  { id: 'consultation_guide', label: 'Guia de consulta', icon: Stethoscope, description: 'Registro e autorizacao de consulta eletiva ou retorno.' },
];

const SPECIALTY_CONTEXT: Record<string, { reason: string; conduct: string; prescription: string; exams: string }> = {
  'Clinica geral': {
    reason: 'avaliacao clinica e acompanhamento de saude',
    conduct: 'repouso relativo, hidratacao e acompanhamento conforme evolucao clinica',
    prescription: 'Prescricao conforme avaliacao clinica, alergias, historico e contraindicações.',
    exams: 'Hemograma completo, glicemia, funcao renal, funcao hepatica e exames conforme queixa.',
  },
  Cardiologia: {
    reason: 'avaliacao cardiologica e investigacao de sintomas cardiovasculares',
    conduct: 'evitar esforco fisico intenso ate reavaliacao e seguir orientacoes cardiologicas',
    prescription: 'Conduta cardiologica conforme pressao arterial, frequencia cardiaca, exames e risco cardiovascular.',
    exams: 'Eletrocardiograma, ecocardiograma, troponina seriada, teste ergometrico e perfil lipidico.',
  },
  Dermatologia: {
    reason: 'avaliacao dermatologica e acompanhamento de queixa cutanea',
    conduct: 'evitar exposicao solar excessiva e seguir cuidados topicos orientados',
    prescription: 'Tratamento dermatologico topico ou sistemico conforme hipotese diagnostica.',
    exams: 'Dermatoscopia, biopsia de pele, cultura, antibiograma ou exames laboratoriais conforme lesao.',
  },
  Endocrinologia: {
    reason: 'avaliacao endocrinologica e acompanhamento metabolico/hormonal',
    conduct: 'seguir orientacoes alimentares, exames solicitados e acompanhamento regular',
    prescription: 'Ajuste terapeutico conforme exames laboratoriais, metas metabolicas e avaliacao clinica.',
    exams: 'TSH, T4 livre, glicemia, HbA1c, insulina, perfil lipidico e exames hormonais indicados.',
  },
  Fisioterapia: {
    reason: 'atendimento fisioterapeutico e reabilitacao funcional',
    conduct: 'evitar sobrecarga, realizar exercicios prescritos e respeitar limites de dor',
    prescription: 'Plano fisioterapeutico com exercicios, orientacoes posturais e condutas de reabilitacao.',
    exams: 'Radiografia, ultrassom musculoesqueletico, ressonancia, avaliacao funcional ou laudos complementares.',
  },
  Ginecologia: {
    reason: 'avaliacao ginecologica e acompanhamento de saude da mulher',
    conduct: 'seguir orientacoes ginecologicas, exames solicitados e retorno conforme necessidade',
    prescription: 'Conduta ginecologica conforme avaliacao, exames, idade, queixa e contraindicações.',
    exams: 'Citologia oncótica, ultrassom transvaginal, beta-HCG, exames hormonais e culturas quando indicadas.',
  },
  Nutricao: {
    reason: 'atendimento nutricional e acompanhamento alimentar',
    conduct: 'seguir plano alimentar, hidratacao adequada e registro alimentar quando indicado',
    prescription: 'Plano alimentar individualizado, metas nutricionais e suplementacao quando aplicavel.',
    exams: 'Hemograma, ferritina, vitamina D, B12, glicemia, HbA1c, lipidograma e bioimpedancia quando indicada.',
  },
  Odontologia: {
    reason: 'atendimento odontologico e avaliacao bucal',
    conduct: 'evitar alimentos duros, manter higiene oral e seguir cuidados pos-atendimento',
    prescription: 'Prescricao odontologica conforme procedimento, dor, inflamacao e avaliacao clinica.',
    exams: 'Radiografia panoramica, periapical, tomografia odontologica e documentacao ortodontica quando indicada.',
  },
  Pediatria: {
    reason: 'avaliacao pediatrica e acompanhamento infantil',
    conduct: 'observar sinais de alerta, hidratacao, alimentacao e retorno se houver piora',
    prescription: 'Conduta pediatrica ajustada por idade, peso, historico, alergias e avaliacao do responsavel.',
    exams: 'Hemograma, PCR, urina tipo 1, cultura, testes virais e exames conforme idade e queixa.',
  },
  Psicologia: {
    reason: 'atendimento psicologico e acompanhamento terapeutico',
    conduct: 'manter acompanhamento psicologico e praticas acordadas em sessao',
    prescription: 'Orientacoes psicologicas e plano terapeutico conforme demanda, objetivos e evolucao.',
    exams: 'Instrumentos e escalas psicologicas permitidos e indicados conforme avaliacao profissional.',
  },
  Psiquiatria: {
    reason: 'avaliacao psiquiatrica e acompanhamento em saude mental',
    conduct: 'seguir plano terapeutico, observar efeitos adversos e manter acompanhamento regular',
    prescription: 'Prescricao psiquiatrica conforme avaliacao diagnostica, resposta terapeutica e seguranca medicamentosa.',
    exams: 'Hemograma, TSH/T4, funcao hepatica, funcao renal, eletrolitos, ECG e dosagens conforme medicacao.',
  },
};

const today = () => new Date().toISOString().split('T')[0];
const formatDate = (date: string) => date ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR') : '';
const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const initialForm: FormState = {
  patientId: '',
  patientName: '',
  patientCpf: '',
  specialty: 'Clinica geral',
  professional: '',
  professionalDocument: '',
  crm: '',
  rqe: '',
  issuerId: '',
  clinicName: '',
  hospitalAddress: '',
  attendanceMode: 'presencial',
  digitallySigned: 'validated',
  signatureHash: '',
  healthPlan: '',
  guideNumber: '',
  operatorRegistry: '',
  cardNumber: '',
  authorizationCode: '',
  authorizationDate: '',
  password: '',
  passwordValidUntil: '',
  contractedCode: '',
  cnes: '',
  professionalCouncil: 'CRM',
  professionalCouncilNumber: '',
  councilUf: '',
  cbo: '',
  attendanceCharacter: 'Eletivo',
  accidentIndicator: 'Nao acidente',
  consultationType: 'Primeira consulta',
  procedureTable: '22 - TUSS',
  procedureValue: '',
  serviceCode: '',
  requestedExams: '',
  clinicalJustification: '',
  date: today(),
  restDays: '1',
  conduct: '',
  prescription: '',
  notes: '',
};

function issuerBlock(data: FormState) {
  return [
    `Emitente: ${data.professional || '[profissional responsavel]'}`,
    data.crm ? `CRM: ${data.crm}` : '',
    data.rqe ? `RQE: ${data.rqe}` : '',
    data.professionalDocument ? `Documento profissional: ${data.professionalDocument}` : '',
    data.issuerId ? `Identificacao do emitente: ${data.issuerId}` : '',
    data.clinicName ? `Instituicao/clinica: ${data.clinicName}` : '',
    data.attendanceMode === 'presencial' && data.hospitalAddress ? `Endereco do atendimento: ${data.hospitalAddress}` : '',
    data.digitallySigned === 'validated' ? `Assinatura digital: validada${data.signatureHash ? ` - codigo ${data.signatureHash}` : ''}` : 'Assinatura digital: pendente de validacao',
  ].filter(Boolean).join('\n');
}

function buildDocumentText(type: DocumentType, specialty: string, data: FormState) {
  const context = SPECIALTY_CONTEXT[specialty] ?? SPECIALTY_CONTEXT['Clinica geral'];
  const patient = data.patientName || '[nome do paciente]';
  const cpf = data.patientCpf ? `, CPF ${data.patientCpf}` : '';
  const date = formatDate(data.date) || '[data]';
  const duration = data.restDays ? `${data.restDays} dia(s)` : '[quantidade de dias]';
  const issuer = issuerBlock(data);

  if (type === 'attendance') {
    return `DECLARACAO DE COMPARECIMENTO\n\nDeclaro, para os devidos fins, que ${patient}${cpf} compareceu a atendimento de ${specialty} em ${date}, na modalidade ${data.attendanceMode}, para ${context.reason}.\n\nEsta declaracao e emitida a pedido do(a) paciente, sem detalhamento diagnostico, preservando o sigilo profissional.\n\n${issuer}`;
  }

  if (type === 'prescription') {
    return `RECEITA / PRESCRICAO\n\nPaciente: ${patient}${cpf}\nEspecialidade: ${specialty}\nData: ${date}\n\nPrescricao / orientacoes:\n${data.prescription || context.prescription}\n\nConduta complementar:\n${data.conduct || context.conduct}\n\nObservacoes:\n${data.notes || 'Documento deve ser revisado e assinado pelo profissional responsavel antes da entrega ao paciente.'}\n\n${issuer}`;
  }

  if (type === 'service_guide') {
    return `GUIA DE SERVICO\n\nPaciente: ${patient}${cpf}\nConvenio/plano: ${data.healthPlan || '[plano ou particular]'}\nNumero da guia: ${data.guideNumber || '[numero da guia]'}\nCodigo do servico/procedimento: ${data.serviceCode || '[codigo do servico]'}\nEspecialidade: ${specialty}\nData solicitada: ${date}\nModalidade: ${data.attendanceMode}\n\nServico solicitado:\n${data.conduct || context.reason}\n\nJustificativa clinica:\n${data.clinicalJustification || context.reason}\n\n${issuer}`;
  }

  if (type === 'exam_authorization') {
    return `SOLICITACAO DE APROVACAO DE EXAMES\n\nPaciente: ${patient}${cpf}\nConvenio/plano: ${data.healthPlan || '[plano ou particular]'}\nNumero da guia: ${data.guideNumber || '[numero da guia]'}\nEspecialidade solicitante: ${specialty}\nData: ${date}\n\nExames solicitados:\n${data.requestedExams || context.exams}\n\nJustificativa clinica:\n${data.clinicalJustification || data.conduct || context.reason}\n\nSolicito autorizacao dos exames acima para suporte diagnostico, definicao de conduta e acompanhamento clinico.\n\n${issuer}`;
  }

  if (type === 'sp_sadt_guide') {
    return `GUIA SP/SADT\n\nPaciente: ${patient}${cpf}\nConvenio/plano: ${data.healthPlan || '[plano ou particular]'}\nNumero da guia: ${data.guideNumber || '[numero da guia]'}\nCodigo TUSS/procedimento: ${data.serviceCode || '[codigo do procedimento]'}\nEspecialidade solicitante: ${specialty}\nData da solicitacao: ${date}\n\nProcedimentos, exames ou terapias solicitadas:\n${data.requestedExams || data.prescription || context.exams}\n\nIndicacao clinica:\n${data.clinicalJustification || data.conduct || context.reason}\n\nSolicito autorizacao conforme cobertura contratual, diretrizes clinicas e avaliacao assistencial.\n\n${issuer}`;
  }

  if (type === 'hospitalization_guide') {
    return `GUIA DE SOLICITACAO DE INTERNACAO\n\nPaciente: ${patient}${cpf}\nConvenio/plano: ${data.healthPlan || '[plano ou particular]'}\nNumero da guia: ${data.guideNumber || '[numero da guia]'}\nEspecialidade solicitante: ${specialty}\nData da solicitacao: ${date}\nLocal sugerido: ${data.clinicName || '[hospital/clinica]'}\nEndereco: ${data.hospitalAddress || '[endereco do local]'}\n\nJustificativa para internacao:\n${data.clinicalJustification || data.conduct || context.reason}\n\nConduta proposta:\n${data.prescription || context.conduct}\n\nSolicito avaliacao/autorizacao para internacao conforme quadro clinico, risco assistencial e necessidade de cuidado continuo.\n\n${issuer}`;
  }

  if (type === 'consultation_guide') {
    return `GUIA DE CONSULTA\n\nPaciente: ${patient}${cpf}\nConvenio/plano: ${data.healthPlan || '[plano ou particular]'}\nNumero da guia: ${data.guideNumber || '[numero da guia]'}\nEspecialidade: ${specialty}\nData da consulta: ${date}\nModalidade: ${data.attendanceMode}\n\nTipo/servico: ${data.serviceCode || 'Consulta ambulatorial'}\nMotivo/indicacao:\n${data.clinicalJustification || data.conduct || context.reason}\n\n${issuer}`;
  }

  return `ATESTADO\n\nAtesto, para os devidos fins, que ${patient}${cpf} foi atendido(a) em ${date} para ${context.reason}.\n\nRecomendo afastamento/repouso por ${duration}, a contar desta data, conforme avaliacao profissional e necessidade clinica.\n\nConduta: ${data.conduct || context.conduct}.\n\n${data.notes ? `Observacoes: ${data.notes}\n\n` : ''}${issuer}`;
}

function guideValue(value: string, fallback = '-') {
  return value?.trim() || fallback;
}

function guideDate(value: string) {
  return formatDate(value) || '-';
}

function buildGuideHtml(type: DocumentType, data: FormState, brandName: string) {
  const isSadt = type === 'sp_sadt_guide' || type === 'service_guide';
  const title = isSadt ? 'GUIA DE SERVICO PROFISSIONAL / SERVICO AUXILIAR DIAGNOSTICO E TERAPIA - SP/SADT' : 'GUIA DE CONSULTA';
  const patient = guideValue(data.patientName, 'Paciente');
  const procedure = guideValue(data.serviceCode || (isSadt ? data.requestedExams : data.consultationType));
  const indication = guideValue(data.clinicalJustification || data.conduct || data.notes);
  const rows = isSadt
    ? `
      <tr><td>23 - Procedimentos solicitados</td><td>${escapeHtml(procedure)}</td><td>24 - Tabela<br>${escapeHtml(guideValue(data.procedureTable))}</td><td>25 - Codigo<br>${escapeHtml(guideValue(data.serviceCode))}</td></tr>
      <tr><td colspan="4">26 - Indicacao clinica<br>${escapeHtml(indication)}</td></tr>
      <tr><td colspan="2">27 - Exames / terapias solicitadas<br>${escapeHtml(guideValue(data.requestedExams))}</td><td>28 - Valor informado<br>${escapeHtml(guideValue(data.procedureValue))}</td><td>29 - Carater<br>${escapeHtml(guideValue(data.attendanceCharacter))}</td></tr>
    `
    : `
      <tr><td>21 - Tipo de consulta<br>${escapeHtml(guideValue(data.consultationType))}</td><td>22 - Tabela<br>${escapeHtml(guideValue(data.procedureTable))}</td><td>23 - Codigo do procedimento<br>${escapeHtml(guideValue(data.serviceCode, '10101012'))}</td><td>24 - Valor<br>${escapeHtml(guideValue(data.procedureValue))}</td></tr>
      <tr><td colspan="4">25 - Observacao / justificativa<br>${escapeHtml(indication)}</td></tr>
    `;

  return `
    <section class="guide-sheet">
      <div class="guide-head">
        <div>
          <strong>${escapeHtml(brandName || data.clinicName || 'Nucleus')}</strong>
          <span>Modelo para impressao conforme campos TISS/ANS</span>
        </div>
        <div class="guide-model">${isSadt ? 'SP/SADT' : 'Consulta'}</div>
      </div>
      <h1>${title}</h1>
      <table class="guide-table">
        <tbody>
          <tr><td>1 - Registro ANS<br>${escapeHtml(guideValue(data.operatorRegistry))}</td><td>2 - Numero da guia no prestador<br>${escapeHtml(guideValue(data.guideNumber))}</td><td>3 - Data da autorizacao<br>${escapeHtml(guideDate(data.authorizationDate || data.date))}</td><td>4 - Senha<br>${escapeHtml(guideValue(data.password))}</td></tr>
          <tr><td>5 - Validade da senha<br>${escapeHtml(guideDate(data.passwordValidUntil))}</td><td>6 - Numero da carteira<br>${escapeHtml(guideValue(data.cardNumber))}</td><td colspan="2">7 - Plano / convenio<br>${escapeHtml(guideValue(data.healthPlan, 'Particular'))}</td></tr>
          <tr><td colspan="2">8 - Nome do beneficiario<br>${escapeHtml(patient)}</td><td>9 - CPF<br>${escapeHtml(guideValue(data.patientCpf))}</td><td>10 - Atendimento a RN<br>Nao</td></tr>
          <tr><td>11 - Codigo na operadora / CNPJ<br>${escapeHtml(guideValue(data.contractedCode || data.issuerId))}</td><td colspan="2">12 - Nome do contratado<br>${escapeHtml(guideValue(data.clinicName || brandName))}</td><td>13 - Codigo CNES<br>${escapeHtml(guideValue(data.cnes))}</td></tr>
          <tr><td colspan="2">14 - Nome do profissional executante / solicitante<br>${escapeHtml(guideValue(data.professional))}</td><td>15 - Conselho<br>${escapeHtml(guideValue(data.professionalCouncil))}</td><td>16 - Numero / UF<br>${escapeHtml(guideValue(data.professionalCouncilNumber || data.crm))} ${escapeHtml(guideValue(data.councilUf, ''))}</td></tr>
          <tr><td>17 - CBO<br>${escapeHtml(guideValue(data.cbo))}</td><td>18 - Especialidade<br>${escapeHtml(guideValue(data.specialty))}</td><td>19 - Indicacao de acidente<br>${escapeHtml(guideValue(data.accidentIndicator))}</td><td>20 - Data do atendimento<br>${escapeHtml(guideDate(data.date))}</td></tr>
          ${rows}
          <tr><td colspan="2">Assinatura do beneficiario ou responsavel</td><td colspan="2">Assinatura do profissional / contratado</td></tr>
        </tbody>
      </table>
      <div class="guide-signatures">
        <div></div>
        <div></div>
      </div>
      <p class="guide-footer">Modelo baseado nos campos das guias enviadas. Conferir exigencias do convenio antes do envio.</p>
    </section>
  `;
}

function guidePrintCss() {
  return `
    body { margin: 0; background: #fff; color: #111827; font-family: Arial, sans-serif; }
    .guide-sheet { width: 1040px; margin: 18px auto; padding: 20px; }
    .guide-head { display: flex; justify-content: space-between; align-items: flex-start; border: 2px solid #111827; padding: 10px 12px; }
    .guide-head strong { display: block; font-size: 18px; }
    .guide-head span { display: block; color: #475569; font-size: 11px; margin-top: 3px; }
    .guide-model { border: 1px solid #111827; padding: 8px 14px; font-weight: 700; }
    h1 { font-size: 16px; text-align: center; margin: 14px 0; }
    .guide-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
    .guide-table td { border: 1px solid #111827; padding: 7px 8px; height: 36px; vertical-align: top; }
    .guide-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 54px; }
    .guide-signatures div { border-top: 1px solid #111827; height: 28px; }
    .guide-footer { margin-top: 20px; color: #475569; font-size: 10px; }
    @media print { .guide-sheet { width: auto; margin: 0; } }
  `;
}

function GuidePreview({ type, form, brandName }: { type: DocumentType; form: FormState; brandName: string }) {
  const isSadt = type === 'sp_sadt_guide' || type === 'service_guide';
  const title = isSadt ? 'GUIA DE SERVICO PROFISSIONAL / SP-SADT' : 'GUIA DE CONSULTA';
  const indication = guideValue(form.clinicalJustification || form.conduct || form.notes);
  const procedure = guideValue(form.serviceCode || (isSadt ? form.requestedExams : form.consultationType));

  return (
    <div className="mx-auto max-w-[980px] bg-white p-5 text-slate-900 shadow-card">
      <div className="flex items-start justify-between border-2 border-slate-900 p-3">
        <div>
          <div className="text-lg font-bold">{brandName || form.clinicName || 'Nucleus'}</div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500">Modelo para impressao conforme campos TISS/ANS</div>
        </div>
        <div className="border border-slate-900 px-4 py-2 text-sm font-bold">{isSadt ? 'SP/SADT' : 'Consulta'}</div>
      </div>
      <h3 className="my-4 text-center text-sm font-bold uppercase">{title}</h3>
      <div className="grid grid-cols-4 border-l border-t border-slate-800 text-[11px]">
        <GuideCell label="1 - Registro ANS" value={form.operatorRegistry} />
        <GuideCell label="2 - Numero da guia no prestador" value={form.guideNumber} />
        <GuideCell label="3 - Data da autorizacao" value={guideDate(form.authorizationDate || form.date)} />
        <GuideCell label="4 - Senha" value={form.password} />
        <GuideCell label="5 - Validade da senha" value={guideDate(form.passwordValidUntil)} />
        <GuideCell label="6 - Numero da carteira" value={form.cardNumber} />
        <GuideCell className="col-span-2" label="7 - Plano / convenio" value={form.healthPlan || 'Particular'} />
        <GuideCell className="col-span-2" label="8 - Nome do beneficiario" value={form.patientName} />
        <GuideCell label="9 - CPF" value={form.patientCpf} />
        <GuideCell label="10 - Atendimento a RN" value="Nao" />
        <GuideCell label="11 - Codigo contratado" value={form.contractedCode || form.issuerId} />
        <GuideCell className="col-span-2" label="12 - Nome do contratado" value={form.clinicName || brandName} />
        <GuideCell label="13 - Codigo CNES" value={form.cnes} />
        <GuideCell className="col-span-2" label="14 - Profissional executante / solicitante" value={form.professional} />
        <GuideCell label="15 - Conselho" value={form.professionalCouncil} />
        <GuideCell label="16 - Numero / UF" value={`${guideValue(form.professionalCouncilNumber || form.crm)} ${form.councilUf}`} />
        <GuideCell label="17 - CBO" value={form.cbo} />
        <GuideCell label="18 - Especialidade" value={form.specialty} />
        <GuideCell label="19 - Indicacao de acidente" value={form.accidentIndicator} />
        <GuideCell label="20 - Data do atendimento" value={guideDate(form.date)} />
        {isSadt ? (
          <>
            <GuideCell className="col-span-2" label="21 - Procedimentos, exames ou terapias solicitadas" value={procedure} />
            <GuideCell label="22 - Tabela" value={form.procedureTable} />
            <GuideCell label="23 - Valor informado" value={form.procedureValue} />
            <GuideCell className="col-span-4 min-h-[68px]" label="24 - Indicacao clinica" value={indication} />
          </>
        ) : (
          <>
            <GuideCell label="21 - Tipo de consulta" value={form.consultationType} />
            <GuideCell label="22 - Tabela" value={form.procedureTable} />
            <GuideCell label="23 - Codigo do procedimento" value={form.serviceCode || '10101012'} />
            <GuideCell label="24 - Valor" value={form.procedureValue} />
            <GuideCell className="col-span-4 min-h-[68px]" label="25 - Observacao / justificativa" value={indication} />
          </>
        )}
        <GuideCell className="col-span-2 min-h-[54px]" label="Assinatura do beneficiario ou responsavel" value="" />
        <GuideCell className="col-span-2 min-h-[54px]" label="Assinatura do profissional / contratado" value="" />
      </div>
      <p className="mt-3 text-[11px] text-slate-500">Modelo baseado nos PDFs enviados para impressao. Conferir regras do convenio antes do envio.</p>
    </div>
  );
}

function GuideCell({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`min-h-[46px] border-b border-r border-slate-800 p-2 ${className}`}>
      <div className="text-[10px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1 break-words font-semibold text-slate-900">{guideValue(value)}</div>
    </div>
  );
}

export default function CareDocuments() {
  const [searchParams] = useSearchParams();
  const { data: patients = [] } = usePatients();
  const { data: currentProfile } = useCurrentProfile();
  const brand = getBrandSettings();
  const [type, setType] = useState<DocumentType>('attestation');
  const [form, setForm] = useState<FormState>(initialForm);
  const allowedSpecialties = allowedSpecialtiesForProfile(currentProfile);
  const specialtyOptions = allowedSpecialties.length > 0 ? allowedSpecialties : SPECIALTIES;
  const resolveSpecialty = (value?: string | null) => {
    const specialty = canonicalSpecialty(value);
    return specialtyOptions.includes(specialty) ? specialty : specialtyOptions[0] ?? 'Clínica médica';
  };

  useEffect(() => {
    setForm(prev => ({ ...prev, specialty: resolveSpecialty(prev.specialty) }));
  }, [currentProfile?.specialty, currentProfile?.role]);

  const generatedText = useMemo(() => buildDocumentText(type, form.specialty, form), [type, form]);
  const selectedDocument = DOCUMENT_TYPES.find(item => item.id === type);

  const selectPatient = (patientId: string) => {
    const patient = patients.find((item: any) => item.id === patientId) as any;
    setForm(prev => ({
      ...prev,
      patientId,
      patientName: patient?.name ?? prev.patientName,
      patientCpf: patient?.cpf ?? prev.patientCpf,
      specialty: resolveSpecialty(patient?.specialty || prev.specialty),
    }));
  };

  useEffect(() => {
    const queryType = searchParams.get('type') as DocumentType | null;
    if (queryType && DOCUMENT_TYPES.some(item => item.id === queryType)) {
      setType(queryType);
    }
  }, [searchParams]);

  useEffect(() => {
    const patientId = searchParams.get('patient');
    if (!patientId || !patients.length) return;
    const patient = patients.find((item: any) => item.id === patientId) as any;
    if (!patient) return;
    setForm(prev => {
      if (prev.patientId === patientId) return prev;
      return {
        ...prev,
        patientId,
        patientName: patient.name ?? prev.patientName,
        patientCpf: patient.cpf ?? prev.patientCpf,
        specialty: resolveSpecialty(patient.specialty || prev.specialty),
      };
    });
  }, [searchParams, patients, currentProfile?.specialty, currentProfile?.role]);

  const setField = (key: keyof FormState, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const copyText = async () => navigator.clipboard.writeText(generatedText);

  const printDocument = () => {
    const title = selectedDocument?.label ?? 'Documento clinico';
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    if (['consultation_guide', 'sp_sadt_guide', 'service_guide'].includes(type)) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>${guidePrintCss()}</style>
          </head>
          <body>${buildGuideHtml(type, form, brand.businessName || 'Nucleus')}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 42px; line-height: 1.65; }
            .header { display:flex; justify-content:space-between; border-bottom:1px solid #dbe4ee; padding-bottom:18px; margin-bottom:36px; }
            .brand { font-size:20px; font-weight:700; }
            .subtitle { font-size:12px; color:#64748b; margin-top:4px; }
            h1 { text-align:center; font-size:20px; margin:0 0 32px; text-transform:uppercase; }
            .content { white-space:pre-wrap; font-size:15px; }
            .signature { margin-top:64px; text-align:center; }
            .line { width:320px; border-top:1px solid #0f172a; margin:0 auto 8px; }
            .seal { margin-top:14px; font-size:12px; color:#047857; font-weight:700; }
            .footer { position:fixed; left:42px; right:42px; bottom:24px; font-size:11px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div><div class="brand">${escapeHtml(form.clinicName || brand.businessName || 'Nucleus')}</div><div class="subtitle">${escapeHtml(brand.subtitle || 'Documento clinico')}</div></div>
            <div class="subtitle">${formatDate(form.date)}</div>
          </div>
          <h1>${escapeHtml(title)}</h1>
          <div class="content">${escapeHtml(generatedText)}</div>
          <div class="signature">
            <div class="line"></div>
            <div>${escapeHtml(form.professional || 'Profissional responsavel')}</div>
            <div class="subtitle">${escapeHtml([form.crm && `CRM ${form.crm}`, form.rqe && `RQE ${form.rqe}`].filter(Boolean).join(' - '))}</div>
            <div class="seal">${form.digitallySigned === 'validated' ? 'Assinatura digital validada' : 'Assinatura digital pendente'}</div>
          </div>
          <div class="footer">Documento gerado pelo Nucleus Care. A validade juridica da assinatura depende de certificado/integração de assinatura digital habilitada.</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-[1500px] mx-auto animate-slide-up">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documentos clinicos</h1>
          <p className="text-sm text-slate-500">Atestados, declaracoes, receitas, guias e solicitacoes por especialidade.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={copyText} className="btn-secondary"><Copy size={15} /> Copiar</button>
          <button onClick={printDocument} className="btn-primary"><Printer size={15} /> Imprimir</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        {DOCUMENT_TYPES.map(item => {
          const Icon = item.icon;
          const active = type === item.id;
          return (
            <button key={item.id} onClick={() => setType(item.id)} className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-card-md ${active ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-slate-100 bg-white text-slate-700'}`}>
              <Icon size={20} className={active ? 'text-primary-600' : 'text-slate-400'} />
              <div className="mt-3 font-semibold">{item.label}</div>
              <div className="mt-1 text-xs text-slate-500">{item.description}</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-primary-600" />
            <h2 className="section-title">Dados do documento</h2>
          </div>

          <div>
            <label className="label">Paciente cadastrado</label>
            <select className="input" value={form.patientId} onChange={event => selectPatient(event.target.value)}>
              <option value="">Selecionar paciente...</option>
              {patients.map((patient: any) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do paciente" value={form.patientName} onChange={value => setField('patientName', value)} placeholder="Nome completo" />
            <Field label="CPF" value={form.patientCpf} onChange={value => setField('patientCpf', value)} placeholder="000.000.000-00" />
            <SelectField label="Especialidade" value={form.specialty} onChange={value => setField('specialty', value)} options={specialtyOptions} />
            <Field label="Data" type="date" value={form.date} onChange={value => setField('date', value)} />
          </div>

          <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShieldCheck size={16} className="text-primary-600" /> Identificacao do emitente</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Profissional" value={form.professional} onChange={value => setField('professional', value)} placeholder="Ex: Dr. Miguel Vieira" />
              <Field label="CRM" value={form.crm} onChange={value => setField('crm', value)} placeholder="CRM/UF 000000" />
              <Field label="RQE" value={form.rqe} onChange={value => setField('rqe', value)} placeholder="RQE 00000" />
              <Field label="Identificacao emitente" value={form.issuerId} onChange={value => setField('issuerId', value)} placeholder="ID interno ou CPF/CNPJ" />
            </div>
            <Field label="Documento profissional" value={form.professionalDocument} onChange={value => setField('professionalDocument', value)} placeholder="Registro, conselho ou identificador adicional" />
          </div>

          <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Building2 size={16} className="text-primary-600" /> Local e assinatura</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Clinica / hospital" value={form.clinicName} onChange={value => setField('clinicName', value)} placeholder="Nome da instituicao" />
              <SelectField label="Modalidade" value={form.attendanceMode} onChange={value => setField('attendanceMode', value as FormState['attendanceMode'])} options={['presencial', 'online']} />
            </div>
            {form.attendanceMode === 'presencial' && (
              <Field label="Endereco do hospital/clinica" value={form.hospitalAddress} onChange={value => setField('hospitalAddress', value)} placeholder="Rua, numero, bairro, cidade/UF" />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="Assinatura digital" value={form.digitallySigned} onChange={value => setField('digitallySigned', value)} options={['validated', 'pending']} />
              <Field label="Codigo/hash da assinatura" value={form.signatureHash} onChange={value => setField('signatureHash', value)} placeholder="Opcional" />
            </div>
          </div>

          {(['service_guide', 'exam_authorization', 'sp_sadt_guide', 'hospitalization_guide', 'consultation_guide'] as DocumentType[]).includes(type) && (
            <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-900">Guia / convenio</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Plano / convenio" value={form.healthPlan} onChange={value => setField('healthPlan', value)} placeholder="Unimed, Bradesco, Particular..." />
                <Field label="Numero da guia" value={form.guideNumber} onChange={value => setField('guideNumber', value)} />
                <Field label="Registro ANS" value={form.operatorRegistry} onChange={value => setField('operatorRegistry', value)} placeholder="Codigo da operadora" />
                <Field label="Numero da carteira" value={form.cardNumber} onChange={value => setField('cardNumber', value)} />
                <Field label="Data da autorizacao" type="date" value={form.authorizationDate} onChange={value => setField('authorizationDate', value)} />
                <Field label="Autorizacao / senha" value={form.password} onChange={value => setField('password', value)} />
                <Field label="Validade da senha" type="date" value={form.passwordValidUntil} onChange={value => setField('passwordValidUntil', value)} />
                <Field label="Codigo contratado" value={form.contractedCode} onChange={value => setField('contractedCode', value)} />
                <Field label="CNES" value={form.cnes} onChange={value => setField('cnes', value)} />
                <Field label="Codigo do servico" value={form.serviceCode} onChange={value => setField('serviceCode', value)} />
                <Field label="Tabela" value={form.procedureTable} onChange={value => setField('procedureTable', value)} />
                <Field label="Valor do procedimento" value={form.procedureValue} onChange={value => setField('procedureValue', value)} placeholder="R$ 0,00" />
                <SelectField label="Tipo de consulta" value={form.consultationType} onChange={value => setField('consultationType', value)} options={['Primeira consulta', 'Retorno', 'Pre-natal', 'Por encaminhamento']} />
                <SelectField label="Carater do atendimento" value={form.attendanceCharacter} onChange={value => setField('attendanceCharacter', value)} options={['Eletivo', 'Urgencia/Emergencia']} />
                <SelectField label="Indicacao de acidente" value={form.accidentIndicator} onChange={value => setField('accidentIndicator', value)} options={['Nao acidente', 'Acidente de trabalho', 'Acidente de transito', 'Outros acidentes']} />
                <Field label="Dias de afastamento" type="number" value={form.restDays} onChange={value => setField('restDays', value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Conselho" value={form.professionalCouncil} onChange={value => setField('professionalCouncil', value)} />
                <Field label="Numero conselho" value={form.professionalCouncilNumber} onChange={value => setField('professionalCouncilNumber', value)} placeholder="Pode usar CRM" />
                <Field label="UF conselho" value={form.councilUf} onChange={value => setField('councilUf', value)} placeholder="CE" />
                <Field label="CBO" value={form.cbo} onChange={value => setField('cbo', value)} />
              </div>
              {type === 'consultation_guide' && (
                <a className="text-xs font-semibold text-primary-600 hover:underline" href="/templates/guia-de-consulta.pdf" target="_blank" rel="noreferrer">Abrir modelo PDF da Guia de Consulta</a>
              )}
              {(type === 'sp_sadt_guide' || type === 'service_guide') && (
                <a className="text-xs font-semibold text-primary-600 hover:underline" href="/templates/guia-sp-sadt.pdf" target="_blank" rel="noreferrer">Abrir modelo PDF da Guia SP/SADT</a>
              )}
            </div>
          )}

          <div>
            <label className="label">Conduta / recomendacao</label>
            <textarea className="input min-h-[96px] resize-none" value={form.conduct} onChange={event => setField('conduct', event.target.value)} placeholder={SPECIALTY_CONTEXT[form.specialty]?.conduct} />
          </div>

          {(['prescription', 'service_guide', 'sp_sadt_guide', 'hospitalization_guide'] as DocumentType[]).includes(type) && (
            <div>
              <label className="label">Prescricao / servico solicitado</label>
              <textarea className="input min-h-[110px] resize-none" value={form.prescription} onChange={event => setField('prescription', event.target.value)} placeholder={SPECIALTY_CONTEXT[form.specialty]?.prescription} />
            </div>
          )}

          {(['exam_authorization', 'sp_sadt_guide', 'hospitalization_guide', 'consultation_guide'] as DocumentType[]).includes(type) && (
            <>
              <div>
                <label className="label">Exames solicitados</label>
                <textarea className="input min-h-[110px] resize-none" value={form.requestedExams} onChange={event => setField('requestedExams', event.target.value)} placeholder={SPECIALTY_CONTEXT[form.specialty]?.exams} />
              </div>
              <div>
                <label className="label">Justificativa clinica</label>
                <textarea className="input min-h-[96px] resize-none" value={form.clinicalJustification} onChange={event => setField('clinicalJustification', event.target.value)} placeholder="Justifique a necessidade dos exames para aprovacao." />
              </div>
            </>
          )}

          <div>
            <label className="label">Observacoes</label>
            <textarea className="input min-h-[90px] resize-none" value={form.notes} onChange={event => setField('notes', event.target.value)} placeholder="Informacoes complementares..." />
          </div>

          <button onClick={printDocument} className="btn-primary w-full justify-center"><Save size={15} /> Gerar documento</button>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="section-title">Previa do documento</h2>
            <p className="section-subtitle">O texto muda conforme o tipo, especialidade, CRM/RQE e dados do emitente.</p>
          </div>
          <div className="bg-slate-50 p-4 sm:p-8">
            {['consultation_guide', 'sp_sadt_guide', 'service_guide'].includes(type) ? (
              <GuidePreview type={type} form={form} brandName={brand.businessName || 'Nucleus'} />
            ) : (
              <div className="mx-auto min-h-[780px] max-w-[820px] bg-white p-8 shadow-card">
                <div className="flex items-start justify-between border-b border-slate-200 pb-5">
                  <div>
                    <div className="text-xl font-bold text-slate-900">{form.clinicName || brand.businessName || 'Nucleus'}</div>
                    <div className="text-xs uppercase tracking-widest text-slate-400">{brand.subtitle || 'Documento clinico'}</div>
                    {form.hospitalAddress && <div className="mt-1 text-xs text-slate-500">{form.hospitalAddress}</div>}
                  </div>
                  <div className="text-sm text-slate-500">{formatDate(form.date)}</div>
                </div>
                <h3 className="mt-10 text-center text-lg font-bold uppercase tracking-wide text-slate-900">{selectedDocument?.label}</h3>
                <div className="mt-8 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{generatedText}</div>
                <div className="mt-16 text-center">
                  <div className="mx-auto mb-2 w-72 border-t border-slate-800" />
                  <div className="text-sm font-semibold text-slate-800">{form.professional || 'Profissional responsavel'}</div>
                  <div className="text-xs text-slate-500">{[form.crm && `CRM ${form.crm}`, form.rqe && `RQE ${form.rqe}`].filter(Boolean).join(' - ')}</div>
                  <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${form.digitallySigned === 'validated' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    <ShieldCheck size={13} /> {form.digitallySigned === 'validated' ? 'Assinatura digital validada' : 'Assinatura pendente'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}
