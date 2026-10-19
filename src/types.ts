export type Role = 'Employee' | 'CTO' | 'CEO' | 'Intern' | string;
export type ProjectStatus = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
export type TaskState = 'Not started' | 'In progress' | 'Blocked' | 'Completed';
export type TaskPriority = 'Low' | 'Normal' | 'High';
export type IssueSeverity = 'Minor' | 'Major' | 'Critical';
export type IssueState = 'Open' | 'In progress' | 'Closed';
export type RiskSeverity = 'Low' | 'Medium' | 'High';

export interface RoleDefinition {
  id: string;
  name: string;
  rank: number;
  isExecutive: boolean;
  canManageUsers: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    users: number;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  roleId?: string | null;
  roleRank?: number;
  isExecutive?: boolean;
  canManageUsers?: boolean;
  managerId?: string | null;
  manager?: { id: string; name: string; role: Role; avatarUrl?: string | null } | null;
  roleDefinition?: RoleDefinition | null;
  department: string | null;
  avatarUrl: string | null;
  isSignupCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface QualityCheck {
  id: string;
  taskId: string;
  label: string;
  mandatory: boolean;
  checkedBy: string | null;
  checkedAt: string | null;
  checker?: { id: string; name: string } | null;
}

export interface Task {
  id: string;
  phaseId: string;
  title: string;
  assigneeId: string | null;
  priority: TaskPriority;
  plannedStart: string;
  plannedEnd: string;
  plannedHours: number;
  actualHours: number;
  state: TaskState;
  dependsOn: string | null;
  isBaselined: boolean;
  hasRiskFlag: boolean;
  riskFlagReason: string | null;
  assignee?: {
    id: string;
    name: string;
    role?: string;
    roleDefinition?: RoleDefinition | null;
    avatarUrl: string | null;
  } | null;
  qualityChecks?: QualityCheck[];
  blockingTask?: { id: string; title: string; state: TaskState } | null;
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
  order: number;
  isArchived: boolean;
  tasks: Task[];
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  baselineDate: string;
  forecastDate: string;
  actualDate: string | null;
  isBaselined: boolean;
}

export interface IssueAttachment {
  id: string;
  issueId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileType: 'IMAGE' | 'DOCUMENT' | string;
  createdAt: string;
}

export interface Issue {
  id: string;
  projectId: string;
  taskId: string | null;
  title: string;
  severity: IssueSeverity;
  state: IssueState;
  ownerId: string;
  detail: string;
  stepsToReproduce?: string | null;
  raisedBy: string;
  raisedAt: string;
  closedAt: string | null;
  reopenComment: string | null;
  project?: { id: string; name: string; ownerId?: string };
  task?: { id: string; title: string } | null;
  owner?: { id: string; name: string; avatarUrl?: string | null };
  raiser?: { id: string; name: string; avatarUrl?: string | null };
  attachments?: IssueAttachment[];
}

export interface Risk {
  id: string;
  projectId: string;
  taskId: string | null;
  description: string;
  severity: RiskSeverity;
  mitigation: string;
  ownerId: string;
  lastReviewedAt: string;
  closedAt: string | null;
  isStale?: boolean;
  project?: { id: string; name: string; ownerId?: string };
  task?: { id: string; title: string } | null;
  owner?: { id: string; name: string };
}

export interface ProjectMetrics {
  progress: number;
  plan: number;
  status: ProjectStatus;
  isOverridden: boolean;
  hasCriticalIssueOpen: boolean;
  hasHighRiskOpen: boolean;
  totalTasks: number;
  completedTasks: number;
  nextMilestone: Milestone | null;
}

export interface Project {
  id: string;
  name: string;
  goal: string;
  ownerId: string;
  owner?: User;
  sponsor: string;
  startDate: string;
  endDate: string;
  plannedBudget: number;
  contingency: number;
  spendToDate: number;
  statusOverride: string | null;
  baselineId: string | null;
  createdAt: string;
  phases: Phase[];
  milestones: Milestone[];
  issues: Issue[];
  risks: Risk[];
  memberships?: Array<{ role: string; user: User }>;
  metrics?: ProjectMetrics;
  statusLogs?: Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    reason: string;
    createdAt: string;
    user: { id: string; name: string };
  }>;
  changeLogs?: Array<{
    id: string;
    action: string;
    details: string;
    changedBy: string;
    createdAt: string;
  }>;
}

