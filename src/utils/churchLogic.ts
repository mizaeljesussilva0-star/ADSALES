import type {
  ChurchSnapshot,
  EventPhotoItem,
  MediaFilter,
  MediaItem,
  MediaKind,
  MemberProfile,
  PendingPrayerPayload,
  PrayerRequest,
  PublicMemberCard,
} from '../types/church';

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80 MB
export const MAX_AUDIO_BYTES = 40 * 1024 * 1024; // 40 MB

export const SNAPSHOT_CACHE_KEY = 'adsales_snapshot_cache_v1';
export const PENDING_PRAYERS_KEY = 'adsales_pending_prayers_v1';
export const MEMBER_PROFILE_KEY = 'adsales_member_profile_v1';

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

export function validateEventPhotoInput(input: {
  title: string;
  eventName: string;
  fileCount: number;
  files?: { size?: number; type?: string }[];
}): ValidationResult {
  if (input.eventName.trim().length < 2) {
    return {
      valid: false,
      error: 'Informe o nome do culto ou evento (ex: Culto da Família).',
    };
  }
  if (input.title.trim().length < 3) {
    return {
      valid: false,
      error: 'Informe um título para os registros (mínimo 3 caracteres).',
    };
  }
  if (input.fileCount < 1) {
    return {
      valid: false,
      error: 'Selecione pelo menos 1 foto do evento.',
    };
  }
  if (input.fileCount > 12) {
    return {
      valid: false,
      error: 'Envie no máximo 12 fotos por vez.',
    };
  }
  for (const file of input.files ?? []) {
    if (
      file.type &&
      !ALLOWED_IMAGE_MIMES.has(file.type.toLowerCase()) &&
      !file.type.toLowerCase().startsWith('image/')
    ) {
      return {
        valid: false,
        error: 'Formato de imagem não suportado. Use JPG, PNG ou WebP.',
      };
    }
    if (file.size && file.size > MAX_IMAGE_BYTES) {
      return {
        valid: false,
        error: 'Uma das fotos excede o limite de 15 MB.',
      };
    }
  }
  return { valid: true };
}

