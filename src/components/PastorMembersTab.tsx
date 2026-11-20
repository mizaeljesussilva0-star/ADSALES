import { useEffect, useState } from 'react';
import { Cake, Check, Trash2, Users } from 'lucide-react';
import type { ChurchSnapshot, MemberProfile } from '../types/church';
import {
  formatBirthdayPt,
  formatShortDatePt,
  getMemberInitials,
} from '../utils/churchLogic';

interface PastorMembersTabProps {
  snapshot: ChurchSnapshot;
  pastorPin: string;
  onSnapshotUpdated: (next: ChurchSnapshot) => void;
}

const ROLE_SUGGESTIONS = [
  'Cooperador',
  'Irmã do Culto de Oração',
  'Diácono',
  'Presbítero',
  'Líder de Louvor',
  'Líder de Jovens',
  'Membro',
];

function PastorMemberRow({
  member,
  pastorPin,
  onSnapshotUpdated,
}: {
  member: MemberProfile;
  pastorPin: string;
  onSnapshotUpdated: (next: ChurchSnapshot) => void;
}) {
  const [roleTitle, setRoleTitle] = useState(member.roleTitle ?? '');
  const [showInMembers, setShowInMembers] = useState(Boolean(member.showInMembers));
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setRoleTitle(member.roleTitle ?? '');
    setShowInMembers(Boolean(member.showInMembers));
  }, [member.id, member.roleTitle, member.showInMembers]);

  const handleSave = async () => {
    setSaving(true);
    setSavedNotice(false);
    try {
      const res = await fetch(`/api/members/${member.id}/pastor`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-pastor-pin': encodeURIComponent(pastorPin),
        },
        body: JSON.stringify({
          roleTitle: roleTitle.trim(),
          showInMembers,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onSnapshotUpdated(data.snapshot);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/members/${member.id}`, {
      method: 'DELETE',
      headers: { 'x-pastor-pin': encodeURIComponent(pastorPin) },
    });
    if (res.ok) {
      const data = await res.json();
      onSnapshotUpdated(data.snapshot);
    }
  };

  const birthdayText = formatBirthdayPt(member.birthDate);

  return (
    <div className="py-5 first:pt-0 last:pb-0 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt={member.username}
              className="h-12 w-12 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F2D5C] text-sm font-bold text-white shrink-0">
              {getMemberInitials(member.username)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {member.username}
            </p>
            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>Cadastrado {formatShortDatePt(member.createdAt) || 'hoje'}</span>
              {birthdayText && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Cake className="h-3 w-3 text-blue-600" />
                    Aniversário: {birthdayText}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          aria-label={`Remover membro ${member.username}`}
          className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 self-start sm:self-center shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remover
        </button>
      </div>

      {/* Pastor Role & Public Members Directory Controls */}
      <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 flex flex-col lg:flex-row lg:items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <label
            htmlFor={`member-role-${member.id}`}
            className="block text-xs font-semibold text-slate-700"
          >
            Função / Cargo na área de Membros ({member.username})
          </label>
          <input
            id={`member-role-${member.id}`}
            type="text"
            list="church-role-suggestions"
            maxLength={60}
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            placeholder="Ex: Cooperador, Irmã do Culto de Oração..."
            className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none min-h-[42px] px-1">
          <input
            type="checkbox"
            checked={showInMembers}
            onChange={(e) => setShowInMembers(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
          />
          <span className="text-xs sm:text-sm font-semibold text-slate-800 whitespace-nowrap">
            Exibir na área de Membros
          </span>
        </label>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          aria-label={`Salvar definição de ${member.username}`}
          className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
        >
          {savedNotice ? (
            <>
              <Check className="h-4 w-4" />
              Salvo!
            </>
          ) : saving ? (
            'Salvando...'
          ) : (
            'Salvar'
          )}
        </button>
      </div>
    </div>
  );
}

export function PastorMembersTab({
  snapshot,
  pastorPin,
  onSnapshotUpdated,
}: PastorMembersTabProps) {
  const members = snapshot.members ?? [];

  return (
    <div className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-8 space-y-5">
      <datalist id="church-role-suggestions">
        {ROLE_SUGGESTIONS.map((role) => (
          <option key={role} value={role} />
        ))}
      </datalist>

      <div>
        <div className="flex items-center gap-2 text-[#0F2D5C]">
          <Users className="h-5 w-5 text-blue-700" strokeWidth={1.75} />
          <h3 className="text-lg font-bold">
            Membros Cadastrados ({members.length})
          </h3>
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Defina a função de cada pessoa (ex: Cooperador, Irmã do Culto de Oração) e escolha quem aparece na área de Membros do aplicativo.
        </p>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">
          Nenhum usuário cadastrado ainda.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {members.map((member) => (
            <PastorMemberRow
              key={member.id}
              member={member}
              pastorPin={pastorPin}
              onSnapshotUpdated={onSnapshotUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
