import React, { useState, useMemo } from 'react';
import { Target, Search, Copy, Check, ArrowRight, Globe, Link2, Mail, Hash, Network, Paperclip } from 'lucide-react';
import { InvestigationState, IOC, IocType } from '../../types';

interface Stage04IOCProps {
  state: InvestigationState;
  isRunning: boolean;
  onRunIoc: () => void;
  onSelectIocForIntel: (ioc: IOC) => void;
  onProceedToIntel: () => void;
}

export const Stage04IOC: React.FC<Stage04IOCProps> = ({
  state,
  isRunning,
  onRunIoc,
  onSelectIocForIntel,
  onProceedToIntel,
}) => {
  const iocs = state.iocs;
  const isExtracted = iocs.length > 0;
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredIocs = useMemo(() => {
    return iocs.filter((ioc) => {
      const matchesType =
        filterType === 'ALL' ||
        (filterType === 'IPS' && (ioc.type === 'ipv4' || ioc.type === 'ipv6')) ||
        (filterType === 'DOMAINS' && ioc.type === 'domain') ||
        (filterType === 'URLS' && ioc.type === 'url') ||
        (filterType === 'HASHES' && ioc.type === 'hash') ||
        (filterType === 'EMAILS' && ioc.type === 'email');

      const matchesSearch =
        !searchQuery ||
        ioc.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ioc.source.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesType && matchesSearch;
    });
  }, [iocs, filterType, searchQuery]);

  const handleCopy = (ioc: IOC) => {
    navigator.clipboard.writeText(ioc.value);
    setCopiedId(ioc.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getIocIcon = (type: IocType) => {
    switch (type) {
      case 'ipv4':
      case 'ipv6':
        return <Network className="w-3.5 h-3.5 text-[#2DBDCA]" />;
      case 'domain':
        return <Globe className="w-3.5 h-3.5 text-[#0e808c]" />;
      case 'url':
        return <Link2 className="w-3.5 h-3.5 text-[#D89428]" />;
      case 'hash':
        return <Hash className="w-3.5 h-3.5 text-[#142238]" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-[#1FA463]" />;
      case 'attachment':
        return <Paperclip className="w-3.5 h-3.5 text-[#53657A]" />;
      default:
        return <Target className="w-3.5 h-3.5 text-[#53657A]" />;
    }
  };

  return (
    <div className="h-full flex flex-col justify-between max-w-[1600px] mx-auto p-4 sm:p-6 gap-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#2DBDCA] uppercase tracking-wider">
              Stage 04 • Forensic Evidence Indicators
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#142238] tracking-tight">
            IOC (Indicators of Compromise) Extraction
          </h2>
          <p className="text-xs sm:text-sm text-[#53657A] mt-0.5">
            Extracts discrete observables (IPs, domains, URLs, cryptographic hashes, emails) directly from email artifact.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isExtracted ? (
            <button
              type="button"
              onClick={onRunIoc}
              disabled={isRunning}
              className="px-4 py-2 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors flex items-center gap-2 shadow-xs"
            >
              <Target className="w-4 h-4 text-[#2DBDCA]" />
              <span>{isRunning ? 'Extracting...' : 'Extract IOCs'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onProceedToIntel}
              className="px-4 py-2 rounded-lg bg-[#2DBDCA] text-[#142238] font-bold text-xs hover:bg-[#28b2be] transition-colors flex items-center gap-2 shadow-xs"
            >
              <span>Proceed to Intelligence</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!isExtracted ? (
        <div className="bg-white rounded-xl border border-[#D9E1E6] p-12 flex flex-col items-center justify-center text-center shadow-xs">
          <Target className="w-12 h-12 text-[#D9E1E6] mb-3" />
          <h3 className="text-base font-bold text-[#142238]">IOC Extraction Pending</h3>
          <p className="text-xs text-[#53657A] max-w-md mt-1 mb-4">
            Scans headers, MIME body parts, and attachments to normalize forensic indicators.
          </p>
          <button
            type="button"
            onClick={onRunIoc}
            disabled={isRunning}
            className="px-5 py-2.5 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors"
          >
            {isRunning ? 'Extracting...' : 'Extract Evidence Indicators'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#D9E1E6] flex flex-col flex-1 overflow-hidden shadow-xs">
          {/* Controls Bar: Search & Filter Chips */}
          <div className="p-3 border-b border-[#D9E1E6] bg-[#FAFBFB] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {[
                { key: 'ALL', label: `All (${iocs.length})` },
                { key: 'IPS', label: `IPs (${iocs.filter((i) => i.type === 'ipv4' || i.type === 'ipv6').length})` },
                { key: 'DOMAINS', label: `Domains (${iocs.filter((i) => i.type === 'domain').length})` },
                { key: 'URLS', label: `URLs (${iocs.filter((i) => i.type === 'url').length})` },
                { key: 'HASHES', label: `Hashes (${iocs.filter((i) => i.type === 'hash').length})` },
                { key: 'EMAILS', label: `Emails (${iocs.filter((i) => i.type === 'email').length})` },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilterType(f.key)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterType === f.key
                      ? 'bg-[#142238] text-white'
                      : 'bg-white text-[#53657A] border border-[#D9E1E6] hover:bg-[#F5F6F4]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#53657A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search extracted IOCs..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#D9E1E6] rounded-md focus:outline-hidden focus:border-[#2DBDCA]"
              />
            </div>
          </div>

          {/* IOC Table */}
          <div className="flex-1 overflow-y-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F5F6F4] text-[#53657A] uppercase text-[10px] tracking-wider font-semibold sticky top-0 border-b border-[#D9E1E6]">
                <tr>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Indicator Value</th>
                  <th className="py-2.5 px-4">Source Provenance</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E1E6]/60">
                {filteredIocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#53657A] text-xs">
                      No indicators match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredIocs.map((ioc) => (
                    <tr key={ioc.id} className="hover:bg-[#FAFBFB] transition-colors group">
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#F5F6F4] text-[#142238] border border-[#D9E1E6]">
                          {getIocIcon(ioc.type)}
                          <span className="uppercase">{ioc.type}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-4 max-w-[360px]">
                        <span
                          className="font-mono text-[#142238] text-[11px] break-all block select-all font-medium"
                          style={{ overflowWrap: 'anywhere' }}
                        >
                          {ioc.value}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-[#53657A] text-[11px]">
                        <span className="truncate block max-w-[240px]" title={ioc.source}>
                          {ioc.source}
                        </span>
                        <span className="text-[9px] font-mono text-[#0e808c] block">{ioc.provenance}</span>
                      </td>

                      <td className="py-2.5 px-4 text-[#53657A] text-[11px] whitespace-nowrap">
                        {ioc.location}
                      </td>

                      <td className="py-2.5 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(ioc)}
                          className="p-1.5 rounded text-[#53657A] hover:bg-[#F5F6F4] hover:text-[#142238] transition-colors"
                          title="Copy indicator value"
                        >
                          {copiedId === ioc.id ? <Check className="w-3.5 h-3.5 text-[#1FA463]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {(ioc.type === 'ipv4' || ioc.type === 'domain' || ioc.type === 'url') && (
                          <button
                            type="button"
                            onClick={() => onSelectIocForIntel(ioc)}
                            className="px-2 py-1 rounded text-[10px] font-semibold bg-[#142238] text-white hover:bg-[#1f3556] transition-colors"
                          >
                            Investigate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-2.5 bg-[#F5F6F4] border-t border-[#D9E1E6] text-[11px] text-[#53657A] flex items-center justify-between">
            <span>Showing {filteredIocs.length} of {iocs.length} verified indicators</span>
            <span className="font-mono">Every IOC traces to ground-truth email lines</span>
          </div>
        </div>
      )}
    </div>
  );
};