export function sortAndFilterEventPhotos(
  photos: EventPhotoItem[],
  eventFilter = 'all'
): EventPhotoItem[] {
  const normalizedFilter = normalizeText(eventFilter);
  return photos
    .filter((item) => {
      if (!eventFilter || eventFilter === 'all') return true;
      return normalizeText(item.eventName) === normalizedFilter;
    })
    .slice()
    .sort((a, b) => {
      const dateA = a.eventDate ? new Date(`${a.eventDate}T12:00:00`).getTime() : 0;
      const dateB = b.eventDate ? new Date(`${b.eventDate}T12:00:00`).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function getUniqueEventNames(photos: EventPhotoItem[]): string[] {
  const seen = new Map<string, string>();
  for (const photo of photos) {
    const clean = photo.eventName.trim();
    if (!clean) continue;
    const key = normalizeText(clean);
    if (!seen.has(key)) {
      seen.set(key, clean);
    }
  }
  return Array.from(seen.values());
}

export function wrapCarouselIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}

export function formatEventDatePt(eventDate?: string, fallbackIso?: string): string {
  if (eventDate && /^\d{4}-\d{2}-\d{2}$/.test(eventDate.trim())) {
    const [y, m, d] = eventDate.trim().split('-').map(Number);
    const monthName = MONTHS_PT[m - 1];
    if (monthName && d >= 1 && d <= 31) {
      return `${d} de ${monthName} de ${y}`;
    }
  }
  return fallbackIso ? formatShortDatePt(fallbackIso) : '';
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

export function validateMemberInput(input: {
  username: string;
  hasAvatar?: boolean;
  fileSizeBytes?: number;
  mimeType?: string;
}): ValidationResult {
  const clean = input.username.trim();
  if (clean.length < 2) {
    return {
      valid: false,
      error: 'Informe seu nome de usuário com pelo menos 2 caracteres.',
    };
  }
  if (clean.length > 40) {
    return {
      valid: false,
      error: 'O nome de usuário deve ter no máximo 40 caracteres.',
    };
  }
  if (input.hasAvatar) {
    if (
      input.mimeType &&
      !ALLOWED_IMAGE_MIMES.has(input.mimeType.toLowerCase()) &&
      !input.mimeType.toLowerCase().startsWith('image/')
    ) {
      return {
        valid: false,
        error: 'Selecione uma foto válida (JPG, PNG ou WebP).',
      };
    }
    if (input.fileSizeBytes && input.fileSizeBytes > MAX_IMAGE_BYTES) {
      return {
        valid: false,
        error: 'A foto de perfil excede o limite de 15 MB.',
      };
    }
  }
  return { valid: true };
}

export function validateBirthDate(raw: string, now = new Date()): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: true };
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return {
      valid: false,
      error: 'Informe uma data de nascimento válida.',
    };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const currentYear = now.getFullYear();

  if (year < 1900 || year > currentYear || month < 1 || month > 12 || day < 1 || day > 31) {
    return {
      valid: false,
      error: 'Informe uma data de nascimento válida.',
    };
  }

  const check = new Date(year, month - 1, day);
  if (
    check.getFullYear() !== year ||
    check.getMonth() !== month - 1 ||
    check.getDate() !== day
  ) {
    return {
      valid: false,
      error: 'Data de nascimento inválida no calendário.',
    };
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (check.getTime() > today.getTime()) {
    return {
      valid: false,
      error: 'A data de nascimento não pode ser no futuro.',
    };
  }
  return { valid: true };
}

const MONTHS_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export function toBirthMonthDay(birthDate?: string): string | undefined {
  if (!birthDate) return undefined;
  const trimmed = birthDate.trim();
  const full = /^\d{4}-(\d{2})-(\d{2})$/.exec(trimmed);
  if (full) return `${full[1]}-${full[2]}`;
  const short = /^(\d{2})-(\d{2})$/.exec(trimmed);
  if (short) return `${short[1]}-${short[2]}`;
  return undefined;
}

export function formatBirthdayPt(dateOrMonthDay?: string): string {
  const mmdd = toBirthMonthDay(dateOrMonthDay);
  if (!mmdd) return '';
  const [mStr, dStr] = mmdd.split('-');
  const monthIdx = Number(mStr) - 1;
  const day = Number(dStr);
  if (monthIdx < 0 || monthIdx > 11 || day < 1 || day > 31) return '';
  return `${day} de ${MONTHS_PT[monthIdx]}`;
}

export function isBirthdayToday(dateOrMonthDay?: string, now = new Date()): boolean {
  const mmdd = toBirthMonthDay(dateOrMonthDay);
  if (!mmdd) return false;
  const current = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return mmdd === current;
}

export function isBirthdayThisMonth(dateOrMonthDay?: string, now = new Date()): boolean {
  const mmdd = toBirthMonthDay(dateOrMonthDay);
  if (!mmdd) return false;
  const month = Number(mmdd.split('-')[0]);
  return month === now.getMonth() + 1;
}

export function sortBirthdaysUpcoming(
  items: PublicMemberCard[],
  now = new Date()
): PublicMemberCard[] {
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const daysUntil = (mmdd?: string): number => {
    if (!mmdd) return 9999;
    const [m, d] = mmdd.split('-').map(Number);
    const keyNow = currentMonth * 100 + currentDay;
    const keyItem = m * 100 + d;
    if (keyItem >= keyNow) return keyItem - keyNow;
    return 1200 + keyItem - keyNow;
  };

  return items.slice().sort((a, b) => daysUntil(a.birthMonthDay) - daysUntil(b.birthMonthDay));
}

export function getMemberInitials(username: string): string {
  const parts = username
    .replace(/^@+/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'AD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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
    eventPhotos: incoming.eventPhotos ?? current.eventPhotos ?? [],
    audios: incoming.audios ?? current.audios ?? [],
    schedule: incoming.schedule ?? current.schedule,
    prayers: incoming.prayers ?? current.prayers,
    publicMembers: incoming.publicMembers ?? current.publicMembers ?? [],
    birthdays: incoming.birthdays ?? current.birthdays ?? [],
  };
}

/**
 * Persists a public-safe snapshot to localStorage for instant offline fallback.
 * Private prayer requests, member directory, and pastorPin are never written to public cache.
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
      eventPhotos: snapshot.eventPhotos ?? [],
      audios: snapshot.audios ?? [],
      prayers: snapshot.prayers.filter((p) => !p.isPrivate),
      members: [],
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
      eventPhotos: Array.isArray(parsed.eventPhotos) ? parsed.eventPhotos : [],
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

export function saveMemberProfileToStorage(
  storage: StorageLike | null | undefined,
  member: MemberProfile | null,
  key = MEMBER_PROFILE_KEY
): void {
  if (!storage) return;
  try {
    if (!member) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify(member));
    }
  } catch {
    // Ignore storage errors
  }
}

export function loadMemberProfileFromStorage(
  storage: StorageLike | null | undefined,
  key = MEMBER_PROFILE_KEY
): MemberProfile | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MemberProfile;
    if (!parsed || typeof parsed.id !== 'string' || typeof parsed.username !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function shouldShowInstallPopup(params: {
  isStandalone: boolean;
  dismissed: boolean;
  activeTab: string;
}): boolean {
  if (params.isStandalone) return false;
  if (params.dismissed) return false;
  if (params.activeTab === 'pastor') return false;
  return true;
}

export function shouldShowRegistrationPopup(params: {
  currentMember: MemberProfile | null;
  dismissed: boolean;
  activeTab: string;
  installPopupVisible?: boolean;
}): boolean {
  if (params.installPopupVisible) return false;
  if (params.currentMember) return false;
  if (params.dismissed) return false;
  if (params.activeTab === 'pastor' || params.activeTab === 'perfil') {
    return false;
  }
  return true;
}
