
import React, { useState, useContext, useEffect } from 'react';
import Header from './Header';
import { CalendarEvent } from '../types';
import { LanguageContext } from '../App';

// Helpers
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

// Initial mock data with ISO dates (using current year/month for visibility)
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();
const format = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const initialEvents: CalendarEvent[] = [
  { id: '1', title: 'Project Kick-off', date: format(currentYear, currentMonth, 9), time: '10:00 AM', type: 'meeting' },
  { id: '2', title: 'Client Meeting', date: format(currentYear, currentMonth, 15), time: '11:00 AM', type: 'meeting' },
  { id: '3', title: 'Project Delivery', date: format(currentYear, currentMonth, 16), time: '5:00 PM', type: 'deadline' },
  { id: '4', title: 'Design Review', date: format(currentYear, currentMonth, 16), time: '2:00 PM', type: 'review' },
];

const Calendar: React.FC = () => {
  const { t, language } = useContext(LanguageContext);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<'month' | 'year'>('month');
  
  const [currentEvent, setCurrentEvent] = useState<Partial<CalendarEvent>>({
    date: format(today.getFullYear(), today.getMonth(), today.getDate()),
    time: '09:00',
    type: 'meeting',
    title: ''
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

  // Formatting
  const monthName = new Intl.DateTimeFormat(language, { month: 'long' }).format(currentDate);
  const yearNum = currentDate.getFullYear();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2023, 0, i + 1); // Start from a known Sunday
    return new Intl.DateTimeFormat(language, { weekday: 'short' }).format(d);
  });

  // Derived state for sidebar (Upcoming events sorted by date)
  const upcomingEvents = [...events]
    .filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
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
      title: ''
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
      alert(t('featureComingSoon') + ` (${t('reviewSuggestions')})`);
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
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr border-t border-l border-gray-200 dark:border-white/10">
                    {calendarDays.map((dayObj, i) => {
                        const dateStr = format(dayObj.date.getFullYear(), dayObj.date.getMonth(), dayObj.date.getDate());
                        const isToday = dateStr === format(today.getFullYear(), today.getMonth(), today.getDate());
                        const dayEvents = events.filter(e => e.date === dateStr);

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
                                            className={`px-1.5 py-1 rounded text-[10px] font-medium truncate cursor-pointer hover:opacity-80 transition-opacity ${getEventTypeStyles(ev.type)}`}
                                        >
                                            {ev.time} {ev.title}
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
                                className={`p-4 rounded-xl border transition-all hover:scale-105 flex flex-col items-center justify-center ${
                                    isCurrentMonth 
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
                  {upcomingEvents.length === 0 && <p className="text-sm text-gray-500 italic">No upcoming events.</p>}
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
               <p className="text-sm text-gray-500 mb-4">I found opportunities for optimization based on your schedule.</p>
               
               <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-white/50 dark:bg-white/5 border border-yellow-500/30">
                     <p className="font-medium text-sm text-yellow-600 dark:text-yellow-500 mb-1">Conflict Detected</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400">Double booking on 15th at 11:00 AM.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/50 dark:bg-white/5 border border-green-500/30">
                     <p className="font-medium text-sm text-green-600 dark:text-green-500 mb-1">Free Slot</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400">2-hour opening on Friday afternoon.</p>
                  </div>
               </div>
               <button 
                onClick={handleReviewSuggestions}
                className="w-full mt-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-semibold transition-colors"
               >
                  {t('reviewSuggestions')}
               </button>
            </div>
         </div>
      </div>

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
                            onChange={(e) => setCurrentEvent({...currentEvent, title: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-gray-800 dark:text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                            placeholder="e.g. Marketing Sync"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('date')}</label>
                            <input 
                                type="date" 
                                value={currentEvent.date}
                                onChange={(e) => setCurrentEvent({...currentEvent, date: e.target.value})}
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-gray-800 dark:text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('timeLabel')}</label>
                            <input 
                                type="time" 
                                value={currentEvent.time}
                                onChange={(e) => setCurrentEvent({...currentEvent, time: e.target.value})}
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
                                    onClick={() => setCurrentEvent({...currentEvent, type: type as any})}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-colors ${
                                        currentEvent.type === type 
                                        ? 'bg-brand-primary border-brand-primary text-white shadow-md' 
                                        : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-brand-primary/50'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
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