export interface WorkloadMember {
  user: User;
  referenceHours: number;
  effectiveReferenceHours?: number;
  leaveDeductionHours?: number;
  allocatedHours: number;
  workloadPercentage: number;
  status: 'OVER' | 'BALANCED' | 'AVAILABLE';
  statusLabel: string;
  projects: Array<{ id: string; name: string; hours: number }>;
  activeTasksCount: number;
  approvedLeaves?: Array<{
    id: string;
    leaveType: string;
    dayType: string;
    startDate: string;
    endDate: string;
    reason?: string | null;
  }>;
  hasSchedulingConflict?: boolean;
  schedulingConflicts?: string[];
}

export interface AlertItem {
  id: string;
  category: 'CRITICAL_ISSUE' | 'HIGH_RISK' | 'RISK_FLAG' | 'BLOCKED' | 'QUALITY_CHECK' | 'TASK' | 'NOTIFICATION';
  title: string;
  subtitle: string;
  projectId: string;
  projectName: string;
  severity?: 'Critical' | 'High' | 'Normal';
  timestamp: string;
  linkUrl: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  authorId: string;
  body: string;
  mentions: string;
  sentAt: string;
  author: {
    id: string;
    name: string;
    role: Role;
    avatarUrl: string | null;
    department: string | null;
  };
}

export interface ApprovalRequest {
  id: string;
  projectId: string;
  type: 'Budget' | 'Timeline' | 'Scope';
  summary: string;
  detail: string;
  impact: string;
  requestedBy: string;
  approverId: string;
  state: 'Pending' | 'Approved' | 'Sent back';
  requestedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  payload: string | null;
  version: number;
  previousRequestId: string | null;
  project?: { id: string; name: string; ownerId?: string; sponsor?: string };
  requester?: { id: string; name: string; role: Role; avatarUrl?: string | null };
  approver?: { id: string; name: string; role: Role; avatarUrl?: string | null };
}

export interface BaselineSnapshot {
  version: number;
  capturedAt: string;
  project: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    plannedBudget: number;
    contingency: number;
  };
  phases: Array<{
    id: string;
    name: string;
    plannedStart: string;
    plannedEnd: string;
    plannedBudget: number;
    taskCount: number;
    tasks: Array<{
      id: string;
      title: string;
      plannedStart: string;
      plannedEnd: string;
      plannedHours: number;
      assigneeId: string | null;
    }>;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    baselineDate: string;
    forecastDate: string;
  }>;
}

export interface Baseline {
  id: string;
  projectId: string;
  name: string;
  version: number;
  approvedBy: string;
  approvedAt: string;
  dataSnapshot: string;
  createdAt: string;
}

export interface BaselineComparison {
  hasBaseline: boolean;
  message?: string;
  baseline?: {
    id: string;
    name: string;
    version: number;
    approvedBy: string;
    approvedAt: string;
  };
  milestones: Array<{
    id: string;
    title: string;
    baselineDate: string;
    forecastDate: string;
    actualDate: string | null;
    slippageDays: number;
    slippageWeeks: number;
    isSlipped: boolean;
  }>;
  unbaselinedTasksCount: number;
  unbaselinedTasks: Task[];
  hoursComparison: {
    baselinedHours: number;
    currentHours: number;
    deltaHours: number;
  };
  budgetComparison: {
    baselinedBudget: number;
    currentBudget: number;
    deltaBudget: number;
  };
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  s3Bucket: string;
  uploadedBy: string;
  comment: string | null;
  uploadedAt: string;
  uploader?: { id: string; name: string };
}

