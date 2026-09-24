import { useState } from 'react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Plus, ChevronDown, ChevronRight, Save, Brain,
  Activity, User, Clipboard, Pill, Heart, Upload, Printer,
  Send, Clock, Edit3, CheckCircle2, Loader2, AlertCircle, Trash2,
} from 'lucide-react';
import { usePatients } from '../hooks/usePatients';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { medicalRecordsDb } from '../lib/db';
import { SPECIALTIES as ALL_SPECIALTIES, allowedSpecialtiesForProfile, canonicalSpecialty } from '../lib/specialties';
import type { Patient } from '../types';

/* ── Specialty templates ────────────────────────────────────── */
const SPECIALTIES = ALL_SPECIALTIES;

const PEDIATRIC_VACCINE_SCHEDULE = [
  { age: 'Ao nascer', vaccines: [
    { id: 'birth-hepb', name: 'Hepatite B', dose: '1 dose' },
    { id: 'birth-bcg', name: 'BCG', dose: '1 dose' },
  ]},
  { age: '2 meses', vaccines: [
    { id: '2m-penta-1', name: 'Penta (DTP + Hib + HB)', dose: '1ª dose' },
    { id: '2m-vip-1', name: 'VIP - Poliomielite inativada', dose: '1ª dose' },
    { id: '2m-pneumo10-1', name: 'Pneumocócica 10-valente', dose: '1ª dose' },
    { id: '2m-rota-1', name: 'Rotavírus humano', dose: '1ª dose' },
  ]},
  { age: '3 meses', vaccines: [
    { id: '3m-meningococica-c-1', name: 'Meningocócica C', dose: '1ª dose' },
  ]},
  { age: '4 meses', vaccines: [
    { id: '4m-penta-2', name: 'Penta (DTP + Hib + HB)', dose: '2ª dose' },
    { id: '4m-vip-2', name: 'VIP - Poliomielite inativada', dose: '2ª dose' },
    { id: '4m-pneumo10-2', name: 'Pneumocócica 10-valente', dose: '2ª dose' },
    { id: '4m-rota-2', name: 'Rotavírus humano', dose: '2ª dose' },
  ]},
  { age: '5 meses', vaccines: [
    { id: '5m-meningococica-c-2', name: 'Meningocócica C', dose: '2ª dose' },
  ]},
  { age: '6 meses', vaccines: [
    { id: '6m-penta-3', name: 'Penta (DTP + Hib + HB)', dose: '3ª dose' },
    { id: '6m-vip-3', name: 'VIP - Poliomielite inativada', dose: '3ª dose' },
    { id: '6m-influenza', name: 'Influenza trivalente', dose: '1ª dose / anual' },
    { id: '6m-covid-1', name: 'COVID-19', dose: '1ª dose' },
  ]},
  { age: '6 a 8 meses', vaccines: [
    { id: '6to8m-yellow-fever-exceptional', name: 'Febre amarela', dose: '1 dose em casos excepcionais' },
  ]},
  { age: '7 meses', vaccines: [
    { id: '7m-covid-2', name: 'COVID-19', dose: '2ª dose' },
  ]},
  { age: '9 meses', vaccines: [
    { id: '9m-covid-3', name: 'COVID-19', dose: '3ª dose, conforme vacina usada' },
    { id: '9m-yellow-fever', name: 'Febre amarela', dose: '1 dose' },
  ]},
  { age: '12 meses', vaccines: [
    { id: '12m-pneumo10-booster', name: 'Pneumocócica 10-valente', dose: 'Reforço' },
    { id: '12m-meningococica-acwy', name: 'Meningocócica ACWY', dose: '1 dose' },
    { id: '12m-scr-1', name: 'Tríplice viral (SCR)', dose: '1ª dose' },
  ]},
  { age: '15 meses', vaccines: [
    { id: '15m-dtp-booster-1', name: 'DTP', dose: '1º reforço' },
    { id: '15m-vip-booster', name: 'VIP - Poliomielite inativada', dose: 'Reforço' },
    { id: '15m-scr-2', name: 'Tríplice viral (SCR)', dose: '2ª dose' },
    { id: '15m-varicella-1', name: 'Varicela', dose: '1ª dose' },
    { id: '15m-hepa', name: 'Hepatite A', dose: '1 dose' },
  ]},
  { age: '4 anos', vaccines: [
    { id: '4y-dtp-booster-2', name: 'DTP', dose: '2º reforço' },
    { id: '4y-yellow-fever-booster', name: 'Febre amarela', dose: 'Reforço' },
    { id: '4y-varicella-2', name: 'Varicela', dose: '2ª dose' },
  ]},
  { age: '5 anos', vaccines: [
    { id: '5y-pneumo23-indigenous', name: 'Pneumocócica 23-valente', dose: '1 dose, somente indígena sem histórico vacinal com pneumo conjugada' },
  ]},
  { age: 'A partir de 7 anos', vaccines: [
    { id: '7y-dt', name: 'dT', dose: '3 doses conforme histórico vacinal / reforços' },
  ]},
  { age: '9 a 14 anos', vaccines: [
    { id: '9to14-hpv4', name: 'HPV4', dose: '1 dose' },
  ]},
];

const DSM_DOMAIN_OPTIONS = [
  'Neurodesenvolvimento',
  'Espectro da esquizofrenia e outros transtornos psicóticos',
  'Bipolar e relacionados',
  'Depressivos',
  'Ansiedade',
  'Obsessivo-compulsivo e relacionados',
  'Trauma e estressores',
  'Dissociativos',
  'Sintomas somáticos e relacionados',
  'Alimentares',
  'Sono-vigília',
  'Uso de substâncias e aditivos',
  'Neurocognitivos',
  'Personalidade',
  'Controle de impulsos e conduta',
  'Outras condições foco de atenção clínica',
];

const PSYCHOLOGY_SCREENING_OPTIONS = [
  'PHQ-9',
  'GAD-7',
  'BAI',
  'BDI-II',
  'PCL-5',
  'ASRS-18',
  'MDQ',
  'Y-BOCS',
  'AUDIT',
  'DAST-10',
  'MoCA',
  'Mini Exame do Estado Mental',
  'Escala Columbia de risco suicida',
];

const DSM_SUBSPECIALTY_GUIDANCE: Record<string, string[]> = {
  'Neurodesenvolvimento': [
    'Neuropsicologia',
    'Psicologia infantil/adolescente',
    'Terapia comportamental',
    'Terapia ocupacional',
    'Fonoaudiologia',
    'Psiquiatria infantil',
  ],
  'Espectro da esquizofrenia e outros transtornos psicóticos': [
    'Psiquiatria',
    'Psicologia clínica',
    'Reabilitação psicossocial',
    'Terapia familiar',
    'Psicoeducação e adesão terapêutica',
  ],
  'Bipolar e relacionados': [
    'Psiquiatria',
    'Psicoterapia de apoio',
    'Terapia cognitivo-comportamental',
    'Psicoeducação familiar',
    'Manejo de sono e rotina',
  ],
  Depressivos: [
    'Psicologia clínica',
    'Terapia cognitivo-comportamental',
    'Terapia interpessoal',
    'Psiquiatria',
    'Prevenção de recaída',
    'Manejo de risco suicida',
  ],
  Ansiedade: [
    'Terapia cognitivo-comportamental',
    'Terapia de exposição',
    'Psicologia clínica',
    'Psiquiatria',
    'Manejo de pânico e fobias',
    'Treino de regulação emocional',
  ],
  'Obsessivo-compulsivo e relacionados': [
    'TCC com exposição e prevenção de resposta',
    'Psiquiatria',
    'Psicologia clínica',
    'Terapia familiar/psicoeducação',
    'Manejo de compulsões e rituais',
  ],
  'Trauma e estressores': [
    'Psicoterapia focada em trauma',
    'EMDR',
    'TCC focada em trauma',
    'Psiquiatria',
    'Intervenção em crise',
    'Terapia familiar quando indicado',
  ],
  Dissociativos: [
    'Psicoterapia focada em trauma',
    'Psicologia clínica',
    'Psiquiatria',
    'Estabilização e manejo de dissociação',
    'Avaliação de segurança',
  ],
  'Sintomas somáticos e relacionados': [
    'Psicologia da saúde',
    'TCC',
    'Psiquiatria',
    'Medicina de família/clínica médica',
    'Manejo interdisciplinar de dor',
  ],
  Alimentares: [
    'Psicoterapia para transtornos alimentares',
    'Nutrição comportamental',
    'Psiquiatria',
    'Terapia familiar',
    'Clínica médica/endocrinologia quando indicado',
  ],
  'Sono-vigília': [
    'TCC para insônia',
    'Medicina do sono',
    'Psiquiatria',
    'Psicologia clínica',
    'Higiene do sono e manejo de rotina',
  ],
  'Uso de substâncias e aditivos': [
    'Dependência química',
    'Entrevista motivacional',
    'Psiquiatria',
    'Redução de danos',
    'Terapia de grupo',
    'Rede familiar/social de apoio',
  ],
  Neurocognitivos: [
    'Neuropsicologia',
    'Psiquiatria geriátrica',
    'Neurologia',
    'Terapia ocupacional',
    'Reabilitação cognitiva',
    'Orientação familiar/cuidador',
  ],
  Personalidade: [
    'Terapia dialética comportamental',
    'Terapia do esquema',
    'Psicoterapia psicodinâmica',
    'Psiquiatria quando indicado',
    'Treino de habilidades interpessoais',
  ],
  'Controle de impulsos e conduta': [
    'Terapia comportamental',
    'Treino parental',
    'Psicologia infantil/adolescente',
    'Psiquiatria infantil/adolescente',
    'Terapia familiar',
  ],
  'Outras condições foco de atenção clínica': [
    'Aconselhamento psicológico',
    'Terapia familiar/casal',
    'Psicologia da saúde',
    'Orientação parental',
    'Intervenção psicossocial breve',
  ],
};

