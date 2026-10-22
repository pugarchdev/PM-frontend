import { useQuery, QueryClient } from '@tanstack/react-query';
import { apiGet, apiFetch } from './api.ts';
import {
  Project,
  LeaveRequest,
  Issue,
  CEOPortfolioKPIs,
  CEOPortfolioProject,
  WorkloadMember,
  NotificationItem,
  DocumentItem,
  BudgetHealthData,
  Baseline,
  BaselineComparison,
  ApprovalRequest,
  ChangeLogItem,
  RoleDefinition,
  User,
  Task,
} from '../types.ts';

// ─── Query Key Factory ───────────────────────────────────────────────────────
export const queryKeys = {
  // Alerts & Stream
  alerts: (userId?: string) => ['alerts', userId] as const,
  badges: (userId?: string) => ['badges', userId] as const,

  // Calendar
  calendar: (userId?: string) => ['calendar-events', userId] as const,
  calendarToday: (userId?: string) => ['calendar-today', userId] as const,
  calendarEvents: (userId?: string, start?: string, end?: string) =>
    ['calendar-events', userId, start, end] as const,

  // Projects
  projects: (userId?: string, filters?: { search?: string; status?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: string }) =>
    filters ? (['projects', userId, filters] as const) : (['projects', userId] as const),
  projectsMinimal: (userId?: string) => ['projects-minimal', userId] as const,
  projectDetail: (userId?: string, projectId?: string) =>
    ['project-detail', userId, projectId] as const,
  projectMembers: (userId?: string, projectId?: string) =>
    ['project-members', userId, projectId] as const,
  projectSummary: (userId?: string, projectId?: string) =>
    ['project-summary', userId, projectId] as const,
  projectDocuments: (userId?: string, projectId?: string) =>
    ['project-documents', userId, projectId] as const,
  projectBudget: (userId?: string, projectId?: string) =>
    ['project-budget', userId, projectId] as const,
  projectBaselines: (userId?: string, projectId?: string) =>
    ['project-baselines', userId, projectId] as const,
  projectApprovals: (userId?: string, projectId?: string) =>
    ['project-approvals', userId, projectId] as const,
  projectChangeLog: (userId?: string, projectId?: string) =>
    ['project-changelog', userId, projectId] as const,
  portfolioCeo: (userId?: string) => ['portfolio-ceo', userId] as const,

  // Tasks
  tasks: (userId?: string, filters?: TaskFilterParams) =>
    filters ? (['tasks', userId, filters] as const) : (['tasks', userId] as const),
  taskDetail: (userId?: string, taskId?: string) => ['task-detail', userId, taskId] as const,
  taskSummary: (userId?: string, projectId?: string, scope?: string, assigneeId?: string) =>
    ['task-summary', userId, projectId, scope, assigneeId] as const,

  // Workload & Leaves
  workload: (userId?: string, weekStart?: string, filters?: WorkloadFilterParams) =>
    filters ? (['workload', userId, weekStart, filters] as const) : (['workload', userId, weekStart] as const),
  workloadSummary: (userId?: string, weekStart?: string) => ['workload-summary', userId, weekStart] as const,
  designatedApprover: (userId?: string) => ['designated-approver', userId] as const,
  leaveRequests: (userId?: string, scope?: string, status?: string) =>
    ['leave-requests', userId, scope, status] as const,
  leaveSummary: (userId?: string) => ['leave-summary', userId] as const,

  // Issues
  issues: (userId?: string, filters?: IssueFilterParams) =>
    filters ? (['issues', userId, filters] as const) : (['issues', userId] as const),
  issuesSummary: (userId?: string, projectId?: string) =>
    ['issues-summary', userId, projectId] as const,

  // Risks
  risks: (userId?: string, filters?: RiskFilterParams) =>
    filters ? (['risks', userId, filters] as const) : (['risks', userId] as const),
  risksSummary: (userId?: string, projectId?: string) =>
    ['risks-summary', userId, projectId] as const,

  // Approvals
  approvals: (userId?: string, filters?: ApprovalFilterParams) =>
    filters ? (['approvals', userId, filters] as const) : (['approvals', userId] as const),
  approvalsSummary: (userId?: string, projectId?: string) =>
    ['approvals-summary', userId, projectId] as const,

  // Notifications
  notifications: (userId?: string, unreadOnly?: boolean, page?: number, limit?: number) =>
    ['notifications', userId, unreadOnly, page, limit] as const,
  notificationUnreadCount: (userId?: string) => ['notification-unread-count', userId] as const,

  // Users & Organization Hierarchy
  usersList: (userId?: string, filters?: { search?: string; department?: string; roleId?: string }) =>
    filters ? (['users-list', userId, filters] as const) : (['users-list', userId] as const),
  usersManagement: (userId?: string, filters?: UserManagementFilterParams) =>
    filters ? (['users-management', userId, filters] as const) : (['users-management', userId] as const),
  usersSummary: (userId?: string) => ['users-summary', userId] as const,
  roles: (userId?: string) => ['roles', userId] as const,
  portfolioSummary: (userId?: string) => ['portfolio-summary', userId] as const,
};

// ─── Reusable Query Hooks ────────────────────────────────────────────────────

