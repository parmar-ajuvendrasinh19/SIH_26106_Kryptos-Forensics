import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, HelpCircle, AlertTriangle, Info, ArrowRight, ChevronRight, Lock, Key } from 'lucide-react';
import { InvestigationState } from '../../types';

interface Stage03AuthProps {
  state: InvestigationState;
  isRunning: boolean;
  onRunAuth: () => void;
  onProceedToIoc: () => void;
}

export const Stage03Auth: React.FC<Stage03AuthProps> = ({
  state,
  isRunning,
  onRunAuth,
  onProceedToIoc,
}) => {
  const auth = state.authentication;
  const isEvaluated = Boolean(auth);
  const [selectedCheck, setSelectedCheck] = useState<'SPF' | 'DKIM' | 'DMARC' | 'ALIGNMENT'>('SPF');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
      case 'ALIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-[#1FA463]/15 text-[#1FA463] border border-[#1FA463]/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> PASS
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-[#D94A4A]/15 text-[#D94A4A] border border-[#D94A4A]/30">
            <XCircle className="w-3.5 h-3.5" /> FAIL
          </span>
        );
      case 'NO_DKIM_SIGNATURE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-[#53657A]/15 text-[#53657A] border border-[#53657A]/30">
            <HelpCircle className="w-3.5 h-3.5" /> NO SIGNATURE PRESENT
          </span>
        );
      case 'SIGNATURE_PRESENT_VERIFICATION_UNAVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-[#D89428]/15 text-[#D89428] border border-[#D89428]/30">
            <AlertTriangle className="w-3.5 h-3.5" /> SIGNATURE PRESENT (UNVERIFIABLE)
          </span>
        );
      case 'DIFFERENT_DOMAINS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-[#D89428]/15 text-[#D89428] border border-[#D89428]/30">
            <AlertTriangle className="w-3.5 h-3.5" /> DIFFERENT DOMAINS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-[#53657A]/15 text-[#53657A] border border-[#53657A]/30">
            <HelpCircle className="w-3.5 h-3.5" /> NOT VERIFIABLE
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
              Stage 03 • Email Authentication
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#142238] tracking-tight">
            Cryptographic & Identity Verification
          </h2>
          <p className="text-xs sm:text-sm text-[#53657A] mt-0.5">
            Strict forensic evaluation of SPF, DKIM, DMARC, and domain alignment. Unverifiable states are never converted to FAIL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!auth ? (
            <button
              type="button"
              onClick={onRunAuth}
              disabled={isRunning}
              className="px-4 py-2 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors flex items-center gap-2 shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-[#2DBDCA]" />
              <span>{isRunning ? 'Evaluating...' : 'Evaluate Authentication'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onProceedToIoc}
              className="px-4 py-2 rounded-lg bg-[#2DBDCA] text-[#142238] font-bold text-xs hover:bg-[#28b2be] transition-colors flex items-center gap-2 shadow-xs"
            >
              <span>Proceed to IOC Extraction</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!auth ? (
        <div className="bg-white rounded-xl border border-[#D9E1E6] p-12 flex flex-col items-center justify-center text-center shadow-xs">
          <ShieldCheck className="w-12 h-12 text-[#D9E1E6] mb-3" />
          <h3 className="text-base font-bold text-[#142238]">Authentication Engine Ready</h3>
          <p className="text-xs text-[#53657A] max-w-md mt-1 mb-4">
            Click below to inspect SPF records, cryptographic DKIM signatures, DMARC policies, and header domain alignment.
          </p>
          <button
            type="button"
            onClick={onRunAuth}
            disabled={isRunning}
            className="px-5 py-2.5 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors"
          >
            {isRunning ? 'Evaluating Headers...' : 'Run Authentication Checks'}
          </button>
        </div>
      ) : (
        /* Main Evaluation Grid: 4 Check Cards on Left/Top, Technical Detail Panel on Right/Bottom */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
          {/* Left: 4 Check Cards (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* SPF Card */}
            <div
              onClick={() => setSelectedCheck('SPF')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedCheck === 'SPF'
                  ? 'bg-white border-[#2DBDCA] shadow-sm ring-1 ring-[#2DBDCA]'
                  : 'bg-white border-[#D9E1E6] hover:bg-[#FAFBFB]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#142238]">SPF</span>
                  <span className="text-[10px] text-[#53657A] font-medium hidden sm:inline">
                    Sender Policy Framework
                  </span>
                </div>
                {getStatusBadge(auth.spf.status)}
              </div>
              <p className="text-xs text-[#142238] font-medium leading-relaxed">{auth.spf.reason}</p>
              <div className="mt-2 pt-2 border-t border-[#D9E1E6]/60 flex items-center justify-between text-[10px] text-[#53657A]">
                <span>Source: {auth.spf.source}</span>
                <span className="font-mono text-[#0e808c]">{auth.spf.provenance}</span>
              </div>
            </div>

            {/* DKIM Card */}
            <div
              onClick={() => setSelectedCheck('DKIM')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedCheck === 'DKIM'
                  ? 'bg-white border-[#2DBDCA] shadow-sm ring-1 ring-[#2DBDCA]'
                  : 'bg-white border-[#D9E1E6] hover:bg-[#FAFBFB]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#142238]">DKIM</span>
                  <span className="text-[10px] text-[#53657A] font-medium hidden sm:inline">
                    DomainKeys Identified Mail
                  </span>
                </div>
                {getStatusBadge(auth.dkim.status)}
              </div>
              <p className="text-xs text-[#142238] font-medium leading-relaxed">{auth.dkim.reason}</p>
              <div className="mt-2 pt-2 border-t border-[#D9E1E6]/60 flex items-center justify-between text-[10px] text-[#53657A]">
                <span>Source: {auth.dkim.source}</span>
                <span className="font-mono text-[#0e808c]">{auth.dkim.provenance}</span>
              </div>
            </div>

            {/* DMARC Card */}
            <div
              onClick={() => setSelectedCheck('DMARC')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedCheck === 'DMARC'
                  ? 'bg-white border-[#2DBDCA] shadow-sm ring-1 ring-[#2DBDCA]'
                  : 'bg-white border-[#D9E1E6] hover:bg-[#FAFBFB]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#142238]">DMARC</span>
                  <span className="text-[10px] text-[#53657A] font-medium hidden sm:inline">
                    Domain-based Message Authentication & Conformance
                  </span>
                </div>
                {getStatusBadge(auth.dmarc.status)}
              </div>
              <p className="text-xs text-[#142238] font-medium leading-relaxed">{auth.dmarc.reason}</p>
              <div className="mt-2 pt-2 border-t border-[#D9E1E6]/60 flex items-center justify-between text-[10px] text-[#53657A]">
                <span>Source: {auth.dmarc.source}</span>
                <span className="font-mono text-[#0e808c]">{auth.dmarc.provenance}</span>
              </div>
            </div>

            {/* Alignment Card */}
            <div
              onClick={() => setSelectedCheck('ALIGNMENT')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedCheck === 'ALIGNMENT'
                  ? 'bg-white border-[#2DBDCA] shadow-sm ring-1 ring-[#2DBDCA]'
                  : 'bg-white border-[#D9E1E6] hover:bg-[#FAFBFB]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#142238]">Domain Alignment</span>
                  <span className="text-[10px] text-[#53657A] font-medium hidden sm:inline">
                    From vs Reply-To vs Return-Path
                  </span>
                </div>
                {getStatusBadge(auth.alignment.status)}
              </div>
              <p className="text-xs text-[#142238] font-medium leading-relaxed">{auth.alignment.explanation}</p>
              <div className="mt-2 pt-2 border-t border-[#D9E1E6]/60 flex items-center justify-between text-[10px] text-[#53657A]">
                <span>Source: {auth.alignment.source}</span>
                <span className="font-mono text-[#0e808c]">{auth.alignment.provenance}</span>
              </div>
            </div>
          </div>

          {/* Right: Technical Inspector for Selected Check (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-[#D9E1E6] p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-[#D9E1E6] mb-3">
                <Info className="w-4 h-4 text-[#2DBDCA]" />
                <h3 className="text-xs font-bold text-[#142238] uppercase tracking-wider">
                  Technical Inspector: {selectedCheck}
                </h3>
              </div>

              {selectedCheck === 'SPF' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">What it means</span>
                    <p className="text-[#142238] leading-relaxed">
                      SPF (Sender Policy Framework) verifies whether the sending mail transfer agent (MTA) is authorized by the domain's DNS SPF record to deliver mail on its behalf.
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Raw Evidence</span>
                    <pre className="font-mono text-[11px] bg-[#F5F6F4] p-2.5 rounded border border-[#D9E1E6] text-[#142238] whitespace-pre-wrap break-all select-text">
                      {auth.spf.evidence || '(No raw SPF record captured)'}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Forensic Integrity Rule</span>
                    <p className="text-[11px] text-[#53657A] bg-[#F5F6F4] p-2 rounded">
                      In the absence of live gateway envelope data or confirmed DNS lookup, status remains <strong>NOT VERIFIABLE</strong>. Never assume FAIL without proof.
                    </p>
                  </div>
                </div>
              )}

              {selectedCheck === 'DKIM' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">What it means</span>
                    <p className="text-[#142238] leading-relaxed">
                      DKIM (DomainKeys Identified Mail) affixes a cryptographic digital signature to the message headers and body, verifying that the email was sent by the claimed domain and was not altered in transit.
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Signature Count</span>
                    <span className="font-bold text-[#142238]">{auth.dkim.signatures.length} signature(s) detected</span>
                  </div>
                  {auth.dkim.signatures.length > 0 && (
                    <div>
                      <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Signature Parameters</span>
                      <div className="font-mono text-[11px] bg-[#F5F6F4] p-2.5 rounded border border-[#D9E1E6] space-y-1 text-[#142238]">
                        <div>domain (d): {auth.dkim.signatures[0].domain}</div>
                        <div>selector (s): {auth.dkim.signatures[0].selector}</div>
                        <div>algorithm (a): {auth.dkim.signatures[0].algorithm}</div>
                        <div className="truncate" title={auth.dkim.signatures[0].bodyHash}>body hash (bh): {auth.dkim.signatures[0].bodyHash}</div>
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Raw Evidence</span>
                    <pre className="font-mono text-[10px] bg-[#F5F6F4] p-2 rounded border border-[#D9E1E6] text-[#142238] whitespace-pre-wrap break-all select-text">
                      {auth.dkim.evidence}
                    </pre>
                  </div>
                </div>
              )}

              {selectedCheck === 'DMARC' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">What it means</span>
                    <p className="text-[#142238] leading-relaxed">
                      DMARC (Domain-based Message Authentication, Reporting, and Conformance) coordinates SPF and DKIM authentication with the visible <code>From:</code> domain header to protect domains from direct spoofing.
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Raw Evidence</span>
                    <pre className="font-mono text-[11px] bg-[#F5F6F4] p-2.5 rounded border border-[#D9E1E6] text-[#142238] whitespace-pre-wrap break-all select-text">
                      {auth.dmarc.evidence}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Policy Stance</span>
                    <span className="font-mono font-bold text-[#142238]">{auth.dmarc.policy ? `p=${auth.dmarc.policy}` : 'Unspecified'}</span>
                  </div>
                </div>
              )}

              {selectedCheck === 'ALIGNMENT' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">What it means</span>
                    <p className="text-[#142238] leading-relaxed">
                      Compares the author's visible domain (<code>From</code>) against the destination address for replies (<code>Reply-To</code>) and the bounce envelope address (<code>Return-Path</code>).
                    </p>
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px] bg-[#F5F6F4] p-2.5 rounded border border-[#D9E1E6] text-[#142238]">
                    <div className="flex justify-between">
                      <span className="text-[#53657A]">From Domain:</span>
                      <span className="font-bold">{auth.alignment.fromDomain || '(none)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#53657A]">Reply-To Domain:</span>
                      <span className={auth.alignment.replyToDomain && auth.alignment.replyToDomain !== auth.alignment.fromDomain ? 'text-[#D89428] font-bold' : ''}>
                        {auth.alignment.replyToDomain || '(None)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#53657A]">Return-Path Domain:</span>
                      <span>{auth.alignment.returnPathDomain || '(None)'}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#53657A] bg-[#F5F6F4] p-2 rounded">
                    <strong>Forensic Distinction:</strong> A domain mismatch indicates differing identity routing, but is reported objectively as <em>"Domain alignment differs"</em> without presuming malicious intent prior to holistic fusion.
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#D9E1E6] flex items-center justify-between text-[11px] text-[#53657A]">
              <span>RFC 7208 / RFC 6376 / RFC 7489</span>
              <span className="font-mono">Auditable Verification</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