const PSYCHOLOGY_TESTS: Record<string, {
  title: string;
  note: string;
  scale: Array<{ value: number; label: string }>;
  items: string[];
  scoreLabel: (score: number) => string;
  restricted?: boolean;
}> = {
  'PHQ-9': {
    title: 'Triagem de sintomas depressivos',
    note: 'Roteiro de apoio baseado nos domínios do PHQ-9. Para uso formal, mantenha a versão oficial adotada pela clínica.',
    scale: [
      { value: 0, label: 'Nunca' },
      { value: 1, label: 'Alguns dias' },
      { value: 2, label: 'Mais da metade dos dias' },
      { value: 3, label: 'Quase todos os dias' },
    ],
    items: [
      'Pouco interesse ou prazer nas atividades.',
      'Humor triste, deprimido ou sem esperança.',
      'Alterações de sono.',
      'Cansaço ou baixa energia.',
      'Alterações de apetite.',
      'Sentimento de culpa, fracasso ou desvalia.',
      'Dificuldade de concentração.',
      'Lentificação ou agitação percebida.',
      'Pensamentos de morte ou autoagressão.',
    ],
    scoreLabel: score => score >= 20 ? 'grave' : score >= 15 ? 'moderado a grave' : score >= 10 ? 'moderado' : score >= 5 ? 'leve' : 'mínimo',
  },
  'GAD-7': {
    title: 'Triagem de ansiedade',
    note: 'Roteiro de apoio baseado nos domínios do GAD-7. Não substitui entrevista clínica.',
    scale: [
      { value: 0, label: 'Nunca' },
      { value: 1, label: 'Alguns dias' },
      { value: 2, label: 'Mais da metade dos dias' },
      { value: 3, label: 'Quase todos os dias' },
    ],
    items: [
      'Nervosismo, ansiedade ou tensão.',
      'Dificuldade para controlar preocupações.',
      'Preocupação excessiva com diferentes temas.',
      'Dificuldade para relaxar.',
      'Inquietação ou sensação de não conseguir parar.',
      'Irritabilidade aumentada.',
      'Medo de que algo ruim aconteça.',
    ],
    scoreLabel: score => score >= 15 ? 'grave' : score >= 10 ? 'moderado' : score >= 5 ? 'leve' : 'mínimo',
  },
  'PCL-5': {
    title: 'Triagem de sintomas pós-traumáticos',
    note: 'Roteiro autoral pelos domínios de TEPT. Use a escala oficial quando a clínica tiver permissão/protocolo.',
    scale: [
      { value: 0, label: 'Nada' },
      { value: 1, label: 'Pouco' },
      { value: 2, label: 'Moderado' },
      { value: 3, label: 'Muito' },
      { value: 4, label: 'Extremo' },
    ],
    items: [
      'Recordações intrusivas ou imagens do evento.',
      'Pesadelos ou sofrimento ao lembrar.',
      'Evitação de lembranças, locais ou conversas.',
      'Culpa, medo, vergonha ou crenças negativas persistentes.',
      'Hipervigilância, sobressaltos ou irritabilidade.',
      'Prejuízo no sono, concentração ou funcionamento.',
    ],
    scoreLabel: score => score >= 18 ? 'alto' : score >= 10 ? 'moderado' : score >= 4 ? 'leve' : 'baixo',
  },
  'ASRS-18': {
    title: 'Triagem de atenção e hiperatividade',
    note: 'Roteiro de apoio por domínios de desatenção, impulsividade e hiperatividade.',
    scale: [
      { value: 0, label: 'Nunca' },
      { value: 1, label: 'Raramente' },
      { value: 2, label: 'Às vezes' },
      { value: 3, label: 'Frequentemente' },
      { value: 4, label: 'Muito frequentemente' },
    ],
    items: [
      'Dificuldade para finalizar tarefas.',
      'Dificuldade de organização.',
      'Evita tarefas que exigem esforço mental prolongado.',
      'Perde objetos ou esquece compromissos.',
      'Distrai-se facilmente.',
      'Inquietação física ou mental.',
      'Age ou fala de forma impulsiva.',
      'Dificuldade para esperar sua vez.',
    ],
    scoreLabel: score => score >= 24 ? 'alto' : score >= 14 ? 'moderado' : score >= 6 ? 'leve' : 'baixo',
  },
  'AUDIT': {
    title: 'Triagem de uso de álcool',
    note: 'Roteiro de apoio. Para aplicação formal, utilize a versão oficial adotada no serviço.',
    scale: [
      { value: 0, label: 'Nunca' },
      { value: 1, label: 'Raramente' },
      { value: 2, label: 'Às vezes' },
      { value: 3, label: 'Frequentemente' },
      { value: 4, label: 'Muito frequentemente' },
    ],
    items: [
      'Consumo de álcool em frequência relevante.',
      'Episódios de consumo em grande quantidade.',
      'Dificuldade para reduzir ou interromper o uso.',
      'Prejuízo em responsabilidades ou rotina.',
      'Culpa, esquecimento, acidentes ou conflitos relacionados.',
      'Preocupação de familiares ou terceiros com o uso.',
    ],
    scoreLabel: score => score >= 16 ? 'alto risco' : score >= 8 ? 'risco aumentado' : score >= 4 ? 'atenção' : 'baixo risco',
  },
  'DAST-10': {
    title: 'Triagem de uso de substâncias',
    note: 'Roteiro de apoio para substâncias não alcoólicas.',
    scale: [
      { value: 0, label: 'Não' },
      { value: 1, label: 'Sim' },
    ],
    items: [
      'Uso de substâncias além do prescrito ou combinado.',
      'Dificuldade para controlar ou reduzir o uso.',
      'Prejuízo em trabalho, estudo, família ou saúde.',
      'Situações de risco associadas ao uso.',
      'Conflitos, culpa ou preocupação de terceiros.',
      'Sintomas de abstinência ou fissura.',
    ],
    scoreLabel: score => score >= 5 ? 'alto' : score >= 3 ? 'moderado' : score >= 1 ? 'leve' : 'baixo',
  },
  'MDQ': {
    title: 'Triagem de sintomas de humor elevado/hipomania',
    note: 'Roteiro de apoio. Investigue duração, prejuízo e diferencial antes de formular hipótese.',
    scale: [
      { value: 0, label: 'Não' },
      { value: 1, label: 'Sim' },
    ],
    items: [
      'Períodos de energia ou atividade muito aumentada.',
      'Redução da necessidade de sono sem cansaço.',
      'Fala acelerada ou pensamentos muito rápidos.',
      'Impulsividade, gastos, riscos ou decisões incomuns.',
      'Aumento incomum de autoconfiança ou grandiosidade.',
      'Impacto em relações, trabalho, estudos ou segurança.',
    ],
    scoreLabel: score => score >= 4 ? 'sugere investigar bipolaridade' : score >= 2 ? 'atenção clínica' : 'baixo',
  },
  'Y-BOCS': {
    title: 'Triagem de obsessões e compulsões',
    note: 'Roteiro de apoio por domínios. A escala oficial tem aplicação e pontuação próprias.',
    scale: [
      { value: 0, label: 'Ausente' },
      { value: 1, label: 'Leve' },
      { value: 2, label: 'Moderado' },
      { value: 3, label: 'Intenso' },
      { value: 4, label: 'Extremo' },
    ],
    items: [
      'Pensamentos intrusivos recorrentes.',
      'Tempo gasto com obsessões ou compulsões.',
      'Sofrimento provocado pelos sintomas.',
      'Interferência na rotina ou relações.',
      'Resistência aos sintomas.',
      'Controle percebido sobre os sintomas.',
    ],
    scoreLabel: score => score >= 18 ? 'alto' : score >= 10 ? 'moderado' : score >= 4 ? 'leve' : 'baixo',
  },
  'Escala Columbia de risco suicida': {
    title: 'Triagem de risco suicida',
    note: 'Roteiro clínico de segurança. Não reproduz a C-SSRS oficial. Se houver risco atual, siga protocolo de crise.',
    scale: [
      { value: 0, label: 'Não' },
      { value: 1, label: 'Sim' },
    ],
    items: [
      'Pensamentos de morte ou de não querer viver.',
      'Ideação suicida atual.',
      'Plano, intenção ou acesso a meios.',
      'Tentativa anterior ou comportamento preparatório.',
      'Uso de substâncias, impulsividade ou desesperança intensa.',
      'Fatores de proteção frágeis ou ausentes.',
    ],
    scoreLabel: score => score >= 3 ? 'risco elevado, exige plano de segurança' : score >= 1 ? 'risco presente, investigar imediatamente' : 'sem risco referido',
  },
  'BDI-II': {
    title: 'BDI-II',
    note: 'Instrumento proprietário/licenciado. Registre aqui o escore aplicado externamente com material autorizado.',
    scale: [],
    items: [],
    scoreLabel: score => `escore informado: ${score}`,
    restricted: true,
  },
  'BAI': {
    title: 'BAI',
    note: 'Instrumento proprietário/licenciado. Registre aqui o escore aplicado externamente com material autorizado.',
    scale: [],
    items: [],
    scoreLabel: score => `escore informado: ${score}`,
    restricted: true,
  },
  'MoCA': {
    title: 'MoCA',
    note: 'Instrumento protegido. A aplicação clínica exige treinamento/certificação conforme regras do MoCA.',
    scale: [],
    items: [],
    scoreLabel: score => `escore informado: ${score}`,
    restricted: true,
  },
  'Mini Exame do Estado Mental': {
    title: 'Mini Exame do Estado Mental',
    note: 'Instrumento com versões e direitos variáveis. Registre o escore da versão autorizada adotada pela clínica.',
    scale: [],
    items: [],
    scoreLabel: score => `escore informado: ${score}`,
    restricted: true,
  },
};

