import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Play,
  Maximize2,
} from 'lucide-react';
import type { ChurchSettings, MediaItem, ServiceScheduleItem } from '../types/church';
import { formatShortDatePt } from '../utils/churchLogic';

interface HeroSpotlightProps {
  featuredItems: MediaItem[];
  settings: ChurchSettings;
  nextService?: ServiceScheduleItem;
  onOpenMedia: (item: MediaItem) => void;
  onNavigateTab: (tab: 'agenda' | 'oracao' | 'midia') => void;
}

export function HeroSpotlight({
  featuredItems,
  settings,
  nextService,
  onOpenMedia,
  onNavigateTab,
}: HeroSpotlightProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPortraitMedia, setIsPortraitMedia] = useState(false);
  const safeItems = featuredItems.length > 0 ? featuredItems : [];
  const currentIndex = safeItems.length > 0 ? activeIndex % safeItems.length : 0;
  const activeItem = safeItems[currentIndex];

  const handlePrev = () => {
    if (safeItems.length <= 1) return;
    setIsPortraitMedia(false);
    setActiveIndex((prev) => (prev - 1 + safeItems.length) % safeItems.length);
  };

  const handleNext = () => {
    if (safeItems.length <= 1) return;
    setIsPortraitMedia(false);
    setActiveIndex((prev) => (prev + 1) % safeItems.length);
  };

  return (
    <section
      aria-label="Destaques da Igreja"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
    >
      {/* Left/Main Visual Banner & Video Spotlight */}
      <div className="lg:col-span-7 relative overflow-hidden rounded-3xl bg-[#0B2145] border border-slate-200/60 flex flex-col justify-between min-h-[280px] sm:min-h-[360px] lg:min-h-[420px]">
        {activeItem ? (
          <>
            {activeItem.type === 'video' && activeItem.mediaUrl && !activeItem.externalVideoUrl ? (
              <video
                src={activeItem.mediaUrl}
                muted
                playsInline
                loop
                autoPlay
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : activeItem.mediaUrl ? (
              <>
                {isPortraitMedia && (
                  <img
                    src={activeItem.mediaUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-45"
                  />
                )}
                <img
                  src={activeItem.mediaUrl}
                  alt={activeItem.title}
                  referrerPolicy="no-referrer"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalHeight > 0) {
                      setIsPortraitMedia(img.naturalWidth / img.naturalHeight < 1.25);
                    }
                  }}
                  className={`absolute inset-0 h-full w-full ${
                    isPortraitMedia ? 'object-contain' : 'object-cover'
                  }`}
                />
              </>
            ) : (
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-[#0F2D5C] via-[#1E40AF] to-[#1D4ED8]"
              />
            )}

            {/* Measured top and bottom contrast scrim for 4.5:1 text legibility */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-b from-[#061329]/70 via-[#061329]/20 to-[#061329]/95"
            />

            {/* Top controls row */}
            <div className="relative z-10 flex items-center justify-between p-4 sm:p-6">
              <span className="text-xs font-medium text-blue-100/90 tracking-wide">
                {activeItem.category}
                <span aria-hidden="true" className="mx-2">·</span>
                {formatShortDatePt(activeItem.createdAt)}
              </span>

              {safeItems.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Destaque anterior"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 transition-colors focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Próximo destaque"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 transition-colors focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom headline & primary action */}
            <div className="relative z-10 p-5 sm:p-7 space-y-3">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight [text-wrap:balance] max-w-2xl">
                {activeItem.title}
              </h2>
              {activeItem.description && (
                <p className="text-sm sm:text-base text-blue-100/90 line-clamp-2 max-w-xl leading-relaxed">
                  {activeItem.description}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenMedia(activeItem)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0F2D5C] hover:bg-blue-50 transition-colors min-h-[44px] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {activeItem.type === 'video' ? (
                    <>
                      <Play className="h-4 w-4 fill-current" strokeWidth={1.75} />
                      Assistir vídeo
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-4 w-4" strokeWidth={1.75} />
                      Ver detalhes
                    </>
                  )}
                </button>

                {safeItems.length > 1 && (
                  <div className="flex items-center gap-1.5" aria-label="Indicadores de slide">
                    {safeItems.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveIndex(idx)}
                        aria-label={`Ver destaque ${idx + 1}: ${item.title}`}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentIndex
                            ? 'w-6 bg-white'
                            : 'w-2 bg-white/40 hover:bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="relative z-10 flex flex-col items-center justify-center p-8 text-center text-white h-full">
            <img
              src="/assets/ad-sales-logo.png"
              alt="Logo AD SALES"
              className="h-24 w-24 rounded-full mb-4"
            />
            <h2 className="text-2xl font-bold">{settings.churchName}</h2>
            <p className="text-sm text-blue-100 mt-1">{settings.tagline}</p>
          </div>
        )}
      </div>

      {/* Right Institutional Welcome & Next Service Card */}
      <div className="lg:col-span-5 rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 flex flex-col justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <img
              src="/assets/ad-sales-logo.png"
              alt="Emblema AD SALES Igreja Evangélica"
              className="h-16 w-16 rounded-full object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="text-xs font-semibold tracking-wide text-blue-700">
                Igreja Evangélica
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F2D5C] [text-wrap:balance]">
                {settings.churchName}
              </h1>
            </div>
          </div>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {settings.tagline}. Acompanhe nossa agenda de cultos, mensagens em vídeo, avisos da igreja e pedidos de oração em tempo real.
          </p>

          <div className="pt-2 border-t border-slate-100 space-y-2.5 text-sm text-slate-700">
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" strokeWidth={1.75} />
              <span>{settings.address}</span>
            </div>
            {nextService && (
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" strokeWidth={1.75} />
                <span>
                  Próximo encontro: <strong className="font-semibold text-slate-900">{nextService.title}</strong> ({nextService.dayOfWeek},{' '}
                  <span className="tabular-nums">{nextService.time}</span>)
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigateTab('agenda')}
            className="flex-1 min-w-[140px] min-h-[44px] rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Horários de Culto
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('oracao')}
            className="flex-1 min-w-[140px] min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Pedir Oração
          </button>
        </div>
      </div>
    </section>
  );
}
