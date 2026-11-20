import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import type {
  AudioMessage,
  ChurchSettings,
  ChurchSnapshot,
  DailyWord,
  EventPhotoItem,
  MediaItem,
  MediaKind,
  MemberProfile,
  PrayerRequest,
  PublicMemberCard,
  ServiceScheduleItem,
} from './src/types/church';
import {
  MAX_VIDEO_BYTES,
  extractYouTubeEmbedUrl,
  isDirectVideoUrl,
  normalizeText,
  toBirthMonthDay,
  validateBirthDate,
  validateEventPhotoInput,
  validateMemberInput,
  validateRadioStreamUrl,
} from './src/utils/churchLogic';

const PORT = Number(process.env.PORT ?? 3000);
const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DATA_FILE = path.join(DATA_DIR, 'church-data.json');
const UPLOADS_DIR = path.join(ROOT_DIR, 'public', 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

interface StoredChurchData extends ChurchSnapshot {
  settings: ChurchSettings & { pastorPin: string };
}

function createInitialData(): StoredChurchData {
  const now = new Date();

  return {
    media: [],
    eventPhotos: [],
    audios: [],
    dailyWord: {
      verse: '',
      reference: '',
      reflection: '',
      pastorName: '',
      updatedAt: '',
    },
    schedule: [],
    prayers: [],
    members: [],
    settings: {
      churchName: 'AD SALES',
      tagline: 'Igreja Evangélica — Fé, Palavra e Comunhão',
      address: '',
      pixKey: '',
      pixBeneficiary: '',
      whatsapp: '',
      pastorName: 'Pastor',
      pastorTitle: 'Pastor Presidente',
      pastorAvatarUrl: '',
      pastorPin: process.env.PASTOR_PIN ?? 'JESUSVIRÁ',
      radioEnabled: false,
      radioStationName: 'Rádio AD SALES',
      radioStreamUrl: '',
    },
    updatedAt: now.toISOString(),
  };
}

function loadStore(): StoredChurchData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as StoredChurchData;
      if (parsed && Array.isArray(parsed.media) && parsed.settings) {
        return {
          ...parsed,
          eventPhotos: Array.isArray(parsed.eventPhotos) ? parsed.eventPhotos : [],
          audios: Array.isArray(parsed.audios) ? parsed.audios : [],
          members: Array.isArray(parsed.members) ? parsed.members : [],
          settings: {
            radioEnabled: false,
            radioStationName: 'Rádio AD SALES',
            radioStreamUrl: '',
            ...parsed.settings,
          },
        };
      }
    }
  } catch (err) {
    console.error('Erro ao ler data/church-data.json, recriando estrutura inicial:', err);
  }
  const initial = createInitialData();
  saveStore(initial);
  return initial;
}

function saveStore(data: StoredChurchData): void {
  data.updatedAt = new Date().toISOString();
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DATA_FILE);
}

let store: StoredChurchData = loadStore();

function toSnapshot(isPastor: boolean): ChurchSnapshot {
  const { pastorPin: _pin, ...safeSettings } = store.settings;
  const allMembers = store.members ?? [];

  const publicMembers: PublicMemberCard[] = allMembers
    .filter((m) => Boolean(m.showInMembers))
    .map((m) => ({
      id: m.id,
      username: m.username,
      avatarUrl: m.avatarUrl,
      roleTitle: m.roleTitle?.trim() || 'Membro',
      birthMonthDay: toBirthMonthDay(m.birthDate),
    }));

  const birthdays: PublicMemberCard[] = allMembers
    .filter((m) => Boolean(toBirthMonthDay(m.birthDate)))
    .map((m) => ({
      id: m.id,
      username: m.username,
      avatarUrl: m.avatarUrl,
      roleTitle: m.showInMembers ? (m.roleTitle?.trim() || 'Membro') : '',
      birthMonthDay: toBirthMonthDay(m.birthDate),
    }));

  return {
    media: store.media,
    eventPhotos: store.eventPhotos ?? [],
    audios: store.audios ?? [],
    dailyWord: store.dailyWord,
    schedule: store.schedule,
    prayers: isPastor
      ? store.prayers
      : store.prayers.filter((p) => !p.isPrivate),
    members: isPastor ? allMembers : [],
    publicMembers,
    birthdays,
    settings: safeSettings,
    updatedAt: store.updatedAt,
  };
}

// SSE client registry
const sseClients = new Set<Response>();