const DIAGNOSIS_SUGGESTIONS = [
  { cid: 'F41.1', label: 'Ansiedade generalizada', specialties: ['Psicologia','Psiquiatria'], keywords: ['ansiedade','preocupacao','preocupação','nervosismo','tensao','tensão','panico','pânico'] },
  { cid: 'F32.9', label: 'Episódio depressivo não especificado', specialties: ['Psicologia','Psiquiatria'], keywords: ['depressao','depressão','tristeza','anedonia','desanimo','desânimo','humor deprimido'] },
  { cid: 'F43.2', label: 'Transtornos de adaptação', specialties: ['Psicologia','Psiquiatria'], keywords: ['adaptacao','adaptação','luto','estresse','mudanca','mudança','separacao','separação'] },
  { cid: 'F90.0', label: 'Distúrbios da atividade e da atenção', specialties: ['Pediatria','Psicologia','Psiquiatria'], keywords: ['tdah','atenção','atencao','hiperatividade','impulsividade','concentracao','concentração'] },
  { cid: 'J06.9', label: 'Infecção aguda das vias aéreas superiores não especificada', specialties: ['Pediatria','Clínica médica','Medicina'], keywords: ['tosse','coriza','resfriado','gripe','congestao','congestão','rinorreia'] },
  { cid: 'R50.9', label: 'Febre não especificada', specialties: ['Pediatria','Clínica médica','Medicina'], keywords: ['febre','febril','temperatura'] },
  { cid: 'J03.9', label: 'Amigdalite aguda não especificada', specialties: ['Pediatria','Clínica médica','Medicina'], keywords: ['garganta','amigdala','amígdala','odinofagia','dor ao engolir'] },
  { cid: 'H66.9', label: 'Otite média não especificada', specialties: ['Pediatria','Clínica médica','Medicina'], keywords: ['ouvido','otalgia','otite','dor de ouvido'] },
  { cid: 'A09', label: 'Diarreia e gastroenterite de origem infecciosa presumível', specialties: ['Pediatria','Clínica médica','Medicina'], keywords: ['diarreia','gastroenterite','vomito','vômito','nausea','náusea'] },
  { cid: 'E66.9', label: 'Obesidade não especificada', specialties: ['Nutrição','Endocrinologia','Clínica médica','Medicina','Pediatria'], keywords: ['obesidade','imc alto','sobrepeso','ganho de peso'] },
  { cid: 'E11.9', label: 'Diabetes mellitus tipo 2 sem complicações', specialties: ['Endocrinologia','Nutrição','Clínica médica','Medicina'], keywords: ['diabetes','glicemia','hiperglicemia','hemoglobina glicada'] },
  { cid: 'E03.9', label: 'Hipotireoidismo não especificado', specialties: ['Endocrinologia','Clínica médica','Medicina'], keywords: ['hipotireoidismo','tsh','cansaco','cansaço','sonolencia','sonolência'] },
  { cid: 'I10', label: 'Hipertensão essencial primária', specialties: ['Cardiologia','Clínica médica','Medicina','Nutrição'], keywords: ['hipertensao','hipertensão','pressao alta','pressão alta','pa elevada'] },
  { cid: 'R07.4', label: 'Dor torácica não especificada', specialties: ['Cardiologia','Clínica médica','Medicina'], keywords: ['dor toracica','dor torácica','dor no peito','precordialgia'] },
  { cid: 'M54.5', label: 'Dor lombar baixa', specialties: ['Fisioterapia','Ortopedia','Clínica médica','Medicina'], keywords: ['lombar','lombalgia','dor nas costas','coluna'] },
  { cid: 'M25.5', label: 'Dor articular', specialties: ['Fisioterapia','Ortopedia','Clínica médica','Medicina'], keywords: ['articulacao','articulação','joelho','ombro','quadril','dor articular'] },
  { cid: 'S93.4', label: 'Entorse e distensão do tornozelo', specialties: ['Fisioterapia','Ortopedia'], keywords: ['entorse','tornozelo','inversao','inversão'] },
  { cid: 'L70.9', label: 'Acne não especificada', specialties: ['Dermatologia','Clínica médica','Medicina'], keywords: ['acne','cravos','espinhas'] },
  { cid: 'L20.9', label: 'Dermatite atópica não especificada', specialties: ['Dermatologia','Pediatria','Clínica médica','Medicina'], keywords: ['dermatite','atopica','atópica','coceira','prurido','eczema'] },
  { cid: 'N76.0', label: 'Vaginite aguda', specialties: ['Ginecologia','Clínica médica','Medicina'], keywords: ['corrimento','vaginite','prurido vaginal','ardencia vaginal','ardência vaginal'] },
  { cid: 'N94.6', label: 'Dismenorreia não especificada', specialties: ['Ginecologia'], keywords: ['colica','cólica','menstrual','dismenorreia'] },
  { cid: 'R10.2', label: 'Dor pélvica e perineal', specialties: ['Ginecologia','Clínica médica','Medicina'], keywords: ['dor pelvica','dor pélvica','regiao pelvica','região pélvica','pelve','perineal','baixo ventre','dor baixo ventre'] },
  { cid: 'N94.8', label: 'Outras afecções especificadas associadas aos órgãos genitais femininos e ao ciclo menstrual', specialties: ['Ginecologia'], keywords: ['dor pelvica','dor pélvica','dor ginecologica','dor ginecológica','dor ovario','dor ovário'] },
  { cid: 'N73.9', label: 'Doença inflamatória pélvica feminina não especificada', specialties: ['Ginecologia'], keywords: ['dor pelvica','dor pélvica','dip','doenca inflamatoria pelvica','doença inflamatória pélvica','febre pelvica','febre pélvica'] },
  { cid: 'K02.9', label: 'Cárie dentária não especificada', specialties: ['Odontologia'], keywords: ['carie','cárie','dor de dente','cavitacao','cavitação'] },
  { cid: 'K05.1', label: 'Gengivite crônica', specialties: ['Odontologia'], keywords: ['gengiva','gengivite','sangramento gengival'] },
  { cid: 'I20.9', label: 'Angina pectoris não especificada', specialties: ['Cardiologia'], keywords: ['angina','dor aos esforcos','dor aos esforços','aperto no peito'] },
  { cid: 'I49.9', label: 'Arritmia cardíaca não especificada', specialties: ['Cardiologia'], keywords: ['palpitacao','palpitação','arritmia','batimento irregular','taquicardia'] },
  { cid: 'I50.9', label: 'Insuficiência cardíaca não especificada', specialties: ['Cardiologia'], keywords: ['insuficiencia cardiaca','insuficiência cardíaca','dispneia','edema','cansaco aos esforcos','cansaço aos esforços'] },
  { cid: 'E78.5', label: 'Hiperlipidemia não especificada', specialties: ['Cardiologia','Endocrinologia','Nutrição'], keywords: ['colesterol','triglicerides','triglicérides','dislipidemia','ldl'] },
  { cid: 'J45.9', label: 'Asma não especificada', specialties: ['Clínica médica','Medicina','Pediatria'], keywords: ['asma','chiado','sibilancia','sibilância','broncoespasmo','falta de ar'] },
  { cid: 'J18.9', label: 'Pneumonia não especificada', specialties: ['Clínica médica','Medicina','Pediatria'], keywords: ['pneumonia','tosse com febre','crepitacao','crepitação','infiltrado'] },
  { cid: 'N39.0', label: 'Infecção do trato urinário de localização não especificada', specialties: ['Clínica médica','Medicina','Ginecologia','Pediatria'], keywords: ['infeccao urinaria','infecção urinária','disuria','disúria','ardor ao urinar','urina'] },
  { cid: 'G43.9', label: 'Enxaqueca não especificada', specialties: ['Clínica médica','Medicina'], keywords: ['enxaqueca','migranea','migrânea','cefaleia pulsátil','fotofobia'] },
  { cid: 'L30.9', label: 'Dermatite não especificada', specialties: ['Dermatologia'], keywords: ['dermatite','eczema','descamacao','descamação','irritacao pele','irritação pele'] },
  { cid: 'B35.9', label: 'Dermatofitose não especificada', specialties: ['Dermatologia'], keywords: ['micose','tinea','tínea','fungo','lesao anular','lesão anular'] },
  { cid: 'L50.9', label: 'Urticária não especificada', specialties: ['Dermatologia'], keywords: ['urticaria','urticária','placas','vergões','vergões','alergia na pele'] },
  { cid: 'E10.9', label: 'Diabetes mellitus insulinodependente sem complicações', specialties: ['Endocrinologia'], keywords: ['diabetes tipo 1','dm1','insulina','cetoacidose'] },
  { cid: 'E05.9', label: 'Tireotoxicose não especificada', specialties: ['Endocrinologia'], keywords: ['hipertireoidismo','tireotoxicose','t4 livre','tremor','perda de peso'] },
  { cid: 'E28.2', label: 'Síndrome dos ovários policísticos', specialties: ['Endocrinologia','Ginecologia'], keywords: ['sop','ovario policistico','ovário policístico','hirsutismo','irregularidade menstrual'] },
  { cid: 'R49.0', label: 'Disfonia', specialties: ['Fonoaudiologia'], keywords: ['disfonia','rouquidao','rouquidão','voz rouca','voz'] },
  { cid: 'F80.9', label: 'Transtorno não especificado do desenvolvimento da fala ou da linguagem', specialties: ['Fonoaudiologia','Pediatria'], keywords: ['atraso fala','linguagem','fala','troca fonema','fonema'] },
  { cid: 'R13', label: 'Disfagia', specialties: ['Fonoaudiologia','Clínica médica','Medicina'], keywords: ['disfagia','engasgo','degluticao','deglutição','dificuldade para engolir'] },
  { cid: 'N91.2', label: 'Amenorreia não especificada', specialties: ['Ginecologia'], keywords: ['amenorreia','sem menstruar','ausencia menstruacao','ausência menstruação'] },
  { cid: 'N92.0', label: 'Menstruação excessiva e frequente com ciclo regular', specialties: ['Ginecologia'], keywords: ['sangramento intenso','menstruacao intensa','menstruação intensa','menorragia'] },
  { cid: 'Z34.9', label: 'Supervisão de gravidez normal não especificada', specialties: ['Ginecologia'], keywords: ['pre natal','pré natal','gestante','gravidez','gestacao','gestação'] },
  { cid: 'Z00.1', label: 'Exame de rotina de saúde da criança', specialties: ['Pediatria'], keywords: ['puericultura','rotina','crescimento','desenvolvimento infantil','consulta de rotina'] },
  { cid: 'R62.0', label: 'Retardo de desenvolvimento', specialties: ['Pediatria','Terapia Ocupacional','Fonoaudiologia'], keywords: ['atraso desenvolvimento','marcos','desenvolvimento atrasado','neuropsicomotor'] },
  { cid: 'E44.1', label: 'Desnutrição protéico-calórica leve', specialties: ['Pediatria','Nutrição'], keywords: ['desnutricao','desnutrição','baixo peso','perda ponderal','ganho insuficiente'] },
  { cid: 'F84.0', label: 'Autismo infantil', specialties: ['Pediatria','Psicologia','Psiquiatria','Terapia Ocupacional','Fonoaudiologia'], keywords: ['autismo','tea','seletividade','estereotipia','interacao social','interação social'] },
  { cid: 'F41.0', label: 'Transtorno de pânico', specialties: ['Psicologia','Psiquiatria'], keywords: ['panico','pânico','crise de ansiedade','taquicardia ansiedade','medo morrer'] },
  { cid: 'F42.9', label: 'Transtorno obsessivo-compulsivo não especificado', specialties: ['Psicologia','Psiquiatria'], keywords: ['toc','obsessao','obsessão','compulsao','compulsão','rituais'] },
  { cid: 'F31.9', label: 'Transtorno afetivo bipolar não especificado', specialties: ['Psiquiatria','Psicologia'], keywords: ['bipolar','mania','hipomania','euforia','oscilacao humor','oscilação humor'] },
  { cid: 'F20.9', label: 'Esquizofrenia não especificada', specialties: ['Psiquiatria'], keywords: ['psicose','delirio','delírio','alucinacao','alucinação','esquizofrenia'] },
  { cid: 'M75.1', label: 'Síndrome do manguito rotador', specialties: ['Ortopedia','Fisioterapia'], keywords: ['manguito','ombro','supraespinhal','dor no ombro'] },
  { cid: 'M17.9', label: 'Gonartrose não especificada', specialties: ['Ortopedia','Fisioterapia'], keywords: ['artrose joelho','gonartrose','dor no joelho','joelho'] },
  { cid: 'M51.9', label: 'Transtorno de disco intervertebral não especificado', specialties: ['Ortopedia','Fisioterapia'], keywords: ['hernia de disco','hérnia de disco','disco','ciatalgia','ciatico','ciático'] },
  { cid: 'S83.2', label: 'Ruptura recente de menisco', specialties: ['Ortopedia','Fisioterapia'], keywords: ['menisco','lesao meniscal','lesão meniscal','travamento joelho'] },
  { cid: 'E46', label: 'Desnutrição protéico-calórica não especificada', specialties: ['Nutrição'], keywords: ['desnutricao','desnutrição','baixo peso','magreza','perda de peso'] },
  { cid: 'R63.5', label: 'Ganho de peso anormal', specialties: ['Nutrição','Endocrinologia'], keywords: ['ganho de peso','aumento de peso','engordou','compulsao alimentar','compulsão alimentar'] },
  { cid: 'R63.4', label: 'Perda de peso anormal', specialties: ['Nutrição','Endocrinologia','Clínica médica','Medicina'], keywords: ['perda de peso','emagrecimento','perda ponderal'] },
  { cid: 'Z71.3', label: 'Aconselhamento e supervisão dietéticos', specialties: ['Nutrição'], keywords: ['orientacao nutricional','orientação nutricional','dieta','plano alimentar','educacao alimentar','educação alimentar'] },
  { cid: 'K04.0', label: 'Pulpite', specialties: ['Odontologia'], keywords: ['pulpite','dor espontanea','dor espontânea','sensibilidade dental'] },
  { cid: 'K08.1', label: 'Perda de dentes devida a acidente, extração ou doença periodontal local', specialties: ['Odontologia'], keywords: ['perda dental','ausencia dente','ausência dente','extracao','extração'] },
  { cid: 'Z01.2', label: 'Exame odontológico', specialties: ['Odontologia'], keywords: ['avaliacao odontologica','avaliação odontológica','limpeza','profilaxia','checkup dental'] },
  { cid: 'Z41.1', label: 'Outras cirurgias plásticas por razões estéticas', specialties: ['Estética'], keywords: ['estetica','estética','botox','preenchimento','harmonizacao','harmonização','procedimento estetico','procedimento estético'] },
  { cid: 'L90.6', label: 'Estrias atróficas', specialties: ['Estética','Dermatologia'], keywords: ['estria','estrias'] },
  { cid: 'L81.9', label: 'Transtorno da pigmentação não especificado', specialties: ['Estética','Dermatologia'], keywords: ['mancha','melasma','hiperpigmentacao','hiperpigmentação','pigmentacao','pigmentação'] },
  { cid: 'R26.9', label: 'Anormalidades da marcha e da mobilidade não especificadas', specialties: ['Terapia Ocupacional','Fisioterapia'], keywords: ['marcha','mobilidade','andar','equilibrio','equilíbrio'] },
  { cid: 'Z73.6', label: 'Limitação de atividades devida à incapacidade', specialties: ['Terapia Ocupacional'], keywords: ['avd','atividade de vida diaria','atividade de vida diária','funcionalidade','independencia','independência'] },
  { cid: 'R27.9', label: 'Transtorno da coordenação não especificado', specialties: ['Terapia Ocupacional','Fisioterapia'], keywords: ['coordenacao','coordenação','motricidade fina','praxis','práxis'] },
  { cid: 'Z48.0', label: 'Cuidados a curativos e suturas cirúrgicas', specialties: ['Enfermagem'], keywords: ['curativo','sutura','ferida cirurgica','ferida cirúrgica','pos operatorio','pós operatório'] },
  { cid: 'L89.9', label: 'Úlcera de decúbito e área de pressão não especificada', specialties: ['Enfermagem'], keywords: ['lesao por pressao','lesão por pressão','ulcera pressao','úlcera pressão','escara'] },
  { cid: 'Z23.8', label: 'Necessidade de imunização contra outras doenças bacterianas únicas', specialties: ['Enfermagem','Pediatria'], keywords: ['vacina','vacinacao','vacinação','imunizacao','imunização'] },
];

