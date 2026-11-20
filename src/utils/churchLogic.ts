import type {
  ChurchSnapshot,
  MediaFilter,
  MediaItem,
  MediaKind,
  PendingPrayerPayload,
  PrayerRequest,
} from '../types/church';

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80 MB
export const MAX_AUDIO_BYTES = 40 * 1024 * 1024; // 40 MB

export const SNAPSHOT_CACHE_KEY = 'adsales_snapshot_cache_v1';
export const PENDING_PRAYERS_KEY = 'adsales_pending_prayers_v1';

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/ogg',
]);

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function sortAndFilterMedia(
  items: MediaItem[],
  filter: MediaFilter,
  searchQuery = ''
): MediaItem[] {
  const normalizedQuery = normalizeText(searchQuery);

  return items
    .filter((item) => {
      if (filter !== 'all' && item.type !== filter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const haystack = normalizeText(
        `${item.title} ${item.description} ${item.category} ${item.authorName}`
      );
      return haystack.includes(normalizedQuery);
    })
    .slice()
    .sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function extractYouTubeEmbedUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    let videoId = '';

    if (host === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') ?? '';
      } else if (
        parsed.pathname.startsWith('/shorts/') ||
        parsed.pathname.startsWith('/embed/') ||
        parsed.pathname.startsWith('/live/')
      ) {
        videoId = parsed.pathname.split('/')[2] ?? '';
      }
    }

    if (!/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      return null;
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
  } catch {
    return null;
  }
}

export function isDirectVideoUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/uploads/')) {
    return /\.(mp4|webm|mov|m4v|ogg)$/i.test(trimmed);
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    return /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export interface MediaValidationInput {
  type: MediaKind;
  title: string;
  description: string;
  hasFile: boolean;
  fileSizeBytes?: number;
  mimeType?: string;
  externalVideoUrl?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateMediaInput(input: MediaValidationInput): ValidationResult {
  const title = input.title.trim();
  if (title.length < 3) {
    return {
      valid: false,
      error: 'Informe um título com pelo menos 3 caracteres.',
    };
  }

  if (input.type === 'banner') {
    if (!input.hasFile) {
      return {
        valid: false,
        error: 'Selecione uma imagem ou foto do celular para o banner.',
      };
    }
    if (input.mimeType && !ALLOWED_IMAGE_MIMES.has(input.mimeType.toLowerCase())) {
      return {
        valid: false,
        error: 'Formato de imagem não suportado. Use JPG, PNG ou WebP.',
      };
    }
    if (input.fileSizeBytes && input.fileSizeBytes > MAX_IMAGE_BYTES) {
      return {
        valid: false,
        error: 'A imagem excede o limite de 15 MB.',
      };
    }
    return { valid: true };
  }

  if (input.type === 'video') {
    const externalUrl = (input.externalVideoUrl ?? '').trim();
    if (!input.hasFile && !externalUrl) {
      return {
        valid: false,
        error: 'Envie um vídeo do celular ou cole um link do YouTube.',
      };
    }
    if (input.hasFile) {
      if (
        input.mimeType &&
        !ALLOWED_VIDEO_MIMES.has(input.mimeType.toLowerCase()) &&
        !input.mimeType.toLowerCase().startsWith('video/')
      ) {
        return {
          valid: false,
          error: 'Formato de vídeo não suportado. Use MP4, MOV ou WebM.',
        };
      }
      if (input.fileSizeBytes && input.fileSizeBytes > MAX_VIDEO_BYTES) {
        return {
          valid: false,
          error: 'O vídeo excede o limite de 80 MB.',
        };
      }
      return { valid: true };
    }
    if (!extractYouTubeEmbedUrl(externalUrl) && !isDirectVideoUrl(externalUrl)) {
      return {
        valid: false,
        error: 'Informe um link válido do YouTube ou um arquivo MP4 direto.',
      };
    }
    return { valid: true };
  }

  // aviso
  if (input.description.trim().length < 5 && !input.hasFile) {
    return {
      valid: false,
      error: 'Escreva a mensagem do aviso (mínimo 5 caracteres).',
    };
  }
  if (input.hasFile && input.fileSizeBytes && input.fileSizeBytes > MAX_IMAGE_BYTES) {
    return {
      valid: false,
      error: 'A imagem anexada excede o limite de 15 MB.',
    };
  }
  return { valid: true };
}

export function validateAudioInput(input: {
  title: string;
  hasFile: boolean;
  fileSizeBytes?: number;
  mimeType?: string;
}): ValidationResult {
  if (input.title.trim().length < 3) {
    return {
      valid: false,
      error: 'Informe um título para o áudio (mínimo 3 caracteres).',
    };
  }
  if (!input.hasFile) {
    return {
      valid: false,
      error: 'Grave um áudio ou selecione um arquivo de áudio do celular.',
    };
  }
  if (input.mimeType && !input.mimeType.toLowerCase().startsWith('audio/')) {
    return {
      valid: false,
      error: 'Formato inválido. Selecione ou grave um arquivo de áudio.',
    };
  }
  if (input.fileSizeBytes && input.fileSizeBytes > MAX_AUDIO_BYTES) {
    return {
      valid: false,
      error: 'O áudio excede o limite de 40 MB.',
    };
  }
  return { valid: true };
}

export function validateRadioStreamUrl(rawUrl: string): ValidationResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: true };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: 'O link da rádio deve começar com http:// ou https://.',
      };
    }
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'Informe um endereço válido para o streaming da rádio.',
    };
  }
}

