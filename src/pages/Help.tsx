import { BookOpen, HelpCircle, Mail, MessageCircle, Search, Shield, Stethoscope, Users } from 'lucide-react';

const FAQS = [
  {
    category: 'Primeiros passos',
    icon: BookOpen,
    questions: [
      ['Como cadastrar um paciente?', 'Acesse Nucleus Care > Pacientes, clique em Novo Paciente, preencha os campos obrigatórios e salve.'],
      ['Como criar um agendamento?', 'Vá em Nucleus Care > Agenda, clique em Agendar e informe paciente, data, horário, profissional e tipo de atendimento.'],
      ['Como abrir o prontuário?', 'Na lista de Pacientes ou na busca global, clique em Prontuário para abrir a ficha clínica do paciente.'],
    ],
  },
  {
    category: 'CRM e pipeline',
    icon: Users,
    questions: [
      ['Como mover um lead no pipeline?', 'Abra Nucleus CRM > Pipeline e arraste o card para a coluna desejada ou edite o lead pela lista.'],
      ['Como usar os filtros?', 'Use Filtros para limitar por período, temperatura, status, responsável e comparação de período.'],
      ['Onde vejo valor de fechamento?', 'No Pipeline Comercial, os cards e indicadores exibem o valor informado para cada oportunidade.'],
    ],
  },
  {
    category: 'Prontuários',
    icon: Stethoscope,
    questions: [
      ['Os prontuários mudam por especialidade?', 'Sim. Cada área pode ter campos, hipóteses, CIDs, exames e modelos clínicos específicos.'],
      ['Como imprimir uma evolução?', 'Abra o prontuário, revise a evolução e clique em Imprimir para gerar a versão limpa para o médico.'],
      ['A IA substitui decisão clínica?', 'Não. As sugestões ajudam na organização, mas a decisão clínica é sempre do profissional responsável.'],
    ],
  },
  {
    category: 'Conta e segurança',
    icon: Shield,
    questions: [
      ['Como convidar usuários?', 'Acesse Admin, clique em Convidar Usuário e defina o perfil de acesso.'],
      ['Como redefinir senha?', 'Na tela de login, clique em Esqueci minha senha e use o link enviado por e-mail.'],
      ['O paciente vê o painel profissional?', 'Não. O Nucleus Paciente abre em uma área separada, sem menu lateral administrativo.'],
    ],
  },
];

export default function Help() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Ajuda</h2>
        <p className="text-sm text-slate-500 mt-1">
          Perguntas frequentes sobre uso da plataforma, CRM, prontuário, agenda e segurança.
        </p>
      </div>

      <div className="card p-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Buscar por pacientes, prontuário, agenda, pipeline, senha..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {FAQS.map(section => {
          const Icon = section.icon;
          return (
            <div key={section.category} className="card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <h3 className="section-title">{section.category}</h3>
              </div>
              <div className="space-y-3">
                {section.questions.map(([question, answer]) => (
                  <details key={question} className="group rounded-xl border border-slate-100 p-4 open:bg-slate-50">
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-800">{question}</span>
                      <HelpCircle size={15} className="text-slate-400 group-open:text-primary-600" />
                    </summary>
                    <p className="text-sm text-slate-500 mt-3 leading-relaxed">{answer}</p>
                  </details>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-5 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="section-title">Precisa de suporte humano?</h3>
          <p className="text-sm text-slate-500 mt-1">Entre em contato com a equipe da plataforma para dúvidas operacionais.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Mail size={16} /> E-mail</button>
          <button className="btn-primary"><MessageCircle size={16} /> WhatsApp</button>
        </div>
      </div>
    </div>
  );
}