const EXAM_SUGGESTIONS = [
  { exam: 'Eletrocardiograma de 12 derivações', specialties: ['Cardiologia','Clínica médica','Medicina'], keywords: ['dor no peito','dor toracica','dor torácica','precordialgia','palpitacao','palpitação','arritmia','taquicardia'] },
  { exam: 'Troponina I/T seriada', specialties: ['Cardiologia','Clínica médica','Medicina'], keywords: ['dor no peito','dor toracica','dor torácica','precordialgia','infarto','sindrome coronariana','síndrome coronariana'] },
  { exam: 'Radiografia de tórax', specialties: ['Cardiologia','Clínica médica','Medicina','Pediatria'], keywords: ['dor no peito','dor toracica','dor torácica','dispneia','falta de ar','tosse','pneumonia'] },
  { exam: 'Ecocardiograma transtorácico', specialties: ['Cardiologia'], keywords: ['sopro','dispneia','falta de ar','insuficiencia cardiaca','insuficiência cardíaca','edema','dor no peito'] },
  { exam: 'Holter 24h', specialties: ['Cardiologia'], keywords: ['palpitacao','palpitação','arritmia','taquicardia','síncope','sincope','batimento irregular'] },
  { exam: 'Teste ergométrico', specialties: ['Cardiologia'], keywords: ['dor aos esforços','dor aos esforcos','angina','dor no peito','risco coronariano'] },
  { exam: 'Hemograma completo', specialties: ['Clínica médica','Medicina','Pediatria','Ginecologia','Endocrinologia','Nutrição'], keywords: ['febre','cansaco','cansaço','infeccao','infecção','sangramento','anemia','dor'] },
  { exam: 'PCR e/ou VHS', specialties: ['Clínica médica','Medicina','Pediatria','Ortopedia','Dermatologia','Ginecologia'], keywords: ['febre','inflamacao','inflamação','dor','infeccao','infecção','artrite'] },
  { exam: 'Glicemia de jejum e HbA1c', specialties: ['Endocrinologia','Nutrição','Clínica médica','Medicina'], keywords: ['diabetes','glicemia','hiperglicemia','sede','poliuria','poliúria','obesidade','sobrepeso'] },
  { exam: 'TSH e T4 livre', specialties: ['Endocrinologia','Clínica médica','Medicina','Ginecologia'], keywords: ['tireoide','hipotireoidismo','hipertireoidismo','cansaco','cansaço','queda de cabelo','menstruacao irregular','menstruação irregular'] },
  { exam: 'Perfil lipídico', specialties: ['Cardiologia','Endocrinologia','Nutrição','Clínica médica','Medicina'], keywords: ['colesterol','triglicerides','triglicérides','dislipidemia','obesidade','risco cardiovascular'] },
  { exam: 'EAS / Urina tipo 1', specialties: ['Clínica médica','Medicina','Ginecologia','Pediatria'], keywords: ['disuria','disúria','ardor ao urinar','infeccao urinaria','infecção urinária','dor pelvica','dor pélvica','febre'] },
  { exam: 'Urocultura com antibiograma', specialties: ['Clínica médica','Medicina','Ginecologia','Pediatria'], keywords: ['infeccao urinaria','infecção urinária','disuria','disúria','febre','ardor ao urinar'] },
  { exam: 'Beta-hCG', specialties: ['Ginecologia','Clínica médica','Medicina'], keywords: ['atraso menstrual','amenorreia','dor pelvica','dor pélvica','sangramento','gravidez','gestacao','gestação'] },
  { exam: 'Ultrassonografia transvaginal', specialties: ['Ginecologia'], keywords: ['dor pelvica','dor pélvica','sangramento uterino','mioma','cisto','ovario','ovário','endometriose'] },
  { exam: 'Citopatológico do colo uterino', specialties: ['Ginecologia'], keywords: ['preventivo','papanicolau','rastreamento','colo uterino','corrimento'] },
  { exam: 'Mamografia', specialties: ['Ginecologia','Clínica médica','Medicina'], keywords: ['mama','nodulo mama','nódulo mama','rastreamento mamario','rastreamento mamário'] },
  { exam: 'Radiografia da região acometida', specialties: ['Ortopedia','Fisioterapia','Clínica médica','Medicina'], keywords: ['trauma','queda','fratura','dor no joelho','ombro','tornozelo','coluna','dor articular'] },
  { exam: 'Ultrassonografia musculoesquelética', specialties: ['Ortopedia','Fisioterapia'], keywords: ['tendinite','bursite','ombro','lesao muscular','lesão muscular','dor localizada'] },
  { exam: 'Ressonância magnética da região acometida', specialties: ['Ortopedia','Fisioterapia'], keywords: ['hernia de disco','hérnia de disco','menisco','ligamento','dor persistente','radiculopatia','ciatico','ciático'] },
  { exam: 'Bioimpedância corporal', specialties: ['Nutrição','Endocrinologia'], keywords: ['obesidade','sobrepeso','composicao corporal','composição corporal','emagrecimento','ganho de massa'] },
  { exam: 'Vitamina D, B12, ferritina e ferro sérico', specialties: ['Nutrição','Clínica médica','Medicina','Endocrinologia'], keywords: ['cansaco','cansaço','queda de cabelo','fadiga','vegetariano','anemia','fraqueza'] },
  { exam: 'Função hepática e renal', specialties: ['Nutrição','Endocrinologia','Clínica médica','Medicina'], keywords: ['obesidade','diabetes','medicacao','medicação','checkup','hipertensao','hipertensão'] },
  { exam: 'Dermatoscopia', specialties: ['Dermatologia'], keywords: ['pinta','nevo','lesao pigmentada','lesão pigmentada','mancha','melanoma'] },
  { exam: 'Raspado micológico direto e cultura para fungos', specialties: ['Dermatologia'], keywords: ['micose','fungo','tinea','tínea','unha','descamacao','descamação'] },
  { exam: 'Biópsia de pele', specialties: ['Dermatologia'], keywords: ['lesao suspeita','lesão suspeita','ferida que nao cicatriza','ferida que não cicatriza','tumor pele'] },
  { exam: 'Audiometria tonal e vocal', specialties: ['Fonoaudiologia','Pediatria'], keywords: ['audicao','audição','perda auditiva','zumbido','fala atrasada','atraso fala'] },
  { exam: 'Avaliação de linguagem/fala', specialties: ['Fonoaudiologia','Pediatria'], keywords: ['fala','linguagem','troca fonema','atraso fala','comunicacao','comunicação'] },
  { exam: 'Videofluoroscopia ou avaliação instrumental da deglutição', specialties: ['Fonoaudiologia'], keywords: ['disfagia','engasgo','degluticao','deglutição','broncoaspiracao','broncoaspiração'] },
  { exam: 'Avaliação neuropsicológica', specialties: ['Psicologia','Psiquiatria','Pediatria'], keywords: ['tdah','memoria','memória','atenção','atencao','aprendizagem','cognitivo'] },
  { exam: 'Escalas de rastreio psicológico/psiquiátrico', specialties: ['Psicologia','Psiquiatria'], keywords: ['ansiedade','depressao','depressão','panico','pânico','humor','risco'] },
  { exam: 'Exames toxicológicos quando clinicamente indicado', specialties: ['Psiquiatria','Clínica médica','Medicina'], keywords: ['substancia','substância','alcool','álcool','drogas','abstinencia','abstinência'] },
  { exam: 'Odontograma e radiografias periapicais', specialties: ['Odontologia'], keywords: ['carie','cárie','dor de dente','sensibilidade dental','pulpite'] },
  { exam: 'Radiografia panorâmica', specialties: ['Odontologia'], keywords: ['siso','ortodontia','avaliacao odontologica','avaliação odontológica','dor mandibular'] },
  { exam: 'Periodontograma', specialties: ['Odontologia'], keywords: ['gengiva','sangramento gengival','periodontite','mobilidade dental'] },
  { exam: 'Fotografias clínicas padronizadas', specialties: ['Estética','Dermatologia'], keywords: ['estetica','estética','harmonizacao','harmonização','melasma','rejuvenescimento','estria'] },
  { exam: 'Avaliação funcional padronizada', specialties: ['Terapia Ocupacional','Fisioterapia'], keywords: ['avd','funcionalidade','mobilidade','independencia','independência','coordenacao','coordenação'] },
  { exam: 'Escalas de dor, risco de queda e funcionalidade', specialties: ['Enfermagem','Fisioterapia','Terapia Ocupacional'], keywords: ['dor','queda','idoso','mobilidade','risco'] },
  { exam: 'Cultura de secreção/ferida com antibiograma', specialties: ['Enfermagem','Clínica médica','Medicina','Dermatologia'], keywords: ['ferida','secrecao','secreção','pus','infeccao ferida','infecção ferida'] },
  { exam: 'MAPA 24h ou MRPA', specialties: ['Cardiologia','Clínica médica','Medicina'], keywords: ['hipertensao','hipertensão','pressao alta','pressão alta','pa elevada','pico pressorico','pico pressórico'] },
  { exam: 'Doppler de carótidas e vertebrais', specialties: ['Cardiologia','Clínica médica','Medicina'], keywords: ['sopro carotideo','sopro carotídeo','ait','tontura','sincope','síncope','risco vascular'] },
  { exam: 'Angiotomografia coronariana', specialties: ['Cardiologia'], keywords: ['dor no peito','dor toracica','dor torácica','risco coronariano','angina','teste inconclusivo'] },
  { exam: 'BNP ou NT-proBNP', specialties: ['Cardiologia','Clínica médica','Medicina'], keywords: ['dispneia','falta de ar','insuficiencia cardiaca','insuficiência cardíaca','edema','ortopneia'] },
  { exam: 'Espirometria', specialties: ['Clínica médica','Medicina','Pediatria'], keywords: ['asma','chiado','sibilancia','sibilância','dispneia','falta de ar','tosse cronica','tosse crônica'] },
  { exam: 'Prova de função pulmonar completa', specialties: ['Clínica médica','Medicina'], keywords: ['dpoc','enfisema','dispneia cronica','dispneia crônica','doenca pulmonar','doença pulmonar'] },
  { exam: 'Tomografia de tórax', specialties: ['Clínica médica','Medicina','Cardiologia'], keywords: ['tosse cronica','tosse crônica','pneumonia recorrente','nodulo pulmonar','nódulo pulmonar','dispneia'] },
  { exam: 'Sorologias para ISTs', specialties: ['Ginecologia','Clínica médica','Medicina'], keywords: ['corrimento','ist','dst','exposicao sexual','exposição sexual','lesao genital','lesão genital','pre natal','pré natal'] },
  { exam: 'Pesquisa de clamídia e gonococo por NAAT/PCR', specialties: ['Ginecologia'], keywords: ['corrimento','dor pelvica','dor pélvica','cervicite','ist','sangramento pos coito','sangramento pós coito'] },
  { exam: 'Bacterioscopia/cultura de secreção vaginal', specialties: ['Ginecologia'], keywords: ['corrimento','odor vaginal','prurido vaginal','vaginite','candidiase','candidíase'] },
  { exam: 'Ultrassonografia obstétrica', specialties: ['Ginecologia'], keywords: ['gestante','gravidez','gestacao','gestação','pre natal','pré natal','sangramento gestacional','dor gestacional'] },
  { exam: 'Coagulograma', specialties: ['Ginecologia','Clínica médica','Medicina','Estética'], keywords: ['sangramento','pre operatorio','pré operatório','procedimento','hematoma','equimose'] },
  { exam: 'Teste do pezinho / triagem neonatal', specialties: ['Pediatria'], keywords: ['recem nascido','recém nascido','neonato','triagem neonatal','teste do pezinho'] },
  { exam: 'Oximetria de pulso', specialties: ['Pediatria','Clínica médica','Medicina'], keywords: ['falta de ar','dispneia','chiado','bronquiolite','pneumonia','cianose'] },
  { exam: 'Parasitológico de fezes', specialties: ['Pediatria','Clínica médica','Medicina','Nutrição'], keywords: ['diarreia','dor abdominal','parasita','verme','verminose','perda de peso'] },
  { exam: 'Coprocultura', specialties: ['Pediatria','Clínica médica','Medicina'], keywords: ['diarreia com sangue','diarreia persistente','febre diarreia','gastroenterite'] },
  { exam: 'Curvas de crescimento e avaliação antropométrica', specialties: ['Pediatria','Nutrição'], keywords: ['crescimento','baixo peso','obesidade infantil','puericultura','desenvolvimento infantil'] },
  { exam: 'M-CHAT-R/F', specialties: ['Pediatria','Psicologia','Terapia Ocupacional','Fonoaudiologia'], keywords: ['autismo','tea','atraso fala','interacao social','interação social','estereotipia'] },
  { exam: 'Denver II ou escala de desenvolvimento infantil', specialties: ['Pediatria','Terapia Ocupacional','Fonoaudiologia'], keywords: ['atraso desenvolvimento','marcos','neuropsicomotor','desenvolvimento infantil'] },
  { exam: 'Insulina de jejum e HOMA-IR', specialties: ['Endocrinologia','Nutrição'], keywords: ['resistencia insulinica','resistência insulínica','obesidade','sop','ovario policistico','ovário policístico'] },
  { exam: 'Cortisol matinal', specialties: ['Endocrinologia'], keywords: ['cortisol','fadiga','adrenal','cushing','hipotensao','hipotensão'] },
  { exam: 'Prolactina', specialties: ['Endocrinologia','Ginecologia'], keywords: ['galactorreia','amenorreia','irregularidade menstrual','prolactina'] },
  { exam: 'LH, FSH, estradiol e progesterona', specialties: ['Endocrinologia','Ginecologia'], keywords: ['amenorreia','infertilidade','menopausa','irregularidade menstrual','ovulacao','ovulação'] },
  { exam: 'Albumina, pré-albumina e proteína total', specialties: ['Nutrição','Clínica médica','Medicina'], keywords: ['desnutricao','desnutrição','perda de peso','baixo peso','risco nutricional'] },
  { exam: 'Eletrólitos, magnésio e fósforo', specialties: ['Nutrição','Clínica médica','Medicina','Endocrinologia'], keywords: ['vomito','vômito','diarreia','desidratacao','desidratação','caibra','cãibra'] },
  { exam: 'Recordatório alimentar e diário alimentar', specialties: ['Nutrição'], keywords: ['dieta','plano alimentar','compulsao alimentar','compulsão alimentar','emagrecimento','educacao alimentar','educação alimentar'] },
  { exam: 'Eletroneuromiografia', specialties: ['Ortopedia','Fisioterapia','Clínica médica','Medicina'], keywords: ['formigamento','parestesia','fraqueza','radiculopatia','tunel do carpo','túnel do carpo','ciatico','ciático'] },
  { exam: 'Baropodometria / avaliação da pisada', specialties: ['Fisioterapia','Ortopedia'], keywords: ['pisada','marcha','pé','pe','dor no pe','dor no pé','fascite plantar'] },
  { exam: 'Goniometria e testes funcionais', specialties: ['Fisioterapia','Terapia Ocupacional','Ortopedia'], keywords: ['amplitude','mobilidade','funcionalidade','reabilitacao','reabilitação','dor'] },
  { exam: 'Nasofibrolaringoscopia', specialties: ['Fonoaudiologia','Clínica médica','Medicina'], keywords: ['disfonia','rouquidao','rouquidão','voz','laringite','pigarro'] },
  { exam: 'Imitanciometria', specialties: ['Fonoaudiologia','Pediatria'], keywords: ['otite','ouvido tampado','perda auditiva','audição','audicao','zumbido'] },
  { exam: 'BERA/PEATE', specialties: ['Fonoaudiologia','Pediatria'], keywords: ['recem nascido','recém nascido','triagem auditiva','perda auditiva','atraso fala'] },
  { exam: 'PHQ-9', specialties: ['Psicologia','Psiquiatria'], keywords: ['depressao','depressão','tristeza','anedonia','humor deprimido','desanimo','desânimo'] },
  { exam: 'GAD-7', specialties: ['Psicologia','Psiquiatria'], keywords: ['ansiedade','preocupacao','preocupação','nervosismo','tensao','tensão'] },
  { exam: 'ASRS-18', specialties: ['Psicologia','Psiquiatria'], keywords: ['tdah','desatencao','desatenção','hiperatividade','impulsividade','concentracao','concentração'] },
  { exam: 'MoCA ou Mini Exame do Estado Mental', specialties: ['Psicologia','Psiquiatria','Clínica médica','Medicina'], keywords: ['memoria','memória','cognicao','cognição','esquecimento','demencia','demência'] },
  { exam: 'Tomografia computadorizada de feixe cônico', specialties: ['Odontologia'], keywords: ['implante','siso','endodontia','lesao periapical','lesão periapical','cirurgia oral'] },
  { exam: 'Teste de vitalidade pulpar', specialties: ['Odontologia'], keywords: ['pulpite','dor de dente','sensibilidade dental','endodontia'] },
  { exam: 'Documentação ortodôntica', specialties: ['Odontologia'], keywords: ['ortodontia','aparelho','maloclusao','maloclusão','mordida'] },
  { exam: 'Teste de contato (patch test)', specialties: ['Dermatologia'], keywords: ['alergia de contato','dermatite contato','coceira','prurido','eczema recorrente'] },
  { exam: 'Tricoscopia', specialties: ['Dermatologia','Estética'], keywords: ['queda de cabelo','alopecia','calvicie','calvície','cabelo'] },
  { exam: 'Avaliação fotográfica corporal/facial seriada', specialties: ['Estética','Dermatologia'], keywords: ['botox','preenchimento','harmonizacao','harmonização','celulite','flacidez','gordura localizada'] },
  { exam: 'Anamnese estética com contraindicações e termo fotográfico', specialties: ['Estética'], keywords: ['procedimento estetico','procedimento estético','preenchimento','toxina','peeling','laser'] },
  { exam: 'Medidas antropométricas e perimetria', specialties: ['Estética','Nutrição','Fisioterapia'], keywords: ['medidas','perimetria','celulite','gordura localizada','emagrecimento','flacidez'] },
  { exam: 'Índice de Katz e escala de Lawton-Brody', specialties: ['Terapia Ocupacional','Enfermagem'], keywords: ['idoso','avd','funcionalidade','dependencia','dependência','cuidado domiciliar'] },
  { exam: 'Avaliação sensorial e perfil ocupacional', specialties: ['Terapia Ocupacional'], keywords: ['sensorial','autismo','tea','hipersensibilidade','rotina','ocupacional'] },
  { exam: 'PEDI ou WeeFIM', specialties: ['Terapia Ocupacional','Pediatria'], keywords: ['crianca','criança','funcionalidade infantil','desenvolvimento infantil','avd infantil'] },
  { exam: 'Glicemia capilar', specialties: ['Enfermagem','Clínica médica','Medicina','Endocrinologia'], keywords: ['diabetes','hipoglicemia','hiperglicemia','tontura','sudorese','mal estar'] },
  { exam: 'Sinais vitais seriados', specialties: ['Enfermagem','Clínica médica','Medicina','Cardiologia'], keywords: ['febre','hipotensao','hipotensão','hipertensao','hipertensão','taquicardia','dor no peito'] },
  { exam: 'Escala de Braden', specialties: ['Enfermagem'], keywords: ['lesao por pressao','lesão por pressão','acamado','idoso','ulcera','úlcera','escara'] },
  { exam: 'Escala de Morse', specialties: ['Enfermagem','Fisioterapia','Terapia Ocupacional'], keywords: ['queda','risco de queda','idoso','tontura','marcha'] },
];

