
import React, { useState, useContext, useRef, useMemo, useEffect } from 'react';
import Header from './Header';
import { LanguageContext } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';
import { useMedicalRecordsStore } from '../store/useMedicalRecordsStore';
import { PrescriptionModal } from './MedicalRecords/PrescriptionModal';
import { BudgetModal } from './MedicalRecords/BudgetModal';

const MedicalRecords: React.FC = () => {
  const { t } = useContext(LanguageContext);
  const { patients, currentPatientId, updatePatient, addHistoryEntry, addPrescription, addBudget, addFile } = useMedicalRecordsStore();
  const patient = patients.find(p => p.id === currentPatientId) || patients[0];
  const [activeTab, setActiveTab] = useState('Informações Pessoais');
  const [searchTerm, setSearchTerm] = useState('');

  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isLiaOpen, setIsLiaOpen] = useState(false);

  const LIA_VIVA_URL = import.meta.env.VITE_LIA_VIVA_URL || "http://localhost:5173";

  // States for editing notes
  const [isEditingObs, setIsEditingObs] = useState(false);
  const [isEditingPrivObs, setIsEditingPrivObs] = useState(false);
  const [tempObs, setTempObs] = useState(patient.observations);
  const [tempPrivObs, setTempPrivObs] = useState(patient.privateObservations);

  // Update temp obs when patient changes
  useEffect(() => {
    setTempObs(patient.observations);
    setTempPrivObs(patient.privateObservations);
  }, [patient.id]);

  const printAreaRef = useRef<HTMLDivElement>(null);

  const tabs = [
    'Informações Pessoais',
    'Prescrições',
    'Acompanhamento',
    'Financeiro',
    'Orçamentos',
    'Arquivos'
  ];

  const filteredHistory = useMemo(() => {
    return patient.history.filter(item =>
      item.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patient.history, searchTerm]);

  const handleAction = (action: string) => {
    toast.success(`${action} iniciado com sucesso!`);
  };

  const handleAddStat = (key: keyof typeof patient.stats, label: string) => {
    const newHistory = {
      date: new Date().toLocaleDateString('pt-BR'),
      text: `Adicionado novo registro de ${label.toLowerCase()} ao prontuário.`,
      icon: 'add_circle',
      color: 'bg-brand-primary',
      type: label
    };

    updatePatient(patient.id, {
      stats: { ...patient.stats, [key]: patient.stats[key] + 1 }
    });
    addHistoryEntry(patient.id, newHistory);
    toast.success(`${label} adicionado ao histórico`);
  };

  const saveObservations = () => {
    updatePatient(patient.id, { observations: tempObs });
    setIsEditingObs(false);
    toast.success('Observações salvas');
  };

  const savePrivateObservations = () => {
    updatePatient(patient.id, { privateObservations: tempPrivObs });
    setIsEditingPrivObs(false);
    toast.success('Observações privadas salvas');
  };

  const handlePrint = () => {
    toast.loading('Gerando PDF do prontuário...', { duration: 2000 });
    setTimeout(() => {
      window.print();
    }, 1000);
  };

  const handleShare = () => {
    const shareLink = `https://luminnus.app/records/${patient.id}`;
    navigator.clipboard.writeText(shareLink);
    toast.success('Link de compartilhamento copiado!');
  };

  const renderPrescriptions = () => (
    <div className="animate-fade-in space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Prescrições Recentes</h3>
        <button onClick={() => setIsPrescriptionModalOpen(true)} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity">
          <span className="material-symbols-outlined text-sm">add</span> Nova Prescrição
        </button>
      </div>
      <div className="bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 uppercase">
            <tr>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Médico</th>
              <th className="px-6 py-4">Medicamentos</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {patient.prescriptions.map((presc) => (
              <tr key={presc.id} className="hover:bg-white dark:hover:bg-white/10">
                <td className="px-6 py-4 text-sm">{presc.date}</td>
                <td className="px-6 py-4 text-sm">{presc.doctor}</td>
                <td className="px-6 py-4 text-sm">{presc.medications}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-brand-primary hover:underline text-sm font-medium">Ver PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFollowUp = () => (
    <div className="animate-fade-in space-y-6">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white">Acompanhamento Clínico</h3>
      {filteredHistory.length === 0 ? (
        <div className="p-8 text-center text-gray-500 italic">Nenhum registro encontrado para a busca.</div>
      ) : (
        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-brand-primary/20">
          {filteredHistory.map((item) => (
            <div key={item.id} className="relative group">
              <div className={`absolute -left-10 top-0 w-6 h-6 rounded-full ${item.color} flex items-center justify-center text-white border-4 border-white dark:border-dark-bg z-10 shadow-sm`}>
                <span className="material-symbols-outlined text-xs">{item.icon}</span>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 group-hover:bg-white dark:group-hover:bg-white/10 transition-colors shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-brand-primary uppercase tracking-tight">{item.type} - {item.date}</span>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-brand-primary">
                    <span className="material-symbols-outlined text-sm">more_horiz</span>
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFinancial = () => (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Financeiro do Paciente</h3>
        <span className="text-sm font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">SALDO EM DIA</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl">
          <p className="text-sm text-blue-500 font-bold mb-1">Total Faturado</p>
          <p className="text-2xl font-black text-blue-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(patient.financial.totalBilled)}
          </p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl">
          <p className="text-sm text-green-500 font-bold mb-1">Total Pago</p>
          <p className="text-2xl font-black text-green-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(patient.financial.totalPaid)}
          </p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl">
          <p className="text-sm text-red-500 font-bold mb-1">Em Aberto</p>
          <p className="text-2xl font-black text-red-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(patient.financial.totalOpen)}
          </p>
        </div>
      </div>
    </div>
  );

  const renderBudgets = () => (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Orçamentos Enviados</h3>
        <button onClick={() => setIsBudgetModalOpen(true)} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">add_shopping_cart</span> Criar Orçamento
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {patient.budgets.map((budget, i) => (
          <div key={i} className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs text-gray-400 font-bold mb-1 uppercase">{budget.id}</p>
              <p className="font-bold text-gray-800 dark:text-white">{budget.title}</p>
              <p className="text-lg font-black text-brand-primary">{budget.value}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${budget.status === 'Aprovado' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
              {budget.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFiles = () => (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Documentos e Exames</h3>
        <label className="bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors cursor-pointer">
          <span className="material-symbols-outlined text-sm">cloud_upload</span> Upload
          <input type="file" className="hidden" onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              addFile(patient.id, { name: e.target.files[0].name, type: 'description' });
              toast.success('Arquivo enviado com sucesso!');
            }
          }} />
        </label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {patient.files.map((file, i) => (
          <div key={i} className="flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 group cursor-pointer hover:border-brand-primary/50 transition-all">
            <span className="material-symbols-outlined text-4xl text-brand-primary/50 group-hover:text-brand-primary transition-colors">{file.type}</span>
            <span className="text-[10px] font-bold text-gray-500 text-center truncate w-full">{file.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-dark-bg font-sans scroll-smooth">
      <Header title={t('medicalRecords') || 'Prontuários'} />

      <div className="flex-1 p-6 overflow-y-auto print:p-0 print:bg-white">
        <div ref={printAreaRef} className="print:block space-y-6">
          {/* Patient Header */}
          <div className="bg-white dark:bg-white/5 rounded-xl p-6 border border-gray-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">{patient.name}</h2>
              <div className="flex flex-wrap gap-2 print:hidden">
                {patient.tags.map((tag, i) => (
                  <span key={i} className={`${tag.color} text-white text-[10px] font-black px-2 py-1 rounded shadow-sm uppercase`}>
                    {tag.label}
                  </span>
                ))}
                <button className="text-gray-400 hover:text-brand-primary transition-colors">
                  <span className="material-symbols-outlined text-lg">sell</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <select className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-xs font-bold px-3 py-1.5 rounded-lg outline-none text-gray-500">
                <option>GestãoDS - Clínica Teste</option>
              </select>
            </div>
          </div>

          {/* Tabs Navigation - Hidden on Print */}
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 flex overflow-x-auto no-scrollbar print:hidden shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-8 text-sm font-black transition-all relative whitespace-nowrap uppercase tracking-widest ${activeTab === tab
                  ? 'text-brand-primary bg-white dark:bg-white/10'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-brand-primary"></span>
                )}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-8 rounded-xl shadow-sm min-h-[600px]">
            {activeTab === 'Informações Pessoais' && (
              <div className="animate-fade-in space-y-12">
                <div className="flex flex-col lg:flex-row gap-12 items-start">
                  {/* Avatar */}
                  <div className="relative group flex-shrink-0 mx-auto lg:mx-0">
                    <div className="w-40 h-40 rounded-3xl overflow-hidden border-4 border-brand-primary/20 bg-blue-100 shadow-xl">
                      <img
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice&hairColor=f59724&clothingColor=3c91e6"
                        alt="Patient"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button className="absolute bottom-2 right-2 bg-brand-primary text-white p-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 print:hidden">
                      <span className="material-symbols-outlined text-lg">photo_camera</span>
                    </button>
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1 text-center lg:text-left">
                    <h3 className="text-4xl font-black text-gray-900 dark:text-white mb-3 tracking-tighter">{patient.name}</h3>
                    <div className="space-y-3">
                      <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center lg:justify-start gap-2 text-sm font-medium">
                        <span className="material-symbols-outlined text-brand-primary">call</span> {patient.phone}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center lg:justify-start gap-2 text-sm font-medium">
                        <span className="material-symbols-outlined text-brand-primary">badge</span> {patient.plan}
                      </p>
                      <p className="text-gray-700 dark:text-gray-200 font-black text-xl">{patient.age}</p>
                    </div>
                  </div>

                  {/* Top Action Buttons - Hidden on Print */}
                  <div className="flex flex-wrap justify-center lg:justify-end gap-3 w-full lg:w-auto print:hidden">
                    <button onClick={() => handleAction('Editar Perfil')} className="bg-orange-400 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-orange-500 transition-all shadow-lg shadow-orange-500/20 active:scale-95">
                      <span className="material-symbols-outlined text-lg">edit_note</span> Editar
                    </button>
                    <button onClick={() => handleAction('Ver Informações')} className="bg-blue-400 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                      <span className="material-symbols-outlined text-lg">info</span> Informações
                    </button>
                    <button onClick={() => handleAction('Paciente Multiclínica')} className="bg-brand-secondary text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-brand-secondary/20 active:scale-95">
                      <span className="material-symbols-outlined text-lg">account_tree</span> Paciente Multiclínica
                    </button>
                  </div>
                </div>

                {/* Middle Section: Agenda and Observations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <h4 className="text-gray-400 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-500">event_upcoming</span>
                      Futuros agendamentos:
                    </h4>
                    <div className="space-y-4">
                      {patient.appointments.map((appt, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:shadow-md transition-shadow">
                          <div className="p-2 bg-blue-500/10 rounded-xl">
                            <span className="material-symbols-outlined text-blue-500 text-lg">calendar_today</span>
                          </div>
                          <p className="text-sm">
                            <strong className="text-blue-500 font-black">{appt.title}</strong> com <span className="font-bold text-gray-800 dark:text-gray-200">{appt.doctor}</span>
                            <br />
                            <span className="text-xs text-gray-500 font-medium">{appt.date} às {appt.time}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Observations */}
                    <div className="space-y-3">
                      <h4 className="text-gray-400 font-black uppercase tracking-widest text-xs flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-orange-400">sticky_note_2</span>
                          Observações:
                        </span>
                        {!isEditingObs ? (
                          <button onClick={() => setIsEditingObs(true)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-orange-400 transition-colors print:hidden">
                            <span className="material-symbols-outlined text-lg">edit_square</span>
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={saveObservations} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                              <span className="material-symbols-outlined text-sm">check</span>
                            </button>
                            <button onClick={() => { setIsEditingObs(false); setTempObs(patient.observations); }} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        )}
                      </h4>
                      {isEditingObs ? (
                        <textarea
                          value={tempObs}
                          onChange={(e) => setTempObs(e.target.value)}
                          className="w-full bg-orange-50/50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/20 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-400 outline-none text-gray-700 dark:text-gray-300 min-h-[100px]"
                        />
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic border-l-4 border-orange-400/50 pl-4 py-1">
                          {patient.observations}
                        </p>
                      )}
                    </div>

                    {/* Private Observations */}
                    <div className="space-y-3">
                      <h4 className="text-gray-400 font-black uppercase tracking-widest text-xs flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-red-500">lock</span>
                          Observações privadas:
                        </span>
                        {!isEditingPrivObs ? (
                          <button onClick={() => setIsEditingPrivObs(true)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-red-400 transition-colors print:hidden">
                            <span className="material-symbols-outlined text-lg">edit_square</span>
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={savePrivateObservations} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                              <span className="material-symbols-outlined text-sm">check</span>
                            </button>
                            <button onClick={() => { setIsEditingPrivObs(false); setTempPrivObs(patient.privateObservations); }} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        )}
                      </h4>
                      {isEditingPrivObs ? (
                        <textarea
                          value={tempPrivObs}
                          onChange={(e) => setTempPrivObs(e.target.value)}
                          className="w-full bg-red-50/50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-red-400 outline-none text-gray-700 dark:text-gray-300 min-h-[100px]"
                        />
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic border-l-4 border-red-500/50 pl-4 py-1">
                          {patient.privateObservations}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden divide-x divide-gray-200 dark:divide-white/10 shadow-lg">
                  {[
                    { key: 'consults', label: 'Consultas', value: patient.stats.consults, btn: 'Nova consulta', icon: 'stethoscope' },
                    { key: 'exams', label: 'Exames', value: patient.stats.exams, btn: 'Novo Exame', icon: 'medical_services' },
                    { key: 'vaccines', label: 'Vacinas', value: patient.stats.vaccines, btn: 'Nova Vacinação', icon: 'vaccines' },
                    { key: 'surgeries', label: 'Cirurgias', value: patient.stats.surgeries, btn: 'Nova Cirurgia', icon: 'surgical_mask' },
                    { key: 'procedures', label: 'Procedimentos', value: patient.stats.procedures, btn: 'Procedimento', icon: 'monitor_heart', btnColor: 'text-orange-500 border-orange-200 hover:bg-orange-50 active:bg-orange-100' },
                    { key: 'cancelled', label: 'Cancelados', value: patient.stats.cancelled, btn: 'Ver mais', icon: 'event_busy' }
                  ].map((stat, i) => (
                    <div key={i} className="flex flex-col items-center justify-between p-6 bg-gray-50/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all duration-300 min-h-[220px] group">
                      <span className="text-4xl font-black text-brand-primary mb-1 group-hover:scale-110 transition-transform">{stat.value}</span>
                      <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-6 text-center">{stat.label}</span>
                      <button
                        onClick={() => handleAddStat(stat.key as any, stat.label)}
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-2.5 rounded-xl border-2 border-brand-primary/20 text-brand-primary hover:bg-brand-primary hover:text-white transition-all w-full flex items-center gap-2 justify-center print:hidden shadow-sm active:scale-95 ${stat.btnColor || ''}`}
                      >
                        <span className="material-symbols-outlined text-sm">{stat.icon}</span>
                        {stat.btn}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Prescrições' && renderPrescriptions()}
            {activeTab === 'Acompanhamento' && renderFollowUp()}
            {activeTab === 'Financeiro' && renderFinancial()}
            {activeTab === 'Orçamentos' && renderBudgets()}
            {activeTab === 'Arquivos' && renderFiles()}
          </div>
        </div>

        {/* Bottom Navigation & Search - Hidden on Print */}
        <div className="mt-8 flex flex-col md:flex-row items-center gap-6 print:hidden">
          <div className="flex-shrink-0">
            <button title="Chamar LIA (Assessor Inteligente)" onClick={() => setIsLiaOpen(!isLiaOpen)} className={`p-4 rounded-2xl transition-all shadow-sm ${isLiaOpen ? 'bg-brand-primary text-white shadow-brand-primary/40' : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 hover:rotate-12 active:scale-90'}`}>
              <span className="material-symbols-outlined">forum</span>
            </button>
          </div>
          <div className="flex-1 w-full relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-colors">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquise no histórico (Data, Tipo, Conteúdo...)"
              className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-4">
            <button onClick={handleShare} className="flex items-center gap-2 px-6 py-3 border-2 border-brand-secondary text-brand-secondary rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-secondary hover:text-white transition-all active:scale-95 shadow-lg shadow-brand-secondary/10">
              <span className="material-symbols-outlined text-lg">share</span> Compartilhar Link
            </button>
            <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-brand-primary/20 active:scale-95">
              <span className="material-symbols-outlined text-lg">print</span> Prontuário Completo
            </button>
          </div>
        </div>
      </div>

      <PrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        patientId={patient.id}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        patientId={patient.id}
      />

      {/* LIA Side Panel */}
      {isLiaOpen && (
        <div className="fixed right-0 top-0 bottom-0 w-full max-w-[450px] bg-[#0A0F1A] shadow-2xl z-50 flex flex-col border-l border-white/10 animate-fade-in_right">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/50">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-brand-primary text-2xl">forum</span>
              <div>
                <h3 className="text-white font-bold leading-tight">LIA Assessor</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Contexto: {patient.name}</p>
              </div>
            </div>
            <button onClick={() => setIsLiaOpen(false)} className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="flex-1 bg-[#0A0F1A]">
            <iframe
              src={`${LIA_VIVA_URL}?embed=1&ctx=medical&patient=${encodeURIComponent(patient.name)}`}
              className="w-full h-full border-none"
              allow="microphone; camera; display-capture; autoplay; encrypted-media; geolocation"
              title="LIA Assessor de Prontuário"
            />
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 1cm;
          }
          body {
            background-color: white !important;
          }
          body * {
            visibility: hidden;
            -webkit-print-color-adjust: exact;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print\\:hidden, #root > *:not(main), main > *:not(.flex-1), header, aside {
            display: none !important;
          }
          /* Ensure all content area is visible on print */
          .bg-white, .dark\\:bg-white\\/5 {
              background-color: white !important;
              color: black !important;
              border: 1px solid #eee !important;
          }
          .text-brand-primary, .text-blue-500 {
              color: #4f46e5 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MedicalRecords;
