import React from 'react';
import { StageId, StageStatus } from '../types';
import { Check, Lock, Loader2, AlertCircle, Minus } from 'lucide-react';

interface StageMeta {
  id: StageId;
  label: string;
  shortLabel: string;
  stepNumber: string;
}

const STAGES: StageMeta[] = [
  { id: '01_INTAKE', label: 'Evidence Intake', shortLabel: 'Intake', stepNumber: '01' },
  { id: '02_PARSER', label: 'Email Parser', shortLabel: 'Parser', stepNumber: '02' },
  { id: '03_AUTHENTICATION', label: 'Authentication', shortLabel: 'Auth', stepNumber: '03' },
  { id: '04_IOC', label: 'IOC Extraction', shortLabel: 'IOC', stepNumber: '04' },
  { id: '05_INTELLIGENCE', label: 'Intelligence', shortLabel: 'Intel', stepNumber: '05' },
  { id: '06_CONTENT_ANALYSIS', label: 'Content Analysis', shortLabel: 'Content', stepNumber: '06' },
  { id: '07_TECHNICAL_ANALYSIS', label: 'Technical Threat', shortLabel: 'Technical', stepNumber: '07' },
  { id: '08_FUSION', label: 'Evidence Fusion', shortLabel: 'Fusion', stepNumber: '08' },
  { id: '09_ORIGIN', label: 'Origin & Geo', shortLabel: 'Origin', stepNumber: '09' },
  { id: '10_GRAPH', label: 'Threat Graph', shortLabel: 'Graph', stepNumber: '10' },
  { id: '11_CAMPAIGN', label: 'Campaign Analysis', shortLabel: 'Campaign', stepNumber: '11' },
  { id: '12_REPORT', label: 'Forensic Report', shortLabel: 'Report', stepNumber: '12' },
];

interface StageProgressBarProps {
  currentStage: StageId;
  stageStatuses: Record<StageId, StageStatus>;
  onSelectStage: (stageId: StageId) => void;
}

export const StageProgressBar: React.FC<StageProgressBarProps> = ({
  currentStage,
  stageStatuses,
  onSelectStage,
}) => {
  return (
    <nav aria-label="Investigation Stages" className="bg-[#FFFFFF] border-b border-[#D9E1E6] px-3 py-2 overflow-x-auto shrink-0 select-none shadow-xs">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between min-w-[900px] gap-1">
        {STAGES.map((stage, idx) => {
          const status = stageStatuses[stage.id];
          const isCurrent = currentStage === stage.id;
          const isClickable = status === 'COMPLETE' || status === 'READY' || isCurrent;

          let statusBadge: React.ReactNode;
          if (status === 'COMPLETE') {
            statusBadge = (
              <span className="w-4 h-4 rounded-full bg-[#1FA463] text-white flex items-center justify-center text-[10px]">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            );
          } else if (status === 'RUNNING') {
            statusBadge = (
              <span className="w-4 h-4 rounded-full bg-[#2DBDCA] text-white flex items-center justify-center text-[10px]">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              </span>
            );
          } else if (status === 'READY') {
            statusBadge = (
              <span className="w-4 h-4 rounded-full border-2 border-[#2DBDCA] text-[#0e808c] flex items-center justify-center text-[9px] font-bold">
                {stage.stepNumber}
              </span>
            );
          } else if (status === 'FAILED') {
            statusBadge = (
              <span className="w-4 h-4 rounded-full bg-[#D94A4A] text-white flex items-center justify-center text-[10px]">
                <AlertCircle className="w-2.5 h-2.5" />
              </span>
            );
          } else if (status === 'UNAVAILABLE') {
            statusBadge = (
              <span className="w-4 h-4 rounded-full bg-[#53657A]/20 text-[#53657A] flex items-center justify-center text-[10px]">
                <Minus className="w-2.5 h-2.5" />
              </span>
            );
          } else {
            // LOCKED
            statusBadge = (
              <span className="w-4 h-4 rounded-full bg-[#E5E9EC] text-[#8695A6] flex items-center justify-center text-[9px]">
                <Lock className="w-2.5 h-2.5" />
              </span>
            );
          }

          return (
            <React.Fragment key={stage.id}>
              <button
                type="button"
                onClick={() => isClickable && onSelectStage(stage.id)}
                disabled={!isClickable}
                className={`group flex items-center gap-1.5 px-2 py-1 rounded-md text-left transition-all ${
                  isCurrent
                    ? 'bg-[#142238] text-white shadow-xs'
                    : isClickable
                    ? 'hover:bg-[#F5F6F4] text-[#142238]'
                    : 'opacity-40 cursor-not-allowed text-[#53657A]'
                }`}
                title={`${stage.stepNumber} ${stage.label} (${status})`}
              >
                {statusBadge}
                <div className="flex flex-col">
                  <span className={`text-[11px] font-medium leading-tight truncate ${isCurrent ? 'text-white' : 'text-[#142238]'}`}>
                    {stage.shortLabel}
                  </span>
                  <span className={`text-[9px] font-mono leading-none ${isCurrent ? 'text-[#2DBDCA]' : 'text-[#53657A]'}`}>
                    {status}
                  </span>
                </div>
              </button>

              {idx < STAGES.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-0.5 rounded-full transition-colors ${
                    status === 'COMPLETE' ? 'bg-[#1FA463]/40' : 'bg-[#D9E1E6]'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};
