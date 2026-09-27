import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Globe,
  X,
  AlertTriangle,
  Shield,
  Activity,
  Layers,
  Search,
  Filter,
  Radio,
  ExternalLink,
  Crosshair,
  Server,
  Zap,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle2,
  Maximize2,
  Minimize2,
  ChevronRight,
  Info
} from 'lucide-react';
import { InvestigationState } from '../types';
import {
  GLOBAL_THREAT_HOTSPOTS,
  RECENT_TELEMETRY_STREAM,
  ThreatHotspot,
  ThreatCategory,
  ThreatSeverity,
  correlateCaseWithThreatLandscape
} from '../services/threatLandscapeData';

interface ThreatLandscapeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  state: InvestigationState;
}

export const ThreatLandscapeOverlay: React.FC<ThreatLandscapeOverlayProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const circlesRef = useRef<L.Circle[]>([]);

  const [selectedHotspot, setSelectedHotspot] = useState<ThreatHotspot | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ThreatCategory | 'CORRELATED'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | ThreatSeverity>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'MAP_MATRIX' | 'CASE_CORRELATION' | 'LIVE_FEED'>('MAP_MATRIX');

  // Correlate case evidence with the global landscape
  const correlation = useMemo(() => {
    return correlateCaseWithThreatLandscape(state, GLOBAL_THREAT_HOTSPOTS);
  }, [state]);

  // Filter hotspots based on user selections
  const filteredHotspots = useMemo(() => {
    return GLOBAL_THREAT_HOTSPOTS.filter((hs) => {
      // Category filter
      if (categoryFilter === 'CORRELATED') {
        const isCorrelated = correlation.correlatedHotspots.some((c) => c.id === hs.id);
        if (!isCorrelated) return false;
      } else if (categoryFilter !== 'ALL' && hs.category !== categoryFilter) {
        return false;
      }

      // Severity filter
      if (severityFilter !== 'ALL' && hs.severity !== severityFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = hs.name.toLowerCase().includes(q);
        const matchesCity = hs.city.toLowerCase().includes(q);
        const matchesCountry = hs.country.toLowerCase().includes(q);
        const matchesActor = hs.threatActors.some((a) => a.toLowerCase().includes(q));
        const matchesAsn = hs.asn.toLowerCase().includes(q);
        const matchesCampaign = hs.activeCampaigns.some((c) => c.toLowerCase().includes(q));
        if (!matchesName && !matchesCity && !matchesCountry && !matchesActor && !matchesAsn && !matchesCampaign) {
          return false;
        }
      }

      return true;
    });
  }, [categoryFilter, severityFilter, searchQuery, correlation]);

  // Initialize selected hotspot to first correlated hotspot or first critical hotspot
  useEffect(() => {
    if (correlation.correlatedHotspots.length > 0) {
      setSelectedHotspot(correlation.correlatedHotspots[0]);
    } else {
      setSelectedHotspot(GLOBAL_THREAT_HOTSPOTS[0]);
    }
  }, [correlation]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when overlay is open so background UI does not scroll
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Setup Leaflet map when overlay opens
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Reset previous instance if container changed
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [28.0, 10.0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false, // Prevents scroll hijacking
    });

    mapInstanceRef.current = map;

    // OpenStreetMap default layer with Leaflet
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors | <a href="https://leafletjs.com/" target="_blank" rel="noreferrer">Leaflet</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.scale({ imperial: false, metric: true }).addTo(map);

    // Initial resize trigger
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Update map markers when filtered hotspots change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isOpen) return;

    // Clear existing markers & circles
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    circlesRef.current.forEach((c) => c.remove());
    circlesRef.current = [];

    const bounds: L.LatLngExpression[] = [];

    filteredHotspots.forEach((hs) => {
      bounds.push([hs.lat, hs.lng]);

      const isCorrelated = correlation.correlatedHotspots.some((c) => c.id === hs.id);
      const isCritical = hs.severity === 'CRITICAL';
      const isHigh = hs.severity === 'HIGH';

      // Accent colors
      const pinColor = isCorrelated ? '#2DBDCA' : isCritical ? '#D94A4A' : isHigh ? '#E07A14' : '#3B82F6';
      const auraColor = isCorrelated ? '#2DBDCA' : isCritical ? '#D94A4A' : isHigh ? '#E07A14' : '#3B82F6';

      // Add radiating circle aura
      const circle = L.circle([hs.lat, hs.lng], {
        radius: isCritical ? 280000 : 180000,
        color: auraColor,
        fillColor: auraColor,
        fillOpacity: isCorrelated ? 0.28 : 0.16,
        weight: isCorrelated ? 2 : 1,
      }).addTo(map);
      circlesRef.current.push(circle);

      // Custom HTML Marker Pin
      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
          ${
            isCorrelated
              ? `<div class="absolute w-12 h-12 rounded-full bg-[#2DBDCA]/40 animate-ping"></div>
                 <div class="absolute w-9 h-9 rounded-full border-2 border-[#2DBDCA] animate-pulse"></div>`
              : isCritical
              ? `<div class="absolute w-8 h-8 rounded-full bg-[#D94A4A]/25 animate-pulse"></div>`
              : ''
          }
          <div class="relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shadow-md border-2" style="background-color: ${pinColor}; border-color: white; color: ${
            isCorrelated ? '#142238' : 'white'
          };">
            ${isCorrelated ? '★' : hs.category === 'MALWARE_C2' ? 'C2' : hs.category === 'CREDENTIAL_HARVESTING' ? 'ID' : 'P'}
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-xs pointer-events-none" style="background-color: #142238;">
            ${hs.city}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: 'threat-hotspot-pin',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([hs.lat, hs.lng], { icon }).addTo(map);

      // Popup
      const popupHtml = `
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; min-width: 240px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #D9E1E6; padding-bottom: 4px;">
            <span style="font-weight: 700; font-size: 12px; color: #142238;">${hs.name}</span>
            <span style="background: ${pinColor}; color: ${isCorrelated ? '#142238' : 'white'}; font-weight: 700; font-size: 9px; padding: 1px 5px; border-radius: 4px; text-transform: uppercase;">
              ${isCorrelated ? 'MATCHES CASE' : hs.severity}
            </span>
          </div>
          <div style="font-size: 11px; color: #53657A; line-height: 1.4;">
            <div><strong>Location:</strong> ${hs.city}, ${hs.country}</div>
            <div><strong>Category:</strong> ${hs.category.replace('_', ' ')}</div>
            <div><strong>ISP/ASN:</strong> ${hs.asn} (${hs.isp})</div>
            <div><strong>24h Incidents:</strong> ${hs.incidentCount24h.toLocaleString()} detections</div>
            <div><strong>Actors:</strong> ${hs.threatActors.join(', ')}</div>
            ${isCorrelated ? '<div style="margin-top: 4px; color: #0e808c; font-weight: 600; font-size: 10px;">⚡ Correlated with active investigation evidence</div>' : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { closeButton: false, offset: [0, -10] });

      marker.on('click', () => {
        setSelectedHotspot(hs);
      });

      markersRef.current.push(marker);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds as any, { padding: [50, 50], maxZoom: 5 });
    }
  }, [filteredHotspots, correlation, isOpen]);

  // Center on a specific hotspot
  const handleFocusHotspot = (hs: ThreatHotspot) => {
    setSelectedHotspot(hs);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([hs.lat, hs.lng], 5, { animate: true, duration: 0.8 });
      const idx = filteredHotspots.findIndex((h) => h.id === hs.id);
      if (idx !== -1 && markersRef.current[idx]) {
        markersRef.current[idx].openPopup();
      }
    }
  };

  if (!isOpen) return null;

  const totalIncidents24h = GLOBAL_THREAT_HOTSPOTS.reduce((sum, h) => sum + h.incidentCount24h, 0);
  const criticalCount = GLOBAL_THREAT_HOTSPOTS.filter((h) => h.severity === 'CRITICAL').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200">
      <div className="bg-[#FAFBFB] rounded-2xl border border-[#D9E1E6] shadow-2xl w-full max-w-[1550px] h-[92vh] min-h-[550px] flex flex-col overflow-hidden my-auto overscroll-contain">
        {/* Top Header Ribbon */}
        <div className="bg-[#142238] px-4 py-3 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#2DBDCA]/20 border border-[#2DBDCA]/40">
              <Globe className="w-5 h-5 text-[#2DBDCA] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  GLOBAL THREAT LANDSCAPE & INCIDENT INTELLIGENCE
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#2DBDCA] text-[#142238] rounded uppercase">
                  Live Overlay
                </span>
                {correlation.hasCorrelations && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#D94A4A] text-white rounded flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    {correlation.correlatedHotspots.length} Case Correlation{correlation.correlatedHotspots.length > 1 ? 's' : ''} Detected
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8695A6]">
                Geospatial visualization of active phishing networks, credential harvesting swarms, and malware C2 infrastructure providing context for Case {state.caseId}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Tab navigation */}
            <div className="flex items-center bg-[#213754] p-1 rounded-lg border border-[#2d4970] text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('MAP_MATRIX')}
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  activeTab === 'MAP_MATRIX'
                    ? 'bg-[#2DBDCA] text-[#142238] shadow-xs'
                    : 'text-[#8695A6] hover:text-white'
                }`}
              >
                Hotspot Map & Matrix
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CASE_CORRELATION')}
                className={`px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'CASE_CORRELATION'
                    ? 'bg-[#2DBDCA] text-[#142238] shadow-xs'
                    : 'text-[#8695A6] hover:text-white'
                }`}
              >
                <span>Case Correlation</span>
                {correlation.hasCorrelations && (
                  <span className="w-2 h-2 rounded-full bg-[#D94A4A] animate-ping" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('LIVE_FEED')}
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  activeTab === 'LIVE_FEED'
                    ? 'bg-[#2DBDCA] text-[#142238] shadow-xs'
                    : 'text-[#8695A6] hover:text-white'
                }`}
              >
                Live Telemetry Feed
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8695A6] hover:text-white hover:bg-[#213754] transition-colors"
              title="Close Threat Landscape Overlay (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Key Intelligence Telemetry Metrics Bar */}
        <div className="bg-white border-b border-[#D9E1E6] px-4 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-3 border-r border-[#D9E1E6] pr-2">
            <div className="w-8 h-8 rounded-lg bg-[#EBF7F8] flex items-center justify-center text-[#0e808c]">
              <Crosshair className="w-4 h-4 text-[#2DBDCA]" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#53657A] block">Monitored Hotspots</span>
              <span className="font-bold text-sm text-[#142238]">{GLOBAL_THREAT_HOTSPOTS.length} Active Nodes</span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-r border-[#D9E1E6] pr-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-[#D94A4A]">
              <AlertTriangle className="w-4 h-4 text-[#D94A4A]" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#53657A] block">Critical Severity</span>
              <span className="font-bold text-sm text-[#D94A4A]">{criticalCount} Zero-Tolerance Hubs</span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-r border-[#D9E1E6] pr-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-[#E07A14]">
              <Activity className="w-4 h-4 text-[#E07A14]" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#53657A] block">24h Global Incident Volume</span>
              <span className="font-bold text-sm text-[#142238]">{totalIncidents24h.toLocaleString()} Ingested</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EBF7F8] flex items-center justify-center text-[#2DBDCA]">
              <Zap className="w-4 h-4 text-[#2DBDCA]" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#53657A] block">Case Correlation Status</span>
              <span className="font-bold text-sm text-[#0e808c]">
                {correlation.hasCorrelations
                  ? `${correlation.correlationMatches.length} Matches Found`
                  : 'No Direct Infrastructure Matches'}
              </span>
            </div>
          </div>
        </div>

        {/* Investigation Correlation Alert Ribbon (if matches exist) */}
        {correlation.hasCorrelations && (
          <div className="bg-[#EBF7F8] border-b border-[#2DBDCA]/40 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2DBDCA] animate-ping" />
              <strong className="text-[#142238]">Forensic Correlation Alert:</strong>
              <span className="text-[#0e808c]">
                The current email evidence under investigation matches known active threat infrastructure in{' '}
                <strong>{correlation.correlatedHotspots.map((h) => h.city).join(', ')}</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('CASE_CORRELATION');
                if (correlation.correlatedHotspots[0]) {
                  handleFocusHotspot(correlation.correlatedHotspots[0]);
                }
              }}
              className="text-[11px] font-bold text-[#142238] bg-[#2DBDCA] hover:bg-[#28b2be] px-2.5 py-1 rounded transition-colors"
            >
              Inspect Case Matches ➔
            </button>
          </div>
        )}

        {/* Tab 1: Map & Matrix View */}
        {activeTab === 'MAP_MATRIX' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            {/* Left 60%: Real-World Leaflet Map */}
            <div className="flex-1 lg:w-3/5 flex flex-col p-3 border-b lg:border-b-0 lg:border-r border-[#D9E1E6] gap-2 overflow-hidden min-h-0">
              {/* Map Filter Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-xl border border-[#D9E1E6] shadow-2xs text-xs">
                {/* Category toggles */}
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('ALL')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      categoryFilter === 'ALL'
                        ? 'bg-[#142238] text-white'
                        : 'text-[#53657A] hover:bg-[#F5F6F4]'
                    }`}
                  >
                    All ({GLOBAL_THREAT_HOTSPOTS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('PHISHING')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      categoryFilter === 'PHISHING'
                        ? 'bg-[#142238] text-white'
                        : 'text-[#53657A] hover:bg-[#F5F6F4]'
                    }`}
                  >
                    Phishing
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('MALWARE_C2')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      categoryFilter === 'MALWARE_C2'
                        ? 'bg-[#142238] text-white'
                        : 'text-[#53657A] hover:bg-[#F5F6F4]'
                    }`}
                  >
                    Malware & C2
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('CREDENTIAL_HARVESTING')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      categoryFilter === 'CREDENTIAL_HARVESTING'
                        ? 'bg-[#142238] text-white'
                        : 'text-[#53657A] hover:bg-[#F5F6F4]'
                    }`}
                  >
                    Credential Theft
                  </button>
                  {correlation.hasCorrelations && (
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('CORRELATED')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                        categoryFilter === 'CORRELATED'
                          ? 'bg-[#2DBDCA] text-[#142238]'
                          : 'bg-[#EBF7F8] text-[#0e808c] hover:bg-[#2DBDCA]/20'
                      }`}
                    >
                      <span>Case Matches</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0e808c]" />
                    </button>
                  )}
                </div>

                {/* Severity Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#53657A] font-semibold">Severity:</span>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value as any)}
                    className="bg-[#F5F6F4] border border-[#D9E1E6] rounded px-2 py-0.5 text-xs text-[#142238]"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="CRITICAL">Critical Only</option>
                    <option value="HIGH">High & Above</option>
                    <option value="MEDIUM">Medium</option>
                  </select>
                </div>
              </div>

              {/* Leaflet Map Canvas */}
              <div className="relative flex-1 rounded-xl border border-[#D9E1E6] overflow-hidden bg-[#E5E9EC] min-h-[350px]">
                <div ref={mapContainerRef} className="w-full h-full min-h-[350px] z-0" />

                {/* Map Floating Summary Badge */}
                <div className="absolute top-3 left-3 bg-[#0e1726]/85 backdrop-blur-md p-2.5 rounded-xl border border-[#2d4970] text-white z-10 text-xs font-mono">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#2DBDCA] animate-ping" />
                    <span className="font-bold">Displaying {filteredHotspots.length} Active Hotspots</span>
                  </div>
                  <div className="text-[10px] text-[#8695A6]">
                    Click any marker to inspect attack vectors, ASN infrastructure & targeted sectors.
                  </div>
                </div>
              </div>
            </div>

            {/* Right 40%: Hotspot Matrix & Selected Hotspot Inspector */}
            <div className="flex-1 lg:w-2/5 flex flex-col p-3 overflow-y-auto overscroll-contain gap-3 bg-white min-h-0">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8695A6] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by city, country, actor, ASN, or campaign..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAFBFB] border border-[#D9E1E6] rounded-lg focus:outline-none focus:border-[#2DBDCA]"
                />
              </div>

              {/* Selected Hotspot Detailed Dossier */}
              {selectedHotspot && (
                <div className="p-3.5 rounded-xl border border-[#2DBDCA]/40 bg-[#FAFBFB] shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#D9E1E6] mb-2.5">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#2DBDCA]" />
                      <h4 className="font-bold text-xs text-[#142238] uppercase tracking-wide">
                        {selectedHotspot.name}
                      </h4>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        selectedHotspot.severity === 'CRITICAL'
                          ? 'bg-[#D94A4A] text-white'
                          : selectedHotspot.severity === 'HIGH'
                          ? 'bg-[#E07A14] text-white'
                          : 'bg-[#3B82F6] text-white'
                      }`}
                    >
                      {selectedHotspot.severity} Threat
                    </span>
                  </div>

                  <p className="text-xs text-[#53657A] mb-3 leading-relaxed">
                    {selectedHotspot.summary}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
                    <div className="p-2 rounded bg-white border border-[#D9E1E6]">
                      <span className="text-[9px] uppercase text-[#8695A6] block">Jurisdiction</span>
                      <span className="font-bold text-[#142238]">{selectedHotspot.city}, {selectedHotspot.country}</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-[#D9E1E6]">
                      <span className="text-[9px] uppercase text-[#8695A6] block">Autonomous System</span>
                      <span className="font-bold text-[#0e808c]">{selectedHotspot.asn}</span>
                      <span className="text-[10px] text-[#53657A] truncate block">{selectedHotspot.isp}</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-[#D9E1E6]">
                      <span className="text-[9px] uppercase text-[#8695A6] block">24h Detections</span>
                      <span className="font-bold text-[#D94A4A]">{selectedHotspot.incidentCount24h.toLocaleString()} events</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-[#D9E1E6]">
                      <span className="text-[9px] uppercase text-[#8695A6] block">Threat Actors</span>
                      <span className="font-bold text-[#142238] truncate block">{selectedHotspot.threatActors.join(', ')}</span>
                    </div>
                  </div>

                  {/* Active campaigns & observed IPs */}
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#8695A6] block">Active Campaigns</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {selectedHotspot.activeCampaigns.map((c, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-[#EBF7F8] text-[#0e808c] text-[10px] font-mono rounded">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#8695A6] block">Targeted Sectors</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {selectedHotspot.targetSectors.map((s, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-[#F5F6F4] text-[#53657A] text-[10px] rounded border border-[#D9E1E6]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hotspots Quick Selection List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                <span className="text-[10px] uppercase font-semibold text-[#53657A] block mb-1">
                  Global Threat Clusters ({filteredHotspots.length})
                </span>
                {filteredHotspots.map((hs) => {
                  const isSelected = selectedHotspot?.id === hs.id;
                  const isCorrelated = correlation.correlatedHotspots.some((c) => c.id === hs.id);

                  return (
                    <div
                      key={hs.id}
                      onClick={() => handleFocusHotspot(hs)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#EBF7F8] border-[#2DBDCA] shadow-xs'
                          : 'bg-[#FAFBFB] border-[#D9E1E6] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCorrelated
                                ? 'bg-[#2DBDCA] animate-ping'
                                : hs.severity === 'CRITICAL'
                                ? 'bg-[#D94A4A]'
                                : 'bg-[#E07A14]'
                            }`}
                          />
                          <span className="font-bold text-xs text-[#142238]">{hs.name}</span>
                        </div>
                        {isCorrelated && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-[#2DBDCA] text-[#142238]">
                            Case Match
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#53657A]">
                        <span>{hs.city}, {hs.country}</span>
                        <span className="font-mono text-[10px] text-[#8695A6]">{hs.incidentCount24h.toLocaleString()} / 24h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Case Correlation Analysis View */}
        {activeTab === 'CASE_CORRELATION' && (
          <div className="flex-1 p-6 overflow-y-auto overscroll-contain min-h-0 bg-white flex flex-col gap-5">
            <div className="bg-[#FAFBFB] p-4 rounded-xl border border-[#D9E1E6]">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-[#2DBDCA]" />
                <h3 className="font-bold text-sm text-[#142238] uppercase tracking-wide">
                  Active Investigation Correlation Analysis • Case {state.caseId}
                </h3>
              </div>
              <p className="text-xs text-[#53657A] leading-relaxed">
                Kryptos Forensics cross-references parsed email artifacts (RFC 5321 Received hops, extracted IP addresses, sender hostnames, and domain telemetry) against global threat intelligence clusters to establish campaign attribution.
              </p>
            </div>

            {correlation.hasCorrelations ? (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#142238] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D94A4A]" />
                  Identified Infrastructure Correlations ({correlation.correlationMatches.length} Matches)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {correlation.correlationMatches.map((match, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-[#2DBDCA] bg-[#FAFBFB] shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#2DBDCA] text-[#142238] uppercase">
                            {match.iocType} MATCH
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-[#0e808c] uppercase">
                            {match.matchConfidence.replace('_', ' ')}
                          </span>
                        </div>

                        <h5 className="font-bold text-sm text-[#142238] mb-1">
                          {match.hotspotName}
                        </h5>
                        <p className="text-xs text-[#53657A] mb-3">
                          {match.explanation}
                        </p>
                      </div>

                      <div className="p-2.5 rounded bg-white border border-[#D9E1E6] font-mono text-xs flex items-center justify-between">
                        <span className="text-[#8695A6] text-[10px]">CORRELATED IOC:</span>
                        <span className="font-bold text-[#142238]">{match.iocValue}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-[#EBF7F8] border border-[#2DBDCA]/40 text-xs">
                  <h5 className="font-bold text-[#142238] mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2DBDCA]" />
                    Investigative Takeaway & Threat Assessment
                  </h5>
                  <p className="text-[#53657A] leading-relaxed">
                    The evidence artifacts directly link this incident to active global phishing syndicates utilizing bulletproof transit and cloud reverse proxies to obscure the real origin. Investigators should cross-verify the earliest observed MTA relay in Stage 09 against these identified clusters.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-[#53657A] bg-[#FAFBFB] rounded-xl border border-[#D9E1E6]">
                <Shield className="w-10 h-10 text-[#D9E1E6] mx-auto mb-2" />
                <h4 className="font-bold text-sm text-[#142238]">No Direct Match to Known Threat Hotspots</h4>
                <p className="text-xs max-w-md mx-auto mt-1">
                  The IOCs observed in this email do not directly collide with active tracked clusters in the 24-hour global telemetry stream.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Live Telemetry Feed */}
        {activeTab === 'LIVE_FEED' && (
          <div className="flex-1 p-6 overflow-y-auto overscroll-contain min-h-0 bg-white flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E1E6]">
              <div>
                <h3 className="font-bold text-sm text-[#142238] uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#2DBDCA]" />
                  Live Threat Ingestion Stream
                </h3>
                <p className="text-xs text-[#53657A]">
                  Real-time telemetry stream from global honeypots, mail gateways, and perimeter sensors.
                </p>
              </div>
              <span className="text-[10px] font-mono text-[#0e808c] bg-[#EBF7F8] px-2 py-0.5 rounded font-bold">
                UPDATED REAL-TIME
              </span>
            </div>

            <div className="divide-y divide-[#D9E1E6] border border-[#D9E1E6] rounded-xl overflow-hidden bg-white">
              {RECENT_TELEMETRY_STREAM.map((item) => (
                <div key={item.id} className="p-3.5 hover:bg-[#FAFBFB] transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        item.severity === 'CRITICAL' ? 'bg-[#D94A4A]' : 'bg-[#E07A14]'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#142238]">{item.sourceCity}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F5F6F4] text-[#53657A]">
                          {item.category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-mono text-[#8695A6]">• {item.timestamp}</span>
                      </div>
                      <div className="text-xs font-mono text-[#0e808c] mt-0.5">
                        {item.indicator}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-[#142238] font-semibold block">{item.threatActor}</span>
                    <span className="text-[10px] text-[#53657A] block">Target: {item.targetSector}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Status Footer */}
        <div className="bg-[#FAFBFB] border-t border-[#D9E1E6] px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-[#53657A] shrink-0">
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Feed Sources: AbuseIPDB • Spamhaus • URLhaus • Feodo Tracker • CIRCL</span>
            <span>•</span>
            <span>Data Engine: Leaflet 1.9.4 & OpenStreetMap</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#142238] text-white font-semibold text-xs hover:bg-[#1f3556] transition-colors"
          >
            Close Overlay
          </button>
        </div>
      </div>
    </div>
  );
};
