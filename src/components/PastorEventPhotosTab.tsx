import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, Check, Trash2, UploadCloud, X } from 'lucide-react';
import type { ChurchSnapshot } from '../types/church';
import { formatEventDatePt, validateEventPhotoInput } from '../utils/churchLogic';

interface PastorEventPhotosTabProps {
  snapshot: ChurchSnapshot;
  pastorPin: string;
  onSnapshotUpdated: (next: ChurchSnapshot) => void;
}

const EVENT_SUGGESTIONS = [
  'Culto da Família',
  'Culto de Jovens',
  'Culto de Oração',
  'Santa Ceia',
  'Batismo',
  'Congresso',
  'Ação Social',
];

export function PastorEventPhotosTab({
  snapshot,
  pastorPin,
  onSnapshotUpdated,
}: PastorEventPhotosTabProps) {
  const [eventName, setEventName] = useState('');
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      for (const url of previews) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previews]);

  const handleFilesSelected = (filesList: FileList | null) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!filesList || filesList.length === 0) return;

    const incoming = Array.from(filesList).slice(0, 12);
    for (const url of previews) {
      URL.revokeObjectURL(url);
    }
    setSelectedFiles(incoming);
    setPreviews(incoming.map((file) => URL.createObjectURL(file)));
  };

  const removeSelectedAt = (index: number) => {
    const targetPreview = previews[index];
    if (targetPreview) URL.revokeObjectURL(targetPreview);

    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const clearSelection = () => {
    for (const url of previews) {
      URL.revokeObjectURL(url);
    }
    setSelectedFiles([]);
    setPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePublish = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const validation = validateEventPhotoInput({
      title,
      eventName,
      fileCount: selectedFiles.length,
      files: selectedFiles.map((f) => ({ size: f.size, type: f.type })),
    });

    if (!validation.valid) {
      setErrorMsg(validation.error ?? 'Verifique os dados antes de publicar.');
      return;
    }

    const formData = new FormData();
    formData.append('eventName', eventName.trim());
    formData.append('title', title.trim());
    if (eventDate.trim()) formData.append('eventDate', eventDate.trim());
    if (caption.trim()) formData.append('caption', caption.trim());
    for (const file of selectedFiles) {
      formData.append('photos', file);
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const responseData = await new Promise<{ snapshot: ChurchSnapshot }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/event-photos');
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
              reject(new Error(parsed.error || 'Erro ao publicar fotos do evento.'));
            }
          } catch {
            reject(new Error('Resposta inesperada do servidor.'));
          }
        };

        xhr.onerror = () => reject(new Error('Falha de conexão durante o envio.'));
        xhr.send(formData);
      });

      onSnapshotUpdated(responseData.snapshot);
      setTitle('');
      setCaption('');
      clearSelection();
      setSuccessMsg('Fotos publicadas no carrossel de eventos!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao publicar fotos.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    const res = await fetch(`/api/event-photos/${id}`, {
      method: 'DELETE',
      headers: { 'x-pastor-pin': encodeURIComponent(pastorPin) },
    });
    if (res.ok) {
      const data = await res.json();
      onSnapshotUpdated(data.snapshot);
      setConfirmDeleteId(null);
    }
  };

  const eventPhotos = snapshot.eventPhotos ?? [];

  return (
    <div className="space-y-6">
      <datalist id="church-event-suggestions">
        {EVENT_SUGGESTIONS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      {/* Upload Form */}
      <form
        onSubmit={handlePublish}
        className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-8 space-y-5"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#0F2D5C]">
            <Camera className="h-5 w-5 text-blue-700" strokeWidth={1.75} />
            <h3 className="text-lg sm:text-xl font-bold">
              Postar Fotos de Cultos e Eventos
            </h3>
          </div>
          <p className="text-sm text-slate-600">
            Envie uma ou várias fotos (até 12 por envio) para exibir no carrossel exclusivo de eventos da igreja.
          </p>
        </div>

        {/* File Picker */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            id="pastor-event-photos-input"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="sr-only"
          />

          {selectedFiles.length === 0 ? (
            <label
              htmlFor="pastor-event-photos-input"
              className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-4 py-8 text-center cursor-pointer hover:bg-blue-50 transition-colors"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white">
                <UploadCloud className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-bold text-[#0F2D5C]">
                Selecionar fotos do culto ou atividade
              </span>
              <span className="text-xs text-slate-500">
                Você pode escolher 1 ou até 12 fotos do celular ou computador
              </span>
            </label>
          ) : (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 tabular-nums">
                  {selectedFiles.length}{' '}
                  {selectedFiles.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}
                </span>
                <label
                  htmlFor="pastor-event-photos-input"
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  Trocar seleção
                </label>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {previews.map((url, idx) => (
                  <div
                    key={url}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-200 border border-slate-200"
                  >
                    <img
                      src={url}
                      alt={`Pré-visualização ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeSelectedAt(idx)}
                      aria-label={`Remover foto ${idx + 1}`}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/75 text-white hover:bg-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Metadata Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-5 space-y-1.5">
            <label
              htmlFor="event-photo-name"
              className="block text-xs font-semibold text-slate-700"
            >
              Nome do Culto ou Evento
            </label>
            <input
              id="event-photo-name"
              type="text"
              list="church-event-suggestions"
              maxLength={80}
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Ex: Congresso de Jovens"
              className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4 space-y-1.5">
            <label
              htmlFor="event-photo-title"
              className="block text-xs font-semibold text-slate-700"
            >
              Título do registro
            </label>
            <input
              id="event-photo-title"
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Momento de louvor e oração"
              className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3 space-y-1.5">
            <label
              htmlFor="event-photo-date"
              className="block text-xs font-semibold text-slate-700"
            >
              Data do evento (opcional)
            </label>
            <input
              id="event-photo-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none tabular-nums"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="event-photo-caption"
            className="block text-xs font-semibold text-slate-700"
          >
            Legenda (opcional)
          </label>
          <textarea
            id="event-photo-caption"
            rows={2}
            maxLength={300}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Descreva brevemente o momento vivido pela igreja..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>

        {uploading && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-800">
              <span>Enviando fotos...</span>
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

        {errorMsg && (
          <p role="alert" className="text-xs sm:text-sm font-medium text-red-700 bg-red-50 rounded-xl px-4 py-3">
            {errorMsg}
          </p>
        )}
        {successMsg && (
          <p role="status" className="text-xs sm:text-sm font-medium text-blue-800 bg-blue-50 rounded-xl px-4 py-3 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            {successMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="w-full sm:w-auto min-w-[220px] min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
        >
          <UploadCloud className="h-4 w-4" strokeWidth={2} />
          {uploading ? 'Publicando...' : 'Publicar na Galeria'}
        </button>
      </form>

      {/* Published Event Photos Management List */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-8 space-y-5">
        <h3 className="text-lg font-bold text-[#0F2D5C]">
          Registros na Galeria ({eventPhotos.length})
        </h3>

        {eventPhotos.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            Nenhuma foto de evento publicada ainda.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {eventPhotos.map((item) => {
              const isConfirming = confirmDeleteId === item.id;
              return (
                <div
                  key={item.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={item.photoUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="h-16 w-24 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 truncate">
                        <span className="font-semibold text-blue-700">{item.eventName}</span>
                        {(item.eventDate || item.createdAt) &&
                          ` · ${formatEventDatePt(item.eventDate, item.createdAt)}`}
                      </p>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                        {item.title}
                      </h4>
                      {item.caption && (
                        <p className="text-xs text-slate-500 truncate">{item.caption}</p>
                      )}
                    </div>
                  </div>

                  {isConfirming ? (
                    <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(item.id)}
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
                      aria-label={`Excluir foto ${item.title}`}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100 self-start sm:self-center shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
