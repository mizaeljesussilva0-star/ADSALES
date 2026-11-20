import { useEffect, useState } from 'react';
import { Check, Share2, X } from 'lucide-react';
import type { MediaItem } from '../types/church';
import {
  extractYouTubeEmbedUrl,
  formatShortDatePt,
} from '../utils/churchLogic';

interface MediaViewerModalProps {
  item: MediaItem | null;
  onClose: () => void;
}

export function MediaViewerModal({ item, onClose }: MediaViewerModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const youtubeEmbed = item.externalVideoUrl
    ? extractYouTubeEmbedUrl(item.externalVideoUrl)
    : null;

  const handleShare = async () => {
    const text = `${item.title}${item.description ? ` — ${item.description}` : ''} | AD SALES Igreja Evangélica`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="viewer-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              {item.category} · {formatShortDatePt(item.createdAt)} · {item.authorName}
            </p>
            <h3
              id="viewer-modal-title"
              className="text-lg font-bold text-slate-900 truncate"
            >
              {item.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar visualização"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Media Viewport (Adapts safely to vertical/square/landscape phone uploads) */}
        <div className="bg-slate-950 flex items-center justify-center">
          {item.type === 'video' && youtubeEmbed ? (
            <div className="w-full aspect-video">
              <iframe
                src={youtubeEmbed}
                title={item.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          ) : item.type === 'video' && (item.mediaUrl || item.externalVideoUrl) ? (
            <video
              src={item.mediaUrl || item.externalVideoUrl}
              controls
              playsInline
              autoPlay
              className="w-full max-h-[65vh] object-contain bg-black"
            />
          ) : item.mediaUrl ? (
            <img
              src={item.mediaUrl}
              alt={item.title}
              referrerPolicy="no-referrer"
              className="w-full max-h-[68vh] object-contain bg-slate-900"
            />
          ) : (
            <div className="w-full py-12 px-6 bg-gradient-to-br from-[#0F2D5C] to-[#1D4ED8] text-center text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-200 mb-2">
                Comunicado Oficial
              </p>
              <p className="text-xl font-bold max-w-lg mx-auto">{item.title}</p>
            </div>
          )}
        </div>

        {/* Description & Share Footer */}
        <div className="p-5 sm:p-6 space-y-4">
          {item.description && (
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {item.description}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors min-h-[44px]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" strokeWidth={2} />
                  Copiado!
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" strokeWidth={1.75} />
                  Compartilhar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
