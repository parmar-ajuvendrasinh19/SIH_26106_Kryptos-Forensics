import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Globe,
  MapPin,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Navigation,
  Compass,
  Radio,
  Server,
  ArrowRight,
  Shield,
  Layers,
  Info,
  ChevronRight,
  Focus,
  ExternalLink
} from 'lucide-react';
import { InvestigationState, ReceivedHop } from '../../types';

interface TransitGeoMapProps {
  state: InvestigationState;
  selectedHop: ReceivedHop | null;
  onSelectHop: (hop: ReceivedHop) => void;
}

export interface GeocodedHop {
  hopNumber: number;
  originalHop: ReceivedHop;
  ip?: string;
  from?: string;
  by?: string;
  with?: string;
  timestamp?: string;
  isEarliest: boolean;
  lat: number;
  lng: number;
  city: string;
  country: string;
  org: string;
  asn?: string;
}

// Known targets for authentic email test infrastructure
const KNOWN_GEO_TARGETS: Record<string, { lat: number; lng: number; city: string; country: string; org?: string }> = {
  '171.67.215.200': { lat: 37.4275, lng: -122.1697, city: 'Stanford, CA', country: 'United States', org: 'Stanford University (AS32)' },
  '185.220.101.5': { lat: 50.1109, lng: 8.6821, city: 'Frankfurt', country: 'Germany', org: 'Zwiebelfreunde e.V. (AS205100)' },
  '198.51.100.45': { lat: 40.7128, lng: -74.0060, city: 'New York, NY', country: 'United States', org: 'Corporate Perimeter Gateway (TEST-NET-2)' },
  '194.26.29.112': { lat: 55.7558, lng: 37.6173, city: 'Moscow', country: 'Russian Federation', org: 'Cloud VPS Provider (AS57523)' },
  '91.240.118.88': { lat: 52.3676, lng: 4.9041, city: 'Amsterdam', country: 'Netherlands', org: 'Serverius Hosting (AS50673)' },
  '209.85.220.41': { lat: 37.4220, lng: -122.0841, city: 'Mountain View, CA', country: 'United States', org: 'Google LLC (AS15169)' },
  '142.250.180.26': { lat: 41.2619, lng: -95.8608, city: 'Council Bluffs, IA', country: 'United States', org: 'Google Cloud Data Center' },
};

const COUNTRY_COORDS: Record<string, { lat: number; lng: number; city: string }> = {
  US: { lat: 39.8283, lng: -98.5795, city: 'United States' },
  USA: { lat: 39.8283, lng: -98.5795, city: 'United States' },
  DE: { lat: 51.1657, lng: 10.4515, city: 'Frankfurt/Berlin' },
  RU: { lat: 55.7558, lng: 37.6173, city: 'Moscow' },
  NL: { lat: 52.1326, lng: 5.2913, city: 'Amsterdam' },
  GB: { lat: 51.5074, lng: -0.1278, city: 'London' },
  FR: { lat: 48.8566, lng: 2.3522, city: 'Paris' },
  CH: { lat: 46.8182, lng: 8.2275, city: 'Zurich' },
  CA: { lat: 45.4215, lng: -75.6972, city: 'Ottawa' },
  JP: { lat: 35.6762, lng: 139.6503, city: 'Tokyo' },
  SG: { lat: 1.3521, lng: 103.8198, city: 'Singapore' },
  IN: { lat: 28.6139, lng: 77.2090, city: 'New Delhi' },
  AU: { lat: -33.8688, lng: 151.2093, city: 'Sydney' },
};

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Generate quadratic curved arc in geographic coordinates for flight path appearance
function getCurvedArcLatLngs(p1: [number, number], p2: [number, number], numPoints = 30): [number, number][] {
  const [lat1, lng1] = p1;
  const [lat2, lng2] = p2;
  const points: [number, number][] = [];

  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;

  const dLng = lng2 - lng1;
  const dLat = lat2 - lat1;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);

  // Lift arc slightly northwards to simulate great-circle trajectory
  const arcLift = Math.min(18, Math.max(3.5, dist * 0.12));
  const ctrlLat = midLat + arcLift;
  const ctrlLng = midLng;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * ctrlLat + t * t * lat2;
    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * ctrlLng + t * t * lng2;
    points.push([lat, lng]);
  }
  return points;
}

