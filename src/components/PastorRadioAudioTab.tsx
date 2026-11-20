import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Check,
  FileAudio,
  Mic,
  Radio,
  Square,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import type { ChurchSnapshot } from '../types/church';
import {
  formatAudioDuration,
  formatShortDatePt,
  validateAudioInput,
  validateRadioStreamUrl,
} from '../utils/churchLogic';

interface PastorRadioAudioTabProps {
  snapshot: ChurchSnapshot;
  pastorPin: string;
  onSnapshotUpdated: (next: ChurchSnapshot) => void;
}

function pickSupportedAudioMime(): { mimeType: string; ext: string } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'audio/webm', ext: 'webm' };
  }
  const candidates = [
    { mimeType: 'audio/webm;codecs=opus', ext: 'webm' },
    { mimeType: 'audio/webm', ext: 'webm' },
    { mimeType: 'audio/mp4', ext: 'm4a' },
    { mimeType: 'audio/ogg;codecs=opus', ext: 'ogg' },
  ];
  for (const item of candidates) {
    if (MediaRecorder.isTypeSupported(item.mimeType)) {
      return item;
    }
  }
  return { mimeType: '', ext: 'webm' };
}

export function PastorRadioAudioTab({
  snapshot,
  pastorPin,
  onSnapshotUpdated,
}: PastorRadioAudioTabProps) {
  // Radio config state
  const [radioEnabled, setRadioEnabled] = useState(
    Boolean(snapshot.settings.radioEnabled)
  );
  const [radioStationName, setRadioStationName] = useState(
    snapshot.settings.radioStationName ?? 'Rádio AD SALES'
  );
  const [radioStreamUrl, setRadioStreamUrl] = useState(
    snapshot.settings.radioStreamUrl ?? ''
  );
  const [savingRadio, setSavingRadio] = useState(false);
  const [radioFeedback, setRadioFeedback] = useState('');
  const [radioError, setRadioError] = useState('');

  // Audio recorder & upload state
  const [audioTitle, setAudioTitle] = useState('');
  const [audioDesc, setAudioDesc] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('');
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [audioSuccess, setAudioSuccess] = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedSecondsRef = useRef(0);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setRadioEnabled(Boolean(snapshot.settings.radioEnabled));
    setRadioStationName(snapshot.settings.radioStationName ?? 'Rádio AD SALES');
    setRadioStreamUrl(snapshot.settings.radioStreamUrl ?? '');
  }, [snapshot.settings]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [audioPreviewUrl]);

  const clearAudioSelection = () => {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioFile(null);
    setAudioPreviewUrl('');
    setRecordedSeconds(0);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleSaveRadio = async (e: FormEvent) => {
    e.preventDefault();
    setRadioError('');
    setRadioFeedback('');

    const validation = validateRadioStreamUrl(radioStreamUrl);
    if (!validation.valid) {
      setRadioError(validation.error ?? 'Link de rádio inválido.');
      return;
    }

    if (radioEnabled && !radioStreamUrl.trim()) {
      setRadioError('Informe o link do streaming para ativar o player da rádio.');
      return;
    }

    setSavingRadio(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-pastor-pin': encodeURIComponent(pastorPin),
        },
        body: JSON.stringify({
          radioEnabled,
          radioStationName: radioStationName.trim() || 'Rádio AD SALES',
          radioStreamUrl: radioStreamUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar rádio.');
      onSnapshotUpdated(data.snapshot);
      setRadioFeedback('Configurações da rádio salvas em tempo real!');
      setTimeout(() => setRadioFeedback(''), 3500);
    } catch (err) {
      setRadioError(err instanceof Error ? err.message : 'Erro ao salvar rádio.');
    } finally {
      setSavingRadio(false);
    }
  };

  const startRecording = async () => {
    setAudioError('');
    setAudioSuccess('');

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setAudioError(
        'Gravação direta não suportada neste navegador. Use a opção abaixo para enviar um arquivo de áudio do celular.'
      );
      return;
    }

    try {
      clearAudioSelection();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];

      const { mimeType, ext } = pickSupportedAudioMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      recordedSecondsRef.current = 0;
      setRecordedSeconds(0);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const file = new File([blob], `mensagem-pastor-${Date.now()}.${ext}`, {
          type: finalMime,
        });
        setAudioFile(file);
        setAudioPreviewUrl(URL.createObjectURL(file));
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        recordedSecondsRef.current += 1;
        setRecordedSeconds(recordedSecondsRef.current);
      }, 1000);
    } catch {
      setAudioError(
        'Não foi possível acessar o microfone. Verifique a permissão ou selecione um arquivo de áudio abaixo.'
      );
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSelectAudioFile = (file: File | null) => {
    setAudioError('');
    setAudioSuccess('');
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    if (!file) {
      setAudioFile(null);
      setAudioPreviewUrl('');
      return;
    }
    setAudioFile(file);
    setAudioPreviewUrl(URL.createObjectURL(file));
    setRecordedSeconds(0);
  };

  const handlePublishAudio = async (e: FormEvent) => {
    e.preventDefault();
    setAudioError('');
    setAudioSuccess('');

    const validation = validateAudioInput({
      title: audioTitle,
      hasFile: Boolean(audioFile),
      fileSizeBytes: audioFile?.size,
      mimeType: audioFile?.type,
    });

    if (!validation.valid) {
      setAudioError(validation.error ?? 'Verifique o áudio antes de publicar.');
      return;
    }

    if (!audioFile) return;

    const formData = new FormData();
    formData.append('title', audioTitle.trim());
    formData.append('description', audioDesc.trim());
    if (recordedSeconds > 0) {
      formData.append('durationSeconds', String(recordedSeconds));
    }
    formData.append('file', audioFile);

    setUploadingAudio(true);
    setUploadProgress(0);

    try {
      const responseData = await new Promise<{ snapshot: ChurchSnapshot }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/audios/upload');
          xhr.setRequestHeader('x-pastor-pin', encodeURIComponent(pastorPin));

          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
            }
          };

          xhr.onload = () => {
            try {
              const parsed = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(parsed);
              } else {
                reject(new Error(parsed.error || 'Erro ao publicar áudio.'));
              }
            } catch {
              reject(new Error('Resposta inválida do servidor.'));
            }
          };

          xhr.onerror = () => reject(new Error('Falha de conexão durante o envio.'));
          xhr.send(formData);
        }
      );

      onSnapshotUpdated(responseData.snapshot);
      setAudioTitle('');
      setAudioDesc('');
      clearAudioSelection();
      setAudioSuccess('Áudio publicado e pronto para a igreja ouvir!');
      setTimeout(() => {
        setAudioSuccess('');
        setUploadProgress(0);
      }, 4000);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Erro ao enviar áudio.');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleDeleteAudio = async (id: string) => {
    const res = await fetch(`/api/audios/${id}`, {
      method: 'DELETE',
      headers: { 'x-pastor-pin': encodeURIComponent(pastorPin) },
    });
    if (res.ok) {
      const data = await res.json();
      onSnapshotUpdated(data.snapshot);
    }
  };

  const publishedAudios = snapshot.audios ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Card 1: Radio Player Configuration */}
        <form
          onSubmit={handleSaveRadio}
          className="lg:col-span-5 rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-7 space-y-4"
        >
          <div className="flex items-center gap-2 text-[#0F2D5C]">
            <Radio className="h-5 w-5 text-blue-700" strokeWidth={1.75} />
            <h3 className="text-lg font-bold">Player de Rádio</h3>
          </div>
          <p className="text-sm text-slate-600">
            Configure o link da rádio ao vivo da igreja para que os membros ouçam direto pelo aplicativo.
          </p>

          <label className="flex items-center gap-3 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={radioEnabled}
              onChange={(e) => setRadioEnabled(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
            <span className="text-sm font-semibold text-slate-800">
              Mostrar player de rádio na tela inicial
            </span>
          </label>

          <div className="space-y-1.5">
            <label htmlFor="radio-station-name" className="block text-xs font-semibold text-slate-700">
              Nome da Rádio
            </label>
            <input
              id="radio-station-name"
              type="text"
              value={radioStationName}
              onChange={(e) => setRadioStationName(e.target.value)}
              placeholder="Ex: Rádio AD SALES"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="radio-stream-url" className="block text-xs font-semibold text-slate-700">
              Link do Streaming (MP3 / AAC / Icecast / Zeno)
            </label>
            <input
              id="radio-stream-url"
              type="url"
              value={radioStreamUrl}
              onChange={(e) => setRadioStreamUrl(e.target.value)}
              placeholder="https://stream.exemplo.com/radio.mp3"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm"
            />
          </div>

          {radioError && (
            <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 rounded-xl px-3 py-2">
              {radioError}
            </p>
          )}
          {radioFeedback && (
            <p role="status" className="text-xs font-semibold text-blue-800 bg-blue-50 rounded-xl px-3 py-2">
              {radioFeedback}
            </p>
          )}

          <button
            type="submit"
            disabled={savingRadio}
            className="w-full min-h-[46px] rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {savingRadio ? 'Salvando...' : 'Salvar Rádio'}
          </button>
        </form>

        {/* Card 2: Direct Microphone Recorder or Phone Audio Upload */}
        <form
          onSubmit={handlePublishAudio}
          className="lg:col-span-7 rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-7 space-y-5"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#0F2D5C]">
              <Mic className="h-5 w-5 text-blue-700" strokeWidth={1.75} />
              <h3 className="text-lg font-bold">Gravar ou Enviar Áudio</h3>
            </div>
            <p className="text-sm text-slate-600">
              Grave uma palavra, oração ou aviso pelo microfone agora, ou envie um arquivo de áudio do celular.
            </p>
          </div>

          {/* Recorder Controls */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
                  >
                    <Mic className="h-4 w-4" strokeWidth={2} />
                    Gravar Áudio Agora
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                  >
                    <Square className="h-4 w-4 fill-current" />
                    Parar Gravação ({formatAudioDuration(recordedSeconds)})
                  </button>
                )}

                <span className="text-xs text-slate-500">ou</span>

                <input
                  ref={audioInputRef}
                  id="pastor-audio-file"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleSelectAudioFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
                <label
                  htmlFor="pastor-audio-file"
                  className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
                >
                  <FileAudio className="h-4 w-4 text-blue-700" strokeWidth={1.75} />
                  Enviar Arquivo
                </label>
              </div>
            </div>

            {isRecording && (
              <p className="text-xs font-semibold text-red-700 font-mono tabular-nums">
                Gravando microfone... {formatAudioDuration(recordedSeconds)}
              </p>
            )}

            {audioPreviewUrl && (
              <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                  <span className="font-semibold truncate">
                    {audioFile?.name ?? 'Áudio gravado'}
                  </span>
                  <button
                    type="button"
                    onClick={clearAudioSelection}
                    aria-label="Descartar áudio"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <audio controls src={audioPreviewUrl} className="w-full h-10" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pastor-audio-title" className="block text-xs font-semibold text-slate-700">
              Título do Áudio
            </label>
            <input
              id="pastor-audio-title"
              type="text"
              maxLength={120}
              value={audioTitle}
              onChange={(e) => setAudioTitle(e.target.value)}
              placeholder="Ex: Oração da Manhã — Palavra de Paz"
              className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pastor-audio-desc" className="block text-xs font-semibold text-slate-700">
              Descrição breve (opcional)
            </label>
            <textarea
              id="pastor-audio-desc"
              rows={2}
              maxLength={400}
              value={audioDesc}
              onChange={(e) => setAudioDesc(e.target.value)}
              placeholder="Ex: Ouça antes do culto de quarta-feira..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
            />
          </div>

          {uploadingAudio && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-800">
                <span>Enviando áudio...</span>
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

          {audioError && (
            <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 rounded-xl px-3.5 py-2.5">
              {audioError}
            </p>
          )}
          {audioSuccess && (
            <p role="status" className="text-xs font-semibold text-blue-800 bg-blue-50 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              {audioSuccess}
            </p>
          )}

          <button
            type="submit"
            disabled={uploadingAudio || isRecording}
            className="w-full sm:w-auto min-w-[220px] min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
          >
            <UploadCloud className="h-4 w-4" strokeWidth={2} />
            {uploadingAudio ? 'Publicando Áudio...' : 'Publicar Áudio para a Igreja'}
          </button>
        </form>
      </div>

      {/* Published Audios Manager */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-7 space-y-4">
        <h3 className="text-lg font-bold text-[#0F2D5C]">
          Áudios Prontos para a Igreja ({publishedAudios.length})
        </h3>

        {publishedAudios.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">
            Nenhum áudio publicado ainda. Grave ou envie uma mensagem acima.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {publishedAudios.map((audio) => (
              <div
                key={audio.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div>
                    <p className="text-xs text-slate-500">
                      {audio.authorName} · {formatShortDatePt(audio.createdAt)}
                      {audio.durationSeconds
                        ? ` · ${formatAudioDuration(audio.durationSeconds)}`
                        : ''}
                    </p>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {audio.title}
                    </h4>
                  </div>
                  <audio controls preload="metadata" src={audio.audioUrl} className="w-full max-w-md h-10" />
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteAudio(audio.id)}
                  aria-label={`Excluir áudio ${audio.title}`}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100 self-start sm:self-center shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
