import React, { useState, useContext, useEffect, useCallback } from 'react';
import Header from './Header';
import { CalendarEvent } from '../types';
import { LanguageContext } from '../contexts/LanguageContext';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';

// Helpers
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

// Initial mock data with ISO dates (using current year/month for visibility)
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();
const format = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const initialEvents: CalendarEvent[] = [];

import toast from 'react-hot-toast';

const Calendar: React.FC = () => {
    const { t, language } = useContext(LanguageContext);
    const { user, isAdmin, profile } = useDashboardAuth();

    const ADMIN_TENANT_ID = '00000000-0000-0000-0000-000000000001';
    const tenantId = isAdmin ? ADMIN_TENANT_ID : (profile?.tenant_id || user?.id || null);
    const userId = user?.id || null;
    const API_URL = import.meta.env.VITE_API_URL || 'https://luminnus-platform-core.onrender.com';

    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [view, setView] = useState<'month' | 'year'>('month');
    const [searchTerm, setSearchTerm] = useState('');
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

    const filteredEvents = events.filter(ev =>
        ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ev.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Monitoramento de eventos para alertas da LIA
    useEffect(() => {
        const checkUpcomingEvents = () => {
            const now = new Date();
            events.forEach(event => {
                const eventDate = new Date(event.date + ' ' + event.time);
                const diffMinutes = (eventDate.getTime() - now.getTime()) / (1000 * 60);

                // Se faltar entre 0 e 5 minutos e não tivermos avisado (mock)
                if (diffMinutes > 0 && diffMinutes <= 5) {
                    toast(`LIA: Reunião "${event.title}" começa em breve!`, {
                        icon: '🔔',
                        duration: 5000,
                        position: 'top-right',
                        style: {
                            background: '#8B5CF6',
                            color: '#fff',
                            fontWeight: 'bold'
                        }
                    });

                    // Simular envio para WhatsApp
                    console.log(`[LIA WhatsApp Alert] Enviando lembrete para WhatsApp do usuário sobre: ${event.title}`);
                }
            });
        };

        const interval = setInterval(checkUpcomingEvents, 60000); // Checa a cada minuto
        return () => clearInterval(interval);
    }, [events]);

    const handleSync = useCallback(async () => {
        if (!userId || !tenantId) {
            toast.error('Faça login para sincronizar com o Google Calendar.');
            return;
        }

        setIsSyncing(true);
        toast.loading('Sincronizando com Google Calendar...', { id: 'sync' });

        try {
            const now = new Date();
            const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString();

            const response = await fetch(
                `${API_URL}/api/google/calendar/events?userId=${userId}&tenantId=${tenantId}&timeMin=${timeMin}&timeMax=${timeMax}`
            );

            const data = await response.json();

            if (data.success && data.events?.length > 0) {
                // Merge Google events with any locally-created events (keep local ones that don't overlap)
                const googleEventIds = new Set(data.events.map((e: any) => e.id));
                const localOnlyEvents = events.filter(e => !googleEventIds.has(e.id) && !(e as any).source);

                setEvents([...data.events, ...localOnlyEvents]);
                setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
                toast.success(`${data.count} evento(s) sincronizado(s) com sucesso!`, { id: 'sync' });
            } else if (data.warning) {
                toast.error(data.warning, { id: 'sync', duration: 5000 });
            } else {
                setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
                toast.success('Sincronizado! Nenhum evento encontrado neste período.', { id: 'sync' });
            }
        } catch (error: any) {
            console.error('[Calendar] Sync error:', error);
            toast.error('Erro ao sincronizar. Verifique sua conexão com o Google.', { id: 'sync' });
        } finally {
            setIsSyncing(false);
        }
    }, [userId, tenantId, API_URL, events]);

    // Auto-sync on mount
    useEffect(() => {
        if (userId && tenantId) {
            handleSync();
        }
    }, [userId, tenantId]);

    const [currentEvent, setCurrentEvent] = useState<Partial<CalendarEvent>>({
        date: format(today.getFullYear(), today.getMonth(), today.getDate()),
        time: '09:00',
        type: 'meeting',
        title: '',
        description: ''
    });

    // Calendar Generation Logic
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month); // 0 = Sunday

    // Generate grid days
    const calendarDays = [];
    // Previous month padding
    for (let i = 0; i < firstDay; i++) {
        const prevDate = new Date(year, month, -i);
        calendarDays.unshift({ date: prevDate, isCurrentMonth: false });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    // Next month padding to fill 42 cells (6 rows)
    const remainingCells = 42 - calendarDays.length;
    for (let i = 1; i <= remainingCells; i++) {
        calendarDays.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    // Conflict Detection Logic
    const conflicts = events.reduce((acc, current, idx) => {
        const others = events.slice(idx + 1);
        const currentConflict = others.filter(other =>
            other.date === current.date && other.time === current.time
        );
        if (currentConflict.length > 0) {
            acc.push({ event1: current, event2: currentConflict[0] });
        }
        return acc;
    }, [] as { event1: CalendarEvent, event2: CalendarEvent }[]);

    // Formatting
    const monthName = new Intl.DateTimeFormat(language, { month: 'long' }).format(currentDate);
    const yearNum = currentDate.getFullYear();
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(2023, 0, i + 1); // Start from a known Sunday
        return new Intl.DateTimeFormat(language, { weekday: 'short' }).format(d);
    });

    // Derived state for sidebar (Upcoming events sorted by date)
    const upcomingEvents = [...filteredEvents]
        .filter(e => new Date(e.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

    // Navigation Handlers
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    const handleDayClick = (date: Date) => {
        setCurrentEvent({
            id: undefined,
            date: format(date.getFullYear(), date.getMonth(), date.getDate()),
            time: '09:00',
            type: 'meeting',
            title: '',
            description: ''
        });
        setIsModalOpen(true);
    };

    const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
        e.stopPropagation();
        setCurrentEvent(event);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!currentEvent.title || !currentEvent.date) return;

        if (currentEvent.id) {
            setEvents(prev => prev.map(ev => ev.id === currentEvent.id ? { ...ev, ...currentEvent } as CalendarEvent : ev));
        } else {
            const newEvent: CalendarEvent = {
                ...currentEvent as CalendarEvent,
                id: Date.now().toString()
            };
            setEvents(prev => [...prev, newEvent]);
        }
        setIsModalOpen(false);
    };

    const handleDelete = () => {
        if (currentEvent.id) {
            setEvents(prev => prev.filter(ev => ev.id !== currentEvent.id));
        }
        setIsModalOpen(false);
    };

    const handleReviewSuggestions = () => {
        setIsSuggestionsModalOpen(true);
    }

    const getEventTypeStyles = (type: string) => {
        switch (type) {
            case 'meeting': return 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500';
            case 'deadline': return 'bg-red-500/20 text-red-400 border-l-2 border-red-500';
            case 'review': return 'bg-purple-500/20 text-purple-400 border-l-2 border-purple-500';
            default: return 'bg-gray-500/20 text-gray-400 border-l-2 border-gray-500';
        }
    };

    const getEventTypeColor = (type: string) => {
        switch (type) {
            case 'meeting': return 'bg-blue-500';
            case 'deadline': return 'bg-red-500';
            case 'review': return 'bg-purple-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex-shrink-0">
                <div className="h-20 px-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                            {t('agendaTitle')}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group hidden md:block">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-colors text-lg">search</span>
                            <input
                                type="text"
                                placeholder="Buscar eventos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary/50 w-64 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${isSyncing
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-base ${isSyncing ? 'animate-spin' : ''}`}>
                                {isSyncing ? 'sync' : 'sync'}
                            </span>
                            {isSyncing ? 'Sincronizando...' : 'Sincronizar com Google'}
                        </button>
                        <button
                            onClick={() => handleDayClick(new Date())}
                            className="text-xs font-semibold py-2 px-4 rounded-lg bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white hover:opacity-90 transition-opacity flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">add</span> {t('createEvent')}
                        </button>
                        <button className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-blue-500 lia-glow flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-8 pt-2 overflow-hidden flex flex-col lg:flex-row gap-6">
                {/* Main Calendar Grid */}
                <div className="flex-1 flex flex-col glass-panel bg-white dark:bg-white/5 rounded-2xl p-6 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <button onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"><span className="material-symbols-outlined">chevron_left</span></button>
                            <h3 className="text-xl font-bold capitalize cursor-pointer hover:text-brand-primary transition-colors" onClick={() => setView(view === 'month' ? 'year' : 'month')}>
                                {view === 'month' ? `${monthName} ${yearNum}` : yearNum}
                            </h3>
                            <button onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"><span className="material-symbols-outlined">chevron_right</span></button>
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                            <button
                                onClick={goToToday}
                                className="px-3 py-1 text-xs rounded-md bg-brand-primary/10 text-brand-primary font-medium hover:bg-brand-primary/20 transition-colors"
                            >
                                {t('today')}
                            </button>
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/10 p-1 rounded-lg">
                                <button onClick={() => setView('month')} className={`px-3 py-1 text-xs rounded-md transition-all ${view === 'month' ? 'bg-white dark:bg-white/20 shadow-sm font-medium' : 'text-gray-500'}`}>
                                    {t('monthly')}
                                </button>
                                <button onClick={() => setView('year')} className={`px-3 py-1 text-xs rounded-md transition-all ${view === 'year' ? 'bg-white dark:bg-white/20 shadow-sm font-medium' : 'text-gray-500'}`}>
                                    {t('yearly')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {view === 'month' ? (
                        <>
                            <div className="grid grid-cols-7 mb-2">
                                {weekDays.map(d => (
                                    <div key={d} className="text-center text-sm font-medium text-gray-400 py-2 capitalize">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 flex-1 auto-rows-fr border-t border-l border-gray-200 dark:border-white/10 relative">
                                {searchTerm && filteredEvents.length === 0 && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-black/40 backdrop-blur-sm z-10 rounded-xl">
                                        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">search_off</span>
                                        <p className="text-sm text-gray-500 font-medium">Nenhum evento encontrado para "{searchTerm}"</p>
                                        <button onClick={() => setSearchTerm('')} className="mt-2 text-xs text-brand-primary font-bold hover:underline">Limpar busca</button>
                                    </div>
                                )}
                                {calendarDays.map((dayObj, i) => {
                                    const dateStr = format(dayObj.date.getFullYear(), dayObj.date.getMonth(), dayObj.date.getDate());
                                    const isToday = dateStr === format(today.getFullYear(), today.getMonth(), today.getDate());
                                    const dayEvents = filteredEvents.filter(e => e.date === dateStr);

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => handleDayClick(dayObj.date)}
                                            className={`border-r border-b border-gray-200 dark:border-white/10 p-2 relative min-h-[100px] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group ${!dayObj.isCurrentMonth ? 'opacity-40 bg-gray-50/50 dark:bg-black/20' : ''} ${isToday ? 'bg-blue-500/5' : ''}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className={`text-sm w-6 h-6 flex items-center justify-center rounded-full transition-colors ${isToday ? 'font-bold bg-brand-primary text-white shadow-lg shadow-brand-primary/30' : 'text-gray-500'}`}>{dayObj.date.getDate()}</span>
                                                <span className="material-symbols-outlined text-brand-primary text-sm opacity-0 group-hover:opacity-100 transition-opacity">add</span>
                                            </div>

                                            <div className="mt-2 space-y-1">
                                                {dayEvents.map(ev => (
                                                    <div
                                                        key={ev.id}
                                                        onClick={(e) => handleEventClick(e, ev)}
                                                        title={ev.description}
                                                        className={`px-1.5 py-1 rounded text-[10px] font-medium truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 ${getEventTypeStyles(ev.type)}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[10px]">
                                                            {ev.type === 'meeting' ? 'groups' : ev.type === 'deadline' ? 'notification_important' : ev.type === 'review' ? 'rate_review' : 'event'}
                                                        </span>
                                                        <span className="truncate">{ev.time} {ev.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-3 gap-4 flex-1 overflow-y-auto">
                            {Array.from({ length: 12 }).map((_, i) => {
                                const date = new Date(year, i, 1);
                                const mName = new Intl.DateTimeFormat(language, { month: 'long' }).format(date);
                                const isCurrentMonth = i === today.getMonth() && year === today.getFullYear();
                                return (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setCurrentDate(new Date(year, i, 1));
                                            setView('month');
                                        }}
                                        className={`p-4 rounded-xl border transition-all hover:scale-105 flex flex-col items-center justify-center ${isCurrentMonth
                                            ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20'
                                            : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-brand-primary text-gray-700 dark:text-gray-200'
                                            }`}
                                    >
                                        <span className="text-lg font-bold capitalize">{mName}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="w-full lg:w-80 flex flex-col gap-6">
                    <div className="glass-panel bg-white dark:bg-white/5 rounded-2xl p-6 flex-1 lg:flex-none">
                        <h3 className="font-semibold text-lg mb-4">{t('upcomingEvents')}</h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {upcomingEvents.length === 0 && <p className="text-sm text-gray-500 italic">Nenhum evento próximo.</p>}
                            {upcomingEvents.map(ev => {
                                const evDate = new Date(ev.date);
                                const dateStr = new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' }).format(evDate);
                                return (
                                    <div key={ev.id} className="flex gap-3 items-start group cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors" onClick={(e) => handleEventClick(e as any, ev)}>
                                        <div className={`w-1 self-stretch ${getEventTypeColor(ev.type)} rounded-full opacity-70 group-hover:opacity-100 transition-opacity`}></div>
                                        <div>
                                            <p className="font-medium text-sm group-hover:text-brand-primary transition-colors">{ev.title}</p>
                                            <p className="text-xs text-gray-500">{dateStr}, {ev.time}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="glass-panel rounded-2xl p-6 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent">
                        <h3 className="font-semibold text-lg mb-2">{t('liaSuggestions')}</h3>
                        <p className="text-sm text-gray-500 mb-4">Analisei sua agenda e encontrei o seguinte:</p>

                        <div className="space-y-3">
                            {conflicts.length > 0 ? (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                                    <p className="font-medium text-sm text-red-600 dark:text-red-400 mb-1 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">warning</span> Conflito Detectado
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                        "{conflicts[0].event1.title}" e "{conflicts[0].event2.title}" no mesmo horário.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                    <p className="font-medium text-sm text-green-600 dark:text-green-500 mb-1 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">check_circle</span> Agenda Saudável
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Não encontrei conflitos críticos para esta semana.</p>
                                </div>
                            )}

                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                                <p className="font-medium text-sm text-blue-600 dark:text-blue-500 mb-1 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">lightbulb</span> Dica da LIA
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Você tem várias reuniões na terça. Tente blocos de foco na quarta.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleReviewSuggestions}
                            className="w-full mt-4 py-2 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">auto_awesome</span> {t('reviewSuggestions')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Suggestions Modal */}
            {isSuggestionsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
                    <div className="glass-panel bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                        <button
                            onClick={() => setIsSuggestionsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-brand-primary transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                <span className="material-symbols-outlined">auto_awesome</span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                Sugestões da LIA
                            </h2>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {conflicts.length > 0 && (
                                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                                    <h4 className="font-bold text-red-600 dark:text-red-400 mb-1 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">warning</span> Corrigir Conflito
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                        Encontrei dois eventos agendados para {new Date(conflicts[0].event1.date).toLocaleDateString()} às {conflicts[0].event1.time}.
                                    </p>
                                    <div className="flex gap-2">
                                        <button className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:opacity-90">Resolver Agora</button>
                                        <button className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10 text-xs font-medium">Ignorar</button>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                                <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">schedule</span> Otimizar Blocos de Foco
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    Sua tarde de quinta-feira está livre. Gostaria de reservar 2 horas para foco profundo em projetos?
                                </p>
                                <button className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-bold hover:opacity-90">Reservar Horário</button>
                            </div>

                            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                                <h4 className="font-bold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">mail</span> Agendar Follow-ups
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    Você teve reuniões com 3 clientes hoje. Deseja agendar e-mails de follow-up para amanhã?
                                </p>
                                <button className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-xs font-bold hover:opacity-90">Agendar Todos</button>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-white/10 flex justify-end">
                            <button
                                onClick={() => setIsSuggestionsModalOpen(false)}
                                className="px-6 py-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-sm font-bold hover:opacity-90 transition-opacity"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
                    <div className="glass-panel bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-brand-primary transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">
                            {currentEvent.id ? t('editEvent') : t('newEvent')}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('eventTitleLabel')}</label>
                                <input
                                    type="text"
                                    value={currentEvent.title}
                                    onChange={(e) => setCurrentEvent({ ...currentEvent, title: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-gray-800 dark:text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                                    placeholder="ex: Reunião de Marketing"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('date')}</label>
                                    <input
                                        type="date"
                                        value={currentEvent.date}
                                        onChange={(e) => setCurrentEvent({ ...currentEvent, date: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-gray-800 dark:text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('timeLabel')}</label>
                                    <input
                                        type="time"
                                        value={currentEvent.time}
                                        onChange={(e) => setCurrentEvent({ ...currentEvent, time: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-gray-800 dark:text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('typeLabel')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {['meeting', 'deadline', 'review', 'other'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setCurrentEvent({ ...currentEvent, type: type as any })}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-colors ${currentEvent.type === type
                                                ? 'bg-brand-primary border-brand-primary text-white shadow-md'
                                                : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-brand-primary/50'
                                                }`}
                                        >
                                            {type === 'meeting' ? 'reunião' : type === 'deadline' ? 'prazo' : type === 'review' ? 'revisão' : 'outro'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Comentários / Descrição</label>
                                <textarea
                                    value={currentEvent.description || ''}
                                    onChange={(e) => setCurrentEvent({ ...currentEvent, description: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-gray-800 dark:text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/50 min-h-[100px] resize-none"
                                    placeholder="Detalhes sobre o evento..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-between mt-8 pt-4 border-t border-gray-200 dark:border-white/10">
                            {currentEvent.id ? (
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 rounded-lg text-red-500 hover:bg-red-500/10 text-sm font-medium transition-colors"
                                >
                                    {t('delete')}
                                </button>
                            ) : <div></div>}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 text-sm font-medium transition-colors"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 rounded-lg bg-brand-primary text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-brand-primary/20"
                                >
                                    {t('saveEvent')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
