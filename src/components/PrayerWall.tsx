import { useEffect, useState, type FormEvent } from 'react';
import { Heart, Lock, Send } from 'lucide-react';
import type { PrayerRequest } from '../types/church';
import { formatShortDatePt, validatePrayerInput } from '../utils/churchLogic';

interface PrayerWallProps {
  prayers: PrayerRequest[];
  amenedIds: string[];
  defaultAuthorName?: string;
  onSubmitPrayer: (payload: {
    authorName: string;
    message: string;
    isPrivate: boolean;
  }) => Promise<{ queued: boolean }>;
  onAmenPrayer: (id: string) => Promise<void>;
}

export function PrayerWall({
  prayers,
  amenedIds,
  defaultAuthorName = '',
  onSubmitPrayer,
  onAmenPrayer,
}: PrayerWallProps) {
  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [message, setMessage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (defaultAuthorName && !authorName) {
      setAuthorName(defaultAuthorName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAuthorName]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const validation = validatePrayerInput(authorName, message);
    if (!validation.valid) {
      setErrorMsg(validation.error ?? 'Verifique os campos do pedido.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmitPrayer({
        authorName: authorName.trim() || 'Anônimo',
        message: message.trim(),
        isPrivate,
      });
      setAuthorName('');
      setMessage('');
      setIsPrivate(false);
      if (result.queued) {
        setSuccessMsg(
          'Sem conexão no momento — seu pedido foi salvo e será entregue ao Pastor automaticamente assim que a internet voltar.'
        );
      } else {
        setSuccessMsg(
          isPrivate
            ? 'Seu pedido foi enviado de forma reservada diretamente ao Pastor.'
            : 'Seu pedido foi publicado no mural de oração.'
        );
      }
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Não foi possível enviar o pedido.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-label="Mural de Oração"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-5 rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 space-y-4"
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F2D5C]">
            Pedidos de Oração
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Compartilhe seu motivo de oração ou agradecimento com nossa igreja.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="prayer-author"
            className="block text-xs font-semibold text-slate-700"
          >
            Seu nome (opcional)
          </label>
          <input
            id="prayer-author"
            type="text"
            maxLength={60}
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Seu nome ou usuário"
            className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="prayer-message"
            className="block text-xs font-semibold text-slate-700"
          >
            Motivo da oração
          </label>
          <textarea
            id="prayer-message"
            rows={4}
            maxLength={600}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreva como podemos orar por você e sua família..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer select-none py-1">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
          />
          <span className="text-xs text-slate-600 leading-relaxed">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
              <Lock className="h-3.5 w-3.5 text-blue-700" strokeWidth={1.75} />
              Pedido reservado
            </span>{' '}
            — visível apenas para o Pastor no painel administrativo.
          </span>
        </label>

        {errorMsg && (
          <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 rounded-xl px-3 py-2">
            {errorMsg}
          </p>
        )}
        {successMsg && (
          <p role="status" className="text-xs font-medium text-blue-800 bg-blue-50 rounded-xl px-3 py-2">
            {successMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <Send className="h-4 w-4" strokeWidth={1.75} />
          {submitting ? 'Enviando pedido...' : 'Enviar Pedido de Oração'}
        </button>
      </form>

      {/* Public Prayer List */}
      <div className="lg:col-span-7 rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-[#0F2D5C]">
            Intercessão da Igreja
          </h3>
          <span className="text-xs font-medium text-slate-500 tabular-nums">
            {prayers.length} {prayers.length === 1 ? 'pedido' : 'pedidos'}
          </span>
        </div>

        {prayers.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            Nenhum pedido público no momento. Seja o primeiro a compartilhar um motivo de oração.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {prayers.map((prayer) => {
              const hasAmened = amenedIds.includes(prayer.id);
              return (
                <article key={prayer.id} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">
                      {prayer.authorName}
                    </span>
                    <span>{formatShortDatePt(prayer.createdAt)}</span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                    {prayer.message}
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={hasAmened}
                      onClick={() => onAmenPrayer(prayer.id)}
                      className={`inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors tabular-nums ${
                        hasAmened
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <Heart
                        className={`h-3.5 w-3.5 ${hasAmened ? 'fill-blue-700 text-blue-700' : ''}`}
                        strokeWidth={1.75}
                      />
                      {hasAmened ? 'Orando por você' : 'Estou orando'} ({prayer.amens})
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