export interface DocumentItem {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  fileType: string;
  currentVersion: number;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  uploader?: { id: string; name: string; role: Role };
  versions: DocumentVersion[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  isPush: boolean;
  linkUrl: string | null;
  createdAt: string;
}

export interface ChangeLogItem {
  id: string;
  projectId: string;
  what: string | null;
  fromValue: string | null;
  toValue: string | null;
  actorId: string | null;
  at: string;
  sourceType: string | null;
  sourceId: string | null;
  entityType?: string;
  entityId?: string;
  action?: string;
  details?: string;
  changedBy?: string;
}

export interface BudgetHealthData {
  projectId: string;
  projectName: string;
  plannedBudget: number;
  contingency: number;
  totalBudget: number;
  spendToDate: number;
  remaining: number;
  planPercent: number;
  plannedSpendToDate: number;
  variance: number;
  spendPercent: number;
  isOverBudget: boolean;
  isWarning90Percent: boolean;
  phases: Array<{
    id: string;
    name: string;
    plannedStart: string;
    plannedEnd: string;
    plannedBudget: number;
    spendToDate: number;
    remaining: number;
    spendPercent: number;
    isWarning90Percent: boolean;
  }>;
}

export interface CEOPortfolioKPIs {
  totalProjects: number;
  onTrackCount: number;
  atRiskCount: number;
  offTrackCount: number;
  totalBudget: number;
  totalContingency: number;
  totalPortfolioFunds: number;
  totalSpend: number;
  portfolioRemaining: number;
  overallSpendPercent: number;
  totalCriticalIssues: number;
  totalHighRisks: number;
}

export interface CEOPortfolioProject {
  id: string;
  name: string;
  goal: string;
  sponsor: string;
  owner: { id: string; name: string; avatarUrl?: string | null };
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  isOverridden: boolean;
  progress: number;
  plan: number;
  plannedBudget: number;
  contingency: number;
  spendToDate: number;
  remainingBudget: number;
  variance: number;
  isWarning90Percent: boolean;
  isOverBudget: boolean;
  criticalIssuesCount: number;
  highRisksCount: number;
  openIssuesCount: number;
  openRisksCount: number;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Sent back' | 'Declined';
export type LeaveType = 'Annual Leave' | 'Sick Leave' | 'Personal Leave' | 'Unpaid Leave' | 'Other';
export type DayType = 'Full day' | 'Half day';

export interface LeaveRequest {
  id: string;
  requestedBy: string;
  startDate: string;
  endDate: string;
  dayType: DayType;
  leaveType: LeaveType;
  reason: string | null;
  status: LeaveStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: {
    id: string;
    name: string;
    role: Role;
    department: string | null;
    avatarUrl: string | null;
    roleDefinition?: { id: string; name: string; rank: number; isExecutive: boolean } | null;
  };
  reviewer?: {
    id: string;
    name: string;
    role: Role;
    roleDefinition?: { id: string; name: string; rank: number; isExecutive: boolean } | null;
  } | null;
  designatedApprover?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

export interface DashboardMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  roleRank: number;
  isExecutive: boolean;
  isIntern: boolean;
  membershipType: string;
  avatarUrl?: string | null;
  department?: string | null;
  assignedTasksCount: number;
  activeTasks: string[];
}

export interface DashboardProject {
  id: string;
  name: string;
  goal: string;
  status: ProjectStatus;
  progress: number;
  plan: number;
  owner?: { id: string; name: string; email?: string; role?: string; avatarUrl?: string | null } | null;
  totalTasksCount: number;
  completedTasksCount: number;
  activeTasksCount: number;
  members: DashboardMember[];
}

export interface DashboardScope {
  roleRank: number;
  isExecutive: boolean;
  canManageUsers: boolean;
  isManager: boolean;
  visibleProjectsCount: number;
  visibleTeamCount: number;
}

export interface DashboardTaskDistribution {
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  notStarted: number;
}

export interface DashboardSubordinateTask {
  id: string;
  title: string;
  state: TaskState;
  priority: TaskPriority;
  plannedEnd: string;
  plannedHours: number;
  assignee?: {
    id: string;
    name: string;
    role: string;
    roleDefinition?: { id: string; name: string; rank: number; isExecutive: boolean } | null;
    avatarUrl?: string | null;
  } | null;
}

export interface DashboardWorkloadMetrics {
  teamDistribution: {
    totalTeam: number;
    overallocatedCount: number;
    balancedCount: number;
    availableCount: number;
  } | null;
  myWorkload: {
    allocatedHours: number;
    referenceHours: number;
    percentage: number;
    status: string;
    statusLabel: string;
  };
}

