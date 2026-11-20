import { useState } from 'react';
import { BookOpen, Check, Share2 } from 'lucide-react';
import type { ChurchSettings, DailyWord } from '../types/church';
import { formatShortDatePt } from '../utils/churchLogic';

interface WordOfTheDayProps {
  dailyWord: DailyWord;
  settings: ChurchSettings;
}

export function WordOfTheDay({ dailyWord, settings }: WordOfTheDayProps) {
  const [copied, setCopied] = useState(false);

  if (!dailyWord.verse?.trim()) {
    return null;
  }

  const handleShare = async () => {
    const shareText = `"${dailyWord.verse}" (${dailyWord.reference}) — ${settings.churchName} Igreja Evangélica`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Palavra do Dia — ${settings.churchName}`,
          text: shareText,
        });
        return;
      } catch {
        // Fallback to clipboard if user cancels native share
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  return (
    <section
      aria-label="Palavra do Dia"
      className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <BookOpen className="h-4 w-4 text-blue-700" strokeWidth={1.75} />
            <span className="font-semibold text-blue-700">Palavra do Dia</span>
            <span aria-hidden="true">·</span>
            <span>{dailyWord.reference}</span>
            <span aria-hidden="true">·</span>
            <span>{formatShortDatePt(dailyWord.updatedAt)}</span>
          </div>

          <blockquote className="font-serif text-xl sm:text-2xl text-slate-900 leading-relaxed [text-wrap:balance]">
            “{dailyWord.verse}”
          </blockquote>

          {dailyWord.reflection && (
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {dailyWord.reflection}
            </p>
          )}
        </div>

        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={settings.pastorAvatarUrl || '/assets/ad-sales-logo.png'}
              alt={settings.pastorName || settings.churchName}
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <div className="text-left lg:text-right">
              <p className="text-sm font-semibold text-slate-900">
                {dailyWord.pastorName || settings.pastorName || 'Pastor'}
              </p>
              <p className="text-xs text-slate-500">{settings.pastorTitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-200 transition-colors min-h-[44px] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-blue-700" strokeWidth={2} />
                Versículo copiado
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
    </section>
  );
}
