import React from 'react';
import { X, HelpCircle, Quote, ShieldAlert, Check } from 'lucide-react';
import { ContentFinding } from '../types';

interface ExplainabilityModalProps {
  finding: ContentFinding | null;
  onClose: () => void;
}

export const ExplainabilityModal: React.FC<ExplainabilityModalProps> = ({ finding, onClose }) => {
  if (!finding) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-[#D9E1E6] shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-[#F5F6F4] border-b border-[#D9E1E6] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#2DBDCA]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#142238]">
              Forensic Signal Transparency
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#53657A] hover:bg-[#E5E9EC] hover:text-[#142238] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#142238] text-white">
              {finding.category}
            </span>
            <span className="font-mono text-xs font-bold text-[#0e808c]">+{finding.weight} points</span>
          </div>

          <div>
            <span className="text-[10px] text-[#53657A] uppercase font-semibold block mb-1">
              Exact Observed Quotation
            </span>
            <div className="bg-[#FAFBFB] p-3 rounded-lg border border-[#D9E1E6] font-mono text-xs text-[#142238] italic flex items-start gap-2">
              <Quote className="w-3.5 h-3.5 text-[#2DBDCA] shrink-0 mt-0.5" />
              <span>"{finding.quote}"</span>
            </div>
            <span className="text-[10px] text-[#53657A] mt-1 block">Location: {finding.location}</span>
          </div>

          <div>
            <span className="text-[10px] text-[#53657A] uppercase font-semibold block mb-1">
              Why was this signal raised?
            </span>
            <p className="text-[#142238] leading-relaxed bg-[#F5F6F4] p-3 rounded-lg border border-[#D9E1E6]">
              {finding.explanation}
            </p>
          </div>

          <div className="bg-[#FAFBFB] p-3 rounded-lg border border-[#D9E1E6] text-[11px] text-[#53657A] leading-relaxed">
            <strong>Forensic Explainability:</strong> This signal is derived through deterministic regex grammar rules. It represents an observable linguistic marker and does not rely on opaque or non-reproducible model weights.
          </div>
        </div>

        <div className="p-3 bg-[#F5F6F4] border-t border-[#D9E1E6] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#142238] text-white font-semibold text-xs hover:bg-[#1f3556] transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
