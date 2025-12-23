
import React, { useContext } from 'react';
import Header from './Header';
import { FileItem } from '../types';
import { LanguageContext } from '../App';

const files: FileItem[] = [
  { id: '1', name: 'Contracts', type: 'folder', itemCount: 12, date: 'Oct 28, 2023' },
  { id: '2', name: 'Annual_Report_2023.pdf', type: 'pdf', size: '2.5 MB', date: 'Oct 28, 2023' },
  { id: '3', name: 'Marketing_Pres.pptx', type: 'image', size: '5.1 MB', date: 'Oct 22, 2023' }, 
  { id: '4', name: 'Client_Data.xlsx', type: 'sheet', size: '780 KB', date: 'Oct 25, 2023' },
  { id: '5', name: 'Projects', type: 'folder', itemCount: 5, date: 'Oct 20, 2023' },
  { id: '6', name: 'Brand_Assets.zip', type: 'zip', size: '15.8 MB', date: 'Oct 20, 2023' },
  { id: '7', name: 'Logo_Final.png', type: 'image', size: '120 KB', date: 'Oct 18, 2023' },
  { id: '8', name: 'Service_Agreement.docx', type: 'doc', size: '350 KB', date: 'Oct 15, 2023' },
];

const Files: React.FC = () => {
  const { t } = useContext(LanguageContext);

  const handleAction = (action: string) => {
    alert(`${t('featureComingSoon')} (${action})`);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={t('filesTitle')} />
      <div className="flex-1 p-8 pt-2 overflow-y-auto">
        
        <div className="flex justify-between items-center mb-8">
           <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input 
                 type="text" 
                 placeholder={t('searchFiles')}
                 className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-brand-primary focus:outline-none text-sm"
              />
           </div>
           <div className="flex gap-3">
              <button onClick={() => handleAction(t('newFolder'))} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 transition-colors font-medium text-sm shadow-sm">
                 <span className="material-symbols-outlined text-xl">create_new_folder</span>
                 {t('newFolder')}
              </button>
              <button onClick={() => handleAction(t('upload'))} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white hover:opacity-90 transition-opacity font-medium text-sm shadow-lg shadow-brand-primary/30">
                 <span className="material-symbols-outlined text-xl">upload_file</span>
                 {t('upload')}
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
           {files.map((file) => (
             <div key={file.id} onClick={() => handleAction(`Open ${file.name}`)} className="glass-panel bg-white dark:bg-white/5 p-5 rounded-xl flex flex-col justify-between h-40 cursor-pointer hover:border-brand-primary/50 transition-colors group shadow-sm relative">
                <div>
                   <div className="flex justify-between items-start mb-3">
                      <span className={`material-symbols-outlined text-4xl ${
                         file.type === 'folder' ? 'text-blue-400' :
                         file.type === 'pdf' ? 'text-red-400' :
                         file.type === 'image' ? 'text-purple-400' :
                         file.type === 'sheet' ? 'text-green-400' :
                         file.type === 'zip' ? 'text-yellow-400' : 'text-gray-400'
                      }`}>
                         {file.type === 'folder' ? 'folder' : 
                          file.type === 'image' ? 'image' : 
                          file.type === 'video' ? 'movie' : 
                          'description'}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAction(`More options for ${file.name}`); }}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                         <span className="material-symbols-outlined text-xl">more_vert</span>
                      </button>
                   </div>
                   <h4 className="font-semibold text-sm truncate pr-2">{file.name}</h4>
                </div>
                <div className="flex justify-between items-end">
                   <p className="text-xs text-gray-500">{file.type === 'folder' ? `${file.itemCount} files` : file.size}</p>
                   <p className="text-[10px] text-gray-400">{file.date}</p>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default Files;
