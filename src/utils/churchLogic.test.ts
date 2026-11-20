import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enqueuePendingPrayer,
  extractYouTubeEmbedUrl,
  filterVisiblePrayers,
  formatAudioDuration,
  formatShortDatePt,
  isDirectVideoUrl,
  loadSnapshotFromCache,
  readPendingPrayers,
  removePendingPrayer,
  saveSnapshotToCache,
  sortAndFilterMedia,
  validateAudioInput,
  validateMediaInput,
  validatePrayerInput,
  validateRadioStreamUrl,
  type StorageLike,
} from './churchLogic';
import type { ChurchSnapshot, MediaItem, PrayerRequest } from '../types/church';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

const sampleMedia: MediaItem[] = [
  {
    id: '1',
    type: 'banner',
    title: 'Culto da Família',
    description: 'Domingo às 19h no templo sede',
    category: 'Cultos',
    mediaUrl: '/assets/a.jpg',
    pinned: false,
    createdAt: '2026-11-18T10:00:00.000Z',
    authorName: 'Pr. Marcos Sales',
  },
  {
    id: '2',
    type: 'video',
    title: 'Palavra de Esperança',
    description: 'Resumo da ministração de quarta-feira',
    category: 'Pregações',
    mediaUrl: '',
    externalVideoUrl: 'https://youtu.be/dQw4w9WgXcQ',
    pinned: true,
    createdAt: '2026-11-15T10:00:00.000Z',
    authorName: 'Pr. Marcos Sales',
  },
  {
    id: '3',
    type: 'aviso',
    title: 'Mutirão Solidário',
    description: 'Entrega de cestas básicas neste sábado',
    category: 'Ação Social',
    mediaUrl: '',
    pinned: false,
    createdAt: '2026-11-19T10:00:00.000Z',
    authorName: 'Secretaria',
  },
];

test('sortAndFilterMedia puts pinned items first then sorts newest first', () => {
  const result = sortAndFilterMedia(sampleMedia, 'all');
  assert.deepEqual(
    result.map((item) => item.id),
    ['2', '3', '1']
  );
});

test('sortAndFilterMedia filters by type and accent-insensitive search', () => {
  const onlyBanners = sortAndFilterMedia(sampleMedia, 'banner');
  assert.equal(onlyBanners.length, 1);
  assert.equal(onlyBanners[0].id, '1');

  const searchMatch = sortAndFilterMedia(sampleMedia, 'all', 'acao social');
  assert.equal(searchMatch.length, 1);
  assert.equal(searchMatch[0].id, '3');
});

test('extractYouTubeEmbedUrl parses watch, shortlink, and shorts URLs safely', () => {
  assert.equal(
    extractYouTubeEmbedUrl('https://www.youtube.com/watch?v=abc123XYZ_9&t=12s'),
    'https://www.youtube-nocookie.com/embed/abc123XYZ_9?rel=0'
  );
  assert.equal(
    extractYouTubeEmbedUrl('https://youtu.be/abc123XYZ_9?si=share'),
    'https://www.youtube-nocookie.com/embed/abc123XYZ_9?rel=0'
  );
  assert.equal(
    extractYouTubeEmbedUrl('https://youtube.com/shorts/abc123XYZ_9'),
    'https://www.youtube-nocookie.com/embed/abc123XYZ_9?rel=0'
  );
  assert.equal(extractYouTubeEmbedUrl('https://example.com/not-youtube'), null);
});

test('isDirectVideoUrl accepts local uploaded videos and remote mp4 links', () => {
  assert.equal(isDirectVideoUrl('/uploads/culto-123.mp4'), true);
  assert.equal(isDirectVideoUrl('https://cdn.igreja.org/video.webm?v=1'), true);
  assert.equal(isDirectVideoUrl('javascript:alert(1)'), false);
});

test('validateMediaInput enforces title, file/url, and size limits', () => {
  assert.equal(
    validateMediaInput({
      type: 'banner',
      title: 'Oi',
      description: '',
      hasFile: true,
    }).valid,
    false
  );
  assert.equal(
    validateMediaInput({
      type: 'banner',
      title: 'Culto Especial',
      description: '',
      hasFile: false,
    }).valid,
    false
  );
  assert.equal(
    validateMediaInput({
      type: 'video',
      title: 'Culto ao Vivo',
      description: '',
      hasFile: false,
      externalVideoUrl: 'https://youtu.be/abc123XYZ_9',
    }).valid,
    true
  );
  assert.equal(
    validateMediaInput({
      type: 'video',
      title: 'Vídeo Grande',
      description: '',
      hasFile: true,
      mimeType: 'video/mp4',
      fileSizeBytes: 90 * 1024 * 1024,
    }).valid,
    false
  );
});

