import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Video } from 'lucide-react';

function sanitizeRoom(value?: string) {
  return String(value || 'nucleus-consulta')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export default function VideoCall() {
  const navigate = useNavigate();
  const { appointmentId } = useParams();
  const room = useMemo(() => `nucleus-${sanitizeRoom(appointmentId)}`, [appointmentId]);
  const url = `https://meet.jit.si/${room}#config.prejoinPageEnabled=false&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false`;

  return (
    <div className="flex h-full min-h-[calc(100vh-60px)] flex-col bg-slate-950">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-white">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/15">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 font-bold"><Video size={17} /> Chamada Nucleus</div>
            <div className="text-xs text-white/55">Sala interna da consulta</div>
          </div>
        </div>
        <a href={url} target="_blank" rel="noreferrer" className="btn-secondary bg-white/10 text-white hover:bg-white/15">
          Abrir em nova aba
        </a>
      </header>
      <iframe
        title="Chamada Nucleus"
        src={url}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="h-full min-h-[720px] w-full flex-1 border-0"
      />
    </div>
  );
}
