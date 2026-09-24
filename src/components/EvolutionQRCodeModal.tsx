import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, RefreshCw, X } from 'lucide-react';
import { evolutionApi } from '../lib/evolution';
import type { WhatsAppChannel } from '../types';

type QRStatus = 'loading' | 'qr_ready' | 'connected' | 'error';

interface Props {
  channel: WhatsAppChannel;
  onClose: () => void;
  onConnect: () => void;
}

export function EvolutionQRCodeModal({ channel, onClose, onConnect }: Props) {
  const [status, setStatus] = useState<QRStatus>('loading');
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const pollConnection = () => {
    clearPoll();
    pollRef.current = setInterval(async () => {
      try {
        const result = await evolutionApi.connectionState(channel.id);
        if (result.state === 'open' || result.state === 'connected') {
          clearPoll();
          setStatus('connected');
          window.setTimeout(onConnect, 900);
        }
      } catch {
        // A criacao pode levar alguns segundos.
      }
    }, 3000);
  };

  const loadQRCode = async () => {
    clearPoll();
    setStatus('loading');
    setError('');
    try {
      const result = await evolutionApi.createInstance(channel.id);
      if (!result.qrCode) throw new Error('A Evolution API nao retornou o QR Code.');
      setQrCode(result.qrCode.startsWith('data:') ? result.qrCode : `data:image/png;base64,${result.qrCode}`);
      setStatus('qr_ready');
      pollConnection();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nao foi possivel conectar o WhatsApp.');
      setStatus('error');
    }
  };

  useEffect(() => {
    void loadQRCode();
    return clearPoll;
  }, [channel.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="font-semibold text-gray-900">Conectar WhatsApp</h2>
            <p className="text-sm text-gray-500">{channel.name} - {channel.number}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex size-52 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
            {status === 'loading' && <Loader2 size={38} className="animate-spin text-emerald-600" />}
            {status === 'qr_ready' && <img src={qrCode} alt="QR Code do WhatsApp" className="size-full object-contain p-1" />}
            {status === 'connected' && (
              <div>
                <CheckCircle size={48} className="mx-auto mb-2 text-emerald-600" />
                <p className="font-medium text-emerald-700">WhatsApp conectado</p>
              </div>
            )}
            {status === 'error' && (
              <div className="px-4">
                <AlertCircle size={36} className="mx-auto mb-2 text-red-500" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {status === 'qr_ready' && (
            <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-left text-xs text-emerald-800">
              Abra o WhatsApp, acesse Dispositivos conectados e escaneie o QR Code. A conexao sera confirmada automaticamente.
            </div>
          )}

          {status === 'error' && (
            <button
              type="button"
              onClick={() => void loadQRCode()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={15} /> Tentar novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
