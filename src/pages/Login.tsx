import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Shield, Activity, Brain, FileText, UserRound, Stethoscope } from 'lucide-react';
import nucleusIdv from '../assets/nucleus-idv.svg';

type AuthView = 'login' | 'forgot' | 'signup';
type PortalMode = 'professional' | 'patient';

interface Props {
  onLogin: (portalMode?: PortalMode) => void;
  errorMessage?: string | null;
  successMessage?: string | null;
}

const FEATURES = [
  { icon: Activity, label: 'CRM + WhatsApp integrado' },
  { icon: FileText, label: 'Prontuario eletronico modular' },
  { icon: Brain, label: 'IA para apoio clinico e comercial' },
  { icon: Shield, label: 'Seguranca, LGPD e controle total' },
];

export default function Login({ onLogin, errorMessage, successMessage }: Props) {
  const [view, setView] = useState<AuthView>(
    errorMessage?.toLowerCase().includes('expir') ? 'forgot' : 'login'
  );
  const [portalMode, setPortalMode] = useState<PortalMode>('professional');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(successMessage ?? '');

  useEffect(() => {
    if (errorMessage?.toLowerCase().includes('expir')) {
      setView('forgot');
    }
  }, [errorMessage]);

  useEffect(() => {
    setSuccessMsg(successMessage ?? '');
  }, [successMessage]);

  const modeCopy = portalMode === 'professional'
    ? {
        title: 'Bem-vindo de volta',
        subtitle: 'Entre no Nucleus Profissional',
        button: 'Entrar no Nucleus Profissional',
        google: 'Entrar com Google',
      }
    : {
        title: 'Portal do Paciente',
        subtitle: 'Acesse o Nucleus Paciente',
        button: 'Entrar no Nucleus Paciente',
        google: 'Entrar com Google',
      };

  const translateError = (msg: string) => {
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
    if (msg.includes('Too many requests')) return 'Muitas tentativas. Aguarde alguns minutos.';
    return 'Ocorreu um erro. Tente novamente.';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isSupabaseConfigured) {
      setError('Supabase nao esta configurado. Verifique as variaveis de ambiente.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(translateError(error.message));
    else onLogin(portalMode);
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isSupabaseConfigured) {
      setError('Supabase nao esta configurado. Verifique as variaveis de ambiente.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { account_type: 'professional' },
      },
    });

    if (error) setError(translateError(error.message));
    else setSuccessMsg('Conta criada! Verifique seu e-mail para confirmar o acesso.');
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError('');

    if (!isSupabaseConfigured) {
      setError('Supabase nao esta configurado. Verifique as variaveis de ambiente.');
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isSupabaseConfigured) {
      setError('Supabase nao esta configurado. Verifique as variaveis de ambiente.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) setError(translateError(error.message));
    else setSuccessMsg('E-mail de recuperacao enviado! Verifique sua caixa de entrada.');
    setLoading(false);
  };

  const title = view === 'login'
    ? modeCopy.title
    : view === 'signup'
      ? 'Criar conta'
      : 'Recuperar acesso';

  const subtitle = view === 'login'
    ? modeCopy.subtitle
    : view === 'signup'
      ? 'Crie sua conta para comecar'
      : 'Enviaremos um link para seu e-mail';

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="hidden lg:flex lg:w-[46%] bg-gradient-nucleus flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-mesh opacity-80" />
          <div className="absolute -bottom-28 -right-24 w-96 h-96 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="absolute top-20 right-12 w-72 h-72 rounded-full bg-teal-200/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20 shadow-glow">
              <Zap size={22} className="text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-white tracking-tight">Nucleus</div>
              <div className="text-[10px] text-emerald-100/60 font-medium tracking-widest">HEALTH PLATFORM</div>
            </div>
          </div>

          <div className="max-w-md">
            <img src={nucleusIdv} alt="Identidade visual Nucleus" className="mb-8 w-full max-w-[420px] rounded-[2rem] shadow-2xl shadow-emerald-950/30 border border-white/10" />
            <h1 className="text-3xl font-bold text-white leading-tight mb-4">
              O nucleo inteligente para clinicas e profissionais da saude
            </h1>
            <p className="text-emerald-50/70 text-sm leading-relaxed max-w-sm">
              CRM, prontuario, financeiro, marketing e IA em uma unica plataforma para negocios da saude.
            </p>
          </div>

          <div className="space-y-3 mt-10">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/10">
                  <Icon size={15} className="text-emerald-50/90" />
                </div>
                <span className="text-sm text-emerald-50/75">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            <span className="text-xs text-emerald-50/70">Plataforma em operacao</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Nucleus</span>
          </div>

          <div className="mb-5">
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          </div>

          {view === 'login' && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-emerald-50 border border-emerald-100 rounded-2xl mb-5">
              <button
                type="button"
                onClick={() => setPortalMode('professional')}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                  portalMode === 'professional'
                    ? 'bg-white text-primary-700 shadow-sm border border-emerald-100'
                    : 'text-slate-600 hover:text-primary-700'
                }`}
              >
                <Stethoscope size={15} />
                Profissional
              </button>
              <button
                type="button"
                onClick={() => setPortalMode('patient')}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                  portalMode === 'patient'
                    ? 'bg-white text-primary-700 shadow-sm border border-emerald-100'
                    : 'text-slate-600 hover:text-primary-700'
                }`}
              >
                <UserRound size={15} />
                Paciente
              </button>
            </div>
          )}

          {successMsg ? (
            <div className="card p-5 text-center animate-scale-in">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-800 mb-1">{successMsg}</p>
              <button onClick={() => { setView('login'); setSuccessMsg(''); }} className="text-xs text-primary-600 hover:underline mt-2">
                Voltar ao login
              </button>
            </div>
          ) : (
            <>
              {(view === 'login' || view === 'signup') && isSupabaseConfigured && portalMode === 'professional' && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm transition-all bg-white mb-4"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {modeCopy.google}
                  </button>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400 font-medium">ou</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                </>
              )}

              <form onSubmit={view === 'login' ? handleLogin : view === 'signup' ? handleSignup : handleForgot} className="space-y-4">
                {(error || errorMessage) && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">
                      {error || (errorMessage?.toLowerCase().includes('expired')
                        ? 'O link de recuperacao expirou. Solicite um novo abaixo.'
                        : errorMessage)}
                    </p>
                  </div>
                )}

                <div>
                  <label className="label">E-mail</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required className="input pl-10" />
                  </div>
                </div>

                {view !== 'forgot' && (
                  <div>
                    <label className="label">Senha</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="********" required className="input pl-10 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}

                {view === 'login' && (
                  <div className="flex justify-between items-center">
                    {portalMode === 'professional' ? (
                      <button type="button" onClick={() => { setView('signup'); setError(''); }} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                        Criar conta
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">Acesso liberado pela clínica</span>
                    )}
                    <button type="button" onClick={() => { setView('forgot'); setError(''); }} className="text-xs text-slate-500 hover:text-slate-700">
                      Esqueci minha senha
                    </button>
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all disabled:opacity-60 shadow-sm shadow-primary-200">
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> {view === 'signup' ? 'Criando...' : 'Entrando...'}</>
                    : view === 'login' ? modeCopy.button
                    : view === 'signup' ? 'Criar conta'
                    : 'Enviar link de recuperação'
                  }
                </button>

                {(view === 'forgot' || view === 'signup') && (
                  <button type="button" onClick={() => { setView('login'); setError(''); }} className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors">
                    Voltar ao login
                  </button>
                )}
              </form>
            </>
          )}

          <p className="text-center text-xs text-slate-400 mt-8">
            Ao entrar, você concorda com os{' '}
            <a href="/termos-de-uso" className="text-primary-500 hover:underline">Termos de Uso</a>
            {' '}e a{' '}
            <a href="/politica-de-privacidade" className="text-primary-500 hover:underline">Política de Privacidade</a>
          </p>
          <p className="text-center text-xs text-slate-300 mt-2">
            Nucleus (c) {new Date().getFullYear()} - Todos os direitos reservados
          </p>
        </div>
      </main>
    </div>
  );
}