export function formatAudioDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function validatePrayerInput(
  authorName: string,
  message: string
): ValidationResult {
  if (message.trim().length < 5) {
    return {
      valid: false,
      error: 'Escreva seu pedido de oração com pelo menos 5 caracteres.',
    };
  }
  if (authorName.trim().length > 60) {
    return {
      valid: false,
      error: 'O nome deve ter no máximo 60 caracteres.',
    };
  }
  return { valid: true };
}

export function formatShortDatePt(isoDate: string, now = new Date()): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

export function filterVisiblePrayers(
  prayers: PrayerRequest[],
  isPastorUnlocked: boolean
): PrayerRequest[] {
  return prayers
    .filter((p) => isPastorUnlocked || !p.isPrivate)
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function applyRealtimeSnapshot(
  current: ChurchSnapshot | null,
  incoming: ChurchSnapshot
): ChurchSnapshot {
  if (!current) return incoming;
  return {
    ...incoming,
    media: incoming.media ?? current.media,
    audios: incoming.audios ?? current.audios ?? [],
    schedule: incoming.schedule ?? current.schedule,
    prayers: incoming.prayers ?? current.prayers,
  };
}

/**
 * Persists a public-safe snapshot to localStorage for instant offline fallback.
 * Private prayer requests and pastorPin are never written to public cache.
 */
export function saveSnapshotToCache(
  storage: StorageLike | null | undefined,
  snapshot: ChurchSnapshot,
  key = SNAPSHOT_CACHE_KEY
): void {
  if (!storage) return;
  try {
    const { pastorPin: _pin, ...safeSettings } = snapshot.settings;
    const sanitized: ChurchSnapshot = {
      ...snapshot,
      audios: snapshot.audios ?? [],
      prayers: snapshot.prayers.filter((p) => !p.isPrivate),
      settings: safeSettings,
    };
    storage.setItem(key, JSON.stringify(sanitized));
  } catch {
    // Ignore quota or private mode storage errors
  }
}

export function loadSnapshotFromCache(
  storage: StorageLike | null | undefined,
  key = SNAPSHOT_CACHE_KEY
): ChurchSnapshot | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChurchSnapshot;
    if (!parsed || !Array.isArray(parsed.media) || !parsed.settings) {
      return null;
    }
    return {
      ...parsed,
      audios: Array.isArray(parsed.audios) ? parsed.audios : [],
    };
  } catch {
    return null;
  }
}

export function readPendingPrayers(
  storage: StorageLike | null | undefined,
  key = PENDING_PRAYERS_KEY
): PendingPrayerPayload[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueuePendingPrayer(
  storage: StorageLike | null | undefined,
  prayer: PendingPrayerPayload,
  key = PENDING_PRAYERS_KEY
): PendingPrayerPayload[] {
  const existing = readPendingPrayers(storage, key);
  const next = [...existing, prayer];
  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }
  return next;
}

export function removePendingPrayer(
  storage: StorageLike | null | undefined,
  tempId: string,
  key = PENDING_PRAYERS_KEY
): PendingPrayerPayload[] {
  const existing = readPendingPrayers(storage, key);
  const next = existing.filter((item) => item.tempId !== tempId);
  if (storage) {
    try {
      if (next.length === 0) {
        storage.removeItem(key);
      } else {
        storage.setItem(key, JSON.stringify(next));
      }
    } catch {
      // Ignore storage errors
    }
  }
  return next;
}
