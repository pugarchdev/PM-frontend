import React, { useState } from 'react';
import { X, Download, ExternalLink, FileText, FileSpreadsheet, FileImage, File, Trash2 } from 'lucide-react';
import { IssueAttachment } from '../types.ts';
import { apiUrl } from '../lib/api.ts';

interface IssueEvidenceViewerProps {
  issueId: string;
  attachment: IssueAttachment | null;
  onClose: () => void;
  onDeleteAttachment?: (issueId: string, attachmentId: string) => Promise<void>;
}

export const IssueEvidenceViewer: React.FC<IssueEvidenceViewerProps> = ({
  issueId,
  attachment,
  onClose,
  onDeleteAttachment,
}) => {
  if (!attachment) return null;

  const isImage = attachment.fileType === 'IMAGE' || attachment.mimeType.startsWith('image/');
  const fileUrl = apiUrl(`/api/issues/${issueId}/attachments/${attachment.id}`);
  const downloadUrl = apiUrl(`/api/issues/${issueId}/attachments/${attachment.id}?download=true`);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-[#DDD6C8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#FAF8F5] border-b border-[#EAE3D5]">
          <div className="flex items-center gap-2.5 min-w-0">
            {isImage ? (
              <FileImage className="w-5 h-5 text-[#C85A32] shrink-0" />
            ) : attachment.fileName.endsWith('.pdf') ? (
              <FileText className="w-5 h-5 text-red-600 shrink-0" />
            ) : attachment.fileName.endsWith('.xls') || attachment.fileName.endsWith('.xlsx') ? (
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <File className="w-5 h-5 text-[#8C6D58] shrink-0" />
            )}
            <div className="min-w-0">
              <h4 className="font-semibold text-sm text-[#231E1B] truncate">{attachment.fileName}</h4>
              <p className="text-[11px] text-[#70675D]">
                {formatFileSize(attachment.fileSize)} &bull; {attachment.mimeType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={downloadUrl}
              download={attachment.fileName}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#C85A32] text-white hover:bg-[#AD4722] flex items-center gap-1.5 min-h-[36px] transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            {onDeleteAttachment && (
              <button
                onClick={async () => {
                  if (
                    window.confirm(
                      `Are you sure you want to permanently delete "${attachment.fileName}"?\n\nThis will also permanently remove the file from Cloudinary storage.`
                    )
                  ) {
                    await onDeleteAttachment(issueId, attachment.id);
                  }
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA] flex items-center gap-1.5 min-h-[36px] transition-colors cursor-pointer"
                title="Delete this attachment from Cloudinary"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-black rounded-xl hover:bg-[#EAE4D6] min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-[#F4F1EA]">
          {isImage ? (
            <img
              src={fileUrl}
              alt={attachment.fileName}
              className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-md border border-[#EAE3D5]"
            />
          ) : (
            <div className="p-10 rounded-2xl bg-white border border-[#DDD6C8] text-center max-w-md shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#FAF7F0] text-[#C85A32] mx-auto flex items-center justify-center">
                {attachment.fileName.endsWith('.pdf') ? (
                  <FileText className="w-8 h-8 text-red-600" />
                ) : attachment.fileName.endsWith('.xls') || attachment.fileName.endsWith('.xlsx') ? (
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                ) : (
                  <File className="w-8 h-8 text-[#8C6D58]" />
                )}
              </div>
              <div>
                <h5 className="font-serif font-bold text-base text-[#231E1B]">{attachment.fileName}</h5>
                <p className="text-xs text-[#70675D] mt-1">
                  Document attachments can be previewed or opened in your browser or downloaded locally.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-[#F5F1E8] hover:bg-[#EAE4D6] text-[#231E1B] flex items-center gap-1.5 min-h-[40px] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in New Tab</span>
                </a>
                <a
                  href={downloadUrl}
                  download={attachment.fileName}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-[#C85A32] text-white hover:bg-[#AD4722] flex items-center gap-1.5 min-h-[40px] transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