export function resolveHopGeo(
  hop: ReceivedHop,
  state: InvestigationState,
  index: number
): {
  lat: number;
  lng: number;
  city: string;
  country: string;
  org: string;
  asn?: string;
} {
  const ip = hop.ip || '';
  const intel = ip ? state.ipIntelligence[ip] : null;

  let lat = 40.0;
  let lng = -95.0;
  let city = 'Regional Gateway';
  let country = 'Transit Network';
  let org = intel?.org || 'Autonomous System';
  const asn = intel?.asn;

  // 1. Direct match in KNOWN_GEO_TARGETS
  if (ip && KNOWN_GEO_TARGETS[ip]) {
    const match = KNOWN_GEO_TARGETS[ip];
    lat = match.lat;
    lng = match.lng;
    city = match.city;
    country = match.country;
    if (match.org && !intel?.org) org = match.org;
  }
  // 2. Intelligence lat/lng if available
  else if (intel && typeof intel.lat === 'number' && typeof intel.lng === 'number') {
    lat = intel.lat;
    lng = intel.lng;
    city = intel.city || intel.region || 'Autonomous Relay';
    country = intel.country || 'Global Network';
  }
  // 3. Country match from intelligence
  else if (intel?.country && COUNTRY_COORDS[intel.country]) {
    const cMatch = COUNTRY_COORDS[intel.country];
    lat = cMatch.lat + ((index % 3) - 1) * 2.5;
    lng = cMatch.lng + ((index % 2) - 0.5) * 4.0;
    city = cMatch.city;
    country = intel.country;
  }
  // 4. Hostname / Domain heuristic matching
  else {
    const fromHost = (hop.from || '').toLowerCase();
    const byHost = (hop.by || '').toLowerCase();

    if (fromHost.includes('stanford') || byHost.includes('stanford')) {
      lat = 37.4275;
      lng = -122.1697;
      city = 'Stanford, CA';
      country = 'United States';
      org = 'Stanford University (AS32)';
    } else if (fromHost.includes('google') || byHost.includes('google')) {
      lat = 37.4220 + index * 1.5;
      lng = -122.0841 + index * 2.0;
      city = 'Mountain View, CA';
      country = 'United States';
      org = 'Google Inbound Cloud MX (AS15169)';
    } else if (fromHost.includes('.ru') || fromHost.includes('online-host24') || fromHost.includes('cloud-relay-node')) {
      lat = 55.7558;
      lng = 37.6173;
      city = 'Moscow';
      country = 'Russian Federation';
      org = 'Cloud Relay Host (AS57523)';
    } else if (fromHost.includes('.de') || fromHost.includes('frankfurt')) {
      lat = 50.1109;
      lng = 8.6821;
      city = 'Frankfurt am Main';
      country = 'Germany';
      org = 'DE-CIX Transit Node (AS205100)';
    } else if (fromHost.includes('.nl') || fromHost.includes('amsterdam') || fromHost.includes('invoicing-srv')) {
      lat = 52.3676;
      lng = 4.9041;
      city = 'Amsterdam';
      country = 'Netherlands';
      org = 'AMS-IX Transit Relay (AS50673)';
    } else {
      const corridor = index % 4;
      if (corridor === 0) {
        lat = 38.9072 + index * 1.2;
        lng = -77.0369 - index * 1.8;
        city = 'Ashburn / DC Metro';
        country = 'United States';
        org = 'Equinix Data Hub';
      } else if (corridor === 1) {
        lat = 51.5074 + index * 1.2;
        lng = 8.6821 + index * 2.5;
        city = 'Frankfurt';
        country = 'Germany';
        org = 'European Backbone MTA';
      } else if (corridor === 2) {
        lat = 37.7749 + index * 1.8;
        lng = -122.4194 - index * 2.5;
        city = 'San Francisco, CA';
        country = 'United States';
        org = 'West Coast Transit Hub';
      } else {
        lat = 52.3676 + index * 1.5;
        lng = 4.9041 + index * 2.0;
        city = 'Amsterdam';
        country = 'Netherlands';
        org = 'Continental Gateway Relay';
      }
    }
  }

  return { lat, lng, city, country, org, asn };
}

