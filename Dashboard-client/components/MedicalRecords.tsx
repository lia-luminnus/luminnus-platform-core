
import React, { useState, useContext, useRef, useMemo } from 'react';
import Header from './Header';
import { LanguageContext } from '../App';
import toast from 'react-hot-toast';

interface HistoryEntry {
  id: string;
  date: string;
  text: string;
  icon: string;
  color: string;
  type: string;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
  age: string;
  plan: string;
  tags: { label: string; color: string }[];
  appointments: { title: string; doctor: string; date: string; time: string }[];
  observations: string;
  privateObservations: string;
  stats: {
    consults: number;
    exams: number;
    vaccines: number;
    surgeries: number;
    procedures: number;
    cancelled: number;
  };
  history: HistoryEntry[];
}

const initialHistory: HistoryEntry[] = [
  { id: 'h1', date: '19/11/2022', text: 'Realizado procedimento estético sem intercorrências. Paciente satisfeita.', icon: 'check_circle', color: 'bg-green-500', type: 'Procedimento' },
  { id: 'h2', date: '15/11/2022', text: 'Avaliação inicial para protocolo de rejuvenescimento facial.', icon: 'edit', color: 'bg-blue-500', type: 'Consulta' },
];

const mockPatient: Patient = {
  id: '1',
  name: 'Alice Henriques',
  phone: '(51) 99107-9550',
  age: '29 anos',
  plan: 'UNIMED 123',
  tags: [
    { label: 'DIABETES', color: 'bg-blue-500' },
    { label: 'BOTOX', color: 'bg-blue-400' },
    { label: 'ALERGIAS: DIPIRONA', color: 'bg-pink-500' },
    { label: 'INTERESSE: LASER CO2', color: 'bg-red-400' },
  ],
  appointments: [
    { title: 'Consulta', doctor: 'Marina Dias', date: '19/11/2022', time: '15:00' },
    { title: 'Procedimento', doctor: 'Marina Dias', date: '19/11/2022', time: '16:00' },
  ],
  observations: 'Paciente mais sensível a dor! Agendar procedimentos com tempo extra por Marina Dias as 08/11/2022 16:37',
  privateObservations: 'Paciente diabética por Marina Dias as 08/11/2022 16:36',
  stats: {
    consults: 31,
    exams: 2,
    vaccines: 0,
    surgeries: 2,
    procedures: 47,
    cancelled: 0,
  },
  history: initialHistory
};

const MedicalRecords: React.FC = () => {
  const { t } = useContext(LanguageContext);
  const [activeTab, setActiveTab] = useState('Informações Pessoais');
  const [patient, setPatient] = useState<Patient>(mockPatient);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for editing notes
  const [isEditingObs, setIsEditingObs] = useState(false);
  const [isEditingPrivObs, setIsEditingPrivObs] = useState(false);
  const [tempObs, setTempObs] = useState(patient.observations);
  const [tempPrivObs, setTempPrivObs] = useState(patient.privateObservations);

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

  const handleAddStat = (key: keyof Patient['stats'], label: string) => {
    const newHistory: HistoryEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('pt-BR'),
        text: `Adicionado novo registro de ${label.toLowerCase()} ao prontuário.`,
        icon: 'add_circle',
        color: 'bg-brand-primary',
        type: label
    };

    setPatient(prev => ({
        ...prev,
        stats: { ...prev.stats, [key]: prev.stats[key] + 1 },
        history: [newHistory, ...prev.history]
    }));
    toast.success(`${label} adicionado ao histórico`);
  };

  const saveObservations = () => {
      setPatient(prev => ({ ...prev, observations: tempObs }));
      setIsEditingObs(false);
      toast.success('Observações salvas');
  };

  const savePrivateObservations = () => {
      setPatient(prev => ({ ...prev, privateObservations: tempPrivObs }));
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
        <button onClick={() => handleAction('Nova Prescrição')} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity">
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
            <tr className="hover:bg-white dark:hover:bg-white/10">
              <td className="px-6 py-4 text-sm">15/10/2023</td>
              <td className="px-6 py-4 text-sm">Dr. Marina Dias</td>
              <td className="px-6 py-4 text-sm">Amoxicilina 500mg, Dipirona 1g</td>
              <td className="px-6 py-4 text-right">
                <button className="text-brand-primary hover:underline text-sm font-medium">Ver PDF</button>
              </td>
            </tr>
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
          <p className="text-2xl font-black text-blue-600">R$ 12.450,00</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl">
          <p className="text-sm text-green-500 font-bold mb-1">Total Pago</p>
          <p className="text-2xl font-black text-green-600">R$ 12.450,00</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl">
          <p className="text-sm text-red-500 font-bold mb-1">Em Aberto</p>
          <p className="text-2xl font-black text-red-600">R$ 0,00</p>
        </div>
      </div>
    </div>
  );

  const renderBudgets = () => (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Orçamentos Enviados</h3>
        <button onClick={() => handleAction('Novo Orçamento')} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">add_shopping_cart</span> Criar Orçamento
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { id: '#892', title: 'Protocolo Rejuvenescimento', value: 'R$ 3.500,00', status: 'Aprovado' },
          { id: '#845', title: 'Sessões de Laser CO2', value: 'R$ 1.200,00', status: 'Pendente' }
        ].map((budget, i) => (
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
        <button onClick={() => handleAction('Upload Arquivo')} className="bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
          <span className="material-symbols-outlined text-sm">cloud_upload</span> Upload
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { name: 'Exame_Sangue.pdf', type: 'picture_as_pdf' },
          { name: 'Foto_Antes.jpg', type: 'image' },
          { name: 'Foto_Depois.jpg', type: 'image' },
          { name: 'Termo_Consentimento.pdf', type: 'picture_as_pdf' }
        ].map((file, i) => (
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
                className={`py-4 px-8 text-sm font-black transition-all relative whitespace-nowrap uppercase tracking-widest ${
                  activeTab === tab 
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
             <button onClick={() => handleAction('Chat iniciado')} className="p-4 bg-brand-primary/10 text-brand-primary rounded-2xl hover:bg-brand-primary/20 transition-all hover:rotate-12 active:scale-90 shadow-sm">
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