const TEMPLATES: Record<string, { sections: Array<{ title: string; icon: any; fields: Array<{ label: string; type: string; key: string; options?: string[] }> }> }> = {
  Psicologia: { sections: [
    { title:'Queixa Principal', icon:Clipboard, fields:[
      { label:'Queixa inicial', type:'textarea', key:'complaint' },
      { label:'Histórico psicossocial', type:'textarea', key:'history' },
      { label:'Objetivos terapêuticos', type:'textarea', key:'goals' },
    ]},
    { title:'Avaliação', icon:Brain, fields:[
      { label:'Humor', type:'select', key:'mood', options:['Eutímico','Deprimido','Hipertímico','Disfórico','Irritável'] },
      { label:'Ansiedade (0-10)', type:'scale', key:'anxiety' },
      { label:'Sono', type:'select', key:'sleep', options:['Normal','Insônia inicial','Insônia terminal','Hipersonia'] },
    ]},
    { title:'Plano Terapêutico', icon:Heart, fields:[
      { label:'Técnicas utilizadas', type:'textarea', key:'techniques' },
      { label:'Próximos passos', type:'textarea', key:'next_steps' },
    ]},
    { title:'Formulação DSM-5-TR', icon:Brain, fields:[
      { label:'Domínios diagnósticos investigados', type:'multiselect', key:'dsm_domains', options: DSM_DOMAIN_OPTIONS },
      { label:'Sintomas nucleares observados/relatados', type:'textarea', key:'dsm_core_symptoms' },
      { label:'Duração e curso dos sintomas', type:'textarea', key:'dsm_duration_course' },
      { label:'Prejuízo funcional e sofrimento clinicamente significativo', type:'textarea', key:'dsm_impairment' },
      { label:'Diagnósticos diferenciais a considerar', type:'textarea', key:'dsm_differential' },
      { label:'Risco atual e fatores de proteção', type:'textarea', key:'dsm_risk_protection' },
      { label:'Contexto cultural, familiar e psicossocial', type:'textarea', key:'dsm_context' },
      { label:'Instrumentos de triagem aplicados', type:'multiselect', key:'psychology_screening_tools', options: PSYCHOLOGY_SCREENING_OPTIONS },
    ]},
  ]},
  Nutrição: { sections: [
    { title:'Avaliação Nutricional', icon:Activity, fields:[
      { label:'Peso atual (kg)', type:'number', key:'weight' },
      { label:'Altura (cm)', type:'number', key:'height' },
      { label:'IMC', type:'number', key:'bmi' },
      { label:'Circunferência abdominal (cm)', type:'number', key:'waist' },
    ]},
    { title:'Plano Alimentar', icon:FileText, fields:[
      { label:'Objetivo nutricional', type:'select', key:'goal', options:['Emagrecimento','Ganho de massa','Manutenção','Saúde geral'] },
      { label:'VET (kcal/dia)', type:'number', key:'vet' },
      { label:'Orientações gerais', type:'textarea', key:'guidelines' },
    ]},
  ]},
  Fisioterapia: { sections: [
    { title:'Avaliação Funcional', icon:Activity, fields:[
      { label:'Queixa principal', type:'textarea', key:'complaint' },
      { label:'Intensidade da dor (0-10)', type:'scale', key:'pain' },
      { label:'Localização', type:'text', key:'location' },
      { label:'Amplitude de movimento', type:'textarea', key:'range_of_motion' },
    ]},
    { title:'Conduta', icon:CheckCircle2, fields:[
      { label:'Recursos utilizados', type:'textarea', key:'resources' },
      { label:'Evolução funcional', type:'textarea', key:'evolution' },
      { label:'Exercícios prescritos', type:'textarea', key:'exercises' },
    ]},
  ]},
  Psiquiatria: { sections: [
    { title:'Avaliação Psiquiátrica', icon:Brain, fields:[
      { label:'Queixa principal', type:'textarea', key:'complaint' },
      { label:'História psiquiátrica', type:'textarea', key:'psychiatric_history' },
      { label:'Exame do estado mental', type:'textarea', key:'mental_status' },
      { label:'Risco atual', type:'select', key:'risk', options:['Baixo','Moderado','Alto','Não avaliado'] },
    ]},
    { title:'Plano Medicamentoso', icon:Pill, fields:[
      { label:'Hipótese diagnóstica', type:'text', key:'diagnosis' },
      { label:'Medicações em uso', type:'textarea', key:'current_medications' },
      { label:'Prescrição / ajuste', type:'textarea', key:'prescription' },
      { label:'Orientações e retorno', type:'textarea', key:'next_steps' },
    ]},
  ]},
  Odontologia: { sections: [
    { title:'Avaliação Odontológica', icon:Clipboard, fields:[
      { label:'Queixa principal', type:'textarea', key:'complaint' },
      { label:'Odontograma / achados', type:'textarea', key:'odontogram' },
      { label:'Dor (0-10)', type:'scale', key:'pain' },
      { label:'Hábitos e higiene oral', type:'textarea', key:'oral_hygiene' },
    ]},
    { title:'Procedimento e Conduta', icon:CheckCircle2, fields:[
      { label:'Procedimento realizado', type:'textarea', key:'procedure' },
      { label:'Materiais utilizados', type:'textarea', key:'materials' },
      { label:'Prescrição / orientações', type:'textarea', key:'prescription' },
    ]},
  ]},
  Fonoaudiologia: { sections: [
    { title:'Avaliação Fonoaudiológica', icon:User, fields:[
      { label:'Queixa comunicativa', type:'textarea', key:'complaint' },
      { label:'Linguagem / fala / voz', type:'textarea', key:'speech_language_voice' },
      { label:'Deglutição / motricidade oral', type:'textarea', key:'swallowing_oral_motor' },
    ]},
    { title:'Plano Terapêutico', icon:Heart, fields:[
      { label:'Objetivos terapêuticos', type:'textarea', key:'goals' },
      { label:'Exercícios orientados', type:'textarea', key:'exercises' },
      { label:'Evolução', type:'textarea', key:'evolution' },
    ]},
  ]},
  Estética: { sections: [
    { title:'Avaliação Estética', icon:Activity, fields:[
      { label:'Queixa estética', type:'textarea', key:'complaint' },
      { label:'Tipo de pele / fototipo', type:'text', key:'skin_type' },
      { label:'Contraindicações / alergias', type:'textarea', key:'contraindications' },
    ]},
    { title:'Procedimento', icon:CheckCircle2, fields:[
      { label:'Procedimento realizado', type:'textarea', key:'procedure' },
      { label:'Produtos / parâmetros', type:'textarea', key:'products_parameters' },
      { label:'Cuidados pós-procedimento', type:'textarea', key:'post_care' },
    ]},
  ]},
  'Terapia Ocupacional': { sections: [
    { title:'Avaliação Ocupacional', icon:Clipboard, fields:[
      { label:'Queixa funcional', type:'textarea', key:'complaint' },
      { label:'Atividades de vida diária', type:'textarea', key:'daily_activities' },
      { label:'Barreiras ambientais', type:'textarea', key:'barriers' },
    ]},
    { title:'Intervenção', icon:CheckCircle2, fields:[
      { label:'Objetivos terapêuticos', type:'textarea', key:'goals' },
      { label:'Adaptações / treino', type:'textarea', key:'adaptations' },
      { label:'Evolução funcional', type:'textarea', key:'evolution' },
    ]},
  ]},
  Enfermagem: { sections: [
    { title:'Avaliação de Enfermagem', icon:Activity, fields:[
      { label:'Queixa / motivo do atendimento', type:'textarea', key:'complaint' },
      { label:'Pressão arterial', type:'text', key:'blood_pressure' },
      { label:'Frequência cardíaca', type:'number', key:'heart_rate' },
      { label:'Temperatura', type:'number', key:'temperature' },
    ]},
    { title:'Cuidados e Procedimentos', icon:CheckCircle2, fields:[
      { label:'Procedimentos realizados', type:'textarea', key:'procedures' },
      { label:'Curativos / medicações', type:'textarea', key:'dressings_medications' },
      { label:'Orientações', type:'textarea', key:'guidance' },
    ]},
  ]},
  Cardiologia: { sections: [
    { title:'Avaliação Cardiológica', icon:Heart, fields:[
      { label:'Queixa cardiovascular', type:'textarea', key:'complaint' },
      { label:'Pressão arterial', type:'text', key:'blood_pressure' },
      { label:'Frequência cardíaca', type:'number', key:'heart_rate' },
      { label:'Sintomas associados', type:'textarea', key:'associated_symptoms' },
    ]},
    { title:'Conduta Cardiológica', icon:CheckCircle2, fields:[
      { label:'Exames analisados / solicitados', type:'textarea', key:'exams' },
      { label:'Hipótese diagnóstica', type:'text', key:'diagnosis' },
      { label:'Prescrição / orientações', type:'textarea', key:'prescription' },
    ]},
  ]},
  'Clínica médica': { sections: [
    { title:'Anamnese Clínica', icon:Clipboard, fields:[
      { label:'Queixa principal', type:'textarea', key:'complaint' },
      { label:'História da doença atual', type:'textarea', key:'current_history' },
      { label:'Antecedentes', type:'textarea', key:'background' },
    ]},
    { title:'Exame e Conduta', icon:Activity, fields:[
      { label:'Exame físico', type:'textarea', key:'physical_exam' },
      { label:'Hipótese diagnóstica', type:'text', key:'diagnosis' },
      { label:'Conduta', type:'textarea', key:'conduct' },
    ]},
  ]},
  Medicina: { sections: [
    { title:'Anamnese Médica', icon:Clipboard, fields:[
      { label:'Queixa principal', type:'textarea', key:'complaint' },
      { label:'História clínica', type:'textarea', key:'clinical_history' },
      { label:'Antecedentes e medicações', type:'textarea', key:'background_medications' },
    ]},
    { title:'Exame e Plano', icon:Activity, fields:[
      { label:'Exame físico', type:'textarea', key:'physical_exam' },
      { label:'Diagnóstico / hipótese', type:'text', key:'diagnosis' },
      { label:'Prescrição / conduta', type:'textarea', key:'prescription' },
    ]},
  ]},
  Dermatologia: { sections: [
    { title:'Avaliação Dermatológica', icon:Clipboard, fields:[
      { label:'Queixa dermatológica', type:'textarea', key:'complaint' },
      { label:'Localização das lesões', type:'text', key:'lesion_location' },
      { label:'Características das lesões', type:'textarea', key:'lesion_features' },
      { label:'Fototipo / alergias', type:'text', key:'skin_type_allergies' },
    ]},
    { title:'Conduta Dermatológica', icon:Pill, fields:[
      { label:'Hipótese diagnóstica', type:'text', key:'diagnosis' },
      { label:'Tratamento prescrito', type:'textarea', key:'prescription' },
      { label:'Cuidados domiciliares', type:'textarea', key:'home_care' },
    ]},
  ]},
  Endocrinologia: { sections: [
    { title:'Avaliação Endócrina', icon:Activity, fields:[
      { label:'Queixa principal', type:'textarea', key:'complaint' },
      { label:'Peso atual (kg)', type:'number', key:'weight' },
      { label:'Altura (cm)', type:'number', key:'height' },
      { label:'Glicemia / HbA1c', type:'text', key:'glycemia_hba1c' },
    ]},
    { title:'Plano Endócrino', icon:Pill, fields:[
      { label:'Hipótese diagnóstica', type:'text', key:'diagnosis' },
      { label:'Medicações / ajustes', type:'textarea', key:'prescription' },
      { label:'Metas e orientações', type:'textarea', key:'goals' },
    ]},
  ]},
  Ginecologia: { sections: [
    { title:'Avaliação Ginecológica', icon:Clipboard, fields:[
      { label:'Queixa principal', type:'textarea', key:'complaint' },
      { label:'DUM', type:'date', key:'last_period' },
      { label:'Histórico gineco-obstétrico', type:'textarea', key:'gyneco_history' },
      { label:'Método contraceptivo', type:'text', key:'contraception' },
    ]},
    { title:'Exame e Conduta', icon:CheckCircle2, fields:[
      { label:'Exame físico / achados', type:'textarea', key:'physical_exam' },
      { label:'Exames solicitados', type:'textarea', key:'exams' },
      { label:'Conduta / orientações', type:'textarea', key:'conduct' },
    ]},
  ]},
  Ortopedia: { sections: [
    { title:'Avaliação Ortopédica', icon:Activity, fields:[
      { label:'Queixa musculoesquelética', type:'textarea', key:'complaint' },
      { label:'Local da dor / lesão', type:'text', key:'location' },
      { label:'Dor (0-10)', type:'scale', key:'pain' },
      { label:'Trauma associado', type:'textarea', key:'trauma' },
    ]},
    { title:'Exame e Plano', icon:CheckCircle2, fields:[
      { label:'Exame físico ortopédico', type:'textarea', key:'physical_exam' },
      { label:'Exames de imagem', type:'textarea', key:'imaging' },
      { label:'Conduta', type:'textarea', key:'conduct' },
    ]},
  ]},
  Pediatria: { sections: [
    { title:'Avaliação Pediátrica', icon:User, fields:[
      { label:'Queixa principal', type:'textarea', key:'complaint' },
      { label:'Peso (kg)', type:'number', key:'weight' },
      { label:'Altura (cm)', type:'number', key:'height' },
      { label:'Cartão de vacinação', type:'vaccine-card', key:'vaccination_card' },
      { label:'Observações sobre vacinação', type:'textarea', key:'vaccination_notes' },
    ]},
    { title:'Desenvolvimento e Conduta', icon:Heart, fields:[
      { label:'Desenvolvimento neuropsicomotor', type:'textarea', key:'development' },
      { label:'Exame físico', type:'textarea', key:'physical_exam' },
      { label:'Conduta / orientações aos responsáveis', type:'textarea', key:'conduct' },
    ]},
  ]},
  Outro: { sections: [
    { title:'Avaliação Geral', icon:Clipboard, fields:[
      { label:'Queixa principal', type:'textarea', key:'complaint' },
      { label:'Histórico relevante', type:'textarea', key:'history' },
      { label:'Achados principais', type:'textarea', key:'findings' },
    ]},
    { title:'Conduta', icon:CheckCircle2, fields:[
      { label:'Plano de cuidado', type:'textarea', key:'care_plan' },
      { label:'Orientações', type:'textarea', key:'guidance' },
    ]},
  ]},
};
const DEFAULT_TEMPLATE = TEMPLATES.Psicologia;

