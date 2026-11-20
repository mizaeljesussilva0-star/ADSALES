import { useState } from 'react';
import { Calendar, Check, Copy, HeartHandshake, MapPin, Users } from 'lucide-react';
import type { ChurchSettings, ServiceScheduleItem } from '../types/church';

interface ScheduleAndOfferingProps {
  schedule: ServiceScheduleItem[];
  settings: ChurchSettings;
  rsvpedIds: string[];
  onToggleRsvp: (id: string) => Promise<void>;
}

export function ScheduleAndOffering({
  schedule,
  settings,
  rsvpedIds,
  onToggleRsvp,
}: ScheduleAndOfferingProps) {
  const [copiedPix, setCopiedPix] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleCopyPix = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(settings.pixKey);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    }
  };

  const handleRsvp = async (id: string) => {
    setPendingId(id);
    try {
      await onToggleRsvp(id);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section
      aria-label="Agenda de Cultos e Dízimos"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      {/* Left: Weekly Service Schedule */}
      <div className="lg:col-span-7 rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F2D5C]">
            Agenda de Cultos
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Confirme sua presença para nos ajudar a preparar a recepção da igreja.
          </p>
        </div>

        {schedule.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">
            Nenhum culto cadastrado na agenda semanal.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {schedule.map((item) => {
              const confirmed = rsvpedIds.includes(item.id);
              const isBusy = pendingId === item.id;
              return (
                <div
                  key={item.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
                      <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                      <span>{item.dayOfWeek}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{item.time}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {item.location}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.leader}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {item.rsvpCount} confirmados
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleRsvp(item.id)}
                    aria-pressed={confirmed}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                      confirmed
                        ? 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                        : 'bg-slate-100 text-slate-800 hover:bg-blue-700 hover:text-white'
                    }`}
                  >
                    {confirmed ? 'Presença confirmada' : 'Vou participar'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Zero-Fee PIX Contribution & Church Contact */}
      <div className="lg:col-span-5 rounded-3xl bg-[#0F2D5C] text-white p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
            <HeartHandshake className="h-4 w-4" strokeWidth={1.75} />
            <span>Dízimos e Ofertas</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Contribua com a Obra
          </h2>
          <p className="text-sm text-blue-100/85 leading-relaxed">
            Sua generosidade sustenta os projetos sociais, missões e a manutenção do templo AD SALES sem nenhuma taxa intermediária.
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 border border-white/15 p-4 space-y-3">
          {settings.pixKey ? (
            <>
              {settings.pixBeneficiary && (
                <div>
                  <p className="text-xs text-blue-200">Favorecido</p>
                  <p className="text-sm font-semibold text-white">
                    {settings.pixBeneficiary}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-blue-200">Chave PIX</p>
                <p className="font-mono text-sm sm:text-base font-medium text-white break-all mt-0.5">
                  {settings.pixKey}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyPix}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0F2D5C] hover:bg-blue-50 transition-colors focus-visible:outline-2 focus-visible:outline-white"
              >
                {copiedPix ? (
                  <>
                    <Check className="h-4 w-4 text-blue-700" strokeWidth={2.25} />
                    Chave PIX copiada!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" strokeWidth={1.75} />
                    Copiar Chave PIX
                  </>
                )}
              </button>
            </>
          ) : (
            <p className="text-sm text-blue-100/90">
              A chave PIX para dízimos e ofertas será exibida aqui assim que for configurada no Painel do Pastor.
            </p>
          )}
        </div>

        {(settings.whatsapp || settings.address) && (
          <div className="pt-2 border-t border-white/15 text-xs text-blue-100/80 space-y-1">
            {settings.whatsapp && (
              <p>
                Secretaria / WhatsApp:{' '}
                <strong className="font-semibold text-white tabular-nums">
                  {settings.whatsapp}
                </strong>
              </p>
            )}
            {settings.address && <p>{settings.address}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
