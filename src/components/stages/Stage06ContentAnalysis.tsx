import React from 'react';
import { BookOpen, AlertTriangle, ShieldCheck, HelpCircle, ArrowRight, CheckCircle2, Quote } from 'lucide-react';
import { InvestigationState, ContentFinding } from '../../types';

interface Stage06ContentAnalysisProps {
  state: InvestigationState;
  isRunning: boolean;
  onRunContentAnalysis: () => void;
  onOpenWhyModal: (finding: ContentFinding) => void;
  onProceedToTechnical: () => void;
}

export const Stage06ContentAnalysis: React.FC<Stage06ContentAnalysisProps> = ({
  state,
  isRunning,
  onRunContentAnalysis,
  onOpenWhyModal,
  onProceedToTechnical,
}) => {
  const content = state.contentAnalysis;
  const isAnalyzed = Boolean(content);

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-[#D94A4A]/15 text-[#D94A4A] border border-[#D94A4A]/30">
            <AlertTriangle className="w-3.5 h-3.5" /> HIGH RISK
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-[#D89428]/15 text-[#D89428] border border-[#D89428]/30">
            <AlertTriangle className="w-3.5 h-3.5" /> MEDIUM RISK
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-[#1FA463]/15 text-[#1FA463] border border-[#1FA463]/30">
            <ShieldCheck className="w-3.5 h-3.5" /> LOW RISK
          </span>
        );
    }
  };

  return (
    <div className="h-full flex flex-col justify-between max-w-[1600px] mx-auto p-4 sm:p-6 gap-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#2DBDCA] uppercase tracking-wider">
              Stage 06 • Model A (Email Content Analysis)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#142238] tracking-tight">
            Deterministic Linguistic Threat Analysis
          </h2>
          <p className="text-xs sm:text-sm text-[#53657A] mt-0.5">
            Analyzes subject and body for urgency signals, credential harvesting prompts, and executive pretexting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!content ? (
            <button
              type="button"
              onClick={onRunContentAnalysis}
              disabled={isRunning}
              className="px-4 py-2 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors flex items-center gap-2 shadow-xs"
            >
              <BookOpen className="w-4 h-4 text-[#2DBDCA]" />
              <span>{isRunning ? 'Analyzing Text...' : 'Run Content Analysis'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onProceedToTechnical}
              className="px-4 py-2 rounded-lg bg-[#2DBDCA] text-[#142238] font-bold text-xs hover:bg-[#28b2be] transition-colors flex items-center gap-2 shadow-xs"
            >
              <span>Proceed to Technical Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!content ? (
        <div className="bg-white rounded-xl border border-[#D9E1E6] p-12 text-center shadow-xs">
          <BookOpen className="w-12 h-12 text-[#D9E1E6] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#142238]">Content Model Standing By</h3>
          <p className="text-xs text-[#53657A] max-w-md mx-auto mt-1 mb-4">
            Executes explainable linguistic rules across subject lines, plain text body, and HTML markup.
          </p>
          <button
            type="button"
            onClick={onRunContentAnalysis}
            disabled={isRunning}
            className="px-5 py-2.5 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors"
          >
            {isRunning ? 'Analyzing Content...' : 'Execute Model A'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
          {/* Left: Summary Metrics & Architecture Card (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#D9E1E6] p-5 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Component Designation</span>
                <h3 className="text-sm font-bold text-[#142238]">{content.modelName}</h3>
                <span className="text-[10px] font-mono text-[#53657A]">{content.modelVersion}</span>
              </div>

              <div className="p-4 rounded-xl bg-[#F5F6F4] border border-[#D9E1E6] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Content Risk Score</span>
                  <span className="text-2xl font-mono font-bold text-[#142238]">{content.contentScore}/100</span>
                </div>
                <div>{getRiskBadge(content.riskLevel)}</div>
              </div>

              <div className="space-y-2 text-xs">
                <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Assessment Summary</span>
                <p className="text-[#142238] leading-relaxed bg-[#FAFBFB] p-3 rounded-lg border border-[#D9E1E6]">
                  {content.explanation}
                </p>
              </div>

              <div className="space-y-1.5 text-xs pt-2">
                <div className="flex justify-between text-[#53657A]">
                  <span>Observed Signals:</span>
                  <span className="font-bold text-[#142238]">{content.findings.length}</span>
                </div>
                <div className="flex justify-between text-[#53657A]">
                  <span>Signal Weight Sum:</span>
                  <span className="font-mono text-[#142238]">+{content.contentScore}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#D9E1E6] text-[11px] text-[#53657A]">
              <span>Transparency Rule: Every signal links to an exact text quote from the email body.</span>
            </div>
          </div>

          {/* Right: Findings List (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#D9E1E6] p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#D9E1E6] mb-3">
                <div className="flex items-center gap-2">
                  <Quote className="w-4 h-4 text-[#2DBDCA]" />
                  <h3 className="text-xs font-bold text-[#142238] uppercase tracking-wider">
                    Linguistic Signals Detected ({content.findings.length})
                  </h3>
                </div>
                <span className="text-[10px] text-[#53657A] font-mono">Evidence-backed findings</span>
              </div>

              {content.findings.length === 0 ? (
                <div className="py-16 text-center text-[#53657A]">
                  <CheckCircle2 className="w-12 h-12 text-[#1FA463] mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-[#142238]">Zero Suspicious Linguistic Signals</h4>
                  <p className="text-xs max-w-sm mx-auto mt-1">
                    No artificial urgency, password requests, payment redirects, or executive impersonation patterns were observed in this email.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[440px] pr-1">
                  {content.findings.map((f) => (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-lg border border-[#D9E1E6] bg-[#FAFBFB] hover:bg-white transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#142238] text-white">
                            {f.category}
                          </span>
                          <span className="text-[10px] text-[#53657A] font-medium">Location: {f.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#0e808c]">+{f.weight} pts</span>
                          <button
                            type="button"
                            onClick={() => onOpenWhyModal(f)}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold text-[#142238] bg-white border border-[#D9E1E6] hover:bg-[#F5F6F4] transition-colors"
                          >
                            Why?
                          </button>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded border border-[#D9E1E6]/80 text-xs font-mono text-[#142238] italic my-2">
                        "{f.quote}"
                      </div>

                      <p className="text-xs text-[#53657A] leading-relaxed">{f.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#D9E1E6] text-[11px] text-[#53657A] flex items-center justify-between">
              <span>Model A output provides structured input for Evidence Fusion.</span>
              <span className="font-mono text-[#0e808c]">Ground-Truth Sourced</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
