import { useMemo, useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Play,
  Search,
  Video,
  X,
} from 'lucide-react';
import type { MediaFilter, MediaItem } from '../types/church';
import {
  extractYouTubeEmbedUrl,
  formatShortDatePt,
  sortAndFilterMedia,
} from '../utils/churchLogic';

interface MediaGalleryProps {
  items: MediaItem[];
  onOpenMedia: (item: MediaItem) => void;
  compactLimit?: number;
  onSeeAll?: () => void;
}

const FILTER_OPTIONS: { id: MediaFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'banner', label: 'Banners' },
  { id: 'video', label: 'Vídeos' },
  { id: 'aviso', label: 'Avisos' },
];

export function MediaGallery({
  items,
  onOpenMedia,
  compactLimit,
  onSeeAll,
}: MediaGalleryProps) {
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => sortAndFilterMedia(items, filter, query),
    [items, filter, query]
  );

  const visibleItems = compactLimit ? filtered.slice(0, compactLimit) : filtered;

  return (
    <section aria-label="Galeria de Banners, Vídeos e Avisos" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F2D5C]">
            Mural de Banners e Vídeos
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Comunicados, pregações e eventos publicados diretamente pelo ministério.
          </p>
        </div>

        {onSeeAll && filtered.length > (compactLimit ?? 0) && (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            Ver galeria completa →
          </button>
        )}
      </div>

      {/* Filter Segmented Controls + Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filtrar publicações por tipo"
          className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-200/70 self-start overflow-x-auto max-w-full"
        >
          {FILTER_OPTIONS.map((opt) => {
            const active = filter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                aria-pressed={active}
                className={`min-h-[40px] px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  active
                    ? 'bg-white text-[#0F2D5C] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {!compactLimit && (
          <div className="relative w-full md:w-72">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              strokeWidth={1.75}
            />
            <label htmlFor="media-search-input" className="sr-only">
              Buscar banners, vídeos ou avisos
            </label>
            <input
              id="media-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar título ou categoria..."
              className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Grid or Empty State */}
      {visibleItems.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center space-y-3">
          <ImageIcon className="h-9 w-9 text-slate-300 mx-auto" strokeWidth={1.5} />
          <p className="text-base font-semibold text-slate-800">
            Nenhuma publicação encontrada
          </p>
          <p className="text-sm text-slate-500">
            Tente selecionar outra categoria ou limpar o campo de busca.
          </p>
          {(filter !== 'all' || query) && (
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setQuery('');
              }}
              className="mt-2 inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors min-h-[44px]"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleItems.map((item) => {
            const hasYouTube = Boolean(
              item.externalVideoUrl && extractYouTubeEmbedUrl(item.externalVideoUrl)
            );
            const typeLabel =
              item.type === 'banner'
                ? 'Banner'
                : item.type === 'video'
                  ? 'Vídeo'
                  : 'Aviso';

            return (
              <article
                key={item.id}
                className="group rounded-3xl bg-white border border-slate-200/90 overflow-hidden flex flex-col justify-between transition-colors hover:border-blue-300"
              >
                <div>
                  {/* Visual Preview Frame */}
                  <button
                    type="button"
                    onClick={() => onOpenMedia(item)}
                    aria-label={`Abrir ${typeLabel}: ${item.title}`}
                    className="relative block w-full aspect-[16/10] bg-slate-100 overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    {item.type === 'video' && item.mediaUrl ? (
                      <video
                        src={item.mediaUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : item.mediaUrl ? (
                      <img
                        src={item.mediaUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          if (img.naturalHeight > 0 && img.naturalWidth / img.naturalHeight < 1.15) {
                            img.classList.remove('object-cover');
                            img.classList.add('object-contain', 'bg-slate-900');
                          }
                        }}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-[#0F2D5C] to-[#2563EB] flex flex-col items-center justify-center p-6 text-white">
                        {item.type === 'video' || hasYouTube ? (
                          <Video className="h-10 w-10 text-blue-100 mb-2" strokeWidth={1.5} />
                        ) : (
                          <FileText className="h-10 w-10 text-blue-100 mb-2" strokeWidth={1.5} />
                        )}
                        <span className="text-xs font-medium text-blue-100">
                          {item.category}
                        </span>
                      </div>
                    )}

                    {item.type === 'video' && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center bg-slate-950/25 group-hover:bg-slate-950/35 transition-colors"
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-[#0F2D5C] shadow-md">
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        </span>
                      </span>
                    )}
                  </button>

                  {/* Card Body */}
                  <div className="p-5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <span className="text-blue-700 font-semibold">{typeLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0">{formatShortDatePt(item.createdAt)}</span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug line-clamp-2">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5 pt-1 flex items-center justify-between border-t border-slate-100/80 mt-2">
                  <span className="text-xs text-slate-500 truncate">
                    {item.authorName}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenMedia(item)}
                    className="min-h-[40px] px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-xl transition-colors whitespace-nowrap shrink-0"
                  >
                    {item.type === 'video'
                      ? 'Assistir'
                      : item.type === 'banner'
                        ? 'Ampliar'
                        : 'Ler aviso'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
