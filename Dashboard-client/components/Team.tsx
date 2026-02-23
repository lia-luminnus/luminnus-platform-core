
import React, { useContext, useState } from 'react';
import Header from './Header';
import { LanguageContext } from '../contexts/LanguageContext';
import { useTeamStore } from '../store/useTeamStore';
import { InviteMemberModal } from './Team/InviteMemberModal';
import { ManageRolesModal } from './Team/ManageRolesModal';
import { MemberOptionsModal } from './Team/MemberOptionsModal';
import toast from 'react-hot-toast';

const Team: React.FC = () => {
   const { t } = useContext(LanguageContext);
   const { members, pendingInvitations, cancelInvitation, resendInvitation } = useTeamStore();

   const [isInviteOpen, setIsInviteOpen] = useState(false);
   const [isManageRolesOpen, setIsManageRolesOpen] = useState(false);
   const [isMemberOptionsOpen, setIsMemberOptionsOpen] = useState(false);
   const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

   const handleManageRoles = () => setIsManageRolesOpen(true);
   const handleInvite = () => setIsInviteOpen(true);

   const openMemberOptions = (id: string) => {
      setSelectedMemberId(id);
      setIsMemberOptionsOpen(true);
   };

   const handleResend = (id: string) => {
      resendInvitation(id);
      toast.success('Convite reenviado com sucesso!');
   };

   const handleCancelInvite = (id: string) => {
      cancelInvitation(id);
      toast.success('Convite cancelado.');
   };

   return (
      <div className="flex flex-col h-full">
         <Header title={t('teamTitle')} />
         <div className="flex-1 p-8 pt-2 overflow-y-auto">
            <div className="flex justify-end mb-6 gap-4">
               <button onClick={handleManageRoles} className="px-5 py-2.5 rounded-lg border border-brand-primary text-brand-primary font-semibold text-sm hover:bg-brand-primary/10 transition-colors flex items-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-lg">admin_panel_settings</span> {t('manageRoles')}
               </button>
               <button onClick={handleInvite} className="px-5 py-2.5 rounded-lg bg-brand-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-md">
                  <span className="material-symbols-outlined text-lg">person_add</span> {t('inviteMember')}
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {members.map((m) => (
                  <div key={m.id} className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                     <div className="relative mb-4">
                        <img src={m.img} alt={m.name} className={`w-24 h-24 rounded-full border-4 ${m.border || 'border-brand-primary/20'} object-cover bg-gray-100`} />
                        <span className={`absolute bottom-1 right-1 w-4 h-4 border-2 border-white dark:border-dark-bg rounded-full ${m.status === 'Online' ? 'bg-green-500' :
                              m.status === 'Ausente' ? 'bg-yellow-500' : 'bg-gray-400'
                           }`} title={m.status}></span>
                     </div>
                     <h3 className="text-lg font-semibold dark:text-white">{m.name}</h3>
                     <p className="text-sm text-gray-500 mb-4">{m.email}</p>
                     <span className="text-xs font-semibold py-1 px-3 rounded-full bg-gray-100 dark:bg-white/10 mb-6 dark:text-gray-300">
                        {m.role}
                     </span>

                     <div className="flex gap-2 w-full mt-auto">
                        <button onClick={() => toast.success(`Chat aberto com ${m.name}`)} className="flex-1 py-2 rounded-lg bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-sm font-medium flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
                           <span className="material-symbols-outlined text-sm">mail</span> Chat
                        </button>
                        <button onClick={() => openMemberOptions(m.id)} className="p-2 rounded-lg bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500">
                           <span className="material-symbols-outlined text-sm">more_vert</span>
                        </button>
                     </div>
                  </div>
               ))}

               {/* Pending Invitations */}
               {pendingInvitations.map((pending) => (
                  <div key={pending.id} className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl flex flex-col items-center text-center border-2 border-dashed border-gray-300 dark:border-white/20">
                     <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 text-gray-400">
                        <span className="material-symbols-outlined text-4xl">schedule</span>
                     </div>
                     <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('pendingInvitation')}</h3>
                     <p className="text-sm text-gray-500 mb-4 line-clamp-1">{pending.email}</p>
                     <span className="text-xs font-semibold py-1 px-3 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 mb-6 border border-yellow-500/20">
                        {pending.role} - Aguardando Aceite
                     </span>

                     <div className="flex gap-2 w-full mt-auto">
                        <button onClick={() => handleResend(pending.id)} className="flex-1 py-2 rounded-xl bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
                           {t('resend')}
                        </button>
                        <button onClick={() => handleCancelInvite(pending.id)} className="p-2 rounded-xl border border-transparent hover:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors" title="Cancelar Convite">
                           <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                     </div>
                  </div>
               ))}

               {/* Add New */}
               <button onClick={handleInvite} className="glass-panel min-h-[300px] bg-gray-50/50 dark:bg-white/5 p-6 rounded-xl flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-brand-primary/50 group transition-all hover:bg-brand-primary/5">
                  <div className="w-20 h-20 rounded-full bg-white dark:bg-black/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm group-hover:shadow-md">
                     <span className="material-symbols-outlined text-4xl text-gray-400 group-hover:text-brand-primary transition-colors">add</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 group-hover:text-brand-primary transition-colors">{t('addNewMember')}</h3>
                  <p className="text-sm text-gray-500 mt-2">{t('expandTeam')}</p>
               </button>
            </div>
         </div>

         {/* Modals */}
         <InviteMemberModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
         <ManageRolesModal isOpen={isManageRolesOpen} onClose={() => setIsManageRolesOpen(false)} />
         <MemberOptionsModal isOpen={isMemberOptionsOpen} onClose={() => setIsMemberOptionsOpen(false)} memberId={selectedMemberId} />
      </div>
   );
};

export default Team;
