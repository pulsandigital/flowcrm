import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
  recovering: boolean;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, recovering: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, recovering: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro na interface:', error, info);

    if (isRecoverableChunkError(error) && !sessionStorage.getItem('nucleus_chunk_reload_done')) {
      sessionStorage.setItem('nucleus_chunk_reload_done', '1');
      this.setState({ recovering: true });
      window.location.reload();
      return;
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    if (this.state.recovering) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <RefreshCw size={22} className="animate-spin text-primary-600" />
            <span className="text-sm font-medium">Atualizando a plataforma...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-red-100 rounded-2xl shadow-card p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">Nao foi possivel carregar esta tela</h1>
          <p className="text-sm text-slate-500 mb-5">
            Atualize a pagina. Se continuar acontecendo, envie o erro do console para o suporte.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary w-full justify-center"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>
    );
  }
}

function isRecoverableChunkError(error: Error) {
  const message = `${error?.name ?? ''} ${error?.message ?? ''}`.toLowerCase();
  return [
    'failed to fetch dynamically imported module',
    'importing a module script failed',
    'loading chunk',
    'chunkloaderror',
    'css chunk load failed',
  ].some(signature => message.includes(signature));
}
