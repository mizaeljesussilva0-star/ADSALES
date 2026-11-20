import { useEffect, useRef, useState } from 'react';
import { Headphones, Pause, Play, Radio, Volume2, VolumeX } from 'lucide-react';
import type { AudioMessage, ChurchSettings } from '../types/church';
import { formatAudioDuration, formatShortDatePt } from '../utils/churchLogic';

interface AudioAndRadioSectionProps {
  audios: AudioMessage[];
  settings: ChurchSettings;
}

export function AudioAndRadioSection({
  audios,
  settings,
}: AudioAndRadioSectionProps) {
  const radioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingRadio, setIsPlayingRadio] = useState(false);
  const [isLoadingRadio, setIsLoadingRadio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [radioError, setRadioError] = useState('');

  const hasRadio = Boolean(settings.radioEnabled && settings.radioStreamUrl);
  const hasAudios = audios.length > 0;

  useEffect(() => {
    setIsPlayingRadio(false);
    setIsLoadingRadio(false);
    setRadioError('');
  }, [settings.radioStreamUrl, settings.radioEnabled]);

  if (!hasRadio && !hasAudios) {
    return null;
  }

  const toggleRadio = async () => {
    const el = radioRef.current;
    if (!el || !settings.radioStreamUrl) return;
    setRadioError('');

    if (isPlayingRadio) {
      el.pause();
      setIsPlayingRadio(false);
      return;
    }

    try {
      setIsLoadingRadio(true);
      await el.play();
      setIsPlayingRadio(true);
    } catch {
      setRadioError(
        'Não foi possível conectar ao streaming da rádio no momento.'
      );
      setIsPlayingRadio(false);
    } finally {
      setIsLoadingRadio(false);
    }
  };

  const toggleMute = () => {
    const el = radioRef.current;
    if (!el) return;
    el.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <section
      aria-label="Rádio e Mensagens em Áudio"
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#0F2D5C]">
          Rádio e Palavra em Áudio
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Ouça transmissões da igreja e mensagens gravadas pelo Pastor.
        </p>
      </div>

      <div
        className={`grid grid-cols-1 gap-6 ${
          hasRadio && hasAudios ? 'lg:grid-cols-12 items-start' : ''
        }`}
      >
        {/* Live Church Radio Player */}
        {hasRadio && (
          <div
            className={`${
              hasAudios ? 'lg:col-span-5' : ''
            } rounded-3xl bg-[#0F2D5C] text-white p-6 sm:p-7 space-y-5`}
          >
            <audio
              ref={radioRef}
              src={settings.radioStreamUrl}
              preload="none"
              onEnded={() => setIsPlayingRadio(false)}
              onError={() => {
                setIsPlayingRadio(false);
                setIsLoadingRadio(false);
                setRadioError('Transmissão indisponível ou sem conexão.');
              }}
            />

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
                  <Radio className="h-4 w-4" strokeWidth={1.75} />
                  <span>Rádio da Igreja</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  {settings.radioStationName || 'Rádio AD SALES'}
                </h3>
                <p className="text-xs text-blue-100/80">
                  {isLoadingRadio
                    ? 'Conectando à transmissão...'
                    : isPlayingRadio
                      ? 'Reproduzindo ao vivo'
                      : 'Toque para sintonizar a programação'}
                </p>
              </div>

              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Ativar som da rádio' : 'Silenciar rádio'}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors shrink-0"
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" strokeWidth={1.75} />
                ) : (
                  <Volume2 className="h-5 w-5" strokeWidth={1.75} />
                )}
              </button>
            </div>

            {radioError && (
              <p role="alert" className="text-xs text-blue-100 bg-white/10 rounded-xl px-3.5 py-2.5">
                {radioError}
              </p>
            )}

            <button
              type="button"
              onClick={toggleRadio}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0F2D5C] hover:bg-blue-50 transition-colors"
            >
              {isPlayingRadio ? (
                <>
                  <Pause className="h-4 w-4 fill-current" />
                  Pausar Rádio
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Ouvir Rádio Agora
                </>
              )}
            </button>
          </div>
        )}

        {/* Pastor Recorded & Uploaded Audio Messages */}
        {hasAudios && (
          <div
            className={`${
              hasRadio ? 'lg:col-span-7' : ''
            } rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-7 space-y-5`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#0F2D5C]">
                <Headphones className="h-5 w-5 text-blue-700" strokeWidth={1.75} />
                <h3 className="text-lg font-bold">Mensagens em Áudio</h3>
              </div>
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                {audios.length} {audios.length === 1 ? 'áudio' : 'áudios'}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {audios.map((audio) => (
                <article key={audio.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-blue-700">
                          {audio.authorName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatShortDatePt(audio.createdAt)}</span>
                        {audio.durationSeconds ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {formatAudioDuration(audio.durationSeconds)}
                            </span>
                          </>
                        ) : null}
                      </div>
                      <h4 className="text-base font-bold text-slate-900">
                        {audio.title}
                      </h4>
                      {audio.description && (
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {audio.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <audio
                    controls
                    preload="metadata"
                    src={audio.audioUrl}
                    className="w-full h-11 rounded-xl"
                  />
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
