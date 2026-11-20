import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, Share, Smartphone, X } from 'lucide-react';

interface PWAInstallModalProps {
  open: boolean;
  churchName: string;
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  swReady: boolean;
  onTriggerInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  onClose: () => void;
}

export function PWAInstallModal({
  open,
  churchName,
  isInstallable,
  isInstalled,
  isIOS,
  swReady,
  onTriggerInstall,
  onClose,
}: PWAInstallModalProps) {
  const [progress, setProgress] = useState(25);
  const [statusMessage, setStatusMessage] = useState(
    'Preparando pacote do aplicativo para seu celular...'
  );
  const autoTriedRef = useRef(false);

  // Close automatically with Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Animate download/cache readiness progress cleanly
  useEffect(() => {
    if (!open) return;
    if (isInstalled) {
      setProgress(100);
      setStatusMessage('Aplicativo baixado e instalado com sucesso!');
      const timer = setTimeout(onClose, 1400);
      return () => clearTimeout(timer);
    }

    if (swReady || isInstallable) {
      setProgress(100);
      setStatusMessage(
        isInstallable
          ? 'Pacote pronto! Toque nesta janela para concluir a instalação.'
          : isIOS
            ? 'Pacote baixado! Siga os passos abaixo para instalar no iPhone/iPad.'
            : 'Aplicativo pronto! Instale pelo menu do navegador ou toque para continuar.'
      );
      return;
    }

    const t1 = setTimeout(() => setProgress((p) => Math.max(p, 65)), 250);
    const t2 = setTimeout(() => {
      setProgress(100);
      setStatusMessage(
        isIOS
          ? 'Pacote baixado! Siga os passos abaixo para instalar no iPhone/iPad.'
          : 'Recursos salvos no aparelho! Use Instalar aplicativo no menu do navegador se não abrir automaticamente.'
      );
    }, 900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open, isInstalled, swReady, isInstallable, isIOS, onClose]);

  // Attempt automatic install prompt as soon as browser permits (and on first interaction)
  useEffect(() => {
    if (!open || !isInstallable || isInstalled || autoTriedRef.current) return;
    autoTriedRef.current = true;
    onTriggerInstall().then((result) => {
      if (result === 'accepted') {
        setProgress(100);
        setStatusMessage('Aplicativo instalado na tela inicial!');
      }
    });
  }, [open, isInstallable, isInstalled, onTriggerInstall]);

  if (!open) return null;

  const handleSurfaceInteraction = async () => {
    if (isInstallable && !isInstalled) {
      const outcome = await onTriggerInstall();
      if (outcome === 'accepted') {
        setProgress(100);
        setStatusMessage('Aplicativo instalado na tela inicial!');
      } else if (outcome === 'dismissed') {
        onClose();
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-popup-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 px-safe"
      onClick={onClose}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          void handleSurfaceInteraction();
        }}
        className={`w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200 p-5 sm:p-7 space-y-5 ${
          isInstallable && !isInstalled ? 'cursor-pointer' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt={`Ícone do aplicativo ${churchName}`}
              className="h-12 w-12 rounded-2xl object-contain border border-slate-200 bg-white shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <h2
                id="pwa-install-popup-title"
                className="text-base sm:text-lg font-bold text-[#0F2D5C] leading-snug"
              >
                Baixar Aplicativo {churchName}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Instalação automática e acesso rápido no celular
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Fechar janela de instalação"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Download / Cache Progress Bar */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#0F2D5C]">
            <span className="flex items-center gap-1.5 min-w-0">
              {isInstalled || progress === 100 ? (
                <CheckCircle2 className="h-4 w-4 text-blue-700 shrink-0" />
              ) : (
                <Download className="h-4 w-4 text-blue-700 shrink-0 animate-bounce" />
              )}
              <span className="truncate">
                {isInstalled
                  ? 'Instalado no dispositivo'
                  : progress === 100
                    ? 'Aplicativo pronto'
                    : 'Baixando aplicativo...'}
              </span>
            </span>
            <span className="tabular-nums shrink-0">{progress}%</span>
          </div>

          <div className="h-2 w-full rounded-full bg-blue-100 overflow-hidden">
            <div
              className="h-full bg-blue-700 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {statusMessage}
          </p>
        </div>

        {/* Platform Guidance (Zero extra action buttons required) */}
        {isIOS ? (
          <div className="rounded-2xl bg-blue-50/70 border border-blue-200/70 p-4 space-y-2 text-xs sm:text-sm text-slate-700">
            <p className="font-bold text-[#0F2D5C] flex items-center gap-1.5">
              <Share className="h-4 w-4 text-blue-700 shrink-0" />
              Como adicionar no iPhone / iPad:
            </p>
            <p>1. Toque no ícone de Compartilhar na barra do Safari.</p>
            <p>2. Role e toque em Adicionar à Tela de Início.</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
            <Smartphone className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" strokeWidth={1.75} />
            <p>
              {isInstallable
                ? 'Toque em qualquer área deste aviso para confirmar a instalação na tela inicial do seu celular.'
                : 'Se o sistema do aparelho não abrir o aviso de instalação automaticamente, toque no menu do navegador (⋮) e selecione Instalar aplicativo.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
