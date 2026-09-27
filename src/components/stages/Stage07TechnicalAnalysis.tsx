import React from 'react';
import { Cpu, ShieldAlert, CheckCircle2, HelpCircle, ArrowRight, Table } from 'lucide-react';
import { InvestigationState } from '../../types';

interface Stage07TechnicalAnalysisProps {
  state: InvestigationState;
  isRunning: boolean;
  onRunTechnicalAnalysis: () => void;
  onProceedToFusion: () => void;
}

export const Stage07TechnicalAnalysis: React.FC<Stage07TechnicalAnalysisProps> = ({
  state,
  isRunning,
  onRunTechnicalAnalysis,
  onProceedToFusion,
}) => {
  const tech = state.technicalAnalysis;
  const isAnalyzed = Boolean(tech);

  return (
    <div className="h-full flex flex-col justify-between max-w-[1600px] mx-auto p-4 sm:p-6 gap-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#2DBDCA] uppercase tracking-wider">
              Stage 07 • Model B (Technical Threat Analysis)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#142238] tracking-tight">
            Technical Threat Feature Matrix
          </h2>
          <p className="text-xs sm:text-sm text-[#53657A] mt-0.5">
            Evaluates protocol-level features: authentication results, routing anomalies, payload risk, and domain registration tenure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!tech ? (
            <button
              type="button"
              onClick={onRunTechnicalAnalysis}
              disabled={isRunning}
              className="px-4 py-2 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors flex items-center gap-2 shadow-xs"
            >
              <Cpu className="w-4 h-4 text-[#2DBDCA]" />
              <span>{isRunning ? 'Evaluating Features...' : 'Run Technical Analysis'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onProceedToFusion}
              className="px-4 py-2 rounded-lg bg-[#2DBDCA] text-[#142238] font-bold text-xs hover:bg-[#28b2be] transition-colors flex items-center gap-2 shadow-xs"
            >
              <span>Proceed to Evidence Fusion</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!tech ? (
        <div className="bg-white rounded-xl border border-[#D9E1E6] p-12 text-center shadow-xs">
          <Cpu className="w-12 h-12 text-[#D9E1E6] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#142238]">Technical Feature Model Ready</h3>
          <p className="text-xs text-[#53657A] max-w-md mx-auto mt-1 mb-4">
            Compiles observed cryptographic, DNS, and header routing characteristics. Unverifiable states contribute zero risk.
          </p>
          <button
            type="button"
            onClick={onRunTechnicalAnalysis}
            disabled={isRunning}
            className="px-5 py-2.5 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors"
          >
            {isRunning ? 'Analyzing Features...' : 'Execute Model B'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
          {/* Left: Summary Metrics Card (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#D9E1E6] p-5 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Component Designation</span>
                <h3 className="text-sm font-bold text-[#142238]">Technical Threat Feature Model (Model B)</h3>
                <span className="text-[10px] font-mono text-[#53657A]">Deterministic Infrastructure Evaluator</span>
              </div>

              <div className="p-4 rounded-xl bg-[#F5F6F4] border border-[#D9E1E6] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Technical Risk Score</span>
                  <span className="text-2xl font-mono font-bold text-[#142238]">{tech.technicalScore}/100</span>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${
                      tech.riskLevel === 'HIGH'
                        ? 'bg-[#D94A4A]/15 text-[#D94A4A] border border-[#D94A4A]/30'
                        : tech.riskLevel === 'MEDIUM'
                        ? 'bg-[#D89428]/15 text-[#D89428] border border-[#D89428]/30'
                        : 'bg-[#1FA463]/15 text-[#1FA463] border border-[#1FA463]/30'
                    }`}
                  >
                    {tech.riskLevel} RISK
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Feature Synthesis</span>
                <p className="text-[#142238] leading-relaxed bg-[#FAFBFB] p-3 rounded-lg border border-[#D9E1E6]">
                  {tech.explanation}
                </p>
              </div>

              <div className="space-y-1.5 text-xs pt-2">
                <div className="flex justify-between text-[#53657A]">
                  <span>Known Features:</span>
                  <span className="font-bold text-[#142238]">
                    {tech.features.filter((f) => f.state === 'KNOWN').length} of {tech.features.length}
                  </span>
                </div>
                <div className="flex justify-between text-[#53657A]">
                  <span>Unknown / Unverifiable:</span>
                  <span className="font-mono text-[#53657A]">
                    {tech.features.filter((f) => f.state === 'UNKNOWN').length} (Weight: 0)
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#D9E1E6] text-[11px] text-[#53657A]">
              <span>Absolute Rule: Unknown signals contribute ZERO weight to technical scoring.</span>
            </div>
          </div>

          {/* Right: Technical Features Table (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#D9E1E6] flex flex-col justify-between overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-[#D9E1E6] bg-[#F5F6F4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-[#2DBDCA]" />
                <h3 className="text-xs font-bold text-[#142238] uppercase tracking-wider">
                  Observed Technical Features
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#53657A]">Truth-Preserving Representation</span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[440px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAFBFB] text-[#53657A] uppercase text-[10px] tracking-wider font-semibold sticky top-0 border-b border-[#D9E1E6]">
                  <tr>
                    <th className="py-2.5 px-4">Feature</th>
                    <th className="py-2.5 px-4">State</th>
                    <th className="py-2.5 px-4">Observed Value</th>
                    <th className="py-2.5 px-4">Interpretation</th>
                    <th className="py-2.5 px-4 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9E1E6]/60">
                  {tech.features.map((feat) => (
                    <tr key={feat.id} className="hover:bg-[#FAFBFB] transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-[#142238] whitespace-nowrap">
                        {feat.feature}
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            feat.state === 'KNOWN'
                              ? 'bg-[#142238] text-white'
                              : 'bg-[#E5E9EC] text-[#53657A]'
                          }`}
                        >
                          {feat.state}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 font-mono text-[11px] text-[#142238] max-w-[200px] break-all">
                        {feat.value}
                      </td>

                      <td className="py-2.5 px-4 text-[#53657A] text-[11px] max-w-[240px]">
                        {feat.interpretation}
                      </td>

                      <td className="py-2.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        {feat.state === 'KNOWN' && feat.weight > 0 ? (
                          <span className="text-[#0e808c]">+{feat.weight}</span>
                        ) : (
                          <span className="text-[#8695A6]">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#F5F6F4] border-t border-[#D9E1E6] text-[11px] text-[#53657A] flex items-center justify-between">
              <span>Feed: Model B outputs pass into Evidence Fusion engine</span>
              <span className="font-mono text-[#0e808c]">Zero Synthetic Penalties</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
