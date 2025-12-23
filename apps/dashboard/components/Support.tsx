
import React, { useContext } from 'react';
import Header from './Header';
import { LanguageContext } from '../App';

const Support: React.FC = () => {
  const { t } = useContext(LanguageContext);

  const handleAction = (action: string) => {
      alert(`${t('featureComingSoon')} (${action})`);
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          handleAction(`Search: ${e.currentTarget.value}`);
      }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={t('supportTitle')} />
      <div className="flex-1 p-8 pt-2 overflow-y-auto max-w-5xl mx-auto w-full">
         <div className="mb-8 text-center md:text-left">
            <h2 className="text-3xl font-bold mb-2">{t('howCanWeHelp')}</h2>
            <p className="text-gray-500">Search our knowledge base or open a new ticket.</p>
         </div>

         {/* Search */}
         <div className="relative mb-12">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
            <input 
               type="text" 
               placeholder={t('searchKeywords')}
               onKeyDown={handleSearch}
               className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-brand-primary focus:outline-none shadow-sm"
            />
         </div>

         {/* Quick Access */}
         <h3 className="text-xl font-bold mb-4">{t('quickAccess')}</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
               { icon: 'rocket_launch', title: t('gettingStarted'), desc: 'Guides to start using the platform.' },
               { icon: 'request_quote', title: t('billing'), desc: 'Help with payments and subscriptions.' },
               { icon: 'build', title: t('techSupport'), desc: 'Solutions for errors and common issues.' },
            ].map((card, i) => (
               <div key={i} onClick={() => handleAction(card.title)} className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl hover:border-brand-primary transition-colors cursor-pointer group shadow-sm">
                  <span className="material-symbols-outlined text-brand-primary text-3xl mb-3">{card.icon}</span>
                  <h4 className="text-lg font-bold mb-1 group-hover:text-brand-primary transition-colors">{card.title}</h4>
                  <p className="text-sm text-gray-500">{card.desc}</p>
               </div>
            ))}
         </div>

         {/* FAQ */}
         <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">{t('faq')}</h3>
            {[
               { q: 'How do I reset my password?', a: 'You can reset your password by clicking "Forgot Password" on the login page.' },
               { q: 'What payment methods are accepted?', a: 'We accept all major credit cards (Visa, MasterCard, Amex), PayPal, and Bank Transfer.' },
               { q: 'How to contact tech support?', a: 'You can open a ticket via the "Open Ticket" tab or email support@luminnus.ai directly.' },
            ].map((faq, i) => (
               <details key={i} className="group glass-panel bg-white dark:bg-white/5 rounded-xl p-4 cursor-pointer">
                  <summary className="flex items-center justify-between font-medium list-none">
                     {faq.q}
                     <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180">expand_more</span>
                  </summary>
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 pl-2 border-l-2 border-brand-primary/50">{faq.a}</p>
               </details>
            ))}
         </div>
      </div>
    </div>
  );
};

export default Support;