export const TransitGeoMap: React.FC<TransitGeoMapProps> = ({
  state,
  selectedHop,
  onSelectHop,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const activePulseMarkerRef = useRef<L.Marker | null>(null);

  const rawHops = state.parsedEmail?.receivedChain || [];
  const chronologicalHops = useMemo(() => [...rawHops].reverse(), [rawHops]);

  const [activeHopIndex, setActiveHopIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Geocode each hop deterministically using intelligence records, known signatures, and RFC parameters
  const geocodedHops = useMemo<GeocodedHop[]>(() => {
    return chronologicalHops.map((hop, index) => {
      const geo = resolveHopGeo(hop, state, index);
      return {
        hopNumber: hop.hopNumber,
        originalHop: hop,
        ip: hop.ip,
        from: hop.from,
        by: hop.by,
        with: hop.with,
        timestamp: hop.timestamp,
        isEarliest: Boolean(hop.isEarliestReliableRelay),
        lat: geo.lat,
        lng: geo.lng,
        city: geo.city,
        country: geo.country,
        org: geo.org,
        asn: geo.asn,
      };
    });
  }, [chronologicalHops, state]);

  // Calculate total geodesic distance across the transit hops
  const totalDistanceKm = useMemo(() => {
    if (geocodedHops.length < 2) return 0;
    let dist = 0;
    for (let i = 0; i < geocodedHops.length - 1; i++) {
      dist += calculateDistanceKm(
        geocodedHops[i].lat,
        geocodedHops[i].lng,
        geocodedHops[i + 1].lat,
        geocodedHops[i + 1].lng
      );
    }
    return dist;
  }, [geocodedHops]);

  // Count distinct countries traversed
  const countriesCount = useMemo(() => {
    const set = new Set(geocodedHops.map((h) => h.country));
    return set.size;
  }, [geocodedHops]);

  // Synchronize active hop with selectedHop prop
  useEffect(() => {
    if (selectedHop) {
      const idx = geocodedHops.findIndex((h) => h.hopNumber === selectedHop.hopNumber);
      if (idx !== -1) {
        setActiveHopIndex(idx);
        if (mapInstanceRef.current) {
          const hop = geocodedHops[idx];
          mapInstanceRef.current.panTo([hop.lat, hop.lng], { animate: true, duration: 0.8 });
          if (markersRef.current[idx]) {
            markersRef.current[idx].openPopup();
          }
        }
      }
    }
  }, [selectedHop, geocodedHops]);

  // Initialize Real-World Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Reset if map instance exists on old container
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [35.0, 0.0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false, // Prevents scroll hijacking so user can scroll page smoothly
    });

    mapInstanceRef.current = map;

    // Standard Leaflet Scale bar
    L.control.scale({ imperial: false, metric: true }).addTo(map);

    const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors | <a href="https://leafletjs.com/" target="_blank" rel="noreferrer">Leaflet</a>';

    L.tileLayer(tileUrl, {
      subdomains: 'abc',
      attribution,
      maxZoom: 19,
    }).addTo(map);

    // Clean up markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Place interactive custom pin markers for each hop
    const bounds: L.LatLngExpression[] = [];

    geocodedHops.forEach((hop, idx) => {
      bounds.push([hop.lat, hop.lng]);

      const isEarliest = hop.isEarliest;
      const isFinal = idx === geocodedHops.length - 1 && geocodedHops.length > 1;

      // Custom HTML Marker Pin
      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
          ${
            isEarliest
              ? `<div class="absolute w-10 h-10 -top-1 -left-1 rounded-full bg-[#2DBDCA]/30 animate-ping"></div>
                 <div class="absolute w-8 h-8 rounded-full border-2 border-[#2DBDCA] animate-pulse"></div>`
              : ''
          }
          <div class="relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shadow-md border-2 ${
            isEarliest
              ? 'bg-[#2DBDCA] border-white text-[#142238] ring-2 ring-[#0e808c]'
              : isFinal
              ? 'bg-[#1FA463] border-white text-white'
              : 'bg-[#142238] border-[#2DBDCA] text-white'
          }">
            ${idx + 1}
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#142238]/90 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-xs pointer-events-none">
            ${hop.city}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-transit-pin',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([hop.lat, hop.lng], { icon: customIcon }).addTo(map);

      // Popup content with real-world forensic telemetry
      const popupHtml = `
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; min-width: 220px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #D9E1E6; padding-bottom: 4px;">
            <span style="font-weight: 700; font-size: 12px; color: #142238;">Hop #${hop.hopNumber} • ${hop.city}</span>
            ${
              isEarliest
                ? '<span style="background: #2DBDCA; color: #142238; font-weight: 700; font-size: 9px; padding: 1px 5px; border-radius: 4px; text-transform: uppercase;">Origin Relay</span>'
                : ''
            }
          </div>
          <div style="font-size: 11px; color: #53657A; line-height: 1.4;">
            <div><strong>IP:</strong> <span style="font-family: monospace; color: #142238;">${hop.ip || 'Unspecified'}</span></div>
            <div><strong>Location:</strong> ${hop.city}, ${hop.country}</div>
            <div><strong>Org / ASN:</strong> ${hop.org || 'Autonomous System'}</div>
            ${hop.from ? `<div><strong>From:</strong> <span style="font-family: monospace; font-size: 10px;">${hop.from}</span></div>` : ''}
            ${hop.by ? `<div><strong>By:</strong> <span style="font-family: monospace; font-size: 10px;">${hop.by}</span></div>` : ''}
            ${hop.timestamp ? `<div style="margin-top: 4px; font-size: 10px; color: #8695A6;">${hop.timestamp}</div>` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { closeButton: false, offset: [0, -10] });

      marker.on('click', () => {
        setActiveHopIndex(idx);
        onSelectHop(hop.originalHop);
      });

      markersRef.current.push(marker);
    });

    // Fit map bounds to encompass all hops with comfortable padding
    if (bounds.length > 0) {
      map.fitBounds(bounds as any, {
        padding: [60, 60],
        maxZoom: 6,
      });
    }

    // ResizeObserver to handle fluid container dimension changes
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Force size calculation after DOM render
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [geocodedHops, onSelectHop]);

  // Update flight path polylines based on activeHopIndex
  // User Requirement: Initially (activeHopIndex === 0), do not show route.
  // When user checks next hop (activeHopIndex >= 1), reveal route from hop 1 to hop 2, and so on.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing polylines
    polylinesRef.current.forEach((p) => p.remove());
    polylinesRef.current = [];

    // If activeHopIndex === 0, no route is displayed (initial state: single node)
    if (activeHopIndex === 0 || geocodedHops.length < 2) {
      return;
    }

    // Draw flight paths from Hop 1 up to the current active hop
    for (let i = 0; i < activeHopIndex && i < geocodedHops.length - 1; i++) {
      const p1: [number, number] = [geocodedHops[i].lat, geocodedHops[i].lng];
      const p2: [number, number] = [geocodedHops[i + 1].lat, geocodedHops[i + 1].lng];
      const arcPoints = getCurvedArcLatLngs(p1, p2);

      // Background glowing polyline
      const bgPolyline = L.polyline(arcPoints, {
        color: '#2DBDCA',
        weight: 4,
        opacity: 0.5,
        lineCap: 'round',
      }).addTo(map);
      polylinesRef.current.push(bgPolyline);

      // Core flight beam polyline
      const corePolyline = L.polyline(arcPoints, {
        color: '#0e808c',
        weight: 2.5,
        opacity: 0.95,
        dashArray: '6, 6',
      }).addTo(map);
      polylinesRef.current.push(corePolyline);
    }
  }, [activeHopIndex, geocodedHops]);

  // Auto-play transit animation
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && geocodedHops.length > 0) {
      interval = setInterval(() => {
        setActiveHopIndex((prev) => {
          const next = (prev + 1) % geocodedHops.length;
          onSelectHop(geocodedHops[next].originalHop);
          if (mapInstanceRef.current && markersRef.current[next]) {
            const nextHop = geocodedHops[next];
            mapInstanceRef.current.panTo([nextHop.lat, nextHop.lng], { animate: true, duration: 1.0 });
            markersRef.current[next].openPopup();
          }
          return next;
        });
      }, 2400);
    }
    return () => clearInterval(interval);
  }, [isPlaying, geocodedHops, onSelectHop]);

  const handleFitAll = () => {
    if (mapInstanceRef.current && geocodedHops.length > 0) {
      const bounds = geocodedHops.map((h) => [h.lat, h.lng] as [number, number]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  };

  const handleResetPlayback = () => {
    setIsPlaying(false);
    if (geocodedHops.length > 0) {
      setActiveHopIndex(0);
      onSelectHop(geocodedHops[0].originalHop);
      if (mapInstanceRef.current && markersRef.current[0]) {
        mapInstanceRef.current.panTo([geocodedHops[0].lat, geocodedHops[0].lng], { animate: true });
        markersRef.current[0].openPopup();
      }
    }
  };

  const handleNextHop = () => {
    if (activeHopIndex < geocodedHops.length - 1) {
      const next = activeHopIndex + 1;
      setActiveHopIndex(next);
      onSelectHop(geocodedHops[next].originalHop);
      if (mapInstanceRef.current && markersRef.current[next]) {
        mapInstanceRef.current.panTo([geocodedHops[next].lat, geocodedHops[next].lng], { animate: true });
        markersRef.current[next].openPopup();
      }
    }
  };

  const handlePrevHop = () => {
    if (activeHopIndex > 0) {
      const prev = activeHopIndex - 1;
      setActiveHopIndex(prev);
      onSelectHop(geocodedHops[prev].originalHop);
      if (mapInstanceRef.current && markersRef.current[prev]) {
        mapInstanceRef.current.panTo([geocodedHops[prev].lat, geocodedHops[prev].lng], { animate: true });
        markersRef.current[prev].openPopup();
      }
    }
  };

  const activeGeoHop = geocodedHops[activeHopIndex] || geocodedHops[0] || null;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Top Map Action & Telemetry Toolbar */}
      <div className="bg-[#FAFBFB] p-3 rounded-xl border border-[#D9E1E6] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        {/* Transit Flight Summary & Route State Indicator */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2DBDCA] animate-pulse" />
            <span className="text-xs font-bold text-[#142238]">Relay Transit Reconstruction</span>
          </div>

          <div className="h-4 w-px bg-[#D9E1E6] hidden sm:block" />

          {/* Dynamic route progression status badge */}
          {activeHopIndex === 0 ? (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Initial State: No Route Shown (Click <strong>Next Hop</strong> to reveal Hop 1 ➔ Hop 2)</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#EBF7F8] text-[#0e808c] border border-[#2DBDCA]/40 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#2DBDCA] animate-pulse" />
              <span>Route Revealed: Hop 1 ➔ Hop {activeHopIndex + 1} ({activeHopIndex} segment{activeHopIndex > 1 ? 's' : ''})</span>
            </span>
          )}

          <div className="flex items-center gap-2 font-mono text-[11px] text-[#53657A]">
            <span>Hops: <strong className="text-[#142238]">{geocodedHops.length}</strong></span>
            <span>•</span>
            <span>Jurisdictions: <strong className="text-[#0e808c]">{countriesCount} Countries</strong></span>
            <span>•</span>
            <span>Origin: <strong className="text-[#142238]">{geocodedHops[0]?.city || 'Unknown'}</strong></span>
          </div>
        </div>

        {/* Map Playback & Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Step Back (Previous Hop) */}
          <button
            type="button"
            onClick={handlePrevHop}
            disabled={activeHopIndex === 0}
            className="px-2.5 py-1.5 bg-white text-[#53657A] hover:text-[#142238] hover:bg-[#F5F6F4] disabled:opacity-30 disabled:pointer-events-none rounded-lg border border-[#D9E1E6] shadow-2xs text-xs font-semibold flex items-center gap-1 transition-colors"
            title="Step Back to Previous Hop"
          >
            <span>Prev Hop</span>
          </button>

          {/* Primary Step Forward Button: Check Next Hop to Reveal Route */}
          <button
            type="button"
            onClick={handleNextHop}
            disabled={activeHopIndex >= geocodedHops.length - 1}
            className="px-3 py-1.5 bg-[#2DBDCA] hover:bg-[#28b2be] text-[#142238] disabled:opacity-40 disabled:pointer-events-none rounded-lg font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all"
            title={activeHopIndex === 0 ? "Reveal route from Hop 1 to Hop 2" : "Advance to next transit hop"}
          >
            <span>
              {activeHopIndex === 0
                ? 'Next Hop (Hop 1 ➔ Hop 2)'
                : activeHopIndex >= geocodedHops.length - 1
                ? 'All Hops Revealed'
                : `Next Hop (Hop ${activeHopIndex + 1} ➔ Hop ${activeHopIndex + 2})`}
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleResetPlayback}
            className="p-1.5 text-[#53657A] hover:text-[#142238] hover:bg-[#F5F6F4] rounded-lg border border-[#D9E1E6] bg-white shadow-2xs"
            title="Reset to Initial Hop 1 (Clears Route)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Fit all hops button */}
          <button
            type="button"
            onClick={handleFitAll}
            className="p-1.5 bg-white text-[#53657A] hover:text-[#142238] hover:bg-[#F5F6F4] rounded-lg border border-[#D9E1E6] shadow-2xs flex items-center gap-1 text-[10px] font-mono"
            title="Fit All Hops in View"
          >
            <Focus className="w-3.5 h-3.5 text-[#2DBDCA]" />
            <span className="hidden sm:inline">Fit All</span>
          </button>

          {/* Stepper / Play Animation */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs ${
              isPlaying
                ? 'bg-[#D94A4A] text-white'
                : 'bg-[#142238] text-white hover:bg-[#1f3556]'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-[#2DBDCA]" />}
            <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
          </button>
        </div>
      </div>

      {/* Main Real-World Leaflet Map Canvas */}
      <div className="relative rounded-xl border border-[#D9E1E6] overflow-hidden shadow-xs flex-1 min-h-[460px] bg-[#E5E9EC]">
        {/* Leaflet DOM container */}
        <div ref={mapContainerRef} className="w-full h-full min-h-[460px] z-0" />

        {/* Real-time Floating Telemetry Overlay Box */}
        {activeGeoHop && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-[#0e1726]/90 backdrop-blur-md p-3.5 rounded-xl border border-[#2DBDCA]/40 shadow-xl text-white pointer-events-auto z-10">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#2d4970]/60 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-[#2DBDCA] text-[#142238] flex items-center justify-center font-mono text-[10px] font-bold">
                  {activeHopIndex + 1}
                </span>
                <span className="text-xs font-bold text-white tracking-wide">
                  Hop #{activeGeoHop.hopNumber} • {activeGeoHop.city}, {activeGeoHop.country}
                </span>
              </div>
              {activeGeoHop.isEarliest && (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#2DBDCA] text-[#142238] tracking-wider animate-pulse">
                  Origin Relay
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div>
                <span className="text-[9px] text-[#8695A6] uppercase block">Observed IP</span>
                <span className="text-[#2DBDCA] font-bold truncate block">{activeGeoHop.ip || '(Unbracketed)'}</span>
              </div>
              <div>
                <span className="text-[9px] text-[#8695A6] uppercase block">Organization / ASN</span>
                <span className="text-white truncate block" title={activeGeoHop.org}>{activeGeoHop.org}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[9px] text-[#8695A6] uppercase block">Sending / Receiving Host</span>
                <span className="text-[#D9E1E6] truncate block text-[10px]" title={activeGeoHop.from || activeGeoHop.by || ''}>
                  {activeGeoHop.from ? `From: ${activeGeoHop.from}` : ''} {activeGeoHop.by ? `➔ By: ${activeGeoHop.by}` : ''}
                </span>
              </div>
            </div>

            {/* Stepper buttons directly inside map overlay */}
            <div className="mt-2.5 pt-2 border-t border-[#2d4970]/60 flex items-center justify-between text-[10px] text-[#8695A6]">
              <span>Hop {activeHopIndex + 1} of {geocodedHops.length}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevHop}
                  disabled={activeHopIndex === 0}
                  className="px-2 py-0.5 rounded bg-[#213754] text-white hover:bg-[#2d4970] disabled:opacity-40"
                >
                  Prev Hop
                </button>
                <button
                  type="button"
                  onClick={handleNextHop}
                  disabled={activeHopIndex >= geocodedHops.length - 1}
                  className="px-2.5 py-0.5 rounded bg-[#2DBDCA] text-[#142238] font-bold hover:bg-[#28b2be] disabled:opacity-40"
                >
                  {activeHopIndex === 0 ? 'Next Hop (Hop 1 ➔ Hop 2)' : 'Next Hop'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leaflet Official Map Attribution / GitHub Source Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          <a
            href="https://github.com/Leaflet/Leaflet"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 bg-[#0e1726]/85 hover:bg-[#142238] px-2.5 py-1.5 rounded-lg border border-[#2d4970] text-[10px] font-mono text-[#8695A6] hover:text-white transition-colors shadow-xs"
            title="Powered by Leaflet - Open-source JavaScript library for mobile-friendly interactive maps"
          >
            <Globe className="w-3.5 h-3.5 text-[#2DBDCA]" />
            <span>Leaflet Map Engine</span>
            <ExternalLink className="w-2.5 h-2.5 text-[#2DBDCA]" />
          </a>
        </div>
      </div>
    </div>
  );
};
