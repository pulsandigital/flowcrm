import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

type AuthView = 'login' | 'forgot';

export default function Login() {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(translateError(error.message));
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    });
    if (error) {
      setError(translateError(error.message));
    } else {
      setSuccessMsg('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    }
    setLoading(false);
  };

  const translateError = (msg: string) => {
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
    if (msg.includes('Too many requests')) return 'Muitas tentativas. Aguarde alguns minutos.';
    return 'Ocorreu um erro. Tente novamente.';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-violet-50 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-100 rounded-full opacity-40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-gray-50">
            <div className="flex items-center justify-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-md shadow-primary-200">
                <Zap size={22} className="text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900 tracking-tight">FlowCRM</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              {view === 'login' ? 'Bem-vindo de volta' : 'Recuperar senha'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {view === 'login'
                ? 'Entre na sua conta para continuar'
                : 'Enviaremos um link de recuperação para o seu e-mail'}
            </p>
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            {successMsg ? (
              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-800">{successMsg}</p>
                  <button onClick={() => { setView('login'); setSuccessMsg(''); }} className="text-xs text-emerald-600 hover:underline mt-1">
                    Voltar ao login
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={view === 'login' ? handleLogin : handleForgot} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {view === 'login' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {view === 'login' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setError(''); }}
                      className="text-sm text-primary-600 hover:text-primary-700 hover:underline font-medium"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 active:bg-primary-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary-200 mt-2"
                >
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Entrando...</>
                  ) : (
                    view === 'login' ? 'Entrar' : 'Enviar link de recuperação'
                  )}
                </button>

                {view === 'forgot' && (
                  <button
                    type="button"
                    onClick={() => { setView('login'); setError(''); }}
                    className="w-full py-2.5 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    ← Voltar ao login
                  </button>
                )}
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-gray-400">
              Ao entrar, você concorda com os{' '}
              <a href="#" className="text-primary-500 hover:underline">Termos de Uso</a>
              {' '}e a{' '}
              <a href="#" className="text-primary-500 hover:underline">Política de Privacidade</a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          FlowCRM © {new Date().getFullYear()} — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
