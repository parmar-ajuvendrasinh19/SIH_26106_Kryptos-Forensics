import React, { useState } from 'react';
import { Globe, Network, Link2, Search, ArrowRight, Loader2, RefreshCw, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { InvestigationState, IOC, IpIntelligence, DomainIntelligence, UrlIntelligence } from '../../types';

interface Stage05IntelligenceProps {
  state: InvestigationState;
  selectedIoc: IOC | null;
  onSelectIoc: (ioc: IOC) => void;
  onInvestigateIoc: (ioc: IOC) => Promise<void>;
  isRunning: boolean;
  onProceedToContent: () => void;
}

export const Stage05Intelligence: React.FC<Stage05IntelligenceProps> = ({
  state,
  selectedIoc,
  onSelectIoc,
  onInvestigateIoc,
  isRunning,
  onProceedToContent,
}) => {
  const investigatableIocs = state.iocs.filter(
    (i) => i.type === 'ipv4' || i.type === 'domain' || i.type === 'url'
  );

  const currentIoc = selectedIoc || (investigatableIocs.length > 0 ? investigatableIocs[0] : null);

  const ipIntel: IpIntelligence | undefined = currentIoc?.type === 'ipv4' ? state.ipIntelligence[currentIoc.value] : undefined;
  const domainIntel: DomainIntelligence | undefined = currentIoc?.type === 'domain' ? state.domainIntelligence[currentIoc.value] : undefined;
  const urlIntel: UrlIntelligence | undefined = currentIoc?.type === 'url' ? state.urlIntelligence[currentIoc.value] : undefined;

  return (
    <div className="h-full flex flex-col justify-between max-w-[1600px] mx-auto p-4 sm:p-6 gap-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#2DBDCA] uppercase tracking-wider">
              Stage 05 • External Intelligence & Provenance
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#142238] tracking-tight">
            Threat Intelligence & Network Verification
          </h2>
          <p className="text-xs sm:text-sm text-[#53657A] mt-0.5">
            Queries live RDAP registries, system DNS, and structural analyzers. Missing provider integrations remain honestly UNAVAILABLE.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentIoc && (
            <button
              type="button"
              onClick={() => onInvestigateIoc(currentIoc)}
              disabled={isRunning}
              className="px-4 py-2 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors flex items-center gap-2 shadow-xs"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin text-[#2DBDCA]" /> : <Search className="w-4 h-4 text-[#2DBDCA]" />}
              <span>{isRunning ? 'Querying Providers...' : `Query Intel: ${currentIoc.value.substring(0, 18)}`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onProceedToContent}
            className="px-4 py-2 rounded-lg bg-[#2DBDCA] text-[#142238] font-bold text-xs hover:bg-[#28b2be] transition-colors flex items-center gap-2 shadow-xs"
          >
            <span>Proceed to Content Analysis</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {investigatableIocs.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#D9E1E6] p-12 text-center text-[#53657A]">
          <AlertCircle className="w-12 h-12 text-[#D9E1E6] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#142238]">No Investigatable Indicators</h3>
          <p className="text-xs max-w-sm mx-auto mt-1">
            No public IPs, domains, or URLs were extracted in Stage 04. Proceed to content analysis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
          {/* Left: Selector List of IOCs (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#D9E1E6] flex flex-col overflow-hidden shadow-xs">
            <div className="p-3 bg-[#F5F6F4] border-b border-[#D9E1E6] flex items-center justify-between">
              <span className="text-xs font-bold text-[#142238]">Select Indicator ({investigatableIocs.length})</span>
              <span className="text-[10px] text-[#53657A] font-mono">Real Observables</span>
            </div>

            <div className="divide-y divide-[#D9E1E6]/60 overflow-y-auto max-h-[500px]">
              {investigatableIocs.map((ioc) => {
                const isSelected = currentIoc?.id === ioc.id;
                const hasIntel =
                  Boolean(state.ipIntelligence[ioc.value]) ||
                  Boolean(state.domainIntelligence[ioc.value]) ||
                  Boolean(state.urlIntelligence[ioc.value]);

                return (
                  <button
                    key={ioc.id}
                    type="button"
                    onClick={() => onSelectIoc(ioc)}
                    className={`w-full p-3 text-left transition-colors flex items-center justify-between gap-2 ${
                      isSelected ? 'bg-[#2DBDCA]/10 border-l-3 border-[#2DBDCA]' : 'hover:bg-[#FAFBFB]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-[#F5F6F4] text-[#53657A] border border-[#D9E1E6]">
                          {ioc.type}
                        </span>
                        {hasIntel && (
                          <span className="text-[9px] text-[#1FA463] font-semibold flex items-center gap-0.5">
                            <CheckCircle className="w-2.5 h-2.5" /> Queried
                          </span>
                        )}
                      </div>
                      <span
                        className="font-mono text-xs text-[#142238] block truncate font-medium"
                        style={{ overflowWrap: 'anywhere' }}
                      >
                        {ioc.value}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Intel Inspector Display (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#D9E1E6] p-5 flex flex-col justify-between shadow-xs">
            {currentIoc ? (
              <div className="space-y-4">
                {/* Indicator Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#D9E1E6]">
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Target Indicator</span>
                    <span className="font-mono text-sm font-bold text-[#142238] break-all select-all">
                      {currentIoc.value}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onInvestigateIoc(currentIoc)}
                    disabled={isRunning}
                    className="px-3 py-1.5 rounded-md bg-[#142238] text-white text-xs font-semibold hover:bg-[#1f3556] transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>{isRunning ? 'Querying...' : 'Query Provider Now'}</span>
                  </button>
                </div>

                {/* IP Intelligence Display */}
                {currentIoc.type === 'ipv4' && (
                  <div className="space-y-3 text-xs">
                    <h4 className="text-xs font-bold text-[#142238] uppercase tracking-wider flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5 text-[#2DBDCA]" />
                      <span>IP Network & RDAP Telemetry</span>
                    </h4>

                    {ipIntel ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F5F6F4] p-3.5 rounded-lg border border-[#D9E1E6]">
                        <div>
                          <span className="text-[10px] text-[#53657A] uppercase font-semibold block">ASN / Handle</span>
                          <span className="font-mono font-medium text-[#142238]">{ipIntel.asn || 'Unavailable'}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Organization / Network</span>
                          <span className="font-medium text-[#142238]">{ipIntel.org || 'Unspecified network'}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Country</span>
                          <span className="font-medium text-[#142238]">{ipIntel.country || 'Unavailable'}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Reverse DNS (PTR)</span>
                          <span className="font-mono text-[#142238] break-all">
                            {ipIntel.rDNS && ipIntel.rDNS.length > 0 ? ipIntel.rDNS.join(', ') : 'No PTR record'}
                          </span>
                        </div>

                        <div className="sm:col-span-2 pt-2 border-t border-[#D9E1E6]/60 flex items-center justify-between text-[10px] text-[#53657A]">
                          <span>Provider: {ipIntel.provider}</span>
                          <span>Timestamp: {new Date(ipIntel.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#F5F6F4] p-6 rounded-lg text-center text-[#53657A]">
                        <p className="text-xs">No query executed yet for this IP.</p>
                        <p className="text-[11px] mt-1">Click "Query Provider Now" to resolve live RDAP registration and PTR records.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Domain Intelligence Display */}
                {currentIoc.type === 'domain' && (
                  <div className="space-y-3 text-xs">
                    <h4 className="text-xs font-bold text-[#142238] uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#0e808c]" />
                      <span>Domain Registration & DNS Records</span>
                    </h4>

                    {domainIntel ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F5F6F4] p-3.5 rounded-lg border border-[#D9E1E6]">
                        <div>
                          <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Registrar</span>
                          <span className="font-medium text-[#142238]">{domainIntel.registrar || 'Unavailable via RDAP'}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Registration Date</span>
                          <span className="font-mono text-[#142238]">{domainIntel.registrationDate || 'Unavailable'}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Domain Age</span>
                          <span className={`font-bold ${domainIntel.ageDays !== undefined && domainIntel.ageDays < 30 ? 'text-[#D94A4A]' : 'text-[#142238]'}`}>
                            {domainIntel.ageDays !== undefined ? `${domainIntel.ageDays} days` : 'Unavailable'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Nameservers</span>
                          <span className="font-mono text-[11px] text-[#142238] truncate block" title={domainIntel.nameservers?.join(', ')}>
                            {domainIntel.nameservers && domainIntel.nameservers.length > 0
                              ? domainIntel.nameservers.join(', ')
                              : 'None returned'}
                          </span>
                        </div>

                        {domainIntel.dnsRecords?.MX && (
                          <div className="sm:col-span-2">
                            <span className="text-[10px] text-[#53657A] uppercase font-semibold block">MX Mail Servers</span>
                            <div className="font-mono text-[11px] text-[#142238]">
                              {domainIntel.dnsRecords.MX.map((m, i) => (
                                <span key={i} className="mr-2">
                                  [{m.priority}] {m.exchange}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="sm:col-span-2 pt-2 border-t border-[#D9E1E6]/60 flex items-center justify-between text-[10px] text-[#53657A]">
                          <span>Provider: {domainIntel.provider}</span>
                          <span>Status: {domainIntel.status}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#F5F6F4] p-6 rounded-lg text-center text-[#53657A]">
                        <p className="text-xs">No query executed yet for this domain.</p>
                        <p className="text-[11px] mt-1">Click "Query Provider Now" to resolve live RDAP registration dates and DNS MX/A records.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* URL Intelligence Display */}
                {currentIoc.type === 'url' && (
                  <div className="space-y-3 text-xs">
                    <h4 className="text-xs font-bold text-[#142238] uppercase tracking-wider flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-[#D89428]" />
                      <span>URL Structural Threat Analysis</span>
                    </h4>

                    {urlIntel ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F5F6F4] p-3.5 rounded-lg border border-[#D9E1E6]">
                        <div>
                          <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Protocol & Host</span>
                          <span className="font-mono text-[#142238]">{urlIntel.protocol}://{urlIntel.hostname}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#53657A] uppercase font-semibold block">IP-Based Hostname</span>
                          <span className={`font-bold ${urlIntel.isIpBased ? 'text-[#D94A4A]' : 'text-[#1FA463]'}`}>
                            {urlIntel.isIpBased ? 'YES (Numeric IP Host)' : 'NO (Registered Domain)'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Pathname</span>
                          <span className="font-mono text-[#142238] break-all">{urlIntel.pathname || '/'}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Credential Keywords</span>
                          <span className="font-mono text-[#142238]">
                            {urlIntel.credentialKeywords.length > 0
                              ? urlIntel.credentialKeywords.join(', ')
                              : 'None detected'}
                          </span>
                        </div>

                        <div className="sm:col-span-2 pt-2 border-t border-[#D9E1E6]/60 flex items-center justify-between text-[10px] text-[#53657A]">
                          <span>Provider: {urlIntel.provider}</span>
                          <span>Method: Deterministic Lexical Parser</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#F5F6F4] p-6 rounded-lg text-center text-[#53657A]">
                        <p className="text-xs">No analysis executed yet for this URL.</p>
                        <p className="text-[11px] mt-1">Click "Query Provider Now" to perform structural decomposition.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {/* Forensic Transparency Note */}
            <div className="mt-4 pt-3 border-t border-[#D9E1E6] text-[11px] text-[#53657A] flex items-center justify-between">
              <span>Evidence Rule: Every result displays verified provider or honest "UNAVAILABLE".</span>
              <span className="font-mono text-[#0e808c]">Zero Synthetic Reputation Scores</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
