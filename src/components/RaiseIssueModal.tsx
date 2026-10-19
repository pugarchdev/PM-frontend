import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { Issue, IssueSeverity } from '../types.ts';

export const MAX_EVIDENCE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_EVIDENCE_FILES = 10;

const ALLOWED_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'webp',
  'pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx'
]);

interface SelectedEvidenceFile {
  id: string;
  file: File;
  previewUrl?: string;
  error?: string;
}

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
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  // Clean up object URLs on unmount or file removal
  useEffect(() => {
    return () => {
      evidenceFiles.forEach((ef) => {
        if (ef.previewUrl) URL.revokeObjectURL(ef.previewUrl);
      });
    };
  }, [evidenceFiles]);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileCategory = (filename: string): 'image' | 'pdf' | 'doc' | 'sheet' | 'text' | 'other' => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'doc';
    if (['xls', 'xlsx'].includes(ext)) return 'sheet';
    if (ext === 'txt') return 'text';
    return 'other';
  };

  const validateAndAddFiles = (incomingFiles: FileList | File[]) => {
    setFormError(null);
    const filesArray = Array.from(incomingFiles);
    const newItems: SelectedEvidenceFile[] = [];

    if (evidenceFiles.length + filesArray.length > MAX_EVIDENCE_FILES) {
      setFormError(`You can attach a maximum of ${MAX_EVIDENCE_FILES} files. Please select fewer attachments.`);
      return;
    }

    for (const file of filesArray) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let error: string | undefined;

      if (!ALLOWED_EXTENSIONS.has(ext)) {
        error = `.${ext || 'unknown'} format not supported. Supported: PNG, JPG, WEBP, PDF, TXT, DOC, DOCX, XLS, XLSX.`;
      } else if (file.size > MAX_EVIDENCE_SIZE_BYTES) {
        error = `Exceeds 15 MB limit (${formatFileSize(file.size)}).`;
      }

      // Check duplicates by filename and size
      const isDuplicate = evidenceFiles.some(
        (existing) => existing.file.name === file.name && existing.file.size === file.size
      );
      if (isDuplicate) {
        continue;
      }

      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        error,
      });
    }

    if (newItems.length > 0) {
      setEvidenceFiles((prev) => [...prev, ...newItems]);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleRemoveFile = (id: string) => {
    setEvidenceFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

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

          {/* Proof / Evidence Upload Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#231E1B]">
                Proof / Evidence <span className="text-[#8C8275] font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-[#8C8275]">
                {evidenceFiles.length} of {MAX_EVIDENCE_FILES} files
              </span>
            </div>

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.doc,.docx,.xls,.xlsx,image/png,image/jpeg,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => {
                if (e.target.files) {
                  validateAndAddFiles(e.target.files);
                  e.target.value = ''; // Reset so the same file can be re-selected if removed
                }
              }}
              className="hidden"
            />

            {/* Drag & Drop Box */}
            <div
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? 'border-[#C85A32] bg-[#FDF6F0] scale-[0.99]'
                  : 'border-[#DDD6C8] bg-[#FAF8F5] hover:bg-[#F5F1E8] hover:border-[#C85A32]/60'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-[#F2EDE2] text-[#8C6D58] flex items-center justify-center">
                <UploadCloud className="w-5 h-5 text-[#C85A32]" />
              </div>

              <div>
                <span className="text-xs font-semibold text-[#231E1B]">
                  Drag and drop proof files here, or{' '}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="text-xs font-bold text-[#C85A32] hover:underline cursor-pointer"
                >
                  Browse Files
                </button>
              </div>

              <p className="text-[11px] text-[#70675D]">
                Supported images: <strong>PNG, JPG, JPEG, WEBP</strong> &bull; Documents: <strong>PDF, TXT, DOC, DOCX, XLS, XLSX</strong>
              </p>
              <p className="text-[10px] text-[#8C8275]">
                Maximum 15 MB per file &bull; Up to 10 attachments
              </p>
            </div>

            {/* Selected files list */}
            {evidenceFiles.length > 0 && (
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                {evidenceFiles.map((item) => {
                  const category = getFileCategory(item.file.name);
                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                        item.error
                          ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
                          : 'bg-[#FFFFFF] border-[#E8E2D5] text-[#231E1B]'
                      }`}
                    >
                      {/* Left: Thumbnail or Category Icon */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt="preview"
                            className="w-10 h-10 rounded-lg object-cover border border-[#DDD6C8] shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#FAF7F0] border border-[#DDD6C8] flex items-center justify-center shrink-0 text-[#70675D]">
                            {category === 'pdf' && <FileText className="w-5 h-5 text-red-600" />}
                            {category === 'sheet' && <FileSpreadsheet className="w-5 h-5 text-emerald-600" />}
                            {category === 'doc' && <FileText className="w-5 h-5 text-blue-600" />}
                            {category === 'text' && <FileText className="w-5 h-5 text-gray-600" />}
                            {category === 'image' && <FileImage className="w-5 h-5 text-purple-600" />}
                            {category === 'other' && <FileIcon className="w-5 h-5 text-gray-400" />}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs truncate">{item.file.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-[#8C8275]">
                            <span>{formatFileSize(item.file.size)}</span>
                            <span>&bull;</span>
                            <span className="uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.2 rounded-md bg-[#F2EDE2] text-[#70675D]">
                              {category}
                            </span>
                          </div>
                          {item.error && (
                            <p className="text-[11px] text-red-600 font-medium mt-0.5">{item.error}</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-[#FEE2E2]/50 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer transition-colors"
                        title="Remove attachment"
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
