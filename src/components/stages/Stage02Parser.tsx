import React, { useState } from 'react';
import { FileText, Cpu, Check, Layers, Mail, Paperclip, Clock, ShieldCheck, ArrowRight, ArrowRightLeft } from 'lucide-react';
import { InvestigationState } from '../../types';
import { formatBytes } from '../../services/cryptoUtils';
import { EvidenceDiff } from './EvidenceDiff';

interface Stage02ParserProps {
  state: InvestigationState;
  isRunning: boolean;
  onRunParser: () => void;
  onProceedToAuth: () => void;
}

export const Stage02Parser: React.FC<Stage02ParserProps> = ({
  state,
  isRunning,
  onRunParser,
  onProceedToAuth,
}) => {
  const [viewMode, setViewMode] = useState<'DIFF' | 'STANDARD'>('DIFF');
  const parsed = state.parsedEmail;
  const isParsed = Boolean(parsed);

  return (
    <div className="h-full flex flex-col justify-between max-w-[1600px] mx-auto p-4 sm:p-6 gap-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#2DBDCA] uppercase tracking-wider">
              Stage 02 • RFC 5322 & MIME Parser
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#142238] tracking-tight">
            Email Parser & Structural Normalization
          </h2>
          <p className="text-xs sm:text-sm text-[#53657A] mt-0.5">
            Parses raw email streams into structured headers, MIME boundaries, body text, and cryptographic digests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white p-1 rounded-lg border border-[#D9E1E6] text-xs font-semibold shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('DIFF')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'DIFF'
                  ? 'bg-[#142238] text-white font-bold shadow-xs'
                  : 'text-[#53657A] hover:text-[#142238]'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#2DBDCA]" />
              <span>Evidence Diff Tool</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('STANDARD')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'STANDARD'
                  ? 'bg-[#142238] text-white font-bold shadow-xs'
                  : 'text-[#53657A] hover:text-[#142238]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Standard Overview</span>
            </button>
          </div>

          {!isParsed ? (
            <button
              type="button"
              onClick={onRunParser}
              disabled={isRunning}
              className="px-4 py-2 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors flex items-center gap-2 shadow-xs"
            >
              <Cpu className="w-4 h-4 text-[#2DBDCA]" />
              <span>{isRunning ? 'Parsing Artifact...' : 'Execute Email Parser'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onProceedToAuth}
              className="px-4 py-2 rounded-lg bg-[#2DBDCA] text-[#142238] font-bold text-xs hover:bg-[#28b2be] transition-colors flex items-center gap-2 shadow-xs"
            >
              <span>Proceed to Authentication</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main View: Evidence Diff Mode vs Standard Overview Mode */}
      {viewMode === 'DIFF' ? (
        <div className="flex-1 min-h-[500px]">
          <EvidenceDiff
            rawEmail={state.rawEmail}
            parsed={parsed}
            fileSize={state.file?.size}
            isRunning={isRunning}
            onRunParser={onRunParser}
          />
        </div>
      ) : (
        /* Standard Two-Column Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[440px] items-stretch">
          {/* Left: Raw .EML View (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-[#D9E1E6] flex flex-col overflow-hidden shadow-xs">
            <div className="bg-[#F5F6F4] px-4 py-2.5 border-b border-[#D9E1E6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#53657A]" />
                <span className="text-xs font-bold text-[#142238]">Raw Evidence Stream (.eml)</span>
              </div>
              <span className="text-[10px] font-mono text-[#53657A]">
                {state.file?.size ? formatBytes(state.file.size) : '0 B'}
              </span>
            </div>
            <div className="p-3 font-mono text-[11px] leading-relaxed text-[#142238] overflow-y-auto max-h-[500px] whitespace-pre-wrap break-all bg-[#FAFBFB] select-text">
              {state.rawEmail || '// No raw email loaded'}
            </div>
          </div>

          {/* Center/Right: Structured Extracted Evidence (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#D9E1E6] flex flex-col overflow-hidden shadow-xs">
            <div className="bg-[#F5F6F4] px-4 py-2.5 border-b border-[#D9E1E6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2DBDCA]" />
                <span className="text-xs font-bold text-[#142238]">Normalized Forensic Structure</span>
              </div>
              {parsed && (
                <span className="text-[10px] font-semibold text-[#1FA463] flex items-center gap-1">
                  <Check className="w-3 h-3" /> Successfully Parsed
                </span>
              )}
            </div>

            <div className="p-4 overflow-y-auto max-h-[500px] flex flex-col gap-4 text-xs">
              {!parsed ? (
                <div className="py-16 flex flex-col items-center justify-center text-center text-[#53657A]">
                  <Cpu className="w-12 h-12 text-[#D9E1E6] mb-3 animate-pulse" />
                  <h4 className="text-sm font-bold text-[#142238]">Parser Engine Idle</h4>
                  <p className="text-xs max-w-sm mt-1">
                    Click <strong>"Execute Email Parser"</strong> to decode MIME parts, extract header fields, and normalize structured data.
                  </p>
                  <button
                    type="button"
                    onClick={onRunParser}
                    disabled={isRunning}
                    className="mt-4 px-4 py-2 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors"
                  >
                    {isRunning ? 'Parsing...' : 'Execute Parser'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Headers Grid */}
                  <div className="bg-[#F5F6F4] p-3.5 rounded-lg border border-[#D9E1E6] space-y-2">
                    <div className="text-[11px] font-bold uppercase text-[#53657A] tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#D9E1E6]/60">
                      <Mail className="w-3.5 h-3.5 text-[#2DBDCA]" />
                      <span>Primary Envelope & Header Fields</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-[#53657A] uppercase font-semibold block">From</span>
                        <span className="font-mono text-[#142238] break-all font-medium">
                          {parsed.from.displayName ? `"${parsed.from.displayName}" ` : ''}
                          &lt;{parsed.from.email}&gt;
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Sender Domain</span>
                        <span className="font-mono text-[#142238] font-bold">{parsed.from.domain || '(none)'}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Reply-To</span>
                        <span className={`font-mono break-all ${parsed.replyTo?.domain !== parsed.from.domain ? 'text-[#D89428] font-bold' : 'text-[#142238]'}`}>
                          {parsed.replyTo?.email || '(None specified)'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Return-Path</span>
                        <span className="font-mono text-[#142238] break-all">
                          {parsed.returnPath?.email || '(None specified)'}
                        </span>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Subject</span>
                        <span className="font-bold text-[#142238] text-sm">{parsed.subject}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Date</span>
                        <span className="text-[#142238]">{parsed.date || '(No date header)'}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Message-ID</span>
                        <span className="font-mono text-[#142238] text-[11px] truncate block" title={parsed.messageId || ''}>
                          {parsed.messageId || '(None)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MIME Structure & Transit Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-[#F5F6F4] p-2.5 rounded-lg border border-[#D9E1E6]">
                      <span className="text-[10px] text-[#53657A] block uppercase font-semibold">Received Hops</span>
                      <span className="text-base font-mono font-bold text-[#142238]">{parsed.receivedChain.length}</span>
                    </div>
                    <div className="bg-[#F5F6F4] p-2.5 rounded-lg border border-[#D9E1E6]">
                      <span className="text-[10px] text-[#53657A] block uppercase font-semibold">DKIM Signatures</span>
                      <span className="text-base font-mono font-bold text-[#142238]">{parsed.dkimSignatures.length}</span>
                    </div>
                    <div className="bg-[#F5F6F4] p-2.5 rounded-lg border border-[#D9E1E6]">
                      <span className="text-[10px] text-[#53657A] block uppercase font-semibold">Attachments</span>
                      <span className="text-base font-mono font-bold text-[#142238]">{parsed.attachments.length}</span>
                    </div>
                    <div className="bg-[#F5F6F4] p-2.5 rounded-lg border border-[#D9E1E6]">
                      <span className="text-[10px] text-[#53657A] block uppercase font-semibold">Content Type</span>
                      <span className="text-xs font-mono font-bold text-[#142238] truncate block" title={parsed.contentType}>
                        {parsed.contentType.split(';')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Attachments Section (if present) */}
                  {parsed.attachments.length > 0 && (
                    <div className="bg-[#F5F6F4] p-3 rounded-lg border border-[#D9E1E6]">
                      <div className="text-[11px] font-bold uppercase text-[#53657A] tracking-wider flex items-center gap-1.5 mb-2">
                        <Paperclip className="w-3.5 h-3.5 text-[#2DBDCA]" />
                        <span>Extracted MIME Attachments ({parsed.attachments.length})</span>
                      </div>
                      <div className="space-y-2">
                        {parsed.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-2.5 rounded border border-[#D9E1E6] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <span className="font-bold text-[#142238] block">{att.filename}</span>
                              <span className="text-[10px] font-mono text-[#53657A]">
                                {att.contentType} • {formatBytes(att.sizeBytes)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-semibold text-[#53657A] block">SHA-256</span>
                              <span className="font-mono text-[10px] text-[#142238] break-all select-all">
                                {att.sha256}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Body Excerpt */}
                  <div className="bg-[#F5F6F4] p-3 rounded-lg border border-[#D9E1E6]">
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block mb-1">
                      Normalized Body Content (Excerpt)
                    </span>
                    <div className="bg-white p-2.5 rounded border border-[#D9E1E6] max-h-32 overflow-y-auto text-xs whitespace-pre-wrap font-sans text-[#142238]">
                      {parsed.plainText || '// No plain text body detected'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
