import React, { useState, useEffect } from 'react';
import { useMedicalRecordsStore } from '../../store/useMedicalRecordsStore';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    initialTab?: 'Editar' | 'Informações';
}

export const EditPatientModal: React.FC<Props> = ({ isOpen, onClose, patientId, initialTab = 'Editar' }) => {
    const { patients, updatePatient } = useMedicalRecordsStore();
    const patient = patients.find(p => p.id === patientId);
    const [activeTab, setActiveTab] = useState(initialTab);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        age: '',
        plan: ''
    });

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab, isOpen]);

    useEffect(() => {
        if (patient && isOpen) {
            setFormData({
                name: patient.name || '',
                phone: patient.phone || '',
                age: patient.age || '',
                plan: patient.plan || ''
            });
        }
    }, [patient, isOpen]);

    if (!isOpen || !patient) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updatePatient(patientId, formData);
        toast.success('Informações do paciente atualizadas com sucesso!');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
            <div className="bg-white dark:bg-[#0A0F1A] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up border border-gray-100 dark:border-white/10">

                {/* Header */}
                <div className="relative h-24 bg-gradient-to-r from-orange-500 to-amber-500 flex items-center px-6">
                    <div className="flex items-center gap-3 text-white">
                        <span className="material-symbols-outlined text-3xl">patient_list</span>
                        <div>
                            <h2 className="text-xl font-bold">Ficha do Paciente</h2>
                            <p className="text-white/80 text-sm">{patient.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-white/10 px-6 mt-4 gap-4">
                    <button
                        onClick={() => setActiveTab('Editar')}
                        className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'Editar'
                                ? 'border-orange-500 text-orange-500'
                                : 'border-transparent text-gray-400 hover:text-gray-300'
                            }`}
                    >
                        Editar Perfil
                    </button>
                    <button
                        onClick={() => setActiveTab('Informações')}
                        className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'Informações'
                                ? 'border-orange-500 text-orange-500'
                                : 'border-transparent text-gray-400 hover:text-gray-300'
                            }`}
                    >
                        Mais Informações
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {activeTab === 'Editar' ? (
                        <form id="edit-patient-form" onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nome Completo</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Telefone (WhatsApp)</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="(XX) XXXXX-XXXX"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Idade</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ex: 29 anos"
                                        value={formData.age}
                                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Convênio / Plano</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ex: UNIMED"
                                        value={formData.plan}
                                        onChange={e => setFormData({ ...formData, plan: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4 text-sm text-gray-400">
                            <p><strong>Cadastrado em:</strong> 15/01/2021</p>
                            <p><strong>Origem:</strong> Indicação (Boca a boca)</p>
                            <p><strong>Score de Pontualidade:</strong> 98%</p>
                            <p><strong>Profissão:</strong> Engenheiro de Software</p>
                            <div className="mt-4 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                                <p className="text-orange-400 font-bold mb-1">Dica da LIA</p>
                                <p className="text-gray-300">Ofereça novos horários de manhã, o paciente costuma agendar com mais frequência nas primeiras horas do dia.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3 bg-gray-50/50 dark:bg-black/20">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                    >
                        Cancelar
                    </button>
                    {activeTab === 'Editar' && (
                        <button
                            form="edit-patient-form"
                            type="submit"
                            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">save</span>
                            Salvar Perfil
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