/**
 * 1. Alerts & Dashboard stream
 * Stale time: 15s, GC time: 2 min
 */
export function useAlertsQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.alerts(userId),
    queryFn: async ({ signal }) => {
      return apiGet<any>('/api/alerts', { signal });
    },
    enabled: !!userId,
    staleTime: 15_000,
    gcTime: 2 * 60_000,
  });
}

/**
 * 2. Navigation Badges (Lightweight count endpoint)
 * Stale time: 15s, GC time: 2 min
 */
export function useBadgesQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.badges(userId),
    queryFn: async ({ signal }) => {
      return apiGet<{ alertsBadge: number; criticalIssuesBadge: number }>(
        '/api/alerts/badges',
        { signal }
      );
    },
    enabled: !!userId,
    staleTime: 15_000,
    gcTime: 2 * 60_000,
  });
}

/**
 * 3. Today's Calendar Preview
 * Stale time: 30s, GC time: 3 min
 */
export function useCalendarTodayQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.calendarToday(userId),
    queryFn: async ({ signal }) => {
      try {
        return await apiGet<any[]>('/api/calendar/today', { signal });
      } catch {
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 3 * 60_000,
  });
}

/**
 * 4. Calendar Events with Date Range
 * Stale time: 30s, GC time: 5 min
 */
