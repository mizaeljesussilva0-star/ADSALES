import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, Check, LogOut, UserCheck, UserPlus } from 'lucide-react';
import type { MemberProfile } from '../types/church';
import {
  formatShortDatePt,
  getMemberInitials,
  validateBirthDate,
  validateMemberInput,
} from '../utils/churchLogic';

interface MemberProfileViewProps {
  currentMember: MemberProfile | null;
  onMemberSaved: (member: MemberProfile) => void;
  onMemberLogout: () => void;
}

export function MemberProfileView({
  currentMember,
  onMemberSaved,
  onMemberLogout,
}: MemberProfileViewProps) {
  const [username, setUsername] = useState(currentMember?.username ?? '');
  const [birthDate, setBirthDate] = useState(currentMember?.birthDate ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setUsername(currentMember?.username ?? '');
    setBirthDate(currentMember?.birthDate ?? '');
    setAvatarFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMember?.id, currentMember?.birthDate, currentMember?.username]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleAvatarChange = (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setErrorMsg('');
    setSuccessMsg('');
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
    setSuccessMsg('');

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
    formData.append('birthDate', birthDate.trim());
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    setSubmitting(true);
    try {
      const endpoint = currentMember
        ? `/api/members/${currentMember.id}`
        : '/api/members';
      const method = currentMember ? 'PATCH' : 'POST';

      let res = await fetch(endpoint, { method, body: formData });
      // If member was removed from server store, register cleanly as new
      if (currentMember && res.status === 404) {
        res = await fetch('/api/members', { method: 'POST', body: formData });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível salvar seu cadastro.');
      }

      onMemberSaved(data.member as MemberProfile);
      setAvatarFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccessMsg(
        currentMember
          ? 'Seu perfil foi atualizado com sucesso!'
          : 'Cadastro realizado com sucesso!'
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Sem conexão para concluir o cadastro. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const displayedAvatar = previewUrl || currentMember?.avatarUrl || '';
  const displayedInitials = getMemberInitials(
    username || currentMember?.username || 'AD'
  );

  return (
    <section
      aria-label={currentMember ? 'Meu Perfil' : 'Cadastro de Membro'}
      className="mx-auto max-w-xl py-2 sm:py-6"
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#0F2D5C]">
              {currentMember ? (
                <UserCheck className="h-5 w-5 text-blue-700" strokeWidth={1.75} />
              ) : (
                <UserPlus className="h-5 w-5 text-blue-700" strokeWidth={1.75} />
              )}
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                {currentMember ? 'Meu Perfil' : 'Cadastro de Membro'}
              </h2>
            </div>
            <p className="text-sm text-slate-600">
              {currentMember
                ? `Membro desde ${formatShortDatePt(currentMember.createdAt) || 'hoje'}. Você pode atualizar seu nome de usuário ou foto de perfil abaixo.`
                : 'Cadastre-se com seu nome de usuário e foto de perfil para participar da igreja.'}
            </p>
          </div>

          {currentMember && (
            <button
              type="button"
              onClick={onMemberLogout}
              aria-label="Sair deste perfil"
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
              Sair
            </button>
          )}
        </div>

        {/* Circular Avatar Picker */}
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="relative">
            {displayedAvatar ? (
              <img
                src={displayedAvatar}
                alt={username || currentMember?.username || 'Foto de perfil'}
                className="h-24 w-24 rounded-full object-cover border-2 border-white shadow-sm bg-slate-200"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#0F2D5C] text-2xl font-bold text-white border-2 border-white shadow-sm">
                {displayedInitials}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            id="member-avatar-input"
            type="file"
            accept="image/*"
            onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
            className="sr-only"
          />

          <label
            htmlFor="member-avatar-input"
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-200 cursor-pointer transition-colors"
          >
            <Camera className="h-4 w-4 text-blue-700" strokeWidth={1.75} />
            {displayedAvatar ? 'Trocar foto de perfil' : 'Escolher foto de perfil'}
          </label>
          <p className="text-xs text-slate-500 text-center">
            Foto do celular ou computador (JPG, PNG ou WebP)
          </p>
        </div>

        {/* Username Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="member-username-input"
            className="block text-xs font-semibold text-slate-700"
          >
            Nome de usuário
          </label>
          <input
            id="member-username-input"
            type="text"
            maxLength={40}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Digite seu nome ou @usuario"
            className="w-full min-h-[48px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Birth Date Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="member-birthdate-input"
            className="block text-xs font-semibold text-slate-700"
          >
            Data de nascimento (para aniversário na área de membros)
          </label>
          <input
            id="member-birthdate-input"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full min-h-[48px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none tabular-nums"
          />
        </div>

        {currentMember?.roleTitle && (
          <p className="text-xs font-semibold text-blue-800 bg-blue-50 rounded-xl px-4 py-2.5">
            Função na igreja definida pelo Pastor: {currentMember.roleTitle}
          </p>
        )}

        {errorMsg && (
          <p role="alert" className="text-xs sm:text-sm font-medium text-red-700 bg-red-50 rounded-xl px-4 py-2.5">
            {errorMsg}
          </p>
        )}

        {successMsg && (
          <p role="status" className="text-xs sm:text-sm font-semibold text-blue-800 bg-blue-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            {successMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {submitting
            ? 'Salvando...'
            : currentMember
              ? 'Salvar Alterações do Perfil'
              : 'Concluir Cadastro'}
        </button>
      </form>
    </section>
  );
}
