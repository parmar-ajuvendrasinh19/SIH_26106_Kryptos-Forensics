import React, { useState } from 'react';
import { GitMerge, ShieldCheck, AlertTriangle, HelpCircle, ArrowRight, CheckCircle2, ChevronRight, Calculator, ListPlus, Clock, Layers } from 'lucide-react';
import { InvestigationState } from '../../types';
import { ThreatTimeline } from './ThreatTimeline';

interface Stage08FusionProps {
  state: InvestigationState;
  isRunning: boolean;
  onRunFusion: () => void;
  onProceedToOrigin: () => void;
}

export const Stage08Fusion: React.FC<Stage08FusionProps> = ({
  state,
  isRunning,
  onRunFusion,
  onProceedToOrigin,
}) => {
  const fusion = state.fusion;
  const isFused = Boolean(fusion);
  const [viewMode, setViewMode] = useState<'TIMELINE' | 'FUSION'>('TIMELINE');
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'HIGH_CONFIDENCE_THREAT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#D94A4A]/15 text-[#D94A4A] border border-[#D94A4A]/30">
            <AlertTriangle className="w-4 h-4" /> HIGH THREAT EVIDENCE
          </span>
        );
      case 'ELEVATED_RISK_DETECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#D89428]/15 text-[#D89428] border border-[#D89428]/30">
            <AlertTriangle className="w-4 h-4" /> ELEVATED RISK SIGNALS
          </span>
        );
      case 'LOW_EVIDENCE_OF_THREAT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1FA463]/15 text-[#1FA463] border border-[#1FA463]/30">
            <ShieldCheck className="w-4 h-4" /> LOW EVIDENCE OF THREAT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#53657A]/15 text-[#53657A] border border-[#53657A]/30">
            <HelpCircle className="w-4 h-4" /> INSUFFICIENT EVIDENCE
          </span>
        );
    }
  };

  return (
    <div className="h-full flex flex-col justify-between max-w-[1600px] mx-auto p-4 sm:p-6 gap-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#2DBDCA] uppercase tracking-wider">
              Stage 08 • Multi-Vector Evidence Fusion
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#142238] tracking-tight">
            Evidence Fusion & Threat Timeline
          </h2>
          <p className="text-xs sm:text-sm text-[#53657A] mt-0.5">
            Maps the email delivery chain and IOC activations against a timestamped sequence, fused with joint mathematical risk models.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-white p-1 rounded-lg border border-[#D9E1E6] text-xs font-semibold shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('TIMELINE')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'TIMELINE'
                  ? 'bg-[#142238] text-white font-bold shadow-xs'
                  : 'text-[#53657A] hover:text-[#142238]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#2DBDCA]" />
              <span>Threat Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('FUSION')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'FUSION'
                  ? 'bg-[#142238] text-white font-bold shadow-xs'
                  : 'text-[#53657A] hover:text-[#142238]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Fusion Synthesis</span>
            </button>
          </div>

          {!fusion ? (
            <button
              type="button"
              onClick={onRunFusion}
              disabled={isRunning}
              className="px-4 py-2 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors flex items-center gap-2 shadow-xs"
            >
              <GitMerge className="w-4 h-4 text-[#2DBDCA]" />
              <span>{isRunning ? 'Computing Fusion...' : 'Run Evidence Fusion'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onProceedToOrigin}
              className="px-4 py-2 rounded-lg bg-[#2DBDCA] text-[#142238] font-bold text-xs hover:bg-[#28b2be] transition-colors flex items-center gap-2 shadow-xs"
            >
              <span>Proceed to Origin Trace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'TIMELINE' ? (
        <div className="flex-1 min-h-[520px]">
          <ThreatTimeline state={state} />
        </div>
      ) : !fusion ? (
        <div className="bg-white rounded-xl border border-[#D9E1E6] p-12 text-center shadow-xs flex-1 flex flex-col items-center justify-center">
          <GitMerge className="w-12 h-12 text-[#D9E1E6] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#142238]">Fusion Engine Standing By</h3>
          <p className="text-xs text-[#53657A] max-w-md mx-auto mt-1 mb-4">
            Combines verified signals from Model A and Model B without inventing probabilities.
          </p>
          <button
            type="button"
            onClick={onRunFusion}
            disabled={isRunning}
            className="px-5 py-2.5 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors"
          >
            {isRunning ? 'Fusing Evidence...' : 'Execute Evidence Fusion'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
          {/* Left: Mathematical Fusion Synthesis & Formula (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-[#D9E1E6] p-5 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#D9E1E6]">
                <div>
                  <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Fused Threat Verdict</span>
                  <span className="text-sm font-bold text-[#142238]">Forensic Assessment</span>
                </div>
                <div>{getVerdictBadge(fusion.verdict)}</div>
              </div>

              {/* Fused Score Highlight */}
              <div className="p-4 rounded-xl bg-[#F5F6F4] border border-[#D9E1E6] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Joint Evidence Index</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-mono font-bold text-[#142238]">{fusion.fusedScore}</span>
                    <span className="text-xs text-[#53657A] font-mono">/ 100</span>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="text-[10px] text-[#53657A] uppercase font-semibold">Inputs Received</div>
                  <span className="font-mono text-[#142238] font-medium block">
                    Content: {Math.round(fusion.contentRisk * 100)}%
                  </span>
                  <span className="font-mono text-[#142238] font-medium block">
                    Technical: {Math.round(fusion.technicalRisk * 100)}%
                  </span>
                </div>
              </div>

              {/* Transparent Formula Box */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] text-[#53657A] uppercase font-semibold flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5 text-[#2DBDCA]" />
                  <span>Mathematical Proof & Formula</span>
                </span>
                <div className="bg-[#FAFBFB] p-3 rounded-lg border border-[#D9E1E6] font-mono text-[11px] text-[#142238] leading-relaxed">
                  <div className="text-[#0e808c] font-bold mb-1">{fusion.formulaUsed}</div>
                  <div className="text-[#53657A] text-[10px]">
                    fusedRisk = 1 - ((1 - {fusion.contentRisk}) × (1 - {fusion.technicalRisk})) = {fusion.fusedRisk}
                  </div>
                </div>
              </div>

              {/* Forensic Explanation */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Analytical Assessment</span>
                <p className="text-[#142238] leading-relaxed bg-[#FAFBFB] p-3 rounded-lg border border-[#D9E1E6]">
                  {fusion.explanation}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#D9E1E6] text-[11px] text-[#53657A] flex items-center justify-between">
              <span>Auditable: Deterministic Joint Probability Fusion</span>
              <span className="font-mono text-[#0e808c]">Zero Randomization</span>
            </div>
          </div>

          {/* Right: Observed Signals Breakdown ("WHY?" Table) (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#D9E1E6] p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#D9E1E6] mb-3">
                <div className="flex items-center gap-2">
                  <ListPlus className="w-4 h-4 text-[#2DBDCA]" />
                  <h3 className="text-xs font-bold text-[#142238] uppercase tracking-wider">
                    Evidence Factor Contributions ({fusion.whyBreakdown.length})
                  </h3>
                </div>
                <span className="text-[10px] text-[#53657A] font-mono">Provenance Mapped</span>
              </div>

              {fusion.whyBreakdown.length === 0 ? (
                <div className="py-16 text-center text-[#53657A]">
                  <CheckCircle2 className="w-12 h-12 text-[#1FA463] mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-[#142238]">No Malicious Indicators Contributed</h4>
                  <p className="text-xs max-w-sm mx-auto mt-1">
                    Both content and technical models recorded nominal baselines. No risk weights were accrued.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 overflow-y-auto max-h-[440px] pr-1">
                  {fusion.whyBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-[#D9E1E6] bg-[#FAFBFB] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-[#142238]">{item.factor}</span>
                          <span className="font-mono text-[10px] font-bold text-[#0e808c] px-1.5 py-0.2 rounded bg-white border border-[#D9E1E6]">
                            {item.contribution}
                          </span>
                        </div>
                        <div className="text-[#53657A] text-[11px] truncate block" title={item.evidence}>
                          Evidence: <span className="font-mono text-[#142238] font-medium">{item.evidence}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-[10px] font-mono text-[#53657A] block truncate max-w-[200px]" title={item.source}>
                          {item.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#D9E1E6] text-[11px] text-[#53657A] flex items-center justify-between">
              <span>Investigation state stores full formula and individual factor proofs.</span>
              <span className="font-mono text-[#0e808c]">Reproducible State</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
