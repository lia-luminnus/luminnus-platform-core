import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { File, Image, FileText, Archive, Download, Trash2, Search, Folder, Sheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


interface FileData {
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    storage_url: string;
    storage_path: string;
    status: string;
    created_at: string;
}

type CategoryType = 'all' | 'documents' | 'images' | 'spreadsheets' | 'presentations' | 'archives';

const categories: { id: CategoryType; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Todos', icon: <Folder className="w-4 h-4" /> },
    { id: 'documents', label: 'Documentos', icon: <FileText className="w-4 h-4" /> },
    { id: 'images', label: 'Imagens', icon: <Image className="w-4 h-4" /> },
    { id: 'spreadsheets', label: 'Planilhas', icon: <Sheet className="w-4 h-4" /> },
    { id: 'archives', label: 'Arquivos', icon: <Archive className="w-4 h-4" /> },
];

function getFileIcon(mimeType: string) {
    if (mimeType.startsWith('image/')) return <Image className="w-8 h-8 text-green-400" />;
    if (mimeType.includes('pdf')) return <FileText className="w-8 h-8 text-red-400" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="w-8 h-8 text-blue-400" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <Sheet className="w-8 h-8 text-green-500" />;
    if (mimeType.includes('zip') || mimeType.includes('tar')) return <Archive className="w-8 h-8 text-yellow-400" />;
    return <File className="w-8 h-8 text-gray-400" />;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

export default function FilesPage() {
    const { user } = useAuth();
    const tenantId = (user as any)?.tenant_id || user?.id; // Fallback para user id se tenant_id não existir
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<CategoryType>('all');

    const fetchFiles = useCallback(async () => {
        if (!tenantId) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/files?tenantId=${tenantId}&category=${category}`);
            if (response.ok) {
                const data = await response.json();
                setFiles(data.files || []);
            }
        } catch (error) {
            console.error('Erro ao buscar arquivos:', error);
        } finally {
            setLoading(false);
        }
    }, [tenantId, category]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const handleDownload = (file: FileData) => {
        if (file.storage_url) {
            window.open(file.storage_url, '_blank');
        }
    };

    const handleDelete = async (file: FileData) => {
        if (!confirm(`Tem certeza que deseja excluir "${file.file_name}"?`)) return;

        try {
            const response = await fetch(`/api/files/${file.id}?tenantId=${tenantId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setFiles(prev => prev.filter(f => f.id !== file.id));
            }
        } catch (error) {
            console.error('Erro ao deletar arquivo:', error);
        }
    };

    const filteredFiles = files.filter(file =>
        file.file_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a1e] via-[#1a1a3e] to-[#0a0a1e] p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Arquivos</h1>
                    <p className="text-gray-400 mt-1">Gerencie todos os arquivos enviados para LIA</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Buscar arquivos..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 w-64 bg-[#1a1a3e] border-[#2a2a5e] text-white placeholder:text-gray-500"
                        />
                    </div>
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 mb-6">
                {categories.map(cat => (
                    <Button
                        key={cat.id}
                        variant={category === cat.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCategory(cat.id)}
                        className={category === cat.id
                            ? 'bg-[#bc13fe] hover:bg-[#9910cc] text-white'
                            : 'border-[#2a2a5e] text-gray-300 hover:bg-[#1a1a3e]'
                        }
                    >
                        {cat.icon}
                        <span className="ml-2">{cat.label}</span>
                    </Button>
                ))}
            </div>

            {/* Files Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bc13fe]" />
                </div>
            ) : filteredFiles.length === 0 ? (
                <div className="text-center py-16">
                    <File className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl text-gray-400">Nenhum arquivo encontrado</h3>
                    <p className="text-gray-500 mt-2">Os arquivos que você enviar para LIA aparecerão aqui.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredFiles.map(file => (
                        <div
                            key={file.id}
                            className="bg-[#1a1a3e] border border-[#2a2a5e] rounded-xl p-4 hover:border-[#bc13fe] transition-all group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 p-3 bg-[#0a0a1e] rounded-lg">
                                    {getFileIcon(file.file_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-medium truncate" title={file.file_name}>
                                        {file.file_name}
                                    </h4>
                                    <p className="text-gray-500 text-sm mt-1">
                                        {formatFileSize(file.file_size)}
                                    </p>
                                    <p className="text-gray-600 text-xs mt-1">
                                        {formatDate(file.created_at)}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDownload(file)}
                                    className="flex-1 border-[#00f3ff] text-[#00f3ff] hover:bg-[#00f3ff]/10"
                                >
                                    <Download className="w-4 h-4 mr-1" />
                                    Baixar
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(file)}
                                    className="border-red-500 text-red-500 hover:bg-red-500/10"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
