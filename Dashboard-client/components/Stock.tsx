
import React, { useState, useContext } from 'react';
import Header from './Header';
import { LanguageContext } from '../App';
import { Product } from '../types';
import toast from 'react-hot-toast';

const initialProducts: Product[] = [
  { id: '1', name: 'Wireless Headphones', sku: 'WH-001', category: 'Electronics', stock: 45, minStock: 10, price: 129.99, status: 'in_stock', image: 'https://picsum.photos/seed/p1/50' },
  { id: '2', name: 'Ergonomic Chair', sku: 'EC-202', category: 'Furniture', stock: 5, minStock: 8, price: 249.50, status: 'low_stock', image: 'https://picsum.photos/seed/p2/50' },
  { id: '3', name: 'Mechanical Keyboard', sku: 'MK-104', category: 'Electronics', stock: 0, minStock: 15, price: 89.00, status: 'out_of_stock', image: 'https://picsum.photos/seed/p3/50' },
  { id: '4', name: 'USB-C Cable (2m)', sku: 'CB-009', category: 'Accessories', stock: 120, minStock: 20, price: 15.00, status: 'in_stock', image: 'https://picsum.photos/seed/p4/50' },
  { id: '5', name: 'Monitor Stand', sku: 'MS-300', category: 'Accessories', stock: 8, minStock: 10, price: 45.00, status: 'low_stock', image: 'https://picsum.photos/seed/p5/50' },
];

