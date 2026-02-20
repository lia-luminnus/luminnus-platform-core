import { create } from 'zustand';
import { Patient, HistoryEntry, Prescription, MedicalBudget, MedicalFile } from '../types';

interface MedicalRecordsState {
    patients: Patient[];
    currentPatientId: string | null;

    // Actions
    setPatients: (patients: Patient[]) => void;
    setCurrentPatientId: (id: string | null) => void;
    updatePatient: (id: string, updates: Partial<Patient>) => void;

    addHistoryEntry: (patientId: string, entry: Omit<HistoryEntry, 'id'>) => void;
    addPrescription: (patientId: string, prescription: Omit<Prescription, 'id'>) => void;
    addBudget: (patientId: string, budget: Omit<MedicalBudget, 'id'>) => void;
    addFile: (patientId: string, file: Omit<MedicalFile, 'id'>) => void;
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
    history: initialHistory,
    prescriptions: [
        { id: 'p1', date: '15/10/2023', doctor: 'Dr. Marina Dias', medications: 'Amoxicilina 500mg, Dipirona 1g' }
    ],
    budgets: [
        { id: '#892', title: 'Protocolo Rejuvenescimento', value: 'R$ 3.500,00', status: 'Aprovado' },
        { id: '#845', title: 'Sessões de Laser CO2', value: 'R$ 1.200,00', status: 'Pendente' }
    ],
    files: [
        { id: 'f1', name: 'Exame_Sangue.pdf', type: 'picture_as_pdf' },
        { id: 'f2', name: 'Foto_Antes.jpg', type: 'image' },
        { id: 'f3', name: 'Foto_Depois.jpg', type: 'image' },
        { id: 'f4', name: 'Termo_Consentimento.pdf', type: 'picture_as_pdf' }
    ],
    financial: {
        totalBilled: 12450.00,
        totalPaid: 12450.00,
        totalOpen: 0.00
    }
};

export const useMedicalRecordsStore = create<MedicalRecordsState>((set) => ({
    patients: [mockPatient],
    currentPatientId: '1',

    setPatients: (patients) => set({ patients }),

    setCurrentPatientId: (id) => set({ currentPatientId: id }),

    updatePatient: (id, updates) => set((state) => ({
        patients: state.patients.map(p => p.id === id ? { ...p, ...updates } : p)
    })),

    addHistoryEntry: (patientId, entry) => set((state) => ({
        patients: state.patients.map(p => {
            if (p.id === patientId) {
                return {
                    ...p,
                    history: [{ ...entry, id: Date.now().toString() }, ...p.history]
                };
            }
            return p;
        })
    })),

    addPrescription: (patientId, prescription) => set((state) => ({
        patients: state.patients.map(p => {
            if (p.id === patientId) {
                return {
                    ...p,
                    prescriptions: [{ ...prescription, id: 'p' + Date.now().toString() }, ...p.prescriptions]
                };
            }
            return p;
        })
    })),

    addBudget: (patientId, budget) => set((state) => ({
        patients: state.patients.map(p => {
            if (p.id === patientId) {
                return {
                    ...p,
                    budgets: [{ ...budget, id: '#' + Math.floor(Math.random() * 10000) }, ...p.budgets]
                };
            }
            return p;
        })
    })),

    addFile: (patientId, file) => set((state) => ({
        patients: state.patients.map(p => {
            if (p.id === patientId) {
                return {
                    ...p,
                    files: [{ ...file, id: 'f' + Date.now().toString() }, ...p.files]
                };
            }
            return p;
        })
    }))
}));
