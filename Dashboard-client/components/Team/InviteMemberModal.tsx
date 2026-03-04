import React, { useState } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { TeamRole } from '../../types';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const AVAILABLE_ROLES: TeamRole[] = [
    'Admin',
    'Gestor',
    'Contador',
    'Marketing',
    'Recepcionista',
    'Atendente',
    'Developer'
] as any[]; // Marketing isn't strictly in TeamRole union right now but used in original mock

export const InviteMemberModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const { inviteMember } = useTeamStore();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<TeamRole>('Atendente');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error('Preencha o e-mail do contato');
            return;
        }
        inviteMember(email, role);
        toast.success('Convite enviado com sucesso!');
        setEmail('');
        setRole('Atendente');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
            <div className="bg-white dark:bg-[#0A0F1A] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up border border-gray-100 dark:border-white/10">

                {/* Header */}
                <div className="relative h-20 bg-gradient-to-r from-brand-primary/80 to-brand-primary flex items-center px-6">
                    <div className="flex items-center gap-3 text-white">
                        <span className="material-symbols-outlined text-3xl">person_add</span>
                        <div>
                            <h2 className="text-xl font-bold">Convidar Membro</h2>
                            <p className="text-white/80 text-xs">Adicione novas pessoas ao seu Workspace</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">E-mail do Convidado</label>
                        <input
                            required
                            type="email"
                            placeholder="exemplo@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Função (Role)</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as TeamRole)}
                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                            {AVAILABLE_ROLES.map(r => (
                                <option key={r} value={r} className="bg-white dark:bg-[#0A0F1A] text-gray-800 dark:text-white">{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Footer inside form to control Submit */}
                    <div className="pt-6 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-brand-primary text-white hover:bg-brand-primary/90 transition-all shadow-lg flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">send</span>
                            Enviar Convite
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
