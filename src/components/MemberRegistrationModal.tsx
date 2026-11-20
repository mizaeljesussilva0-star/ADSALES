import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, UserPlus, X } from 'lucide-react';
import type { MemberProfile } from '../types/church';
import {
  getMemberInitials,
  validateBirthDate,
  validateMemberInput,
} from '../utils/churchLogic';

interface MemberRegistrationModalProps {
  open: boolean;
  churchName: string;
  onMemberSaved: (member: MemberProfile) => void;
  onClose: () => void;
}

export function MemberRegistrationModal({
  open,
  churchName,
  onMemberSaved,
  onClose,
}: MemberRegistrationModalProps) {
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open) return null;

  const handleAvatarChange = (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setErrorMsg('');
    if (!file) {
      setAvatarFile(null);
      setPreviewUrl('');
      return;
    }
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const validation = validateMemberInput({
      username,
      hasAvatar: Boolean(avatarFile),
      fileSizeBytes: avatarFile?.size,
      mimeType: avatarFile?.type,
    });

    if (!validation.valid) {
      setErrorMsg(validation.error ?? 'Verifique seus dados antes de continuar.');
      return;
    }

    const birthValidation = validateBirthDate(birthDate);
    if (!birthValidation.valid) {
      setErrorMsg(birthValidation.error ?? 'Data de nascimento inválida.');
      return;
    }

    const formData = new FormData();
    formData.append('username', username.trim());
    if (birthDate.trim()) {
      formData.append('birthDate', birthDate.trim());
    }
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível concluir seu cadastro.');
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
      setAvatarFile(null);
      setUsername('');
      setBirthDate('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onMemberSaved(data.member as MemberProfile);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Sem conexão no momento. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const initials = getMemberInitials(username || 'AD');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-popup-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/assets/ad-sales-logo.png"
              alt={`Logo ${churchName}`}
              className="h-11 w-11 rounded-full object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2
                id="member-popup-title"
                className="text-lg sm:text-xl font-bold text-[#0F2D5C] leading-snug"
              >
                Bem-vindo à {churchName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Cadastre seu nome de usuário e foto de perfil
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar cadastro"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Picker */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Pré-visualização da foto de perfil"
                className="h-20 w-20 rounded-full object-cover border-2 border-white shadow-sm bg-slate-200"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0F2D5C] text-xl font-bold text-white border-2 border-white shadow-sm">
                {initials}
              </div>
            )}

            <input
              ref={fileInputRef}
              id="popup-member-avatar-input"
              type="file"
              accept="image/*"
              onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
              className="sr-only"
            />

            <label
              htmlFor="popup-member-avatar-input"
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-200 cursor-pointer transition-colors"
            >
              <Camera className="h-4 w-4 text-blue-700" strokeWidth={1.75} />
              {previewUrl ? 'Trocar foto de perfil' : 'Escolher foto de perfil'}
            </label>
          </div>

          {/* Username Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="popup-member-username-input"
              className="block text-xs font-semibold text-slate-700"
            >
              Nome de usuário
            </label>
            <input
              id="popup-member-username-input"
              type="text"
              maxLength={40}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu nome ou @usuario"
              className="w-full min-h-[48px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Birth Date Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="popup-member-birthdate-input"
              className="block text-xs font-semibold text-slate-700"
            >
              Data de nascimento (para aniversário)
            </label>
            <input
              id="popup-member-birthdate-input"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none tabular-nums"
            />
          </div>

          {errorMsg && (
            <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 rounded-xl px-3.5 py-2.5">
              {errorMsg}
            </p>
          )}

          <div className="flex flex-col sm:flex-row-reverse gap-2.5 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <UserPlus className="h-4 w-4" strokeWidth={2} />
              {submitting ? 'Cadastrando...' : 'Concluir Cadastro'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Agora não
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