test('validateAudioInput, validateRadioStreamUrl, and formatAudioDuration work reliably', () => {
  assert.equal(validateAudioInput({ title: 'Oi', hasFile: true }).valid, false);
  assert.equal(validateAudioInput({ title: 'Oração da Manhã', hasFile: false }).valid, false);
  assert.equal(
    validateAudioInput({
      title: 'Oração da Manhã',
      hasFile: true,
      mimeType: 'audio/webm',
      fileSizeBytes: 512000,
    }).valid,
    true
  );

  assert.equal(validateRadioStreamUrl('').valid, true);
  assert.equal(validateRadioStreamUrl('https://stream.zeno.fm/example').valid, true);
  assert.equal(validateRadioStreamUrl('ftp://invalid-stream').valid, false);
  assert.equal(formatAudioDuration(75), '01:15');
});

test('validatePrayerInput and filterVisiblePrayers handle private requests properly', () => {
  assert.equal(validatePrayerInput('Ana', 'Oi').valid, false);
  assert.equal(validatePrayerInput('Ana', 'Orem pela minha família').valid, true);

  const prayers: PrayerRequest[] = [
    {
      id: 'p1',
      authorName: 'João',
      message: 'Pela saúde do meu pai',
      isPrivate: false,
      amens: 4,
      createdAt: '2026-11-19T12:00:00.000Z',
    },
    {
      id: 'p2',
      authorName: 'Maria',
      message: 'Pedido reservado ao pastor',
      isPrivate: true,
      amens: 0,
      createdAt: '2026-11-20T08:00:00.000Z',
    },
  ];

  assert.equal(filterVisiblePrayers(prayers, false).length, 1);
  assert.equal(filterVisiblePrayers(prayers, true).length, 2);
});

test('saveSnapshotToCache strips private prayers and pastorPin and loads back safely', () => {
  const storage = createMemoryStorage();
  const snapshot: ChurchSnapshot = {
    media: sampleMedia,
    audios: [],
    dailyWord: {
      verse: 'O Senhor é o meu pastor',
      reference: 'Salmos 23:1',
      reflection: 'Reflexão',
      pastorName: 'Pr. Marcos',
      updatedAt: '2026-11-20T08:00:00.000Z',
    },
    schedule: [],
    prayers: [
      {
        id: 'pub',
        authorName: 'Ana',
        message: 'Oração pública',
        isPrivate: false,
        amens: 2,
        createdAt: '2026-11-20T08:00:00.000Z',
      },
      {
        id: 'priv',
        authorName: 'Pedro',
        message: 'Segredo pastoral',
        isPrivate: true,
        amens: 0,
        createdAt: '2026-11-20T08:00:00.000Z',
      },
    ],
    settings: {
      churchName: 'AD SALES',
      tagline: 'Igreja',
      address: 'Centro',
      pixKey: 'pix@adsales.org',
      pixBeneficiary: 'AD SALES',
      whatsapp: '11999990000',
      pastorName: 'Pr. Marcos',
      pastorTitle: 'Pastor',
      pastorAvatarUrl: '/avatar.jpg',
      pastorPin: 'SECRET',
    },
    updatedAt: '2026-11-20T08:00:00.000Z',
  };

  saveSnapshotToCache(storage, snapshot);
  const loaded = loadSnapshotFromCache(storage);
  assert.ok(loaded);
  assert.equal(loaded.prayers.length, 1);
  assert.equal(loaded.prayers[0].id, 'pub');
  assert.equal(loaded.settings.pastorPin, undefined);
});

test('offline pending prayer queue enqueues and removes items reliably', () => {
  const storage = createMemoryStorage();
  enqueuePendingPrayer(storage, {
    tempId: 'tmp-1',
    authorName: 'Lucas',
    message: 'Pela minha família',
    isPrivate: true,
    queuedAt: '2026-11-20T10:00:00.000Z',
  });
  assert.equal(readPendingPrayers(storage).length, 1);

  removePendingPrayer(storage, 'tmp-1');
  assert.equal(readPendingPrayers(storage).length, 0);
});

test('formatShortDatePt returns Hoje and Ontem accurately', () => {
  const now = new Date('2026-11-20T15:00:00.000Z');
  assert.equal(formatShortDatePt('2026-11-20T08:00:00.000Z', now), 'Hoje');
  assert.equal(formatShortDatePt('2026-11-19T20:00:00.000Z', now), 'Ontem');
});
