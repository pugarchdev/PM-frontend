import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Project } from '../types.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { CEOPortfolioView } from './CEOPortfolioView.tsx';
import {
  FolderKanban,
  Calendar,
  UserCheck,
  AlertOctagon,
  Milestone as MilestoneIcon,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Briefcase,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';

interface ProjectsViewProps {
  onSelectProject: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onSelectProject }) => {
  const { currentUser, isCEO, isProjectOwner, directory } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'ceo_portfolio'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    goal: '',
    sponsor: '',
    startDate: '',
    endDate: '',
    ownerId: '',
    plannedBudget: 0,
    contingency: 0,
  });

  const fetchProjects = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const res = await apiFetch('/api/projects');
      if (!res.ok) throw new Error('Failed to load projects');
      const data = await res.json();
      setProjects(data);
    } catch (err: any) {
      if (showLoading) {
        setError(err.message || 'Error fetching projects');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchProjects(true);
  }, [currentUser]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || createLoading) return;
    isSubmittingRef.current = true;
    setCreateLoading(true);
    setCreateError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        goal: formData.goal.trim(),
        sponsor: formData.sponsor.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        plannedBudget: Number(formData.plannedBudget) || 0,
        contingency: Number(formData.contingency) || 0,
        ...(isCEO && formData.ownerId ? { ownerId: formData.ownerId } : {}),
      };

      const res = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      // Immediate local state update
      if (data && data.id) {
        setProjects((prev) => {
          const exists = prev.some((p) => p.id === data.id);
          return exists ? prev : [data, ...prev];
        });
      }

      setShowCreateModal(false);
      setFormData({
        name: '',
        goal: '',
        sponsor: '',
        startDate: '',
        endDate: '',
        ownerId: '',
        plannedBudget: 0,
        contingency: 0,
      });
      fetchProjects(false);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create project');
    } finally {
      setCreateLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (createError) setCreateError(null);
  };

  const today = new Date().toISOString().split('T')[0];

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.goal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.owner?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const projectStatus = p.metrics?.status || 'ON_TRACK';
    const matchesStatus = statusFilter === 'ALL' || projectStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5 sm:space-y-6 pb-20 sm:pb-24 max-w-full overflow-hidden sm:overflow-visible">
      {/* Header — title + actions */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-[#231E1B] tracking-tight">
            Projects
          </h1>
          <p className="text-xs lg:text-sm text-[#70675D] mt-0.5 break-words">
            Active strategic initiatives and operational schedules.
          </p>
        </div>

        {(isCEO || isProjectOwner) && (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              id="projects-add-btn"
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-2 sm:px-4 lg:py-2 rounded-xl text-xs lg:text-sm font-semibold text-white bg-[#C85A32] hover:bg-[#993F1C] active:scale-95 shadow-xs flex items-center gap-1.5 transition-all min-h-[36px] sm:min-h-[44px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add Project</span>
            </button>

            {isCEO && (
              <div className="hidden sm:flex items-center gap-1.5 p-1 bg-[#EAE3D5] rounded-xl lg:rounded-2xl">
                <button
                  id="projects-view-mode-grid"
                  onClick={() => setViewMode('list')}
                  className={`px-3.5 py-1.5 sm:py-2 rounded-lg lg:rounded-xl text-xs font-semibold cursor-pointer transition-colors min-h-[40px] sm:min-h-[44px] flex items-center justify-center ${
                    viewMode === 'list'
                      ? 'bg-white text-[#231E1B] shadow-xs'
                      : 'text-[#70685F] hover:text-[#231E1B]'
                  }`}
                >
                  Projects Grid
                </button>
                <button
                  id="projects-view-mode-portfolio"
                  onClick={() => setViewMode('ceo_portfolio')}
                  className={`px-3.5 py-1.5 sm:py-2 rounded-lg lg:rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[44px] ${
                    viewMode === 'ceo_portfolio'
                      ? 'bg-[#C85A32] text-white shadow-xs'
                      : 'text-[#70685F] hover:text-[#231E1B]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  CEO Executive Portfolio
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CEO view toggle on mobile: compact select */}
      {isCEO && (
        <select
          className="sm:hidden w-full px-3 py-2 rounded-xl border border-[#DDD6C8] bg-white text-xs font-semibold text-[#231E1B] focus:outline-none min-h-[36px] cursor-pointer"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as any)}
        >
          <option value="list">Grid View</option>
          <option value="ceo_portfolio">CEO Portfolio View</option>
        </select>
      )}

      {isCEO && viewMode === 'ceo_portfolio' ? (
        <CEOPortfolioView onSelectProject={onSelectProject} />
      ) : (
        <>
          {/* Controls: Search + Status Filter */}
          <div className="flex flex-row items-center gap-2 sm:gap-3">
            {/* Search input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-[#8C8275] absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="projects-search-input"
                type="text"
                placeholder="Search projects, goals, or owners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 rounded-full bg-white border border-[#DDD6C8] text-xs sm:text-sm text-[#231E1B] placeholder-[#8F867A] focus:outline-none focus:border-[#C85A32] shadow-2xs min-h-[36px] sm:min-h-[44px]"
              />
            </div>

            {/* Status filter — compact select on mobile */}
            <select
              className="sm:hidden shrink-0 w-[115px] px-2.5 py-2 rounded-full border border-[#DDD6C8] bg-white text-xs font-semibold text-[#231E1B] focus:outline-none min-h-[36px] cursor-pointer truncate"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Status</option>
              <option value="ON_TRACK">On Track</option>
              <option value="AT_RISK">At Risk</option>
              <option value="OFF_TRACK">Off Track</option>
            </select>

            {/* Status filter — pill chips on desktop */}
            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { key: 'ALL', label: 'All' },
                { key: 'ON_TRACK', label: 'On Track' },
                { key: 'AT_RISK', label: 'At Risk' },
                { key: 'OFF_TRACK', label: 'Off Track' },
              ].map((f) => (
                <button
                  key={f.key}
                  id={`filter-btn-${f.key.toLowerCase()}`}
                  onClick={() => setStatusFilter(f.key as any)}
                  className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all min-h-[40px] sm:min-h-[44px] cursor-pointer shrink-0 active:scale-95 flex items-center justify-center ${
                    statusFilter === f.key
                      ? 'bg-[#C85A32] text-white shadow-xs font-semibold'
                      : 'bg-[#F3EFE6] text-[#554F47] hover:bg-[#EAE4D6]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white/70 border border-[#EAE3D5] animate-pulse space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-1/2 bg-[#E8E2D5] rounded-md" />
                <div className="h-6 w-20 bg-[#E8E2D5] rounded-full" />
              </div>
              <div className="h-3 w-3/4 bg-[#E8E2D5] rounded-md" />
              <div className="h-2 w-full bg-[#E8E2D5] rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchProjects(true)}
            className="px-3 py-1 rounded-lg bg-white border border-[#F87171] text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProjects.length === 0 && (
        <div className="p-10 rounded-2xl bg-white border border-[#EAE3D5] text-center space-y-3">
          <FolderKanban className="w-12 h-12 text-[#8F867A] mx-auto opacity-70" />
          <h3 className="font-serif text-lg font-bold text-[#231E1B]">No projects found</h3>
          <p className="text-xs text-[#70675D] max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No projects match your search query or status filter.'
              : 'You do not have access to any projects under your current account.'}
          </p>
          {(searchQuery || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="mt-2 text-xs font-semibold text-[#C85A32] underline hover:text-[#993F1C]"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Projects Grid */}
      {!loading && !error && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => {
            const metrics = project.metrics!;
            const progressPct = metrics.progress;
            const planPct = metrics.plan;

            return (
              <div
                key={project.id}
                id={`project-card-${project.id}`}
                onClick={() => onSelectProject(project.id)}
                className="p-5 rounded-2xl bg-white border border-[#EAE3D5] hover:border-[#D0C4B2] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                {/* Card Top: Title & Status */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-lg font-bold text-[#231E1B] group-hover:text-[#C85A32] transition-colors line-clamp-2 leading-snug">
                      {project.name}
                    </h3>
                    <StatusBadge
                      status={metrics.status}
                      isOverridden={metrics.isOverridden}
                      size="sm"
                    />
                  </div>

                  <p className="text-xs text-[#70675D] line-clamp-2 leading-relaxed">
                    {project.goal}
                  </p>
                </div>

                {/* Progress & Plan Bar */}
                <div className="mt-4 pt-3 border-t border-[#F2ECE1] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#231E1B] flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-[#C85A32]" />
                      Progress: <strong className="text-[#C85A32]">{progressPct}%</strong>
                    </span>
                    <span className="text-[#70675D]">
                      Plan: <strong className="text-[#4E463E]">{planPct}%</strong>
                    </span>
                  </div>

                  {/* Dual progress bar */}
                  <div className="relative w-full h-2 rounded-full bg-[#EAE4D8] overflow-hidden">
                    {/* Planned progress backdrop indicator */}
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-[#D4C8B5]"
                      style={{ width: `${Math.min(100, Math.max(0, planPct))}%` }}
                    />
                    {/* Actual completed progress */}
                    <div
                      className={`relative h-full rounded-full transition-all duration-500 ${
                        metrics.status === 'OFF_TRACK'
                          ? 'bg-[#B3261E]'
                          : metrics.status === 'AT_RISK'
                          ? 'bg-[#D97706]'
                          : 'bg-[#526E55]'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                    />
                  </div>
                </div>

                {/* Card Bottom Meta */}
                <div className="mt-4 pt-3 border-t border-[#F2ECE1] flex items-center justify-between text-xs text-[#70675D]">
                  <div className="flex items-center gap-1.5 truncate">
                    <img
                      src={project.owner?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${project.owner?.name || 'Owner'}`}
                      alt={project.owner?.name}
                      className="w-5 h-5 rounded-full border border-white"
                      referrerPolicy="no-referrer"
                    />
                    <span className="font-medium text-[#4B443B] truncate max-w-[110px]">
                      {project.owner?.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {metrics.hasCriticalIssueOpen && (
                      <span className="inline-flex items-center gap-1 text-[#B3261E] font-semibold text-[11px]">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        Crit Issue
                      </span>
                    )}
                    {metrics.nextMilestone && (
                      <span className="inline-flex items-center gap-1 text-[#665D52] text-[11px] truncate max-w-[120px]">
                        <MilestoneIcon className="w-3.5 h-3.5 text-[#C85A32]" />
                        {metrics.nextMilestone.title}
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-[#A89D8E] group-hover:text-[#C85A32] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-[#EAE3D5] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Sheet Drag Indicator */}
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto mt-3 sm:hidden" />

            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#EAE3D5]">
              <h2 className="font-display text-lg sm:text-xl font-bold text-[#231E1B]">Create New Project</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-[#70675D] hover:text-[#231E1B] hover:bg-[#F5F1E8] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateProject} className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
              {createError && (
                <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-xs sm:text-sm flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Project Name */}
              <div>
                <label htmlFor="project-name" className="block text-xs sm:text-sm font-semibold text-[#231E1B] mb-1.5">
                  Project Name <span className="text-[#C85A32]">*</span>
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Website Redesign 2026"
                  required
                  maxLength={150}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#DDD6C8] text-sm text-[#231E1B] placeholder-[#8F867A] focus:outline-hidden focus:border-[#C85A32] shadow-2xs min-h-[44px]"
                />
              </div>

              {/* Goal */}
              <div>
                <label htmlFor="project-goal" className="block text-xs sm:text-sm font-semibold text-[#231E1B] mb-1.5">
                  Strategic Goal <span className="text-[#C85A32]">*</span>
                </label>
                <textarea
                  id="project-goal"
                  value={formData.goal}
                  onChange={(e) => handleInputChange('goal', e.target.value)}
                  placeholder="Describe the strategic objective and desired outcomes..."
                  required
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#DDD6C8] text-sm text-[#231E1B] placeholder-[#8F867A] focus:outline-hidden focus:border-[#C85A32] shadow-2xs min-h-[44px] resize-y"
                />
              </div>

              {/* Sponsor */}
              <div>
                <label htmlFor="project-sponsor" className="block text-xs sm:text-sm font-semibold text-[#231E1B] mb-1.5">
                  Executive Sponsor <span className="text-[#C85A32]">*</span>
                </label>
                <input
                  id="project-sponsor"
                  type="text"
                  value={formData.sponsor}
                  onChange={(e) => handleInputChange('sponsor', e.target.value)}
                  placeholder="e.g., Eleanor Foley"
                  required
                  maxLength={150}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#DDD6C8] text-sm text-[#231E1B] placeholder-[#8F867A] focus:outline-hidden focus:border-[#C85A32] shadow-2xs min-h-[44px]"
                />
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label htmlFor="project-start" className="block text-xs sm:text-sm font-semibold text-[#231E1B] mb-1.5">
                    Start Date <span className="text-[#C85A32]">*</span>
                  </label>
                  <input
                    id="project-start"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    required
                    min={today}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#DDD6C8] text-sm text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] shadow-2xs min-h-[44px]"
                  />
                </div>
                <div>
                  <label htmlFor="project-end" className="block text-xs sm:text-sm font-semibold text-[#231E1B] mb-1.5">
                    End Date <span className="text-[#C85A32]">*</span>
                  </label>
                  <input
                    id="project-end"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    required
                    min={formData.startDate || today}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#DDD6C8] text-sm text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] shadow-2xs min-h-[44px]"
                  />
                </div>
              </div>

              {/* Owner Selection (CEO only) */}
              {isCEO && (
                <div>
                  <label htmlFor="project-owner" className="block text-xs sm:text-sm font-semibold text-[#231E1B] mb-1.5">
                    Project Owner <span className="text-[#70675D] font-normal">(optional)</span>
                  </label>
                  <select
                    id="project-owner"
                    value={formData.ownerId}
                    onChange={(e) => handleInputChange('ownerId', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#DDD6C8] text-sm text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] shadow-2xs min-h-[44px] appearance-none bg-no-repeat bg-right-3"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238F867A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '1rem',
                    }}
                  >
                    <option value="">I will be the owner (default)</option>
                    {directory
                      .filter((u) => u.role === 'ProjectOwner' || u.role === 'Employee')
                      .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.role === 'ProjectOwner' ? 'Project Owner' : 'Employee'})
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-[#70675D]">
                    Leave blank to assign yourself as owner.
                  </p>
                </div>
              )}

              {/* Budget Section */}
              <div className="pt-3 border-t border-[#F2ECE1]">
                <h3 className="font-semibold text-xs sm:text-sm text-[#231E1B] mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[#C85A32]" />
                  Budget (Optional)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label htmlFor="project-budget" className="block text-xs sm:text-sm font-semibold text-[#231E1B] mb-1.5">
                      Planned Budget (£)
                    </label>
                    <input
                      id="project-budget"
                      type="number"
                      value={formData.plannedBudget}
                      onChange={(e) => handleInputChange('plannedBudget', e.target.value)}
                      min={0}
                      max={100000000}
                      step={1000}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#DDD6C8] text-sm text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] shadow-2xs min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="project-contingency" className="block text-xs sm:text-sm font-semibold text-[#231E1B] mb-1.5">
                      Contingency (£)
                    </label>
                    <input
                      id="project-contingency"
                      type="number"
                      value={formData.contingency}
                      onChange={(e) => handleInputChange('contingency', e.target.value)}
                      min={0}
                      max={100000000}
                      step={1000}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#DDD6C8] text-sm text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] shadow-2xs min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#F2ECE1] pb-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#554F47] bg-[#F3EFE6] hover:bg-[#EAE4D6] border border-[#DDD6C8] transition-colors min-h-[44px] cursor-pointer flex-1 sm:flex-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#C85A32] hover:bg-[#993F1C] active:scale-95 shadow-xs flex items-center justify-center gap-1.5 transition-all min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
                >
                  {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {createLoading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
