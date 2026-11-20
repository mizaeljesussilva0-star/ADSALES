import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { AudioAndRadioSection } from './components/AudioAndRadioSection';
import { HeroSpotlight } from './components/HeroSpotlight';
import { MediaGallery } from './components/MediaGallery';
import { MediaViewerModal } from './components/MediaViewerModal';
import { PastorPanel } from './components/PastorPanel';
import { PrayerWall } from './components/PrayerWall';
import { ScheduleAndOffering } from './components/ScheduleAndOffering';
import { TopNav, type AppTab } from './components/TopNav';
import { WordOfTheDay } from './components/WordOfTheDay';
import type { ChurchSnapshot, MediaItem } from './types/church';
import {
  applyRealtimeSnapshot,
  enqueuePendingPrayer,
  loadSnapshotFromCache,
  readPendingPrayers,
  removePendingPrayer,
  saveSnapshotToCache,
  sortAndFilterMedia,
} from './utils/churchLogic';

const PASTOR_PIN_STORAGE_KEY = 'adsales_pastor_pin';
const RSVP_STORAGE_KEY = 'adsales_rsvp_ids';
const AMEN_STORAGE_KEY = 'adsales_amen_ids';

function getLocalStorageSafe(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function loadStoredIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [snapshot, setSnapshot] = useState<ChurchSnapshot | null>(() =>
    loadSnapshotFromCache(getLocalStorageSafe())
  );
  const [loading, setLoading] = useState(() => !loadSnapshotFromCache(getLocalStorageSafe()));
  const [loadError, setLoadError] = useState('');
  const [isUsingOfflineCache, setIsUsingOfflineCache] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [activeTab, setActiveTab] = useState<AppTab>('inicio');
  const [viewerItem, setViewerItem] = useState<MediaItem | null>(null);

  const [pastorPin, setPastorPin] = useState<string>(() => {
    try {
      return sessionStorage.getItem(PASTOR_PIN_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [isPastorUnlocked, setIsPastorUnlocked] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const [rsvpedIds, setRsvpedIds] = useState<string[]>(() =>
    loadStoredIds(RSVP_STORAGE_KEY)
  );
  const [amenedIds, setAmenedIds] = useState<string[]>(() =>
    loadStoredIds(AMEN_STORAGE_KEY)
  );

  const persistSnapshot = useCallback((next: ChurchSnapshot) => {
    setSnapshot(next);
    saveSnapshotToCache(getLocalStorageSafe(), next);
  }, []);

  const fetchSnapshot = useCallback(
    async (pinToUse = pastorPin) => {
      try {
        const headers: Record<string, string> = {};
        if (pinToUse) headers['x-pastor-pin'] = encodeURIComponent(pinToUse);

        const res = await fetch('/api/church', { headers });
        if (!res.ok) throw new Error('Falha ao carregar os dados da igreja.');
        const data = (await res.json()) as ChurchSnapshot;
        persistSnapshot(data);
        setIsUsingOfflineCache(false);
        setLoadError('');
      } catch (err) {
        const cached = loadSnapshotFromCache(getLocalStorageSafe());
        if (cached) {
          setSnapshot((prev) => prev ?? cached);
          setIsUsingOfflineCache(true);
          setLoadError('');
        } else {
          setLoadError(
            err instanceof Error ? err.message : 'Erro de conexão com o servidor.'
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [pastorPin, persistSnapshot]
  );

  const isFlushingPrayersRef = useRef(false);

  const flushPendingPrayers = useCallback(async () => {
    if (isFlushingPrayersRef.current) return;
    const storage = getLocalStorageSafe();
    const pending = readPendingPrayers(storage);
    if (pending.length === 0) return;

    isFlushingPrayersRef.current = true;
    let deliveredAny = false;
    try {
      for (const item of pending) {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (pastorPin) headers['x-pastor-pin'] = encodeURIComponent(pastorPin);

          const res = await fetch('/api/prayers', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              authorName: item.authorName,
              message: item.message,
              isPrivate: item.isPrivate,
            }),
          });
          if (res.ok) {
            removePendingPrayer(storage, item.tempId);
            deliveredAny = true;
          }
        } catch {
          break;
        }
      }
    } finally {
      isFlushingPrayersRef.current = false;
    }

    if (deliveredAny) {
      fetchSnapshot(pastorPin);
    }
  }, [pastorPin, fetchSnapshot]);

  // Initial load & verify saved session PIN if present
  useEffect(() => {
    const init = async () => {
      if (pastorPin) {
        try {
          const res = await fetch('/api/pastor/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pastorPin }),
          });
          if (res.ok) {
            const data = await res.json();
            setIsPastorUnlocked(true);
            persistSnapshot(data.snapshot);
            setIsUsingOfflineCache(false);
            setLoading(false);
            await flushPendingPrayers();
            return;
          }
        } catch {
          // Offline or unreachable — keep cached view without wiping session PIN
          const cached = loadSnapshotFromCache(getLocalStorageSafe());
          if (cached) {
            setSnapshot((prev) => prev ?? cached);
            setIsUsingOfflineCache(true);
            setLoading(false);
            return;
          }
        }
      }
      await fetchSnapshot('');
      await flushPendingPrayers();
    };
    init();
  }, []);

  // Online/Offline listener for automatic cache fallback & pending prayer sync
  useEffect(() => {
    const onOnline = () => {
      setIsUsingOfflineCache(false);
      fetchSnapshot(pastorPin);
      flushPendingPrayers();
    };
    const onOffline = () => {
      setIsUsingOfflineCache(true);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [fetchSnapshot, flushPendingPrayers, pastorPin]);

  // Real-time Server-Sent Events subscription
  useEffect(() => {
    const eventSource = new EventSource('/api/events/stream');

    eventSource.onopen = () => {
      setIsRealtimeConnected(true);
      setIsUsingOfflineCache(false);
      flushPendingPrayers();
    };

    eventSource.addEventListener('snapshot', (event) => {
      try {
        const incoming = JSON.parse((event as MessageEvent).data) as ChurchSnapshot;
        if (isPastorUnlocked && pastorPin) {
          fetchSnapshot(pastorPin);
        } else {
          setSnapshot((prev) => {
            const merged = applyRealtimeSnapshot(prev, incoming);
            saveSnapshotToCache(getLocalStorageSafe(), merged);
            return merged;
          });
        }
        setIsUsingOfflineCache(false);
        setLoading(false);
      } catch {
        // Ignore malformed event
      }
    });

    eventSource.onerror = () => {
      setIsRealtimeConnected(false);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsUsingOfflineCache(true);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [isPastorUnlocked, pastorPin, fetchSnapshot, flushPendingPrayers]);

  const handleSelectTab = (tab: AppTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUnlockPastor = async (pin: string) => {
    const res = await fetch('/api/pastor/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'PIN incorreto.');
    }
    setPastorPin(pin);
    setIsPastorUnlocked(true);
    persistSnapshot(data.snapshot);
    try {
      sessionStorage.setItem(PASTOR_PIN_STORAGE_KEY, pin);
    } catch {
      // Ignore storage failures
    }
  };

  const handleLockPastor = () => {
    setIsPastorUnlocked(false);
    setPastorPin('');
    try {
      sessionStorage.removeItem(PASTOR_PIN_STORAGE_KEY);
    } catch {
      // Ignore storage failures
    }
    fetchSnapshot('');
  };

  const handleToggleRsvp = async (id: string) => {
    const already = rsvpedIds.includes(id);
    const res = await fetch(`/api/schedule/${id}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attending: !already }),
    });
    if (res.ok) {
      const nextIds = already
        ? rsvpedIds.filter((item) => item !== id)
        : [...rsvpedIds, id];
      setRsvpedIds(nextIds);
      localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(nextIds));
      const data = await res.json();
      if (data.snapshot && !isPastorUnlocked) {
        persistSnapshot(data.snapshot);
      } else {
        fetchSnapshot(pastorPin);
      }
    }
  };

  const handleSubmitPrayer = async (payload: {
    authorName: string;
    message: string;
    isPrivate: boolean;
  }): Promise<{ queued: boolean }> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (pastorPin) headers['x-pastor-pin'] = encodeURIComponent(pastorPin);

    try {
      const res = await fetch('/api/prayers', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar pedido.');
      }
      if (data.snapshot) {
        persistSnapshot(data.snapshot);
      }
      return { queued: false };
    } catch (err) {
      // If network error or offline, queue locally so the prayer reaches the Pastor on reconnect
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err instanceof TypeError
      ) {
        enqueuePendingPrayer(getLocalStorageSafe(), {
          tempId: `pending-${Date.now()}`,
          authorName: payload.authorName,
          message: payload.message,
          isPrivate: payload.isPrivate,
          queuedAt: new Date().toISOString(),
        });
        setIsUsingOfflineCache(true);
        return { queued: true };
      }
      throw err;
    }
  };

  const handleAmenPrayer = async (id: string) => {
    if (amenedIds.includes(id)) return;
    const res = await fetch(`/api/prayers/${id}/amen`, { method: 'POST' });
    if (res.ok) {
      const next = [...amenedIds, id];
      setAmenedIds(next);
      localStorage.setItem(AMEN_STORAGE_KEY, JSON.stringify(next));
      fetchSnapshot(pastorPin);
    }
  };

  const featuredItems = useMemo(() => {
    if (!snapshot) return [];
    const sorted = sortAndFilterMedia(snapshot.media, 'all');
    const pinnedOnly = sorted.filter((m) => m.pinned);
    return pinnedOnly.length > 0 ? pinnedOnly : sorted.slice(0, 3);
  }, [snapshot]);

  const publicPrayers = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.prayers.filter((p) => !p.isPrivate);
  }, [snapshot]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isPastorUnlocked={isPastorUnlocked}
      />

      {isUsingOfflineCache && snapshot && (
        <div
          role="status"
          className="bg-blue-950 text-blue-100 text-xs px-4 py-2 text-center flex items-center justify-center gap-2"
        >
          <WifiOff className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>
            Modo offline: exibindo a última versão salva. A sincronização retorna automaticamente com a internet.
          </span>
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 pt-6 pb-24 md:pb-14">
        {loading && !snapshot ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-80 rounded-3xl bg-slate-200" />
            <div className="h-40 rounded-3xl bg-slate-200" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-64 rounded-3xl bg-slate-200" />
              <div className="h-64 rounded-3xl bg-slate-200" />
              <div className="h-64 rounded-3xl bg-slate-200" />
            </div>
          </div>
        ) : loadError && !snapshot ? (
          <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center space-y-4">
            <p className="text-base font-semibold text-slate-900">{loadError}</p>
            <button
              type="button"
              onClick={() => fetchSnapshot(pastorPin)}
              className="min-h-[44px] rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Tentar novamente
            </button>
          </div>
        ) : snapshot ? (
          <div className="space-y-10">
            {activeTab === 'inicio' && (
              <>
                <HeroSpotlight
                  featuredItems={featuredItems}
                  settings={snapshot.settings}
                  nextService={snapshot.schedule[0]}
                  onOpenMedia={setViewerItem}
                  onNavigateTab={handleSelectTab}
                />
                <WordOfTheDay
                  dailyWord={snapshot.dailyWord}
                  settings={snapshot.settings}
                />
                <AudioAndRadioSection
                  audios={snapshot.audios ?? []}
                  settings={snapshot.settings}
                />
                <MediaGallery
                  items={snapshot.media}
                  onOpenMedia={setViewerItem}
                  compactLimit={6}
                  onSeeAll={() => handleSelectTab('midia')}
                />
                <ScheduleAndOffering
                  schedule={snapshot.schedule}
                  settings={snapshot.settings}
                  rsvpedIds={rsvpedIds}
                  onToggleRsvp={handleToggleRsvp}
                />
              </>
            )}

            {activeTab === 'midia' && (
              <div className="space-y-10">
                <AudioAndRadioSection
                  audios={snapshot.audios ?? []}
                  settings={snapshot.settings}
                />
                <MediaGallery
                  items={snapshot.media}
                  onOpenMedia={setViewerItem}
                />
              </div>
            )}

            {activeTab === 'agenda' && (
              <div className="space-y-10">
                <ScheduleAndOffering
                  schedule={snapshot.schedule}
                  settings={snapshot.settings}
                  rsvpedIds={rsvpedIds}
                  onToggleRsvp={handleToggleRsvp}
                />
                <PrayerWall
                  prayers={publicPrayers}
                  amenedIds={amenedIds}
                  onSubmitPrayer={handleSubmitPrayer}
                  onAmenPrayer={handleAmenPrayer}
                />
              </div>
            )}

            {activeTab === 'oracao' && (
              <PrayerWall
                prayers={publicPrayers}
                amenedIds={amenedIds}
                onSubmitPrayer={handleSubmitPrayer}
                onAmenPrayer={handleAmenPrayer}
              />
            )}

            {activeTab === 'pastor' && (
              <PastorPanel
                snapshot={snapshot}
                pastorPin={pastorPin}
                isUnlocked={isPastorUnlocked}
                isRealtimeConnected={isRealtimeConnected}
                onUnlock={handleUnlockPastor}
                onLock={handleLockPastor}
                onSnapshotUpdated={persistSnapshot}
              />
            )}
          </div>
        ) : null}
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="hidden md:block border-t border-slate-200/80 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 flex items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <img
              src="/assets/ad-sales-logo.png"
              alt="Logo AD SALES"
              className="h-8 w-8 rounded-full object-contain"
              referrerPolicy="no-referrer"
            />
            <span>
              <strong className="font-bold text-[#0F2D5C]">
                {snapshot?.settings.churchName ?? 'AD SALES'}
              </strong>{' '}
              — Igreja Evangélica · {snapshot?.settings.address}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => handleSelectTab('agenda')}
              className="hover:text-blue-700 transition-colors"
            >
              Agenda de Cultos
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('oracao')}
              className="hover:text-blue-700 transition-colors"
            >
              Pedidos de Oração
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('pastor')}
              className="hover:text-blue-700 transition-colors font-semibold text-slate-700"
            >
              Painel do Pastor
            </button>
          </div>
        </div>
      </footer>

      <MediaViewerModal
        item={viewerItem}
        onClose={() => setViewerItem(null)}
      />
    </div>
  );
}
