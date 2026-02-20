import React, { useState } from 'react';
import { useMedicalRecordsStore } from '../../store/useMedicalRecordsStore';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
}

export const BudgetModal: React.FC<Props> = ({ isOpen, onClose, patientId }) => {
    const { addBudget } = useMedicalRecordsStore();
    const [title, setTitle] = useState('');
    const [value, setValue] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        if (!title || !value) {
            toast.error('Preencha os campos obrigatórios');
            return;
        }

        addBudget(patientId, {
            title,
            value: `R$ ${value}`,
            status: 'Pendente'
        });

        setTitle('');
        setValue('');
        toast.success('Orçamento gerado com sucesso!');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#0A0F1A] border border-gray-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl">
                <h2 className="text-2xl font-black mb-1">Novo Orçamento</h2>
                <p className="text-gray-500 mb-6 text-sm">Crie um orçamento para procedimentos ou serviços.</p>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">Procedimento / Serviço*</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Sessões de Laser CO2"
                            className="w-full mt-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-brand-primary transition-all text-sm font-medium"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">Valor Total*</label>
                        <input
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            placeholder="Ex: 1.500,00"
                            className="w-full mt-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-brand-primary transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-sm">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-brand-primary text-white font-bold hover:opacity-90 shadow-lg shadow-brand-primary/20 transition-all text-sm active:scale-95">
                        Gerar Orçamento
                    </button>
                </div>
            </div>
        </div>
    );
};
