import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  History,
  FilePlus,
  AlertCircle,
  CheckCircle2,
  X,
  File,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch, apiUrl } from '../lib/api.ts';
import { DocumentItem } from '../types.ts';

interface ProjectDocumentsTabProps {
  projectId: string;
  projectName: string;
}

export const ProjectDocumentsTab: React.FC<ProjectDocumentsTabProps> = ({ projectId, projectName }) => {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [uploadComment, setUploadComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // New Version Modal
  const [targetDoc, setTargetDoc] = useState<DocumentItem | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionComment, setVersionComment] = useState('');
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  // Version History Modal
  const [viewingHistoryDoc, setViewingHistoryDoc] = useState<DocumentItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const versionInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/projects/${projectId}/documents`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load project documents');
      }
      const data = await res.json();
      setDocuments(data || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      validateAndSetFile(f);
    }
  };

  const validateAndSetFile = (f: File) => {
    setUploadError(null);
    if (f.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds 25 MB maximum limit.');
      return;
    }
    const ext = f.name.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'xlsx', 'docx', 'dwg', 'png', 'jpg', 'jpeg'];
    if (!ext || !allowed.includes(ext)) {
      setUploadError(`Extension .${ext} not allowed. Supported: PDF, XLSX, DOCX, DWG, PNG, JPG.`);
      return;
    }
    setSelectedFile(f);
    if (!docTitle) {
      setDocTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const submittingRef = useRef(false);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    if (submittingRef.current || uploading) return;
    submittingRef.current = true;

    try {
      setUploading(true);
      setUploadError(null);
      setUploadProgress(15);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', docTitle.trim() || selectedFile.name);
      formData.append('description', docDescription.trim());
      formData.append('comment', uploadComment.trim() || 'Initial version');

      // Simulate progress progression
      const interval = setInterval(() => {
        setUploadProgress((p) => (p < 85 ? p + 20 : p));
      }, 150);

      const res = await apiFetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      setUploadProgress(100);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Document upload failed.');
      }

      setShowUploadModal(false);
      setSelectedFile(null);
      setDocTitle('');
      setDocDescription('');
      setUploadComment('');
      setUploadProgress(0);
      fetchDocuments();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please retry.');
    } finally {
      submittingRef.current = false;
      setUploading(false);
    }
  };

  const handleVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDoc || !versionFile) return;
    if (submittingRef.current || uploadingVersion) return;
    submittingRef.current = true;

    try {
      setUploadingVersion(true);
      setVersionError(null);

      const formData = new FormData();
      formData.append('file', versionFile);
      formData.append('comment', versionComment.trim() || `Revision v${targetDoc.currentVersion + 1}`);

      const res = await apiFetch(`/api/documents/${targetDoc.id}/versions`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to upload revision.');
      }

      setTargetDoc(null);
      setVersionFile(null);
      setVersionComment('');
      fetchDocuments();
    } catch (err: any) {
      setVersionError(err.message || 'Version upload failed');
    } finally {
      submittingRef.current = false;
      setUploadingVersion(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8E2D5]">
        <div>
          <h3 className="font-serif font-bold text-sm sm:text-base text-[#231E1B]">Document Repository</h3>
          <p className="text-xs text-[#70685F]">
            Secure cloud storage for project deliverables, plans, and drawings with revision versioning
          </p>
        </div>

        <button
          id="btn-upload-document"
          onClick={() => setShowUploadModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#A63C1E] active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-transform cursor-pointer min-h-[44px]"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-[#70685F]">Loading document repository...</div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-[#FDF2F2] border border-[#F8D7D7] text-xs text-[#991B1B] text-center">
          {error}
        </div>
      ) : documents.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-white border border-[#E8E2D5] text-center space-y-3">
          <FileText className="w-12 h-12 text-[#DDD6C8] mx-auto" />
          <h4 className="font-serif font-bold text-base text-[#231E1B]">No Documents Stored</h4>
          <p className="text-xs text-[#70685F] max-w-sm mx-auto leading-relaxed">
            Upload project specifications, contracts, budgets, or CAD drawings (PDF, XLSX, DOCX, DWG, PNG, JPG up to 25 MB).
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C85A32] text-white text-xs font-semibold hover:bg-[#A63C1E] active:scale-95 shadow-xs cursor-pointer min-h-[44px]"
          >
            Upload First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {documents.map((doc) => {
            const latestVersion = doc.versions[0];
            return (
              <div
                key={doc.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E8E2D5] shadow-2xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F2EDE2] text-[#554E44]">
                        {doc.fileType}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF2EB] text-[#2D5A34]">
                        v{doc.currentVersion}
                      </span>
                    </div>

                    <span className="text-[10px] sm:text-[11px] text-[#9B9287]">
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-serif font-bold text-xs sm:text-sm text-[#231E1B] mt-2 truncate">
                    {doc.title}
                  </h4>
                  {doc.description && (
                    <p className="text-xs text-[#554E44] mt-0.5 line-clamp-2">{doc.description}</p>
                  )}

                  <div className="text-[10px] sm:text-[11px] text-[#70685F] mt-2 flex items-center gap-2">
                    <span>Size: {latestVersion ? formatBytes(latestVersion.fileSize) : 'N/A'}</span>
                    <span>&bull;</span>
                    <span className="truncate">By: {doc.uploader?.name || 'Member'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F0EBE0] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <a
                      href={apiUrl(`/api/documents/${doc.id}/download`)}
                      download
                      className="px-3 py-2.5 rounded-xl bg-[#F5F1E8] hover:bg-[#EDE7DC] active:scale-95 text-[#231E1B] text-xs font-semibold flex items-center gap-1.5 transition-transform cursor-pointer min-h-[44px]"
                      title="Download latest version"
                    >
                      <Download className="w-3.5 h-3.5 text-[#C85A32]" />
                      Download
                    </a>

                    <button
                      onClick={() => setViewingHistoryDoc(doc)}
                      className="px-2.5 py-2.5 rounded-xl text-[#70685F] hover:text-[#231E1B] active:scale-95 text-xs font-semibold flex items-center gap-1 cursor-pointer min-h-[44px]"
                      title="View all versions"
                    >
                      <History className="w-3.5 h-3.5" />
                      v{doc.versions.length}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setTargetDoc(doc);
                      setVersionFile(null);
                      setVersionComment('');
                      setVersionError(null);
                    }}
                    className="px-3 py-2.5 rounded-xl text-xs font-semibold text-[#526E55] hover:bg-[#EBF2EB] active:scale-95 flex items-center gap-1 transition-transform cursor-pointer min-h-[44px]"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    New Version
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Document Modal / Bottom Sheet */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#E8E2D5] space-y-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#231E1B]">Upload Project Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-xl text-[#70685F] hover:bg-[#EDE7DC] active:scale-95 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-[#FDF2F2] border border-[#F8D7D7] rounded-xl text-xs text-[#991B1B] flex items-center justify-between">
                <span>{uploadError}</span>
                <button
                  onClick={handleUploadSubmit}
                  className="font-bold underline flex items-center gap-1 ml-2"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-5 sm:p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors ${
                  selectedFile
                    ? 'border-[#526E55] bg-[#F2F7F2]'
                    : 'border-[#DDD6C8] bg-[#FAF7F2] hover:bg-[#F9F7F2]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.xlsx,.docx,.dwg,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      validateAndSetFile(e.target.files[0]);
                    }
                  }}
                />

                <Upload className={`w-8 h-8 mx-auto mb-2 ${selectedFile ? 'text-[#526E55]' : 'text-[#70685F]'}`} />
                {selectedFile ? (
                  <div>
                    <p className="text-xs font-bold text-[#231E1B] truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-[#70685F] mt-0.5">{formatBytes(selectedFile.size)}</p>
                    <p className="text-[10px] text-[#526E55] font-semibold mt-1">Tap to replace file</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-[#231E1B]">Tap to choose file or drag &amp; drop</p>
                    <p className="text-[11px] text-[#70685F] mt-1">
                      PDF, XLSX, DOCX, DWG, PNG, JPG (up to 25 MB)
                    </p>
                  </div>
                )}
              </div>

              {uploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#70685F]">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#E8E2D5] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#C85A32] h-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Architectural Site Plan"
                  className="w-full bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#231E1B] focus:ring-1 focus:ring-[#C85A32] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Description</label>
                <input
                  type="text"
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="e.g. Approved foundation blueprints"
                  className="w-full bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#231E1B] focus:ring-1 focus:ring-[#C85A32] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Initial Version Comment</label>
                <input
                  type="text"
                  value={uploadComment}
                  onChange={(e) => setUploadComment(e.target.value)}
                  placeholder="e.g. Initial draft for review"
                  className="w-full bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#231E1B] focus:ring-1 focus:ring-[#C85A32] min-h-[44px]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#DDD6C8] text-xs font-semibold text-[#70685F] hover:bg-[#EDE7DC] active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C85A32] text-white text-xs font-semibold hover:bg-[#A63C1E] active:scale-95 shadow-xs cursor-pointer disabled:opacity-40 min-h-[44px]"
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload New Version Modal / Bottom Sheet */}
      {targetDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#E8E2D5] space-y-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />

            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#231E1B]">
                Upload New Revision (v{targetDoc.currentVersion + 1})
              </h3>
              <p className="text-xs text-[#70685F]">
                Updating &ldquo;{targetDoc.title}&rdquo;. Previous versions will remain preserved.
              </p>
            </div>

            {versionError && (
              <div className="p-3 bg-[#FDF2F2] border border-[#F8D7D7] rounded-xl text-xs text-[#991B1B]">
                {versionError}
              </div>
            )}

            <form onSubmit={handleVersionSubmit} className="space-y-3.5">
              <div
                onClick={() => versionInputRef.current?.click()}
                className={`p-5 border-2 border-dashed rounded-xl text-center cursor-pointer ${
                  versionFile ? 'border-[#526E55] bg-[#F2F7F2]' : 'border-[#DDD6C8] bg-[#FAF7F2]'
                }`}
              >
                <input
                  ref={versionInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.xlsx,.docx,.dwg,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setVersionFile(e.target.files[0]);
                    }
                  }}
                />
                <FilePlus className="w-7 h-7 mx-auto mb-1 text-[#526E55]" />
                {versionFile ? (
                  <p className="text-xs font-bold text-[#231E1B] truncate">{versionFile.name}</p>
                ) : (
                  <p className="text-xs text-[#70685F]">Tap to select revised file</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Revision Change Note
                </label>
                <input
                  type="text"
                  value={versionComment}
                  onChange={(e) => setVersionComment(e.target.value)}
                  placeholder="e.g. Incorporated structural engineer feedback"
                  className="w-full bg-[#FAF7F2] border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#231E1B] focus:ring-1 focus:ring-[#C85A32] min-h-[44px]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTargetDoc(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#DDD6C8] text-xs font-semibold text-[#70685F] hover:bg-[#EDE7DC] active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!versionFile || uploadingVersion}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#526E55] text-white text-xs font-semibold hover:bg-[#3E5540] active:scale-95 transition-all shadow-xs cursor-pointer min-h-[44px]"
                >
                  {uploadingVersion ? 'Uploading...' : 'Commit Revision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal / Bottom Sheet */}
      {viewingHistoryDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-[#E8E2D5] space-y-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D5]">
              <div className="min-w-0">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#231E1B]">Version History</h3>
                <p className="text-xs text-[#70685F] truncate">{viewingHistoryDoc.title}</p>
              </div>
              <button
                onClick={() => setViewingHistoryDoc(null)}
                className="p-1.5 text-[#70685F] hover:bg-[#EDE7DC] active:scale-95 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {viewingHistoryDoc.versions.map((v) => (
                <div
                  key={v.id}
                  className="p-3 sm:p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#231E1B]">Version {v.version}</span>
                      {v.version === viewingHistoryDoc.currentVersion && (
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-[#EBF2EB] text-[#2D5A34]">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#70685F] truncate">{v.comment || 'No comment'}</div>
                    <div className="text-[10px] text-[#9B9287]">
                      {new Date(v.uploadedAt).toLocaleString()} &bull; {formatBytes(v.fileSize)}
                    </div>
                  </div>

                  <a
                    href={apiUrl(`/api/documents/${viewingHistoryDoc.id}/download?version=${v.version}`)}
                    download
                    className="px-3 py-2 rounded-xl bg-white hover:bg-[#EDE7DC] active:scale-95 text-xs font-semibold flex items-center gap-1 text-[#231E1B] shrink-0 border border-[#DDD6C8] min-h-[38px]"
                  >
                    <Download className="w-3.5 h-3.5 text-[#C85A32]" />
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
