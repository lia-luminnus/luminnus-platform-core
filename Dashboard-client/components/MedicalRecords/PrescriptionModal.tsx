import React, { useState } from 'react';
import { useMedicalRecordsStore } from '../../store/useMedicalRecordsStore';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
}

export const PrescriptionModal: React.FC<Props> = ({ isOpen, onClose, patientId }) => {
    const { addPrescription } = useMedicalRecordsStore();
    const [medications, setMedications] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        if (!medications) {
            toast.error('Informe a prescrição');
            return;
        }
        addPrescription(patientId, {
            date: new Date().toLocaleDateString('pt-BR'),
            doctor: 'Dr. Marina Dias', // Current user in a real app
            medications
        });
        setMedications('');
        toast.success('Prescrição salva com sucesso!');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#0A0F1A] border border-gray-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl">
                <h2 className="text-2xl font-black mb-1">Nova Prescrição</h2>
                <p className="text-gray-500 mb-6 text-sm">Insira os medicamentos e posologia recomendados.</p>

                <textarea
                    value={medications}
                    onChange={e => setMedications(e.target.value)}
                    placeholder="Ex: Amoxicilina 500mg de 8/8h por 7 dias."
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 min-h-[150px] mb-6 outline-none focus:ring-2 focus:ring-brand-primary transition-all text-sm"
                />
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-sm">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-brand-primary text-white font-bold hover:opacity-90 shadow-lg shadow-brand-primary/20 transition-all text-sm active:scale-95">
                        Salvar Prescrição
                    </button>
                </div>
            </div>
        </div>
    );
};
