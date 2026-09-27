import React, { useRef, useState } from 'react';
import { Upload, FileCode, CheckCircle2, Shield, Hash, Clock, FileCheck, Copy, ArrowRight, Sparkles } from 'lucide-react';
import { InvestigationState } from '../../types';
import { formatBytes } from '../../services/cryptoUtils';
import { SAMPLE_EMAILS, SampleEmailItem } from '../../services/sampleEmails';

interface Stage01IntakeProps {
  state: InvestigationState;
  onLoadEml: (content: string, filename: string, sizeBytes: number) => Promise<void>;
  onStartInvestigation: () => void;
}

export const Stage01Intake: React.FC<Stage01IntakeProps> = ({
  state,
  onLoadEml,
  onStartInvestigation,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await onLoadEml(text, file.name, file.size);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const text = await file.text();
    await onLoadEml(text, file.name, file.size);
  };

  const handleCopyHash = () => {
    if (state.file?.sha256) {
      navigator.clipboard.writeText(state.file.sha256);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div className="h-full flex flex-col justify-between max-w-[1400px] mx-auto p-4 sm:p-6 gap-6">
      {/* Top Description */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold text-[#2DBDCA] uppercase tracking-wider">
            Stage 01 • Evidence Ingestion
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#142238] tracking-tight">
          Evidence Intake & Integrity Verification
        </h2>
        <p className="text-sm text-[#53657A] max-w-3xl mt-1">
          Upload an authentic <code className="text-xs bg-[#E5E9EC] px-1.5 py-0.5 rounded font-mono text-[#142238]">.eml</code> artifact.
          Kryptos Forensics treats the raw artifact as the absolute source of truth. Cryptographic hashing is computed on acquisition to ensure unbroken chain of custody.
        </p>
      </div>

      {/* Main Center Area: Two Columns (Upload/Samples on Left, Acquired Evidence on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Upload Dropzone & Real Test Cases (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Real .eml Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#2DBDCA] bg-[#2DBDCA]/5'
                : 'border-[#D9E1E6] bg-white hover:border-[#2DBDCA] hover:bg-[#F5F6F4]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".eml,message/rfc822,text/plain"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-14 h-14 rounded-full bg-[#142238]/5 flex items-center justify-center text-[#2DBDCA] mb-3">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#142238]">Select or Drag & Drop .EML Evidence</h3>
            <p className="text-xs text-[#53657A] max-w-sm mt-1">
              Supports standard RFC 5322 raw email files exported from Outlook, Gmail, Apple Mail, or mail gateways.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-semibold rounded-md bg-[#142238] text-white hover:bg-[#1f3556] transition-colors">
                Browse Local .eml
              </span>
            </div>
          </div>

          {/* Real Forensic Test Samples */}
          <div className="bg-white rounded-xl border border-[#D9E1E6] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#2DBDCA]" />
                <h4 className="text-xs font-bold text-[#142238] uppercase tracking-wider">
                  Verified Forensic Test Scenarios
                </h4>
              </div>
              <span className="text-[10px] text-[#53657A]">Real RFC 5322 Fixtures</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SAMPLE_EMAILS.map((sample: SampleEmailItem) => {
                const isSelected = state.file?.name === sample.filename;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => onLoadEml(sample.emlContent, sample.filename, sample.emlContent.length)}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#2DBDCA] bg-[#2DBDCA]/10 shadow-xs'
                        : 'border-[#D9E1E6] bg-[#F5F6F4] hover:bg-white hover:border-[#2DBDCA]/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-[#142238] truncate">{sample.name}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#1FA463] shrink-0" />}
                      </div>
                      <p className="text-[11px] text-[#53657A] line-clamp-2 leading-relaxed">
                        {sample.description}
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#D9E1E6]/60 flex items-center justify-between text-[10px] font-mono text-[#53657A]">
                      <span className="truncate">{sample.filename}</span>
                      <span className="text-[#0e808c] font-semibold">Load Fixture</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Acquired Artifact Details & Acquisition Sign-off (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-[#D9E1E6] p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#D9E1E6]">
              <Shield className="w-5 h-5 text-[#2DBDCA]" />
              <div>
                <h3 className="text-sm font-bold text-[#142238]">Evidence Acquisition Record</h3>
                <span className="text-[10px] text-[#53657A] font-mono">Chain of Custody Event #001</span>
              </div>
            </div>

            {state.file ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Artifact Filename</span>
                  <div className="font-mono font-bold text-[#142238] text-sm break-all bg-[#F5F6F4] px-2.5 py-1.5 rounded border border-[#D9E1E6]">
                    {state.file.name}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Evidence Type</span>
                    <span className="font-medium text-[#142238]">{state.file.mimeType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Artifact Size</span>
                    <span className="font-mono font-medium text-[#142238]">{formatBytes(state.file.size)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold">Cryptographic SHA-256</span>
                    <button
                      type="button"
                      onClick={handleCopyHash}
                      className="text-[10px] text-[#0e808c] hover:underline flex items-center gap-1 font-mono"
                    >
                      <Copy className="w-2.5 h-2.5" />
                      {copiedHash ? 'Copied' : 'Copy Hash'}
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-[#142238] bg-[#F5F6F4] p-2 rounded border border-[#D9E1E6] break-all leading-tight select-all">
                    {state.file.sha256}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Assigned Case</span>
                    <span className="font-mono font-bold text-[#142238]">{state.caseId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Evidence ID</span>
                    <span className="font-mono font-bold text-[#142238]">{state.evidenceId}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Acquisition Timestamp</span>
                  <div className="flex items-center gap-1.5 text-xs text-[#53657A]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(state.file.acquiredAt).toUTCString()}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#D9E1E6]">
                  <button
                    type="button"
                    onClick={onStartInvestigation}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Proceed to Email Parser</span>
                    <ArrowRight className="w-4 h-4 text-[#2DBDCA]" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center text-[#53657A]">
                <FileCheck className="w-10 h-10 text-[#D9E1E6] mb-2" />
                <p className="text-xs font-semibold text-[#142238]">No Evidence Loaded</p>
                <p className="text-[11px] max-w-xs mt-1">
                  Select a forensic fixture or upload an authentic .eml file to calculate cryptographic hashes and begin.
                </p>
              </div>
            )}
          </div>

          {/* Forensic Integrity Banner */}
          <div className="bg-[#F5F6F4] rounded-xl border border-[#D9E1E6] p-3 text-xs text-[#53657A] flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#1FA463] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Forensic Standard:</strong> All hashes are computed locally using SHA-256. The raw input file is frozen into the investigation state model and serves as the immutable ground truth for all analytical stages.
            </p>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="text-[11px] text-[#53657A] border-t border-[#D9E1E6] pt-3 flex items-center justify-between">
        <span>Kryptos Forensics • NIST SP 800-86 Computer Forensic Evidence Guide Compliant</span>
        <span className="font-mono">Evidence ID Format: KX-YYYY-XXXX-EV1</span>
      </div>
    </div>
  );
};
