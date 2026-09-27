import React from 'react';
import { Shield, FileText, CheckCircle2, AlertTriangle, RefreshCw, Play, Pause, Terminal, ExternalLink, Mic } from 'lucide-react';
import { InvestigationState } from '../types';

interface HeaderProps {
  state: InvestigationState;
  onReset: () => void;
  onToggleAutoplay: () => void;
  isAutoplayActive: boolean;
  onToggleAdvancedMode?: () => void;
  onOpenRawEvidence: () => void;
  onToggleVoiceAssistant: () => void;
  isVoiceAssistantOpen?: boolean;
  onOpenThreatLandscape?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  onReset,
  onToggleAutoplay,
  isAutoplayActive,
  onOpenRawEvidence,
  onToggleVoiceAssistant,
  isVoiceAssistantOpen = false,
  onOpenThreatLandscape,
}) => {
  const isComplete = state.stageStatuses['12_REPORT'] === 'COMPLETE';
  const hasFile = Boolean(state.file);

  return (
    <header className="bg-white border-b border-[#D9E1E6] px-4 py-2.5 select-none shrink-0">
      <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-[#142238]">KRYPTOS FORENSICS</h1>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-[#2DBDCA]/10 text-[#0e808c] border border-[#2DBDCA]/30">
                Workstation v2.6
              </span>
            </div>
            <p className="text-xs text-[#53657A] hidden sm:block">
              Deterministic Email Threat & Forensic Intelligence Platform
            </p>
          </div>
        </div>

        {/* Persistent Investigation Context Ribbon */}
        {hasFile && (
          <div className="flex items-center gap-2 sm:gap-4 bg-[#F5F6F4] px-3 py-1.5 rounded-lg border border-[#D9E1E6] text-xs">
            <div>
              <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Case</span>
              <span className="font-mono font-bold text-[#142238]">{state.caseId}</span>
            </div>
            <div className="h-5 w-px bg-[#D9E1E6]" />
            <div>
              <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Evidence</span>
              <span className="font-mono text-[#142238]">{state.evidenceId}</span>
            </div>
            <div className="h-5 w-px bg-[#D9E1E6] hidden md:block" />
            <div className="hidden md:block max-w-[200px] truncate">
              <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Artifact</span>
              <span className="font-mono text-[#142238] truncate block" title={state.file?.name}>
                {state.file?.name}
              </span>
            </div>
            <div className="h-5 w-px bg-[#D9E1E6]" />
            <div>
              <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Status</span>
              <span className="inline-flex items-center gap-1 font-medium">
                {isComplete ? (
                  <span className="text-[#1FA463] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Concluded
                  </span>
                ) : (
                  <span className="text-[#0e808c] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2DBDCA] animate-pulse" /> Active
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Global Action Controls */}
        <div className="flex items-center gap-2">
          {/* SIH AI Voice Assistant Button */}
          <button
            type="button"
            onClick={onToggleVoiceAssistant}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all shadow-xs ${
              isVoiceAssistantOpen
                ? 'bg-[#2DBDCA] text-[#142238] border border-[#2DBDCA]'
                : 'bg-[#142238] text-white border border-[#2DBDCA]/40 hover:border-[#2DBDCA] hover:bg-[#1f3556]'
            }`}
            title="SIH AI Voice Assistant (Gemini 3.8 Live API)"
          >
            <Mic className="w-3.5 h-3.5 text-[#2DBDCA] animate-pulse" />
            <span className="hidden sm:inline">SIH Voice AI</span>
            <span className="sm:hidden">Voice AI</span>
            <span className="px-1 py-0.2 text-[9px] font-mono bg-[#2DBDCA]/20 text-[#2DBDCA] rounded">
              LIVE
            </span>
          </button>

          {hasFile && (
            <>
              <button
                type="button"
                onClick={onOpenRawEvidence}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#142238] bg-white border border-[#D9E1E6] rounded-md hover:bg-[#F5F6F4] transition-colors"
                title="View Raw RFC 5322 Evidence"
              >
                <Terminal className="w-3.5 h-3.5 text-[#53657A]" />
                <span className="hidden sm:inline">Raw Evidence</span>
              </button>

              <button
                type="button"
                onClick={onToggleAutoplay}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  isAutoplayActive
                    ? 'bg-[#2DBDCA]/20 text-[#0e808c] border-[#2DBDCA]'
                    : 'bg-white text-[#53657A] border-[#D9E1E6] hover:bg-[#F5F6F4]'
                }`}
                title={isAutoplayActive ? 'Pause Autoplay' : 'Autoplay Investigation Pipeline (5s stages)'}
              >
                {isAutoplayActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isAutoplayActive ? 'Autoplay: ON' : 'Autoplay'}</span>
              </button>
            </>
          )}

          {hasFile && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#D94A4A] bg-white border border-[#D9E1E6] rounded-md hover:bg-red-50 hover:border-red-200 transition-colors"
              title="Reset current investigation and load new evidence"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Case</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
