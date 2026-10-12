import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  Filter,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { CEOPortfolioKPIs, CEOPortfolioProject } from '../types.ts';

interface CEOPortfolioViewProps {
  onSelectProject: (projectId: string) => void;
}

export const CEOPortfolioView: React.FC<CEOPortfolioViewProps> = ({ onSelectProject }) => {
  const { isCEO } = useAuth();
  const [kpis, setKpis] = useState<CEOPortfolioKPIs | null>(null);
  const [projects, setProjects] = useState<CEOPortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/portfolio/ceo');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load CEO portfolio');
      }
      const data = await res.json();
      setKpis(data.kpis);
      setProjects(data.projects || []);
    } catch (err: any) {
      setError(err.message || 'Error loading portfolio data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const filteredProjects = projects.filter((p) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'ON_TRACK') return p.status === 'ON_TRACK';
    if (activeFilter === 'AT_RISK') return p.status === 'AT_RISK';
    if (activeFilter === 'OFF_TRACK') return p.status === 'OFF_TRACK';
    if (activeFilter === 'FINANCIAL_CONCERN') return p.isWarning90Percent || p.isOverBudget;
    if (activeFilter === 'CRITICAL') return p.criticalIssuesCount > 0;
    return true;
  });

  return (
    <div className="space-y-5 sm:space-y-6 pb-20 sm:pb-24 max-w-full overflow-hidden sm:overflow-visible">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl lg:rounded-3xl bg-[#231E1B] text-white space-y-2.5 sm:space-y-3 shadow-sm">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-white/80">
            Executive Command
          </span>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#C85A32] text-white">
            CEO Dashboard
          </span>
        </div>

        <div>
          <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Portfolio Health &amp; Capital Allocation
          </h2>
          <p className="text-xs lg:text-sm text-white/70 max-w-xl mt-1 leading-relaxed">
            Consolidated oversight across active initiatives, financial burn rates, schedule variance, and critical risk escalations.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-[#70685F]">Loading CEO portfolio intelligence...</div>
      ) : error ? (
        <div className="p-4 sm:p-6 rounded-2xl bg-[#FDF2F2] border border-[#F8D7D7] text-xs text-[#991B1B] text-center">
          {error}
        </div>
      ) : kpis ? (
        <>
          {/* High-Level KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E8E2D5] shadow-2xs flex flex-col justify-between">
              <div className="text-[10px] sm:text-[11px] font-bold text-[#70685F] uppercase tracking-wider truncate">
                Active Initiatives
              </div>
              <div className="text-xl sm:text-2xl font-serif font-bold text-[#231E1B] mt-1">
                {kpis.totalProjects}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#70685F] mt-1 truncate">
                <span className="text-[#2D5A34] font-semibold">{kpis.onTrackCount} on track</span>
                <span>&bull;</span>
                <span className="text-[#991B1B] font-semibold">{kpis.offTrackCount} off track</span>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E8E2D5] shadow-2xs flex flex-col justify-between">
              <div className="text-[10px] sm:text-[11px] font-bold text-[#70685F] uppercase tracking-wider truncate">
                <span className="lg:hidden">Portfolio Capital</span>
                <span className="hidden lg:inline">Committed Portfolio Capital</span>
              </div>
              <div className="text-xl sm:text-2xl font-serif font-bold text-[#231E1B] mt-1">
                £{kpis.totalPortfolioFunds.toLocaleString()}
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#70685F] mt-1 truncate">
                <span className="lg:hidden">(£{kpis.totalContingency.toLocaleString()} reserved)</span>
                <span className="hidden lg:inline">(£{kpis.totalContingency.toLocaleString()} reserved contingency)</span>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E8E2D5] shadow-2xs flex flex-col justify-between">
              <div className="text-[10px] sm:text-[11px] font-bold text-[#70685F] uppercase tracking-wider truncate">
                Portfolio Spend
              </div>
              <div className="text-xl sm:text-2xl font-serif font-bold text-[#C85A32] mt-1">
                £{kpis.totalSpend.toLocaleString()}
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#70685F] mt-1 truncate">
                <span className="lg:hidden">{kpis.overallSpendPercent}% &bull; £{kpis.portfolioRemaining.toLocaleString()} rem</span>
                <span className="hidden lg:inline">{kpis.overallSpendPercent}% utilized &bull; £{kpis.portfolioRemaining.toLocaleString()} remaining</span>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E8E2D5] shadow-2xs flex flex-col justify-between">
              <div className="text-[10px] sm:text-[11px] font-bold text-[#70685F] uppercase tracking-wider truncate">
                Risk Escalations
              </div>
              <div className="text-xl sm:text-2xl font-serif font-bold text-[#991B1B] mt-1">
                {kpis.totalCriticalIssues} Critical
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#70685F] mt-1 truncate">
                <span className="lg:hidden">+{kpis.totalHighRisks} High-risk conditions</span>
                <span className="hidden lg:inline">+{kpis.totalHighRisks} High-risk conditions open</span>
              </div>
            </div>
          </div>

          {/* Filter — compact select on mobile, pills on desktop */}
          <div className="flex items-center gap-2 pt-1">
            <Filter className="w-3.5 h-3.5 text-[#C85A32] sm:text-[#70685F] shrink-0" />
            <span className="hidden sm:inline text-xs font-semibold text-[#231E1B]">Filter:</span>
            {/* Mobile select */}
            <select
              className="sm:hidden flex-1 px-3 py-2 rounded-full border border-[#DDD6C8] bg-white text-xs font-semibold text-[#231E1B] focus:outline-none min-h-[36px] cursor-pointer"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="ALL">All ({projects.length})</option>
              <option value="OFF_TRACK">Off Track ({kpis.offTrackCount})</option>
              <option value="AT_RISK">At Risk ({kpis.atRiskCount})</option>
              <option value="FINANCIAL_CONCERN">Financial Concern (≥90%)</option>
              <option value="CRITICAL">Critical Issues ({kpis.totalCriticalIssues})</option>
            </select>
            {/* Desktop chips */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'ALL', label: `All (${projects.length})` },
                { id: 'OFF_TRACK', label: `Off Track (${kpis.offTrackCount})` },
                { id: 'AT_RISK', label: `At Risk (${kpis.atRiskCount})` },
                { id: 'FINANCIAL_CONCERN', label: 'Financial Concern (≥90%)' },
                { id: 'CRITICAL', label: `Critical Issues (${kpis.totalCriticalIssues})` },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setActiveFilter(btn.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer whitespace-nowrap min-h-[36px] sm:min-h-[40px] shrink-0 active:scale-95 flex items-center justify-center ${
                    activeFilter === btn.id
                      ? 'bg-[#231E1B] text-white border-[#231E1B] shadow-xs'
                      : 'bg-white text-[#70685F] border-[#DDD6C8] hover:bg-[#F5F1E8]'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Projects Table / Cards */}
          <div className="space-y-3">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className="p-5 rounded-2xl bg-white border border-[#E8E2D5] hover:border-[#C85A32]/60 transition-all shadow-2xs hover:shadow-xs cursor-pointer space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-base text-[#231E1B] hover:text-[#C85A32] transition-colors">
                        {p.name}
                      </h3>
                      <StatusBadge status={p.status} />
                      {p.isOverridden && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold">
                          Override
                        </span>
                      )}
                      {p.isWarning90Percent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FDF2F2] text-[#991B1B] font-bold border border-[#F8D7D7]">
                          ≥90% Budget
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#70685F] line-clamp-1">{p.goal}</p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#70685F]">
                    <div>
                      Owner: <strong className="text-[#231E1B]">{p.owner.name}</strong>
                    </div>
                    <span>&bull;</span>
                    <div>
                      Sponsor: <strong className="text-[#231E1B]">{p.sponsor}</strong>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#C85A32]" />
                  </div>
                </div>

                {/* Progress & Financial Track */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F5F1E8] text-xs">
                  {/* Schedule Progress */}
                  <div>
                    <div className="flex justify-between text-[11px] text-[#70685F] mb-1">
                      <span>Schedule: {p.progress}% progress</span>
                      <span>Plan Marker: {p.plan}%</span>
                    </div>
                    <div className="relative w-full h-2.5 bg-[#F2EDE2] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#526E55] rounded-full"
                        style={{ width: `${Math.min(100, p.progress)}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-[#231E1B]"
                        style={{ left: `${Math.min(100, p.plan)}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial Overview */}
                  <div>
                    <div className="flex justify-between text-[11px] text-[#70685F] mb-1">
                      <span>
                        Spent: £{p.spendToDate.toLocaleString()} / £{p.plannedBudget.toLocaleString()}
                      </span>
                      <span className={p.remainingBudget < 0 ? 'text-[#991B1B] font-bold' : 'text-[#2D5A34]'}>
                        Rem: £{p.remainingBudget.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-[#F2EDE2] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          p.isWarning90Percent ? 'bg-[#D97706]' : 'bg-[#C85A32]'
                        }`}
                        style={{
                          width: `${Math.min(100, (p.spendToDate / (p.plannedBudget || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Issue / Risk Counters */}
                <div className="flex items-center gap-4 text-[11px] text-[#70685F]">
                  {p.criticalIssuesCount > 0 ? (
                    <span className="text-[#991B1B] font-bold flex items-center gap-1">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      {p.criticalIssuesCount} Critical Issues Open
                    </span>
                  ) : (
                    <span className="text-[#526E55] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      No Critical Issues
                    </span>
                  )}

                  {p.highRisksCount > 0 && (
                    <span className="text-[#B45309] font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {p.highRisksCount} High Risks
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};
