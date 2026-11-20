import { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Maximize2,
  X,
} from 'lucide-react';
import type { EventPhotoItem } from '../types/church';
import {
  formatEventDatePt,
  getUniqueEventNames,
  sortAndFilterEventPhotos,
  wrapCarouselIndex,
} from '../utils/churchLogic';

interface EventPhotoCarouselProps {
  photos: EventPhotoItem[];
}

export function EventPhotoCarousel({ photos }: EventPhotoCarouselProps) {
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [brokenIds, setBrokenIds] = useState<Record<string, boolean>>({});

  const eventNames = useMemo(() => getUniqueEventNames(photos), [photos]);

  const visiblePhotos = useMemo(
    () => sortAndFilterEventPhotos(photos, eventFilter),
    [photos, eventFilter]
  );

  // Reset filter if current event was deleted
  useEffect(() => {
    if (eventFilter !== 'all' && visiblePhotos.length === 0 && photos.length > 0) {
      setEventFilter('all');
    }
  }, [eventFilter, visiblePhotos.length, photos.length]);

  // Clamp index safely when list shrinks
  useEffect(() => {
    if (visiblePhotos.length === 0) {
      setActiveIndex(0);
      setLightboxOpen(false);
    } else if (activeIndex >= visiblePhotos.length) {
      setActiveIndex(0);
    }
  }, [visiblePhotos.length, activeIndex]);

  const currentIndex = wrapCarouselIndex(activeIndex, visiblePhotos.length);
  const currentPhoto = visiblePhotos[currentIndex] ?? null;

  const goPrev = () => {
    if (visiblePhotos.length <= 1) return;
    setActiveIndex((prev) => wrapCarouselIndex(prev - 1, visiblePhotos.length));
  };

  const goNext = () => {
    if (visiblePhotos.length <= 1) return;
    setActiveIndex((prev) => wrapCarouselIndex(prev + 1, visiblePhotos.length));
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => wrapCarouselIndex(prev - 1, visiblePhotos.length));
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => wrapCarouselIndex(prev + 1, visiblePhotos.length));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, visiblePhotos.length]);

  const markBroken = (id: string) => {
    setBrokenIds((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <section aria-label="Galeria de Fotos de Eventos da Igreja" className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[#0F2D5C]">
            <Camera className="h-5 w-5 text-blue-700" strokeWidth={1.75} />
            <h2 className="text-2xl font-bold tracking-tight">
              Galeria de Eventos
            </h2>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Registros fotográficos de cultos, batismos, congressos e atividades da igreja.
          </p>
        </div>

        {visiblePhotos.length > 0 && (
          <div className="text-xs sm:text-sm font-semibold text-slate-600 tabular-nums whitespace-nowrap shrink-0">
            {String(currentIndex + 1).padStart(2, '0')} /{' '}
            {String(visiblePhotos.length).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Event Name Segmented Filter */}
      {eventNames.length > 1 && (
        <div
          role="group"
          aria-label="Filtrar fotos por evento"
          className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-200/70 overflow-x-auto max-w-full"
        >
          <button
            type="button"
            onClick={() => {
              setEventFilter('all');
              setActiveIndex(0);
            }}
            aria-pressed={eventFilter === 'all'}
            className={`min-h-[40px] px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
              eventFilter === 'all'
                ? 'bg-white text-[#0F2D5C] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos os Eventos
          </button>
          {eventNames.map((name) => {
            const active = eventFilter === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setEventFilter(name);
                  setActiveIndex(0);
                }}
                aria-pressed={active}
                className={`min-h-[40px] px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-[#0F2D5C] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State or Elegant Carousel */}
      {!currentPhoto ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center space-y-2">
          <Camera className="h-9 w-9 text-slate-300 mx-auto" strokeWidth={1.5} />
          <p className="text-base font-semibold text-slate-800">
            Nenhuma foto de evento publicada ainda
          </p>
          <p className="text-sm text-slate-500">
            Assim que o Pastor registrar fotos dos cultos e atividades, a galeria em carrossel aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Main Carousel Viewport */}
          <div
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') goPrev();
              if (e.key === 'ArrowRight') goNext();
            }}
            aria-roledescription="carrossel"
            aria-label={`Fotos do evento ${currentPhoto.eventName}`}
            className="relative rounded-3xl bg-slate-950 overflow-hidden border border-slate-200/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full overflow-hidden flex items-center justify-center bg-slate-950">
              {brokenIds[currentPhoto.id] ? (
                <div className="h-full w-full bg-gradient-to-br from-[#0F2D5C] to-[#1E3A8A] flex flex-col items-center justify-center p-6 text-white text-center">
                  <ImageIcon className="h-10 w-10 text-blue-200 mb-2" strokeWidth={1.5} />
                  <p className="text-sm font-semibold">{currentPhoto.title}</p>
                </div>
              ) : (
                <>
                  {/* Ambient blurred fill so vertical & horizontal phone photos look full-bleed */}
                  <img
                    src={currentPhoto.photoUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-35 pointer-events-none select-none"
                  />
                  {/* Crisp foreground photograph */}
                  <img
                    key={currentPhoto.id}
                    src={currentPhoto.photoUrl}
                    alt={`${currentPhoto.eventName}: ${currentPhoto.title}`}
                    referrerPolicy="no-referrer"
                    onError={() => markBroken(currentPhoto.id)}
                    onClick={() => setLightboxOpen(true)}
                    className="relative z-10 h-full w-full object-contain cursor-zoom-in transition-opacity duration-200"
                  />
                </>
              )}

              {/* Contrast Scrim & Editorial Caption */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-5 sm:px-8 pt-14 pb-5 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div className="space-y-1 max-w-2xl">
                    <p className="text-xs font-medium text-blue-200 flex flex-wrap items-center gap-x-2">
                      <span>{currentPhoto.eventName}</span>
                      {(currentPhoto.eventDate || currentPhoto.createdAt) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {formatEventDatePt(currentPhoto.eventDate, currentPhoto.createdAt)}
                          </span>
                        </>
                      )}
                    </p>
                    <h3 className="text-base sm:text-xl font-bold text-white leading-snug">
                      {currentPhoto.title}
                    </h3>
                    {currentPhoto.caption && (
                      <p className="text-xs sm:text-sm text-slate-200 line-clamp-2">
                        {currentPhoto.caption}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Top-right Expand Lightbox Button */}
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label="Ampliar foto do evento"
                className="absolute top-3.5 right-3.5 z-30 min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-slate-950/70 backdrop-blur-sm border border-white/15 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-900 transition-colors whitespace-nowrap"
              >
                <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">Ampliar</span>
              </button>

              {/* Left / Right Carousel Arrows */}
              {visiblePhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Foto anterior"
                    className="absolute left-3 sm:left-4 top-[42%] sm:top-1/2 -translate-y-1/2 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-slate-950/70 backdrop-blur-sm border border-white/15 text-white hover:bg-slate-900 transition-colors focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Próxima foto"
                    className="absolute right-3 sm:right-4 top-[42%] sm:top-1/2 -translate-y-1/2 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-slate-950/70 backdrop-blur-sm border border-white/15 text-white hover:bg-slate-900 transition-colors focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={2} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Thumbnail Filmstrip Rail */}
          {visiblePhotos.length > 1 && (
            <div
              role="list"
              aria-label="Miniaturas das fotos do evento"
              className="flex items-center gap-2.5 overflow-x-auto py-1.5 px-1"
            >
              {visiblePhotos.map((photo, idx) => {
                const isSelected = idx === currentIndex;
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`Ver foto ${idx + 1}: ${photo.title}`}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`relative shrink-0 w-20 sm:w-24 aspect-[4/3] rounded-xl overflow-hidden bg-slate-200 transition-all focus-visible:outline-2 focus-visible:outline-blue-600 ${
                      isSelected
                        ? 'ring-2 ring-blue-700 ring-offset-2 opacity-100'
                        : 'opacity-65 hover:opacity-95'
                    }`}
                  >
                    {brokenIds[photo.id] ? (
                      <div className="h-full w-full bg-[#0F2D5C] flex items-center justify-center text-white">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    ) : (
                      <img
                        src={photo.photoUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={() => markBroken(photo.id)}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Lightbox Viewer */}
      {lightboxOpen && currentPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Visualização ampliada: ${currentPhoto.title}`}
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col justify-between p-4 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-between gap-4 text-white"
          >
            <div className="min-w-0">
              <p className="text-xs text-blue-200 truncate">
                {currentPhoto.eventName}
                {(currentPhoto.eventDate || currentPhoto.createdAt) &&
                  ` · ${formatEventDatePt(currentPhoto.eventDate, currentPhoto.createdAt)}`}
              </p>
              <h3 className="text-base sm:text-lg font-bold truncate">
                {currentPhoto.title}
              </h3>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold text-slate-300 tabular-nums">
                {currentIndex + 1} / {visiblePhotos.length}
              </span>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                aria-label="Fechar galeria ampliada"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex-1 my-4 flex items-center justify-center min-h-0"
          >
            <img
              src={currentPhoto.photoUrl}
              alt={`${currentPhoto.eventName}: ${currentPhoto.title}`}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
            {visiblePhotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Foto anterior na visualização ampliada"
                  className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Próxima foto na visualização ampliada"
                  className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {currentPhoto.caption && (
            <p
              onClick={(e) => e.stopPropagation()}
              className="text-center text-xs sm:text-sm text-slate-200 max-w-2xl mx-auto"
            >
              {currentPhoto.caption}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
