import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { Project, Phase, Task, Issue, Risk, Milestone, QualityCheck } from '../types.ts';
import { StatusBadge, PriorityBadge, SeverityBadge, TaskStateBadge } from '../components/StatusBadge.tsx';
import { ProjectChatTab } from '../components/ProjectChatTab.tsx';
import { ProjectBudgetTab } from '../components/ProjectBudgetTab.tsx';
import { ProjectApprovalsTab } from '../components/ProjectApprovalsTab.tsx';
import { ProjectBaselinesTab } from '../components/ProjectBaselinesTab.tsx';
import { ProjectDocumentsTab } from '../components/ProjectDocumentsTab.tsx';
import { ProjectChangeLogTab } from '../components/ProjectChangeLogTab.tsx';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Milestone as MilestoneIcon,
  Plus,
  Edit2,
  Trash2,
  Archive,
  Lock,
  Clock,
  ShieldCheck,
  Flag,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertOctagon,
  X,
  History,
} from 'lucide-react';

interface ProjectDetailViewProps {
  projectId: string;
  initialTab?: string;
  onBack: () => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  projectId,
  initialTab = 'phases',
  onBack,
}) => {
  const { currentUser, isCEO, isProjectOwner, isEmployee } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'phases'
    | 'issues'
    | 'risks'
    | 'milestones'
    | 'budget'
    | 'approvals'
    | 'baselines'
    | 'documents'
    | 'chat'
    | 'changelog'
  >((initialTab as any) || 'phases');

  // Modals & Action states
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState('ON_TRACK');
  const [overrideReason, setOverrideReason] = useState('');

  const [showNewPhaseModal, setShowNewPhaseModal] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseStart, setNewPhaseStart] = useState('');
  const [newPhaseEnd, setNewPhaseEnd] = useState('');

  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Normal' | 'High'>('Normal');
  const [newTaskPlannedStart, setNewTaskPlannedStart] = useState('');
  const [newTaskPlannedEnd, setNewTaskPlannedEnd] = useState('');
  const [newTaskPlannedHours, setNewTaskPlannedHours] = useState(8);

  const [showNewIssueModal, setShowNewIssueModal] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueSeverity, setNewIssueSeverity] = useState<'Minor' | 'Major' | 'Critical'>('Major');
  const [newIssueDetail, setNewIssueDetail] = useState('');

  const [showNewRiskModal, setShowNewRiskModal] = useState(false);
  const [newRiskDesc, setNewRiskDesc] = useState('');
  const [newRiskSeverity, setNewRiskSeverity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [newRiskMitigation, setNewRiskMitigation] = useState('');

  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenIssueId, setReopenIssueId] = useState<string | null>(null);
  const [reopenComment, setReopenComment] = useState('');

  const [showNewMilestoneModal, setShowNewMilestoneModal] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneBaseline, setNewMilestoneBaseline] = useState('');
  const [newMilestoneForecast, setNewMilestoneForecast] = useState('');

  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [assignableUsers, setAssignableUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);

  const showToast = (type: 'error' | 'success', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const fetchProject = async (showLoading = false) => {
    try {
      if (showLoading && !project) {
        setLoading(true);
      }
      setError(null);
      const res = await apiFetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to load project details');
      }
      const data = await res.json();
      setProject(data);
      // default phase start/end to project dates
      if (data && showLoading && !project) {
        setNewPhaseStart(data.startDate.slice(0, 10));
        setNewPhaseEnd(data.endDate.slice(0, 10));
        setNewTaskPlannedStart(data.startDate.slice(0, 10));
        setNewTaskPlannedEnd(data.endDate.slice(0, 10));
        setNewMilestoneBaseline(data.startDate.slice(0, 10));
        setNewMilestoneForecast(data.startDate.slice(0, 10));
      }
    } catch (err: any) {
      if (!project) {
        setError(err.message || 'Error fetching project');
      }
    } finally {
      if (showLoading && !project) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchProject(!project);
  }, [projectId, currentUser?.id]);

  // STATUS OVERRIDE SUBMISSION
  const handleStatusOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      showToast('error', 'A justification reason is required for status override.');
      return;
    }

    const previousOverride = project?.statusOverride;
    const previousMetrics = project?.metrics;

    // 1. Instant local state update FIRST
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        statusOverride: overrideStatus,
        metrics: prev.metrics
          ? {
              ...prev.metrics,
              status: overrideStatus as any,
              isOverridden: true,
            }
          : prev.metrics,
      };
    });
    setShowOverrideModal(false);

    try {
      const res = await apiFetch(`/api/projects/${projectId}/status-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: overrideStatus, reason: overrideReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Revert on error
        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            statusOverride: previousOverride || null,
            metrics: previousMetrics || prev.metrics,
          };
        });
        throw new Error(data.error || 'Failed to override status');
      }

      showToast('success', `Status overridden to ${overrideStatus}`);
      setOverrideReason('');
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // REMOVE STATUS OVERRIDE
  const handleRemoveOverride = async () => {
    const previousOverride = project?.statusOverride;
    const previousMetrics = project?.metrics;

    // Instant local state update
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        statusOverride: null,
        metrics: prev.metrics
          ? {
              ...prev.metrics,
              isOverridden: false,
            }
          : prev.metrics,
      };
    });
    setShowOverrideModal(false);

    try {
      const res = await apiFetch(`/api/projects/${projectId}/status-override`, { method: 'DELETE' });
      if (!res.ok) {
        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            statusOverride: previousOverride || null,
            metrics: previousMetrics || prev.metrics,
          };
        });
        throw new Error('Failed to reset override');
      }

      showToast('success', 'Status override cleared. Project status restored to automatic calculation.');
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // CREATE PHASE
  const handleCreatePhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhaseName.trim()) {
      showToast('error', 'Phase name is required');
      return;
    }
    if (submittingRef.current || submitting) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPhaseName.trim(),
          plannedStart: newPhaseStart,
          plannedEnd: newPhaseEnd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create phase');

      // Immediate local state update with API response
      const createdPhase: Phase = {
        ...data,
        tasks: data.tasks || [],
      };
      setProject((prev) => {
        if (!prev) return prev;
        const exists = (prev.phases || []).some((ph) => ph.id === createdPhase.id);
        const updatedPhases = exists
          ? prev.phases
          : [...(prev.phases || []), createdPhase].sort((a, b) => (a.order || 0) - (b.order || 0));
        return {
          ...prev,
          phases: updatedPhases,
        };
      });

      showToast('success', `Phase "${newPhaseName}" created`);
      setShowNewPhaseModal(false);
      setNewPhaseName('');
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // ARCHIVE PHASE
  const handleArchivePhase = async (phaseId: string) => {
    try {
      const res = await apiFetch(`/api/phases/${phaseId}/archive`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to archive phase');

      // Immediate local state update
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phases: (prev.phases || []).map((ph) =>
            ph.id === phaseId ? { ...ph, isArchived: true } : ph
          ),
        };
      });

      showToast('success', 'Phase archived successfully');
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // DELETE PHASE
  const handleDeletePhase = async (phaseId: string) => {
    try {
      const res = await apiFetch(`/api/phases/${phaseId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cannot delete phase');

      // Immediate local state update
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phases: (prev.phases || []).filter((ph) => ph.id !== phaseId),
        };
      });

      showToast('success', 'Empty phase deleted');
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // CREATE TASK
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      showToast('error', 'Task title is required');
      return;
    }
    if (submittingRef.current || submitting) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phaseId: selectedPhaseId,
          title: newTaskTitle.trim(),
          assigneeId: newTaskAssigneeId || undefined,
          priority: newTaskPriority,
          plannedStart: newTaskPlannedStart,
          plannedEnd: newTaskPlannedEnd,
          plannedHours: Number(newTaskPlannedHours),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create task');

      // Immediate local state update with API response
      setProject((prev) => {
        if (!prev) return prev;
        const targetPhaseId = data.phaseId || selectedPhaseId;
        const updatedPhases = prev.phases.map((ph) => {
          if (ph.id === targetPhaseId) {
            const exists = (ph.tasks || []).some((t) => t.id === data.id);
            return {
              ...ph,
              tasks: exists ? ph.tasks : [...(ph.tasks || []), data],
            };
          }
          return ph;
        });

        const allTasks = updatedPhases.flatMap((ph) => ph.tasks || []);
        const completedTasks = allTasks.filter((t) => t.state === 'Completed').length;
        const totalTasks = allTasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          ...prev,
          phases: updatedPhases,
          metrics: prev.metrics
            ? {
                ...prev.metrics,
                progress,
                completedTasks,
                totalTasks,
              }
            : prev.metrics,
        };
      });

      showToast('success', `Task "${newTaskTitle}" created`);
      setShowNewTaskModal(false);
      setNewTaskTitle('');
      setNewTaskAssigneeId('');
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // UPDATE TASK STATE (Strict completion rules!)
  const handleTaskStateChange = async (taskId: string, newState: string) => {
    // 1. Instant optimistic local state update
    let previousState: string = 'Not started';
    setProject((prev) => {
      if (!prev) return prev;
      const updatedPhases = prev.phases.map((ph) => ({
        ...ph,
        tasks: ph.tasks.map((t) => {
          if (t.id === taskId) {
            previousState = t.state;
            return { ...t, state: newState as any };
          }
          return t;
        }),
      }));

      const allTasks = updatedPhases.flatMap((ph) => ph.tasks || []);
      const completedTasks = allTasks.filter((t) => t.state === 'Completed').length;
      const totalTasks = allTasks.length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...prev,
        phases: updatedPhases,
        metrics: prev.metrics
          ? {
              ...prev.metrics,
              progress,
              completedTasks,
              totalTasks,
            }
          : prev.metrics,
      };
    });

    try {
      const res = await apiFetch(`/api/tasks/${taskId}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Business rule failure: revert state and expand task to reveal quality checks / blocker
        setExpandedTasks((prev) => ({ ...prev, [taskId]: true }));
        setProject((prev) => {
          if (!prev) return prev;
          const updatedPhases = prev.phases.map((ph) => ({
            ...ph,
            tasks: ph.tasks.map((t) => (t.id === taskId ? { ...t, state: previousState as any } : t)),
          }));
          const allTasks = updatedPhases.flatMap((ph) => ph.tasks || []);
          const completedTasks = allTasks.filter((t) => t.state === 'Completed').length;
          const totalTasks = allTasks.length;
          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          return {
            ...prev,
            phases: updatedPhases,
            metrics: prev.metrics
              ? { ...prev.metrics, progress, completedTasks, totalTasks }
              : prev.metrics,
          };
        });
        throw new Error(data.error || 'Failed to update task state');
      }

      // Merge verified server response into state
      setProject((prev) => {
        if (!prev) return prev;
        const updatedPhases = prev.phases.map((ph) => ({
          ...ph,
          tasks: ph.tasks.map((t) => (t.id === taskId ? { ...t, ...data } : t)),
        }));

        const allTasks = updatedPhases.flatMap((ph) => ph.tasks || []);
        const completedTasks = allTasks.filter((t) => t.state === 'Completed').length;
        const totalTasks = allTasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          ...prev,
          phases: updatedPhases,
          metrics: prev.metrics
            ? {
                ...prev.metrics,
                progress,
                completedTasks,
                totalTasks,
              }
            : prev.metrics,
        };
      });

      showToast('success', `Task state updated to ${newState}`);
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // TOGGLE QUALITY CHECK
  const handleToggleQualityCheck = async (checkId: string) => {
    try {
      const res = await apiFetch(`/api/tasks/quality-checks/${checkId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to toggle check');

      // Immediate local state update for quality check
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phases: prev.phases.map((ph) => ({
            ...ph,
            tasks: ph.tasks.map((t) => ({
              ...t,
              qualityChecks: (t.qualityChecks || []).map((qc) =>
                qc.id === checkId ? { ...qc, ...data } : qc
              ),
            })),
          })),
        };
      });

      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // ADD QUALITY CHECK TO TASK
  const handleAddQualityCheck = async (taskId: string, label: string, mandatory: boolean) => {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}/quality-checks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, mandatory }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to add check');

      // Immediate local state update
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phases: prev.phases.map((ph) => ({
            ...ph,
            tasks: ph.tasks.map((t) =>
              t.id === taskId
                ? { ...t, qualityChecks: [...(t.qualityChecks || []), data] }
                : t
            ),
          })),
        };
      });

      showToast('success', 'Quality check added');
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // TOGGLE TASK RISK FLAG
  const handleToggleRiskFlag = async (task: Task) => {
    try {
      if (task.hasRiskFlag) {
        await apiFetch(`/api/tasks/${task.id}/risk-flag`, { method: 'DELETE' });
        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            phases: prev.phases.map((ph) => ({
              ...ph,
              tasks: ph.tasks.map((t) =>
                t.id === task.id ? { ...t, hasRiskFlag: false, riskFlagReason: null } : t
              ),
            })),
          };
        });
        showToast('success', 'Task risk flag cleared');
      } else {
        const reason = window.prompt('Provide reason for flagging risk on this task:') || 'Execution risk noted';
        await apiFetch(`/api/tasks/${task.id}/risk-flag`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            phases: prev.phases.map((ph) => ({
              ...ph,
              tasks: ph.tasks.map((t) =>
                t.id === task.id ? { ...t, hasRiskFlag: true, riskFlagReason: reason } : t
              ),
            })),
          };
        });
        showToast('success', 'Task risk flagged');
      }
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // CREATE ISSUE
  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueTitle.trim() || !newIssueDetail.trim()) {
      showToast('error', 'Issue title and detail are required');
      return;
    }
    if (submittingRef.current || submitting) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: newIssueTitle.trim(),
          severity: newIssueSeverity,
          detail: newIssueDetail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to raise issue');

      // Immediate local state update
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          issues: [data, ...(prev.issues || [])],
        };
      });

      showToast('success', `Issue "${newIssueTitle}" logged`);
      setShowNewIssueModal(false);
      setNewIssueTitle('');
      setNewIssueDetail('');
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // CLOSE ISSUE
  const handleCloseIssue = async (issueId: string) => {
    try {
      const res = await apiFetch(`/api/issues/${issueId}/close`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to close issue');

      // Immediate local state update
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          issues: (prev.issues || []).map((i) =>
            i.id === issueId ? { ...i, state: 'Closed' as any, closedAt: new Date().toISOString() } : i
          ),
        };
      });

      showToast('success', 'Issue marked closed');
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // REOPEN ISSUE (Requires comment!)
  const handleReopenIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenComment.trim()) {
      showToast('error', 'A comment is strictly required to reopen an issue.');
      return;
    }
    if (submittingRef.current || submitting) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/issues/${reopenIssueId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: reopenComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reopen issue');

      // Immediate local state update
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          issues: (prev.issues || []).map((i) =>
            i.id === reopenIssueId
              ? { ...i, state: 'In progress' as any, closedAt: null, reopenComment: reopenComment.trim() }
              : i
          ),
        };
      });

      showToast('success', 'Issue reopened');
      setShowReopenModal(false);
      setReopenComment('');
      setReopenIssueId(null);
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // CREATE RISK
  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiskDesc.trim()) {
      showToast('error', 'Risk description is required');
      return;
    }
    if (submittingRef.current || submitting) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          description: newRiskDesc.trim(),
          severity: newRiskSeverity,
          mitigation: newRiskMitigation.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record risk');

      // Immediate local state update
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          risks: [data, ...(prev.risks || [])],
        };
      });

      showToast('success', 'Risk recorded in register');
      setShowNewRiskModal(false);
      setNewRiskDesc('');
      setNewRiskMitigation('');
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // CLOSE RISK
  const handleCloseRisk = async (riskId: string) => {
    try {
      const res = await apiFetch(`/api/risks/${riskId}/close`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to close risk');

      // Immediate local state update
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          risks: (prev.risks || []).map((r) =>
            r.id === riskId ? { ...r, closedAt: new Date().toISOString() } : r
          ),
        };
      });

      showToast('success', 'Risk closed');
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // CREATE MILESTONE
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || !newMilestoneBaseline || !newMilestoneForecast) {
      showToast('error', 'All milestone fields are required');
      return;
    }
    if (submittingRef.current || submitting) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: newMilestoneTitle.trim(),
          baselineDate: newMilestoneBaseline,
          forecastDate: newMilestoneForecast,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create milestone');

      // Immediate local state update
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          milestones: [...(prev.milestones || []), data].sort(
            (a, b) => new Date(a.forecastDate).getTime() - new Date(b.forecastDate).getTime()
          ),
        };
      });

      showToast('success', `Milestone "${newMilestoneTitle}" added`);
      setShowNewMilestoneModal(false);
      setNewMilestoneTitle('');
      fetchProject(false);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 pb-24">
        <div className="h-6 w-32 bg-[#E8E2D5] rounded-md animate-pulse" />
        <div className="h-40 w-full bg-white rounded-2xl border border-[#EAE3D5] animate-pulse" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-[#EAE3D5] text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-[#B3261E] mx-auto" />
        <h3 className="font-serif text-lg font-bold text-[#231E1B]">Unable to load project</h3>
        <p className="text-xs text-[#70675D] max-w-sm mx-auto">{error || 'Project not found'}</p>
        <button
          onClick={onBack}
          className="mt-2 px-4 py-2 rounded-full bg-[#C85A32] text-white text-xs font-semibold"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const metrics = project.metrics!;
  const canManage = isCEO || (isProjectOwner && project.ownerId === currentUser?.id);
  // Any authenticated project member can create tasks (Employee, ProjectOwner, CEO)
  const isProjectMember = project.memberships?.some((m) => m.user.id === currentUser?.id) ?? false;
  const canCreateTask = isCEO || (isProjectOwner && project.ownerId === currentUser?.id) || isProjectMember;

  return (
    <div className="space-y-6 pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-16 right-4 z-50 p-4 rounded-xl shadow-lg border max-w-md animate-in slide-in-from-top-2 text-xs flex items-center justify-between gap-3 ${
            toastMessage.type === 'error'
              ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
              : 'bg-[#EBF2EB] text-[#2D5A34] border-[#C4D9C5]'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[#B3261E] shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#2D5A34] shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Back link */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#70685F] hover:text-[#C85A32] transition-colors cursor-pointer min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to All Projects
      </button>

      {/* Project Master Header Card */}
      <div className="p-3.5 sm:p-6 rounded-2xl lg:rounded-3xl bg-white border border-[#E8E2D5] shadow-xs lg:shadow-sm space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs font-semibold text-[#8C6D58] uppercase tracking-wider bg-[#F5F1E8] sm:bg-transparent px-2 py-0.5 sm:px-0 sm:py-0 rounded-full">
                {project.sponsor} Sponsor
              </span>
              <StatusBadge
                status={metrics.status}
                isOverridden={metrics.isOverridden}
                size="md"
              />
            </div>
            <h1 className="font-display text-lg sm:text-2xl lg:text-3xl font-bold text-[#231E1B] tracking-tight leading-snug break-words">
              {project.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#70675D] max-w-3xl leading-relaxed break-words">
              {project.goal}
            </p>
          </div>

          {/* Status Override Action Button (PO & CEO only!) */}
          {canManage && (
            <button
              id="status-override-button"
              onClick={() => setShowOverrideModal(true)}
              className="self-start px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs font-semibold bg-[#F5F1E8] hover:bg-[#ECE5D6] active:scale-95 border border-[#DDD6C8] text-[#554E44] flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[36px] sm:min-h-[44px] shrink-0"
              title="Override automatic status with recorded reason"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#C85A32]" />
              Override Status
            </button>
          )}
        </div>

        {/* Progress vs Plan Dual Visual Bar */}
        <div className="pt-2 sm:pt-3 border-t border-[#F2ECE1] space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#231E1B]">
              <span className="sm:hidden">Actual: </span>
              <span className="hidden sm:inline">Actual Progress: </span>
              <strong className="text-[#C85A32] text-xs sm:text-sm">{metrics.progress}%</strong>
            </span>
            <span className="text-[#70675D]">
              Scheduled Plan: <strong className="text-[#4E463E]">{metrics.plan}%</strong>
            </span>
          </div>

          <div className="relative w-full h-2.5 sm:h-3 rounded-full bg-[#EAE4D8] overflow-hidden">
            {/* Planned baseline watermark */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-[#D4C8B5]"
              style={{ width: `${Math.min(100, Math.max(0, metrics.plan))}%` }}
            />
            {/* Actual progress bar */}
            <div
              className={`relative h-full rounded-full transition-all duration-500 ${
                metrics.status === 'OFF_TRACK'
                  ? 'bg-[#B3261E]'
                  : metrics.status === 'AT_RISK'
                  ? 'bg-[#D97706]'
                  : 'bg-[#526E55]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, metrics.progress))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#7A7165]">
            <span>
              Start: {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span>
              <span className="sm:hidden">Target: </span>
              <span className="hidden sm:inline">Target End: </span>
              {new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Executive Meta Strip */}
        <div className="pt-2 sm:pt-3 border-t border-[#F2ECE1] grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-[#8C8275] block">Project Owner</span>
            <span className="font-semibold text-[#231E1B] truncate block">{project.owner?.name}</span>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-[#8C8275] block">Sponsor</span>
            <span className="font-semibold text-[#231E1B] truncate block">{project.sponsor}</span>
          </div>
          {!isEmployee ? (
            <>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs text-[#8C8275] block">Planned Budget</span>
                <span className="font-semibold text-[#231E1B] truncate block">
                  £{project.plannedBudget.toLocaleString()}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs text-[#8C8275] block">Spend to Date</span>
                <span className="font-semibold text-[#C85A32] truncate block">
                  £{project.spendToDate.toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <div className="col-span-2 flex items-center gap-1.5 text-[#8C8275] italic text-[10px] sm:text-[11px]">
              <span>Financial figures confidential to Owner &amp; CEO</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Bar - Smooth Edge-to-Edge Touch Scroll */}
      <div className="flex items-center gap-1 border-b border-[#E8E2D5] overflow-x-auto no-scrollbar pb-px max-w-full">
        {[
          { key: 'phases', label: 'Phases & Tasks', count: project.phases.length },
          { key: 'overview', label: 'Overview & Charter' },
          { key: 'issues', label: 'Issues', count: project.issues.filter((i) => i.state !== 'Closed').length },
          { key: 'risks', label: 'Risks', count: project.risks.filter((r) => !r.closedAt).length },
          { key: 'milestones', label: 'Milestones', count: project.milestones.length },
          ...(!isEmployee ? [{ key: 'budget', label: 'Budget' }] : []),
          { key: 'approvals', label: 'Approvals' },
          { key: 'baselines', label: 'Baselines' },
          { key: 'documents', label: 'Documents' },
          { key: 'chat', label: 'Discussion' },
          { key: 'changelog', label: 'Change Log' },
        ].map((tab) => (
          <button
            key={tab.key}
            id={`tab-btn-${tab.key}`}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 min-h-[38px] sm:min-h-[44px] cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === tab.key
                ? 'border-[#C85A32] text-[#C85A32]'
                : 'border-transparent text-[#70685F] hover:text-[#231E1B]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.key
                    ? 'bg-[#C85A32] text-white'
                    : 'bg-[#EAE4D8] text-[#60564C]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: PHASES & TASKS */}
      {activeTab === 'phases' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-base sm:text-lg font-bold text-[#231E1B]">
              Execution Phases ({project.phases.length})
            </h3>
            {canManage && (
              <button
                id="add-phase-button"
                onClick={() => setShowNewPhaseModal(true)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-[#C85A32] hover:bg-[#AD4722] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[36px] sm:min-h-[44px] shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Phase
              </button>
            )}
          </div>

          {project.phases.length === 0 && (
            <div className="p-8 rounded-2xl bg-white border border-[#EAE3D5] text-center space-y-2">
              <p className="text-xs text-[#70675D]">No phases have been created for this project yet.</p>
            </div>
          )}

          <div className="space-y-3.5 sm:space-y-4">
            {project.phases.map((phase) => {
              const completedTasksCount = phase.tasks.filter((t) => t.state === 'Completed').length;
              const totalTasksCount = phase.tasks.length;
              const phasePct = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

              return (
                <div
                  key={phase.id}
                  id={`phase-card-${phase.id}`}
                  className="rounded-2xl bg-white border border-[#EAE3D5] overflow-hidden shadow-xs"
                >
                  {/* Phase Header */}
                  <div className="p-3 sm:p-4 bg-[#FAF7F0] border-b border-[#EAE3D5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] sm:text-xs font-bold text-[#C85A32] bg-[#FBECE6] px-2 py-0.5 rounded-md shrink-0">
                          Phase {phase.order}
                        </span>
                        <h4 className="font-serif font-bold text-sm sm:text-base text-[#231E1B] truncate">
                          {phase.name}
                        </h4>
                        {phase.isArchived && (
                          <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full shrink-0">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] sm:text-xs text-[#70675D] flex items-center gap-1 flex-wrap">
                        <span>
                          {new Date(phase.plannedStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                          {new Date(phase.plannedEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span>&bull;</span>
                        <span>{completedTasksCount}/{totalTasksCount} tasks ({phasePct}%)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto pt-1 sm:pt-0">
                      {canCreateTask && (
                        <button
                          id={`add-task-btn-${phase.id}`}
                          onClick={() => {
                            setSelectedPhaseId(phase.id);
                            setShowNewTaskModal(true);
                            apiFetch('/api/users')
                              .then((r) => r.json())
                              .then((users) => setAssignableUsers(users))
                              .catch(() => setAssignableUsers([]));
                          }}
                          className="px-2.5 py-1.5 rounded-full bg-white border border-[#D5CCBC] hover:border-[#C85A32] text-xs font-semibold text-[#231E1B] flex items-center gap-1 min-h-[34px] sm:min-h-[38px] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#C85A32]" />
                          Add Task
                        </button>
                      )}
                      {canManage && (
                        <>
                          <button
                            onClick={() => handleArchivePhase(phase.id)}
                            title="Archive Phase"
                            className="p-1.5 sm:p-2 rounded-full hover:bg-[#EFECE4] text-[#7A7165] min-h-[34px] min-w-[34px] flex items-center justify-center cursor-pointer"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePhase(phase.id)}
                            title="Delete Phase (only allowed if empty)"
                            className="p-1.5 sm:p-2 rounded-full hover:bg-[#FDE8E8] text-[#991B1B] min-h-[34px] min-w-[34px] flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="divide-y divide-[#F2ECE1]">
                    {phase.tasks.length === 0 ? (
                      <div className="p-4 text-xs text-[#8C8275] italic text-center">
                        No tasks in this phase yet.
                      </div>
                    ) : (
                      phase.tasks.map((task) => {
                        const isExpanded = expandedTasks[task.id];
                        const canEditTask =
                          isCEO ||
                          (isProjectOwner && project.ownerId === currentUser?.id) ||
                          task.assigneeId === currentUser?.id;

                        return (
                          <div
                            key={task.id}
                            id={`task-row-${task.id}`}
                            className="p-3.5 sm:p-4 hover:bg-[#FDFBF7] transition-colors space-y-2"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              {/* Task Info: Badges -> Title -> Meta */}
                              <div className="space-y-1.5 flex-1 min-w-0">
                                {/* Badges */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <TaskStateBadge state={task.state} />
                                  <PriorityBadge priority={task.priority} />
                                  {task.hasRiskFlag && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B]">
                                      <Flag className="w-3 h-3" />
                                      Risk Flagged
                                    </span>
                                  )}
                                  {!task.isBaselined && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                                      Post-baseline
                                    </span>
                                  )}
                                </div>

                                {/* Title */}
                                <div className="font-semibold text-sm sm:text-base text-[#231E1B] leading-snug break-words">
                                  {task.title}
                                </div>

                                {/* Meta: Assignee, Hours, Due date */}
                                <div className="text-xs text-[#70675D] flex items-center gap-2 sm:gap-3 flex-wrap pt-0.5">
                                  <span>
                                    Assigned: <strong>{task.assignee?.name || 'Unassigned'}</strong>
                                  </span>
                                  <span>&bull;</span>
                                  <span>
                                    Planned: <strong>{task.plannedHours} hrs</strong>
                                  </span>
                                  <span>&bull;</span>
                                  <span>
                                    Due: {new Date(task.plannedEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                  {task.qualityChecks && task.qualityChecks.length > 0 && (
                                    <span className="text-[#526E55] flex items-center gap-1 w-full sm:w-auto mt-0.5 sm:mt-0">
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      {task.qualityChecks.filter((q) => q.checkedAt).length}/{task.qualityChecks.length} checks
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Task Action Controls Row */}
                              <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F5F1E8]">
                                {canEditTask && (
                                  <>
                                    <select
                                      id={`task-state-select-${task.id}`}
                                      value={task.state}
                                      onChange={(e) => handleTaskStateChange(task.id, e.target.value)}
                                      className="flex-1 sm:flex-none px-2.5 py-1.5 rounded-xl border border-[#DDD6C8] bg-white text-xs font-semibold text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] cursor-pointer min-h-[36px] sm:min-h-[44px]"
                                    >
                                      <option value="Not started">Not started</option>
                                      <option value="In progress">In progress</option>
                                      <option value="Blocked">Blocked</option>
                                      <option value="Completed">Completed</option>
                                    </select>

                                    <button
                                      onClick={() => handleToggleRiskFlag(task)}
                                      className={`p-2 rounded-xl border min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center cursor-pointer shrink-0 ${
                                        task.hasRiskFlag
                                          ? 'bg-[#FEE2E2] border-[#FECACA] text-[#B3261E]'
                                          : 'bg-white border-[#E0D9CC] text-[#7A7165] hover:text-[#B3261E]'
                                      }`}
                                      title="Flag / unflag execution risk"
                                    >
                                      <Flag className="w-4 h-4" />
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() =>
                                    setExpandedTasks((prev) => ({
                                      ...prev,
                                      [task.id]: !prev[task.id],
                                    }))
                                  }
                                  className="p-2 rounded-xl bg-white border border-[#E0D9CC] text-[#7A7165] hover:bg-[#F5F1E8] min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
                                  title="Expand quality checks and details"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Task Expanded Details: Quality Checks & Dependencies */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-[#F2ECE1] space-y-3 bg-[#FAF8F2] p-3.5 rounded-xl">
                                {task.riskFlagReason && (
                                  <div className="text-xs text-[#B3261E] bg-[#FEE2E2] p-2 rounded-lg font-medium">
                                    Risk note: {task.riskFlagReason}
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[#231E1B] flex items-center gap-1.5">
                                      <ShieldCheck className="w-4 h-4 text-[#526E55]" />
                                      Quality Checks (Mandatory checks block completion)
                                    </span>
                                  </div>

                                  <div className="space-y-1.5">
                                    {task.qualityChecks?.map((qc) => {
                                      const isChecked = !!qc.checkedAt;
                                      return (
                                        <div
                                          key={qc.id}
                                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#EBE5D8] text-xs"
                                        >
                                          <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => handleToggleQualityCheck(qc.id)}
                                              className="w-4 h-4 rounded text-[#C85A32] accent-[#C85A32] cursor-pointer"
                                            />
                                            <span
                                              className={
                                                isChecked ? 'line-through text-[#8C8275]' : 'text-[#231E1B]'
                                              }
                                            >
                                              {qc.label}
                                            </span>
                                            {qc.mandatory && (
                                              <span className="text-[10px] font-bold text-[#B3261E] bg-[#FDE8E8] px-1.5 py-0.2 rounded-md">
                                                Mandatory
                                              </span>
                                            )}
                                          </label>

                                          {isChecked && (
                                            <span className="text-[10px] text-[#526E55] italic">
                                              Verified by {qc.checker?.name || 'team'}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Quick add QC */}
                                  {canEditTask && (
                                    <div className="pt-2 flex items-center gap-2">
                                      <button
                                        onClick={() => {
                                          const label = window.prompt('Enter quality verification item:');
                                          if (label && label.trim()) {
                                            const mandatory = window.confirm(
                                              'Is this check MANDATORY for task completion?'
                                            );
                                            handleAddQualityCheck(task.id, label.trim(), mandatory);
                                          }
                                        }}
                                        className="text-xs font-semibold text-[#C85A32] hover:text-[#993F1C] flex items-center gap-1"
                                      >
                                        <Plus className="w-3.5 h-3.5" /> Add Quality Check
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: OVERVIEW & CHARTER */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-[#E8E2D5] space-y-4">
            <h3 className="font-serif text-xl font-bold text-[#231E1B] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C85A32]" />
              Project Charter &amp; Governance
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF7F0] space-y-1">
                <span className="text-[#8C8275] uppercase font-bold text-[10px]">Project Goal</span>
                <p className="text-sm font-medium text-[#231E1B]">{project.goal}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF7F0] space-y-1">
                <span className="text-[#8C8275] uppercase font-bold text-[10px]">Executive Sponsor</span>
                <p className="text-sm font-medium text-[#231E1B]">{project.sponsor}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF7F0] space-y-1">
                <span className="text-[#8C8275] uppercase font-bold text-[10px]">Project Owner</span>
                <p className="text-sm font-medium text-[#231E1B]">
                  {project.owner?.name} ({project.owner?.email})
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF7F0] space-y-1">
                <span className="text-[#8C8275] uppercase font-bold text-[10px]">Active Members</span>
                <p className="text-sm font-medium text-[#231E1B]">
                  {project.memberships?.map((m) => m.user.name).join(', ') || 'None assigned'}
                </p>
              </div>
            </div>
          </div>

          {/* Status Override History */}
          {project.statusLogs && project.statusLogs.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border border-[#E8E2D5] space-y-3">
              <h4 className="font-serif text-base font-bold text-[#231E1B] flex items-center gap-2">
                <History className="w-4 h-4 text-[#C85A32]" />
                Status Override Audit Trail
              </h4>
              <div className="divide-y divide-[#F2ECE1]">
                {project.statusLogs.map((log) => (
                  <div key={log.id} className="py-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#231E1B]">
                        Changed to {log.toStatus} (from {log.fromStatus})
                      </span>
                      <span className="text-[#8C8275]">
                        {new Date(log.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[#554E44]">Reason: "{log.reason}"</p>
                    <span className="text-[10px] text-[#70675D]">Overridden by {log.user.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Change Log Entries */}
          {project.changeLogs && project.changeLogs.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border border-[#E8E2D5] space-y-3">
              <h4 className="font-serif text-base font-bold text-[#231E1B]">Project Change Log</h4>
              <div className="space-y-2 text-xs">
                {project.changeLogs.map((entry) => (
                  <div key={entry.id} className="p-2.5 rounded-xl bg-[#FAF8F2] border border-[#EBE4D5]">
                    <div className="flex items-center justify-between font-semibold text-[#231E1B]">
                      <span>{entry.action}</span>
                      <span className="text-[10px] text-[#8C8275]">{entry.changedBy}</span>
                    </div>
                    <p className="text-[#554E44] mt-0.5">{entry.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ISSUES */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-[#231E1B]">
              Issues Log ({project.issues.length})
            </h3>
            <button
              id="raise-issue-btn"
              onClick={() => setShowNewIssueModal(true)}
              className="px-3.5 py-2 rounded-full bg-[#C85A32] hover:bg-[#AD4722] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[44px]"
            >
              <Plus className="w-3.5 h-3.5" />
              Raise Issue
            </button>
          </div>

          <div className="text-xs text-[#70675D]">
            An issue is something that has already occurred. Critical issues trigger leadership alerts
            and force project status to Off Track.
          </div>

          <div className="space-y-3">
            {project.issues.map((issue) => {
              const isClosed = issue.state === 'Closed';
              return (
                <div
                  key={issue.id}
                  id={`issue-card-${issue.id}`}
                  className="p-4 rounded-2xl bg-white border border-[#EAE3D5] space-y-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={issue.severity} />
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isClosed ? 'bg-gray-100 text-gray-600' : 'bg-[#FBECE6] text-[#C85A32]'
                          }`}
                        >
                          {issue.state}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-[#231E1B]">{issue.title}</h4>
                      <p className="text-xs text-[#554E44]">{issue.detail}</p>
                    </div>

                    <div>
                      {(() => {
                        const canManageIssue = canManage || issue.raisedBy === currentUser?.id || issue.ownerId === currentUser?.id;
                        if (isClosed && canManageIssue) {
                          return (
                            <button
                              onClick={() => {
                                setReopenIssueId(issue.id);
                                setShowReopenModal(true);
                              }}
                              className="px-3 py-1.5 rounded-full bg-[#F5F1E8] hover:bg-[#EAE4D6] text-xs font-semibold text-[#231E1B] min-h-[38px] cursor-pointer"
                            >
                              Reopen
                            </button>
                          );
                        }
                        if (!isClosed && canManageIssue) {
                          return (
                            <button
                              onClick={() => handleCloseIssue(issue.id)}
                              className="px-3 py-1.5 rounded-full bg-[#EBF2EB] hover:bg-[#DCEBDD] text-xs font-semibold text-[#2D5A34] min-h-[38px] cursor-pointer"
                            >
                              Close Issue
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {issue.reopenComment && (
                    <div className="text-xs text-[#8C6D58] bg-[#FAF6EE] p-2 rounded-lg">
                      <strong>Reopen Reason:</strong> {issue.reopenComment}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-[#8C8275] pt-1 border-t border-[#F2ECE1]">
                    <span>Raised by: {issue.raiser?.name || 'Team member'}</span>
                    <span>{new Date(issue.raisedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: RISKS */}
      {activeTab === 'risks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-[#231E1B]">
              Risk Register ({project.risks.length})
            </h3>
            <button
              id="register-risk-btn"
              onClick={() => setShowNewRiskModal(true)}
              className="px-3.5 py-2 rounded-full bg-[#C85A32] hover:bg-[#AD4722] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[44px]"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Risk
            </button>
          </div>

          <div className="text-xs text-[#70675D]">
            A risk is something that might happen. High risks trigger executive attention. Risks
            without review in over 30 days are flagged stale.
          </div>

          <div className="space-y-3">
            {project.risks.map((risk) => {
              const isClosed = !!risk.closedAt;
              return (
                <div
                  key={risk.id}
                  id={`risk-card-${risk.id}`}
                  className="p-4 rounded-2xl bg-white border border-[#EAE3D5] space-y-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={risk.severity} />
                        {risk.isStale && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                            Stale (&gt;30d no review)
                          </span>
                        )}
                        {isClosed && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            Closed
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-[#231E1B]">{risk.description}</h4>
                      <p className="text-xs text-[#554E44]">
                        <strong>Mitigation:</strong> {risk.mitigation || 'No mitigation recorded yet.'}
                      </p>
                    </div>

                    {!isClosed && (canManage || risk.ownerId === currentUser?.id) && (
                      <button
                        onClick={() => handleCloseRisk(risk.id)}
                        className="px-3 py-1.5 rounded-full bg-[#EBF2EB] hover:bg-[#DCEBDD] text-xs font-semibold text-[#2D5A34] min-h-[38px] cursor-pointer"
                      >
                        Close Risk
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#8C8275] pt-1 border-t border-[#F2ECE1]">
                    <span>Owner: {risk.owner?.name || project.owner?.name}</span>
                    <span>
                      Last reviewed: {new Date(risk.lastReviewedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: MILESTONES */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-[#231E1B]">
              Milestones ({project.milestones.length})
            </h3>
            {canManage && (
              <button
                id="add-milestone-btn"
                onClick={() => setShowNewMilestoneModal(true)}
                className="px-3.5 py-2 rounded-full bg-[#C85A32] hover:bg-[#AD4722] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[44px]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Milestone
              </button>
            )}
          </div>

          <div className="space-y-3">
            {project.milestones.map((m) => {
              const isAchieved = !!m.actualDate;
              return (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-white border border-[#EAE3D5] flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MilestoneIcon className="w-4 h-4 text-[#C85A32]" />
                      <h4 className="font-bold text-sm text-[#231E1B]">{m.title}</h4>
                      {isAchieved ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF2EB] text-[#2D5A34]">
                          Achieved
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FAF6EE] text-[#70675D]">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#70675D]">
                      Baseline: {new Date(m.baselineDate).toLocaleDateString()} · Forecast:{' '}
                      {new Date(m.forecastDate).toLocaleDateString()}
                      {m.actualDate && (
                        <span> · Actual: {new Date(m.actualDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: BUDGET (PO & CEO ONLY) */}
      {activeTab === 'budget' && (
        <ProjectBudgetTab projectId={project.id} projectName={project.name} />
      )}

      {/* TAB 7: APPROVAL REQUESTS */}
      {activeTab === 'approvals' && (
        <ProjectApprovalsTab projectId={project.id} projectName={project.name} projectOwnerId={project.ownerId} />
      )}

      {/* TAB 8: BASELINES & PLAN VS ACTUAL */}
      {activeTab === 'baselines' && (
        <ProjectBaselinesTab projectId={project.id} projectName={project.name} />
      )}

      {/* TAB 9: DOCUMENTS VAULT */}
      {activeTab === 'documents' && (
        <ProjectDocumentsTab projectId={project.id} projectName={project.name} />
      )}

      {/* TAB 10: PROJECT CHAT */}
      {activeTab === 'chat' && (
        <ProjectChatTab projectId={project.id} projectName={project.name} />
      )}

      {/* TAB 11: CHANGE LOG AUDIT */}
      {activeTab === 'changelog' && (
        <ProjectChangeLogTab projectId={project.id} projectName={project.name} />
      )}

      {/* MODAL: STATUS OVERRIDE */}
      {showOverrideModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowOverrideModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#EAE3D5] space-y-4 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-lg font-bold text-[#231E1B]">Override Project Status</h4>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="p-2 text-gray-500 hover:text-black rounded-xl hover:bg-[#F5F1E8] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#70675D]">
              Project Owner or CEO may override the calculated status. A formal justification reason is
              strictly required and recorded in the audit log.
            </p>

            <form onSubmit={handleStatusOverride} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Target Status
                </label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                >
                  <option value="ON_TRACK">On Track</option>
                  <option value="AT_RISK">At Risk</option>
                  <option value="OFF_TRACK">Off Track</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Reason / Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Explain why this status is being manually overridden..."
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {project.statusOverride ? (
                  <button
                    type="button"
                    onClick={handleRemoveOverride}
                    className="text-xs text-[#B3261E] hover:underline font-semibold min-h-[44px] flex items-center cursor-pointer"
                  >
                    Clear Override (Auto)
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOverrideModal(false)}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-[#F5F1E8] hover:bg-[#EAE4D6] min-h-[44px] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full text-xs font-semibold bg-[#C85A32] text-white hover:bg-[#AD4722] min-h-[44px] shadow-xs cursor-pointer active:scale-95"
                  >
                    Save Override
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW PHASE */}
      {showNewPhaseModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowNewPhaseModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#EAE3D5] space-y-4 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-lg font-bold text-[#231E1B]">Add New Phase</h4>
              <button
                onClick={() => setShowNewPhaseModal(false)}
                className="p-2 text-gray-500 hover:text-black rounded-xl hover:bg-[#F5F1E8] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePhase} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Phase Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={newPhaseName}
                  onChange={(e) => setNewPhaseName(e.target.value)}
                  placeholder="e.g. Phase 3: Final Acceptance"
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#231E1B] mb-1">Start Date</label>
                  <input
                    required
                    type="date"
                    value={newPhaseStart}
                    onChange={(e) => setNewPhaseStart(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#231E1B] mb-1">End Date</label>
                  <input
                    required
                    type="date"
                    value={newPhaseEnd}
                    onChange={(e) => setNewPhaseEnd(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPhaseModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#F5F1E8] hover:bg-[#EAE4D6] min-h-[44px] cursor-pointer flex-1 sm:flex-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#C85A32] text-white hover:bg-[#AD4722] min-h-[44px] shadow-xs cursor-pointer active:scale-95 flex-1 sm:flex-none"
                >
                  Create Phase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW TASK */}
      {showNewTaskModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowNewTaskModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#EAE3D5] space-y-4 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-lg font-bold text-[#231E1B]">Add New Task</h4>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="p-2 text-gray-500 hover:text-black rounded-xl hover:bg-[#F5F1E8] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Title (1-120 chars) <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  maxLength={120}
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Calibrate safety sensors"
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#231E1B] mb-1">Assignee</label>
                  <select
                    value={newTaskAssigneeId}
                    onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                  >
                    <option value="">Unassigned</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#231E1B] mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#231E1B] mb-1">Start Date</label>
                  <input
                    required
                    type="date"
                    value={newTaskPlannedStart}
                    onChange={(e) => setNewTaskPlannedStart(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#231E1B] mb-1">End Date</label>
                  <input
                    required
                    type="date"
                    value={newTaskPlannedEnd}
                    onChange={(e) => setNewTaskPlannedEnd(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Planned Hours (0-999)
                </label>
                <input
                  required
                  type="number"
                  min={0}
                  max={999}
                  value={newTaskPlannedHours}
                  onChange={(e) => setNewTaskPlannedHours(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#F5F1E8] hover:bg-[#EAE4D6] min-h-[44px] cursor-pointer flex-1 sm:flex-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#C85A32] text-white hover:bg-[#AD4722] min-h-[44px] shadow-xs cursor-pointer active:scale-95 flex-1 sm:flex-none"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW ISSUE */}
      {showNewIssueModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowNewIssueModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#EAE3D5] space-y-4 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-lg font-bold text-[#231E1B]">Raise Project Issue</h4>
              <button
                onClick={() => setShowNewIssueModal(false)}
                className="p-2 text-gray-500 hover:text-black rounded-xl hover:bg-[#F5F1E8] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Issue Title <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  placeholder="e.g. Critical valve failure in line 2"
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Severity</label>
                <select
                  value={newIssueSeverity}
                  onChange={(e) => setNewIssueSeverity(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                >
                  <option value="Minor">Minor</option>
                  <option value="Major">Major</option>
                  <option value="Critical">Critical (Forces project Off Track &amp; notifies CEO)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Detail / Context <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newIssueDetail}
                  onChange={(e) => setNewIssueDetail(e.target.value)}
                  placeholder="Describe what happened and impact..."
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewIssueModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#F5F1E8] hover:bg-[#EAE4D6] min-h-[44px] cursor-pointer flex-1 sm:flex-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#C85A32] text-white hover:bg-[#AD4722] min-h-[44px] shadow-xs cursor-pointer active:scale-95 flex-1 sm:flex-none"
                >
                  Raise Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REOPEN ISSUE */}
      {showReopenModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowReopenModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#EAE3D5] space-y-4 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-lg font-bold text-[#231E1B]">Reopen Issue</h4>
              <button
                onClick={() => setShowReopenModal(false)}
                className="p-2 text-gray-500 hover:text-black rounded-xl hover:bg-[#F5F1E8] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#70675D]">
              A non-empty comment explaining why this issue is being reopened is strictly required by
              the governance system.
            </p>
            <form onSubmit={handleReopenIssueSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Reopen Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenComment}
                  onChange={(e) => setReopenComment(e.target.value)}
                  placeholder="State the reason the issue is recurring or unresolved..."
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#F5F1E8] hover:bg-[#EAE4D6] min-h-[44px] cursor-pointer flex-1 sm:flex-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#C85A32] text-white hover:bg-[#AD4722] min-h-[44px] shadow-xs cursor-pointer active:scale-95 flex-1 sm:flex-none"
                >
                  Reopen Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW RISK */}
      {showNewRiskModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowNewRiskModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#EAE3D5] space-y-4 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-lg font-bold text-[#231E1B]">Record Risk in Register</h4>
              <button
                onClick={() => setShowNewRiskModal(false)}
                className="p-2 text-gray-500 hover:text-black rounded-xl hover:bg-[#F5F1E8] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRisk} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Risk Description <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={newRiskDesc}
                  onChange={(e) => setNewRiskDesc(e.target.value)}
                  placeholder="e.g. Lead time for replacement motors may exceed 4 weeks"
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Severity</label>
                <select
                  value={newRiskSeverity}
                  onChange={(e) => setNewRiskSeverity(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High (Visible to CEO alerts)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Mitigation Plan
                </label>
                <textarea
                  rows={2}
                  value={newRiskMitigation}
                  onChange={(e) => setNewRiskMitigation(e.target.value)}
                  placeholder="Defaults to: No mitigation recorded yet."
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRiskModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#F5F1E8] hover:bg-[#EAE4D6] min-h-[44px] cursor-pointer flex-1 sm:flex-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#C85A32] text-white hover:bg-[#AD4722] min-h-[44px] shadow-xs cursor-pointer active:scale-95 flex-1 sm:flex-none"
                >
                  Save Risk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW MILESTONE */}
      {showNewMilestoneModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowNewMilestoneModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#EAE3D5] space-y-4 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-lg font-bold text-[#231E1B]">Add Project Milestone</h4>
              <button
                onClick={() => setShowNewMilestoneModal(false)}
                className="p-2 text-gray-500 hover:text-black rounded-xl hover:bg-[#F5F1E8] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#70675D]">
              Milestone date must fall within the project start (
              {new Date(project.startDate).toLocaleDateString()}) and end (
              {new Date(project.endDate).toLocaleDateString()}) dates.
            </p>
            <form onSubmit={handleCreateMilestone} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Milestone Title <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="e.g. Factory Acceptance Test (FAT)"
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#231E1B] mb-1">Baseline Date</label>
                  <input
                    required
                    type="date"
                    value={newMilestoneBaseline}
                    onChange={(e) => setNewMilestoneBaseline(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#231E1B] mb-1">Forecast Date</label>
                  <input
                    required
                    type="date"
                    value={newMilestoneForecast}
                    onChange={(e) => setNewMilestoneForecast(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewMilestoneModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#F5F1E8] hover:bg-[#EAE4D6] min-h-[44px] cursor-pointer flex-1 sm:flex-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#C85A32] text-white hover:bg-[#AD4722] min-h-[44px] shadow-xs cursor-pointer active:scale-95 flex-1 sm:flex-none"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
