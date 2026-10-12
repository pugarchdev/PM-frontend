import React, { useState, useEffect, useRef } from 'react';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  TrendingDown,
  Calendar,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { Baseline, BaselineComparison } from '../types.ts';

interface ProjectBaselinesTabProps {
  projectId: string;
  projectName: string;
}

export const ProjectBaselinesTab: React.FC<ProjectBaselinesTabProps> = ({ projectId, projectName }) => {
  const { currentUser, isCEO, isProjectOwner } = useAuth();
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [comparison, setComparison] = useState<BaselineComparison | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Baseline Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [baselineName, setBaselineName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchBaselinesAndComparison = async (version?: number) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch baselines
      const blRes = await apiFetch(`/api/projects/${projectId}/baselines`);
      const blData = await blRes.json();
      setBaselines(blData || []);

      // Fetch comparison
      const compUrl = version
        ? `/api/projects/${projectId}/baselines/compare?version=${version}`
        : `/api/projects/${projectId}/baselines/compare`;
      const compRes = await apiFetch(compUrl);
      const compData = await compRes.json();
      setComparison(compData);
    } catch (err: any) {
      setError(err.message || 'Failed to load baseline data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaselinesAndComparison(selectedVersion || undefined);
  }, [projectId, selectedVersion]);

  const submittingRef = useRef(false);

  const handleCreateBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || creating) return;
    submittingRef.current = true;
    try {
      setCreating(true);
      const res = await apiFetch(`/api/projects/${projectId}/baselines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: baselineName.trim() || undefined }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create baseline');
      }

      setShowCreateModal(false);
      setBaselineName('');
      fetchBaselinesAndComparison();
    } catch (err: any) {
      alert(err.message || 'Error establishing baseline');
    } finally {
      submittingRef.current = false;
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8E2D5]">
        <div>
          <h3 className="font-serif font-bold text-sm sm:text-base text-[#231E1B]">Baselines &amp; Plan vs Actual</h3>
          <p className="text-xs text-[#70685F]">
            Immutable schedule snapshots, milestone slippage tracking, and scope variance analysis
          </p>
        </div>

        {(isCEO || isProjectOwner) && (
          <button
            id="btn-establish-baseline"
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#A63C1E] active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-transform cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Establish Baseline
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-[#70685F]">Loading baseline analytics...</div>
      ) : !comparison?.hasBaseline ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E8E2D5] text-center space-y-4">
          <Layers className="w-12 h-12 text-[#DDD6C8] mx-auto" />
          <h4 className="font-serif font-bold text-base text-[#231E1B]">No Baseline Established Yet</h4>
          <p className="text-xs text-[#70685F] max-w-md mx-auto leading-relaxed">
            Baselines lock the initial plan (milestones, hours, phases) into an immutable snapshot to track variance and prevent unapproved scope creep.
          </p>
          {(isCEO || isProjectOwner) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C85A32] text-white text-xs font-semibold hover:bg-[#A63C1E] active:scale-95 shadow-xs cursor-pointer min-h-[44px]"
            >
              Establish First Baseline (v1)
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Active Baseline Status & Version Picker */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F5F1E8] border border-[#E8E2D5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#526E55] flex items-center justify-center text-white shadow-xs shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-serif font-bold text-xs sm:text-sm text-[#231E1B] truncate">
                    {comparison.baseline?.name || `Baseline v${comparison.baseline?.version}`}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF2EB] text-[#2D5A34] border border-[#C6DEC7]">
                    Active Reference
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-[#70685F] truncate">
                  Approved by {comparison.baseline?.approvedBy} on{' '}
                  {new Date(comparison.baseline?.approvedAt || '').toLocaleDateString()}
                </p>
              </div>
            </div>

            {baselines.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#70685F] shrink-0">Compare vs:</span>
                <select
                  value={selectedVersion || comparison.baseline?.version}
                  onChange={(e) => setSelectedVersion(Number(e.target.value))}
                  className="bg-white border border-[#DDD6C8] rounded-xl px-3 py-2 text-xs text-[#231E1B] font-semibold min-h-[44px]"
                >
                  {baselines.map((bl) => (
                    <option key={bl.id} value={bl.version}>
                      v{bl.version} — {bl.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Variance Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E8E2D5] shadow-2xs">
              <div className="text-[10px] sm:text-[11px] font-bold text-[#70685F] uppercase">Milestones Slipped</div>
              <div className="text-lg sm:text-xl font-serif font-bold text-[#C85A32] mt-1">
                {comparison.milestones.filter((m) => m.isSlipped).length} / {comparison.milestones.length}
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#70685F] mt-0.5">
                Calculated upward to whole weeks
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E8E2D5] shadow-2xs">
              <div className="text-[10px] sm:text-[11px] font-bold text-[#70685F] uppercase">Unbaselined Tasks</div>
              <div
                className={`text-lg sm:text-xl font-serif font-bold mt-1 ${
                  comparison.unbaselinedTasksCount > 0 ? 'text-[#B45309]' : 'text-[#526E55]'
                }`}
              >
                {comparison.unbaselinedTasksCount} tasks
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#70685F] mt-0.5">
                Added after baseline lock
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E8E2D5] shadow-2xs">
              <div className="text-[10px] sm:text-[11px] font-bold text-[#70685F] uppercase">Planned Hours Variance</div>
              <div
                className={`text-lg sm:text-xl font-serif font-bold mt-1 ${
                  comparison.hoursComparison.deltaHours > 0 ? 'text-[#991B1B]' : 'text-[#526E55]'
                }`}
              >
                {comparison.hoursComparison.deltaHours >= 0 ? '+' : ''}
                {comparison.hoursComparison.deltaHours} hrs
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#70685F] mt-0.5 truncate">
                Base: {comparison.hoursComparison.baselinedHours}h &rarr; Curr: {comparison.hoursComparison.currentHours}h
              </div>
            </div>
          </div>

          {/* Milestone Slippage Comparison */}
          <div className="bg-white rounded-2xl border border-[#E8E2D5] shadow-2xs overflow-hidden">
            <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-[#FBF9F4] border-b border-[#E8E2D5]">
              <h4 className="font-serif font-bold text-xs sm:text-sm text-[#231E1B]">Milestone Slippage Analysis</h4>
              <p className="text-[10px] sm:text-[11px] text-[#70685F]">
                Baseline date vs current forecast. Slippage is rounded upward to whole weeks.
              </p>
            </div>

            <div className="divide-y divide-[#E8E2D5]">
              {comparison.milestones.map((m) => (
                <div key={m.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                  <div className="space-y-1 sm:w-1/2">
                    <div className="text-xs sm:text-sm font-bold text-[#231E1B]">{m.title}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] text-[#70685F]">
                      <span>Baseline: {new Date(m.baselineDate).toLocaleDateString()}</span>
                      <ArrowRight className="w-3 h-3 text-[#9B9287]" />
                      <span className={m.isSlipped ? 'font-bold text-[#C85A32]' : 'text-[#231E1B]'}>
                        Forecast: {new Date(m.forecastDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:w-1/2 sm:justify-end">
                    {m.isSlipped ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-[#FDF2F2] text-[#991B1B] border border-[#F8D7D7]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        +{m.slippageWeeks} {m.slippageWeeks === 1 ? 'week' : 'weeks'} delay ({m.slippageDays}d)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-[#EBF2EB] text-[#2D5A34] border border-[#C6DEC7]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        On Baseline Schedule
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Unbaselined Tasks (Scope Creep Guard) */}
          {comparison.unbaselinedTasksCount > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8E2D5] shadow-2xs overflow-hidden">
              <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-[#FFF8E6] border-b border-[#FEE29A]">
                <h4 className="font-serif font-bold text-xs sm:text-sm text-[#92400E]">
                  Unbaselined Tasks ({comparison.unbaselinedTasksCount})
                </h4>
                <p className="text-[10px] sm:text-[11px] text-[#B45309]">
                  These tasks were added after baseline approval and represent scope additions.
                </p>
              </div>

              <div className="divide-y divide-[#E8E2D5]">
                {comparison.unbaselinedTasks.map((t) => (
                  <div key={t.id} className="p-3 sm:p-3.5 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-xs sm:text-sm text-[#231E1B] truncate">{t.title}</div>
                      <div className="text-[10px] sm:text-[11px] text-[#70685F] truncate">
                        Planned: {t.plannedHours} hrs &bull; {t.priority} Priority &bull; State: {t.state}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F2EDE2] text-[#70685F] shrink-0">
                      Unbaselined
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Establish Baseline Modal / Bottom Sheet */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#E8E2D5] space-y-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />

            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#231E1B]">Establish New Baseline</h3>
              <p className="text-xs text-[#70685F] leading-relaxed">
                This will capture the current state of all tasks, hours, milestones, and budget allocations as the authoritative baseline reference (v{(baselines[0]?.version || 0) + 1}).
              </p>
            </div>

            <form onSubmit={handleCreateBaseline} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Baseline Name / Identifier (Optional)
                </label>
                <input
                  type="text"
                  value={baselineName}
                  onChange={(e) => setBaselineName(e.target.value)}
                  placeholder={`e.g. Approved Charter v${(baselines[0]?.version || 0) + 1}`}
                  className="w-full bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#231E1B] focus:ring-1 focus:ring-[#C85A32] min-h-[44px]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#DDD6C8] text-xs font-semibold text-[#70685F] hover:bg-[#EDE7DC] active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C85A32] text-white text-xs font-semibold hover:bg-[#A63C1E] active:scale-95 transition-all shadow-xs cursor-pointer min-h-[44px]"
                >
                  {creating ? 'Locking Snapshot...' : 'Lock & Establish Baseline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
