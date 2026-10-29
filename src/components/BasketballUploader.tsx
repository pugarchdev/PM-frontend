import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
  Trash2,
  Check,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'motion/react';

/* ═══════════════════════════════════════════════════
   Constants & types shared with RaiseIssueModal
   ═══════════════════════════════════════════════════ */
export const MAX_EVIDENCE_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_EVIDENCE_FILES = 10;

const ALLOWED_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'webp',
  'pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx',
]);

export interface SelectedEvidenceFile {
  id: string;
  file: File;
  previewUrl?: string;
  error?: string;
}

/* ═══════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════
   Animation phases for a shot
   ═══════════════════════════════════════════════════ */
type ShotPhase =
  | 'idle'        // waiting for files
  | 'aiming'      // file dragged over court with aim cursor
  | 'shooting'    // ball travelling along parabolic arc
  | 'swish'       // dropping through the hoop & net
  | 'scored'      // celebratory sparks & score display
  | 'rimmed'      // clanging off the rim
  | 'returning'   // falling back to drop zone
  | 'missed_ready'; // ball resting in drop zone ready to shoot again

/* ═══════════════════════════════════════════════════
   3D Basketball Hoop Component
   ═══════════════════════════════════════════════════ */
const BasketballHoop: React.FC<{
  phase: ShotPhase;
  reducedMotion: boolean;
  isRimHit: boolean;
}> = ({ phase, reducedMotion, isRimHit }) => {
  const isScored = phase === 'scored';
  const isSwish = phase === 'swish';
  const netSwing = isSwish || isScored;

  return (
    <div
      className="relative flex flex-col items-center select-none"
      style={{ perspective: '700px' }}
    >
      {/* Wall / Mount bracket behind backboard */}
      <div
        className="w-4 h-6 bg-gradient-to-b from-[#8C8275] to-[#5C5346] rounded-xs -mb-2 shadow-sm"
        style={{ transform: 'translateZ(-15px)' }}
      />

      {/* Backboard */}
      <div
        className="relative rounded-lg border-2 border-[#B8420F]/35 overflow-hidden shadow-md"
        style={{
          width: '94px',
          height: '60px',
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(246,242,234,0.96) 100%)',
          boxShadow:
            '0 6px 20px rgba(139,89,58,0.18), inset 0 1px 0 rgba(255,255,255,0.9)',
          transform: 'rotateX(3deg)',
        }}
      >
        {/* Outer border line */}
        <div className="absolute inset-1 border border-[#C85A32]/25 rounded-xs" />

        {/* Backboard inner target square */}
        <div
          className="absolute border-2 border-[#C85A32]/60 rounded-xs"
          style={{
            bottom: '8px',
            left: '26px',
            width: '42px',
            height: '28px',
            backgroundColor: 'rgba(200,90,50,0.04)',
          }}
        />
      </div>

      {/* Rim Bracket & 3D Rim Ring */}
      <div
        className="relative"
        style={{
          marginTop: '-4px',
          transform: isRimHit && !reducedMotion ? 'rotateX(58deg) scale(1.05)' : 'rotateX(58deg)',
          transition: 'transform 0.15s ease-out',
        }}
      >
        {/* Support neck */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-2 bg-[#A04524] rounded-t-xs" />

        {/* Metallic Orange Rim */}
        <div
          className={`rounded-full border-[3.5px] border-[#C85A32] transition-colors ${
            isRimHit ? 'border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]' : ''
          }`}
          style={{
            width: '56px',
            height: '16px',
            background: 'transparent',
            boxShadow:
              '0 3px 10px rgba(200,90,50,0.35), inset 0 -1px 3px rgba(160,69,36,0.3)',
          }}
        />
      </div>

      {/* Net — Multi-strand SVG with dynamic stretch */}
      <div
        className="relative overflow-visible"
        style={{
          width: '48px',
          height: '34px',
          marginTop: '-3px',
        }}
      >
        <svg
          viewBox="0 0 48 34"
          width="48"
          height="34"
          className="overflow-visible"
          style={{
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))',
          }}
        >
          {/* Vertical net strands */}
          {[5, 12, 19, 24, 29, 36, 43].map((x, i) => (
            <path
              key={`net-strand-${i}`}
              d={`M${x} 0 Q${x + (i % 2 === 0 ? 2 : -2)} 14 ${x + (i < 3 ? 3 : -3)} 22 Q24 32 24 34`}
              fill="none"
              stroke="#DDD6C8"
              strokeWidth="1.25"
              strokeLinecap="round"
              style={{
                transformOrigin: 'top center',
                animation:
                  netSwing && !reducedMotion
                    ? `netSwing${i % 2 === 0 ? 'A' : 'B'} 0.65s ease-out`
                    : undefined,
              }}
            />
          ))}

          {/* Horizontal net loops */}
          {[9, 17, 25].map((y, i) => (
            <path
              key={`net-loop-${i}`}
              d={`M${5 + i * 2} ${y} Q24 ${y + 3.5} ${43 - i * 2} ${y}`}
              fill="none"
              stroke="#DDD6C8"
              strokeWidth="0.85"
              opacity="0.8"
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Basketball Element (with file icon & aim arc)
   ═══════════════════════════════════════════════════ */
const BasketballBall: React.FC<{
  phase: ShotPhase;
  aimX: number;
  fileName?: string;
  fileCount?: number;
  reducedMotion: boolean;
  onRetryClick?: () => void;
}> = ({ phase, aimX, fileName, fileCount, reducedMotion, onRetryClick }) => {
  if (phase === 'idle') return null;

  if (reducedMotion) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="bg-white border border-[#DDD6C8] rounded-xl px-3 py-2 shadow-lg text-xs font-semibold text-[#231E1B] flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-[#C85A32]" />
          <span>{fileName || 'Drop file to attach'}</span>
        </div>
      </div>
    );
  }

  const isAiming = phase === 'aiming';
  const isMissedReady = phase === 'missed_ready';

  const shotVariants: Variants = {
    aiming: (custom: { aimX: number }) => ({
      x: custom.aimX,
      y: 0,
      scale: 1,
      rotate: custom.aimX * 0.15,
      opacity: 1,
    }),
    shooting: (custom: { aimX: number; isMiss: boolean }) => {
      const isMiss = Math.abs(custom.aimX) > 48;
      return {
        x: isMiss
          ? [custom.aimX, custom.aimX * 0.7, custom.aimX > 0 ? 30 : -30, custom.aimX > 0 ? 34 : -34]
          : [custom.aimX, custom.aimX * 0.5, 0, 0],
        y: [0, -65, -115, -138],
        scale: [1, 0.88, 0.72, 0.52],
        rotate: [0, -120, -280, -420],
        opacity: 1,
        transition: {
          duration: 0.65,
          ease: [0.22, 0.8, 0.36, 1],
        },
      };
    },
    swish: {
      x: 0,
      y: [-138, -122, -98],
      scale: [0.52, 0.44, 0.34],
      rotate: [-420, -480, -540],
      opacity: [1, 0.9, 0],
      transition: {
        duration: 0.4,
        ease: 'easeIn',
      },
    },
    scored: {
      x: 0,
      y: -98,
      scale: 0,
      opacity: 0,
    },
    rimmed: (custom: { aimX: number }) => {
      const deflectDir = custom.aimX >= 0 ? 1 : -1;
      return {
        x: [deflectDir * 34, deflectDir * 46, deflectDir * 36, deflectDir * 18, 0],
        y: [-138, -120, -75, -25, 0],
        scale: [0.52, 0.62, 0.78, 0.92, 1],
        rotate: [-420, -360, -240, -100, 0],
        opacity: 1,
        transition: {
          duration: 0.75,
          ease: 'easeOut',
        },
      };
    },
    returning: {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        duration: 0.35,
        ease: 'easeInOut',
      },
    },
    missed_ready: {
      x: 0,
      y: 0,
      scale: [1, 1.05, 1],
      rotate: 0,
      opacity: 1,
      transition: {
        scale: {
          repeat: Infinity,
          duration: 1.4,
          ease: 'easeInOut',
        },
      },
    },
  };

  return (
    <motion.div
      className={`absolute z-10 ${isMissedReady ? 'cursor-pointer' : 'pointer-events-none'}`}
      style={{
        bottom: '16px',
        left: '50%',
        marginLeft: '-23px',
      }}
      initial="aiming"
      animate={phase}
      custom={{ aimX }}
      variants={shotVariants}
      onClick={isMissedReady ? onRetryClick : undefined}
    >
      {/* File name tooltip when aiming */}
      <AnimatePresence>
        {isAiming && fileName && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: -4 }}
            exit={{ opacity: 0 }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/85 text-white text-[11px] font-medium px-2 py-0.5 rounded-md pointer-events-none shadow-md flex items-center gap-1"
          >
            <span className="truncate max-w-[130px]">{fileName}</span>
            {fileCount && fileCount > 1 && (
              <span className="text-[#F4945E] font-bold">+{fileCount - 1}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Retry badge when missed */}
      <AnimatePresence>
        {isMissedReady && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: -8, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#C85A32] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 cursor-pointer hover:bg-[#B8420F] transition-colors"
          >
            <RotateCcw className="w-3 h-3 animate-spin-reverse" />
            <span>Tap ball to re-shoot!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Basketball Body */}
      <div
        className="relative rounded-full flex items-center justify-center transition-transform hover:scale-105"
        style={{
          width: '46px',
          height: '46px',
          background:
            'radial-gradient(ellipse at 35% 30%, #F59B63 0%, #E8753A 40%, #C85A32 72%, #9B3E1F 100%)',
          boxShadow:
            '0 6px 18px rgba(200,90,50,0.38), inset 0 -2.5px 6px rgba(0,0,0,0.22), inset 0 2.5px 5px rgba(255,220,180,0.35)',
        }}
      >
        {/* Basketball Rib / Seam Lines */}
        <svg viewBox="0 0 46 46" width="46" height="46" className="absolute inset-0 pointer-events-none">
          {/* Horizontal center seam */}
          <ellipse cx="23" cy="23" rx="21" ry="4.5" fill="none" stroke="#68250F" strokeWidth="0.9" opacity="0.6" />
          {/* Vertical center seam */}
          <ellipse cx="23" cy="23" rx="4.5" ry="21" fill="none" stroke="#68250F" strokeWidth="0.9" opacity="0.6" />
          {/* Outer circle seam */}
          <circle cx="23" cy="23" r="22" fill="none" stroke="#68250F" strokeWidth="0.5" opacity="0.4" />
        </svg>

        {/* Center File Icon on the Basketball */}
        <div className="relative z-[1] flex items-center justify-center">
          <FileIcon className="w-4 h-4 text-white/85 drop-shadow-xs" />
        </div>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════
   Aiming Trajectory Guide (Desktop Drag-over)
   ═══════════════════════════════════════════════════ */
const AimGuide: React.FC<{
  aimX: number;
  reducedMotion: boolean;
}> = ({ aimX, reducedMotion }) => {
  if (reducedMotion) return null;

  const isCentered = Math.abs(aimX) <= 48;
  const startX = 140 + aimX;
  const startY = 165;
  const endX = isCentered ? 140 : 140 + (aimX > 0 ? 28 : -28);
  const endY = 62;
  const ctrlX = isCentered ? (startX + 140) / 2 : 140 + aimX * 0.4;
  const ctrlY = 85;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
      viewBox="0 0 280 190"
      preserveAspectRatio="none"
    >
      {/* Curved trajectory path */}
      <path
        d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
        fill="none"
        stroke={isCentered ? 'rgba(34, 197, 94, 0.65)' : 'rgba(239, 68, 68, 0.6)'}
        strokeWidth="2.5"
        strokeDasharray="4 4"
        className="animate-pulse"
      />

      {/* Target Reticle near Hoop */}
      <circle
        cx={endX}
        cy={endY}
        r="7"
        fill={isCentered ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.15)'}
        stroke={isCentered ? '#22C55E' : '#EF4444'}
        strokeWidth="1.8"
      />
      <circle
        cx={endX}
        cy={endY}
        r="2"
        fill={isCentered ? '#22C55E' : '#EF4444'}
      />
    </svg>
  );
};

/* ═══════════════════════════════════════════════════
   Swish Score Celebration Popup
   ═══════════════════════════════════════════════════ */
const ScoreCelebration: React.FC<{ show: boolean; reducedMotion: boolean }> = ({
  show,
  reducedMotion,
}) => (
  <AnimatePresence>
    {show && (
      <motion.div
        className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.15 }}
        transition={{ duration: reducedMotion ? 0.15 : 0.4 }}
      >
        {/* Sparkle particle bursts */}
        {!reducedMotion && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[-45, -15, 15, 45, 120, -120].map((deg, i) => (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute w-2 h-2 rounded-full bg-amber-400"
                initial={{ x: 0, y: -20, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos((deg * Math.PI) / 180) * 45,
                  y: -20 + Math.sin((deg * Math.PI) / 180) * 45,
                  opacity: 0,
                  scale: 0.2,
                }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}

        <div className="flex flex-col items-center gap-1 bg-white/95 backdrop-blur-xs px-4 py-2 rounded-2xl shadow-xl border border-emerald-200">
          <div className="flex items-center gap-1.5 text-emerald-600 font-black text-sm tracking-wide">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span>SWISH! +2 PTS</span>
            <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />
          </div>
          <span className="text-[10px] font-semibold text-emerald-800">
            Attachment added successfully
          </span>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ═══════════════════════════════════════════════════
   Miss / Off-The-Rim Banner
   ═══════════════════════════════════════════════════ */
const MissAlert: React.FC<{ show: boolean; reducedMotion: boolean }> = ({
  show,
  reducedMotion,
}) => (
  <AnimatePresence>
    {show && (
      <motion.div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        initial={{ opacity: 0, y: -10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: reducedMotion ? 0.1 : 0.25 }}
      >
        <div className="px-3 py-1.5 rounded-full bg-red-600 text-white font-bold text-xs shadow-lg flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>OFF THE RIM! (Aim closer to center)</span>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ═══════════════════════════════════════════════════
   Props for BasketballUploader
   ═══════════════════════════════════════════════════ */
export interface BasketballUploaderProps {
  evidenceFiles: SelectedEvidenceFile[];
  setEvidenceFiles: React.Dispatch<React.SetStateAction<SelectedEvidenceFile[]>>;
  setFormError: (msg: string | null) => void;
  isSubmitting?: boolean;
}

/* ═══════════════════════════════════════════════════
   🏀  Main Basketball Uploader Component
   ═══════════════════════════════════════════════════ */
export const BasketballUploader: React.FC<BasketballUploaderProps> = ({
  evidenceFiles,
  setEvidenceFiles,
  setFormError,
  isSubmitting = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [shotPhase, setShotPhase] = useState<ShotPhase>('idle');
  const [aimX, setAimX] = useState<number>(0);
  const [dragFileName, setDragFileName] = useState<string | undefined>();
  const [dragFiles, setDragFiles] = useState<File[]>([]);
  const [isRimHit, setIsRimHit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const courtRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = !!prefersReducedMotion;

  // ──────────── File Validation & Addition ────────────
  const validateAndAddFiles = useCallback(
    (incomingFiles: FileList | File[]) => {
      setFormError(null);
      const filesArray = Array.from(incomingFiles);
      const newItems: SelectedEvidenceFile[] = [];

      if (evidenceFiles.length + filesArray.length > MAX_EVIDENCE_FILES) {
        setFormError(
          `You can attach a maximum of ${MAX_EVIDENCE_FILES} files. Please select fewer attachments.`
        );
        return false;
      }

      for (const file of filesArray) {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let error: string | undefined;

        if (!ALLOWED_EXTENSIONS.has(ext)) {
          error = `.${ext || 'unknown'} format not supported. Supported: PNG, JPG, WEBP, PDF, TXT, DOC, DOCX, XLS, XLSX.`;
        } else if (file.size > MAX_EVIDENCE_SIZE_BYTES) {
          error = `Exceeds 15 MB limit (${formatFileSize(file.size)}).`;
        }

        const isDuplicate = evidenceFiles.some(
          (existing) => existing.file.name === file.name && existing.file.size === file.size
        );
        if (isDuplicate) continue;

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
      return true;
    },
    [evidenceFiles, setEvidenceFiles, setFormError]
  );

  // ──────────── Shot Physics & Animation ────────────
  const executeShot = useCallback(
    (files: File[], forcedScore = false, launchAimX = 0) => {
      if (files.length === 0) return;

      if (reducedMotion) {
        validateAndAddFiles(files);
        setShotPhase('idle');
        setDragFiles([]);
        setDragFileName(undefined);
        return;
      }

      setDragFiles(files);
      setDragFileName(files[0].name);
      setAimX(launchAimX);
      setShotPhase('shooting');

      // Determine hit or miss based on aim:
      // If aim is within +-48px or forcedScore (via Browse or Retry), shot is a SWISH!
      const isSwish = forcedScore || Math.abs(launchAimX) <= 48;

      setTimeout(() => {
        if (isSwish) {
          // Ball enters rim & net swishes
          setShotPhase('swish');

          setTimeout(() => {
            setShotPhase('scored');
            validateAndAddFiles(files);

            setTimeout(() => {
              setShotPhase('idle');
              setDragFiles([]);
              setDragFileName(undefined);
              setAimX(0);
            }, 850);
          }, 400);
        } else {
          // Ball clangs on rim and bounces back down
          setIsRimHit(true);
          setShotPhase('rimmed');

          setTimeout(() => {
            setIsRimHit(false);
          }, 350);

          setTimeout(() => {
            setShotPhase('returning');

            setTimeout(() => {
              // Ball rests at bottom of court; user can tap to re-shoot with clean swish!
              setShotPhase('missed_ready');
            }, 350);
          }, 750);
        }
      }, 650);
    },
    [reducedMotion, validateAndAddFiles]
  );

  // ──────────── Retry Missed Shot ────────────
  const handleRetryShot = useCallback(() => {
    if (dragFiles.length === 0) return;
    // Guaranteed perfect score on retry
    executeShot(dragFiles, true, 0);
  }, [dragFiles, executeShot]);

  // ──────────── Desktop Drag & Drop Handlers ────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    if (courtRef.current) {
      const rect = courtRef.current.getBoundingClientRect();
      const relativeX = e.clientX - (rect.left + rect.width / 2);
      // Clamp aim to court bounds (-95px to +95px)
      const clampedAim = Math.max(-95, Math.min(95, relativeX));
      setAimX(clampedAim);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = courtRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (
        clientX <= rect.left ||
        clientX >= rect.right ||
        clientY <= rect.top ||
        clientY >= rect.bottom
      ) {
        setIsDragging(false);
        if (shotPhase === 'idle') {
          setAimX(0);
        }
      }
    }
  }, [shotPhase]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        executeShot(files, false, aimX);
      }
    },
    [aimX, executeShot]
  );

  // ──────────── Native File Input Handler ────────────
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        // Browse button provides clean, centered swish shot
        executeShot(files, true, 0);
        e.target.value = '';
      }
    },
    [executeShot]
  );

  // ──────────── Mobile Tap / Court Click ────────────
  const handleCourtClick = useCallback(() => {
    if (shotPhase === 'missed_ready') {
      handleRetryShot();
      return;
    }
    if (shotPhase !== 'idle') return;
    fileInputRef.current?.click();
  }, [shotPhase, handleRetryShot]);

  // ──────────── Remove Attachment ────────────
  const handleRemoveFile = useCallback(
    (id: string) => {
      setEvidenceFiles((prev) => {
        const target = prev.find((item) => item.id === id);
        if (target?.previewUrl) {
          URL.revokeObjectURL(target.previewUrl);
        }
        return prev.filter((item) => item.id !== id);
      });
    },
    [setEvidenceFiles]
  );

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      evidenceFiles.forEach((ef) => {
        if (ef.previewUrl) URL.revokeObjectURL(ef.previewUrl);
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isAnimating = shotPhase !== 'idle';

  // Court border & surface lighting
  const courtClasses = useMemo(() => {
    if (isDragging) {
      const isCentered = Math.abs(aimX) <= 48;
      return isCentered
        ? 'border-[#22C55E] bg-[#F0FDF4] shadow-[0_0_24px_rgba(34,197,94,0.18)]'
        : 'border-[#EF4444] bg-[#FEF2F2] shadow-[0_0_24px_rgba(239,68,68,0.15)]';
    }
    if (shotPhase === 'scored') {
      return 'border-[#22C55E]/70 bg-[#F0FDF4] shadow-[0_0_20px_rgba(34,197,94,0.15)]';
    }
    if (shotPhase === 'rimmed' || shotPhase === 'missed_ready') {
      return 'border-[#C85A32]/80 bg-[#FFF8F2]';
    }
    return 'border-[#DDD6C8] bg-[#FAF8F5] hover:bg-[#F5F1E8] hover:border-[#C85A32]/60';
  }, [isDragging, aimX, shotPhase]);

  return (
    <div>
      {/* Header with File Count */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-[#231E1B]">
          Proof / Evidence <span className="text-[#8C8275] font-normal">(Optional)</span>
        </label>
        <span className="text-[11px] text-[#8C8275] font-medium">
          {evidenceFiles.length} of {MAX_EVIDENCE_FILES} files
        </span>
      </div>

      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.doc,.docx,.xls,.xlsx,image/png,image/jpeg,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Miniature Basketball Court Upload Area */}
      <div
        ref={courtRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleCourtClick}
        role="button"
        tabIndex={0}
        aria-label="Upload evidence files — drag and shoot into basketball hoop or click to browse"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCourtClick();
          }
        }}
        className={`relative p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2 overflow-hidden select-none ${courtClasses}`}
        style={{ minHeight: '210px' }}
      >
        {/* Subtle Hardwood Court Floor Markings */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '130px',
            height: '70px',
            borderTop: '1.5px solid rgba(200,90,50,0.12)',
            borderLeft: '1.5px solid rgba(200,90,50,0.12)',
            borderRight: '1.5px solid rgba(200,90,50,0.12)',
            borderRadius: '65px 65px 0 0',
            background: 'radial-gradient(ellipse at bottom, rgba(200,90,50,0.03) 0%, transparent 70%)',
          }}
        />

        {/* Free Throw Key Lane */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '74px',
            height: '50px',
            borderLeft: '1px solid rgba(200,90,50,0.08)',
            borderRight: '1px solid rgba(200,90,50,0.08)',
          }}
        />

        {/* Shadow under the hoop */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '106px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '64px',
            height: '9px',
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* 3D Basketball Hoop */}
        <div className="relative z-[2]">
          <BasketballHoop
            phase={shotPhase}
            reducedMotion={reducedMotion}
            isRimHit={isRimHit}
          />
        </div>

        {/* Aim Guide Line during Dragging */}
        {isDragging && shotPhase === 'idle' && (
          <AimGuide aimX={aimX} reducedMotion={reducedMotion} />
        )}

        {/* Animated Basketball */}
        <BasketballBall
          phase={isDragging && shotPhase === 'idle' ? 'aiming' : shotPhase}
          aimX={aimX}
          fileName={dragFileName}
          fileCount={dragFiles.length}
          reducedMotion={reducedMotion}
          onRetryClick={handleRetryShot}
        />

        {/* Celebration / Alert Overlays */}
        <ScoreCelebration show={shotPhase === 'scored'} reducedMotion={reducedMotion} />
        <MissAlert show={shotPhase === 'rimmed'} reducedMotion={reducedMotion} />

        {/* Idle Prompts & Status */}
        <AnimatePresence mode="wait">
          {!isAnimating && !isDragging && (
            <motion.div
              key="idle-prompt"
              className="relative z-[1] flex flex-col items-center gap-1 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div>
                <span className="text-xs font-semibold text-[#231E1B]">
                  Drag files to shoot into hoop, or{' '}
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
                Images: <strong>PNG, JPG, WEBP</strong> &bull; Documents:{' '}
                <strong>PDF, TXT, DOC, DOCX, XLS, XLSX</strong>
              </p>
              <p className="text-[10px] text-[#8C8275]">
                Maximum 15 MB per file &bull; Up to 10 attachments
              </p>
            </motion.div>
          )}

          {isDragging && shotPhase === 'idle' && (
            <motion.div
              key="drag-prompt"
              className="relative z-[1]"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  Math.abs(aimX) <= 48
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {Math.abs(aimX) <= 48 ? '🎯 Good aim! Release to shoot' : '⚠️ Aim closer to center hoop'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Progress Indicator during Form Submission */}
      {isSubmitting && evidenceFiles.length > 0 && (
        <div className="mt-3 p-3 rounded-xl bg-orange-50/90 border border-orange-200 flex flex-col gap-1.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs font-semibold text-orange-950">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C85A32]" />
              Uploading {evidenceFiles.length} evidence attachment{evidenceFiles.length > 1 ? 's' : ''} to Cloudinary...
            </span>
            <span className="text-[11px] font-bold text-[#C85A32]">Syncing</span>
          </div>
          <div className="w-full h-1.5 bg-orange-200/70 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#C85A32] to-[#E8753A] animate-pulse rounded-full w-4/5" />
          </div>
        </div>
      )}

      {/* ─────────── Attached Files List ─────────── */}
      {evidenceFiles.length > 0 && (
        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {evidenceFiles.map((item) => {
              const category = getFileCategory(item.file.name);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  transition={{ duration: reducedMotion ? 0.1 : 0.25 }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                    item.error
                      ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
                      : 'bg-[#FFFFFF] border-[#E8E2D5] text-[#231E1B]'
                  }`}
                >
                  {/* Thumbnail or File Category Icon */}
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
                        {category === 'sheet' && (
                          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        )}
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

                  {/* Remove attachment button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(item.id)}
                    disabled={isSubmitting}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-[#FEE2E2]/50 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50"
                    title="Remove attachment"
                    aria-label={`Remove ${item.file.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ─────────── Net Swing Animations ─────────── */}
      <style>{`
        @keyframes netSwingA {
          0% { transform: scaleY(1) skewX(0); }
          25% { transform: scaleY(1.15) skewX(4deg); }
          50% { transform: scaleY(0.95) skewX(-2deg); }
          75% { transform: scaleY(1.04) skewX(1deg); }
          100% { transform: scaleY(1) skewX(0); }
        }
        @keyframes netSwingB {
          0% { transform: scaleY(1) skewX(0); }
          25% { transform: scaleY(1.18) skewX(-4deg); }
          50% { transform: scaleY(0.92) skewX(2deg); }
          75% { transform: scaleY(1.05) skewX(-1deg); }
          100% { transform: scaleY(1) skewX(0); }
        }
      `}</style>
    </div>
  );
};
