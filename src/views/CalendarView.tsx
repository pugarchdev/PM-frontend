import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { Calendar, Plus, X, Edit2, Trash2, Check, ArrowLeft } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  color: string;
  extendedProps: {
    type: 'task' | 'milestone' | 'approval' | 'risk' | 'issue' | 'reminder';
    projectId?: string;
    projectName?: string;
    taskId?: string;
    milestoneId?: string;
    approvalId?: string;
    riskId?: string;
    issueId?: string;
    reminderId?: string;
    [key: string]: any;
  };
}

interface ReminderFormData {
  title: string;
  description: string;
  reminderDate: string;
}

interface CalendarViewProps {
  onSelectProject: (projectId: string, initialTab?: string) => void;
  onBack?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onSelectProject, onBack }) => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderForm, setReminderForm] = useState<ReminderFormData>({
    title: '',
    description: '',
    reminderDate: new Date().toISOString().split('T')[0],
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate date range based on view
      const start = new Date(currentDate);
      const end = new Date(currentDate);
      
      if (view === 'month') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
      } else if (view === 'week') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday start
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else { // day view
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      }
      
      const res = await apiFetch(`/api/calendar?start=${start.toISOString()}&end=${end.toISOString()}`);
      if (!res.ok) throw new Error('Failed to load calendar events');
      const data = await res.json();
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching calendar events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchEvents();
    }
  }, [currentUser, view, currentDate]);

  const handleEventClick = (event: CalendarEvent) => {
    const { extendedProps } = event;
    
    switch (extendedProps.type) {
      case 'task':
        if (extendedProps.projectId && extendedProps.taskId) {
          onSelectProject(extendedProps.projectId, 'tasks');
        }
        break;
      case 'milestone':
        if (extendedProps.projectId) {
          onSelectProject(extendedProps.projectId, 'milestones');
        }
        break;
      case 'approval':
        if (extendedProps.projectId) {
          onSelectProject(extendedProps.projectId, 'approvals');
        }
        break;
      case 'risk':
        if (extendedProps.projectId) {
          onSelectProject(extendedProps.projectId, 'risks');
        }
        break;
      case 'issue':
        if (extendedProps.projectId) {
          onSelectProject(extendedProps.projectId, 'issues');
        }
        break;
      case 'reminder':
        // Reminders are handled in modal
        break;
    }
  };

  const [submittingReminder, setSubmittingReminder] = useState(false);
  const submittingReminderRef = useRef(false);

  const handleCreateReminder = async () => {
    if (submittingReminderRef.current || submittingReminder) return;
    submittingReminderRef.current = true;
    setSubmittingReminder(true);
    try {
      const res = await apiFetch('/api/calendar/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminderForm),
      });
      
      if (!res.ok) throw new Error('Failed to create reminder');
      
      setShowReminderModal(false);
      setReminderForm({
        title: '',
        description: '',
        reminderDate: new Date().toISOString().split('T')[0],
      });
      fetchEvents(); // Refresh events
    } catch (err: any) {
      setError(err.message || 'Error creating reminder');
    } finally {
      submittingReminderRef.current = false;
      setSubmittingReminder(false);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    
    try {
      const res = await apiFetch(`/api/calendar/reminders/${reminderId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to delete reminder');
      
      fetchEvents(); // Refresh events
    } catch (err: any) {
      setError(err.message || 'Error deleting reminder');
    }
  };

  const handleCompleteReminder = async (reminderId: string) => {
    try {
      const res = await apiFetch(`/api/calendar/reminders/${reminderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: true }),
      });
      
      if (!res.ok) throw new Error('Failed to complete reminder');
      
      fetchEvents(); // Refresh events
    } catch (err: any) {
      setError(err.message || 'Error completing reminder');
    }
  };

  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);
    
    if (direction === 'today') {
      setCurrentDate(new Date());
    } else if (direction === 'prev') {
      if (view === 'month') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (view === 'week') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() - 1);
      }
      setCurrentDate(newDate);
    } else if (direction === 'next') {
      if (view === 'month') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (view === 'week') {
        newDate.setDate(newDate.getDate() + 7);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
      setCurrentDate(newDate);
    }
  };

  const getDateRangeText = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    
    if (view === 'month') {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (view === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      end.setDate(start.getDate() + 6);
      
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`;
      } else {
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
    } else {
      return start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'milestone': return 'bg-green-100 text-green-800 border-green-200';
      case 'approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'risk': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'issue': return 'bg-red-100 text-red-800 border-red-200';
      case 'reminder': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'task': return 'Task';
      case 'milestone': return 'Milestone';
      case 'approval': return 'Approval';
      case 'risk': return 'Risk';
      case 'issue': return 'Issue';
      case 'reminder': return 'Reminder';
      default: return 'Event';
    }
  };

  // Simple calendar grid for month view
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
    let firstDayOfWeek = firstDay.getDay();
    // Adjust to start on Monday
    if (firstDayOfWeek === 0) firstDayOfWeek = 6;
    else firstDayOfWeek -= 1;
    
    const weeks = [];
    let day = 1;
    
    for (let week = 0; week < 6; week++) {
      const days = [];
      
      for (let weekDay = 0; weekDay < 7; weekDay++) {
        if (week === 0 && weekDay < firstDayOfWeek) {
          // Empty days before first day of month
          const prevMonthDay = new Date(year, month, 0 - (firstDayOfWeek - weekDay - 1));
          days.push(
            <div key={`empty-${weekDay}`} className="h-20 sm:h-32 p-1 border border-[#E8E2D5] bg-[#FAF7F2]">
              <div className="text-[10px] sm:text-xs text-[#A8A195] text-right">
                {prevMonthDay.getDate()}
              </div>
            </div>
          );
        } else if (day > daysInMonth) {
          // Empty days after last day of month
          const nextMonthDay = new Date(year, month + 1, day - daysInMonth);
          days.push(
            <div key={`empty-end-${weekDay}`} className="h-20 sm:h-32 p-1 border border-[#E8E2D5] bg-[#FAF7F2]">
              <div className="text-[10px] sm:text-xs text-[#A8A195] text-right">
                {nextMonthDay.getDate()}
              </div>
            </div>
          );
          day++;
        } else {
          const currentDay = new Date(year, month, day);
          const dayEvents = events.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate.getDate() === day && 
                   eventDate.getMonth() === month && 
                   eventDate.getFullYear() === year;
          });
          
          const isToday = currentDay.toDateString() === new Date().toDateString();
          
          days.push(
            <div 
              key={day} 
              className={`h-20 sm:h-32 p-1 sm:p-1.5 border border-[#E8E2D5] ${isToday ? 'bg-[#FBECE6]' : 'bg-white'}`}
            >
              <div className="flex justify-between items-center mb-0.5 sm:mb-1">
                <span className={`text-[9px] sm:text-xs font-semibold ${isToday ? 'text-[#C85A32]' : 'text-[#70675D]'}`}>
                  {currentDay.toLocaleDateString('en-US', { weekday: 'narrow' })}
                </span>
                <span className={`text-xs sm:text-sm font-bold ${isToday ? 'text-[#C85A32]' : 'text-[#231E1B]'}`}>
                  {day}
                </span>
              </div>
              
              <div className="space-y-0.5 sm:space-y-1 overflow-y-auto max-h-12 sm:max-h-24 no-scrollbar">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className={`text-[10px] sm:text-xs p-1 sm:p-1.5 rounded-md sm:rounded-lg border cursor-pointer transition-transform active:scale-95 hover:opacity-90 ${
                      getEventTypeColor(event.extendedProps.type)
                    }`}
                  >
                    <div className="font-semibold truncate leading-tight">{event.title}</div>
                    <div className="text-[9px] sm:text-[10px] opacity-75 truncate hidden sm:block">
                      {getEventTypeLabel(event.extendedProps.type)}
                      {event.extendedProps.projectName && ` • ${event.extendedProps.projectName}`}
                    </div>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] sm:text-xs font-medium text-[#70675D] px-0.5">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
          day++;
        }
      }
      
      weeks.push(
        <div key={week} className="grid grid-cols-7 gap-0">
          {days}
        </div>
      );
      
      if (day > daysInMonth) break;
    }
    
    return weeks;
  };

  const renderWeekView = () => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(start);
      currentDay.setDate(start.getDate() + i);
      
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate.getDate() === currentDay.getDate() && 
               eventDate.getMonth() === currentDay.getMonth() && 
               eventDate.getFullYear() === currentDay.getFullYear();
      });
      
      const isToday = currentDay.toDateString() === new Date().toDateString();
      
      days.push(
        <div key={i} className="min-w-[140px] sm:min-w-0 flex-1 border border-[#E8E2D5] bg-white">
          <div className={`p-2.5 sm:p-3 border-b border-[#E8E2D5] ${isToday ? 'bg-[#FBECE6]' : 'bg-[#FAF7F2]'}`}>
            <div className="text-[10px] sm:text-xs font-semibold text-[#70675D]">
              {currentDay.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
            </div>
            <div className={`text-base sm:text-lg font-bold ${isToday ? 'text-[#C85A32]' : 'text-[#231E1B]'}`}>
              {currentDay.getDate()}
            </div>
            <div className="text-[10px] sm:text-xs text-[#70675D]">
              {currentDay.toLocaleDateString('en-US', { month: 'short' })}
            </div>
          </div>
          
          <div className="p-2 space-y-2 overflow-y-auto" style={{ height: 'min(calc(100dvh - 320px), 500px)', minHeight: '200px' }}>
            {dayEvents.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#A8A195]">
                No events
              </div>
            ) : (
              dayEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className={`p-2 sm:p-3 rounded-xl border cursor-pointer transition-transform active:scale-95 hover:opacity-90 ${
                    getEventTypeColor(event.extendedProps.type)
                  }`}
                >
                  <div className="font-semibold text-xs sm:text-sm mb-0.5 leading-tight">{event.title}</div>
                  <div className="text-[10px] sm:text-xs opacity-75 mb-1.5">
                    {getEventTypeLabel(event.extendedProps.type)}
                    {event.extendedProps.projectName && ` • ${event.extendedProps.projectName}`}
                  </div>
                  {event.extendedProps.type === 'reminder' && (
                    <div className="flex gap-1 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteReminder(event.extendedProps.reminderId);
                        }}
                        className="text-[10px] px-2 py-1 rounded-lg bg-white border border-green-200 text-green-700 hover:bg-green-50 font-medium active:scale-95"
                      >
                        <Check className="w-3 h-3 inline mr-0.5" />
                        Done
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReminder(event.extendedProps.reminderId);
                        }}
                        className="text-[10px] px-2 py-1 rounded-lg bg-white border border-red-200 text-red-700 hover:bg-red-50 font-medium active:scale-95"
                      >
                        <Trash2 className="w-3 h-3 inline mr-0.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex border border-[#E8E2D5] rounded-2xl overflow-x-auto no-scrollbar">
        {days}
      </div>
    );
  };

  const renderDayView = () => {
    const currentDay = new Date(currentDate);
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.getDate() === currentDay.getDate() && 
             eventDate.getMonth() === currentDay.getMonth() && 
             eventDate.getFullYear() === currentDay.getFullYear();
    });
    
    const isToday = currentDay.toDateString() === new Date().toDateString();
    
    // Group events by hour
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="border border-[#E8E2D5] rounded-2xl overflow-hidden bg-white">
        <div className={`p-4 border-b border-[#E8E2D5] ${isToday ? 'bg-[#FBECE6]' : 'bg-[#FAF7F2]'}`}>
          <div className="text-xs font-semibold text-[#70675D]">
            {currentDay.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
          </div>
          <div className="text-xl sm:text-2xl font-bold font-serif text-[#231E1B]">
            {currentDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        
        <div className="divide-y divide-[#E8E2D5] overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 280px)' }}>
          {hours.map(hour => {
            const hourEvents = dayEvents.filter(event => {
              const eventDate = new Date(event.start);
              return eventDate.getHours() === hour;
            });
            
            return (
              <div key={hour} className="flex min-h-14 sm:min-h-16">
                <div className="w-14 sm:w-16 p-2 sm:p-3 border-r border-[#E8E2D5] bg-[#FAF7F2] text-xs sm:text-sm font-medium text-[#70675D] shrink-0 text-center sm:text-left">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                <div className="flex-1 p-2 sm:p-3 space-y-1.5">
                  {hourEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={`p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-transform active:scale-95 hover:opacity-90 ${
                        getEventTypeColor(event.extendedProps.type)
                      }`}
                    >
                      <div className="font-semibold text-xs sm:text-sm mb-0.5">{event.title}</div>
                      <div className="text-[10px] sm:text-xs opacity-75">
                        {getEventTypeLabel(event.extendedProps.type)}
                        {event.extendedProps.projectName && ` • ${event.extendedProps.projectName}`}
                      </div>
                      {event.extendedProps.type === 'reminder' && (
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteReminder(event.extendedProps.reminderId);
                            }}
                            className="text-[10px] sm:text-xs px-2.5 py-1 rounded-lg bg-white border border-green-200 text-green-700 hover:bg-green-50 font-medium active:scale-95"
                          >
                            <Check className="w-3 h-3 inline mr-1" />
                            Done
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReminder(event.extendedProps.reminderId);
                            }}
                            className="text-[10px] sm:text-xs px-2.5 py-1 rounded-lg bg-white border border-red-200 text-red-700 hover:bg-red-50 font-medium active:scale-95"
                          >
                            <Trash2 className="w-3 h-3 inline mr-1" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white/70 border border-[#EAE3D5] animate-pulse space-y-2.5"
          >
            <div className="h-4 w-1/3 bg-[#E8E2D5] rounded-md" />
            <div className="h-3 w-3/4 bg-[#E8E2D5] rounded-md" />
            <div className="h-3 w-1/2 bg-[#E8E2D5] rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Header — back + title + add on same row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                window.history.back();
              }
            }}
            className="p-2 rounded-xl border border-[#E8E2D5] hover:bg-[#FAF7F2] active:scale-95 text-[#70675D] hover:text-[#231E1B] transition-colors cursor-pointer min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center shrink-0"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-[#231E1B]">
              Calendar
            </h1>
            <p className="text-xs lg:text-sm text-[#70675D]">
              Project schedules, deadlines, and reminders
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowReminderModal(true)}
          className="shrink-0 px-3.5 py-2 sm:px-4 lg:py-2 rounded-xl bg-[#C85A32] hover:bg-[#A63C1E] active:scale-95 text-white text-xs lg:text-sm font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer min-h-[36px] sm:min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Reminder</span>
        </button>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white border border-[#E8E2D5] rounded-2xl p-3.5 sm:p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateDate('prev')}
                className="px-3 py-2.5 rounded-xl border border-[#E8E2D5] hover:bg-[#FAF7F2] active:scale-95 text-xs font-semibold text-[#231E1B] cursor-pointer min-h-[44px] flex items-center justify-center"
              >
                ← Prev
              </button>
              
              <button
                onClick={() => navigateDate('today')}
                className="px-3 py-2.5 rounded-xl border border-[#E8E2D5] hover:bg-[#FAF7F2] active:scale-95 text-xs font-semibold text-[#231E1B] cursor-pointer min-h-[44px] flex items-center justify-center"
              >
                Today
              </button>
              
              <button
                onClick={() => navigateDate('next')}
                className="px-3 py-2.5 rounded-xl border border-[#E8E2D5] hover:bg-[#FAF7F2] active:scale-95 text-xs font-semibold text-[#231E1B] cursor-pointer min-h-[44px] flex items-center justify-center"
              >
                Next →
              </button>
            </div>
            
            <div className="text-sm sm:text-base font-bold font-serif text-[#231E1B] sm:ml-3 truncate">
              {getDateRangeText()}
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E8E2D5]">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-all active:scale-95 text-center min-h-[44px] flex items-center justify-center ${
                  view === v
                    ? 'bg-[#C85A32] text-white shadow-2xs'
                    : 'text-[#70675D] hover:text-[#231E1B]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-3.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchEvents}
              className="px-3 py-1 rounded-lg bg-white border border-[#F87171] text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5">
          {(['task', 'milestone', 'approval', 'risk', 'issue', 'reminder'] as const).map((type) => (
            <div key={type} className="flex items-center gap-1.5 shrink-0 bg-[#FAF7F2] px-2 py-1 rounded-lg border border-[#EDE7DC]">
              <div className={`w-2.5 h-2.5 rounded-full ${getEventTypeColor(type).split(' ')[0]}`} />
              <span className="text-[11px] font-medium text-[#70675D] capitalize">{type}s</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white border border-[#E8E2D5] rounded-2xl overflow-hidden shadow-2xs">
        {view === 'month' && (
          <>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-0 border-b border-[#E8E2D5]">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="py-2 text-center text-[10px] sm:text-xs font-bold text-[#70675D] bg-[#FAF7F2]">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Month grid */}
            <div className="divide-y divide-[#E8E2D5]">
              {renderMonthView()}
            </div>
          </>
        )}
        
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>

      {/* Event Type Summary */}
      <div className="bg-white border border-[#E8E2D5] rounded-2xl p-4">
        <h3 className="font-serif text-base sm:text-lg font-bold text-[#231E1B] mb-3">Event Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {(['task', 'milestone', 'approval', 'risk', 'issue', 'reminder'] as const).map((type) => {
            const count = events.filter(e => e.extendedProps.type === type).length;
            return (
              <div key={type} className="p-3 rounded-xl border border-[#E8E2D5] bg-[#FAF7F2]/60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[#70675D] capitalize">
                    {type}s
                  </span>
                  <div className={`w-2.5 h-2.5 rounded-full ${getEventTypeColor(type).split(' ')[0]}`} />
                </div>
                <div className="text-xl sm:text-2xl font-bold font-serif text-[#231E1B]">
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reminder Modal / Bottom Sheet */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#EAE3D5] space-y-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />
            
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base sm:text-lg font-bold text-[#231E1B]">Add Personal Reminder</h3>
              <button
                onClick={() => setShowReminderModal(false)}
                className="p-1.5 rounded-xl hover:bg-[#FAF7F2] active:scale-95 text-[#70675D] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#70675D] mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D5] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C85A32] focus:border-transparent min-h-[44px]"
                  placeholder="e.g., Follow up with team"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[#70675D] mb-1">
                  Description
                </label>
                <textarea
                  value={reminderForm.description}
                  onChange={(e) => setReminderForm({ ...reminderForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D5] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C85A32] focus:border-transparent"
                  placeholder="Optional details..."
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[#70675D] mb-1">
                  Reminder Date *
                </label>
                <input
                  type="date"
                  value={reminderForm.reminderDate}
                  onChange={(e) => setReminderForm({ ...reminderForm, reminderDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D5] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C85A32] focus:border-transparent min-h-[44px]"
                />
              </div>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#E8E2D5] hover:bg-[#FAF7F2] active:scale-95 text-xs font-semibold text-[#70675D] cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateReminder}
                disabled={!reminderForm.title || !reminderForm.reminderDate || submittingReminder}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#A63C1E] active:scale-95 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[44px] shadow-xs"
              >
                {submittingReminder ? 'Adding...' : 'Add Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};