export function useCalendarEventsQuery(userId?: string, start?: string, end?: string) {
  return useQuery({
    queryKey: queryKeys.calendarEvents(userId, start, end),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      return apiGet<any[]>(`/api/calendar?${params.toString()}`, { signal });
    },
    enabled: !!userId && !!start && !!end,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export interface ProjectFilterParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginatedProjectsResponse {
  projects: Project[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TaskFilterParams {
  projectId?: string;
  phaseId?: string;
  assigneeId?: string;
  scope?: string;
  state?: string;
  priority?: string;
  hasRiskFlag?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginatedTasksResponse {
  tasks: Task[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TaskSummaryResponse {
  total: number;
  byState: {
    notStarted: number;
    inProgress: number;
    blocked: number;
    completed: number;
  };
  byPriority: {
    low: number;
    normal: number;
    high: number;
  };
  plannedHoursTotal: number;
  actualHoursTotal: number;
  riskFlaggedCount: number;
  completionRate: number;
}

export interface WorkloadFilterParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface WorkloadSummaryResponse {
  weekStartDate: string;
  summary: {
    totalTeam: number;
    overallocatedCount: number;
    balancedCount: number;
    availableCount: number;
    teamOnLeaveCount?: number;
    schedulingConflictsCount?: number;
  };
  scope?: {
    isExecutive: boolean;
    subordinatesCount: number;
    visibleUserCount: number;
  };
}

export interface UserManagementFilterParams {
  search?: string;
  status?: string;
  roleId?: string;
  department?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginatedUsersResponse {
  users: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserSummaryResponse {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  departmentCounts: Array<{ department: string; count: number }>;
}

export interface IssueFilterParams {
  projectId?: string;
  severity?: string;
  state?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginatedIssuesResponse {
  issues: Issue[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface IssueSummaryResponse {
  total: number;
  openCount: number;
  closedCount: number;
  byState: Record<string, number>;
  bySeverity: Record<string, number>;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
}

export interface RiskFilterParams {
  projectId?: string;
  severity?: string;
  includeClosed?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginatedRisksResponse {
  risks: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RiskSummaryResponse {
  total: number;
  bySeverity: Record<string, number>;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  staleCount: number;
}

export interface ApprovalFilterParams {
  filter?: string;
  projectId?: string;
  type?: string;
  state?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedApprovalsResponse {
  approvals: ApprovalRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApprovalSummaryResponse {
  total: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  actionableCount: number;
}

export interface LeaveSummaryResponse {
  mySummary: {
    totalSubmitted: number;
    pendingCount: number;
    approvedCount: number;
    currentlyOnLeave: boolean;
  };
  teamSummary?: {
    totalSubordinatesCount: number;
    pendingApprovalsCount: number;
    currentlyOnLeaveCount: number;
    totalApprovedLeavesCount: number;
  } | null;
  canApproveLeaves: boolean;
}

export interface PortfolioSummaryResponse {
  kpis: CEOPortfolioKPIs;
}

/**
 * 5. Projects List (full enriched projects)
 * Supports server-side search, status filter, and sorting
 * Stale time: 30s, GC time: 5 min
 */
export function useProjectsQuery(userId?: string, filters?: ProjectFilterParams) {
  return useQuery<Project[]>({
    queryKey: queryKeys.projects(userId, filters),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      return apiGet<Project[]>(`/api/projects${queryStr}`, { signal });
    },
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 5b. Projects Paginated List
 * Stale time: 30s, GC time: 5 min
 */
export function useProjectsPaginatedQuery(userId?: string, filters?: ProjectFilterParams) {
  return useQuery<PaginatedProjectsResponse>({
    queryKey: queryKeys.projects(userId, filters),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
      params.set('page', String(filters?.page || 1));
      params.set('limit', String(filters?.limit || 10));
      return apiGet<PaginatedProjectsResponse>(`/api/projects?${params.toString()}`, { signal });
    },
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 6. Minimal Projects List (for dropdowns / selectors)
 * Stale time: 60s, GC time: 5 min
 */
export function useProjectsMinimalQuery(userId?: string) {
  return useQuery<Array<{ id: string; name: string; ownerId: string }>>({
    queryKey: queryKeys.projectsMinimal(userId),
    queryFn: async ({ signal }) => {
      return apiGet<Array<{ id: string; name: string; ownerId: string }>>(
        '/api/projects?minimal=true',
        { signal }
      );
    },
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 7. Single Project Detail
 * Stale time: 20s, GC time: 5 min
 */
export function useProjectDetailQuery(projectId?: string, userId?: string) {
  return useQuery<Project>({
    queryKey: queryKeys.projectDetail(userId, projectId),
    queryFn: async ({ signal }) => {
      return apiGet<Project>(`/api/projects/${projectId}`, { signal });
    },
    enabled: !!userId && !!projectId,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 7b. Project Members
 * Stale time: 30s, GC time: 5 min
 */
export function useProjectMembersQuery(projectId?: string, userId?: string) {
  return useQuery<any[]>({
    queryKey: queryKeys.projectMembers(userId, projectId),
    queryFn: async ({ signal }) => {
      return apiGet<any[]>(`/api/projects/${projectId}/members`, { signal });
    },
    enabled: !!userId && !!projectId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 7c. Project Task & Workload Summary
 * Stale time: 20s, GC time: 5 min
 */
export function useProjectSummaryQuery(projectId?: string, userId?: string) {
  return useQuery<any>({
    queryKey: queryKeys.projectSummary(userId, projectId),
    queryFn: async ({ signal }) => {
      return apiGet<any>(`/api/projects/${projectId}/summary`, { signal });
    },
    enabled: !!userId && !!projectId,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 8. CEO Portfolio Intelligence
 * Stale time: 30s, GC time: 5 min
 */
export function useCEOPortfolioQuery(userId?: string, isCEO?: boolean) {
  return useQuery<{ kpis: CEOPortfolioKPIs; projects: CEOPortfolioProject[] }>({
    queryKey: queryKeys.portfolioCeo(userId),
    queryFn: async ({ signal }) => {
      return apiGet<{ kpis: CEOPortfolioKPIs; projects: CEOPortfolioProject[] }>(
        '/api/portfolio/ceo',
        { signal }
      );
    },
    enabled: !!userId && !!isCEO,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 9. Workload & Capacity
 * Stale time: 30s, GC time: 5 min
 */
export function useWorkloadQuery(userId?: string, weekStart?: string, filters?: WorkloadFilterParams) {
  return useQuery<{
    weekStartDate: string;
    summary: {
      totalTeam: number;
      overallocatedCount: number;
      balancedCount: number;
      availableCount: number;
      teamOnLeaveCount?: number;
      schedulingConflictsCount?: number;
    };
    scope?: {
      isExecutive: boolean;
      subordinatesCount: number;
      visibleUserCount: number;
    };
    workload: WorkloadMember[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>({
    queryKey: queryKeys.workload(userId, weekStart, filters),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (weekStart) params.set('weekStart', weekStart);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      const qs = params.toString();
      return apiGet<any>(`/api/workload${qs ? `?${qs}` : ''}`, { signal });
    },
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 9b. Workload Summary KPIs (Lightweight summary for cards/dashboards)
 * Stale time: 30s, GC time: 5 min
 */
export function useWorkloadSummaryQuery(userId?: string, weekStart?: string) {
  return useQuery<WorkloadSummaryResponse>({
    queryKey: queryKeys.workloadSummary(userId, weekStart),
    queryFn: async ({ signal }) => {
      const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : '';
      return apiGet<WorkloadSummaryResponse>(`/api/workload/summary${query}`, { signal });
    },
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 9c. Tasks List (Unpaginated / Full for project phases)
 * Stale time: 20s, GC time: 5 min
 */
export function useTasksQuery(userId?: string, filters?: TaskFilterParams) {
  return useQuery<Task[]>({
    queryKey: queryKeys.tasks(userId, filters),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.set('projectId', filters.projectId);
      if (filters?.phaseId) params.set('phaseId', filters.phaseId);
      if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId);
      if (filters?.scope) params.set('scope', filters.scope);
      if (filters?.state && filters.state !== 'ALL') params.set('state', filters.state);
      if (filters?.priority && filters.priority !== 'ALL') params.set('priority', filters.priority);
      if (filters?.hasRiskFlag !== undefined) params.set('hasRiskFlag', String(filters.hasRiskFlag));
      if (filters?.search) params.set('search', filters.search);
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
      const qs = params.toString();
      return apiGet<Task[]>(`/api/tasks${qs ? `?${qs}` : ''}`, { signal });
    },
    enabled: !!userId,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 9d. Tasks List Paginated
 * Stale time: 20s, GC time: 5 min
 */
export function useTasksPaginatedQuery(userId?: string, filters?: TaskFilterParams) {
  return useQuery<PaginatedTasksResponse>({
    queryKey: queryKeys.tasks(userId, filters),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.set('projectId', filters.projectId);
      if (filters?.phaseId) params.set('phaseId', filters.phaseId);
      if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId);
      if (filters?.scope) params.set('scope', filters.scope);
      if (filters?.state && filters.state !== 'ALL') params.set('state', filters.state);
      if (filters?.priority && filters.priority !== 'ALL') params.set('priority', filters.priority);
      if (filters?.hasRiskFlag !== undefined) params.set('hasRiskFlag', String(filters.hasRiskFlag));
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
      const qs = params.toString();
      return apiGet<PaginatedTasksResponse>(`/api/tasks${qs ? `?${qs}` : ''}`, { signal });
    },
    enabled: !!userId,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 9e. Task Detail
 * Stale time: 30s, GC time: 5 min
 */
export function useTaskDetailQuery(taskId?: string, userId?: string) {
  return useQuery<Task & { blockingTask?: any }>({
    queryKey: queryKeys.taskDetail(userId, taskId),
    queryFn: async ({ signal }) => {
      return apiGet<Task & { blockingTask?: any }>(`/api/tasks/${taskId}`, { signal });
    },
    enabled: !!userId && !!taskId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 9f. Task Summary Aggregates
 * Stale time: 20s, GC time: 5 min
 */
export function useTaskSummaryQuery(userId?: string, projectId?: string, scope?: string, assigneeId?: string) {
  return useQuery<TaskSummaryResponse>({
    queryKey: queryKeys.taskSummary(userId, projectId, scope, assigneeId),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      if (scope) params.set('scope', scope);
      if (assigneeId) params.set('assigneeId', assigneeId);
      const qs = params.toString();
      return apiGet<TaskSummaryResponse>(`/api/tasks/summary${qs ? `?${qs}` : ''}`, { signal });
    },
    enabled: !!userId,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 10. Designated Leave Approver
 * Stale time: 60s, GC time: 5 min
 */
export function useDesignatedApproverQuery(userId?: string) {
  return useQuery<{ id: string; name: string; role: string } | null>({
    queryKey: queryKeys.designatedApprover(userId),
    queryFn: async ({ signal }) => {
      try {
        const data = await apiGet<{ approver: { id: string; name: string; role: string } | null }>(
          '/api/leave/approver',
          { signal }
        );
        return data.approver;
      } catch {
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 11. Leave Requests
 * Stale time: 20s, GC time: 3 min
 */
export function useLeaveRequestsQuery(userId?: string, scope?: string, status?: string) {
  return useQuery<LeaveRequest[]>({
    queryKey: queryKeys.leaveRequests(userId, scope, status),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (scope) params.set('scope', scope);
      if (status) params.set('status', status);
      return apiGet<LeaveRequest[]>(
        `/api/leave${params.toString() ? `?${params.toString()}` : ''}`,
        { signal }
      );
    },
    enabled: !!userId,
    staleTime: 20_000,
    gcTime: 3 * 60_000,
  });
}

/**
 * 11b. Leave Summary Metrics
 * Stale time: 20s, GC time: 3 min
 */
export function useLeaveSummaryQuery(userId?: string) {
  return useQuery<LeaveSummaryResponse>({
    queryKey: queryKeys.leaveSummary(userId),
    queryFn: async ({ signal }) => {
      return apiGet<LeaveSummaryResponse>('/api/leave/summary', { signal });
    },
    enabled: !!userId,
    staleTime: 20_000,
    gcTime: 3 * 60_000,
  });
}

/**
 * 12. Issues Log
 * Stale time: 20s, GC time: 3 min
 */
export function useIssuesQuery(
  userId?: string,
  filters?: IssueFilterParams | string,
  legacySeverity?: string,
  legacyState?: string
) {
  const filterParams: IssueFilterParams =
    typeof filters === 'object' && filters !== null
      ? filters
      : {
          projectId: filters as string | undefined,
          severity: legacySeverity,
          state: legacyState,
        };

  return useQuery<Issue[]>({
    queryKey: queryKeys.issues(userId, filterParams),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (filterParams.projectId && filterParams.projectId !== 'ALL') params.set('projectId', filterParams.projectId);
      if (filterParams.severity && filterParams.severity !== 'ALL') params.set('severity', filterParams.severity);
      if (filterParams.state && filterParams.state !== 'ALL') params.set('state', filterParams.state);
      if (filterParams.search) params.set('search', filterParams.search);
      if (filterParams.sortBy) params.set('sortBy', filterParams.sortBy);
      if (filterParams.sortOrder) params.set('sortOrder', filterParams.sortOrder);
      const qs = params.toString();
      return apiGet<Issue[]>(`/api/issues${qs ? `?${qs}` : ''}`, { signal });
    },
    enabled: !!userId,
    staleTime: 20_000,
    gcTime: 3 * 60_000,
  });
}

/**
 * 12b. Paginated Issues Query
 */
export function useIssuesPaginatedQuery(userId?: string, filters?: IssueFilterParams) {
  return useQuery<PaginatedIssuesResponse>({
    queryKey: ['issues-paginated', userId, filters],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.projectId && filters.projectId !== 'ALL') params.set('projectId', filters.projectId);
      if (filters?.severity && filters.severity !== 'ALL') params.set('severity', filters.severity);
      if (filters?.state && filters.state !== 'ALL') params.set('state', filters.state);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
      const qs = params.toString();
      return apiGet<PaginatedIssuesResponse>(`/api/issues${qs ? `?${qs}` : ''}`, { signal });
    },
    enabled: !!userId,
    staleTime: 20_000,
    gcTime: 3 * 60_000,
  });
}

/**
 * 12c. Issues Summary Aggregates
 */
export function useIssuesSummaryQuery(userId?: string, projectId?: string) {
  return useQuery<IssueSummaryResponse>({
    queryKey: queryKeys.issuesSummary(userId, projectId),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (projectId && projectId !== 'ALL') params.set('projectId', projectId);
      const qs = params.toString();
      return apiGet<IssueSummaryResponse>(`/api/issues/summary${qs ? `?${qs}` : ''}`, { signal });
    },
    enabled: !!userId,
    staleTime: 20_000,
    gcTime: 3 * 60_000,
  });
}

/**
 * 12d. Risks List
 */
export function useRisksQuery(userId?: string, filters?: RiskFilterParams) {
  return useQuery<any[]>({
    queryKey: queryKeys.risks(userId, filters),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.projectId && filters.projectId !== 'ALL') params.set('projectId', filters.projectId);
      if (filters?.severity && filters.severity !== 'ALL') params.set('severity', filters.severity);
      if (filters?.includeClosed) params.set('includeClosed', 'true');
      if (filters?.search) params.set('search', filters.search);
      const qs = params.toString();
      return apiGet<any[]>(`/api/risks${qs ? `?${qs}` : ''}`, { signal });
    },
    enabled: !!userId,
    staleTime: 20_000,
    gcTime: 3 * 60_000,
  });
}

/**
 * 12e. Risks Summary Aggregates
 */
export function useRisksSummaryQuery(userId?: string, projectId?: string) {
  return useQuery<RiskSummaryResponse>({
    queryKey: queryKeys.risksSummary(userId, projectId),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (projectId && projectId !== 'ALL') params.set('projectId', projectId);
      const qs = params.toString();
      return apiGet<RiskSummaryResponse>(`/api/risks/summary${qs ? `?${qs}` : ''}`, { signal });
    },
    enabled: !!userId,
    staleTime: 20_000,
    gcTime: 3 * 60_000,
  });
}

/**
 * 13. Notifications
 * Stale time: 10s, GC time: 3 min
 */
export function useNotificationsQuery(userId?: string) {
  return useQuery<{ notifications: NotificationItem[]; unreadCount: number }>({
    queryKey: queryKeys.notifications(userId),
    queryFn: async ({ signal }) => {
      return apiGet<{ notifications: NotificationItem[]; unreadCount: number }>(
        '/api/notifications',
        { signal }
      );
    },
    enabled: !!userId,
    staleTime: 10_000,
    gcTime: 3 * 60_000,
  });
}

/**
 * 13b. Notification Unread Count (Lightweight)
 */
export function useNotificationUnreadCountQuery(userId?: string) {
  return useQuery<{ unreadCount: number }>({
    queryKey: queryKeys.notificationUnreadCount(userId),
    queryFn: async ({ signal }) => {
      return apiGet<{ unreadCount: number }>('/api/notifications/unread-count', { signal });
    },
    enabled: !!userId,
    staleTime: 15_000,
    gcTime: 3 * 60_000,
  });
}

/**
 * 14. Project Documents
 * Stale time: 30s, GC time: 5 min
 */
export function useProjectDocumentsQuery(projectId?: string, userId?: string) {
  return useQuery<DocumentItem[]>({
    queryKey: queryKeys.projectDocuments(userId, projectId),
    queryFn: async ({ signal }) => {
      return apiGet<DocumentItem[]>(`/api/projects/${projectId}/documents`, { signal });
    },
    enabled: !!userId && !!projectId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 15. Project Budget
 * Stale time: 30s, GC time: 5 min
 */
export function useProjectBudgetQuery(projectId?: string, userId?: string) {
  return useQuery<BudgetHealthData>({
    queryKey: queryKeys.projectBudget(userId, projectId),
    queryFn: async ({ signal }) => {
      return apiGet<BudgetHealthData>(`/api/projects/${projectId}/budget`, { signal });
    },
    enabled: !!userId && !!projectId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 16. Project Baselines
 * Stale time: 30s, GC time: 5 min
 */
export function useProjectBaselinesQuery(projectId?: string, userId?: string) {
  return useQuery<{ baselines: Baseline[]; comparison: BaselineComparison }>({
    queryKey: queryKeys.projectBaselines(userId, projectId),
    queryFn: async ({ signal }) => {
      const [blData, compData] = await Promise.all([
        apiGet<Baseline[]>(`/api/projects/${projectId}/baselines`, { signal }),
        apiGet<BaselineComparison>(`/api/projects/${projectId}/baselines/compare`, { signal }),
      ]);
      return { baselines: blData || [], comparison: compData };
    },
    enabled: !!userId && !!projectId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 17. Project Approvals
 * Stale time: 20s, GC time: 3 min
 */
/**
 * 17. Project Approvals
 * Stale time: 20s, GC time: 3 min
 */
export function useProjectApprovalsQuery(projectId?: string, userId?: string) {
  return useQuery<ApprovalRequest[]>({
    queryKey: queryKeys.projectApprovals(userId, projectId),
    queryFn: async ({ signal }) => {
      return apiGet<ApprovalRequest[]>(`/api/approvals/project/${projectId}`, { signal });
    },
    enabled: !!userId && !!projectId,
    staleTime: 20_000,
    gcTime: 3 * 60_000,
  });
}

/**
 * 17b. Approvals List (Global / Cross-Project)
 */
export function useApprovalsQuery(userId?: string, filters?: ApprovalFilterParams) {
  return useQuery<ApprovalRequest[]>({
    queryKey: queryKeys.approvals(userId, filters),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.filter) params.set('filter', filters.filter);
      if (filters?.projectId && filters.projectId !== 'ALL') params.set('projectId', filters.projectId);
      if (filters?.type && filters.type !== 'ALL') params.set('type', filters.type);
      if (filters?.state && filters.state !== 'ALL') params.set('state', filters.state);
      const qs = params.toString();
      return apiGet<ApprovalRequest[]>(`/api/approvals${qs ? `?${qs}` : ''}`, { signal });
    },
    enabled: !!userId,
    staleTime: 20_000,
    gcTime: 3 * 60_000,
  });
}

/**
 * 17c. Approvals Summary Aggregates
 */
export function useApprovalsSummaryQuery(userId?: string, projectId?: string) {
  return useQuery<ApprovalSummaryResponse>({
    queryKey: queryKeys.approvalsSummary(userId, projectId),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (projectId && projectId !== 'ALL') params.set('projectId', projectId);
      const qs = params.toString();
      return apiGet<ApprovalSummaryResponse>(`/api/approvals/summary${qs ? `?${qs}` : ''}`, { signal });
    },
    enabled: !!userId,
    staleTime: 20_000,
    gcTime: 3 * 60_000,
  });
}

/**
 * 18. Project Change Log
 * Stale time: 30s, GC time: 5 min
 */
export function useProjectChangeLogQuery(projectId?: string, userId?: string) {
  return useQuery<ChangeLogItem[]>({
    queryKey: queryKeys.projectChangeLog(userId, projectId),
    queryFn: async ({ signal }) => {
      return apiGet<ChangeLogItem[]>(`/api/projects/${projectId}/changelog`, { signal });
    },
    enabled: !!userId && !!projectId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 19. User List for Dropdowns (Assignees, Managers, etc.)
 * Stale time: 60s, GC time: 10 min
 */
export function useUsersListQuery(userId?: string, filters?: { search?: string; department?: string; roleId?: string }) {
  return useQuery<User[]>({
    queryKey: queryKeys.usersList(userId, filters),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.department && filters.department !== 'ALL') params.set('department', filters.department);
      if (filters?.roleId && filters.roleId !== 'ALL') params.set('roleId', filters.roleId);
      const qs = params.toString();
      return apiGet<User[]>(`/api/users${qs ? `?${qs}` : ''}`, { signal });
    },
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * 20. Users Management Directory
 * Stale time: 30s, GC time: 5 min
 */
export function useUsersManagementQuery(userId?: string, filters?: UserManagementFilterParams) {
  return useQuery<any[]>({
    queryKey: queryKeys.usersManagement(userId, filters),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters?.roleId && filters.roleId !== 'ALL') params.set('roleId', filters.roleId);
      if (filters?.department && filters.department !== 'ALL') params.set('department', filters.department);
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
      const qs = params.toString();
      return apiGet<any[]>(`/api/users/management${qs ? `?${qs}` : ''}`, { signal });
    },
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 20b. Paginated Users Management Query
 */
export function useUsersManagementPaginatedQuery(userId?: string, filters?: UserManagementFilterParams) {
  return useQuery<PaginatedUsersResponse>({
    queryKey: ['users-management-paginated', userId, filters],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters?.roleId && filters.roleId !== 'ALL') params.set('roleId', filters.roleId);
      if (filters?.department && filters.department !== 'ALL') params.set('department', filters.department);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
      const qs = params.toString();
      return apiGet<PaginatedUsersResponse>(`/api/users/management${qs ? `?${qs}` : ''}`, { signal });
    },
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 20c. Users Summary Aggregates
 */
export function useUsersSummaryQuery(userId?: string) {
  return useQuery<UserSummaryResponse>({
    queryKey: queryKeys.usersSummary(userId),
    queryFn: async ({ signal }) => {
      return apiGet<UserSummaryResponse>('/api/users/summary', { signal });
    },
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 20d. Portfolio Summary KPI Query
 */
export function usePortfolioSummaryQuery(userId?: string, isExecutive = false) {
  return useQuery<PortfolioSummaryResponse>({
    queryKey: queryKeys.portfolioSummary(userId),
    queryFn: async ({ signal }) => {
      return apiGet<PortfolioSummaryResponse>('/api/portfolio/summary', { signal });
    },
    enabled: !!userId && isExecutive,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 21. Roles List
 * Stale time: 60s, GC time: 10 min
 */
export function useRolesQuery(userId?: string) {
  return useQuery<RoleDefinition[]>({
    queryKey: queryKeys.roles(userId),
    queryFn: async ({ signal }) => {
      return apiGet<RoleDefinition[]>('/api/roles', { signal });
    },
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

// ─── Targeted Cache Invalidation Helpers ─────────────────────────────────────

/**
 * Invalidate project queries after a mutation without blowing away unrelated caches.
 */
export function invalidateProjectQueries(
  qc: QueryClient,
  userId?: string,
  projectId?: string,
  options?: {
    tasks?: boolean;
    issues?: boolean;
    risks?: boolean;
    budget?: boolean;
    baselines?: boolean;
    approvals?: boolean;
    documents?: boolean;
    statusOverride?: boolean;
    members?: boolean;
    charter?: boolean;
  }
) {
  if (projectId) {
    qc.invalidateQueries({ queryKey: queryKeys.projectDetail(userId, projectId) });
    qc.invalidateQueries({ queryKey: queryKeys.projectSummary(userId, projectId) });
  }

  // Members change affects team members list and project detail
  if (options?.members && projectId) {
    qc.invalidateQueries({ queryKey: queryKeys.projectMembers(userId, projectId) });
  }

  // Charter or general update affects project lists and CEO portfolio
  if (options?.charter || !options) {
    qc.invalidateQueries({ queryKey: ['projects', userId] });
    qc.invalidateQueries({ queryKey: queryKeys.projectsMinimal(userId) });
    qc.invalidateQueries({ queryKey: queryKeys.portfolioCeo(userId) });
    qc.invalidateQueries({ queryKey: ['portfolio-summary', userId] });
    qc.invalidateQueries({ queryKey: queryKeys.alerts(userId) });
    qc.invalidateQueries({ queryKey: queryKeys.badges(userId) });
  }

  // Tasks affect project progress, workload, dashboard alerts, badges, calendar
  if (options?.tasks) {
    qc.invalidateQueries({ queryKey: ['projects', userId] });
    qc.invalidateQueries({ queryKey: ['workload', userId] });
    qc.invalidateQueries({ queryKey: ['workload-summary', userId] });
    qc.invalidateQueries({ queryKey: ['tasks', userId] });
    qc.invalidateQueries({ queryKey: ['task-summary', userId] });
    qc.invalidateQueries({ queryKey: queryKeys.alerts(userId) });
    qc.invalidateQueries({ queryKey: queryKeys.badges(userId) });
    qc.invalidateQueries({ queryKey: queryKeys.calendarToday(userId) });
    qc.invalidateQueries({ queryKey: ['calendar-events', userId] });
  }

  // Issues affect issues log, dashboard alerts, badges
  if (options?.issues) {
    qc.invalidateQueries({ queryKey: ['issues', userId] });
    qc.invalidateQueries({ queryKey: ['issues-summary', userId] });
    qc.invalidateQueries({ queryKey: ['issues-paginated', userId] });
    qc.invalidateQueries({ queryKey: ['projects', userId] });
    qc.invalidateQueries({ queryKey: queryKeys.alerts(userId) });
    qc.invalidateQueries({ queryKey: queryKeys.badges(userId) });
  }

  // Risks affect dashboard alerts, badges, project list
  if (options?.risks) {
    qc.invalidateQueries({ queryKey: ['risks', userId] });
    qc.invalidateQueries({ queryKey: ['risks-summary', userId] });
    qc.invalidateQueries({ queryKey: ['projects', userId] });
    qc.invalidateQueries({ queryKey: queryKeys.alerts(userId) });
    qc.invalidateQueries({ queryKey: queryKeys.badges(userId) });
  }

  // Budget affects budget tab, project detail, CEO portfolio
  if (options?.budget) {
    if (projectId) {
      qc.invalidateQueries({ queryKey: queryKeys.projectBudget(userId, projectId) });
    }
    qc.invalidateQueries({ queryKey: queryKeys.portfolioCeo(userId) });
    qc.invalidateQueries({ queryKey: ['portfolio-summary', userId] });
  }

  // Baselines affect baselines tab
  if (options?.baselines && projectId) {
    qc.invalidateQueries({ queryKey: queryKeys.projectBaselines(userId, projectId) });
  }

  // Approvals affect approvals tab, dashboard alerts, badges
  if (options?.approvals) {
    if (projectId) {
      qc.invalidateQueries({ queryKey: queryKeys.projectApprovals(userId, projectId) });
    }
    qc.invalidateQueries({ queryKey: ['approvals', userId] });
    qc.invalidateQueries({ queryKey: ['approvals-summary', userId] });
    qc.invalidateQueries({ queryKey: queryKeys.alerts(userId) });
    qc.invalidateQueries({ queryKey: queryKeys.badges(userId) });
  }

  // Documents affect documents tab
  if (options?.documents && projectId) {
    qc.invalidateQueries({ queryKey: queryKeys.projectDocuments(userId, projectId) });
  }

  // Status override affects project list, CEO portfolio, alerts, badges
  if (options?.statusOverride) {
    qc.invalidateQueries({ queryKey: ['projects', userId] });
    qc.invalidateQueries({ queryKey: queryKeys.projectsMinimal(userId) });
    qc.invalidateQueries({ queryKey: queryKeys.portfolioCeo(userId) });
    qc.invalidateQueries({ queryKey: ['portfolio-summary', userId] });
    qc.invalidateQueries({ queryKey: queryKeys.alerts(userId) });
    qc.invalidateQueries({ queryKey: queryKeys.badges(userId) });
  }
}

/**
 * Invalidate user management and organization directory queries.
 */
export function invalidateUserQueries(qc: QueryClient, userId?: string) {
  qc.invalidateQueries({ queryKey: ['users-management', userId] });
  qc.invalidateQueries({ queryKey: ['users-management-paginated', userId] });
  qc.invalidateQueries({ queryKey: ['users-summary', userId] });
  qc.invalidateQueries({ queryKey: ['users-list', userId] });
  qc.invalidateQueries({ queryKey: queryKeys.roles(userId) });
  qc.invalidateQueries({ queryKey: ['workload', userId] });
  qc.invalidateQueries({ queryKey: ['workload-summary', userId] });
}

/**
 * Invalidate issues queries.
 */
export function invalidateIssueQueries(qc: QueryClient, userId?: string, projectId?: string) {
  qc.invalidateQueries({ queryKey: ['issues', userId] });
  qc.invalidateQueries({ queryKey: ['issues-summary', userId] });
  qc.invalidateQueries({ queryKey: ['issues-paginated', userId] });
  qc.invalidateQueries({ queryKey: queryKeys.alerts(userId) });
  qc.invalidateQueries({ queryKey: queryKeys.badges(userId) });
  if (projectId) {
    qc.invalidateQueries({ queryKey: queryKeys.projectDetail(userId, projectId) });
  }
}

/**
 * Invalidate risks queries.
 */
export function invalidateRiskQueries(qc: QueryClient, userId?: string, projectId?: string) {
  qc.invalidateQueries({ queryKey: ['risks', userId] });
  qc.invalidateQueries({ queryKey: ['risks-summary', userId] });
  qc.invalidateQueries({ queryKey: queryKeys.alerts(userId) });
  qc.invalidateQueries({ queryKey: queryKeys.badges(userId) });
  if (projectId) {
    qc.invalidateQueries({ queryKey: queryKeys.projectDetail(userId, projectId) });
  }
}

/**
 * Invalidate leave queries.
 */
export function invalidateLeaveQueries(qc: QueryClient, userId?: string) {
  qc.invalidateQueries({ queryKey: ['leave-requests', userId] });
  qc.invalidateQueries({ queryKey: ['leave-summary', userId] });
  qc.invalidateQueries({ queryKey: ['workload', userId] });
  qc.invalidateQueries({ queryKey: ['workload-summary', userId] });
}

/**
 * Invalidate approval queries.
 */
export function invalidateApprovalQueries(qc: QueryClient, userId?: string, projectId?: string) {
  qc.invalidateQueries({ queryKey: ['approvals', userId] });
  qc.invalidateQueries({ queryKey: ['approvals-summary', userId] });
  qc.invalidateQueries({ queryKey: queryKeys.alerts(userId) });
  qc.invalidateQueries({ queryKey: queryKeys.badges(userId) });
  if (projectId) {
    qc.invalidateQueries({ queryKey: queryKeys.projectApprovals(userId, projectId) });
  }
}

/**
 * Invalidate notifications queries.
 */
export function invalidateNotificationQueries(qc: QueryClient, userId?: string) {
  qc.invalidateQueries({ queryKey: ['notifications', userId] });
  qc.invalidateQueries({ queryKey: ['notification-unread-count', userId] });
  qc.invalidateQueries({ queryKey: queryKeys.badges(userId) });
}

/**
 * Invalidate task, workload, and related project queries after task mutations.
 */
export function invalidateTaskQueries(
  qc: QueryClient,
  userId?: string,
  projectId?: string,
  taskId?: string
) {
  // Prefix match invalidates all filtered & paginated tasks
  qc.invalidateQueries({ queryKey: ['tasks', userId] });
  qc.invalidateQueries({ queryKey: ['task-summary', userId] });
  if (taskId) {
    qc.invalidateQueries({ queryKey: ['task-detail', userId, taskId] });
  }
  // Tasks impact project details and project list
  if (projectId) {
    qc.invalidateQueries({ queryKey: queryKeys.projectDetail(userId, projectId) });
    qc.invalidateQueries({ queryKey: queryKeys.projectSummary(userId, projectId) });
  }
  qc.invalidateQueries({ queryKey: ['projects', userId] });
  // Tasks impact workload, calendar, alerts, badges
  qc.invalidateQueries({ queryKey: ['workload', userId] });
  qc.invalidateQueries({ queryKey: ['workload-summary', userId] });
  qc.invalidateQueries({ queryKey: queryKeys.alerts(userId) });
  qc.invalidateQueries({ queryKey: queryKeys.badges(userId) });
  qc.invalidateQueries({ queryKey: queryKeys.calendarToday(userId) });
  qc.invalidateQueries({ queryKey: ['calendar-events', userId] });
}

