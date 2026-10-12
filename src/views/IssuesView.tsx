import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { Issue, Project } from '../types.ts';
import { SeverityBadge } from '../components/StatusBadge.tsx';
import {
  AlertCircle,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertOctagon,
  ArrowRight,
  X,
  Search,
} from 'lucide-react';

interface IssuesViewProps {
  onSelectProject: (projectId: string, initialTab?: string) => void;
}

export const IssuesView: React.FC<IssuesViewProps> = ({ onSelectProject }) => {
  const { currentUser, isCEO, isProjectOwner } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [stateFilter, setStateFilter] = useState<string>('OPEN');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const activeMobileFilterCount =
    (stateFilter !== 'OPEN' ? 1 : 0) +
    (severityFilter !== 'ALL' ? 1 : 0) +
    (selectedProjectId !== 'ALL' ? 1 : 0);

  // Modals & Toast
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [newProjectId, setNewProjectId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState<'Minor' | 'Major' | 'Critical'>('Major');
  const [newDetail, setNewDetail] = useState('');

  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenIssueId, setReopenIssueId] = useState<string | null>(null);
  const [reopenComment, setReopenComment] = useState('');

  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const showToast = (type: 'error' | 'success', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [issuesRes, projectsRes] = await Promise.all([
        apiFetch('/api/issues'),
        apiFetch('/api/projects'),
      ]);

      if (!issuesRes.ok || !projectsRes.ok) {
        throw new Error('Failed to load issues log');
      }

      const issuesData = await issuesRes.json();
      const projectsData = await projectsRes.json();

      setIssues(issuesData);
      setProjects(projectsData);
      if (projectsData.length > 0 && !newProjectId) {
        setNewProjectId(projectsData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleRaiseIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDetail.trim() || !newProjectId) {
      showToast('error', 'All fields are required to raise an issue');
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
          projectId: newProjectId,
          title: newTitle.trim(),
          severity: newSeverity,
          detail: newDetail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to raise issue');

      showToast('success', `Issue "${newTitle}" registered.`);
      setShowRaiseModal(false);
      setNewTitle('');
      setNewDetail('');
      fetchData();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleCloseIssue = async (issueId: string) => {
    try {
      const res = await apiFetch(`/api/issues/${issueId}/close`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to close issue');
      showToast('success', 'Issue closed.');
      fetchData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleReopenIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenComment.trim()) {
      showToast('error', 'A comment explaining the reason is strictly required when reopening an issue.');
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

      showToast('success', 'Issue reopened.');
      setShowReopenModal(false);
      setReopenComment('');
      setReopenIssueId(null);
      fetchData();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const filteredIssues = issues.filter((i) => {
    const matchesProject = selectedProjectId === 'ALL' || i.projectId === selectedProjectId;
    const matchesSeverity = severityFilter === 'ALL' || i.severity === severityFilter;
    const matchesState =
      stateFilter === 'ALL' ||
      (stateFilter === 'OPEN' ? i.state !== 'Closed' : i.state === 'Closed');
    const matchesSearch =
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.project?.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesProject && matchesSeverity && matchesState && matchesSearch;
  });

  return (
    <div className="space-y-5 sm:space-y-6 pb-20 sm:pb-24 max-w-full overflow-hidden sm:overflow-visible">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-16 right-4 left-4 sm:left-auto z-50 p-4 rounded-2xl shadow-lg border max-w-md animate-in slide-in-from-top-2 text-xs flex items-center justify-between gap-3 ${
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
          <button onClick={() => setToastMessage(null)} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header — title + action */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-[#231E1B] tracking-tight">
            Issues
          </h1>
          <p className="text-xs lg:text-sm text-[#70675D] mt-0.5 break-words">
            Events that have already occurred and require operational response.
          </p>
        </div>

        <button
          id="raise-issue-main-btn"
          onClick={() => setShowRaiseModal(true)}
          className="shrink-0 px-3.5 py-2 sm:px-4 lg:py-2 rounded-xl bg-[#C85A32] hover:bg-[#AD4722] active:scale-95 text-white text-xs lg:text-sm font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[36px] sm:min-h-[44px] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="sm:hidden">Raise</span>
          <span className="hidden sm:inline">Raise Issue</span>
        </button>
      </div>

      {/* Filters & Controls */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Row 1: Search input + FILTERS button on mobile */}
        <div className="flex flex-row items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[#8C8275] absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="issues-search-input"
              type="text"
              placeholder="Search issues, summaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 rounded-full bg-white border border-[#DDD6C8] text-xs sm:text-sm text-[#231E1B] placeholder-[#8F867A] focus:outline-none focus:border-[#C85A32] shadow-2xs min-h-[36px] sm:min-h-[44px]"
            />
          </div>

          {/* FILTERS button — mobile only */}
          <button
            type="button"
            id="issues-mobile-filters-btn"
            onClick={() => setShowMobileFilters((prev) => !prev)}
            className={`sm:hidden shrink-0 px-3.5 py-2 rounded-full border text-xs font-bold transition-all min-h-[36px] cursor-pointer flex items-center gap-1.5 shadow-2xs ${
              showMobileFilters || activeMobileFilterCount > 0
                ? 'bg-[#C85A32] text-white border-[#C85A32]'
                : 'bg-white text-[#231E1B] border-[#DDD6C8] hover:bg-[#FAF7F2]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>FILTERS</span>
            {activeMobileFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-[#C85A32] text-[10px] font-bold flex items-center justify-center -mr-0.5">
                {activeMobileFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Compact Mobile Filter Panel */}
        {showMobileFilters && (
          <div className="sm:hidden p-3.5 rounded-2xl bg-white border border-[#DDD6C8] shadow-xs space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#F2ECE1]">
              <span className="text-xs font-bold text-[#231E1B] uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#C85A32]" />
                Filter Issues
              </span>
              {activeMobileFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setStateFilter('OPEN');
                    setSeverityFilter('ALL');
                    setSelectedProjectId('ALL');
                  }}
                  className="text-[11px] font-semibold text-[#C85A32] hover:underline cursor-pointer"
                >
                  Reset all
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-bold text-[#70675D] uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DDD6C8] bg-[#FBF9F4] text-xs font-semibold text-[#231E1B] focus:outline-none focus:border-[#C85A32] min-h-[38px] cursor-pointer"
                >
                  <option value="OPEN">Active Issues</option>
                  <option value="CLOSED">Closed Issues</option>
                  <option value="ALL">All Status</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block text-[10px] font-bold text-[#70675D] uppercase tracking-wider mb-1">
                  Severity
                </label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DDD6C8] bg-[#FBF9F4] text-xs font-semibold text-[#231E1B] focus:outline-none focus:border-[#C85A32] min-h-[38px] cursor-pointer"
                >
                  <option value="ALL">All Severity Levels</option>
                  <option value="Critical">Critical</option>
                  <option value="Major">Major</option>
                  <option value="Minor">Minor</option>
                </select>
              </div>

              {/* Project Filter */}
              <div>
                <label className="block text-[10px] font-bold text-[#70675D] uppercase tracking-wider mb-1">
                  Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DDD6C8] bg-[#FBF9F4] text-xs font-semibold text-[#231E1B] focus:outline-none focus:border-[#C85A32] min-h-[38px] cursor-pointer"
                >
                  <option value="ALL">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Desktop: pill chips */}
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {/* State */}
          <div className="flex items-center gap-1 bg-[#FAF6EE] p-1 rounded-full border border-[#EAE3D5] shrink-0">
            <button
              onClick={() => setStateFilter('OPEN')}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-colors min-h-[44px] cursor-pointer flex items-center justify-center ${
                stateFilter === 'OPEN' ? 'bg-[#C85A32] text-white shadow-2xs' : 'text-[#70675D]'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStateFilter('CLOSED')}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-colors min-h-[44px] cursor-pointer flex items-center justify-center ${
                stateFilter === 'CLOSED' ? 'bg-[#C85A32] text-white shadow-2xs' : 'text-[#70675D]'
              }`}
            >
              Closed
            </button>
            <button
              onClick={() => setStateFilter('ALL')}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-colors min-h-[44px] cursor-pointer flex items-center justify-center ${
                stateFilter === 'ALL' ? 'bg-[#C85A32] text-white shadow-2xs' : 'text-[#70675D]'
              }`}
            >
              All
            </button>
          </div>

          {/* Severity */}
          <div className="flex items-center gap-1 bg-[#FAF6EE] p-1 rounded-full border border-[#EAE3D5] shrink-0">
            {['ALL', 'Critical', 'Major', 'Minor'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-colors min-h-[44px] cursor-pointer flex items-center justify-center ${
                  severityFilter === sev ? 'bg-[#C85A32] text-white shadow-2xs' : 'text-[#70675D]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Project dropdown */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3.5 py-1.5 rounded-full border border-[#DDD6C8] bg-white text-xs font-medium text-[#231E1B] focus:outline-none min-h-[44px] shrink-0 cursor-pointer"
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white/70 border border-[#EAE3D5] animate-pulse space-y-2.5"
            >
              <div className="h-4 w-1/3 bg-[#E8E2D5] rounded-md" />
              <div className="h-3 w-3/4 bg-[#E8E2D5] rounded-md" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="px-3 py-1 bg-white rounded-lg text-xs font-semibold">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredIssues.length === 0 && (
        <div className="p-10 rounded-2xl bg-white border border-[#EAE3D5] text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-[#526E55] mx-auto opacity-80" />
          <h3 className="font-serif text-lg font-bold text-[#231E1B]">No issues found</h3>
          <p className="text-xs text-[#70675D] max-w-sm mx-auto">
            {searchQuery || severityFilter !== 'ALL' || stateFilter !== 'OPEN'
              ? 'No issues match your current filters.'
              : 'All systems operational. No active issues recorded.'}
          </p>
        </div>
      )}

      {/* Issues List */}
      {!loading && !error && filteredIssues.length > 0 && (
        <div className="space-y-3">
          {filteredIssues.map((issue) => {
            const isClosed = issue.state === 'Closed';
            const canManageIssue =
              isCEO ||
              (isProjectOwner &&
                (issue.project?.ownerId === currentUser?.id ||
                  issue.raisedBy === currentUser?.id ||
                  issue.ownerId === currentUser?.id)) ||
              issue.raisedBy === currentUser?.id ||
              issue.ownerId === currentUser?.id;
            return (
              <div
                key={issue.id}
                id={`issue-item-${issue.id}`}
                className="p-5 rounded-2xl bg-white border border-[#EAE3D5] shadow-xs hover:border-[#D5C9B8] transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        onClick={() => onSelectProject(issue.projectId, 'issues')}
                        className="text-xs font-semibold text-[#8C6D58] bg-[#F5F0E6] hover:bg-[#EAE2D2] px-2.5 py-0.5 rounded-full cursor-pointer transition-colors"
                      >
                        {issue.project?.name}
                      </span>
                      <SeverityBadge severity={issue.severity} />
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          isClosed ? 'bg-gray-100 text-gray-600' : 'bg-[#FBECE6] text-[#C85A32]'
                        }`}
                      >
                        {issue.state}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-base text-[#231E1B] leading-snug">
                      {issue.title}
                    </h4>

                    <p className="text-xs text-[#554E44] leading-relaxed">{issue.detail}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isClosed && canManageIssue ? (
                      <button
                        onClick={() => {
                          setReopenIssueId(issue.id);
                          setShowReopenModal(true);
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-[#F5F1E8] hover:bg-[#EAE4D6] text-xs font-semibold text-[#231E1B] min-h-[40px] cursor-pointer"
                      >
                        Reopen Issue
                      </button>
                    ) : !isClosed && canManageIssue ? (
                      <button
                        onClick={() => handleCloseIssue(issue.id)}
                        className="px-3.5 py-1.5 rounded-full bg-[#EBF2EB] hover:bg-[#DCEBDD] text-xs font-semibold text-[#2D5A34] min-h-[40px] cursor-pointer"
                      >
                        Close Issue
                      </button>
                    ) : null}
                  </div>
                </div>

                {issue.reopenComment && (
                  <div className="text-xs text-[#8C6D58] bg-[#FAF6EE] p-2.5 rounded-xl border border-[#EFECE4]">
                    <strong>Reopened with reason:</strong> {issue.reopenComment}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-[#8C8275] pt-2 border-t border-[#F2ECE1]">
                  <span>
                    Raised by {issue.raiser?.name || 'team'} on{' '}
                    {new Date(issue.raisedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => onSelectProject(issue.projectId, 'issues')}
                    className="text-[#C85A32] hover:underline font-semibold flex items-center gap-1"
                  >
                    View in Project <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RAISE ISSUE MODAL */}
      {showRaiseModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowRaiseModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#EAE3D5] space-y-4 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-lg font-bold text-[#231E1B]">Raise New Issue</h4>
              <button 
                onClick={() => setShowRaiseModal(false)} 
                className="p-2 text-gray-400 hover:text-black rounded-xl hover:bg-[#F5F1E8] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRaiseIssue} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Issue Title <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Critical boiler pressure sensor failure"
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Severity</label>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px]"
                >
                  <option value="Minor">Minor</option>
                  <option value="Major">Major</option>
                  <option value="Critical">Critical (Forces project Off Track &amp; notifies CEO)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Detailed Context <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDetail}
                  onChange={(e) => setNewDetail(e.target.value)}
                  placeholder="Describe the issue, what occurred, and the immediate operational consequence..."
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRaiseModal(false)}
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

      {/* REOPEN ISSUE MODAL */}
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
                className="p-2 text-gray-400 hover:text-black rounded-xl hover:bg-[#F5F1E8] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#70675D]">
              A non-empty comment explaining the recurrence or reason is strictly required.
            </p>
            <form onSubmit={handleReopenIssue} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Reopen Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenComment}
                  onChange={(e) => setReopenComment(e.target.value)}
                  placeholder="Explain why this issue is being reopened..."
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
                  Confirm Reopen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
