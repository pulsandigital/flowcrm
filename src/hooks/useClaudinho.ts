import { useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { loadKnowledgeBase } from '../agents/knowledge-base-loader';
import type { AgentMessage, AgentResponse, CRMContext } from '../agents/types';

interface UseClaudinhoReturn {
  /** Send a message to Claudinho and get a response */
  ask: (message: string, context?: CRMContext) => Promise<string>;
  isLoading: boolean;
  error: string | null;
  /** Full conversation history with Claudinho */
  history: AgentMessage[];
  /** Clear conversation history */
  clearHistory: () => void;
}

const DEMO_RESPONSES: Record<string, string> = {
  default:
    '👋 Olá! Sou o **Claudinho**, seu agente orquestrador do FlowCRM.\n\nEstou em modo demo — para me ativar com inteligência real, configure:\n\n1. `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env`\n2. Faça o deploy da Edge Function: `supabase functions deploy claudinho`\n3. Adicione `ANTHROPIC_API_KEY` nas variáveis de ambiente da Edge Function\n\nQuando estiver configurado, poderei:\n- Qualificar leads com análise BANT\n- Analisar seu pipeline e sugerir estratégias\n- Criar templates personalizados\n- Sugerir respostas para conversas',
};

export function useClaudinho(): UseClaudinhoReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AgentMessage[]>([]);

  const ask = useCallback(async (message: string, context?: CRMContext): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      // Demo mode — Supabase not configured
      if (!isSupabaseConfigured) {
        await new Promise(r => setTimeout(r, 800)); // simulated delay
        const demo = DEMO_RESPONSES.default;
        setHistory(h => [
          ...h,
          { role: 'user', content: message },
          { role: 'assistant', content: demo },
        ]);
        return demo;
      }

      // Load knowledge base from local markdown files
      const knowledgeBase = loadKnowledgeBase();

      // Call Claudinho Edge Function
      const { data, error: fnError } = await supabase.functions.invoke<AgentResponse>('claudinho', {
        body: {
          message,
          context: context ?? {},
          knowledgeBase,
          conversationHistory: history,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.content) throw new Error('Claudinho não retornou resposta.');

      const response = data.content;
      setHistory(h => [
        ...h,
        { role: 'user', content: message },
        { role: 'assistant', content: response },
      ]);
      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar com o Claudinho';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [history]);

  return {
    ask,
    isLoading,
    error,
    history,
    clearHistory: () => setHistory([]),
  };
}
