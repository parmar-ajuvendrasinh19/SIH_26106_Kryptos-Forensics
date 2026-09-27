import React from 'react';
import { Target, Shield, ArrowRight, CheckCircle2, AlertTriangle, Layers, Fingerprint, Network, FileSearch } from 'lucide-react';
import { InvestigationState } from '../../types';

interface Stage11CampaignProps {
  state: InvestigationState;
  onProceedToReport: () => void;
}

export const Stage11Campaign: React.FC<Stage11CampaignProps> = ({
  state,
  onProceedToReport,
}) => {
  const fusion = state.fusion;
  const parsed = state.parsedEmail;
  const content = state.contentAnalysis;
  const auth = state.authentication;
  const tech = state.technicalAnalysis;
  const iocs = state.iocs;

  // Determine campaign type based on ground-truth signals
  const isPhish = content?.findings.some(
    (f) => f.category === 'Credential Request' || f.category === 'Account Verification'
  );
  const isBec = content?.findings.some(
    (f) => f.category === 'Payment / Wire' || f.category === 'Impersonation'
  );
  const hasMaliciousAttachment = tech?.features.some(
    (f) => f.feature === 'ATTACHMENT_RISK' && f.weight > 0
  );
  const isLegitimate = fusion?.verdict === 'LOW_EVIDENCE_OF_THREAT';

  let threatPattern = 'Unclassified Forensic Pattern';
  let threatDescription = 'Insufficient characteristic signals observed to classify high-order attack pattern.';
  let modality = 'Standard Mail Relay';

  if (isLegitimate) {
    threatPattern = 'Legitimate Organization Communication';
    threatDescription = 'Observed headers, cryptographic authentication, and body content match baseline institutional communication patterns with no deceptive markers.';
    modality = 'Authenticated Routine Correspondence';
  } else if (isBec) {
    threatPattern = 'Business Email Compromise (BEC) / Financial Redirection';
    threatDescription = 'Pretext involves executive instruction, urgent invoice fulfillment, or diversion of banking wires without cryptographic sender validation.';
    modality = 'Social Engineering & Identity Impersonation';
  } else if (isPhish) {
    threatPattern = 'Credential Harvesting Spearphishing';
    threatDescription = 'Linguistic pressure tactics designed to deceive recipient into authenticating against attacker-controlled external infrastructure.';
    modality = 'Deceptive Authentication Portal Lure';
  } else if (hasMaliciousAttachment) {
    threatPattern = 'Malicious Payload Delivery via Attachment';
    threatDescription = 'Transit vehicle carrying executable scripts, macro-enabled documents, or disguised archive structures.';
    modality = 'Endpoint Infiltration via MIME Payload';
  }

  // Corroborated Evidence Vectors
  const corroborationVectors = [
    {
      label: 'Authentication Verification',
      status: auth?.spf.status === 'FAIL' || auth?.dkim.status === 'FAIL' ? 'FAIL / SUSPICIOUS' : (auth?.spf.status === 'PASS' && auth?.dkim.status === 'PASS' ? 'PASS' : 'UNVERIFIED'),
      finding: auth ? `SPF: ${auth.spf.status}, DKIM: ${auth.dkim.status}, DMARC: ${auth.dmarc.status}` : 'No auth data',
      detail: auth?.alignment.status === 'DIFFERENT_DOMAINS' ? 'Sender header domain alignment mismatch detected.' : 'Sender envelope aligned with From header.',
      isAlert: auth?.spf.status === 'FAIL' || auth?.dkim.status === 'FAIL' || auth?.alignment.status === 'DIFFERENT_DOMAINS',
    },
    {
      label: 'Linguistic & Pretext Analysis',
      status: (content?.findings.length || 0) > 0 ? `${content?.findings.length} Triggers Observed` : 'Baseline Clean',
      finding: content?.findings.length ? content.findings.map((f) => f.category).slice(0, 3).join(', ') : 'No coercive or extortion markers detected',
      detail: content?.findings[0]?.quote ? `Primary sample quote: "${content.findings[0].quote}"` : 'Body tone within nominal operational baseline.',
      isAlert: (content?.findings.length || 0) > 0,
    },
    {
      label: 'Technical Header & Relay Integrity',
      status: (tech?.features.filter((f) => f.state === 'KNOWN' && f.weight > 0).length || 0) > 0 ? 'Anomalies Detected' : 'Nominal Infrastructure',
      finding: tech?.features.filter((f) => f.state === 'KNOWN' && f.weight > 0).map((f) => f.feature).slice(0, 2).join(', ') || 'No anomalous transport signals',
      detail: `Received hops: ${parsed?.receivedChain.length || 0} relay hops evaluated.`,
      isAlert: (tech?.features.filter((f) => f.state === 'KNOWN' && f.weight > 0).length || 0) > 0,
    },
    {
      label: 'Payload & External IOC Indicators',
      status: iocs.length > 0 ? `${iocs.length} Extracted Artifacts` : 'Zero Observed IOCs',
      finding: `${iocs.filter((i) => i.type === 'url').length} URLs, ${iocs.filter((i) => i.type === 'ipv4' || i.type === 'ipv6').length} IPs, ${parsed?.attachments.length || 0} attachments`,
      detail: parsed?.attachments.length ? `Attachments: ${parsed.attachments.map((a) => a.filename).join(', ')}` : 'No attached MIME payloads detected in message stream.',
      isAlert: hasMaliciousAttachment || iocs.some((i) => i.reputationStatus === 'SUSPICIOUS'),
    },
  ];

  return (
    <div className="h-full flex flex-col justify-between max-w-[1600px] mx-auto p-4 sm:p-6 gap-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#2DBDCA] uppercase tracking-wider">
              Stage 11 • Campaign & Threat Pattern Correlation
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#142238] tracking-tight">
            Campaign Pattern Correlation & Forensic Attribution
          </h2>
          <p className="text-xs sm:text-sm text-[#53657A] mt-0.5">
            Correlates verified forensic evidence into campaign typologies while maintaining strict admissibility boundaries.
          </p>
        </div>

        <button
          type="button"
          onClick={onProceedToReport}
          className="px-4 py-2 rounded-lg bg-[#2DBDCA] text-[#142238] font-bold text-xs hover:bg-[#28b2be] transition-colors flex items-center gap-2 shadow-xs"
        >
          <span>Proceed to Forensic Report</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
        {/* Left: Campaign Pattern Classification & Attribution Stance (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#D9E1E6] p-5 flex flex-col justify-between shadow-xs">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Attack Pattern Classification</span>
              <h3 className="text-base font-bold text-[#142238] mt-0.5">{threatPattern}</h3>
              <div className="mt-1">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#F5F6F4] text-[#142238] border border-[#D9E1E6]">
                  Modality: {modality}
                </span>
              </div>
            </div>

            <div className="bg-[#FAFBFB] p-3.5 rounded-lg border border-[#D9E1E6] text-xs leading-relaxed text-[#142238]">
              {threatDescription}
            </div>

            {/* Attribution Stance Box */}
            <div className="p-4 rounded-xl bg-[#F5F6F4] border border-[#D9E1E6] space-y-2">
              <div className="flex items-center gap-2 text-[#142238]">
                <Shield className="w-4 h-4 text-[#2DBDCA]" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Attribution Stance</h4>
              </div>
              <p className="text-xs text-[#53657A] leading-relaxed">
                <strong>Forensic Standard:</strong> Attribution to a named advanced persistent threat (APT) actor requires multi-tenant telemetry and external forensic corroboration. This single-artifact evaluation refrains from speculative threat actor labeling.
              </p>
            </div>

            {/* Campaign Pivot Signals */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Identified Pivot Vectors</span>
              <div className="bg-[#FAFBFB] p-3 rounded-lg border border-[#D9E1E6] font-mono text-[11px] space-y-1 text-[#142238]">
                <div>Subject: {parsed?.subject ? `"${parsed.subject}"` : '(none)'}</div>
                <div>Domain: {parsed?.from.domain || '(none)'}</div>
                <div>IOC Count: {iocs.length} extracted indicators</div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#D9E1E6] text-[11px] text-[#53657A] flex items-center justify-between">
            <span>Forensic Classification Standard</span>
            <span className="font-mono text-[#0e808c]">Evidence-Bound Sourcing</span>
          </div>
        </div>

        {/* Right: Multi-Vector Forensic Corroboration Matrix (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#D9E1E6] p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E1E6] mb-3">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-[#2DBDCA]" />
                <h3 className="text-xs font-bold text-[#142238] uppercase tracking-wider">
                  Cross-Vector Evidence Corroboration
                </h3>
              </div>
              <span className="text-[10px] text-[#53657A] font-mono">Forensic Ground-Truth</span>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[440px] pr-1">
              {corroborationVectors.map((v, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-lg border transition-colors ${
                    v.isAlert
                      ? 'bg-[#FAFBFB] border-[#D9E1E6] hover:border-[#2DBDCA]/60'
                      : 'bg-[#FAFBFB]/50 border-[#D9E1E6]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-xs text-[#142238]">{v.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        v.isAlert
                          ? 'bg-[#D94A4A]/15 text-[#D94A4A] border border-[#D94A4A]/30'
                          : 'bg-[#1FA463]/15 text-[#1FA463] border border-[#1FA463]/30'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>

                  <p className="text-xs text-[#142238] font-medium mt-1">{v.finding}</p>
                  <p className="text-[11px] text-[#53657A] leading-relaxed mt-0.5">{v.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#D9E1E6] text-[11px] text-[#53657A] flex items-center justify-between">
            <span>Conclusions bound strictly to verifiable artifact evidence</span>
            <span className="font-mono text-[#0e808c]">Zero Synthetic Claims</span>
          </div>
        </div>
      </div>
    </div>
  );
};
