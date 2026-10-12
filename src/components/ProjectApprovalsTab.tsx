import React, { useState, useEffect, useRef } from 'react';
import {
  FileCheck,
  Plus,
  Clock,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  ChevronRight,
  Shield,
  Send,
  X,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { ApprovalRequest } from '../types.ts';

interface ProjectApprovalsTabProps {
  projectId: string;
  projectName: string;
  projectOwnerId?: string;
}

export const ProjectApprovalsTab: React.FC<ProjectApprovalsTabProps> = ({ projectId, projectName, projectOwnerId }) => {
  const { currentUser, isCEO, isEmployee } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [requestType, setRequestType] = useState<'Budget' | 'Timeline' | 'Scope'>('Budget');
  const [summary, setSummary] = useState('');
  const [detail, setDetail] = useState('');
  const [impact, setImpact] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [movesBaselinedMilestone, setMovesBaselinedMilestone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Decision Modal
  const [decidingRequest, setDecidingRequest] = useState<ApprovalRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<'APPROVE' | 'SEND_BACK'>('APPROVE');
  const [decisionNote, setDecisionNote] = useState('');
  const [processingDecision, setProcessingDecision] = useState(false);

  // Revision Modal
  const [revisingRequest, setRevisingRequest] = useState<ApprovalRequest | null>(null);
  const [revisedSummary, setRevisedSummary] = useState('');
  const [revisedDetail, setRevisedDetail] = useState('');
  const [revisedImpact, setRevisedImpact] = useState('');
  const [processingRevision, setProcessingRevision] = useState(false);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/approvals/project/${projectId}`);
      if (!res.ok) {
        throw new Error('Failed to load approvals');
      }
      const data = await res.json();
      setApprovals(data || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [projectId]);

  const submittingRef = useRef(false);

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || !detail.trim()) return;
    if (submittingRef.current || submitting) return;
    submittingRef.current = true;

    try {
      setSubmitting(true);
      const res = await apiFetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          type: requestType,
          summary: summary.trim(),
          detail: detail.trim(),
          impact: impact.trim(),
          requestedAmount: parseFloat(requestedAmount) || 0,
          movesBaselinedMilestone,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit approval request');
      }

      setShowNewModal(false);
      setSummary('');
      setDetail('');
      setImpact('');
      setRequestedAmount('');
      setMovesBaselinedMilestone(false);
      fetchApprovals();
    } catch (err: any) {
      alert(err.message || 'Failed to submit request');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDecide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decidingRequest) return;
    if (submittingRef.current || processingDecision) return;
    submittingRef.current = true;

    try {
      setProcessingDecision(true);
      const res = await apiFetch(`/api/approvals/${decidingRequest.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: decisionAction,
          decisionNote: decisionNote.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to process decision');
      }

      setDecidingRequest(null);
      setDecisionNote('');
      fetchApprovals();
    } catch (err: any) {
      alert(err.message || 'Decision failed');
    } finally {
      submittingRef.current = false;
      setProcessingDecision(false);
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisingRequest) return;
    if (submittingRef.current || processingRevision) return;
    submittingRef.current = true;

    try {
      setProcessingRevision(true);
      const res = await apiFetch(`/api/approvals/${revisingRequest.id}/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: revisedSummary.trim(),
          detail: revisedDetail.trim(),
          impact: revisedImpact.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to resubmit request');
      }

      setRevisingRequest(null);
      fetchApprovals();
    } catch (err: any) {
      alert(err.message || 'Resubmit failed');
    } finally {
      submittingRef.current = false;
      setProcessingRevision(false);
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'Approved':
        return 'bg-[#EBF2EB] text-[#2D5A34] border-[#C6DEC7]';
      case 'Sent back':
        return 'bg-[#FFF8E6] text-[#B45309] border-[#FDE68A]';
      default:
        return 'bg-[#F2EDE2] text-[#70685F] border-[#DDD6C8]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8E2D5]">
        <div>
          <h3 className="font-serif font-bold text-sm sm:text-base text-[#231E1B]">Governance &amp; Approval Requests</h3>
          <p className="text-xs text-[#70685F]">
            Formal change control for Budget adjustments, Milestones, and Project Scope
          </p>
        </div>

        <button
          id="btn-submit-approval"
          onClick={() => setShowNewModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#A63C1E] active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-transform cursor-pointer min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Submit Request
        </button>
      </div>

      {/* Approvals List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[#70685F]">Loading approval requests...</div>
      ) : approvals.length === 0 ? (
        <div className="py-16 text-center space-y-2 bg-white rounded-2xl border border-[#E8E2D5] p-6">
          <FileCheck className="w-10 h-10 text-[#DDD6C8] mx-auto" />
          <p className="font-serif text-sm font-bold text-[#231E1B]">No approval requests logged</p>
          <p className="text-xs text-[#70685F] max-w-sm mx-auto">
            Submit a request when requiring additional budget contingency, shifting a baselined milestone, or expanding scope.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((req) => {
            const isRequester = currentUser?.id === req.requestedBy;
            const isProjectOwner = req.project?.ownerId
              ? currentUser?.id === req.project.ownerId
              : projectOwnerId
              ? currentUser?.id === projectOwnerId
              : currentUser?.role === 'ProjectOwner';
            const isDesignatedApprover = currentUser?.id === req.approverId;
            const canDecide = !isEmployee && (isCEO || isProjectOwner || isDesignatedApprover) && req.state === 'Pending';

            return (
              <div
                key={req.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E8E2D5] shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EAE3D5] text-[#5A524A]">
                      {req.type}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStateBadge(
                        req.state
                      )}`}
                    >
                      {req.state}
                    </span>
                    {req.version > 1 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F1E8] text-[#70685F]">
                        Revision v{req.version}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] sm:text-[11px] text-[#9B9287]">
                    Submitted {new Date(req.requestedAt).toLocaleDateString()} by {req.requester?.name}
                  </span>
                </div>

                <div>
                  <h4 className="font-serif font-bold text-xs sm:text-sm text-[#231E1B]">{req.summary}</h4>
                  <p className="text-xs text-[#554E44] mt-1 leading-relaxed">{req.detail}</p>
                </div>

                {req.impact && (
                  <div className="text-[11px] text-[#70685F] bg-[#FBF9F4] p-2.5 rounded-xl border border-[#EDE7DC]">
                    <strong>Routing / Business Impact:</strong> {req.impact}
                  </div>
                )}

                {req.decisionNote && (
                  <div className="text-[11px] bg-[#F5F1E8] p-2.5 rounded-xl border border-[#E0D9CB] text-[#3A342E]">
                    <strong>Reviewer Note:</strong> {req.decisionNote}
                    {req.decidedAt && (
                      <span className="text-[#8C8377] ml-2">
                        ({new Date(req.decidedAt).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-[#F0EBE0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-[11px] text-[#70685F] flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#C85A32]" />
                    Designated Approver: <strong className="text-[#231E1B]">{req.approver?.name || 'Executive'}</strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Resubmit for Sent back requests */}
                    {isRequester && req.state === 'Sent back' && (
                      <button
                        onClick={() => {
                          setRevisingRequest(req);
                          setRevisedSummary(req.summary);
                          setRevisedDetail(req.detail);
                          setRevisedImpact(req.impact);
                        }}
                        className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-[#526E55] hover:bg-[#3E5540] active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-xs transition-transform cursor-pointer min-h-[40px]"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Revise &amp; Resubmit
                      </button>
                    )}

                    {/* Decision buttons for approver */}
                    {canDecide && (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => {
                            setDecidingRequest(req);
                            setDecisionAction('SEND_BACK');
                            setDecisionNote('');
                          }}
                          className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-[#DDD6C8] hover:bg-[#EDE7DC] active:scale-95 text-[#70685F] text-xs font-semibold transition-all cursor-pointer min-h-[40px] text-center"
                        >
                          Send Back
                        </button>
                        <button
                          onClick={() => {
                            setDecidingRequest(req);
                            setDecisionAction('APPROVE');
                            setDecisionNote('Approved as submitted.');
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#2D5A34] hover:bg-[#1E3E23] active:scale-95 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer min-h-[40px] text-center"
                        >
                          Approve Request
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Request Modal / Bottom Sheet */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#EAE3D5] space-y-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />

            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#231E1B]">Submit Approval Request</h3>
              <p className="text-xs text-[#70685F]">
                Requests are routed according to governance thresholds and self-approval prevention rules.
              </p>
            </div>

            <form onSubmit={handleSubmitNew} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Request Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Budget', 'Timeline', 'Scope'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRequestType(t)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer min-h-[44px] ${
                        requestType === t
                          ? 'bg-[#C85A32] text-white border-[#C85A32] shadow-xs'
                          : 'bg-[#FAF7F2] text-[#554E44] border-[#DDD6C8] hover:bg-[#F5F1E8]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {requestType === 'Budget' && (
                <div>
                  <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                    Requested Amount (£) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#231E1B] focus:ring-1 focus:ring-[#C85A32] min-h-[44px]"
                  />
                  <p className="text-[10px] sm:text-[11px] text-[#70685F] mt-1">
                    Budget increases exceeding contingency or over £50,000 route strictly to the CEO.
                  </p>
                </div>
              )}

              {requestType === 'Timeline' && (
                <div className="p-3 bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-baselined"
                    checked={movesBaselinedMilestone}
                    onChange={(e) => setMovesBaselinedMilestone(e.target.checked)}
                    className="mt-0.5 rounded-sm text-[#C85A32] w-4 h-4"
                  />
                  <label htmlFor="chk-baselined" className="text-xs text-[#231E1B] leading-snug cursor-pointer">
                    <strong>Moves a baselined milestone</strong>
                    <div className="text-[10px] sm:text-[11px] text-[#70685F]">
                      Timeline changes affecting baselined milestones escalate to Sponsor and CEO.
                    </div>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Summary *</label>
                <input
                  type="text"
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="e.g. Additional soil testing contingency draw"
                  className="w-full bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#231E1B] focus:ring-1 focus:ring-[#C85A32] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Detailed Justification *</label>
                <textarea
                  required
                  rows={3}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Explain why this change is necessary and what alternatives were evaluated..."
                  className="w-full bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#231E1B] focus:ring-1 focus:ring-[#C85A32]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Impact Description</label>
                <input
                  type="text"
                  value={impact}
                  onChange={(e) => setImpact(e.target.value)}
                  placeholder="e.g. Shifts Phase 2 handover by 1 week"
                  className="w-full bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#231E1B] focus:ring-1 focus:ring-[#C85A32] min-h-[44px]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#DDD6C8] text-xs font-semibold text-[#70685F] hover:bg-[#EDE7DC] active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C85A32] text-white text-xs font-semibold hover:bg-[#A63C1E] active:scale-95 transition-all shadow-xs cursor-pointer min-h-[44px]"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decision Modal / Bottom Sheet */}
      {decidingRequest && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#E8E2D5] space-y-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />

            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#231E1B]">
                {decisionAction === 'APPROVE' ? 'Approve Request' : 'Send Back for Revision'}
              </h3>
              <p className="text-xs text-[#70685F]">
                {decisionAction === 'APPROVE'
                  ? 'Approving will commit changes to project budget or schedule.'
                  : 'Sending back allows the requester to revise and resubmit.'}
              </p>
            </div>

            <form onSubmit={handleDecide} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Decision Note / Instructions
                </label>
                <textarea
                  rows={3}
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder={
                    decisionAction === 'APPROVE'
                      ? 'Approved'
                      : 'Specify revisions or questions for the requester...'
                  }
                  className="w-full bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#231E1B] focus:ring-1 focus:ring-[#C85A32]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDecidingRequest(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#DDD6C8] text-xs font-semibold text-[#70685F] hover:bg-[#EDE7DC] active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingDecision}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-95 transition-all min-h-[44px] ${
                    decisionAction === 'APPROVE'
                      ? 'bg-[#2D5A34] hover:bg-[#1E3E23]'
                      : 'bg-[#B45309] hover:bg-[#92400E]'
                  }`}
                >
                  {processingDecision
                    ? 'Processing...'
                    : decisionAction === 'APPROVE'
                    ? 'Confirm Approval'
                    : 'Send Back'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revision Modal / Bottom Sheet */}
      {revisingRequest && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#E8E2D5] space-y-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />

            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#231E1B]">Revise &amp; Resubmit Request</h3>
              <p className="text-xs text-[#70685F]">
                Submit revision v{revisingRequest.version + 1} addressing reviewer feedback: &ldquo;{revisingRequest.decisionNote}&rdquo;
              </p>
            </div>

            <form onSubmit={handleResubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Summary *</label>
                <input
                  type="text"
                  required
                  value={revisedSummary}
                  onChange={(e) => setRevisedSummary(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#231E1B] focus:ring-1 focus:ring-[#C85A32] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Revised Details *</label>
                <textarea
                  required
                  rows={3}
                  value={revisedDetail}
                  onChange={(e) => setRevisedDetail(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#231E1B] focus:ring-1 focus:ring-[#C85A32]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Impact</label>
                <input
                  type="text"
                  value={revisedImpact}
                  onChange={(e) => setRevisedImpact(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#231E1B] focus:ring-1 focus:ring-[#C85A32] min-h-[44px]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRevisingRequest(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#DDD6C8] text-xs font-semibold text-[#70685F] hover:bg-[#EDE7DC] active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingRevision}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#526E55] text-white text-xs font-semibold hover:bg-[#3E5540] active:scale-95 transition-all shadow-xs cursor-pointer min-h-[44px]"
                >
                  {processingRevision ? 'Submitting...' : `Submit Revision v${revisingRequest.version + 1}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
