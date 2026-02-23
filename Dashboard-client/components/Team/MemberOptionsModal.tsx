import React, { useState, useEffect } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { TeamRole } from '../../types';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    memberId: string | null;
}

const AVAILABLE_ROLES: TeamRole[] = [
    'Admin',
    'Gestor',
    'Contador',
    'Marketing',
    'Recepcionista',
    'Atendente',
    'Developer'
] as any[];

export const MemberOptionsModal: React.FC<Props> = ({ isOpen, onClose, memberId }) => {
    const { members, updateMemberRole, removeMember } = useTeamStore();
    const member = members.find(m => m.id === memberId);
    const [selectedRole, setSelectedRole] = useState<TeamRole>('Admin');

    useEffect(() => {
        if (member) {
            setSelectedRole(member.role);
        }
    }, [member, isOpen]);

    if (!isOpen || !member) return null;

    const handleUpdate = () => {
        if (selectedRole !== member.role) {
            updateMemberRole(member.id, selectedRole);
            toast.success(`Função atualizada para ${selectedRole}!`);
        } else {
            toast.error('Nenhuma alteração detectada nas funções.');
        }
        onClose();
    };

    const handleRemove = () => {
        if (confirm(`Tem certeza que deseja remover ${member.name} da equipe?`)) {
            removeMember(member.id);
            toast.success('Membro removido da equipe.');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
            <div className="bg-white dark:bg-[#0A0F1A] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up border border-gray-100 dark:border-white/10">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
                    <div className="flex items-center gap-3">
                        <img src={member.img} alt={member.name} className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10" />
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-white text-sm">{member.name}</h3>
                            <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Predefinição de Papel</label>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as TeamRole)}
                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                            {AVAILABLE_ROLES.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-white/10 flex flex-col gap-3">
                    <button
                        onClick={handleUpdate}
                        className="w-full py-2.5 rounded-xl text-sm font-bold bg-brand-primary text-white hover:bg-brand-primary/90 flex justify-center items-center gap-2 transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-sm">save</span> Salvar Alterações
                    </button>
                    <button
                        onClick={handleRemove}
                        className="w-full py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-500/20 flex justify-center items-center gap-2 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">delete_forever</span> Revogar Acesso
                    </button>
                </div>
            </div>
        </div>
    );
};
