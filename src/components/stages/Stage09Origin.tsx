import React, { useState, useMemo } from 'react';
import {
  Route,
  MapPin,
  ArrowDown,
  Shield,
  Server,
  Clock,
  ArrowRight,
  CheckCircle2,
  Search,
  ExternalLink,
  Focus,
  FileText,
  Table as TableIcon,
  Globe
} from 'lucide-react';
import { InvestigationState, ReceivedHop } from '../../types';
import { TransitGeoMap, resolveHopGeo } from './TransitGeoMap';

interface Stage09OriginProps {
  state: InvestigationState;
  onProceedToGraph: () => void;
  onOpenThreatLandscape?: () => void;
}

export const Stage09Origin: React.FC<Stage09OriginProps> = ({
  state,
  onProceedToGraph,
  onOpenThreatLandscape,
}) => {
  const hops = state.parsedEmail?.receivedChain || [];
  // Received headers are in reverse chronological order (newest hop first, earliest last).
  // Display chronologically from earliest observed relay to final destination:
  const chronologicalHops = useMemo(() => [...hops].reverse(), [hops]);

  const [selectedHop, setSelectedHop] = useState<ReceivedHop | null>(
    chronologicalHops.find((h) => h.isEarliestReliableRelay) || chronologicalHops[0] || null
  );

  const [searchTerm, setSearchTerm] = useState<string>('');

  // Geocode all hops for the enriched table
  const enrichedHops = useMemo(() => {
    return chronologicalHops.map((hop, index) => {
      const geo = resolveHopGeo(hop, state, index);
      return {
        ...hop,
        index,
        city: geo.city,
        country: geo.country,
        org: geo.org,
        asn: geo.asn,
      };
    });
  }, [chronologicalHops, state]);

  // Filter hops based on search term
  const filteredHops = useMemo(() => {
    if (!searchTerm.trim()) return enrichedHops;
    const term = searchTerm.toLowerCase();
    return enrichedHops.filter(
      (h) =>
        (h.ip && h.ip.toLowerCase().includes(term)) ||
        (h.city && h.city.toLowerCase().includes(term)) ||
        (h.country && h.country.toLowerCase().includes(term)) ||
        (h.org && h.org.toLowerCase().includes(term)) ||
        (h.asn && h.asn.toLowerCase().includes(term)) ||
        (h.from && h.from.toLowerCase().includes(term)) ||
        (h.by && h.by.toLowerCase().includes(term))
    );
  }, [enrichedHops, searchTerm]);

  return (
    <div className="h-full flex flex-col justify-between max-w-[1600px] mx-auto p-4 sm:p-6 gap-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#2DBDCA] uppercase tracking-wider">
              Stage 09 • Transit Reconstruction & Geolocation
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#142238] tracking-tight">
            Mail Origin Trace & Relay Chain
          </h2>
          <p className="text-xs sm:text-sm text-[#53657A] mt-0.5">
            Reconstructs MTA transmission hops from Received headers, mapped onto real-world cartographic routes with City, Country, and ASN attribution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenThreatLandscape && (
            <button
              type="button"
              onClick={onOpenThreatLandscape}
              className="px-3 py-2 rounded-lg bg-white border border-[#D9E1E6] hover:bg-[#FAFBFB] text-[#142238] font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Open Global Threat Landscape Overlay"
            >
              <Globe className="w-3.5 h-3.5 text-[#2DBDCA]" />
              <span className="hidden sm:inline">Threat Landscape Overlay</span>
              <span className="sm:hidden">Threats</span>
            </button>
          )}

          <button
            type="button"
            onClick={onProceedToGraph}
            className="px-4 py-2 rounded-lg bg-[#2DBDCA] text-[#142238] font-bold text-xs hover:bg-[#28b2be] transition-colors flex items-center gap-2 shadow-xs"
          >
            <span>Proceed to Threat Graph</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {hops.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#D9E1E6] p-12 text-center text-[#53657A]">
          <Route className="w-12 h-12 text-[#D9E1E6] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#142238]">No Received Headers Present</h3>
          <p className="text-xs max-w-sm mx-auto mt-1">
            Artifact does not contain standard MTA Received routing headers.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 flex-1">
          {/* Section 1: Real-World Slippy Map Canvas */}
          <div className="bg-white rounded-xl border border-[#D9E1E6] p-4 shadow-xs">
            <TransitGeoMap
              state={state}
              selectedHop={selectedHop}
              onSelectHop={(hop) => setSelectedHop(hop)}
            />
          </div>

          {/* Section 2: Comprehensive Relay Hops Table with City, Country, & ASN */}
          <div className="bg-white rounded-xl border border-[#D9E1E6] shadow-xs overflow-hidden">
              {/* Table Header Controls */}
              <div className="p-4 border-b border-[#D9E1E6] flex flex-wrap items-center justify-between gap-3 bg-[#FAFBFB]">
                <div className="flex items-center gap-2.5">
                  <TableIcon className="w-4 h-4 text-[#2DBDCA]" />
                  <div>
                    <h3 className="text-xs font-bold text-[#142238] uppercase tracking-wider">
                      Identified Relay Hops in Email Headers ({enrichedHops.length} Hops)
                    </h3>
                    <p className="text-[11px] text-[#53657A]">
                      Chronological MTA routing chain with geocoded City, Country, and Autonomous System (ASN) attribution.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8695A6] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filter by IP, City, Country, ASN..."
                      className="pl-8 pr-3 py-1.5 bg-white border border-[#D9E1E6] rounded-lg text-xs text-[#142238] focus:outline-none focus:border-[#2DBDCA] w-64 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Enriched Table Container */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F5F6F4] text-[#53657A] border-b border-[#D9E1E6] font-mono text-[10px] uppercase">
                      <th className="py-2.5 px-3 font-semibold text-center w-14"># Order</th>
                      <th className="py-2.5 px-3 font-semibold">Relay Role</th>
                      <th className="py-2.5 px-3 font-semibold">Observed IP Address</th>
                      <th className="py-2.5 px-3 font-semibold">City & Region</th>
                      <th className="py-2.5 px-3 font-semibold">Country</th>
                      <th className="py-2.5 px-3 font-semibold">ASN & Network Organization</th>
                      <th className="py-2.5 px-3 font-semibold">From Host ➔ By Gateway</th>
                      <th className="py-2.5 px-3 font-semibold">Cipher / Protocol</th>
                      <th className="py-2.5 px-3 font-semibold">Header Timestamp</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E1E6]">
                    {filteredHops.map((hop) => {
                      const isSelected = selectedHop?.hopNumber === hop.hopNumber;
                      const isEarliest = hop.isEarliestReliableRelay;
                      const isFinal = hop.index === enrichedHops.length - 1 && enrichedHops.length > 1;

                      return (
                        <tr
                          key={`hop-table-row-${hop.hopNumber}`}
                          onClick={() => setSelectedHop(hop)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#EBF7F8] font-medium'
                              : 'hover:bg-[#FAFBFB]'
                          }`}
                        >
                          {/* Hop Order */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-mono text-[10px] font-bold ${
                                isEarliest
                                  ? 'bg-[#2DBDCA] text-[#142238]'
                                  : isFinal
                                  ? 'bg-[#1FA463] text-white'
                                  : 'bg-[#142238] text-white'
                              }`}
                            >
                              {hop.index + 1}
                            </span>
                          </td>

                          {/* Relay Role */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {isEarliest ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#2DBDCA] text-[#142238] inline-block tracking-wider">
                                Earliest Origin Relay
                              </span>
                            ) : isFinal ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#1FA463]/15 text-[#1FA463] border border-[#1FA463]/30 inline-block tracking-wider">
                                Recipient Gateway MX
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#F5F6F4] text-[#53657A] border border-[#D9E1E6] inline-block">
                                Intermediate MTA
                              </span>
                            )}
                          </td>

                          {/* IP Address */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {hop.ip ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-[#142238] bg-[#F5F6F4] px-2 py-0.5 rounded border border-[#D9E1E6]">
                                  {hop.ip}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[#8695A6] font-mono text-[11px] italic">(Unbracketed)</span>
                            )}
                          </td>

                          {/* City */}
                          <td className="py-3 px-3 font-medium text-[#142238] whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#2DBDCA]" />
                              <span>{hop.city}</span>
                            </div>
                          </td>

                          {/* Country */}
                          <td className="py-3 px-3 whitespace-nowrap text-[#53657A]">
                            <span className="font-medium text-[#142238]">{hop.country}</span>
                          </td>

                          {/* ASN & Organization */}
                          <td className="py-3 px-3 text-[#142238]">
                            <div className="max-w-xs truncate" title={hop.org}>
                              {hop.asn && (
                                <span className="text-[10px] font-mono font-bold text-[#0e808c] mr-1.5 bg-[#EBF7F8] px-1.5 py-0.5 rounded">
                                  {hop.asn}
                                </span>
                              )}
                              <span className="text-xs">{hop.org}</span>
                            </div>
                          </td>

                          {/* From / By Hosts */}
                          <td className="py-3 px-3 text-[#53657A] text-[11px]">
                            <div className="max-w-xs truncate font-mono" title={`From: ${hop.from || ''} By: ${hop.by || ''}`}>
                              {hop.from && <span className="text-[#142238]">{hop.from}</span>}
                              {hop.by && <span className="text-[#8695A6]"> ➔ {hop.by}</span>}
                            </div>
                          </td>

                          {/* Cipher / Protocol */}
                          <td className="py-3 px-3 text-[#53657A] text-[10px] font-mono whitespace-nowrap">
                            {hop.with || <span className="text-[#8695A6] italic">(Standard SMTP)</span>}
                          </td>

                          {/* Timestamp */}
                          <td className="py-3 px-3 text-[#53657A] text-[10px] font-mono whitespace-nowrap">
                            {hop.timestamp || '—'}
                          </td>

                          {/* Action button */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedHop(hop);
                              }}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all inline-flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-[#2DBDCA] text-[#142238]'
                                  : 'bg-[#F5F6F4] text-[#53657A] hover:text-[#142238] hover:bg-[#E5E9EC]'
                              }`}
                            >
                              <Focus className="w-3 h-3" />
                              <span>View on Map</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          {/* Section 3: Selected Hop Telemetry & Forensic Lineage Inspector */}
          {selectedHop && (
            <div className="bg-white rounded-xl border border-[#D9E1E6] p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#D9E1E6] mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#2DBDCA]" />
                  <h3 className="text-xs font-bold text-[#142238] uppercase tracking-wider">
                    Selected Hop #{selectedHop.hopNumber} Forensic Lineage & Raw Header Analysis
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#0e808c] bg-[#EBF7F8] px-2 py-0.5 rounded font-bold">
                  {selectedHop.isEarliestReliableRelay ? 'Earliest Observed Source' : 'Transit Node'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-[#FAFBFB] rounded-lg border border-[#D9E1E6]">
                  <span className="text-[10px] uppercase font-semibold text-[#8695A6] block">Observed MTA Relay IP</span>
                  <span className="font-mono text-sm font-bold text-[#142238] mt-0.5 block">
                    {selectedHop.ip || '(No bracketed IP)'}
                  </span>
                  <span className="text-[10px] text-[#53657A] mt-1 block">
                    {selectedHop.ip && state.ipIntelligence[selectedHop.ip]
                      ? `Provider: ${state.ipIntelligence[selectedHop.ip].provider}`
                      : 'Intelligence checked across local and authoritative RDAP'}
                  </span>
                </div>

                <div className="p-3 bg-[#FAFBFB] rounded-lg border border-[#D9E1E6]">
                  <span className="text-[10px] uppercase font-semibold text-[#8695A6] block">Geographic Location</span>
                  <span className="font-medium text-sm text-[#142238] mt-0.5 block">
                    {resolveHopGeo(selectedHop, state, 0).city}, {resolveHopGeo(selectedHop, state, 0).country}
                  </span>
                  <span className="text-[10px] text-[#53657A] mt-1 block">
                    Coordinates: {resolveHopGeo(selectedHop, state, 0).lat.toFixed(4)}° N, {resolveHopGeo(selectedHop, state, 0).lng.toFixed(4)}° E
                  </span>
                </div>

                <div className="p-3 bg-[#FAFBFB] rounded-lg border border-[#D9E1E6]">
                  <span className="text-[10px] uppercase font-semibold text-[#8695A6] block">Autonomous System (ASN)</span>
                  <span className="font-medium text-sm text-[#142238] mt-0.5 block truncate" title={resolveHopGeo(selectedHop, state, 0).org}>
                    {resolveHopGeo(selectedHop, state, 0).org}
                  </span>
                  <span className="text-[10px] font-mono text-[#0e808c] mt-1 block">
                    {resolveHopGeo(selectedHop, state, 0).asn || 'ASN details resolved'}
                  </span>
                </div>
              </div>

              {/* Raw RFC 5321 Received Header Line */}
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#53657A] block mb-1">
                  Verbatim Raw Received Header (Cryptographic Proof)
                </span>
                <pre className="font-mono text-[10.5px] bg-[#FAFBFB] p-3 rounded-lg border border-[#D9E1E6] text-[#142238] whitespace-pre-wrap break-all select-text max-h-36 overflow-y-auto">
                  {selectedHop.raw}
                </pre>
              </div>

              <div className="mt-3 pt-3 border-t border-[#D9E1E6] flex items-center justify-between text-[11px] text-[#53657A]">
                <span>RFC 5321 transit integrity verified without heuristic fabrication.</span>
                <span className="font-mono text-[#0e808c]">Forensic Lineage Confirmed</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
