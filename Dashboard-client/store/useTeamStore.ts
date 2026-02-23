import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TeamMember, PendingInvitation, TeamRole } from '../types';

interface TeamState {
    members: TeamMember[];
    pendingInvitations: PendingInvitation[];

    // Actions
    addMember: (member: Omit<TeamMember, 'id'>) => void;
    updateMemberRole: (id: string, role: TeamRole) => void;
    removeMember: (id: string) => void;

    inviteMember: (email: string, role: TeamRole) => void;
    cancelInvitation: (id: string) => void;
    resendInvitation: (id: string) => void; // Apenas para simulação (não faz chamada de rede real)

    // Helper
    getAdmins: () => TeamMember[];
}

// Initial mock data to match existing visual state
const initialMembers: TeamMember[] = [
    { id: '1', name: 'Kathryn Murphy', role: 'Admin', email: 'kathryn@luminnus.com', img: 'https://picsum.photos/seed/kathryn/200', border: 'border-brand-primary', status: 'Online' },
    { id: '2', name: 'Jacob Jones', role: 'Developer', email: 'jacob.j@luminnus.com', img: 'https://picsum.photos/seed/jacob/200', border: 'border-blue-400', status: 'Offline' },
    { id: '3', name: 'Jane Cooper', role: 'Gestor', email: 'jane.cooper@client.co', img: 'https://picsum.photos/seed/jane/200', border: 'border-cyan-400', status: 'Online' },
    { id: '4', name: 'Cody Fisher', role: 'Marketing' as TeamRole, email: 'cody.f@luminnus.com', img: 'https://picsum.photos/seed/cody/200', border: 'border-pink-400', status: 'Ausente' },
];

const initialPending: PendingInvitation[] = [
    { id: 'pending_1', email: 'new.member@example.com', role: 'Developer', dateSent: new Date().toISOString() }
];

export const useTeamStore = create<TeamState>()(
    persist(
        (set, get) => ({
            members: initialMembers,
            pendingInvitations: initialPending,

            addMember: (member) => set((state) => ({
                members: [...state.members, { ...member, id: Math.random().toString(36).substring(7) }]
            })),

            updateMemberRole: (id, role) => set((state) => ({
                members: state.members.map(m => m.id === id ? { ...m, role } : m)
            })),

            removeMember: (id) => set((state) => ({
                members: state.members.filter(m => m.id !== id)
            })),

            inviteMember: (email, role) => set((state) => ({
                pendingInvitations: [...state.pendingInvitations, {
                    id: `iniv_${Math.random().toString(36).substring(7)}`,
                    email,
                    role,
                    dateSent: new Date().toISOString()
                }]
            })),

            cancelInvitation: (id) => set((state) => ({
                pendingInvitations: state.pendingInvitations.filter(p => p.id !== id)
            })),

            resendInvitation: (id) => {
                // Here we just trigger an event or toast in the UI component itself. We leave this empty logic for network side-effects.
                console.log(`Resending to ${id}`);
            },

            getAdmins: () => {
                return get().members.filter(m => m.role === 'Admin');
            }
        }),
        {
            name: 'luminnus-team-store', // Persist local storage key
        }
    )
);
