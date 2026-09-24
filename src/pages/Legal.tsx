import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const content = {
  privacy: [
    ['Dados tratados', 'A Nucleus trata dados de cadastro, contato, uso da plataforma, dados financeiros e dados de saúde inseridos por profissionais e instituições autorizadas.'],
    ['Finalidades', 'Os dados são usados para autenticação, agenda, prontuário, documentos clínicos, cobranças, comunicação, suporte, segurança, auditoria e cumprimento de obrigações legais.'],
    ['Dados de pacientes', 'O profissional ou a instituição de saúde é responsável pela origem legítima dos dados e pelas autorizações aplicáveis. A Nucleus atua como operadora ao prestar o serviço contratado.'],
    ['Compartilhamento', 'Informações podem ser processadas por fornecedores necessários à operação, sob obrigações de segurança e confidencialidade.'],
    ['Segurança e conservação', 'A plataforma utiliza conexão segura, controle de acesso, segregação por clínica, registros de auditoria e políticas de banco.'],
    ['Direitos do titular', 'O titular pode exercer os direitos previstos na LGPD, observadas as obrigações legais de guarda.'],
  ],
  terms: [
    ['Uso da plataforma', 'A Nucleus fornece ferramentas administrativas e clínicas de apoio. O usuário deve proteger suas credenciais e respeitar a legislação profissional.'],
    ['Responsabilidade clínica', 'Sugestões, cálculos e inteligência artificial não substituem avaliação profissional. Diagnósticos, prescrições e condutas são de responsabilidade do profissional habilitado.'],
    ['Dados e conteúdo', 'O usuário é responsável pela exatidão e legitimidade das informações inseridas e deve respeitar sigilo profissional e LGPD.'],
    ['Disponibilidade e integrações', 'Serviços externos podem sofrer indisponibilidade ou mudanças. A Nucleus emprega esforços razoáveis de continuidade e recuperação.'],
    ['Plano e cancelamento', 'Recursos, limites, cobrança e cancelamento seguem o plano contratado. Dados sujeitos a guarda legal respeitam o prazo obrigatório.'],
    ['Propriedade intelectual', 'A contratação concede licença limitada de uso; código, marca e materiais permanecem protegidos.'],
  ],
};

export default function LegalPage({ type }: { type: 'privacy' | 'terms' }) {
  const title = type === 'privacy' ? 'Política de Privacidade' : 'Termos de Uso';
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800">
      <article className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
        <Link to="/" className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-emerald-700"><ArrowLeft size={16} /> Voltar</Link>
        <div className="mb-8 flex items-start gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><ShieldCheck size={24} /></div>
          <div><h1 className="text-2xl font-bold text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-500">Nucleus • Atualizado em 15 de junho de 2026</p></div>
        </div>
        <div className="space-y-7">
          {content[type].map(([heading, body], index) => <section key={heading}><h2 className="font-semibold text-slate-950">{index + 1}. {heading}</h2><p className="mt-2 leading-7 text-slate-600">{body}</p></section>)}
        </div>
        <div className="mt-9 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Documento-base operacional. A identificação da empresa, o canal de privacidade e a revisão jurídica final devem ser validados antes do lançamento comercial.
        </div>
      </article>
    </main>
  );
}
