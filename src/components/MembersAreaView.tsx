import { Cake, Users } from 'lucide-react';
import type { PublicMemberCard } from '../types/church';
import {
  formatBirthdayPt,
  getMemberInitials,
  isBirthdayThisMonth,
  isBirthdayToday,
  sortBirthdaysUpcoming,
} from '../utils/churchLogic';

interface MembersAreaViewProps {
  publicMembers: PublicMemberCard[];
  birthdays: PublicMemberCard[];
  onGoToProfile?: () => void;
}

export function MembersAreaView({
  publicMembers,
  birthdays,
  onGoToProfile,
}: MembersAreaViewProps) {
  const orderedBirthdays = sortBirthdaysUpcoming(birthdays);

  return (
    <section aria-label="Área de Membros" className="space-y-8">
      {/* Pastor-approved Members & Workers Directory */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#0F2D5C]">
              <Users className="h-5 w-5 text-blue-700" strokeWidth={1.75} />
              <h2 className="text-2xl font-bold tracking-tight">
                Membros da Igreja
              </h2>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Obreiros, cooperadores e membros apresentados pelo Pastor.
            </p>
          </div>
          {onGoToProfile && (
            <button
              type="button"
              onClick={onGoToProfile}
              className="text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
            >
              Meu cadastro →
            </button>
          )}
        </div>

        {publicMembers.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center space-y-2">
            <Users className="h-9 w-9 text-slate-300 mx-auto" strokeWidth={1.5} />
            <p className="text-base font-semibold text-slate-800">
              Nenhum membro publicado ainda
            </p>
            <p className="text-sm text-slate-500">
              O Pastor define quais membros e funções aparecem nesta área.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {publicMembers.map((member) => {
              const bdayText = formatBirthdayPt(member.birthMonthDay);
              return (
                <article
                  key={member.id}
                  className="rounded-3xl bg-white border border-slate-200/90 p-5 flex items-center gap-4"
                >
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.username}
                      className="h-16 w-16 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0F2D5C] text-lg font-bold text-white shrink-0">
                      {getMemberInitials(member.username)}
                    </div>
                  )}

                  <div className="min-w-0 space-y-1">
                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {member.username}
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold text-blue-700 truncate">
                      {member.roleTitle || 'Membro'}
                    </p>
                    {bdayText && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Cake className="h-3.5 w-3.5 text-blue-600 shrink-0" strokeWidth={1.75} />
                        <span>Aniversário: {bdayText}</span>
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Birthdays Calendar */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#0F2D5C]">
              <Cake className="h-5 w-5 text-blue-700" strokeWidth={1.75} />
              <h2 className="text-xl font-bold tracking-tight">
                Aniversariantes
              </h2>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Datas de aniversário compartilhadas pelos usuários cadastrados.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
            {orderedBirthdays.length}{' '}
            {orderedBirthdays.length === 1 ? 'aniversário' : 'aniversários'}
          </span>
        </div>

        {orderedBirthdays.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">
            Nenhuma data de nascimento informada ainda. Adicione a sua no seu perfil para comemorarmos juntos.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {orderedBirthdays.map((item) => {
              const today = isBirthdayToday(item.birthMonthDay);
              const thisMonth = isBirthdayThisMonth(item.birthMonthDay);
              return (
                <div
                  key={item.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.avatarUrl ? (
                      <img
                        src={item.avatarUrl}
                        alt={item.username}
                        className="h-11 w-11 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0F2D5C] text-xs font-bold text-white shrink-0">
                        {getMemberInitials(item.username)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
                        {item.username}
                      </p>
                      <p className="text-xs text-slate-500 leading-snug">
                        <span>{formatBirthdayPt(item.birthMonthDay)}</span>
                        {item.roleTitle ? <span> · {item.roleTitle}</span> : null}
                      </p>
                    </div>
                  </div>

                  {today ? (
                    <span className="text-xs font-bold text-blue-700 whitespace-nowrap shrink-0">
                      Aniversário hoje!
                    </span>
                  ) : thisMonth ? (
                    <span className="text-xs font-semibold text-slate-600 whitespace-nowrap shrink-0">
                      Este mês
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
                      {formatBirthdayPt(item.birthMonthDay)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