function broadcastUpdate(): void {
  const publicPayload = JSON.stringify(toSnapshot(false));
  for (const res of sseClients) {
    try {
      res.write(`event: snapshot\ndata: ${publicPayload}\n\n`);
    } catch {
      sseClients.delete(res);
    }
  }
}

// Multer configuration for mobile image & video uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
    const safeExt = /^[.a-z0-9]{1,8}$/.test(ext) ? ext : '.bin';
    const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    cb(null, `midia-${unique}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_VIDEO_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    if (
      mime.startsWith('image/') ||
      mime.startsWith('video/') ||
      mime.startsWith('audio/')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem, vídeo ou áudio são permitidos.'));
    }
  },
});

function isValidPastorPin(req: Request): boolean {
  const raw = String(req.header('x-pastor-pin') ?? '').trim();
  let headerPin = raw;
  try {
    headerPin = decodeURIComponent(raw);
  } catch {
    headerPin = raw;
  }
  return headerPin.length > 0 && headerPin === store.settings.pastorPin;
}

function requirePastor(req: Request, res: Response, next: NextFunction): void {
  if (!isValidPastorPin(req)) {
    res.status(401).json({ error: 'PIN do Pastor inválido ou não informado.' });
    return;
  }
  next();
}

function deleteUploadedFileIfLocal(mediaUrl: string): void {
  if (!mediaUrl || !mediaUrl.startsWith('/uploads/')) return;
  const filename = path.basename(mediaUrl);
  const fullPath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (err) {
      console.error('Falha ao remover arquivo de mídia:', err);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Serve uploaded banners & videos with HTTP Range support
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Real-time Server-Sent Events stream
  app.get('/api/events/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write('retry: 3000\n');
    res.write(`event: snapshot\ndata: ${JSON.stringify(toSnapshot(false))}\n\n`);

    sseClients.add(res);

    const keepalive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(keepalive);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepalive);
      sseClients.delete(res);
    });
  });

  // Fetch current church snapshot
  app.get('/api/church', (req, res) => {
    const unlocked = isValidPastorPin(req);
    res.json(toSnapshot(unlocked));
  });

  // Verify Pastor PIN
  app.post('/api/pastor/verify', (req, res) => {
    const pin = String(req.body?.pin ?? '').trim();
    if (!pin || pin !== store.settings.pastorPin) {
      res.status(401).json({ ok: false, error: 'PIN incorreto. Tente novamente.' });
      return;
    }
    res.json({ ok: true, snapshot: toSnapshot(true) });
  });

  // Upload media (banner image or mobile video) via multipart/form-data
  app.post(
    '/api/media/upload',
    requirePastor,
    upload.single('file'),
    (req, res) => {
      const type = String(req.body?.type ?? 'banner') as MediaKind;
      const title = String(req.body?.title ?? '').trim();
      const description = String(req.body?.description ?? '').trim();
      const category = String(req.body?.category ?? 'Comunicado').trim() || 'Comunicado';
      const pinned = String(req.body?.pinned ?? 'false') === 'true';
      const externalVideoUrl = String(req.body?.externalVideoUrl ?? '').trim();

      if (!['banner', 'video', 'aviso'].includes(type)) {
        res.status(400).json({ error: 'Tipo de conteúdo inválido.' });
        return;
      }

      if (title.length < 3) {
        if (req.file) deleteUploadedFileIfLocal(`/uploads/${req.file.filename}`);
        res.status(400).json({ error: 'Informe um título com pelo menos 3 caracteres.' });
        return;
      }

      let mediaUrl = '';
      if (req.file) {
        mediaUrl = `/uploads/${req.file.filename}`;
      }

      if (type === 'banner' && !mediaUrl) {
        res.status(400).json({ error: 'Selecione uma imagem para publicar o banner.' });
        return;
      }

      if (type === 'video' && !mediaUrl) {
        if (!externalVideoUrl) {
          res.status(400).json({ error: 'Envie um vídeo do celular ou cole um link.' });
          return;
        }
        if (!extractYouTubeEmbedUrl(externalVideoUrl) && !isDirectVideoUrl(externalVideoUrl)) {
          res.status(400).json({ error: 'Link de vídeo inválido. Use YouTube ou MP4 direto.' });
          return;
        }
      }

      const item: MediaItem = {
        id: `media-${crypto.randomUUID().slice(0, 8)}`,
        type,
        title,
        description,
        category,
        mediaUrl,
        externalVideoUrl: externalVideoUrl || undefined,
        mimeType: req.file?.mimetype,
        pinned,
        createdAt: new Date().toISOString(),
        authorName: store.settings.pastorName,
      };

      store.media.unshift(item);
      saveStore(store);
      broadcastUpdate();
      res.status(201).json({ item, snapshot: toSnapshot(true) });
    }
  );

  // Update media item (pin, title, description, category)
  app.patch('/api/media/:id', requirePastor, (req, res) => {
    const idx = store.media.findIndex((m) => m.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    const existing = store.media[idx];
    const nextTitle =
      typeof req.body?.title === 'string' ? req.body.title.trim() : existing.title;
    if (nextTitle.length < 3) {
      res.status(400).json({ error: 'O título deve ter pelo menos 3 caracteres.' });
      return;
    }

    store.media[idx] = {
      ...existing,
      title: nextTitle,
      description:
        typeof req.body?.description === 'string'
          ? req.body.description.trim()
          : existing.description,
      category:
        typeof req.body?.category === 'string' && req.body.category.trim()
          ? req.body.category.trim()
          : existing.category,
      pinned:
        typeof req.body?.pinned === 'boolean' ? req.body.pinned : existing.pinned,
    };

    saveStore(store);
    broadcastUpdate();
    res.json({ item: store.media[idx], snapshot: toSnapshot(true) });
  });

  // Delete media item
  app.delete('/api/media/:id', requirePastor, (req, res) => {
    const idx = store.media.findIndex((m) => m.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    const [removed] = store.media.splice(idx, 1);
    deleteUploadedFileIfLocal(removed.mediaUrl);
    saveStore(store);
    broadcastUpdate();
    res.json({ ok: true, snapshot: toSnapshot(true) });
  });

  // Upload one or multiple event photos for the church event gallery (Pastor only)
  app.post(
    '/api/event-photos',
    requirePastor,
    upload.array('photos', 12),
    (req, res) => {
      const files = Array.isArray(req.files) ? req.files : [];
      const title = String(req.body?.title ?? '').trim();
      const eventName = String(req.body?.eventName ?? '').trim();
      const eventDate = String(req.body?.eventDate ?? '').trim();
      const caption = String(req.body?.caption ?? '').trim();

      const validation = validateEventPhotoInput({
        title,
        eventName,
        fileCount: files.length,
        files: files.map((f) => ({ size: f.size, type: f.mimetype })),
      });

      if (!validation.valid) {
        for (const f of files) {
          deleteUploadedFileIfLocal(`/uploads/${f.filename}`);
        }
        res.status(400).json({ error: validation.error });
        return;
      }

      const nowIso = new Date().toISOString();
      const createdItems: EventPhotoItem[] = files.map((f, idx) => ({
        id: `evphoto-${crypto.randomUUID().slice(0, 8)}`,
        title: files.length > 1 ? `${title.slice(0, 110)} (${idx + 1}/${files.length})` : title.slice(0, 120),
        eventName: eventName.slice(0, 80),
        eventDate: /^\d{4}-\d{2}-\d{2}$/.test(eventDate) ? eventDate : undefined,
        caption: caption.slice(0, 300) || undefined,
        photoUrl: `/uploads/${f.filename}`,
        authorName: store.settings.pastorName,
        createdAt: nowIso,
      }));

      store.eventPhotos = [...createdItems, ...(store.eventPhotos ?? [])];
      saveStore(store);
      broadcastUpdate();
      res.status(201).json({ photos: createdItems, snapshot: toSnapshot(true) });
    }
  );

  // Pastor deletes an event photo
  app.delete('/api/event-photos/:id', requirePastor, (req, res) => {
    const list = store.eventPhotos ?? [];
    const idx = list.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Foto do evento não encontrada.' });
      return;
    }
    const [removed] = list.splice(idx, 1);
    store.eventPhotos = list;
    deleteUploadedFileIfLocal(removed.photoUrl);
    saveStore(store);
    broadcastUpdate();
    res.json({ ok: true, snapshot: toSnapshot(true) });
  });

  // Upload recorded or selected audio message for the church
  app.post(
    '/api/audios/upload',
    requirePastor,
    upload.single('file'),
    (req, res) => {
      const title = String(req.body?.title ?? '').trim();
      const description = String(req.body?.description ?? '').trim();
      const rawDuration = Number(req.body?.durationSeconds ?? 0);

      if (title.length < 3) {
        if (req.file) deleteUploadedFileIfLocal(`/uploads/${req.file.filename}`);
        res.status(400).json({ error: 'Informe um título para o áudio (mínimo 3 caracteres).' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'Grave um áudio ou envie um arquivo de áudio.' });
        return;
      }

      const audioItem: AudioMessage = {
        id: `audio-${crypto.randomUUID().slice(0, 8)}`,
        title,
        description,
        audioUrl: `/uploads/${req.file.filename}`,
        durationSeconds:
          Number.isFinite(rawDuration) && rawDuration > 0
            ? Math.round(rawDuration)
            : undefined,
        authorName: store.settings.pastorName,
        createdAt: new Date().toISOString(),
      };

      store.audios = [audioItem, ...(store.audios ?? [])];
      saveStore(store);
      broadcastUpdate();
      res.status(201).json({ audio: audioItem, snapshot: toSnapshot(true) });
    }
  );

  // Delete an audio message
  app.delete('/api/audios/:id', requirePastor, (req, res) => {
    const list = store.audios ?? [];
    const idx = list.findIndex((a) => a.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Áudio não encontrado.' });
      return;
    }
    const [removed] = list.splice(idx, 1);
    store.audios = list;
    deleteUploadedFileIfLocal(removed.audioUrl);
    saveStore(store);
    broadcastUpdate();
    res.json({ ok: true, snapshot: toSnapshot(true) });
  });

  // Update Word of the Day
  app.put('/api/word', requirePastor, (req, res) => {
    const verse = String(req.body?.verse ?? '').trim();
    const reference = String(req.body?.reference ?? '').trim();
    const reflection = String(req.body?.reflection ?? '').trim();

    if (verse.length < 5 || reference.length < 2) {
      res.status(400).json({ error: 'Preencha o versículo e a referência bíblica.' });
      return;
    }

    const updated: DailyWord = {
      verse,
      reference,
      reflection,
      pastorName: store.settings.pastorName,
      updatedAt: new Date().toISOString(),
    };
    store.dailyWord = updated;
    saveStore(store);
    broadcastUpdate();
    res.json({ dailyWord: updated, snapshot: toSnapshot(true) });
  });

  // Add service schedule item
  app.post('/api/schedule', requirePastor, (req, res) => {
    const title = String(req.body?.title ?? '').trim();
    const dayOfWeek = String(req.body?.dayOfWeek ?? '').trim();
    const time = String(req.body?.time ?? '').trim();
    const location = String(req.body?.location ?? '').trim() || store.settings.address;
    const leader = String(req.body?.leader ?? '').trim() || store.settings.pastorName;

    if (title.length < 3 || !dayOfWeek || !time) {
      res.status(400).json({ error: 'Informe nome do culto, dia da semana e horário.' });
      return;
    }

    const item: ServiceScheduleItem = {
      id: `sched-${crypto.randomUUID().slice(0, 8)}`,
      title,
      dayOfWeek,
      time,
      location,
      leader,
      rsvpCount: 0,
    };
    store.schedule.push(item);
    saveStore(store);
    broadcastUpdate();
    res.status(201).json({ item, snapshot: toSnapshot(true) });
  });

  // Delete service schedule item
  app.delete('/api/schedule/:id', requirePastor, (req, res) => {
    const idx = store.schedule.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Culto não encontrado na agenda.' });
      return;
    }
    store.schedule.splice(idx, 1);
    saveStore(store);
    broadcastUpdate();
    res.json({ ok: true, snapshot: toSnapshot(true) });
  });

  // Member RSVP toggle for a service
  app.post('/api/schedule/:id/rsvp', (req, res) => {
    const item = store.schedule.find((s) => s.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Culto não encontrado.' });
      return;
    }
    const attending = req.body?.attending !== false;
    item.rsvpCount = Math.max(0, item.rsvpCount + (attending ? 1 : -1));
    saveStore(store);
    broadcastUpdate();
    res.json({ item, snapshot: toSnapshot(false) });
  });

  // Member submits prayer request
  app.post('/api/prayers', (req, res) => {
    const authorName = String(req.body?.authorName ?? '').trim() || 'Anônimo';
    const message = String(req.body?.message ?? '').trim();
    const isPrivate = Boolean(req.body?.isPrivate);

    if (message.length < 5) {
      res.status(400).json({ error: 'Escreva seu pedido com pelo menos 5 caracteres.' });
      return;
    }

    const prayer: PrayerRequest = {
      id: `pray-${crypto.randomUUID().slice(0, 8)}`,
      authorName: authorName.slice(0, 60),
      message: message.slice(0, 600),
      isPrivate,
      amens: 1,
      createdAt: new Date().toISOString(),
    };
    store.prayers.unshift(prayer);
    saveStore(store);
    broadcastUpdate();
    res.status(201).json({ prayer, snapshot: toSnapshot(isValidPastorPin(req)) });
  });

  // Member taps "Estou orando"
  app.post('/api/prayers/:id/amen', (req, res) => {
    const prayer = store.prayers.find((p) => p.id === req.params.id);
    if (!prayer) {
      res.status(404).json({ error: 'Pedido de oração não encontrado.' });
      return;
    }
    prayer.amens += 1;
    saveStore(store);
    broadcastUpdate();
    res.json({ prayer });
  });

  // Pastor deletes prayer request
  app.delete('/api/prayers/:id', requirePastor, (req, res) => {
    const idx = store.prayers.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Pedido de oração não encontrado.' });
      return;
    }
    store.prayers.splice(idx, 1);
    saveStore(store);
    broadcastUpdate();
    res.json({ ok: true, snapshot: toSnapshot(true) });
  });

  // Member registers with username, profile photo, and optional birthDate
  app.post('/api/members', upload.single('avatar'), (req, res) => {
    const username = String(req.body?.username ?? '').trim();
    const birthDate = String(req.body?.birthDate ?? '').trim();

    const validation = validateMemberInput({
      username,
      hasAvatar: Boolean(req.file),
      fileSizeBytes: req.file?.size,
      mimeType: req.file?.mimetype,
    });

    if (!validation.valid) {
      if (req.file) deleteUploadedFileIfLocal(`/uploads/${req.file.filename}`);
      res.status(400).json({ error: validation.error });
      return;
    }

    const birthValidation = validateBirthDate(birthDate);
    if (!birthValidation.valid) {
      if (req.file) deleteUploadedFileIfLocal(`/uploads/${req.file.filename}`);
      res.status(400).json({ error: birthValidation.error });
      return;
    }

    const list = store.members ?? [];
    const normalized = normalizeText(username);
    if (list.some((m) => normalizeText(m.username) === normalized)) {
      if (req.file) deleteUploadedFileIfLocal(`/uploads/${req.file.filename}`);
      res.status(409).json({
        error: 'Este nome de usuário já está cadastrado. Escolha outro.',
      });
      return;
    }

    const member: MemberProfile = {
      id: `mem-${crypto.randomUUID().slice(0, 8)}`,
      username,
      avatarUrl: req.file ? `/uploads/${req.file.filename}` : '',
      birthDate: birthDate || undefined,
      roleTitle: '',
      showInMembers: false,
      createdAt: new Date().toISOString(),
    };

    store.members = [member, ...list];
    saveStore(store);
    broadcastUpdate();
    res.status(201).json({ member });
  });

  // Member updates own username, profile photo, or birthDate
  app.patch('/api/members/:id', upload.single('avatar'), (req, res) => {
    const list = store.members ?? [];
    const idx = list.findIndex((m) => m.id === req.params.id);
    if (idx === -1) {
      if (req.file) deleteUploadedFileIfLocal(`/uploads/${req.file.filename}`);
      res.status(404).json({ error: 'Cadastro não encontrado.' });
      return;
    }

    const existing = list[idx];
    const nextUsername =
      typeof req.body?.username === 'string'
        ? req.body.username.trim()
        : existing.username;
    const nextBirthDate =
      typeof req.body?.birthDate === 'string'
        ? req.body.birthDate.trim()
        : (existing.birthDate ?? '');

    const validation = validateMemberInput({
      username: nextUsername,
      hasAvatar: Boolean(req.file),
      fileSizeBytes: req.file?.size,
      mimeType: req.file?.mimetype,
    });

    if (!validation.valid) {
      if (req.file) deleteUploadedFileIfLocal(`/uploads/${req.file.filename}`);
      res.status(400).json({ error: validation.error });
      return;
    }

    const birthValidation = validateBirthDate(nextBirthDate);
    if (!birthValidation.valid) {
      if (req.file) deleteUploadedFileIfLocal(`/uploads/${req.file.filename}`);
      res.status(400).json({ error: birthValidation.error });
      return;
    }

    const normalized = normalizeText(nextUsername);
    if (
      list.some(
        (m) => m.id !== existing.id && normalizeText(m.username) === normalized
      )
    ) {
      if (req.file) deleteUploadedFileIfLocal(`/uploads/${req.file.filename}`);
      res.status(409).json({
        error: 'Este nome de usuário já está cadastrado. Escolha outro.',
      });
      return;
    }

    let nextAvatarUrl = existing.avatarUrl;
    if (req.file) {
      deleteUploadedFileIfLocal(existing.avatarUrl);
      nextAvatarUrl = `/uploads/${req.file.filename}`;
    }

    const updated: MemberProfile = {
      ...existing,
      username: nextUsername,
      avatarUrl: nextAvatarUrl,
      birthDate: nextBirthDate || undefined,
    };

    list[idx] = updated;
    store.members = list;
    saveStore(store);
    broadcastUpdate();
    res.json({ member: updated });
  });

  // Pastor defines whether a member appears in the public Members directory and their role/title
  app.patch('/api/members/:id/pastor', requirePastor, (req, res) => {
    const list = store.members ?? [];
    const idx = list.findIndex((m) => m.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Membro não encontrado.' });
      return;
    }

    const existing = list[idx];
    const showInMembers =
      typeof req.body?.showInMembers === 'boolean'
        ? req.body.showInMembers
        : Boolean(existing.showInMembers);
    const roleTitle =
      typeof req.body?.roleTitle === 'string'
        ? req.body.roleTitle.trim().slice(0, 60)
        : (existing.roleTitle ?? '');

    const updated: MemberProfile = {
      ...existing,
      showInMembers,
      roleTitle,
    };

    list[idx] = updated;
    store.members = list;
    saveStore(store);
    broadcastUpdate();
    res.json({ member: updated, snapshot: toSnapshot(true) });
  });

  // Pastor removes a registered member
  app.delete('/api/members/:id', requirePastor, (req, res) => {
    const list = store.members ?? [];
    const idx = list.findIndex((m) => m.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Membro não encontrado.' });
      return;
    }
    const [removed] = list.splice(idx, 1);
    store.members = list;
    deleteUploadedFileIfLocal(removed.avatarUrl);
    saveStore(store);
    broadcastUpdate();
    res.json({ ok: true, snapshot: toSnapshot(true) });
  });

  // Update church, radio & Pastor settings
  app.put('/api/settings', requirePastor, (req, res) => {
    const b = req.body ?? {};
    const nextPin =
      typeof b.newPin === 'string' && b.newPin.trim().length >= 4
        ? b.newPin.trim()
        : store.settings.pastorPin;

    if (typeof b.radioStreamUrl === 'string') {
      const radioValidation = validateRadioStreamUrl(b.radioStreamUrl);
      if (!radioValidation.valid) {
        res.status(400).json({ error: radioValidation.error });
        return;
      }
    }

    store.settings = {
      ...store.settings,
      churchName:
        typeof b.churchName === 'string' && b.churchName.trim()
          ? b.churchName.trim()
          : store.settings.churchName,
      tagline:
        typeof b.tagline === 'string' ? b.tagline.trim() : store.settings.tagline,
      address:
        typeof b.address === 'string' ? b.address.trim() : store.settings.address,
      pixKey:
        typeof b.pixKey === 'string' ? b.pixKey.trim() : store.settings.pixKey,
      pixBeneficiary:
        typeof b.pixBeneficiary === 'string'
          ? b.pixBeneficiary.trim()
          : store.settings.pixBeneficiary,
      whatsapp:
        typeof b.whatsapp === 'string' ? b.whatsapp.trim() : store.settings.whatsapp,
      pastorName:
        typeof b.pastorName === 'string' && b.pastorName.trim()
          ? b.pastorName.trim()
          : store.settings.pastorName,
      radioEnabled:
        typeof b.radioEnabled === 'boolean'
          ? b.radioEnabled
          : store.settings.radioEnabled,
      radioStationName:
        typeof b.radioStationName === 'string'
          ? b.radioStationName.trim() || 'Rádio AD SALES'
          : store.settings.radioStationName,
      radioStreamUrl:
        typeof b.radioStreamUrl === 'string'
          ? b.radioStreamUrl.trim()
          : store.settings.radioStreamUrl,
      pastorPin: nextPin,
    };

    saveStore(store);
    broadcastUpdate();
    res.json({ ok: true, snapshot: toSnapshot(true) });
  });

  // Multer & Express JSON error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'Arquivo muito grande. Limite máximo de 80 MB.' });
        return;
      }
      res.status(400).json({ error: `Erro no envio: ${err.message}` });
      return;
    }
    res.status(400).json({ error: err.message || 'Erro inesperado no servidor.' });
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AD SALES server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