const COLORS = ['bg-violet-500','bg-blue-500','bg-teal-500','bg-indigo-500','bg-rose-500','bg-gold-500'];
const avatarColor = (n: string) => { let h=0; for(const c of n) h=c.charCodeAt(0)+((h<<5)-h); return COLORS[Math.abs(h)%COLORS.length]; };
const initials = (n: string) => n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

/* ── Scale component ─────────────────────────────────────────── */
function ScaleInput({ label, value, onChange }: { label: string; value: number; onChange:(v:number)=>void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-3">
        <input type="range" min={0} max={10} value={value} onChange={e=>onChange(+e.target.value)} className="flex-1 accent-primary-600"/>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
          ${value>=7?'bg-red-100 text-red-700':value>=4?'bg-amber-100 text-amber-700':'bg-teal-100 text-teal-700'}`}>{value}</span>
      </div>
    </div>
  );
}

function VaccineCardInput({
  value,
  onChange,
}: {
  value: Record<string, { done?: boolean; date?: string }>;
  onChange: (value: Record<string, { done?: boolean; date?: string }>) => void;
}) {
  const allVaccines = PEDIATRIC_VACCINE_SCHEDULE.flatMap(group => group.vaccines);
  const appliedCount = allVaccines.filter(vaccine => value?.[vaccine.id]?.done).length;

  const updateVaccine = (id: string, patch: { done?: boolean; date?: string }) => {
    onChange({
      ...(value ?? {}),
      [id]: {
        ...(value?.[id] ?? {}),
        ...patch,
      },
    });
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="label mb-0">Cartão de vacinação pediátrico</label>
          <p className="text-xs text-slate-500">Calendário Nacional de Vacinação 2026, 0 a 9 anos.</p>
        </div>
        <span className="rounded-lg bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
          {appliedCount}/{allVaccines.length} registradas
        </span>
      </div>

      <div className="space-y-3">
        {PEDIATRIC_VACCINE_SCHEDULE.map(group => (
          <div key={group.age} className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
              {group.age}
            </div>
            <div className="divide-y divide-slate-100">
              {group.vaccines.map(vaccine => {
                const item = value?.[vaccine.id] ?? {};
                return (
                  <div key={vaccine.id} className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_170px] sm:items-center">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-primary-600"
                        checked={!!item.done}
                        onChange={e => updateVaccine(vaccine.id, { done: e.target.checked })}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">{vaccine.name}</span>
                        <span className="text-xs text-slate-500">{vaccine.dose}</span>
                      </span>
                    </label>
                    <input
                      type="date"
                      className="input h-10 text-sm"
                      value={item.date ?? ''}
                      onChange={e => updateVaccine(vaccine.id, { date: e.target.value, done: item.done || !!e.target.value })}
                      aria-label={`Data da vacina ${vaccine.name}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreeningTestsInput({
  selectedTools,
  value,
  onChange,
}: {
  selectedTools: string[];
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
}) {
  const tests = selectedTools
    .map(tool => ({ tool, config: PSYCHOLOGY_TESTS[tool] }))
    .filter(item => item.config);

  if (tests.length === 0) return null;

  const setToolValue = (tool: string, patch: Record<string, any>) => {
    const current = value?.[tool] ?? {};
    onChange({
      ...(value ?? {}),
      [tool]: {
        ...current,
        ...patch,
      },
    });
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
          <Clipboard size={15} className="text-primary-600"/>
        </div>
        <div>
          <span className="font-semibold text-slate-800">Registro de instrumentos psicológicos</span>
          <p className="text-xs text-slate-500">Use apenas instrumentos permitidos, com parecer favorável no SATEPSI quando aplicável, licença válida e manual autorizado.</p>
        </div>
      </div>

      <div className="space-y-4">
        {tests.map(({ tool, config }) => {
          const testValue = value?.[tool] ?? {};

          return (
            <div key={tool} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-slate-800">{config.title}</h4>
                  <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
                    A plataforma não reproduz itens, estímulos, folhas de resposta ou correção de testes psicológicos. Registre aqui somente aplicação feita com material autorizado.
                  </p>
                </div>
                <span className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Verificar CRP/CFP/SATEPSI
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="label">Conformidade</label>
                  <select
                    className="input"
                    value={testValue.compliance ?? ''}
                    onChange={e => setToolValue(tool, { compliance: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    <option value="satepsi_favoravel">SATEPSI favorável / autorizado</option>
                    <option value="nao_privativo">Instrumento não privativo / triagem clínica</option>
                    <option value="licenciado">Licença/manual autorizado</option>
                    <option value="pendente">Pendente de verificação</option>
                    <option value="nao_utilizar">Não utilizar</option>
                  </select>
                </div>
                <div>
                  <label className="label">Escore bruto/resultado</label>
                  <input
                    className="input"
                    value={testValue.score ?? ''}
                    onChange={e => setToolValue(tool, { score: e.target.value })}
                    placeholder="Ex.: 12, percentil, classificação..."
                  />
                </div>
                <div>
                  <label className="label">Data</label>
                  <input
                    type="date"
                    className="input"
                    value={testValue.date ?? ''}
                    onChange={e => setToolValue(tool, { date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Aplicador</label>
                  <input
                    className="input"
                    value={testValue.appliedBy ?? ''}
                    onChange={e => setToolValue(tool, { appliedBy: e.target.value })}
                    placeholder="Psicóloga/o responsável"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="label">Observações e referência do material autorizado</label>
                <textarea
                  rows={2}
                  className="input resize-none"
                  value={testValue.notes ?? ''}
                  onChange={e => setToolValue(tool, { notes: e.target.value })}
                  placeholder="Versão utilizada, editora/licença, nº CRP do responsável, condições de aplicação, observações clínicas..."
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DsmSubspecialtyGuidance({ domains }: { domains: string[] }) {
  const selectedDomains = domains.filter(domain => DSM_SUBSPECIALTY_GUIDANCE[domain]);
  if (selectedDomains.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
          <Brain size={15} className="text-teal-600"/>
        </div>
        <div>
          <span className="font-semibold text-slate-800">Subespecialidades e linhas de cuidado sugeridas</span>
          <p className="text-xs text-slate-500">Baseado nos domínios diagnósticos marcados. Use como apoio para encaminhamento e plano terapêutico.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {selectedDomains.map(domain => (
          <div key={domain} className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-800">{domain}</h4>
            <div className="flex flex-wrap gap-2">
              {DSM_SUBSPECIALTY_GUIDANCE[domain].map(item => (
                <span key={item} className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function classifyBmi(bmi: number) {
  if (!Number.isFinite(bmi) || bmi <= 0) return '';
  if (bmi < 18.5) return 'Baixo peso';
  if (bmi < 25) return 'Peso adequado';
  if (bmi < 30) return 'Sobrepeso';
  if (bmi < 35) return 'Obesidade grau I';
  if (bmi < 40) return 'Obesidade grau II';
  return 'Obesidade grau III';
}

function calculateBmi(weight: unknown, heightCm: unknown) {
  const parsedWeight = Number(String(weight ?? '').replace(',', '.'));
  const parsedHeightCm = Number(String(heightCm ?? '').replace(',', '.'));
  if (!parsedWeight || !parsedHeightCm) return { bmi: '', classification: '' };

  const heightM = parsedHeightCm / 100;
  const bmi = parsedWeight / (heightM * heightM);
  const rounded = Number(bmi.toFixed(1));
  return {
    bmi: String(rounded).replace('.', ','),
    classification: classifyBmi(rounded),
  };
}

function formatRecordValue(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') {
    const vaccineRows = PEDIATRIC_VACCINE_SCHEDULE.flatMap(group =>
      group.vaccines.map(vaccine => {
        const item = (value as Record<string, any>)[vaccine.id];
        if (!item?.done) return '';
        return `${group.age} - ${vaccine.name} (${vaccine.dose})${item.date ? ` em ${item.date}` : ''}`;
      })
    ).filter(Boolean);

    if (vaccineRows.length > 0) return vaccineRows.join('\n');
    return '';
  }
  return String(value ?? '');
}

function normalizeClinicalText(value: unknown) {
  return formatRecordValue(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getDiagnosisSuggestions(formData: Record<string, any>, specialty: string) {
  const clinicalText = normalizeClinicalText(Object.values(formData).join(' '));
  if (clinicalText.trim().length < 4) return [];

  return DIAGNOSIS_SUGGESTIONS
    .map(item => {
      const specialtyMatch = item.specialties.includes(specialty);
      const keywordMatches = item.keywords.reduce((total, keyword) => {
        const normalizedKeyword = normalizeClinicalText(keyword);
        return clinicalText.includes(normalizedKeyword) ? total + 1 : total;
      }, 0);
      const specialtyBoost = specialtyMatch ? 2 : 0;

      return { ...item, keywordMatches, specialtyMatch, score: keywordMatches + specialtyBoost };
    })
    .filter(item => item.keywordMatches > 0 && (item.specialtyMatch || specialty === 'Outro'))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 6);
}

function getExamSuggestions(formData: Record<string, any>, specialty: string) {
  const clinicalText = normalizeClinicalText(Object.values(formData).join(' '));
  if (clinicalText.trim().length < 4) return [];

  return EXAM_SUGGESTIONS
    .map(item => {
      const specialtyMatch = item.specialties.includes(specialty);
      const keywordMatches = item.keywords.reduce((total, keyword) => {
        const normalizedKeyword = normalizeClinicalText(keyword);
        return clinicalText.includes(normalizedKeyword) ? total + 1 : total;
      }, 0);
      const specialtyBoost = specialtyMatch ? 2 : 0;

      return { ...item, keywordMatches, specialtyMatch, score: keywordMatches + specialtyBoost };
    })
    .filter(item => item.keywordMatches > 0 && (item.specialtyMatch || specialty === 'Outro'))
    .sort((a, b) => b.score - a.score || a.exam.localeCompare(b.exam))
    .slice(0, 8);
}

function toggleListValue(value: string, currentValue: unknown) {
  const current = formatRecordValue(currentValue)
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);

  return current.includes(value)
    ? current.filter(item => item !== value).join('\n')
    : [...current, value].join('\n');
}
/* ── Main component ──────────────────────────────────────────── */
export default function MedicalRecords() {
  const { data: patients=[], isLoading: loadingPts } = usePatients();
  const { data: currentProfile } = useCurrentProfile();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();

  const [selectedPatient, setSelectedPatient] = useState<Patient|null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState('Psicologia');
  const [tab, setTab] = useState<'evolution'|'history'>('evolution');
  const [openSections, setOpenSections] = useState<Record<string,boolean>>({});
  const [formData, setFormData] = useState<Record<string,any>>({});
  const [formMeta, setFormMeta] = useState({ type:'Retorno', date: new Date().toISOString().split('T')[0], professional:'' });
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const allowedSpecialties = allowedSpecialtiesForProfile(currentProfile);
  const specialtyOptions = allowedSpecialties.length > 0 ? allowedSpecialties : SPECIALTIES;
  const resolveSpecialty = (value?: string | null) => {
    const specialty = canonicalSpecialty(value);
    return specialtyOptions.includes(specialty) ? specialty : specialtyOptions[0] ?? 'Psicologia';
  };

  useEffect(() => {
    setSelectedSpecialty(prev => resolveSpecialty(prev));
  }, [currentProfile?.specialty, currentProfile?.role]);

  useEffect(() => {
    const patientId = searchParams.get('patient');
    const patientName = searchParams.get('patientName');
    if ((!patientId && !patientName) || patients.length === 0) return;
    if (patientId && selectedPatient?.id === patientId) return;
    if (patientName && selectedPatient?.name?.toLowerCase() === patientName.toLowerCase()) return;

    const patient = patients.find(p => p.id === patientId || p.name?.toLowerCase() === patientName?.toLowerCase());
    if (patient) {
      setSelectedPatient(patient);
      setSelectedSpecialty(resolveSpecialty(patient.specialty));
      setFormData({});
      setTab('evolution');
    }
  }, [patients, searchParams, selectedPatient?.id, currentProfile?.specialty, currentProfile?.role]);

  // Records for selected patient
  const { data: records=[], isLoading: loadingRec } = useQuery({
    queryKey: ['records', selectedPatient?.id],
    queryFn: () => selectedPatient ? medicalRecordsDb.getByPatient(selectedPatient.id) : Promise.resolve([]),
    enabled: !!selectedPatient,
  });

  const saveMut = useMutation({
    mutationFn: (data: any) => medicalRecordsDb.insert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['records', selectedPatient?.id] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setFormData({});
    },
  });

  const deleteMut = useMutation({
    mutationFn: medicalRecordsDb.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['records', selectedPatient?.id] }),
  });

  const template = TEMPLATES[selectedSpecialty] ?? DEFAULT_TEMPLATE;
  const diagnosisSuggestions = getDiagnosisSuggestions(formData, selectedSpecialty);
  const examSuggestions = getExamSuggestions(formData, selectedSpecialty);
  const setField = (key: string, val: any) => setFormData(p => ({ ...p, [key]: val }));
  const toggle = (t: string) => setOpenSections(p => ({ ...p, [t]: !p[t] }));
  const bmiResult = selectedSpecialty === 'Nutrição'
    ? calculateBmi(formData.weight, formData.height)
    : { bmi: '', classification: '' };

  useEffect(() => {
    if (selectedSpecialty !== 'Nutrição') return;
    const next = calculateBmi(formData.weight, formData.height);
    setFormData(prev => {
      if ((prev.bmi ?? '') === next.bmi && (prev.bmi_classification ?? '') === next.classification) return prev;
      return {
        ...prev,
        bmi: next.bmi,
        bmi_classification: next.classification,
      };
    });
  }, [selectedSpecialty, formData.weight, formData.height]);

  const handleSave = async () => {
    if (!selectedPatient) return;
    setSaveError('');
    // Collect all form fields into notes/complaint/diagnosis
    const notes = Object.entries(formData)
      .map(([k,v]) => `${k}: ${formatRecordValue(v)}`)
      .join('\n');
    try {
      await saveMut.mutateAsync({
        patientId: selectedPatient.id,
        date: formMeta.date,
        type: formMeta.type,
        specialty: selectedSpecialty,
        complaint: formData.complaint ?? '',
        diagnosis: formData.diagnosis ?? '',
        prescription: formData.prescription ?? '',
        notes,
        professional: formMeta.professional,
      });
    } catch(e: any) {
      setSaveError(e.message ?? 'Erro ao salvar.');
    }
  };

  const handlePrint = () => {
    if (!selectedPatient) return;

    const filledFields = Object.entries(formData).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && String(value).trim() !== '';
    });
    const fieldRows = filledFields.length
      ? filledFields.map(([key, value]) => `
          <tr>
            <th>${key.replace(/_/g, ' ')}</th>
            <td>${formatRecordValue(value)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="2">Nenhum campo preenchido nesta evolução.</td></tr>';

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Prontuário - ${selectedPatient.name}</title>
          <style>
            @page { size: A4; margin: 18mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #0f172a;
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.45;
            }
            header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 2px solid #1d4ed8;
              padding-bottom: 14px;
              margin-bottom: 18px;
            }
            .brand { font-size: 18px; font-weight: 700; color: #1d4ed8; }
            .subtitle { color: #64748b; margin-top: 2px; }
            .meta { text-align: right; color: #475569; }
            h1 { font-size: 20px; margin: 0 0 10px; }
            h2 {
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: .04em;
              color: #1d4ed8;
              border-bottom: 1px solid #dbeafe;
              padding-bottom: 6px;
              margin: 20px 0 10px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 18px;
            }
            .item strong { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; vertical-align: top; }
            th {
              width: 32%;
              background: #f8fafc;
              color: #475569;
              text-align: left;
              text-transform: capitalize;
            }
            .signature {
              margin-top: 44px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 32px;
            }
            .line { border-top: 1px solid #94a3b8; padding-top: 8px; text-align: center; color: #475569; }
          </style>
        </head>
        <body>
          <header>
            <div>
              <div class="brand">Nucleus Health Platform</div>
              <div class="subtitle">Prontuário eletrônico</div>
            </div>
            <div class="meta">
              <div>Impresso em ${new Date().toLocaleString('pt-BR')}</div>
              <div>${selectedSpecialty}</div>
            </div>
          </header>

          <h1>${selectedPatient.name}</h1>
          <section class="grid">
            <div class="item"><strong>Paciente</strong>${selectedPatient.name}</div>
            <div class="item"><strong>Data de nascimento</strong>${selectedPatient.dob || '-'}</div>
            <div class="item"><strong>CPF</strong>${selectedPatient.cpf || '-'}</div>
            <div class="item"><strong>Telefone</strong>${selectedPatient.phone || '-'}</div>
            <div class="item"><strong>E-mail</strong>${selectedPatient.email || '-'}</div>
            <div class="item"><strong>Plano</strong>${selectedPatient.plan || '-'}</div>
          </section>

          <h2>Atendimento</h2>
          <section class="grid">
            <div class="item"><strong>Tipo</strong>${formMeta.type}</div>
            <div class="item"><strong>Data</strong>${new Date(`${formMeta.date}T12:00:00`).toLocaleDateString('pt-BR')}</div>
            <div class="item"><strong>Especialidade</strong>${selectedSpecialty}</div>
            <div class="item"><strong>Profissional</strong>${formMeta.professional || selectedPatient.professional || '-'}</div>
          </section>

          <h2>Evolução</h2>
          <table>
            ${fieldRows}
          </table>

          <div class="signature">
            <div class="line">Assinatura do profissional</div>
            <div class="line">Registro profissional</div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="flex h-full overflow-hidden animate-fade-in" style={{ height:'calc(100vh - 60px)' }}>

      {/* Sidebar — Patient list */}
      <div className="w-64 flex-shrink-0 border-r border-slate-100 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-sm">Prontuários</h2>
          <p className="text-xs text-slate-400 mt-0.5">{patients.length} pacientes</p>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
          {loadingPts ? (
            <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-slate-400"/></div>
          ) : patients.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">Nenhum paciente cadastrado</div>
          ) : patients.map(p => (
            <button key={p.id} onClick={() => { setSelectedPatient(p); setSelectedSpecialty(resolveSpecialty(p.specialty)); setFormData({}); setTab('evolution'); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left
                ${selectedPatient?.id===p.id?'medical-record-patient-active bg-primary-50 border border-primary-200':'hover:bg-slate-50'}`}>
              <div className={`avatar-sm ${avatarColor(p.name)} flex-shrink-0`}>{initials(p.name)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-800 truncate">{p.name}</div>
                <div className="text-xs text-slate-500">{p.specialty||'—'}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      {!selectedPatient ? (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <FileText size={28} className="text-slate-400"/>
            </div>
            <p className="font-medium text-slate-600">Selecione um paciente</p>
            <p className="text-sm text-slate-400 mt-1">para abrir o prontuário</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">

          {/* Patient header */}
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className={`avatar-lg ${avatarColor(selectedPatient.name)}`}>{initials(selectedPatient.name)}</div>
              <div>
                <h2 className="font-bold text-lg text-slate-900">{selectedPatient.name}</h2>
                <div className="flex items-center gap-3 mt-0.5">
                  <select value={selectedSpecialty} onChange={e=>setSelectedSpecialty(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {specialtyOptions.map(s=><option key={s}>{s}</option>)}
                  </select>
                  {allowedSpecialties.length > 0 && (
                    <span className="badge badge-green">Acesso por especialidade</span>
                  )}
                  <span className="badge badge-blue">{records.length} evoluções</span>
                  {selectedPatient.phone && <span className="text-xs text-slate-500">{selectedPatient.phone}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="btn-secondary btn-sm"><Printer size={13}/> Imprimir</button>
              <button onClick={handleSave} disabled={saveMut.isPending||!selectedPatient}
                className="btn-primary btn-sm min-w-[140px] justify-center">
                {saveMut.isPending?<><Loader2 size={13} className="animate-spin"/>Salvando...</>:<><Save size={13}/> Salvar evolução</>}
              </button>
            </div>
          </div>

          {/* Alerts */}
          <div className="mx-6 mt-4 flex-shrink-0 space-y-2">
            {saveError && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><AlertCircle size={14}/>{saveError}</div>}
            {saveSuccess && <div className="flex items-center gap-2 p-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-700"><CheckCircle2 size={14}/>Evolução salva com sucesso!</div>}
            <div className="card p-3.5 bg-amber-50 border border-amber-100 flex items-center gap-3">
              <Brain size={16} className="text-amber-600 flex-shrink-0"/>
              <p className="text-xs text-amber-700"><strong>Nucleus AI:</strong> A IA apoia a organização do atendimento, mas a decisão clínica é sempre do profissional.</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mx-6 mt-4 flex gap-1 flex-shrink-0">
            {[{key:'evolution',label:'Nova Evolução'},{key:'history',label:`Histórico (${records.length})`}].map(t=>(
              <button key={t.key} onClick={()=>setTab(t.key as any)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all
                  ${tab===t.key?'bg-white border border-slate-200 text-primary-600 shadow-sm':'text-slate-500 hover:bg-white/50'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">

            {tab==='evolution' && (
              <>
                {/* Meta */}
                <div className="card p-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label">Tipo de atendimento</label>
                      <select className="input" value={formMeta.type} onChange={e=>setFormMeta(p=>({...p,type:e.target.value}))}>
                        {['Primeira consulta','Retorno','Sessão','Procedimento','Avaliação','Teleconsulta'].map(o=><option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Data</label>
                      <input type="date" className="input" value={formMeta.date} onChange={e=>setFormMeta(p=>({...p,date:e.target.value}))}/>
                    </div>
                    <div>
                      <label className="label">Profissional</label>
                      <input className="input" value={formMeta.professional} onChange={e=>setFormMeta(p=>({...p,professional:e.target.value}))} placeholder="Dra. Ana M."/>
                    </div>
                  </div>
                </div>

                {/* Template sections */}
                {template.sections.map(section => {
                  const Icon = section.icon;
                  const isOpen = openSections[section.title] !== false;
                  return (
                    <div key={section.title} className="card overflow-hidden">
                      <button onClick={()=>toggle(section.title)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center"><Icon size={16} className="text-primary-600"/></div>
                          <span className="font-semibold text-slate-800">{section.title}</span>
                        </div>
                        {isOpen?<ChevronDown size={16} className="text-slate-400"/>:<ChevronRight size={16} className="text-slate-400"/>}
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-50">
                          {section.fields.map(field => (
                            <div key={field.key} className={field.type==='textarea'||field.type==='scale'||field.type==='multiselect'||field.type==='vaccine-card'?'sm:col-span-2':''}>
                              {field.type==='scale' ? (
                                <ScaleInput label={field.label} value={formData[field.key]??0} onChange={v=>setField(field.key,v)}/>
                              ) : field.type==='vaccine-card' ? (
                                <VaccineCardInput
                                  value={formData[field.key] ?? {}}
                                  onChange={value => setField(field.key, value)}
                                />
                              ) : field.type==='multiselect' ? (
                                <div>
                                  <label className="label">{field.label}</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white p-3">
                                    {field.options?.map(option => {
                                      const selected = Array.isArray(formData[field.key]) && formData[field.key].includes(option);
                                      return (
                                        <label
                                          key={option}
                                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                            selected
                                              ? 'border-primary-300 bg-primary-50 text-primary-700'
                                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            className="h-4 w-4 accent-primary-600"
                                            checked={selected}
                                            onChange={e => {
                                              const current = Array.isArray(formData[field.key]) ? formData[field.key] : [];
                                              setField(
                                                field.key,
                                                e.target.checked
                                                  ? [...current, option]
                                                  : current.filter((item: string) => item !== option)
                                              );
                                            }}
                                          />
                                          <span>{option}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : field.type==='select' ? (
                                <div><label className="label">{field.label}</label>
                                  <select className="input" value={formData[field.key]??''} onChange={e=>setField(field.key,e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {field.options?.map(o=><option key={o}>{o}</option>)}
                                  </select>
                                </div>
                              ) : field.type==='textarea' ? (
                                <div><label className="label">{field.label}</label>
                                  <textarea rows={3} className="input resize-none" value={formData[field.key]??''}
                                    onChange={e=>setField(field.key,e.target.value)} placeholder={`Digite ${field.label.toLowerCase()}...`}/>
                                </div>
                              ) : field.key === 'bmi' ? (
                                <div>
                                  <label className="label">{field.label}</label>
                                  <input className="input bg-slate-50" value={bmiResult.bmi} readOnly placeholder="Calculado automaticamente"/>
                                  {bmiResult.classification && (
                                    <div className="mt-2 inline-flex items-center rounded-lg bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                                      {bmiResult.classification}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div><label className="label">{field.label}</label>
                                  <input type={field.type} className="input" value={formData[field.key]??''}
                                    onChange={e=>setField(field.key,e.target.value)} placeholder={field.label}/>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {Array.isArray(formData.dsm_domains) && formData.dsm_domains.length > 0 && (
                  <DsmSubspecialtyGuidance domains={formData.dsm_domains} />
                )}

                {Array.isArray(formData.psychology_screening_tools) && formData.psychology_screening_tools.length > 0 && (
                  <ScreeningTestsInput
                    selectedTools={formData.psychology_screening_tools}
                    value={formData.screening_tests ?? {}}
                    onChange={value => setField('screening_tests', value)}
                  />
                )}

                {/* General notes */}
                <div className="card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Edit3 size={15} className="text-slate-600"/></div>
                    <span className="font-semibold text-slate-800">Observações e Conduta</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="label">Observações clínicas</label>
                      <textarea rows={4} className="input resize-none" value={formData.notes??''} onChange={e=>setField('notes',e.target.value)} placeholder="Evolução clínica da sessão..."/>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Prescrição / conduta</label>
                      <textarea rows={3} className="input resize-none" value={formData.prescription??''} onChange={e=>setField('prescription',e.target.value)} placeholder="Orientações ao paciente..."/>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Exames a solicitar</label>
                      <textarea rows={3} className="input resize-none" value={formData.exams_requested??''} onChange={e=>setField('exams_requested',e.target.value)} placeholder="Exames laboratoriais, imagem, avaliação complementar..."/>
                      {examSuggestions.length > 0 && (
                        <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/70 p-3">
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-teal-700">
                            <Clipboard size={13}/>
                            Sugestões de exames pela queixa
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {examSuggestions.map(item => {
                              const selected = formatRecordValue(formData.exams_requested).split('\n').map(v => v.trim()).includes(item.exam);
                              return (
                                <button
                                  key={item.exam}
                                  type="button"
                                  onClick={() => setField('exams_requested', toggleListValue(item.exam, formData.exams_requested))}
                                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                                    selected
                                      ? 'border-teal-400 bg-teal-600 text-white'
                                      : 'border-teal-200 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-700'
                                  }`}
                                  title="Adicionar ou remover exame"
                                >
                                  {item.exam}
                                </button>
                              );
                            })}
                          </div>
                          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                            Sugestões de apoio. Solicitação final depende da avaliação clínica, urgência e disponibilidade.
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="label">Diagnóstico / hipótese</label>
                      <input className="input" value={formData.diagnosis??''} onChange={e=>setField('diagnosis',e.target.value)} placeholder="CID, hipótese diagnóstica..."/>
                      {diagnosisSuggestions.length > 0 && (
                        <div className="mt-3 rounded-xl border border-primary-100 bg-primary-50/60 p-3">
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary-700">
                            <Brain size={13}/>
                            Possíveis hipóteses e CIDs
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {diagnosisSuggestions.map(item => {
                              const value = `${item.cid} - ${item.label}`;
                              return (
                                <button
                                  key={item.cid}
                                  type="button"
                                  onClick={() => setField('diagnosis', value)}
                                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                                    formData.diagnosis === value
                                      ? 'border-primary-400 bg-primary-600 text-white'
                                      : 'border-primary-200 bg-white text-slate-700 hover:border-primary-300 hover:text-primary-700'
                                  }`}
                                  title="Selecionar hipótese diagnóstica"
                                >
                                  <span className="font-bold">{item.cid}</span>
                                  <span className="ml-1">{item.label}</span>
                                </button>
                              );
                            })}
                          </div>
                          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                            Sugestões baseadas no texto preenchido. Confirme o CID conforme avaliação clínica.
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="label">Próximo retorno</label>
                      <input type="date" className="input" value={formData.next_return??''} onChange={e=>setField('next_return',e.target.value)}/>
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab==='history' && (
              <div className="card p-6">
                <h3 className="section-title mb-6">Histórico de Evoluções</h3>
                {loadingRec ? (
                  <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400"/></div>
                ) : records.length===0 ? (
                  <div className="py-12 text-center">
                    <FileText size={24} className="mx-auto text-slate-300 mb-2"/>
                    <p className="text-sm text-slate-400">Nenhuma evolução registrada ainda</p>
                    <button onClick={()=>setTab('evolution')} className="btn-primary btn-sm mt-3"><Plus size={13}/> Registrar primeira evolução</button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200"/>
                    <div className="space-y-6 pl-14">
                      {records.map((rec: any) => (
                        <div key={rec.id} className="relative">
                          <div className="absolute -left-9 w-4 h-4 rounded-full bg-white border-2 border-primary-400 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-primary-400"/>
                          </div>
                          <div className="card p-4 hover:shadow-card-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-800">
                                  {new Date(rec.date).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="badge badge-blue text-[10px]">{rec.type}</span>
                                {rec.professional && <span className="text-xs text-slate-400">{rec.professional}</span>}
                              </div>
                              <button onClick={()=>deleteMut.mutate(rec.id)} disabled={deleteMut.isPending}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={12}/>
                              </button>
                            </div>
                            {rec.complaint && <p className="text-xs text-slate-500 mb-1"><strong>Queixa:</strong> {rec.complaint}</p>}
                            {rec.diagnosis && <p className="text-xs text-slate-500 mb-1"><strong>Diagnóstico:</strong> {rec.diagnosis}</p>}
                            {rec.notes && <p className="text-sm text-slate-600 line-clamp-3">{rec.notes}</p>}
                            {rec.prescription && <p className="text-xs text-slate-500 mt-2 italic">{rec.prescription}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
