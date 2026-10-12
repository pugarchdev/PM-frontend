import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { AlertItem, LeaveRequest } from '../types.ts';
import { StatusBadge, SeverityBadge } from '../components/StatusBadge.tsx';
import {
  AlertTriangle,
  AlertOctagon,
  Flag,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Filter,
  CheckSquare,
  Sparkles,
  Calendar,
  Plane,
  ChevronDown,
  X,
  CheckCheck,
  RotateCcw,
  Ban,
} from 'lucide-react';

const leaveStatusStyle = (status: string) => {
  switch (status) {
    case 'Approved': return 'bg-[#EBF2EB] text-[#2D5A34] border-[#C6DEC7]';
    case 'Sent back': return 'bg-[#FFF8E6] text-[#B45309] border-[#FDE68A]';
    case 'Declined': return 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]';
    default: return 'bg-[#F2EDE2] text-[#70685F] border-[#DDD6C8]';
  }
};

const fmtDate = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

interface AlertsViewProps {
  onSelectProject: (projectId: string, initialTab?: string) => void;
  onSelectIssue?: (issueId: string) => void;
  onShowCalendar?: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ onSelectProject, onShowCalendar }) => {
  const { currentUser, isCEO } = useAuth();
  const [data, setData] = useState<{
    summary: any;
    groupedByProject: Record<string, { projectName: string; alerts: AlertItem[] }>;
    alerts: AlertItem[];
    myTasks: any[];
  } | null>(null);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayEventsLoading, setTodayEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'RISKS' | 'MY_TASKS'>('ALL');

  // Leave requests (CEO only)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [showLeaveSection, setShowLeaveSection] = useState(true);
  const [decidingLeave, setDecidingLeave] = useState<LeaveRequest | null>(null);
  const [leaveDecisionAction, setLeaveDecisionAction] = useState<'APPROVE' | 'SEND_BACK' | 'REJECT'>('APPROVE');
  const [leaveReviewNote, setLeaveReviewNote] = useState('');
  const [leaveDeciding, setLeaveDeciding] = useState(false);
  const [leaveToast, setLeaveToast] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/alerts');
      if (!res.ok) throw new Error('Failed to load attention stream');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching alerts');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayEvents = async () => {
    try {
      setTodayEventsLoading(true);
      const res = await apiFetch('/api/calendar/today');
      if (res.ok) {
        const events = await res.json();
        setTodayEvents(events);
      }
    } catch (err) {
      // Silent fail for today's events - it's just a preview
    } finally {
      setTodayEventsLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    if (!isCEO) return;
    try {
      setLeaveLoading(true);
      const res = await apiFetch('/api/leave');
      if (res.ok) {
        const data = await res.json();
        setLeaveRequests(data);
      }
    } catch {
      // silent
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleLeaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decidingLeave) return;
    if (submittingRef.current || leaveDeciding) return;
    submittingRef.current = true;
    setLeaveDeciding(true);

    try {
      const res = await apiFetch(`/api/leave/${decidingLeave.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: leaveDecisionAction,
          reviewNote: leaveReviewNote.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to process decision');
      }

      setDecidingLeave(null);
      setLeaveReviewNote('');
      const actionLabel = leaveDecisionAction === 'APPROVE' ? 'approved' : leaveDecisionAction === 'SEND_BACK' ? 'sent back' : 'declined';
      setLeaveToast(`Leave request ${actionLabel} successfully`);
      setTimeout(() => setLeaveToast(null), 4000);
      fetchLeaveRequests();
    } catch (err: any) {
      setLeaveToast(err.message || 'Failed to process decision');
      setTimeout(() => setLeaveToast(null), 4000);
    } finally {
      submittingRef.current = false;
      setLeaveDeciding(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchTodayEvents();
    fetchLeaveRequests();
  }, [currentUser]);

  const filteredAlerts = (data?.alerts || []).filter((item) => {
    if (activeFilter === 'CRITICAL') return item.category === 'CRITICAL_ISSUE';
    if (activeFilter === 'RISKS') return item.category === 'HIGH_RISK' || item.category === 'RISK_FLAG';
    if (activeFilter === 'MY_TASKS') return item.category === 'TASK' || item.category === 'QUALITY_CHECK';
    return true;
  });

  const pendingLeave = leaveRequests.filter((l) => l.status === 'Pending');

  return (
    <div className="space-y-5 sm:space-y-6 pb-20 sm:pb-24 max-w-full overflow-hidden sm:overflow-visible">
      {/* Leave toast */}
      {leaveToast && (
        <div className="fixed top-16 right-4 left-4 sm:left-auto z-50 p-4 rounded-2xl bg-[#231E1B] text-white text-xs font-semibold shadow-xl animate-in fade-in">
          {leaveToast}
        </div>
      )}

      {/* Header — title + Refresh */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-[#231E1B] tracking-tight">
            Attention Stream
          </h1>
          <p className="text-xs lg:text-sm text-[#70675D] mt-0.5 break-words">
            Live operational pulse, critical blockers, and action items for {currentUser?.name}.
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="shrink-0 px-3.5 py-2 sm:px-4 rounded-full text-xs lg:text-xs font-semibold bg-[#F5F1E8] hover:bg-[#EAE4D6] active:scale-95 border border-[#DDD6C8] text-[#5A524A] transition-all cursor-pointer min-h-[36px] sm:min-h-[44px] flex items-center gap-1.5 shadow-2xs"
        >
          <Clock className="w-3.5 h-3.5" />
          <span className="sm:hidden">Refresh</span>
          <span className="hidden sm:inline">Refresh Pulse</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      {data?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#EAE3D5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-bold text-[#8C2B2B] uppercase tracking-wider truncate">
                Critical Issues
              </span>
              <AlertOctagon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#B3261E] shrink-0" />
            </div>
            <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold font-serif text-[#231E1B]">
              {data.summary.criticalIssuesCount}
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#70675D] mt-0.5 truncate">Affects status</span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-[#EAE3D5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-bold text-[#B45309] uppercase tracking-wider truncate">
                High Risks
              </span>
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D97706] shrink-0" />
            </div>
            <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold font-serif text-[#231E1B]">
              {data.summary.highRisksCount}
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#70675D] mt-0.5 truncate">Leadership view</span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-[#EAE3D5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-bold text-[#6B7280] uppercase tracking-wider truncate">
                Blocked Tasks
              </span>
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6B7280] shrink-0" />
            </div>
            <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold font-serif text-[#231E1B]">
              {data.summary.blockedTasksCount}
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#70675D] mt-0.5 truncate">Work stoppage</span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-[#EAE3D5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-bold text-[#2D5A34] uppercase tracking-wider truncate">
                Active Tasks
              </span>
              <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#407B4A] shrink-0" />
            </div>
            <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold font-serif text-[#231E1B]">
              {data.summary.myTasksCount}
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#70675D] mt-0.5 truncate">Assigned to you</span>
          </div>
        </div>
      )}

      {/* Today's Calendar Preview */}
      <div className="bg-white border border-[#E8E2D5] rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#C85A32]" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-[#231E1B]">Today's Calendar</h3>
          </div>
          <button
            onClick={fetchTodayEvents}
            className="text-xs text-[#70675D] hover:text-[#C85A32] flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-[#FAF7F2] transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
        
        {todayEventsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[#FAF7F2] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : todayEvents.length === 0 ? (
          <div className="py-4 text-center text-xs sm:text-sm text-[#A8A195]">
            No events scheduled for today
          </div>
        ) : (
          <div className="space-y-2">
            {todayEvents.slice(0, 5).map((event) => {
              const { extendedProps } = event;
              return (
                <div
                  key={event.id}
                  onClick={() => {
                    // Navigate to the appropriate page based on event type
                    if (extendedProps.projectId) {
                      switch (extendedProps.type) {
                        case 'task':
                          onSelectProject(extendedProps.projectId, 'tasks');
                          break;
                        case 'milestone':
                          onSelectProject(extendedProps.projectId, 'milestones');
                          break;
                        case 'approval':
                          onSelectProject(extendedProps.projectId, 'approvals');
                          break;
                        case 'risk':
                          onSelectProject(extendedProps.projectId, 'risks');
                          break;
                        case 'issue':
                          onSelectProject(extendedProps.projectId, 'issues');
                          break;
                        default:
                          break;
                      }
                    }
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] hover:opacity-90 min-h-[44px] ${
                    extendedProps.type === 'task' ? 'bg-blue-50 border-blue-200' :
                    extendedProps.type === 'milestone' ? 'bg-green-50 border-green-200' :
                    extendedProps.type === 'approval' ? 'bg-yellow-50 border-yellow-200' :
                    extendedProps.type === 'risk' ? 'bg-orange-50 border-orange-200' :
                    extendedProps.type === 'issue' ? 'bg-red-50 border-red-200' :
                    'bg-purple-50 border-purple-200'
                  } ${!extendedProps.projectId ? 'cursor-default hover:opacity-100' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-xs sm:text-sm text-[#231E1B] truncate">
                      {event.title}
                    </div>
                    <div className="text-[10px] sm:text-xs text-[#70675D] capitalize shrink-0 font-medium">
                      {extendedProps.type}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#70675D] mt-0.5 truncate">
                    {extendedProps.projectName || 'Personal reminder'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="pt-2 border-t border-[#E8E2D5]">
          <button
            onClick={() => {
              if (onShowCalendar) {
                onShowCalendar();
              }
            }}
            className="w-full py-2.5 rounded-xl bg-[#F5F1E8] hover:bg-[#EDE7DC] active:scale-[0.99] border border-[#E0D9CB] text-[#70685F] hover:text-[#231E1B] text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
          >
            <Calendar className="w-4 h-4 text-[#C85A32]" />
            View Full Calendar
          </button>
        </div>
      </div>

      {/* ─── CEO: Leave Approvals ──────────────────────────────────────────────── */}
      {isCEO && (
        <div className="bg-white border border-[#EAE3D5] rounded-2xl shadow-xs overflow-hidden">
          <button
            onClick={() => setShowLeaveSection(!showLeaveSection)}
            className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 cursor-pointer hover:bg-[#FAF8F4] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-[#C85A32]" />
              <span className="font-serif font-bold text-sm text-[#231E1B]">Leave Requests</span>
              {pendingLeave.length > 0 && (
                <span className="text-[10px] font-bold bg-[#C85A32] text-white px-2 py-0.5 rounded-full">
                  {pendingLeave.length} pending
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-[#70685F] transition-transform duration-200 ${showLeaveSection ? 'rotate-180' : ''}`}
            />
          </button>

          {showLeaveSection && (
            <div className="border-t border-[#EAE3D5] px-4 sm:px-5 py-4 space-y-3">
              {leaveLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-14 bg-[#FAF7F2] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <Plane className="w-8 h-8 text-[#DDD6C8] mx-auto" />
                  <p className="text-xs text-[#70685F]">No leave requests have been submitted.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {leaveRequests.map((leave) => (
                    <div
                      key={leave.id}
                      className={`p-3.5 rounded-xl border space-y-2 ${
                        leave.status === 'Pending'
                          ? 'bg-[#FFFDF9] border-[#F5DDB8]'
                          : 'bg-[#FAF8F4] border-[#EDE7DC]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={
                              leave.requester?.avatarUrl ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${leave.requester?.name || 'User'}`
                            }
                            alt={leave.requester?.name}
                            className="w-8 h-8 rounded-full border border-white shadow-2xs shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#231E1B] truncate">
                              {leave.requester?.name}
                            </div>
                            <div className="text-[10px] text-[#70685F]">
                              {leave.requester?.department || leave.requester?.role}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0 ${leaveStatusStyle(leave.status)}`}
                        >
                          {leave.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-semibold text-[#231E1B]">{leave.leaveType}</span>
                        <span className="text-[#70685F]">·</span>
                        <span className="text-[#70685F]">{leave.dayType}</span>
                        <span className="text-[#70685F]">·</span>
                        <span className="text-[#70685F]">
                          {fmtDate(leave.startDate)}
                          {leave.startDate !== leave.endDate ? ` – ${fmtDate(leave.endDate)}` : ''}
                        </span>
                      </div>

                      {leave.reason && (
                        <p className="text-[11px] text-[#8C8275] italic line-clamp-2">"{leave.reason}"</p>
                      )}

                      {leave.reviewNote && leave.status !== 'Pending' && (
                        <div className={`text-[11px] rounded-lg px-3 py-2 ${
                          leave.status === 'Declined'
                            ? 'bg-[#FEE2E2] text-[#991B1B]'
                            : leave.status === 'Sent back'
                            ? 'bg-[#FFF8E6] text-[#92400E]'
                            : 'bg-[#EBF2EB] text-[#2D5A34]'
                        }`}>
                          <strong>Note:</strong> {leave.reviewNote}
                        </div>
                      )}

                      {/* Decision Buttons (only for Pending) */}
                      {leave.status === 'Pending' && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            id={`leave-approve-${leave.id}`}
                            onClick={() => {
                              setDecidingLeave(leave);
                              setLeaveDecisionAction('APPROVE');
                              setLeaveReviewNote('');
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2D5A34] hover:bg-[#1E3E23] text-white text-[11px] font-semibold transition-all active:scale-95 cursor-pointer min-h-[36px]"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            id={`leave-sendback-${leave.id}`}
                            onClick={() => {
                              setDecidingLeave(leave);
                              setLeaveDecisionAction('SEND_BACK');
                              setLeaveReviewNote('');
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#EDE7DC] text-[#70685F] text-[11px] font-semibold border border-[#DDD6C8] transition-all active:scale-95 cursor-pointer min-h-[36px]"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Send Back
                          </button>
                          <button
                            id={`leave-reject-${leave.id}`}
                            onClick={() => {
                              setDecidingLeave(leave);
                              setLeaveDecisionAction('REJECT');
                              setLeaveReviewNote('');
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FEE2E2] hover:bg-[#FECACA] text-[#991B1B] text-[11px] font-semibold border border-[#FECACA] transition-all active:scale-95 cursor-pointer min-h-[36px]"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── CEO Leave Decision Modal ────────────────────────────────────────────── */}
      {decidingLeave && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setDecidingLeave(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#E8E2D5] space-y-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />

            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#231E1B]">
                  {leaveDecisionAction === 'APPROVE'
                    ? 'Approve Leave Request'
                    : leaveDecisionAction === 'SEND_BACK'
                    ? 'Send Back for Clarification'
                    : 'Decline Leave Request'}
                </h3>
                <p className="text-xs text-[#70685F] mt-0.5">
                  {decidingLeave.requester?.name} · {decidingLeave.leaveType} · {decidingLeave.dayType}
                </p>
                <p className="text-[11px] text-[#8C8275] mt-0.5">
                  {fmtDate(decidingLeave.startDate)}
                  {decidingLeave.startDate !== decidingLeave.endDate ? ` – ${fmtDate(decidingLeave.endDate)}` : ''}
                </p>
              </div>
              <button
                onClick={() => setDecidingLeave(null)}
                className="p-2 text-gray-400 hover:text-black rounded-xl hover:bg-[#F5F1E8] min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLeaveDecision} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  {leaveDecisionAction === 'APPROVE'
                    ? 'Note (optional)'
                    : 'Note (required) *'}
                </label>
                <textarea
                  rows={3}
                  required={leaveDecisionAction !== 'APPROVE'}
                  value={leaveReviewNote}
                  onChange={(e) => setLeaveReviewNote(e.target.value)}
                  placeholder={
                    leaveDecisionAction === 'APPROVE'
                      ? 'Any notes for the employee...'
                      : leaveDecisionAction === 'SEND_BACK'
                      ? 'Specify what clarification or change is needed...'
                      : 'Reason for declining this leave request...'
                  }
                  className="w-full bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1B] focus:ring-1 focus:ring-[#C85A32] resize-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDecidingLeave(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#DDD6C8] text-xs font-semibold text-[#70685F] hover:bg-[#EDE7DC] active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leaveDeciding}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-95 transition-all min-h-[44px] disabled:opacity-60 ${
                    leaveDecisionAction === 'APPROVE'
                      ? 'bg-[#2D5A34] hover:bg-[#1E3E23]'
                      : leaveDecisionAction === 'SEND_BACK'
                      ? 'bg-[#B45309] hover:bg-[#92400E]'
                      : 'bg-[#991B1B] hover:bg-[#7F1D1D]'
                  }`}
                >
                  {leaveDeciding
                    ? 'Processing...'
                    : leaveDecisionAction === 'APPROVE'
                    ? 'Confirm Approval'
                    : leaveDecisionAction === 'SEND_BACK'
                    ? 'Send Back'
                    : 'Decline Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter — compact select on mobile, chips on sm+ */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-[#C85A32] sm:text-[#70685F] shrink-0" />
        <span className="hidden sm:inline text-xs text-[#7A7165] font-medium pl-0.5">Filter:</span>
        {/* Mobile: native select */}
        <select
          className="sm:hidden flex-1 px-3 py-2 rounded-full border border-[#DDD6C8] bg-white text-xs font-semibold text-[#231E1B] focus:outline-none min-h-[36px] cursor-pointer"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as any)}
        >
          <option value="ALL">All Items</option>
          <option value="CRITICAL">Critical Issues</option>
          <option value="RISKS">Risks &amp; Flags</option>
          <option value="MY_TASKS">My Assigned Work</option>
        </select>
        {/* Desktop: pill chips */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { key: 'ALL', label: 'All Items' },
            { key: 'CRITICAL', label: 'Critical Issues' },
            { key: 'RISKS', label: 'Risks & Flags' },
            { key: 'MY_TASKS', label: 'My Assigned Work' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key as any)}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all min-h-[36px] sm:min-h-[40px] cursor-pointer shrink-0 active:scale-95 flex items-center justify-center ${
                activeFilter === f.key
                  ? 'bg-[#C85A32] text-white shadow-xs font-semibold'
                  : 'bg-[#F3EFE6] text-[#554F47] hover:bg-[#EAE4D6]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
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
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchAlerts}
            className="px-3 py-1 rounded-lg bg-white border border-[#F87171] text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredAlerts.length === 0 && (
        <div className="p-8 rounded-2xl bg-white border border-[#EAE3D5] text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-[#526E55] mx-auto" />
          <h3 className="font-serif text-lg font-bold text-[#231E1B]">All clear! No pending alerts</h3>
          <p className="text-xs text-[#70675D] max-w-sm mx-auto">
            There are no open critical issues, unmitigated risks, or blocked tasks matching your filter.
          </p>
        </div>
      )}

      {/* Real database events stream */}
      {!loading && !error && filteredAlerts.length > 0 && (
        <div className="space-y-3">
          {filteredAlerts.map((item) => {
            return (
              <div
                key={item.id}
                id={`alert-card-${item.id}`}
                onClick={() => {
                  if (item.category === 'CRITICAL_ISSUE') {
                    onSelectProject(item.projectId, 'issues');
                  } else if (item.category === 'HIGH_RISK') {
                    onSelectProject(item.projectId, 'risks');
                  } else {
                    onSelectProject(item.projectId, 'tasks');
                  }
                }}
                className="p-4 rounded-2xl bg-white border border-[#EAE3D5] hover:border-[#D5C9B8] hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[#8C6D58] bg-[#F5F0E6] px-2.5 py-0.5 rounded-full">
                        {item.projectName}
                      </span>
                      {item.severity === 'Critical' && (
                        <SeverityBadge severity="Critical" />
                      )}
                      {item.severity === 'High' && (
                        <SeverityBadge severity="High" />
                      )}
                      {item.category === 'BLOCKED' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B]">
                          BLOCKED
                        </span>
                      )}
                    </div>

                    <h4 className="font-semibold text-sm text-[#231E1B] group-hover:text-[#C85A32] transition-colors line-clamp-2">
                      {item.title}
                    </h4>

                    <p className="text-xs text-[#70675D] line-clamp-2">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-[#8C7E70] group-hover:text-[#C85A32] transition-colors pt-1">
                    <span className="text-xs font-medium hidden sm:inline">View</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* User's assigned tasks list */}
      {data?.myTasks && data.myTasks.length > 0 && (
        <div className="pt-4 border-t border-[#E8E2D5] space-y-3">
          <h3 className="font-serif text-lg font-bold text-[#231E1B] flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#C85A32]" />
            Your Open Tasks
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.myTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectProject(t.phase.project.id, 'tasks')}
                className="p-3.5 rounded-2xl bg-white border border-[#EAE3D5] hover:border-[#C85A32]/40 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8C6D58] font-medium">{t.phase.project.name}</span>
                  <span className="text-[#70675D]">{t.plannedHours}h planned</span>
                </div>
                <div className="font-medium text-sm text-[#231E1B] line-clamp-1">{t.title}</div>
                <div className="flex items-center justify-between text-xs text-[#70675D]">
                  <span>Due: {new Date(t.plannedEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#F5F1E8] text-[#554F47] text-[10px]">
                    {t.state}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
