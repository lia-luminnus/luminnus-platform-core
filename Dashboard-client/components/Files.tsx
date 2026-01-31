import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import Header from './Header';
import { LanguageContext } from '../contexts/LanguageContext';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import { fileService, FileFolder, FileEntry, FileScope } from '../services/fileService';
import { socketService } from './lia/services/socketService';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
   Folder,
   FileText,
   Image as ImageIcon,
   MoreVertical,
   Download,
   Trash2,
   Edit3,
   ChevronRight,
   Search,
   Plus,
   Upload,
   ArrowLeft,
   Clock,
   Tag,
   Share2,
   Eye,
   FileArchive,
   Table as TableIcon,
   CheckSquare,
   Square,
   Check,
   X
} from 'lucide-react';

interface BreadcrumbItem {
   id: string | null;
   name: string;
}

const Files: React.FC = () => {
   const { t } = useContext(LanguageContext);
   const { user, isAdmin } = useDashboardAuth();

   // States
   const [folders, setFolders] = useState<FileFolder[]>([]);
   const [files, setFiles] = useState<FileEntry[]>([]);
   const [loading, setLoading] = useState(true);
   const [currentFolder, setCurrentFolder] = useState<string | null>(null);
   const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: t('root') }]);
   const [searchQuery, setSearchQuery] = useState('');
   const [activeScope, setActiveScope] = useState<FileScope>('personal');
   const [showNewFolderModal, setShowNewFolderModal] = useState(false);
   const [isUploading, setIsUploading] = useState(false);
   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
   const [isDeletingBatch, setIsDeletingBatch] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);

   // 🔒 SECURITY: Get tenant from user context
   const userTenantId = (user as any)?.user_metadata?.tenant_id || (user as any)?.tenant_id || null;
   const ADMIN_TENANT_ID = '00000000-0000-0000-0000-000000000001';
   const tenantId = userTenantId || (isAdmin ? ADMIN_TENANT_ID : null);

   // Selection Handlers
   const toggleSelect = (id: string) => {
      setSelectedIds(prev => {
         const next = new Set(prev);
         if (next.has(id)) next.delete(id);
         else next.add(id);
         return next;
      });
   };

   const toggleSelectAll = () => {
      if (selectedIds.size === files.length && files.length > 0) {
         setSelectedIds(new Set());
      } else {
         setSelectedIds(new Set(files.map(f => f.id)));
      }
   };

   const clearSelection = () => setSelectedIds(new Set());

   // Diagnostic Logs
   useEffect(() => {
      if (user) {
         console.log('[Files] User State:', {
            id: user.id,
            email: user.email,
            metadata: user.user_metadata,
            appMetadata: user.app_metadata,
            activeTenant: tenantId
         });
      }
   }, [user, tenantId]);

   // Fetch Data
   const loadContent = async () => {
      setLoading(true);
      console.log(`[Files] Loading content for tenant: ${tenantId}, folder: ${currentFolder}, scope: ${activeScope}`);
      const { folders: fld, files: fls } = await fileService.listItems(tenantId, currentFolder, activeScope);
      setFolders(fld);
      setFiles(fls);
      setLoading(false);
   };

   useEffect(() => {
      loadContent();
      clearSelection();
   }, [currentFolder, activeScope, tenantId]);

   // Socket.IO: Sincronização em tempo real
   useEffect(() => {
      const socket = socketService.getSocket();
      if (!socket) return;

      const handleFileUploaded = (fileRecord: FileEntry) => {
         console.log('[Files] Evento file-uploaded recebido:', fileRecord);
         // Recarregar apenas se o arquivo pertence ao tenant atual e scope ativo
         if (fileRecord.tenant_id === tenantId && fileRecord.scope === activeScope) {
            loadContent();
            toast.success(t('fileUploaded').replace('{name}', fileRecord.name));
         }
      };

      socket.on('file-uploaded', handleFileUploaded);

      return () => {
         socket.off('file-uploaded', handleFileUploaded);
      };
   }, [tenantId, activeScope]);

   // Handlers
   const handleFolderClick = (folder: FileFolder) => {
      if (breadcrumbs.some(b => b.id === folder.id)) {
         return;
      }
      setCurrentFolder(folder.id);
      setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
   };

   const handleBreadcrumbClick = (item: BreadcrumbItem, index: number) => {
      setCurrentFolder(item.id);
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
   };

   const handleCreateFolder = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const name = formData.get('folderName') as string;

      if (!name) return;

      const newFolder = await fileService.createFolder({
         name,
         tenantId,
         userId: user?.id || '',
         parentId: currentFolder,
         scope: activeScope
      });

      if (newFolder) {
         toast.success(t('folderCreateSuccess'));
         setShowNewFolderModal(false);
         loadContent();
      } else {
         toast.error(t('folderCreateError'));
      }
   };

   const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      const toastId = toast.loading(t('uploadingFile').replace('{name}', file.name));

      const uploaded = await fileService.uploadFile({
         file,
         tenantId,
         userId: user?.id || '',
         folderId: currentFolder,
         scope: activeScope
      });

      setIsUploading(false);
      toast.dismiss(toastId);

      if (uploaded) {
         toast.success(t('uploadSuccess'));
         loadContent();
      } else {
         toast.error(t('uploadError'));
      }
   };

   const handleDownload = async (file: FileEntry) => {
      const url = await fileService.getSignedUrl(file.storage_path);
      if (url) {
         window.open(url, '_blank');
         fileService.logEvent({
            tenant_id: tenantId,
            file_id: file.id,
            actor_user_id: user?.id || null,
            action: 'downloaded'
         });
      }
   };

   const handleDelete = async (id: string, type: 'file' | 'folder') => {
      const typeLabel = type === 'file' ? 'arquivo' : 'pasta';
      if (!confirm(t('deleteConfirm').replace('{type}', typeLabel))) return;

      let success = false;
      if (type === 'file') {
         success = await fileService.deleteFile(id, tenantId, user?.id || '');
      } else {
         // Folder delete not fully implemented in service yet (needs cascade)
         toast.error(t('folderDeleteSoon'));
         return;
      }

      if (success) {
         toast.success(t('deleteSuccess'));
         loadContent();
      }
   };

   const handleDeleteBatch = async () => {
      const count = selectedIds.size;
      if (count === 0) return;

      if (!confirm(`Deseja realmente excluir ${count} arquivo(s) selecionado(s)?`)) return;

      setIsDeletingBatch(true);
      const toastId = toast.loading(`Excluindo ${count} arquivo(s)...`);

      const success = await fileService.deleteFiles(
         Array.from(selectedIds),
         tenantId,
         user?.id || ''
      );

      setIsDeletingBatch(false);
      toast.dismiss(toastId);

      if (success) {
         toast.success(`${count} arquivo(s) excluído(s) com sucesso`);
         clearSelection();
         loadContent();
      } else {
         toast.error('Ocorreu um erro ao excluir alguns arquivos. Verifique suas permissões.');
      }
   };

   // Filtered Views
   const filteredItems = useMemo(() => {
      const query = searchQuery.toLowerCase();
      const f = folders.filter(item => item.name.toLowerCase().includes(query));
      const fi = files.filter(item => item.name.toLowerCase().includes(query));
      return { folders: f, files: fi };
   }, [folders, files, searchQuery]);

   const getFileIcon = (mime: string | null) => {
      const type = mime || '';
      if (type.includes('pdf')) return <FileText className="text-red-400" />;
      if (type.includes('image')) return <ImageIcon className="text-purple-400" />;
      if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return <TableIcon className="text-green-400" />;
      if (type.includes('zip') || type.includes('rar')) return <FileArchive className="text-yellow-400" />;
      return <FileText className="text-blue-400" />;
   };

   return (
      <div className="flex flex-col h-full bg-[#0A0A10] text-white">
         <Header title={t('filesTitle')} />

         <div className="flex-1 p-8 pt-2 overflow-y-auto custom-scrollbar">

            {/* Search & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
               <div className="flex flex-col gap-4 w-full max-w-2xl">
                  <div className="relative w-full">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
                     <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('searchFiles')}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-brand-primary focus:outline-none text-sm premium-transition"
                     />
                  </div>

                  {/* Breadcrumbs */}
                  <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest overflow-x-auto no-scrollbar py-1">
                     {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={idx}>
                           <button
                              onClick={() => handleBreadcrumbClick(crumb, idx)}
                              className={`hover:text-brand-primary transition-colors whitespace-nowrap ${idx === breadcrumbs.length - 1 ? 'text-white' : ''}`}
                           >
                              {crumb.name}
                           </button>
                           {idx < breadcrumbs.length - 1 && <ChevronRight className="w-3 h-3 flex-shrink-0" />}
                        </React.Fragment>
                     ))}
                  </div>
               </div>

               <div className="flex gap-3 w-full md:w-auto">
                  <button
                     onClick={() => setShowNewFolderModal(true)}
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-black text-[10px] uppercase tracking-widest"
                  >
                     <Plus className="w-4 h-4" />
                     {t('newFolder')}
                  </button>
                  <button
                     onClick={() => fileInputRef.current?.click()}
                     disabled={isUploading}
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-primary text-white hover:scale-105 active:scale-95 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-primary/20 disabled:opacity-50"
                  >
                     <Upload className="w-4 h-4" />
                     {isUploading ? t('initializing') : t('upload')}
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} />
               </div>
            </div>

            {/* Scope Filters */}
            <div className="flex justify-between items-center mb-8 gap-4">
               <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {[
                     { id: 'personal', label: t('myFiles'), icon: <Clock className="w-3 h-3" /> },
                     { id: 'tenant_shared', label: t('sharedFiles'), icon: <Share2 className="w-3 h-3" /> },
                     { id: 'lia_shared', label: t('liaFiles'), icon: <div className="w-2 h-2 rounded-full bg-brand-primary" /> }
                  ].map((scope) => (
                     <button
                        key={scope.id}
                        onClick={() => setActiveScope(scope.id as FileScope)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${activeScope === scope.id
                           ? 'bg-brand-primary border-brand-primary text-white'
                           : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                           }`}
                     >
                        {scope.icon}
                        {scope.label}
                     </button>
                  ))}
               </div>

               {files.length > 0 && (
                  <button
                     onClick={toggleSelectAll}
                     className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all whitespace-nowrap"
                  >
                     {selectedIds.size === files.length ? <CheckSquare className="w-4 h-4 text-brand-primary" /> : <Square className="w-4 h-4" />}
                     {selectedIds.size === files.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
               )}
            </div>

            {/* Grid */}
            {loading ? (
               <div className="flex flex-col items-center justify-center h-64 opacity-50">
                  <div className="w-10 h-10 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">{t('syncingFiles')}</p>
               </div>
            ) : filteredItems.folders.length === 0 && filteredItems.files.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-96 bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
                     <Folder className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="text-lg font-black tracking-tight mb-2">{t('emptyLibrary')}</h3>
                  <p className="text-white/40 text-xs text-center max-w-xs leading-relaxed">
                     {t('emptyLibraryDesc')}
                  </p>
               </div>
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">

                  {/* Folders */}
                  {filteredItems.folders.map((folder) => (
                     <motion.div
                        key={folder.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleFolderClick(folder)}
                        className="bg-[#1A1A28]/50 border border-white/10 p-6 rounded-3xl flex flex-col justify-between h-48 cursor-pointer hover:bg-white/5 hover:border-brand-primary/30 transition-all group relative overflow-hidden"
                     >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 blur-3xl rounded-full -mr-12 -mt-12" />
                        <div>
                           <div className="flex justify-between items-start mb-4 relative z-10">
                              <div className="p-3 bg-brand-primary/10 rounded-2xl">
                                 <Folder className="w-6 h-6 text-brand-primary" />
                              </div>
                              <button
                                 onClick={(e) => { e.stopPropagation(); }}
                                 className="p-2 text-white/20 hover:text-white transition-colors"
                              >
                                 <MoreVertical className="w-4 h-4" />
                              </button>
                           </div>
                           <h4 className="font-black text-sm truncate pr-2 relative z-10">{folder.name}</h4>
                        </div>
                        <div className="flex justify-between items-end relative z-10">
                           <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{t('newFolder')}</p>
                           <p className="text-[9px] text-white/20">{new Date(folder.created_at).toLocaleDateString()}</p>
                        </div>
                     </motion.div>
                  ))}

                  {filteredItems.files.map((file) => {
                     const isImage = file.mime_type?.startsWith('image/');
                     const isSelected = selectedIds.has(file.id);

                     return (
                        <motion.div
                           key={file.id}
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           onClick={() => toggleSelect(file.id)}
                           className={`bg-[#1A1A28]/50 border rounded-3xl flex flex-col overflow-hidden cursor-pointer hover:bg-white/5 transition-all group relative ${isSelected ? 'border-brand-primary shadow-lg shadow-brand-primary/10' : 'border-white/10 hover:border-pink-500/30'}`}
                        >
                           <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 blur-3xl rounded-full -mr-12 -mt-12" />

                           {/* Selection Badge */}
                           <div className={`absolute top-4 left-4 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand-primary border-brand-primary' : 'bg-black/20 border-white/20 opacity-0 group-hover:opacity-100'}`}>
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                           </div>

                           {isImage && file.storage_url ? (
                              <div className="w-full h-32 overflow-hidden relative">
                                 <img
                                    src={file.storage_url}
                                    alt={file.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                       e.currentTarget.style.display = 'none';
                                       e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                 />
                                 <div className="hidden w-full h-full flex items-center justify-center bg-white/5">
                                    <ImageIcon className="w-8 h-8 text-white/20" />
                                 </div>
                              </div>
                           ) : (
                              <div className="w-full h-32 flex items-center justify-center bg-white/5">
                                 <div className="p-4 bg-white/10 rounded-2xl">
                                    {getFileIcon(file.mime_type)}
                                 </div>
                              </div>
                           )}

                           <div className="p-4 flex flex-col justify-between flex-1 relative z-10">
                              <div>
                                 <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-black text-xs truncate pr-2">{file.name}</h4>
                                    <div className="flex gap-1 flex-shrink-0">
                                       <button
                                          onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                                          className="p-1.5 text-white/20 hover:text-green-400 transition-colors"
                                       >
                                          <Download className="w-3.5 h-3.5" />
                                       </button>
                                       <button
                                          onClick={(e) => { e.stopPropagation(); handleDelete(file.id, 'file'); }}
                                          className="p-1.5 text-white/20 hover:text-red-500 transition-colors"
                                       >
                                          <Trash2 className="w-3.5 h-3.5" />
                                       </button>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex justify-between items-end">
                                 <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                                    {(file.size_bytes / 1024 / 1024).toFixed(1)} MB
                                 </p>
                                 <p className="text-[8px] text-white/20">{new Date(file.created_at).toLocaleDateString()}</p>
                              </div>
                           </div>
                        </motion.div>
                     )
                  })}

               </div>
            )}
         </div>

         {/* Bulk Actions Bar */}
         <AnimatePresence>
            {selectedIds.size > 0 && (
               <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A28] border border-white/10 shadow-2xl rounded-3xl p-4 flex items-center gap-6 backdrop-blur-xl"
               >
                  <div className="flex items-center gap-3 pl-2">
                     <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-xs font-black">
                        {selectedIds.size}
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                        Arquivos selecionados
                     </span>
                  </div>

                  <div className="h-8 w-px bg-white/10" />

                  <div className="flex items-center gap-2">
                     <button
                        onClick={clearSelection}
                        className="px-4 py-2 rounded-xl hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all"
                     >
                        Cancelar
                     </button>
                     <button
                        onClick={handleDeleteBatch}
                        disabled={isDeletingBatch}
                        className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                     >
                        <Trash2 className="w-4 h-4" />
                        Excluir Selecionados
                     </button>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>

         {/* New Folder Modal */}
         <AnimatePresence>
            {showNewFolderModal && (
               <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
               >
                  <motion.div
                     initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                     className="bg-[#1A1A28] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
                  >
                     <h3 className="text-xl font-black mb-6 uppercase tracking-tighter">{t('createNewFolder')}</h3>
                     <form onSubmit={handleCreateFolder}>
                        <div className="space-y-4 mb-8">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">{t('folderNameLabel')}</label>
                              <input
                                 name="folderName"
                                 autoFocus
                                 placeholder={t('folderPlaceholder')}
                                 className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                              />
                           </div>
                           <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3 italic">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                              <p className="text-[10px] text-blue-300 leading-relaxed">
                                 {t('folderScopeNote').replace('{scope}', activeScope === 'personal' ? t('myFiles') : activeScope === 'tenant_shared' ? t('sharedFiles') : t('liaFiles'))}
                              </p>
                           </div>
                        </div>
                        <div className="flex gap-3">
                           <button
                              type="button"
                              onClick={() => setShowNewFolderModal(false)}
                              className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                           >
                              {t('cancel')}
                           </button>
                           <button
                              type="submit"
                              className="flex-1 py-4 bg-brand-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-primary/20"
                           >
                              {t('createNewFolder')}
                           </button>
                        </div>
                     </form>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>

      </div>
   );
};

export default Files;
