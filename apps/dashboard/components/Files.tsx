import React, { useContext, useState, useEffect, useCallback } from 'react';
import Header from './Header';
import { FileItem } from '../types';
import { LanguageContext } from '../App';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';

const Files: React.FC = () => {
   const { t } = useContext(LanguageContext);
   const { profile } = useDashboardAuth();
   const [files, setFiles] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [search, setSearch] = useState('');

   const tenantId = profile?.id; // Usar ID do perfil como tenantId (comum no dashboard)

   const fetchFiles = useCallback(async () => {
      if (!tenantId) return;
      setLoading(true);
      try {
         const response = await fetch(`/api/files?tenantId=${tenantId}`);
         if (response.ok) {
            const data = await response.json();
            // Mapear para o formato do componente
            const mappedFiles = (data.files || []).map((f: any) => ({
               id: f.id,
               name: f.file_name,
               type: f.file_type.startsWith('image/') ? 'image' :
                  f.file_type.includes('pdf') ? 'pdf' :
                     f.file_type.includes('sheet') || f.file_type.includes('excel') ? 'sheet' :
                        f.file_type.includes('zip') ? 'zip' : 'doc',
               size: formatFileSize(f.file_size),
               date: formatDate(f.created_at),
               url: f.storage_url
            }));
            setFiles(mappedFiles);
         }
      } catch (error) {
         console.error('Error fetching files:', error);
      } finally {
         setLoading(false);
      }
   }, [tenantId]);

   useEffect(() => {
      fetchFiles();
   }, [fetchFiles]);

   function formatFileSize(bytes: number): string {
      if (!bytes) return '0 B';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
   }

   function formatDate(dateString: string): string {
      if (!dateString) return '';
      return new Date(dateString).toLocaleDateString('en-US', {
         month: 'short',
         day: 'numeric',
         year: 'numeric'
      });
   }

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
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
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
               {loading ? (
                  <div className="col-span-full py-12 text-center text-gray-400">
                     <div className="animate-spin inline-block w-8 h-8 border-4 border-brand-primary rounded-full border-t-transparent mb-4"></div>
                     <p>{t('loadingFiles') || 'Carregando arquivos...'}</p>
                  </div>
               ) : files.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-gray-400">
                     <span className="material-symbols-outlined text-6xl mb-4 opacity-20">folder_open</span>
                     <p>Nenhum arquivo encontrado</p>
                  </div>
               ) : files.filter(f => f.name.toLowerCase().includes(search.toLowerCase())).map((file) => (
                  <div key={file.id} onClick={() => file.url && window.open(file.url, '_blank')} className="glass-panel bg-white dark:bg-white/5 p-5 rounded-xl flex flex-col justify-between h-40 cursor-pointer hover:border-brand-primary/50 transition-colors group shadow-sm relative">
                     <div>
                        <div className="flex justify-between items-start mb-3">
                           <span className={`material-symbols-outlined text-4xl ${file.type === 'folder' ? 'text-blue-400' :
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
