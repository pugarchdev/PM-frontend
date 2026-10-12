import React, { useState, useEffect } from 'react';
import { History, Filter, ArrowRight, UserCheck, Clock, ShieldCheck, Tag } from 'lucide-react';
import { ChangeLogItem } from '../types.ts';
import { apiFetch } from '../lib/api.ts';

interface ProjectChangeLogTabProps {
  projectId: string;
  projectName: string;
}

export const ProjectChangeLogTab: React.FC<ProjectChangeLogTabProps> = ({ projectId, projectName }) => {
  const [entries, setEntries] = useState<ChangeLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const fetchChangeLog = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/projects/${projectId}/changelog`);
      if (!res.ok) {
        throw new Error('Failed to load project changelog');
      }
      const data = await res.json();
      setEntries(data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading changelog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChangeLog();
  }, [projectId]);

  const filteredEntries = entries.filter((item) => {
    if (categoryFilter === 'ALL') return true;
    const src = (item.sourceType || item.action || '').toUpperCase();
    return src.includes(categoryFilter);
  });

  const getSourceBadgeStyle = (src?: string | null) => {
    const s = (src || '').toUpperCase();
    if (s.includes('STATUS')) return 'bg-[#FEF6F3] text-[#A63C1E] border-[#F3CEC1]';
    if (s.includes('BASELINE')) return 'bg-[#EBF2EB] text-[#2D5A34] border-[#C6DEC7]';
    if (s.includes('APPROVAL')) return 'bg-[#FFF8E6] text-[#B45309] border-[#FDE68A]';
    if (s.includes('TASK')) return 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]';
    return 'bg-[#F5F1E8] text-[#70685F] border-[#E0D9CB]';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8E2D5]">
        <div>
          <h3 className="font-serif font-bold text-sm sm:text-base text-[#231E1B]">Governance Change Log</h3>
          <p className="text-xs text-[#70685F]">
            Immutable chronological audit log of status overrides, charter adjustments, and baseline decisions
          </p>
        </div>

        {/* Filter Pills with Horizontal Touch Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar  pb-1">
          {[
            { id: 'ALL', label: 'All Events' },
            { id: 'STATUS', label: 'Status' },
            { id: 'BASELINE', label: 'Baselines' },
            { id: 'APPROVAL', label: 'Approvals' },
            { id: 'TASK', label: 'Tasks' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setCategoryFilter(pill.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 shrink-0 cursor-pointer min-h-[44px] flex items-center justify-center ${
                categoryFilter === pill.id
                  ? 'bg-[#231E1B] text-white border-[#231E1B] shadow-2xs'
                  : 'bg-white text-[#70685F] border-[#DDD6C8] hover:bg-[#F5F1E8]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-[#70685F]">Loading project audit entries...</div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-[#FDF2F2] border border-[#F8D7D7] text-xs text-[#991B1B] text-center">
          {error}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-white border border-[#E8E2D5] text-center space-y-2">
          <History className="w-10 h-10 text-[#DDD6C8] mx-auto" />
          <h4 className="font-serif font-bold text-sm text-[#231E1B]">No audit events found</h4>
          <p className="text-xs text-[#70685F]">
            Audit records will appear automatically when governance actions or charter updates occur.
          </p>
        </div>
      ) : (
        <div className="relative pl-5 sm:pl-6 border-l-2 border-[#E8E2D5] space-y-4 sm:space-y-6 ml-2 sm:ml-3 my-4">
          {filteredEntries.map((item) => {
            const timeStr = item.at || (item as any).createdAt;
            const actor = item.actorId || item.changedBy || 'System';
            const actionText = item.what || item.action || 'Project Modification';
            const detailsText = item.toValue || item.details;

            return (
              <div key={item.id} className="relative group">
                {/* Timeline node */}
                <span className="absolute -left-[27px] sm:-left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-[#C85A32] shadow-xs" />

                <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E8E2D5] shadow-2xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSourceBadgeStyle(
                          item.sourceType || item.action
                        )}`}
                      >
                        {item.sourceType || 'CHANGE'}
                      </span>
                      <h4 className="font-serif font-bold text-xs sm:text-sm text-[#231E1B]">{actionText}</h4>
                    </div>

                    <span className="text-[10px] sm:text-[11px] text-[#9B9287]">
                      {timeStr ? new Date(timeStr).toLocaleString() : ''}
                    </span>
                  </div>

                  {item.fromValue && item.toValue && (
                    <div className="flex items-center gap-2 text-xs bg-[#FBF9F4] p-2 rounded-xl border border-[#EDE7DC]">
                      <span className="text-[#991B1B] font-mono text-[11px]">{item.fromValue}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#70685F] shrink-0" />
                      <span className="text-[#2D5A34] font-mono text-[11px] font-bold">
                        {item.toValue}
                      </span>
                    </div>
                  )}

                  {detailsText && !item.fromValue && (
                    <p className="text-xs text-[#554E44] leading-relaxed break-words">{detailsText}</p>
                  )}

                  <div className="pt-2 border-t border-[#F5F1E8] flex items-center justify-between text-[10px] sm:text-[11px] text-[#70685F]">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#526E55]" />
                      Recorded by: <strong className="text-[#231E1B]">{actor}</strong>
                    </span>

                    {item.sourceId && (
                      <span className="text-[10px] text-[#9B9287]">Ref: {item.sourceId.slice(0, 8)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
