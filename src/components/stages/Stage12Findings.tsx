import React, { useState } from 'react';
import { FileCheck2, Download, Printer, Copy, Check, ShieldCheck, AlertTriangle, HelpCircle, FileText, CheckCircle2, FileDown, Loader2, Compass } from 'lucide-react';
import { InvestigationState } from '../../types';
import { generateForensicDocketJson, generateForensicTextReport } from '../../services/forensicFindings';
import { downloadForensicPdfReport } from '../../services/pdfReportGenerator';
import { RiskBreakdownRadar } from './RiskBreakdownRadar';

interface Stage12FindingsProps {
  state: InvestigationState;
}

export const Stage12Findings: React.FC<Stage12FindingsProps> = ({ state }) => {
  const [copiedDocket, setCopiedDocket] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'RISK_BREAKDOWN' | 'EVIDENCE' | 'CUSTODY' | 'JSON'>('SUMMARY');

  const fusion = state.fusion;
  const parsed = state.parsedEmail;
  const auth = state.authentication;

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      downloadForensicPdfReport(state);
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadJson = () => {
    const jsonStr = generateForensicDocketJson(state);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kryptos-forensic-docket-${state.caseId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadText = () => {
    const textStr = generateForensicTextReport(state);
    const blob = new Blob([textStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kryptos-forensic-report-${state.caseId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    const jsonStr = generateForensicDocketJson(state);
    navigator.clipboard.writeText(jsonStr);
    setCopiedDocket(true);
    setTimeout(() => setCopiedDocket(false), 2000);
  };

  return (
    <div className="h-full flex flex-col justify-between max-w-[1600px] mx-auto p-4 sm:p-6 gap-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#2DBDCA] uppercase tracking-wider">
              Stage 12 • Final Forensic Findings
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#142238] tracking-tight">
            Comprehensive Forensic Investigation Report
          </h2>
          <p className="text-xs sm:text-sm text-[#53657A] mt-0.5">
            Cryptographically sealed findings docket. Every conclusion traces back to ground-truth email lines.
          </p>
        </div>

        {/* Export Toolbar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadText}
            className="px-3 py-1.5 rounded-lg bg-white border border-[#D9E1E6] text-[#142238] font-bold text-xs hover:bg-[#F5F6F4] transition-colors flex items-center gap-1.5 shadow-xs"
            title="Download plain-text technical forensic report"
          >
            <FileText className="w-4 h-4 text-[#53657A]" />
            <span className="hidden sm:inline">Text Report</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            className="px-3 py-1.5 rounded-lg bg-white border border-[#D9E1E6] text-[#142238] font-bold text-xs hover:bg-[#F5F6F4] transition-colors flex items-center gap-1.5 shadow-xs"
            title="Export complete structured forensic docket in JSON format"
          >
            <Download className="w-4 h-4 text-[#53657A]" />
            <span className="hidden sm:inline">JSON Docket</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-4 py-1.5 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors flex items-center gap-2 shadow-xs disabled:opacity-75"
            title="Generate and download official PDF forensic report"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 text-[#2DBDCA] animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-[#2DBDCA]" />
                <span>Download Report</span>
                <span className="px-1.5 py-0.2 bg-[#2DBDCA]/20 text-[#2DBDCA] rounded text-[10px] font-mono uppercase">
                  PDF
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Report Container */}
      <div className="bg-white rounded-xl border border-[#D9E1E6] flex flex-col flex-1 overflow-hidden shadow-xs">
        {/* Document Header Metadata Bar */}
        <div className="p-4 bg-[#F5F6F4] border-b border-[#D9E1E6] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Case Reference</span>
              <span className="font-mono font-bold text-[#142238]">{state.caseId}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Evidence Artifact</span>
              <span className="font-mono font-bold text-[#142238]">{state.evidenceId}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Artifact SHA-256</span>
              <span className="font-mono text-[11px] text-[#142238] truncate block max-w-[200px]" title={state.file?.sha256}>
                {state.file?.sha256 || 'Pending'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                fusion?.verdict === 'HIGH_CONFIDENCE_THREAT'
                  ? 'bg-[#D94A4A]/15 text-[#D94A4A] border border-[#D94A4A]/30'
                  : fusion?.verdict === 'ELEVATED_RISK_DETECTED'
                  ? 'bg-[#D89428]/15 text-[#D89428] border border-[#D89428]/30'
                  : 'bg-[#1FA463]/15 text-[#1FA463] border border-[#1FA463]/30'
              }`}
            >
              {fusion?.verdict ? fusion.verdict.replace(/_/g, ' ') : 'PENDING'}
            </span>
          </div>
        </div>

        {/* Report Tab Bar */}
        <div className="px-4 border-b border-[#D9E1E6] bg-white flex items-center gap-4 text-xs font-semibold overflow-x-auto">
          {[
            { key: 'SUMMARY', label: 'Executive Summary' },
            { key: 'RISK_BREAKDOWN', label: 'Risk Breakdown Radar' },
            { key: 'EVIDENCE', label: 'Evidence Matrix' },
            { key: 'CUSTODY', label: 'Chain of Custody' },
            { key: 'JSON', label: 'Raw Docket JSON' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-[#2DBDCA] text-[#142238] font-bold'
                  : 'border-transparent text-[#53657A] hover:text-[#142238]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Display */}
        <div className="p-5 overflow-y-auto max-h-[520px] flex-1">
          {activeTab === 'SUMMARY' && (
            <div className="space-y-5 max-w-5xl text-xs">
              <div>
                <h3 className="text-sm font-bold text-[#142238] uppercase tracking-wider mb-1">
                  1. Executive Investigation Brief
                </h3>
                <p className="text-[#142238] leading-relaxed bg-[#FAFBFB] p-3.5 rounded-lg border border-[#D9E1E6]">
                  {fusion?.explanation || 'Investigation pipeline is currently processing evidence.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-[#F5F6F4] rounded-lg border border-[#D9E1E6]">
                  <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Joint Evidence Index</span>
                  <span className="text-2xl font-mono font-bold text-[#142238]">{fusion?.fusedScore ?? '--'}/100</span>
                </div>
                <div className="p-3 bg-[#F5F6F4] rounded-lg border border-[#D9E1E6]">
                  <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Model A (Linguistic)</span>
                  <span className="text-2xl font-mono font-bold text-[#142238]">{state.contentAnalysis?.contentScore ?? '--'}/100</span>
                </div>
                <div className="p-3 bg-[#F5F6F4] rounded-lg border border-[#D9E1E6]">
                  <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Model B (Technical)</span>
                  <span className="text-2xl font-mono font-bold text-[#142238]">{state.technicalAnalysis?.technicalScore ?? '--'}/100</span>
                </div>
              </div>

              {/* Threat Risk Breakdown Radar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#142238] uppercase tracking-wider">
                    2. Threat Vector Risk Breakdown
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('RISK_BREAKDOWN')}
                    className="text-[11px] font-bold text-[#0e808c] hover:underline flex items-center gap-1"
                  >
                    <span>Inspect Radar Telemetry</span>
                    <span>&rarr;</span>
                  </button>
                </div>
                <RiskBreakdownRadar state={state} />
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#142238] uppercase tracking-wider mb-2">
                  3. Core Evidence Findings
                </h4>
                <div className="space-y-2">
                  {state.fusion?.whyBreakdown.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-[#FAFBFB] rounded border border-[#D9E1E6] flex justify-between items-center">
                      <div>
                        <span className="font-bold text-[#142238] mr-2">{item.factor}:</span>
                        <span className="text-[#53657A] font-mono text-[11px]">{item.evidence}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#0e808c]">{item.contribution}</span>
                    </div>
                  ))}
                  {(!state.fusion?.whyBreakdown || state.fusion.whyBreakdown.length === 0) && (
                    <div className="p-3 bg-[#FAFBFB] rounded border border-[#D9E1E6] text-[#53657A]">
                      No malicious factors observed. Artifact evaluated within clean baseline tolerances.
                    </div>
                  )}
                </div>
              </div>

              {/* PDF Report Quick Action Card */}
              <div className="p-4 bg-gradient-to-r from-[#F5F6F4] to-[#FAFBFB] rounded-lg border border-[#D9E1E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#142238]">Formal Forensic Investigation PDF</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#142238] text-[#2DBDCA]">
                      CASE {state.caseId}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#53657A]">
                    Includes complete evidence metadata, cryptographic hash validation, authentication results, and forensic verdict.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors flex items-center justify-center gap-2 shadow-xs shrink-0 disabled:opacity-75"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 text-[#2DBDCA] animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 text-[#2DBDCA]" />
                      <span>Download Report</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#142238] uppercase tracking-wider mb-1">
                  4. Forensic Integrity & Admissibility Note
                </h4>
                <p className="text-[11px] text-[#53657A] leading-relaxed bg-[#F5F6F4] p-3 rounded-lg border border-[#D9E1E6]">
                  This report was compiled strictly through deterministic parsers and cryptographic evaluations. The raw artifact hash is verified against all derivative claims. No synthetic indicators or speculative attributions were introduced.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'RISK_BREAKDOWN' && (
            <div className="space-y-5 max-w-5xl text-xs">
              <RiskBreakdownRadar state={state} />

              {/* Deep-Dive Methodology & Explanations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-white rounded-lg border border-[#D9E1E6] space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#0e808c] uppercase tracking-wider block">
                    Vector 1 • Authentication
                  </span>
                  <h5 className="font-bold text-xs text-[#142238]">Cryptographic Protocol Proofs</h5>
                  <p className="text-[11px] text-[#53657A] leading-relaxed">
                    Evaluates SPF authorization, DKIM RSA cryptographic signature headers, DMARC domain enforcement policies, and strict From/Return-Path header alignment.
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-lg border border-[#D9E1E6] space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#2DBDCA] uppercase tracking-wider block">
                    Vector 2 • Model A (Content)
                  </span>
                  <h5 className="font-bold text-xs text-[#142238]">Linguistic & Coercive Analysis</h5>
                  <p className="text-[11px] text-[#53657A] leading-relaxed">
                    Deterministic regex rules scan for social engineering triggers: artificial urgency, financial extortion, credential phishing, and executive authority claims.
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-lg border border-[#D9E1E6] space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#142238] uppercase tracking-wider block">
                    Vector 3 • Model B (Technical)
                  </span>
                  <h5 className="font-bold text-xs text-[#142238]">Technical & Infrastructure Telemetry</h5>
                  <p className="text-[11px] text-[#53657A] leading-relaxed">
                    Audits MIME types, executable attachment payloads, Received relay hop discrepancies, lookalike homograph domains, and suspicious link redirects.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'EVIDENCE' && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-xs font-bold text-[#142238] uppercase tracking-wider mb-2">
                  Extracted Indicators of Compromise ({state.iocs.length})
                </h4>
                <div className="border border-[#D9E1E6] rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#F5F6F4] text-[#53657A] uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Value</th>
                        <th className="py-2 px-3">Source Line</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9E1E6]/60 font-mono text-[11px]">
                      {state.iocs.slice(0, 10).map((ioc) => (
                        <tr key={ioc.id}>
                          <td className="py-1.5 px-3 uppercase text-[#53657A]">{ioc.type}</td>
                          <td className="py-1.5 px-3 font-bold text-[#142238] break-all">{ioc.value}</td>
                          <td className="py-1.5 px-3 text-[#53657A] truncate max-w-[200px]">{ioc.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#142238] uppercase tracking-wider mb-2">
                  Authentication Protocol Results
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center font-mono">
                  <div className="p-2.5 bg-[#FAFBFB] rounded border border-[#D9E1E6]">
                    <span className="text-[10px] text-[#53657A] block font-sans uppercase">SPF</span>
                    <span className="font-bold text-xs">{auth?.spf.status || 'UNVERIFIED'}</span>
                  </div>
                  <div className="p-2.5 bg-[#FAFBFB] rounded border border-[#D9E1E6]">
                    <span className="text-[10px] text-[#53657A] block font-sans uppercase">DKIM</span>
                    <span className="font-bold text-xs">{auth?.dkim.status || 'UNVERIFIED'}</span>
                  </div>
                  <div className="p-2.5 bg-[#FAFBFB] rounded border border-[#D9E1E6]">
                    <span className="text-[10px] text-[#53657A] block font-sans uppercase">DMARC</span>
                    <span className="font-bold text-xs">{auth?.dmarc.status || 'UNVERIFIED'}</span>
                  </div>
                  <div className="p-2.5 bg-[#FAFBFB] rounded border border-[#D9E1E6]">
                    <span className="text-[10px] text-[#53657A] block font-sans uppercase">Alignment</span>
                    <span className="font-bold text-xs">{auth?.alignment.status || 'UNVERIFIED'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CUSTODY' && (
            <div className="space-y-3 text-xs max-w-3xl">
              <h4 className="text-xs font-bold text-[#142238] uppercase tracking-wider mb-1">
                Cryptographic Chain of Custody Log
              </h4>
              <div className="divide-y divide-[#D9E1E6] border border-[#D9E1E6] rounded-lg bg-[#FAFBFB]">
                {state.chainOfCustody.map((entry) => (
                  <div key={entry.id} className="p-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-xs text-[#142238]">{entry.action}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#53657A] border border-[#D9E1E6]">
                          {entry.actor}
                        </span>
                      </div>
                      <p className="text-[#53657A] text-[11px]">{entry.details}</p>
                    </div>
                    <span className="text-[10px] font-mono text-[#53657A] shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'JSON' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#53657A]">Auditable Machine-Readable Forensic Docket</span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="text-xs font-mono text-[#0e808c] hover:underline flex items-center gap-1"
                >
                  {copiedDocket ? <Check className="w-3 h-3 text-[#1FA463]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDocket ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-3 bg-[#FAFBFB] rounded-lg border border-[#D9E1E6] font-mono text-[10px] text-[#142238] overflow-x-auto select-all max-h-[400px]">
                {generateForensicDocketJson(state)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#F5F6F4] border-t border-[#D9E1E6] text-[11px] text-[#53657A] flex items-center justify-between">
          <span>Official Forensic Report Output • Kryptos Forensics Engine</span>
          <span className="font-mono text-[#0e808c]">Sealed & Complete</span>
        </div>
      </div>
    </div>
  );
};
