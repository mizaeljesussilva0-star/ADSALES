import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  BookOpen,
  CalendarPlus,
  Check,
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  Link2,
  Lock,
  LogOut,
  Pencil,
  Pin,
  PinOff,
  Settings,
  Trash2,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import type {
  ChurchSnapshot,
  MediaItem,
  MediaKind,
} from '../types/church';
import {
  extractYouTubeEmbedUrl,
  formatShortDatePt,
  validateMediaInput,
} from '../utils/churchLogic';
import { PastorRadioAudioTab } from './PastorRadioAudioTab';

interface PastorPanelProps {
  snapshot: ChurchSnapshot;
  pastorPin: string;
  isUnlocked: boolean;
  isRealtimeConnected: boolean;
  onUnlock: (pin: string) => Promise<void>;
  onLock: () => void;
  onSnapshotUpdated: (next: ChurchSnapshot) => void;
}

type PastorSubTab = 'publicar' | 'radio' | 'gerenciar' | 'palavra' | 'oracoes' | 'config';
type PublishMode = 'banner' | 'video-file' | 'video-link' | 'aviso';

const CATEGORIES = [
  'Culto Especial',
  'Juventude',
  'Ensino Bíblico',
  'Pregações',
  'Ação Social',
  'Família',
  'Aviso Geral',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PastorPanel({
  snapshot,
  pastorPin,
  isUnlocked,
  isRealtimeConnected,
  onUnlock,
  onLock,
  onSnapshotUpdated,
}: PastorPanelProps) {
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  const [subTab, setSubTab] = useState<PastorSubTab>('publicar');

  // Publisher state
  const [publishMode, setPublishMode] = useState<PublishMode>('banner');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [externalVideoUrl, setExternalVideoUrl] = useState('');
  const [pinned, setPinned] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishSuccess, setPublishSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manage media state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [manageFeedback, setManageFeedback] = useState('');

  // Daily word & schedule state
  const [wordVerse, setWordVerse] = useState(snapshot.dailyWord.verse);
  const [wordRef, setWordRef] = useState(snapshot.dailyWord.reference);
  const [wordReflection, setWordReflection] = useState(snapshot.dailyWord.reflection);
  const [savingWord, setSavingWord] = useState(false);
  const [wordFeedback, setWordFeedback] = useState('');

  const [schedTitle, setSchedTitle] = useState('');
  const [schedDay, setSchedDay] = useState('Domingo');
  const [schedTime, setSchedTime] = useState('19:00');
  const [schedLocation, setSchedLocation] = useState(snapshot.settings.address);
  const [schedLeader, setSchedLeader] = useState(snapshot.settings.pastorName);
  const [savingSched, setSavingSched] = useState(false);

  // Church settings state
  const [churchName, setChurchName] = useState(snapshot.settings.churchName);
  const [tagline, setTagline] = useState(snapshot.settings.tagline);
  const [address, setAddress] = useState(snapshot.settings.address);
  const [pixKey, setPixKey] = useState(snapshot.settings.pixKey);
  const [pixBeneficiary, setPixBeneficiary] = useState(snapshot.settings.pixBeneficiary);
  const [whatsapp, setWhatsapp] = useState(snapshot.settings.whatsapp);
  const [pastorName, setPastorName] = useState(snapshot.settings.pastorName);
  const [newPin, setNewPin] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState('');

  useEffect(() => {
    setWordVerse(snapshot.dailyWord.verse);
    setWordRef(snapshot.dailyWord.reference);
    setWordReflection(snapshot.dailyWord.reflection);
  }, [snapshot.dailyWord]);

  useEffect(() => {
    setChurchName(snapshot.settings.churchName);
    setTagline(snapshot.settings.tagline);
    setAddress(snapshot.settings.address);
    setPixKey(snapshot.settings.pixKey);
    setPixBeneficiary(snapshot.settings.pixBeneficiary);
    setWhatsapp(snapshot.settings.whatsapp);
    setPastorName(snapshot.settings.pastorName);
  }, [snapshot.settings]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const youTubePreview = useMemo(
    () => (publishMode === 'video-link' ? extractYouTubeEmbedUrl(externalVideoUrl) : null),
    [publishMode, externalVideoUrl]
  );

  const handleFileChange = (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPublishError('');
  };

  const handleModeChange = (mode: PublishMode) => {
    setPublishMode(mode);
    setPublishError('');
    setPublishSuccess('');
    handleFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUnlockSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    if (!pinInput.trim()) {
      setUnlockError('Digite o PIN de acesso do Pastor.');
      return;
    }
    setUnlocking(true);
    try {
      await onUnlock(pinInput.trim());
      setPinInput('');
    } catch (err) {
      setUnlockError(
        err instanceof Error ? err.message : 'PIN incorreto. Tente novamente.'
      );
    } finally {
      setUnlocking(false);
    }
  };

  const handlePublish = async (e: FormEvent) => {
    e.preventDefault();
    setPublishError('');
    setPublishSuccess('');

    const kind: MediaKind =
      publishMode === 'banner'
        ? 'banner'
        : publishMode === 'aviso'
          ? 'aviso'
          : 'video';

    const validation = validateMediaInput({
      type: kind,
      title,
      description,
      hasFile: Boolean(selectedFile),
      fileSizeBytes: selectedFile?.size,
      mimeType: selectedFile?.type,
      externalVideoUrl: publishMode === 'video-link' ? externalVideoUrl : undefined,
    });

    if (!validation.valid) {
      setPublishError(validation.error ?? 'Verifique os dados antes de publicar.');
      return;
    }

    const formData = new FormData();
    formData.append('type', kind);
    formData.append('title', title.trim());
    formData.append('category', category);
    formData.append('description', description.trim());
    formData.append('pinned', String(pinned));
    if (publishMode === 'video-link' && externalVideoUrl.trim()) {
      formData.append('externalVideoUrl', externalVideoUrl.trim());
    }
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    setPublishing(true);
    setUploadProgress(0);

    try {
      const responseData = await new Promise<{ snapshot: ChurchSnapshot }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/media/upload');
        xhr.setRequestHeader('x-pastor-pin', encodeURIComponent(pastorPin));

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error || 'Falha ao publicar conteúdo.'));
            }
          } catch {
            reject(new Error('Resposta inválida do servidor.'));
          }
        };

        xhr.onerror = () => reject(new Error('Falha de rede durante o envio.'));
        xhr.send(formData);
      });

      onSnapshotUpdated(responseData.snapshot);
      setTitle('');
      setDescription('');
      setExternalVideoUrl('');
      handleFileChange(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadProgress(100);
      setPublishSuccess('Publicado em tempo real para toda a igreja!');
      setTimeout(() => {
        setPublishSuccess('');
        setUploadProgress(0);
      }, 4000);
    } catch (err) {
      setPublishError(
        err instanceof Error ? err.message : 'Erro ao publicar conteúdo.'
      );
    } finally {
      setPublishing(false);
    }
  };

  const handleTogglePin = async (item: MediaItem) => {
    const res = await fetch(`/api/media/${item.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-pastor-pin': encodeURIComponent(pastorPin),
      },
      body: JSON.stringify({ pinned: !item.pinned }),
    });
    if (res.ok) {
      const data = await res.json();
      onSnapshotUpdated(data.snapshot);
      setManageFeedback(item.pinned ? 'Removido dos destaques.' : 'Fixado no destaque principal!');
      setTimeout(() => setManageFeedback(''), 2500);
    }
  };

  const startEdit = (item: MediaItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditDescription(item.description);
  };

  const saveEdit = async (id: string) => {
    const res = await fetch(`/api/media/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-pastor-pin': encodeURIComponent(pastorPin),
      },
      body: JSON.stringify({
        title: editTitle,
        category: editCategory,
        description: editDescription,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      onSnapshotUpdated(data.snapshot);
      setEditingId(null);
      setManageFeedback('Publicação atualizada.');
      setTimeout(() => setManageFeedback(''), 2500);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    const res = await fetch(`/api/media/${id}`, {
      method: 'DELETE',
      headers: { 'x-pastor-pin': encodeURIComponent(pastorPin) },
    });
    if (res.ok) {
      const data = await res.json();
      onSnapshotUpdated(data.snapshot);
      setConfirmDeleteId(null);
      setManageFeedback('Publicação excluída.');
      setTimeout(() => setManageFeedback(''), 2500);
    }
  };

  const handleSaveWord = async (e: FormEvent) => {
    e.preventDefault();
    setSavingWord(true);
    setWordFeedback('');
    try {
      const res = await fetch('/api/word', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-pastor-pin': encodeURIComponent(pastorPin),
        },
        body: JSON.stringify({
          verse: wordVerse,
          reference: wordRef,
          reflection: wordReflection,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar palavra.');
      onSnapshotUpdated(data.snapshot);
      setWordFeedback('Palavra do Dia atualizada para todos!');
      setTimeout(() => setWordFeedback(''), 3000);
    } catch (err) {
      setWordFeedback(err instanceof Error ? err.message : 'Erro ao atualizar.');
    } finally {
      setSavingWord(false);
    }
  };

  const handleAddSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (schedTitle.trim().length < 3) return;
    setSavingSched(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pastor-pin': encodeURIComponent(pastorPin),
        },
        body: JSON.stringify({
          title: schedTitle,
          dayOfWeek: schedDay,
          time: schedTime,
          location: schedLocation,
          leader: schedLeader,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onSnapshotUpdated(data.snapshot);
        setSchedTitle('');
      }
    } finally {
      setSavingSched(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    const res = await fetch(`/api/schedule/${id}`, {
      method: 'DELETE',
      headers: { 'x-pastor-pin': encodeURIComponent(pastorPin) },
    });
    if (res.ok) {
      const data = await res.json();
      onSnapshotUpdated(data.snapshot);
    }
  };

  const handleDeletePrayer = async (id: string) => {
    const res = await fetch(`/api/prayers/${id}`, {
      method: 'DELETE',
      headers: { 'x-pastor-pin': encodeURIComponent(pastorPin) },
    });
    if (res.ok) {
      const data = await res.json();
      onSnapshotUpdated(data.snapshot);
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsFeedback('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-pastor-pin': encodeURIComponent(pastorPin),
        },
        body: JSON.stringify({
          churchName,
          tagline,
          address,
          pixKey,
          pixBeneficiary,
          whatsapp,
          pastorName,
          newPin: newPin.trim().length >= 4 ? newPin.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      onSnapshotUpdated(data.snapshot);
      if (newPin.trim().length >= 4) {
        await onUnlock(newPin.trim());
        setNewPin('');
      }
      setSettingsFeedback('Configurações salvas em tempo real!');
      setTimeout(() => setSettingsFeedback(''), 3000);
    } catch (err) {
      setSettingsFeedback(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Locked View
  if (!isUnlocked) {
    return (
      <section aria-label="Acesso ao Painel do Pastor" className="mx-auto max-w-md py-6 sm:py-12">
        <form
          onSubmit={handleUnlockSubmit}
          className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 space-y-6"
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <img
              src="/assets/ad-sales-logo.png"
              alt="Logo AD SALES"
              className="h-16 w-16 rounded-full object-contain"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F2D5C]">
                Painel do Pastor
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Publique banners, vídeos do celular e comunicados em tempo real para toda a igreja.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="pastor-pin-input"
              className="block text-xs font-semibold text-slate-700"
            >
              PIN de Acesso
            </label>
            <div className="relative">
              <input
                id="pastor-pin-input"
                type={showPin ? 'text' : 'password'}
                autoComplete="current-password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Digite o código de acesso"
                className="w-full min-h-[48px] rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-mono tracking-wider text-slate-900 placeholder:font-sans placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {unlockError && (
            <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 rounded-xl px-3.5 py-2.5">
              {unlockError}
            </p>
          )}

          <button
            type="submit"
            disabled={unlocking}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <Lock className="h-4 w-4" strokeWidth={1.75} />
            {unlocking ? 'Verificando...' : 'Entrar no Painel'}
          </button>
        </form>
      </section>
    );
  }

  // Unlocked Pastor Studio
  return (
    <section aria-label="Painel do Pastor" className="space-y-6">
      {/* Studio Header */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src={snapshot.settings.pastorAvatarUrl}
            alt={snapshot.settings.pastorName}
            referrerPolicy="no-referrer"
            className="h-12 w-12 rounded-full object-cover border border-slate-200 shrink-0"
          />
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#0F2D5C]">
              Painel do Pastor
            </h2>
            <p className="text-xs text-slate-500">
              {snapshot.settings.pastorName} ·{' '}
              {isRealtimeConnected ? 'Sincronização em tempo real ativa' : 'Reconectando sincronização...'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLock}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Bloquear Painel
        </button>
      </div>

      {/* Mobile-Friendly Wrapped Sub-Tabs (All tabs immediately visible on 390px) */}
      <div
        role="tablist"
        aria-label="Seções do Painel do Pastor"
        className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-200/70"
      >
        {(
          [
            { id: 'publicar', label: 'Publicar' },
            { id: 'radio', label: 'Rádio & Áudio' },
            { id: 'gerenciar', label: `Mídia (${snapshot.media.length})` },
            { id: 'palavra', label: 'Palavra & Cultos' },
            { id: 'oracoes', label: `Orações (${snapshot.prayers.length})` },
            { id: 'config', label: 'Configurações' },
          ] as { id: PastorSubTab; label: string }[]
        ).map((tab) => {
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSubTab(tab.id)}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-white text-[#0F2D5C] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB: RADIO & AUDIO STUDIO */}
      {subTab === 'radio' && (
        <PastorRadioAudioTab
          snapshot={snapshot}
          pastorPin={pastorPin}
          onSnapshotUpdated={onSnapshotUpdated}
        />
      )}

      {/* TAB 1: MOBILE-FIRST PUBLISHER */}
      {subTab === 'publicar' && (
        <form
          onSubmit={handlePublish}
          className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-8 space-y-6"
        >
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-[#0F2D5C]">
              Nova Publicação
            </h3>
            <p className="text-sm text-slate-600">
              Escolha o tipo de conteúdo. Fotos e vídeos do celular são ajustados automaticamente para celular e computador.
            </p>
          </div>

          {/* Publish Mode Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(
              [
                { id: 'banner', label: 'Banner / Foto', icon: ImagePlus },
                { id: 'video-file', label: 'Vídeo do Celular', icon: Video },
                { id: 'video-link', label: 'Link YouTube', icon: Link2 },
                { id: 'aviso', label: 'Aviso Rápido', icon: FileText },
              ] as { id: PublishMode; label: string; icon: typeof ImagePlus }[]
            ).map((mode) => {
              const Icon = mode.icon;
              const active = publishMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleModeChange(mode.id)}
                  aria-pressed={active}
                  className={`min-h-[52px] flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs sm:text-sm font-semibold transition-colors ${
                    active
                      ? 'border-blue-700 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* File Upload Dropzone (Banner / Video File / Optional Aviso Image) */}
          {publishMode !== 'video-link' && (
            <div className="space-y-3">
              <label
                htmlFor="pastor-media-file"
                className="block text-xs font-semibold text-slate-700"
              >
                {publishMode === 'banner'
                  ? 'Imagem do Banner (JPG, PNG, WebP — até 15 MB)'
                  : publishMode === 'video-file'
                    ? 'Vídeo do Celular (MP4, MOV, WebM — até 80 MB)'
                    : 'Imagem ilustrativa (opcional)'}
              </label>

              <input
                ref={fileInputRef}
                id="pastor-media-file"
                type="file"
                accept={publishMode === 'video-file' ? 'video/*' : 'image/*'}
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                className="sr-only"
              />

              {!selectedFile ? (
                <label
                  htmlFor="pastor-media-file"
                  className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-4 py-8 text-center cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white">
                    <UploadCloud className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <span className="text-sm font-bold text-[#0F2D5C]">
                    {publishMode === 'video-file'
                      ? 'Selecionar vídeo do celular'
                      : 'Selecionar foto ou banner do celular'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Toque aqui para abrir a galeria ou câmera
                  </span>
                </label>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <div className="bg-slate-900 flex items-center justify-center max-h-72 overflow-hidden">
                    {publishMode === 'video-file' ? (
                      <video
                        src={previewUrl}
                        controls
                        playsInline
                        className="max-h-72 w-full object-contain"
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Pré-visualização do banner"
                        className="max-h-72 w-full object-contain"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {formatBytes(selectedFile.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label
                        htmlFor="pastor-media-file"
                        className="min-h-[40px] inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-800 hover:bg-slate-200 cursor-pointer"
                      >
                        Trocar
                      </label>
                      <button
                        type="button"
                        onClick={() => handleFileChange(null)}
                        aria-label="Remover arquivo selecionado"
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* YouTube / Direct Video Link Mode */}
          {publishMode === 'video-link' && (
            <div className="space-y-3">
              <label
                htmlFor="pastor-video-url"
                className="block text-xs font-semibold text-slate-700"
              >
                Link do YouTube ou MP4
              </label>
              <input
                id="pastor-video-url"
                type="url"
                value={externalVideoUrl}
                onChange={(e) => setExternalVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
              {youTubePreview && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-black">
                  <iframe
                    src={youTubePreview}
                    title="Pré-visualização do vídeo"
                    className="h-full w-full border-0"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          )}

          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8 space-y-1.5">
              <label
                htmlFor="pastor-post-title"
                className="block text-xs font-semibold text-slate-700"
              >
                Título da publicação
              </label>
              <input
                id="pastor-post-title"
                type="text"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Culto Especial de Santa Ceia — Domingo às 19h"
                className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label
                htmlFor="pastor-post-category"
                className="block text-xs font-semibold text-slate-700"
              >
                Categoria
              </label>
              <select
                id="pastor-post-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="pastor-post-desc"
              className="block text-xs font-semibold text-slate-700"
            >
              Descrição ou comunicado
            </label>
            <textarea
              id="pastor-post-desc"
              rows={3}
              maxLength={800}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Escreva horário, local ou convite para os membros..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
            <span className="text-sm text-slate-700">
              <strong className="font-semibold text-slate-900">
                Fixar no destaque principal
              </strong>{' '}
              — aparece logo na entrada do aplicativo
            </span>
          </label>

          {/* Progress Bar */}
          {publishing && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-800">
                <span>Enviando conteúdo...</span>
                <span className="tabular-nums">{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-blue-100 overflow-hidden">
                <div
                  className="h-full bg-blue-700 transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {publishError && (
            <p role="alert" className="text-xs sm:text-sm font-medium text-red-700 bg-red-50 rounded-xl px-4 py-3">
              {publishError}
            </p>
          )}
          {publishSuccess && (
            <p role="status" className="text-xs sm:text-sm font-medium text-blue-800 bg-blue-50 rounded-xl px-4 py-3 flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              {publishSuccess}
            </p>
          )}

          <button
            type="submit"
            disabled={publishing}
            className="w-full sm:w-auto min-w-[220px] min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
          >
            <UploadCloud className="h-4 w-4" strokeWidth={2} />
            {publishing ? 'Publicando...' : 'Publicar Agora'}
          </button>
        </form>
      )}

      {/* TAB 2: MANAGE MEDIA */}
      {subTab === 'gerenciar' && (
        <div className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-[#0F2D5C]">
              Publicações no Ar
            </h3>
            {manageFeedback && (
              <span role="status" className="text-xs font-semibold text-blue-700">
                {manageFeedback}
              </span>
            )}
          </div>

          {snapshot.media.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Nenhuma mídia publicada ainda.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {snapshot.media.map((item) => {
                const isEditing = editingId === item.id;
                const isConfirmingDelete = confirmDeleteId === item.id;

                return (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-16 w-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                          {item.type === 'video' && item.mediaUrl ? (
                            <video
                              src={item.mediaUrl}
                              muted
                              className="h-full w-full object-cover"
                            />
                          ) : item.mediaUrl ? (
                            <img
                              src={item.mediaUrl}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-[#0F2D5C] flex items-center justify-center text-white">
                              {item.type === 'video' ? (
                                <Video className="h-5 w-5" />
                              ) : (
                                <FileText className="h-5 w-5" />
                              )}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">
                            {item.type === 'banner'
                              ? 'Banner'
                              : item.type === 'video'
                                ? 'Vídeo'
                                : 'Aviso'}{' '}
                            · {item.category} · {formatShortDatePt(item.createdAt)}
                            {item.pinned ? ' · Fixado no topo' : ''}
                          </p>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            {item.title}
                          </h4>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTogglePin(item)}
                          className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            item.pinned
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {item.pinned ? (
                            <>
                              <PinOff className="h-3.5 w-3.5" /> Desafixar
                            </>
                          ) : (
                            <>
                              <Pin className="h-3.5 w-3.5" /> Fixar
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => (isEditing ? setEditingId(null) : startEdit(item))}
                          className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>

                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteMedia(item.id)}
                              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-red-600 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            aria-label={`Excluir ${item.title}`}
                            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            aria-label="Editar título"
                            className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
                          />
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            aria-label="Editar categoria"
                            className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          rows={2}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          aria-label="Editar descrição"
                          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(item.id)}
                            className="min-h-[40px] px-4 py-1.5 rounded-xl bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            Salvar alterações
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WORD OF THE DAY & SCHEDULE */}
      {subTab === 'palavra' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveWord}
            className="lg:col-span-6 rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-7 space-y-4"
          >
            <div className="flex items-center gap-2 text-[#0F2D5C]">
              <BookOpen className="h-5 w-5 text-blue-700" strokeWidth={1.75} />
              <h3 className="text-lg font-bold">Atualizar Palavra do Dia</h3>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="word-ref" className="block text-xs font-semibold text-slate-700">
                Referência bíblica
              </label>
              <input
                id="word-ref"
                type="text"
                value={wordRef}
                onChange={(e) => setWordRef(e.target.value)}
                placeholder="Ex: Salmos 28:7"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="word-verse" className="block text-xs font-semibold text-slate-700">
                Versículo
              </label>
              <textarea
                id="word-verse"
                rows={3}
                value={wordVerse}
                onChange={(e) => setWordVerse(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="word-reflection" className="block text-xs font-semibold text-slate-700">
                Reflexão pastoral
              </label>
              <textarea
                id="word-reflection"
                rows={3}
                value={wordReflection}
                onChange={(e) => setWordReflection(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm"
              />
            </div>

            {wordFeedback && (
              <p role="status" className="text-xs font-semibold text-blue-800 bg-blue-50 rounded-xl px-3 py-2">
                {wordFeedback}
              </p>
            )}

            <button
              type="submit"
              disabled={savingWord}
              className="w-full min-h-[46px] rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {savingWord ? 'Salvando...' : 'Atualizar Palavra do Dia'}
            </button>
          </form>

          <div className="lg:col-span-6 rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-7 space-y-5">
            <div className="flex items-center gap-2 text-[#0F2D5C]">
              <CalendarPlus className="h-5 w-5 text-blue-700" strokeWidth={1.75} />
              <h3 className="text-lg font-bold">Agenda Semanal</h3>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-3 border-b border-slate-100 pb-5">
              <input
                type="text"
                value={schedTitle}
                onChange={(e) => setSchedTitle(e.target.value)}
                placeholder="Nome do culto ou evento (ex: Vigília da Vitória)"
                aria-label="Nome do culto"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={schedDay}
                  onChange={(e) => setSchedDay(e.target.value)}
                  aria-label="Dia da semana"
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
                >
                  {[
                    'Domingo',
                    'Segunda-feira',
                    'Terça-feira',
                    'Quarta-feira',
                    'Quinta-feira',
                    'Sexta-feira',
                    'Sábado',
                  ].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                  aria-label="Horário do culto"
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm tabular-nums"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={schedLocation}
                  onChange={(e) => setSchedLocation(e.target.value)}
                  placeholder="Local"
                  aria-label="Local do culto"
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm"
                />
                <input
                  type="text"
                  value={schedLeader}
                  onChange={(e) => setSchedLeader(e.target.value)}
                  placeholder="Responsável"
                  aria-label="Responsável pelo culto"
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={savingSched}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {savingSched ? 'Adicionando...' : 'Adicionar à Agenda'}
              </button>
            </form>

            <div className="divide-y divide-slate-100">
              {snapshot.schedule.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-blue-700 font-semibold tabular-nums">
                      {item.dayOfWeek} · {item.time}
                    </p>
                    <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSchedule(item.id)}
                    aria-label={`Remover ${item.title} da agenda`}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-red-600 hover:bg-red-50 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRAYER INBOX (INCLUDING PRIVATE REQUESTS) */}
      {subTab === 'oracoes' && (
        <div className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-8 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-[#0F2D5C]">
              Pedidos de Oração Recebidos
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Inclui pedidos públicos e pedidos reservados enviados exclusivamente para você.
            </p>
          </div>

          {snapshot.prayers.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Nenhum pedido de oração recebido ainda.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {snapshot.prayers.map((prayer) => (
                <div key={prayer.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-bold text-slate-900">{prayer.authorName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatShortDatePt(prayer.createdAt)}</span>
                      {prayer.isPrivate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                            <Lock className="h-3 w-3" /> Reservado ao Pastor
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{prayer.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePrayer(prayer.id)}
                    aria-label={`Remover pedido de ${prayer.authorName}`}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 self-start shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Arquivar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CHURCH & PIX SETTINGS */}
      {subTab === 'config' && (
        <form
          onSubmit={handleSaveSettings}
          className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-8 space-y-5 max-w-3xl"
        >
          <div className="flex items-center gap-2 text-[#0F2D5C]">
            <Settings className="h-5 w-5 text-blue-700" strokeWidth={1.75} />
            <h3 className="text-lg font-bold">Configurações da Igreja</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="cfg-name" className="block text-xs font-semibold text-slate-700">
                Nome da Igreja
              </label>
              <input
                id="cfg-name"
                type="text"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cfg-pastor" className="block text-xs font-semibold text-slate-700">
                Nome do Pastor
              </label>
              <input
                id="cfg-pastor"
                type="text"
                value={pastorName}
                onChange={(e) => setPastorName(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="cfg-tagline" className="block text-xs font-semibold text-slate-700">
                Frase de boas-vindas
              </label>
              <input
                id="cfg-tagline"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="cfg-address" className="block text-xs font-semibold text-slate-700">
                Endereço da Igreja
              </label>
              <input
                id="cfg-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cfg-pix" className="block text-xs font-semibold text-slate-700">
                Chave PIX para Dízimos/Ofertas
              </label>
              <input
                id="cfg-pix"
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cfg-beneficiary" className="block text-xs font-semibold text-slate-700">
                Favorecido do PIX
              </label>
              <input
                id="cfg-beneficiary"
                type="text"
                value={pixBeneficiary}
                onChange={(e) => setPixBeneficiary(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cfg-whatsapp" className="block text-xs font-semibold text-slate-700">
                WhatsApp da Secretaria
              </label>
              <input
                id="cfg-whatsapp"
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cfg-newpin" className="block text-xs font-semibold text-slate-700">
                Alterar PIN do Pastor (opcional)
              </label>
              <input
                id="cfg-newpin"
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-mono"
              />
            </div>
          </div>

          {settingsFeedback && (
            <p role="status" className="text-xs font-semibold text-blue-800 bg-blue-50 rounded-xl px-4 py-2.5">
              {settingsFeedback}
            </p>
          )}

          <button
            type="submit"
            disabled={savingSettings}
            className="min-h-[46px] rounded-xl bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </form>
      )}
    </section>
  );
}
