import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { Issue, IssueSeverity } from '../types.ts';
import {
  BasketballUploader,
  MAX_EVIDENCE_FILES,
  type SelectedEvidenceFile,
} from './BasketballUploader.tsx';

interface RaiseIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (issue: Issue) => void;
  projects: Array<{ id: string; name: string }>;
  initialProjectId?: string;
  fixedProjectId?: string;
}

export const RaiseIssueModal: React.FC<RaiseIssueModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projects,
  initialProjectId,
  fixedProjectId,
}) => {
  const [projectId, setProjectId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [severity, setSeverity] = useState<IssueSeverity>('Minor');
  const [detail, setDetail] = useState<string>('');
  const [stepsToReproduce, setStepsToReproduce] = useState<string>('');
  const [evidenceFiles, setEvidenceFiles] = useState<SelectedEvidenceFile[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const submittingRef = useRef<boolean>(false);

  // Initialize selected project
  useEffect(() => {
    if (fixedProjectId) {
      setProjectId(fixedProjectId);
    } else if (initialProjectId) {
      setProjectId(initialProjectId);
    } else if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [fixedProjectId, initialProjectId, projects, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!projectId) {
      setFormError('Please select a project for this issue.');
      return;
    }
    if (!title.trim()) {
      setFormError('Issue title is required.');
      return;
    }
    if (!detail.trim()) {
      setFormError('Detailed context is required.');
      return;
    }
    if (!stepsToReproduce.trim()) {
      setFormError('Steps to reproduce are required. Please describe how to trigger this bug.');
      return;
    }

    // Check if any attached files have validation errors
    const invalidFile = evidenceFiles.find((ef) => ef.error);
    if (invalidFile) {
      setFormError(`Please remove invalid attachment "${invalidFile.file.name}": ${invalidFile.error}`);
      return;
    }

    if (submittingRef.current || submitting) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('title', title.trim());
      formData.append('severity', severity);
      formData.append('detail', detail.trim());
      formData.append('stepsToReproduce', stepsToReproduce.trim());

      evidenceFiles.forEach((ef) => {
        formData.append('evidence', ef.file);
      });

      const res = await apiFetch('/api/issues', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to raise issue');
      }

      // Cleanup preview URLs
      evidenceFiles.forEach((ef) => {
        if (ef.previewUrl) URL.revokeObjectURL(ef.previewUrl);
      });

      // Reset form
      setTitle('');
      setDetail('');
      setStepsToReproduce('');
      setEvidenceFiles([]);
      setFormError(null);

      onSuccess(data);
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while submitting the issue.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl border-t sm:border border-[#EAE3D5] space-y-4 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden mb-1" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F2ECE1]">
          <div>
            <h4 className="font-serif text-xl font-bold text-[#231E1B]">Raise New Issue</h4>
            <p className="text-xs text-[#70675D] mt-0.5">
              Submit a project defect or operational issue with steps to reproduce and supporting evidence.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-black rounded-xl hover:bg-[#F5F1E8] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inline Error Banner */}
        {formError && (
          <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1 font-medium leading-relaxed">{formError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Project & Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Project field */}
            <div>
              <label htmlFor="issue-project" className="block text-xs font-semibold text-[#231E1B] mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                id="issue-project"
                required
                disabled={!!fixedProjectId}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={`w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px] bg-white text-[#231E1B] focus:outline-none focus:border-[#C85A32] ${
                  fixedProjectId ? 'bg-[#FBF9F4] text-[#70675D] cursor-not-allowed' : ''
                }`}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity field */}
            <div>
              <label htmlFor="issue-severity" className="block text-xs font-semibold text-[#231E1B] mb-1">
                Severity
              </label>
              <select
                id="issue-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
                className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px] bg-white text-[#231E1B] focus:outline-none focus:border-[#C85A32]"
              >
                <option value="Minor">Minor (Informational / minor annoyance)</option>
                <option value="Major">Major (Blocks core feature or team workflow)</option>
                <option value="Critical">Critical (Immediate alert to CEO &amp; sets project Off Track)</option>
              </select>
            </div>
          </div>

          {/* Issue Title */}
          <div>
            <label htmlFor="issue-title" className="block text-xs font-semibold text-[#231E1B] mb-1">
              Issue Title <span className="text-red-500">*</span>
            </label>
            <input
              id="issue-title"
              required
              type="text"
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Critical boiler pressure sensor communication failure"
              className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm min-h-[44px] bg-white text-[#231E1B] focus:outline-none focus:border-[#C85A32]"
            />
          </div>

          {/* Detailed Context */}
          <div>
            <label htmlFor="issue-detail" className="block text-xs font-semibold text-[#231E1B] mb-1">
              Detailed Context <span className="text-red-500">*</span>
            </label>
            <textarea
              id="issue-detail"
              required
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Describe the issue, what occurred, and the immediate operational consequence..."
              className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm bg-white text-[#231E1B] focus:outline-none focus:border-[#C85A32] resize-y"
            />
          </div>

          {/* Steps to Reproduce */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="issue-steps" className="block text-xs font-semibold text-[#231E1B]">
                Steps to Reproduce <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-[#8C8275]">Numbered sequence of actions</span>
            </div>
            <textarea
              id="issue-steps"
              required
              rows={4}
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              placeholder={`1. Open the project page\n2. Navigate to the affected module\n3. Perform the action that causes the issue\n4. Observe the unexpected result`}
              className="w-full p-2.5 rounded-xl border border-[#DDD6C8] text-sm bg-white text-[#231E1B] font-mono text-[13px] leading-relaxed focus:outline-none focus:border-[#C85A32] resize-y"
            />
            <p className="text-[11px] text-[#70675D] mt-1">
              Provide exact steps so engineers and team members can independently reproduce and diagnose the bug.
            </p>
          </div>

          {/* 🏀 Proof / Evidence Upload — Basketball Experience */}
          <BasketballUploader
            evidenceFiles={evidenceFiles}
            setEvidenceFiles={setEvidenceFiles}
            setFormError={setFormError}
            isSubmitting={submitting}
          />

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F2ECE1]">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#F5F1E8] hover:bg-[#EAE4D6] text-[#231E1B] min-h-[44px] cursor-pointer flex-1 sm:flex-none transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#C85A32] text-white hover:bg-[#AD4722] min-h-[44px] shadow-xs cursor-pointer active:scale-95 flex-1 sm:flex-none flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Issue...</span>
                </>
              ) : (
                <span>Raise Issue</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
