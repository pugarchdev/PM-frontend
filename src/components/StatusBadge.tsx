import React from 'react';
import { ProjectStatus, TaskPriority, IssueSeverity, RiskSeverity } from '../types.ts';

export const StatusBadge: React.FC<{
  status: ProjectStatus | string;
  isOverridden?: boolean;
  size?: 'sm' | 'md';
}> = ({ status, isOverridden, size = 'md' }) => {
  let bg = 'bg-[#F3F0E6] text-[#554F47] border-[#DDD6C8]';
  let label = status;
  let dotColor = 'bg-[#8C8275]';

  if (status === 'ON_TRACK') {
    bg = 'bg-[#EBF2EB] text-[#2D5A34] border-[#C4D9C5]';
    label = 'On Track';
    dotColor = 'bg-[#407B4A]';
  } else if (status === 'AT_RISK') {
    bg = 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
    label = 'At Risk';
    dotColor = 'bg-[#D97706]';
  } else if (status === 'OFF_TRACK') {
    bg = 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]';
    label = 'Off Track';
    dotColor = 'bg-[#DC2626]';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs font-medium';

  return (
    <span
      id={`status-badge-${status.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 rounded-full border ${padding} ${bg} font-medium tracking-wide shadow-xs`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
      {isOverridden && (
        <span className="text-[10px] opacity-75 font-normal ml-0.5">(Override)</span>
      )}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: TaskPriority | string }> = ({ priority }) => {
  let style = 'bg-[#F1EFE8] text-[#5F584F]';
  if (priority === 'High') {
    style = 'bg-[#FDE8E8] text-[#9B1C1C]';
  } else if (priority === 'Normal') {
    style = 'bg-[#EBF2EB] text-[#2B5731]';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {priority}
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: IssueSeverity | RiskSeverity | string }> = ({ severity }) => {
  let style = 'bg-[#F1EFE8] text-[#5F584F]';
  if (severity === 'Critical') {
    style = 'bg-[#991B1B] text-white font-semibold';
  } else if (severity === 'Major' || severity === 'High') {
    style = 'bg-[#FEE2E2] text-[#991B1B] font-medium';
  } else if (severity === 'Medium') {
    style = 'bg-[#FEF3C7] text-[#92400E] font-medium';
  } else {
    style = 'bg-[#EBF2EB] text-[#2B5731] font-medium';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${style}`}>
      {severity}
    </span>
  );
};

export const TaskStateBadge: React.FC<{ state: string }> = ({ state }) => {
  let style = 'bg-[#EFECE4] text-[#60584F]';
  if (state === 'Completed') {
    style = 'bg-[#EBF2EB] text-[#2D5A34]';
  } else if (state === 'In progress') {
    style = 'bg-[#F6EADB] text-[#A64E24] font-medium';
  } else if (state === 'Blocked') {
    style = 'bg-[#FEE2E2] text-[#991B1B] font-medium';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${style}`}>
      {state}
    </span>
  );
};
