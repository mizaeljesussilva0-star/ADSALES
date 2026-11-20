import { Calendar, Heart, Home, ImagePlay, User, Users } from 'lucide-react';
import type { MemberProfile } from '../types/church';

export type AppTab =
  | 'inicio'
  | 'midia'
  | 'membros'
  | 'agenda'
  | 'oracao'
  | 'perfil'
  | 'pastor';

interface TopNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  isPastorUnlocked: boolean;
  currentMember: MemberProfile | null;
}

export function TopNav({
  activeTab,
  onSelectTab,
  isPastorUnlocked,
  currentMember,
}: TopNavProps) {
  const profileLabel = currentMember ? 'Perfil' : 'Cadastrar';

  const desktopLinks: { id: AppTab; label: string }[] = [
    { id: 'inicio', label: 'Início' },
    { id: 'midia', label: 'Mídia' },
    { id: 'membros', label: 'Membros' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'oracao', label: 'Oração' },
    { id: 'perfil', label: currentMember ? 'Meu Perfil' : 'Cadastrar' },
  ];

  const mobileTabs: {
    id: AppTab;
    label: string;
    icon: typeof Home;
  }[] = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'midia', label: 'Mídia', icon: ImagePlay },
    { id: 'membros', label: 'Membros', icon: Users },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'oracao', label: 'Oração', icon: Heart },
    { id: 'perfil', label: profileLabel, icon: User },
  ];

  return (
    <>
      {/* Desktop & Mobile Top Header (3-zone contract on desktop, clean 2-slot header on mobile) */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md pt-safe px-safe">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 md:h-16 md:gap-6">
          {/* Zone 1: Brand lockup (single-line wordmark + clean logo) */}
          <button
            type="button"
            onClick={() => onSelectTab('inicio')}
            className="flex items-center gap-2 sm:gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded-xl min-w-0 shrink-0"
          >
            <img
              src="/assets/ad-sales-logo.png"
              alt="Logo AD SALES"
              className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <span className="text-sm sm:text-base md:text-lg font-extrabold tracking-tight text-[#0F2D5C] whitespace-nowrap shrink-0">
              AD SALES
            </span>
          </button>

          {/* Zone 2: Single-line nav links (desktop) */}
          <nav
            aria-label="Navegação principal"
            className="hidden md:flex items-center gap-4 lg:gap-6"
          >
            {desktopLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => onSelectTab(link.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative inline-flex items-center gap-1.5 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${
                    isActive
                      ? 'text-blue-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {link.id === 'perfil' && currentMember?.avatarUrl && (
                    <img
                      src={currentMember.avatarUrl}
                      alt=""
                      aria-hidden="true"
                      className="h-5 w-5 rounded-full object-cover border border-slate-200"
                    />
                  )}
                  {link.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-700"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary CTA (never clipped on mobile or any DPI) */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('pastor')}
              aria-current={activeTab === 'pastor' ? 'page' : undefined}
              className={`min-h-[40px] px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                activeTab === 'pastor'
                  ? 'bg-[#0F2D5C] text-white'
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              {isPastorUnlocked ? 'Painel do Pastor' : 'Área do Pastor'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Thumb Navigation Bar */}
      <nav
        aria-label="Navegação inferior"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-md pb-safe px-safe"
      >
        <div className="grid grid-cols-6 h-16">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-0 overflow-hidden px-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  isActive
                    ? 'text-blue-700'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.id === 'perfil' && currentMember?.avatarUrl ? (
                  <img
                    src={currentMember.avatarUrl}
                    alt=""
                    aria-hidden="true"
                    className={`h-5 w-5 rounded-full object-cover border shrink-0 ${
                      isActive ? 'border-blue-700' : 'border-slate-300'
                    }`}
                  />
                ) : (
                  <Icon
                    className="h-5 w-5 shrink-0"
                    strokeWidth={isActive ? 2.25 : 1.75}
                  />
                )}
                <span className="max-w-full truncate text-[10px] font-semibold tracking-tight leading-tight whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
