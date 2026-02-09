
import React, { useState, useEffect, useContext } from 'react';
import { LanguageContext } from '../contexts/LanguageContext';
import { Product, OrderItem } from '../types';
import toast from 'react-hot-toast';
import CustomSelect from './ui/CustomSelect';
import productService from '../services/productService';
import salesService from '../services/salesService';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';

interface OrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const OrderModal: React.FC<OrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { t } = useContext(LanguageContext);
    const { user, isAdmin } = useDashboardAuth();

    // Data State
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Order State
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('credit_card');
    const [status, setStatus] = useState<'pending' | 'completed'>('completed');
    const [items, setItems] = useState<OrderItem[]>([]);

    // Item selection state
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (isOpen) {
            loadProducts();
            // Reset state on open
            setCustomerName('');
            setCustomerPhone('');
            setPaymentMethod('credit_card');
            setStatus('completed');
            setItems([]);
            setSelectedProductId('');
            setQuantity(1);
        }
    }, [isOpen]);

    const getTenantId = () => {
        const metadata = (user as any)?.user_metadata;
        const tenantId = metadata?.tenant_id || (user as any)?.tenant_id;
        return tenantId || user?.id || 'default-tenant';
    };

    const loadProducts = async () => {
        setLoadingProducts(true);
        try {
            const data = await productService.listProducts(getTenantId());
            // Filter only available products
            setProducts(data.filter(p => p.stock > 0));
        } catch (error) {
            toast.error('Erro ao carregar produtos');
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleAddItem = () => {
        if (!selectedProductId) return;

        const product = products.find(p => p.id === selectedProductId);
        if (!product) return;

        if (quantity > product.stock) {
            toast.error(`Estoque insuficiente. Apenas ${product.stock} disponíveis.`);
            return;
        }

        const existingItemIndex = items.findIndex(item => item.productId === selectedProductId);

        if (existingItemIndex >= 0) {
            // Update existing item
            const newItems = [...items];
            const currentQty = newItems[existingItemIndex].quantity;

            if (currentQty + quantity > product.stock) {
                toast.error(`Estoque insuficiente para adicionar mais. Total no carrinho: ${currentQty}, Estoque: ${product.stock}`);
                return;
            }

            newItems[existingItemIndex].quantity += quantity;
            newItems[existingItemIndex].subtotal = newItems[existingItemIndex].quantity * product.price;
            setItems(newItems);
        } else {
            // Add new item
            const newItem: OrderItem = {
                productId: product.id,
                productName: product.name,
                quantity: quantity,
                unitPrice: product.price,
                subtotal: quantity * product.price
            };
            setItems([...items, newItem]);
        }

        // Reset selection
        setSelectedProductId('');
        setQuantity(1);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((acc, item) => acc + item.subtotal, 0);
    };

    const handleSubmit = async () => {
        if (items.length === 0) {
            toast.error('Adicione pelo menos um produto ao pedido');
            return;
        }

        const toastId = toast.loading('Processando venda...');

        try {
            const orderData = {
                customerName: customerName || 'Cliente Balcão',
                customerPhone: customerPhone,
                paymentMethod,
                status,
                totalAmount: calculateTotal(),
                notes: `Venda criada via Dashboard`
            };

            await salesService.createOrder(getTenantId(), orderData, items);

            toast.success('Venda realizada com sucesso!', { id: toastId });
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('Erro ao processar venda', { id: toastId });
            console.error(error);
        }
    };

    const paymentMethods = [
        { label: 'Cartão de Crédito', value: 'credit_card' },
        { label: 'Cartão de Débito', value: 'debit_card' },
        { label: 'Dinheiro', value: 'cash' },
        { label: 'Pix', value: 'pix' }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="glass-panel bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/5">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-brand-primary">shopping_cart_checkout</span>
                        Nova Venda
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-brand-primary transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* Left Panel: Product Selection */}
                    <div className="w-full md:w-1/2 p-6 border-r border-gray-100 dark:border-white/5 overflow-y-auto">
                        <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Adicionar Produtos</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Produto</label>
                                <CustomSelect
                                    value={selectedProductId}
                                    onChange={setSelectedProductId}
                                    options={products.map(p => ({
                                        label: `${p.name} - $${p.price.toFixed(2)} (${p.stock} disp.)`,
                                        value: p.id
                                    }))}
                                    placeholder="Selecione um produto..."
                                    variant="glass"
                                    className="w-full"
                                />
                            </div>

                            <div className="flex gap-4 items-end">
                                <div className="w-24">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Qtd.</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2.5 focus:border-brand-primary focus:outline-none"
                                    />
                                </div>
                                <button
                                    onClick={handleAddItem}
                                    disabled={!selectedProductId}
                                    className="flex-1 bg-brand-primary text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                                    Adicionar
                                </button>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Detalhes do Cliente</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome do Cliente (Opcional)</label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Cliente Balcão"
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2.5 focus:border-brand-primary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Telefone (WhatsApp)</label>
                                    <input
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="55XXXXXXXXXXX"
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2.5 focus:border-brand-primary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Método de Pagamento</label>
                                    <CustomSelect
                                        value={paymentMethod}
                                        onChange={setPaymentMethod}
                                        options={paymentMethods}
                                        variant="glass"
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setStatus('completed')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${status === 'completed' ? 'bg-green-500/10 border-green-500 text-green-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                                        >
                                            Pago (Concluído)
                                        </button>
                                        <button
                                            onClick={() => setStatus('pending')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${status === 'pending' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                                        >
                                            Pendente
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Cart Summary */}
                    <div className="w-full md:w-1/2 p-6 bg-gray-50/50 dark:bg-white/[0.02] flex flex-col">
                        <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Resumo do Pedido</h3>

                        <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <span className="material-symbols-outlined text-4xl mb-2">production_quantity_limits</span>
                                    <p>Carrinho vazio</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {items.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center bg-white dark:bg-white/5 p-3 rounded-lg border border-gray-100 dark:border-white/5">
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-white">{item.productName}</p>
                                                <p className="text-xs text-gray-500">{item.quantity}x ${item.unitPrice.toFixed(2)}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold text-gray-700 dark:text-gray-200">${item.subtotal.toFixed(2)}</span>
                                                <button onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-500">
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-200 dark:border-white/10 pt-4 mt-auto">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-lg font-bold text-gray-700 dark:text-gray-300">Total</span>
                                <span className="text-2xl font-bold text-brand-primary">${calculateTotal().toFixed(2)}</span>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={items.length === 0}
                                    className="flex-1 py-3 rounded-xl bg-brand-primary text-white font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-brand-primary/20"
                                >
                                    Finalizar Venda
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default OrderModal;
