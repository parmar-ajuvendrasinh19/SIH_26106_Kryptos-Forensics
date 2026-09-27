import React from 'react';
import { StageId, StageStatus } from '../types';
import { ChevronLeft, ChevronRight, Play, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface StageControllerProps {
  currentStage: StageId;
  stageStatuses: Record<StageId, StageStatus>;
  isRunning: boolean;
  onRunStage: (stageId: StageId) => void;
  onNavigate: (direction: 'PREV' | 'NEXT') => void;
  onReset: () => void;
  dependencyNotice?: string | null;
}

const STAGE_SEQUENCE: StageId[] = [
  '01_INTAKE',
  '02_PARSER',
  '03_AUTHENTICATION',
  '04_IOC',
  '05_INTELLIGENCE',
  '06_CONTENT_ANALYSIS',
  '07_TECHNICAL_ANALYSIS',
  '08_FUSION',
  '09_ORIGIN',
  '10_GRAPH',
  '11_CAMPAIGN',
  '12_REPORT',
];

const STAGE_TITLES: Record<StageId, { title: string; subtitle: string }> = {
  '01_INTAKE': { title: 'Evidence Intake', subtitle: 'Ingest raw .eml artifact and calculate cryptographic hash' },
  '02_PARSER': { title: 'Email Parser', subtitle: 'RFC 5322 header unfolding, MIME extraction, and structural normalization' },
  '03_AUTHENTICATION': { title: 'Authentication Evaluator', subtitle: 'Forensic evaluation of SPF, DKIM, DMARC, and domain alignment' },
  '04_IOC': { title: 'IOC Extraction', subtitle: 'Extraction of IPv4, IPv6, domains, URLs, hashes, and message identifiers' },
  '05_INTELLIGENCE': { title: 'Threat Intelligence', subtitle: 'Live RDAP domain history, reverse DNS, and structural URL telemetry' },
  '06_CONTENT_ANALYSIS': { title: 'Content Analysis (Model A)', subtitle: 'Prototype deterministic language engine detecting urgency and pretexts' },
  '07_TECHNICAL_ANALYSIS': { title: 'Technical Threat (Model B)', subtitle: 'Evaluation of observed technical features and routing discrepancies' },
  '08_FUSION': { title: 'Evidence Fusion', subtitle: 'Transparent mathematical fusion of content and technical threat vectors' },
  '09_ORIGIN': { title: 'Origin Trace & Geolocation', subtitle: 'Hop-by-hop Received header reconstruction and earliest relay identification' },
  '10_GRAPH': { title: 'Threat Graph & Entity Correlation', subtitle: 'Interactive entity-relationship network mapping infrastructure associations' },
  '11_CAMPAIGN': { title: 'Campaign Correlation', subtitle: 'Evidence-based cross-referencing of shared indicators and infrastructure' },
  '12_REPORT': { title: 'Forensic Findings & Report', subtitle: 'Audit-ready forensic intelligence report with cryptographic chain of custody' },
};

export const StageController: React.FC<StageControllerProps> = ({
  currentStage,
  stageStatuses,
  isRunning,
  onRunStage,
  onNavigate,
  onReset,
  dependencyNotice,
}) => {
  const currentIndex = STAGE_SEQUENCE.indexOf(currentStage);
  const currentStatus = stageStatuses[currentStage];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < STAGE_SEQUENCE.length - 1 && stageStatuses[STAGE_SEQUENCE[currentIndex + 1]] !== 'LOCKED';
  const stageInfo = STAGE_TITLES[currentStage];

  return (
    <div className="bg-white border-t border-[#D9E1E6] px-4 py-2.5 shrink-0 select-none shadow-xs">
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Current Stage Context & Dependency alerts */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#2DBDCA] bg-[#142238] px-2 py-0.5 rounded">
              STAGE {currentIndex + 1 < 10 ? `0${currentIndex + 1}` : currentIndex + 1}/12
            </span>
            <div>
              <div className="text-sm font-bold text-[#142238] leading-tight flex items-center gap-2">
                {stageInfo.title}
                {currentStatus === 'COMPLETE' && (
                  <span className="text-[10px] text-[#1FA463] font-semibold flex items-center gap-0.5">
                    <CheckCircle className="w-3 h-3" /> Executed
                  </span>
                )}
              </div>
              <p className="text-xs text-[#53657A] truncate max-w-[420px]">{stageInfo.subtitle}</p>
            </div>
          </div>

          {dependencyNotice && (
            <div className="flex items-center gap-1.5 text-xs text-[#D89428] bg-[#D89428]/10 px-2.5 py-1 rounded border border-[#D89428]/30 ml-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{dependencyNotice}</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => onNavigate('PREV')}
            disabled={!canGoPrev || isRunning}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-[#D9E1E6] text-[#142238] bg-white hover:bg-[#F5F6F4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {currentStatus !== 'COMPLETE' && (
            <button
              type="button"
              onClick={() => onRunStage(currentStage)}
              disabled={isRunning || currentStatus === 'LOCKED'}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md bg-[#142238] text-white hover:bg-[#1f3556] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2DBDCA]" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-[#2DBDCA] fill-[#2DBDCA]" />
                  <span>Run Stage</span>
                </>
              )}
            </button>
          )}

          {currentStatus === 'COMPLETE' && (
            <button
              type="button"
              onClick={() => onRunStage(currentStage)}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-[#D9E1E6] text-[#53657A] bg-white hover:bg-[#F5F6F4] disabled:opacity-40 transition-colors"
              title="Re-run this analytical stage"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-run</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('NEXT')}
            disabled={!canGoNext || isRunning}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#2DBDCA] text-[#142238] hover:bg-[#28b2be] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
          >
            <span>Next Stage</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