const Stock: React.FC = () => {
  const { t } = useContext(LanguageContext);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({
    name: '', sku: '', category: '', stock: 0, minStock: 5, price: 0, status: 'in_stock'
  });

  // Calculate Status automatically based on stock levels
  const calculateStatus = (stock: number, min: number): Product['status'] => {
    if (stock === 0) return 'out_of_stock';
    if (stock <= min) return 'low_stock';
    return 'in_stock';
  };

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Actions
  const handleSave = () => {
    if (!currentProduct.name || !currentProduct.sku) {
        toast.error('Preencha os campos obrigatórios');
        return;
    }

    const stockVal = Number(currentProduct.stock);
    const minVal = Number(currentProduct.minStock);
    const status = calculateStatus(stockVal, minVal);

    if (currentProduct.id) {
        // Edit
        setProducts(prev => prev.map(p => p.id === currentProduct.id ? { ...p, ...currentProduct, stock: stockVal, minStock: minVal, price: Number(currentProduct.price), status } as Product : p));
        toast.success(t('stockUpdated') || 'Produto atualizado');
    } else {
        // Add
        const newProduct: Product = {
            ...currentProduct as Product,
            id: Date.now().toString(),
            stock: stockVal,
            minStock: minVal,
            price: Number(currentProduct.price),
            status,
            image: `https://picsum.photos/seed/${Date.now()}/50`
        };
        setProducts(prev => [...prev, newProduct]);
        toast.success(t('stockAdded') || 'Produto adicionado');
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if (confirm('Tem certeza que deseja excluir este produto?')) {
          setProducts(prev => prev.filter(p => p.id !== id));
          toast.success('Produto removido');
      }
  };

  const openModal = (product?: Product) => {
      if (product) {
          setCurrentProduct(product);
      } else {
          setCurrentProduct({ name: '', sku: '', category: 'General', stock: 0, minStock: 5, price: 0, status: 'out_of_stock' });
      }
      setIsModalOpen(true);
  };

  // Stats
  const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const lowStockCount = products.filter(p => p.status === 'low_stock').length;
  const outOfStockCount = products.filter(p => p.status === 'out_of_stock').length;

  return (
    <div className="flex flex-col h-full">
      <Header title={t('stockTitle') || 'Estoque & Inventário'} />
      
      <div className="flex-1 p-8 pt-2 overflow-y-auto">
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Items</p>
                    <span className="material-symbols-outlined text-brand-primary">inventory_2</span>
                </div>
                <p className="text-3xl font-bold">{products.reduce((acc, p) => acc + p.stock, 0)}</p>
            </div>
            <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Valor Total</p>
                    <span className="material-symbols-outlined text-green-500">attach_money</span>
                </div>
                <p className="text-3xl font-bold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl border border-yellow-500/30 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-yellow-600 dark:text-yellow-500">Estoque Baixo</p>
                    <span className="material-symbols-outlined text-yellow-500">warning</span>
                </div>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">{lowStockCount}</p>
            </div>
             <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl border border-red-500/30 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-red-600 dark:text-red-500">Esgotado</p>
                    <span className="material-symbols-outlined text-red-500">production_quantity_limits</span>
                </div>
                <p className="text-3xl font-bold text-red-600 dark:text-red-500">{outOfStockCount}</p>
            </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex gap-4 w-full md:w-auto flex-1">
                <div className="relative w-full max-w-sm">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                    <input 
                        type="text" 
                        placeholder={t('searchStock') || "Buscar por nome ou SKU..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none text-sm"
                    />
                </div>
                <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <button 
                onClick={() => openModal()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white hover:opacity-90 transition-opacity font-medium text-sm shadow-lg shadow-brand-primary/30 whitespace-nowrap"
            >
                <span className="material-symbols-outlined text-xl">add</span>
                {t('addProduct') || "Novo Produto"}
            </button>
        </div>

        {/* Table */}
        <div className="glass-panel bg-white dark:bg-white/5 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/10">
                        <tr>
                            <th className="px-6 py-4 font-medium">Produto</th>
                            <th className="px-6 py-4 font-medium">SKU</th>
                            <th className="px-6 py-4 font-medium">Categoria</th>
                            <th className="px-6 py-4 font-medium">Qtd.</th>
                            <th className="px-6 py-4 font-medium">Preço</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                        {filteredProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100 dark:bg-white/10" />
                                        <span className="font-medium text-gray-800 dark:text-white">{product.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{product.sku}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-white/10 text-xs text-gray-600 dark:text-gray-300">
                                        {product.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-medium">
                                    <div className="flex items-center gap-2">
                                        {product.stock}
                                        {product.stock <= product.minStock && (
                                            <span className="material-symbols-outlined text-red-500 text-sm" title="Abaixo do mínimo">warning</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-800 dark:text-gray-200">${product.price.toFixed(2)}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                        product.status === 'in_stock' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                        product.status === 'low_stock' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                        'bg-red-500/10 text-red-500 border-red-500/20'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                            product.status === 'in_stock' ? 'bg-green-500' :
                                            product.status === 'low_stock' ? 'bg-yellow-500' :
                                            'bg-red-500'
                                        }`}></span>
                                        {product.status === 'in_stock' ? 'Em Estoque' : 
                                         product.status === 'low_stock' ? 'Baixo' : 'Esgotado'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openModal(product)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-brand-primary transition-colors">
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>
                                        <button onClick={() => handleDelete(product.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors">
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-gray-500">
                                    Nenhum produto encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                <div className="glass-panel bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                            {currentProduct.id ? 'Editar Produto' : 'Novo Produto'}
                        </h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-brand-primary transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome do Produto</label>
                            <input 
                                type="text" 
                                value={currentProduct.name}
                                onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})}
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 focus:border-brand-primary focus:outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">SKU</label>
                                <input 
                                    type="text" 
                                    value={currentProduct.sku}
                                    onChange={(e) => setCurrentProduct({...currentProduct, sku: e.target.value})}
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 focus:border-brand-primary focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Categoria</label>
                                <input 
                                    type="text" 
                                    value={currentProduct.category}
                                    onChange={(e) => setCurrentProduct({...currentProduct, category: e.target.value})}
                                    list="category-options"
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 focus:border-brand-primary focus:outline-none"
                                />
                                <datalist id="category-options">
                                    {categories.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Preço ($)</label>
                                <input 
                                    type="number" 
                                    value={currentProduct.price}
                                    onChange={(e) => setCurrentProduct({...currentProduct, price: Number(e.target.value)})}
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 focus:border-brand-primary focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Estoque Atual</label>
                                <input 
                                    type="number" 
                                    value={currentProduct.stock}
                                    onChange={(e) => setCurrentProduct({...currentProduct, stock: Number(e.target.value)})}
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 focus:border-brand-primary focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Estoque Mínimo</label>
                                <input 
                                    type="number" 
                                    value={currentProduct.minStock}
                                    onChange={(e) => setCurrentProduct({...currentProduct, minStock: Number(e.target.value)})}
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 focus:border-brand-primary focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 text-sm font-medium transition-colors">
                            {t('cancel')}
                        </button>
                        <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-brand-primary text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg">
                            {currentProduct.id ? 'Salvar Alterações' : 'Criar Produto'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Stock;
    