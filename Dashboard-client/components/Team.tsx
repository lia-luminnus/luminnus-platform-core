
import React, { useContext } from 'react';
import Header from './Header';
import { LanguageContext } from '../App';

const Team: React.FC = () => {
  const { t } = useContext(LanguageContext);

  const members = [
    { name: 'Kathryn Murphy', role: t('admin'), email: 'kathryn@luminnus.com', img: 'https://picsum.photos/seed/kathryn/200', border: 'border-brand-primary' },
    { name: 'Jacob Jones', role: t('developer'), email: 'jacob.j@luminnus.com', img: 'https://picsum.photos/seed/jacob/200', border: 'border-blue-400' },
    { name: 'Jane Cooper', role: t('projectManager'), email: 'jane.cooper@client.co', img: 'https://picsum.photos/seed/jane/200', border: 'border-cyan-400' },
    { name: 'Cody Fisher', role: t('marketing'), email: 'cody.f@luminnus.com', img: 'https://picsum.photos/seed/cody/200', border: 'border-pink-400' },
  ];

  const handleAction = (action: string) => {
    alert(`${t('featureComingSoon')} (${action})`);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={t('teamTitle')} />
      <div className="flex-1 p-8 pt-2 overflow-y-auto">
         <div className="flex justify-end mb-6 gap-4">
            <button onClick={() => handleAction(t('manageRoles'))} className="px-5 py-2.5 rounded-lg border border-brand-primary text-brand-primary font-semibold text-sm hover:bg-brand-primary/10 transition-colors">{t('manageRoles')}</button>
            <button onClick={() => handleAction(t('inviteMember'))} className="px-5 py-2.5 rounded-lg bg-brand-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
               <span className="material-symbols-outlined text-lg">person_add</span> {t('inviteMember')}
            </button>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {members.map((m, i) => (
               <div key={i} className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative mb-4">
                     <img src={m.img} alt={m.name} className={`w-24 h-24 rounded-full border-4 ${m.border} object-cover`} />
                     <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-dark-bg rounded-full"></span>
                  </div>
                  <h3 className="text-lg font-semibold">{m.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{m.email}</p>
                  <span className="text-xs font-semibold py-1 px-3 rounded-full bg-gray-100 dark:bg-white/10 mb-6">{m.role}</span>
                  
                  <div className="flex gap-2 w-full">
                     <button onClick={() => handleAction(`Message ${m.name}`)} className="flex-1 py-2 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-sm font-medium flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-sm">mail</span> Message
                     </button>
                     <button onClick={() => handleAction(`Options for ${m.name}`)} className="p-2 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-sm">more_vert</span>
                     </button>
                  </div>
               </div>
            ))}

            {/* Pending Invitation */}
            <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl flex flex-col items-center text-center border-2 border-dashed border-gray-300 dark:border-white/20">
               <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl text-gray-400">schedule</span>
               </div>
               <h3 className="text-lg font-semibold">{t('pendingInvitation')}</h3>
               <p className="text-sm text-gray-500 mb-4">new.member@example.com</p>
               <span className="text-xs font-semibold py-1 px-3 rounded-full bg-yellow-500/10 text-yellow-500 mb-6">{t('awaiting')}</span>
               
               <div className="flex gap-2 w-full">
                   <button onClick={() => handleAction(t('resend'))} className="flex-1 py-2 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-sm font-medium">{t('resend')}</button>
                   <button onClick={() => handleAction(t('delete'))} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500"><span className="material-symbols-outlined text-sm">delete</span></button>
               </div>
            </div>

            {/* Add New */}
            <button onClick={() => handleAction(t('addNewMember'))} className="glass-panel bg-gray-50 dark:bg-white/5 p-6 rounded-xl flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-brand-primary/50 group transition-colors">
               <div className="w-24 h-24 rounded-full bg-white dark:bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-4xl text-gray-400 group-hover:text-brand-primary">add</span>
               </div>
               <h3 className="text-lg font-semibold group-hover:text-brand-primary transition-colors">{t('addNewMember')}</h3>
               <p className="text-sm text-gray-500">{t('expandTeam')}</p>
            </button>
         </div>
      </div>
    </div>
  );
};

export default Team;
