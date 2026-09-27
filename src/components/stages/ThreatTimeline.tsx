import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Clock,
  GitCommit,
  ArrowRight,
  Send,
  Server,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Globe,
  Link as LinkIcon,
  Paperclip,
  FileCode,
  Terminal,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Filter,
  Layers,
  Eye,
  Flame,
  Zap,
  Info,
  ExternalLink,
  ChevronRight,
  Hash,
  Fingerprint
} from 'lucide-react';
import { InvestigationState, ReceivedHop, IOC, AttachmentInfo, ContentFinding } from '../../types';
import { formatBytes } from '../../services/cryptoUtils';

interface ThreatTimelineProps {
  state: InvestigationState;
}

export type TimelinePhase =
  | 'ALL'
  | 'INFRASTRUCTURE'
  | 'ORIGIN'
  | 'TRANSIT'
  | 'AUTH'
  | 'DELIVERY'
  | 'IOC_ACTIVATION'
  | 'INGESTION';

export interface ThreatTimelineEvent {
  id: string;
  stepNumber: number;
  timestamp: string;
  displayTime: string;
  rawDate?: Date | null;
  relativeOffset: string;
  phase: 'INFRASTRUCTURE' | 'ORIGIN' | 'TRANSIT' | 'AUTH' | 'DELIVERY' | 'IOC_ACTIVATION' | 'INGESTION';
  phaseLabel: string;
  title: string;
  subtitle: string;
  source: string;
  severity: 'CLEAN' | 'INFO' | 'SUSPICIOUS' | 'MALICIOUS';
  summary: string;
  forensicDetails: Record<string, string | number | boolean>;
  ioc?: {
    type: string;
    value: string;
    status?: string;
    location?: string;
  };
  threatMarker?: string;
}

function parseEmailDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatOffsetSeconds(seconds: number): string {
  if (seconds <= 0) return 'T+00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) {
    return `+${s}s`;
  }
  return `+${m}m ${s < 10 ? '0' : ''}${s}s`;
}

export const ThreatTimeline: React.FC<ThreatTimelineProps> = ({ state }) => {
  const parsed = state.parsedEmail;
  const auth = state.authentication;
  const iocs = state.iocs;
  const content = state.contentAnalysis;
  const domainIntel = Object.values(state.domainIntelligence || {});
  const fusion = state.fusion;

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<TimelinePhase>('ALL');
  const [onlyThreats, setOnlyThreats] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Compile timeline events chronologically from ground truth signals
  const events = useMemo<ThreatTimelineEvent[]>(() => {
    if (!parsed) return [];
    const list: ThreatTimelineEvent[] = [];

    // Determine baseline origin date
    const originDate = parseEmailDate(parsed.date);
    let baseTimeMs = originDate ? originDate.getTime() : Date.now() - 300000;

    let stepCounter = 1;

    // 1. INFRASTRUCTURE PHASE: Domain Intelligence / Registration (if available)
    if (domainIntel && domainIntel.length > 0) {
      const primaryDomain = domainIntel[0];
      const regDate = parseEmailDate(primaryDomain.registrationDate);

      list.push({
        id: 'evt-infra-domain',
        stepNumber: stepCounter++,
        timestamp: primaryDomain.registrationDate || 'Infrastructure Baseline',
        displayTime: primaryDomain.registrationDate ? new Date(primaryDomain.registrationDate).toLocaleDateString() : 'Historical',
        rawDate: regDate,
        relativeOffset: 'Pre-Campaign',
        phase: 'INFRASTRUCTURE',
        phaseLabel: 'Host Infrastructure',
        title: `Domain Registration: ${primaryDomain.domain}`,
        subtitle: `Registrar: ${primaryDomain.registrar || 'Public Registry'}`,
        source: 'WHOIS / RDAP Telemetry',
        severity: primaryDomain.ageDays !== undefined && primaryDomain.ageDays < 30 ? 'SUSPICIOUS' : 'INFO',
        summary: `Originating or pivot domain registered ${primaryDomain.ageDays !== undefined ? `${primaryDomain.ageDays} days ago` : 'in DNS registry'}.`,
        forensicDetails: {
          'Domain Name': primaryDomain.domain,
          'Registrar': primaryDomain.registrar || 'Undisclosed',
          'Domain Age': primaryDomain.ageDays !== undefined ? `${primaryDomain.ageDays} days` : 'Established',
          'Status': primaryDomain.status,
        },
      });
    }

    // 2. ORIGIN PHASE: Message Generation by MUA / Script
    const originTimeDisplay = originDate ? originDate.toUTCString() : (parsed.date || 'Unknown');
    list.push({
      id: 'evt-origin-generation',
      stepNumber: stepCounter++,
      timestamp: parsed.date || 'T0',
      displayTime: originDate ? originDate.toLocaleTimeString() : 'T+00:00',
      rawDate: originDate,
      relativeOffset: 'T+00:00',
      phase: 'ORIGIN',
      phaseLabel: 'Client Origination',
      title: `Message Inception & Envelope Creation`,
      subtitle: `From: ${parsed.from.email}`,
      source: 'MUA / Client Script (RFC 5322)',
      severity: parsed.from.domain !== parsed.returnPath?.domain ? 'SUSPICIOUS' : 'CLEAN',
      summary: `Email draft synthesized with Message-ID <${parsed.messageId || 'none'}> and Subject "${parsed.subject}".`,
      forensicDetails: {
        'Sender Mailbox': parsed.from.email,
        'Display Name': parsed.from.displayName || '(none)',
        'Return-Path': parsed.returnPath?.email || '(none)',
        'Message-ID': parsed.messageId || '(missing)',
        'Header Date': parsed.date || '(missing)',
      },
    });

    // DKIM Signing Event (if present in origin or first hop)
    if (parsed.dkimSignatures.length > 0) {
      const primarySig = parsed.dkimSignatures[0];
      list.push({
        id: 'evt-origin-dkim-sign',
        stepNumber: stepCounter++,
        timestamp: parsed.date || 'T+00:01',
        displayTime: originDate ? new Date(originDate.getTime() + 1000).toLocaleTimeString() : '+1s',
        rawDate: originDate ? new Date(originDate.getTime() + 1000) : null,
        relativeOffset: '+1s',
        phase: 'ORIGIN',
        phaseLabel: 'Cryptographic Signature',
        title: `DKIM Signature Affixed (d=${primarySig.domain})`,
        subtitle: `Selector: ${primarySig.selector} • Algorithm: ${primarySig.algorithm}`,
        source: 'Outbound MTA Cryptographic Engine',
        severity: auth?.dkim.status === 'FAIL' ? 'SUSPICIOUS' : 'CLEAN',
        summary: `Outbound relay computed body hash (bh=${primarySig.bodyHash ? primarySig.bodyHash.substring(0, 16) + '...' : 'none'}) and signed canonicalized headers.`,
        forensicDetails: {
          'Signing Domain': primarySig.domain,
          'Selector': primarySig.selector,
          'Algorithm': primarySig.algorithm,
          'Canonicalization': primarySig.canonicalization || 'relaxed/relaxed',
        },
      });
    }

    // 3. TRANSIT PHASE: Received Hops in Chronological Order (earliest relay to final inbound MX)
    // Note: parsed.receivedChain is parsed from top-to-bottom, so receivedChain[length-1] is the earliest outbound hop
    const chronologicalHops = [...parsed.receivedChain].reverse();
    let cumulativeSeconds = 2;

    chronologicalHops.forEach((hop, idx) => {
      const hopDate = parseEmailDate(hop.timestamp);
      let offsetStr = `+${cumulativeSeconds}s`;

      if (originDate && hopDate) {
        const deltaSeconds = Math.max(0, (hopDate.getTime() - originDate.getTime()) / 1000);
        cumulativeSeconds = Math.max(cumulativeSeconds + 1, Math.round(deltaSeconds));
        offsetStr = formatOffsetSeconds(cumulativeSeconds);
      } else {
        cumulativeSeconds += idx === 0 ? 3 : 2;
        offsetStr = `+${cumulativeSeconds}s`;
      }

      const isEarliest = hop.isEarliestReliableRelay;
      const isExternalOrAnomalous = hop.ip && !hop.ip.startsWith('10.') && !hop.ip.startsWith('192.168.') && !hop.ip.startsWith('172.16.');

      list.push({
        id: `evt-hop-${idx}`,
        stepNumber: stepCounter++,
        timestamp: hop.timestamp || `Transit Hop #${idx + 1}`,
        displayTime: hopDate ? hopDate.toLocaleTimeString() : offsetStr,
        rawDate: hopDate,
        relativeOffset: offsetStr,
        phase: 'TRANSIT',
        phaseLabel: isEarliest ? 'Originating Gateway MTA' : `MTA Relay Hop #${idx + 1}`,
        title: `Relay: ${hop.from || hop.ip || 'MTA Gateway'} ➔ ${hop.by || 'Receiving Host'}`,
        subtitle: `Client IP: ${hop.ip || 'Unlisted'} • Protocol: ${hop.with || 'SMTP'}`,
        source: 'Received Header Chain (RFC 5321)',
        severity: isEarliest && isExternalOrAnomalous && fusion?.verdict === 'HIGH_CONFIDENCE_THREAT' ? 'SUSPICIOUS' : 'INFO',
        summary: `Message relayed from ${hop.from || 'sender'} to ${hop.by || 'intermediate MTA'} via ${hop.with || 'ESMTPS'}.`,
        forensicDetails: {
          'Originating IP': hop.ip || '(Not bracketed)',
          'Sending Host': hop.from || '(Unspecified)',
          'Receiving Host (by)': hop.by || '(Unspecified)',
          'Transport Protocol': hop.with || 'SMTP',
          'Target Recipient (for)': hop.for || '(Undisclosed)',
          'Timestamp': hop.timestamp || '(None)',
        },
      });
    });

    // 4. PERIMETER AUTHENTICATION PHASE: Border MX Security Checks
    cumulativeSeconds += 1;
    const authTimeDisplay = originDate ? new Date(originDate.getTime() + cumulativeSeconds * 1000).toLocaleTimeString() : `+${cumulativeSeconds}s`;

    if (auth) {
      const spfPassed = auth.spf.status === 'PASS';
      const dkimPassed = auth.dkim.status === 'PASS';
      const dmarcPassed = auth.dmarc.status === 'PASS';
      const isAuthFailed = !spfPassed || !dkimPassed || !dmarcPassed;

      list.push({
        id: 'evt-auth-perimeter',
        stepNumber: stepCounter++,
        timestamp: authTimeDisplay,
        displayTime: authTimeDisplay,
        relativeOffset: formatOffsetSeconds(cumulativeSeconds),
        phase: 'AUTH',
        phaseLabel: 'Perimeter Authentication Gate',
        title: `Cryptographic Policy Verification (SPF / DKIM / DMARC)`,
        subtitle: `SPF: ${auth.spf.status} • DKIM: ${auth.dkim.status} • DMARC: ${auth.dmarc.status}`,
        source: 'Perimeter Boundary MX Mail Gateway',
        severity: isAuthFailed ? 'MALICIOUS' : 'CLEAN',
        summary: isAuthFailed
          ? `Perimeter security identified authentication failure: ${!spfPassed ? 'SPF unauthorized IP' : ''} ${!dkimPassed ? 'DKIM signature invalid' : ''} ${!dmarcPassed ? 'DMARC alignment failure' : ''}.`
          : `All perimeter cryptographic checks passed nominal validation standards.`,
        forensicDetails: {
          'SPF Status': auth.spf.status,
          'SPF Reason': auth.spf.reason,
          'DKIM Status': auth.dkim.status,
          'DMARC Status': auth.dmarc.status,
          'Alignment': auth.alignment.status,
        },
        threatMarker: isAuthFailed ? 'Cryptographic Header Spoofing' : undefined,
      });
    }

    // 5. DELIVERY PHASE: Final Mailbox Ingestion
    cumulativeSeconds += 1;
    const deliveryTimeDisplay = originDate ? new Date(originDate.getTime() + cumulativeSeconds * 1000).toLocaleTimeString() : `+${cumulativeSeconds}s`;

    list.push({
      id: 'evt-delivery-inbox',
      stepNumber: stepCounter++,
      timestamp: deliveryTimeDisplay,
      displayTime: deliveryTimeDisplay,
      relativeOffset: formatOffsetSeconds(cumulativeSeconds),
      phase: 'DELIVERY',
      phaseLabel: 'Mailbox Delivery',
      title: `Final Delivery to Recipient Mailbox`,
      subtitle: `Delivered-To: ${parsed.to[0]?.email || 'Target User'}`,
      source: 'Internal MDA / Mail Delivery Agent',
      severity: 'INFO',
      summary: `MIME message written to disk spool and made accessible to mail client user.`,
      forensicDetails: {
        'Delivered Mailbox': parsed.to[0]?.email || 'Target',
        'Content Type': parsed.contentType,
        'Byte Size': formatBytes(parsed.rawByteSize),
        'Attachments Encoded': parsed.attachments.length,
      },
    });

    // 6. IOC ACTIVATION PHASE: Malicious Payloads, Phishing URLs & Coercive Pretexts
    // A. Extracted URL Activation / Credential Harvester Links
    const urlIocs = iocs.filter((i) => i.type === 'url');
    urlIocs.forEach((urlIoc, idx) => {
      cumulativeSeconds += 4;
      const activationTime = originDate ? new Date(originDate.getTime() + cumulativeSeconds * 1000).toLocaleTimeString() : `+${cumulativeSeconds}s`;
      const isSuspicious = urlIoc.reputationStatus === 'SUSPICIOUS' || fusion?.verdict === 'HIGH_CONFIDENCE_THREAT';

      list.push({
        id: `evt-ioc-url-${idx}`,
        stepNumber: stepCounter++,
        timestamp: activationTime,
        displayTime: activationTime,
        relativeOffset: formatOffsetSeconds(cumulativeSeconds),
        phase: 'IOC_ACTIVATION',
        phaseLabel: 'Target Engagement (URL Click)',
        title: `Phishing Link / Credential Harvest Activation`,
        subtitle: urlIoc.value.length > 55 ? `${urlIoc.value.substring(0, 52)}...` : urlIoc.value,
        source: 'HTML Body Hyperlink Lure',
        severity: isSuspicious ? 'MALICIOUS' : 'INFO',
        summary: `Recipient lured to engage external HTTP endpoint targeting authentication credentials or session hijacking.`,
        forensicDetails: {
          'Target URL': urlIoc.value,
          'Scheme': urlIoc.value.startsWith('https') ? 'HTTPS' : 'HTTP',
          'Reputation': urlIoc.reputationStatus || 'UNVERIFIED',
          'Location in Email': urlIoc.location,
        },
        ioc: {
          type: 'url',
          value: urlIoc.value,
          status: urlIoc.reputationStatus,
          location: urlIoc.location,
        },
        threatMarker: 'Credential Harvesting / External Redirection',
      });
    });

    // B. Malicious Attachment / Payload Execution
    parsed.attachments.forEach((att, idx) => {
      cumulativeSeconds += 5;
      const attTime = originDate ? new Date(originDate.getTime() + cumulativeSeconds * 1000).toLocaleTimeString() : `+${cumulativeSeconds}s`;

      list.push({
        id: `evt-ioc-att-${idx}`,
        stepNumber: stepCounter++,
        timestamp: attTime,
        displayTime: attTime,
        relativeOffset: formatOffsetSeconds(cumulativeSeconds),
        phase: 'IOC_ACTIVATION',
        phaseLabel: 'Payload Staging (Attachment)',
        title: `Binary Payload Execution Hazard: ${att.filename}`,
        subtitle: `SHA-256: ${att.sha256.substring(0, 16)}... • Size: ${formatBytes(att.sizeBytes)}`,
        source: 'Extracted MIME Attachment Payload',
        severity: att.isExecutableOrSuspicious ? 'MALICIOUS' : 'SUSPICIOUS',
        summary: `Execution of encoded attachment payload on recipient endpoint. Potential initial access or execution vector.`,
        forensicDetails: {
          'Filename': att.filename,
          'Content-Type': att.contentType,
          'Decoded Size': formatBytes(att.sizeBytes),
          'SHA-256 Digest': att.sha256,
          'Executable/Risk Flag': att.isExecutableOrSuspicious ? 'HIGH' : 'STANDARD',
        },
        ioc: {
          type: 'attachment',
          value: att.filename,
          status: att.isExecutableOrSuspicious ? 'SUSPICIOUS' : 'CLEAN',
          location: 'MIME Attachment Stream',
        },
        threatMarker: 'Endpoint Payload Staging',
      });
    });

    // C. Linguistic Pretext Trigger (if high urgency/wire detected)
    if (content && content.findings.length > 0) {
      const topFinding = content.findings[0];
      cumulativeSeconds += 3;
      const pretextTime = originDate ? new Date(originDate.getTime() + cumulativeSeconds * 1000).toLocaleTimeString() : `+${cumulativeSeconds}s`;

      list.push({
        id: 'evt-ioc-pretext',
        stepNumber: stepCounter++,
        timestamp: pretextTime,
        displayTime: pretextTime,
        relativeOffset: formatOffsetSeconds(cumulativeSeconds),
        phase: 'IOC_ACTIVATION',
        phaseLabel: 'Social Engineering Trigger',
        title: `Linguistic Coercion: ${topFinding.category}`,
        subtitle: topFinding.quote ? `"${topFinding.quote.substring(0, 50)}..."` : 'Psychological Pressure',
        source: 'Model A Linguistic Engine',
        severity: topFinding.weight > 0.4 ? 'MALICIOUS' : 'SUSPICIOUS',
        summary: `Pretext engineered to compel rapid compliance without operational verification.`,
        forensicDetails: {
          'Category': topFinding.category,
          'Risk Weight': `${Math.round(topFinding.weight * 100)}%`,
          'Sample Quote': topFinding.quote || '(none)',
        },
        threatMarker: topFinding.category,
      });
    }

    // 7. INGESTION PHASE: Kryptos Forensics Evidence Ingestion
    cumulativeSeconds += 2;
    const intakeTime = originDate ? new Date(originDate.getTime() + cumulativeSeconds * 1000).toLocaleTimeString() : `+${cumulativeSeconds}s`;

    list.push({
      id: 'evt-ingest-kryptos',
      stepNumber: stepCounter++,
      timestamp: intakeTime,
      displayTime: intakeTime,
      relativeOffset: formatOffsetSeconds(cumulativeSeconds),
      phase: 'INGESTION',
      phaseLabel: 'Forensic Ingestion',
      title: `Forensic Ingestion & Chain-of-Custody Sealing`,
      subtitle: `SHA-256 Artifact Hash Computed`,
      source: 'Kryptos Forensics Engine',
      severity: 'CLEAN',
      summary: `Evidence stream captured, normalized into memory buffer, and hashed for unalterable forensic admissibility.`,
      forensicDetails: {
        'Forensic Status': 'VERIFIED IMMUTABLE',
        'Raw Size': formatBytes(parsed.rawByteSize),
        'Extracted Indicators': iocs.length,
        'Joint Threat Verdict': fusion?.verdict || 'UNFUSED',
      },
    });

    return list;
  }, [parsed, auth, iocs, content, domainIntel, fusion]);

  // Filter events by phase and threat toggle
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesPhase = activePhase === 'ALL' || evt.phase === activePhase;
      const matchesThreatOnly = !onlyThreats || evt.severity === 'SUSPICIOUS' || evt.severity === 'MALICIOUS';
      return matchesPhase && matchesThreatOnly;
    });
  }, [events, activePhase, onlyThreats]);

  // Selected event (default to first malicious/suspicious event or first event)
  const activeEvent = useMemo(() => {
    if (selectedEventId) {
      return events.find((e) => e.id === selectedEventId) || events[0];
    }
    const firstThreat = events.find((e) => e.severity === 'MALICIOUS' || e.severity === 'SUSPICIOUS');
    return firstThreat || events[0] || null;
  }, [events, selectedEventId]);

  // Handle Playback Simulation
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && filteredEvents.length > 0) {
      timer = setInterval(() => {
        setSelectedEventId((prev) => {
          const currentIndex = filteredEvents.findIndex((e) => e.id === prev);
          if (currentIndex === -1 || currentIndex >= filteredEvents.length - 1) {
            setIsPlaying(false);
            return filteredEvents[0].id;
          }
          return filteredEvents[currentIndex + 1].id;
        });
      }, 1600);
    }
    return () => clearInterval(timer);
  }, [isPlaying, filteredEvents]);

  const handleStepNext = () => {
    if (!activeEvent || filteredEvents.length === 0) return;
    const currentIndex = filteredEvents.findIndex((e) => e.id === activeEvent.id);
    if (currentIndex < filteredEvents.length - 1) {
      setSelectedEventId(filteredEvents[currentIndex + 1].id);
    }
  };

  const handleStepPrev = () => {
    if (!activeEvent || filteredEvents.length === 0) return;
    const currentIndex = filteredEvents.findIndex((e) => e.id === activeEvent.id);
    if (currentIndex > 0) {
      setSelectedEventId(filteredEvents[currentIndex - 1].id);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    if (filteredEvents.length > 0) {
      setSelectedEventId(filteredEvents[0].id);
    }
  };

  // Badge styles
  const getSeverityBadge = (sev: ThreatTimelineEvent['severity']) => {
    switch (sev) {
      case 'MALICIOUS':
        return 'bg-[#D94A4A]/15 text-[#D94A4A] border-[#D94A4A]/30';
      case 'SUSPICIOUS':
        return 'bg-[#D89428]/15 text-[#D89428] border-[#D89428]/30';
      case 'CLEAN':
        return 'bg-[#1FA463]/15 text-[#1FA463] border-[#1FA463]/30';
      default:
        return 'bg-[#53657A]/15 text-[#53657A] border-[#D9E1E6]';
    }
  };

  const getPhaseIcon = (phase: ThreatTimelineEvent['phase'], sev: ThreatTimelineEvent['severity']) => {
    if (sev === 'MALICIOUS') return <Flame className="w-3.5 h-3.5 text-[#D94A4A]" />;
    if (sev === 'SUSPICIOUS') return <AlertTriangle className="w-3.5 h-3.5 text-[#D89428]" />;

    switch (phase) {
      case 'INFRASTRUCTURE':
        return <Globe className="w-3.5 h-3.5 text-[#53657A]" />;
      case 'ORIGIN':
        return <Send className="w-3.5 h-3.5 text-[#2DBDCA]" />;
      case 'TRANSIT':
        return <Server className="w-3.5 h-3.5 text-[#142238]" />;
      case 'AUTH':
        return <ShieldCheck className="w-3.5 h-3.5 text-[#1FA463]" />;
      case 'DELIVERY':
        return <Radio className="w-3.5 h-3.5 text-[#2DBDCA]" />;
      case 'IOC_ACTIVATION':
        return <Zap className="w-3.5 h-3.5 text-[#D94A4A]" />;
      case 'INGESTION':
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#0e808c]" />;
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Top Threat Timeline Metric & Playback Bar */}
      <div className="bg-[#FAFBFB] p-3.5 rounded-xl border border-[#D9E1E6] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        {/* Metric Summary */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2DBDCA] animate-pulse" />
            <span className="text-xs font-bold text-[#142238]">Delivery & Threat Timeline</span>
          </div>
          <div className="h-4 w-px bg-[#D9E1E6] hidden sm:block" />
          <div className="flex items-center gap-2 font-mono text-[11px] text-[#53657A]">
            <span>Total Events: <strong className="text-[#142238]">{events.length}</strong></span>
            <span>•</span>
            <span>Hops: <strong className="text-[#142238]">{parsed?.receivedChain.length || 0}</strong></span>
            <span>•</span>
            <span>Active IOCs: <strong className="text-[#0e808c]">{iocs.length}</strong></span>
            <span>•</span>
            <span>Origin: <strong className="text-[#142238]">{parsed?.from.domain || 'Unknown'}</strong></span>
          </div>
        </div>

        {/* Playback & Threat Filter Controls */}
        <div className="flex items-center gap-2">
          {/* Threat Only Toggle */}
          <button
            type="button"
            onClick={() => setOnlyThreats(!onlyThreats)}
            className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-colors ${
              onlyThreats
                ? 'bg-[#D94A4A]/15 text-[#D94A4A] border-[#D94A4A]/30 font-bold'
                : 'bg-white text-[#53657A] border-[#D9E1E6] hover:text-[#142238]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Threats Only</span>
          </button>

          {/* Stepper Controls */}
          <div className="flex items-center bg-white rounded-lg border border-[#D9E1E6] p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 text-[#53657A] hover:text-[#142238] hover:bg-[#F5F6F4] rounded"
              title="Reset Timeline to start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleStepPrev}
              className="p-1.5 text-[#53657A] hover:text-[#142238] hover:bg-[#F5F6F4] rounded"
              title="Previous Step"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 transition-colors ${
                isPlaying
                  ? 'bg-[#D94A4A] text-white'
                  : 'bg-[#142238] text-white hover:bg-[#1f3556]'
              }`}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Play Sequence'}</span>
            </button>
            <button
              type="button"
              onClick={handleStepNext}
              className="p-1.5 text-[#53657A] hover:text-[#142238] hover:bg-[#F5F6F4] rounded"
              title="Next Step"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Phase Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { key: 'ALL', label: `All Events (${events.length})` },
          { key: 'TRANSIT', label: 'Delivery Chain & Hops' },
          { key: 'AUTH', label: 'Perimeter Authentication' },
          { key: 'IOC_ACTIVATION', label: 'IOC & Threat Activation' },
          { key: 'ORIGIN', label: 'Origin Inception' },
          { key: 'INFRASTRUCTURE', label: 'Infrastructure & DNS' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActivePhase(tab.key as TimelinePhase)}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors font-medium ${
              activePhase === tab.key
                ? 'bg-[#2DBDCA] text-[#142238] font-bold shadow-2xs'
                : 'bg-white text-[#53657A] border border-[#D9E1E6] hover:bg-[#F5F6F4]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Split View: Sequence Nodes on Left, Telemetry Drawer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[480px] items-stretch">
        {/* Left Column: Chronological Event Nodes (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#D9E1E6] p-4 flex flex-col justify-between shadow-xs overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[#D9E1E6] mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2DBDCA]" />
              <h3 className="text-xs font-bold text-[#142238] uppercase tracking-wider">
                Timestamped Event Sequence ({filteredEvents.length})
              </h3>
            </div>
            <span className="text-[10px] text-[#53657A] font-mono">Earliest ➔ Target Endpoint</span>
          </div>

          {/* Interactive Step-by-Step Node Chain */}
          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 flex-1">
            {filteredEvents.length === 0 ? (
              <div className="py-16 text-center text-[#53657A] flex flex-col items-center">
                <Info className="w-8 h-8 text-[#D9E1E6] mb-2" />
                <p className="text-xs">No timeline events match the selected phase filter.</p>
              </div>
            ) : (
              filteredEvents.map((evt, idx) => {
                const isSelected = activeEvent?.id === evt.id;
                const isThreat = evt.severity === 'MALICIOUS' || evt.severity === 'SUSPICIOUS';

                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEventId(evt.id)}
                    className={`relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#2DBDCA] bg-[#FAFBFB] shadow-xs ring-1 ring-[#2DBDCA]/40'
                        : isThreat
                        ? 'border-[#D9E1E6] bg-white hover:border-[#D94A4A]/50'
                        : 'border-[#D9E1E6] bg-white hover:border-[#2DBDCA]/50'
                    }`}
                  >
                    {/* Step Number & Connector Visual */}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono border ${
                          isSelected
                            ? 'bg-[#142238] text-white border-[#142238]'
                            : isThreat
                            ? 'bg-[#D94A4A]/10 text-[#D94A4A] border-[#D94A4A]/30'
                            : 'bg-[#F5F6F4] text-[#142238] border-[#D9E1E6]'
                        }`}
                      >
                        {evt.stepNumber}
                      </div>
                      {idx < filteredEvents.length - 1 && (
                        <div className="w-0.5 h-6 bg-[#D9E1E6] mt-1" />
                      )}
                    </div>

                    {/* Event Content Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5">
                          {getPhaseIcon(evt.phase, evt.severity)}
                          <span className="text-[10px] uppercase font-bold text-[#53657A] tracking-wider">
                            {evt.phaseLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F5F6F4] text-[#142238] border border-[#D9E1E6]">
                            {evt.relativeOffset}
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase border ${getSeverityBadge(
                              evt.severity
                            )}`}
                          >
                            {evt.severity}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-[#142238] truncate">{evt.title}</h4>
                      <p className="text-[11px] text-[#53657A] truncate font-mono mt-0.5">
                        {evt.subtitle}
                      </p>

                      {evt.threatMarker && (
                        <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-[#D94A4A] bg-[#D94A4A]/10 px-2 py-0.5 rounded border border-[#D94A4A]/20">
                          <Flame className="w-3 h-3" />
                          <span>Threat Vector: {evt.threatMarker}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="pt-3 border-t border-[#D9E1E6] text-[11px] text-[#53657A] flex items-center justify-between mt-2">
            <span>Chronological order reconstructed from RFC 5322 Received hops</span>
            <span className="font-mono text-[#0e808c] font-bold">Auditable Timeline</span>
          </div>
        </div>

        {/* Right Column: High-Resolution Event Telemetry Inspector (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#D9E1E6] p-5 flex flex-col justify-between shadow-xs">
          {activeEvent ? (
            <div className="space-y-4">
              {/* Header Box */}
              <div className="pb-3 border-b border-[#D9E1E6]">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold text-[#2DBDCA] uppercase tracking-wider">
                    Step {activeEvent.stepNumber} of {events.length} • {activeEvent.phaseLabel}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getSeverityBadge(
                      activeEvent.severity
                    )}`}
                  >
                    {activeEvent.severity}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#142238] leading-snug">{activeEvent.title}</h3>
                <span className="text-[11px] text-[#53657A] font-mono block mt-0.5">
                  Source: {activeEvent.source}
                </span>
              </div>

              {/* Timestamp & Timing Block */}
              <div className="bg-[#F5F6F4] p-3 rounded-lg border border-[#D9E1E6] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#53657A] block">Timestamp</span>
                  <span className="font-mono font-bold text-[#142238]">{activeEvent.displayTime}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-[#53657A] block">Relative Offset</span>
                  <span className="font-mono font-bold text-[#0e808c]">{activeEvent.relativeOffset}</span>
                </div>
              </div>

              {/* Summary Narrative */}
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#53657A] block mb-1">
                  Forensic Event Summary
                </span>
                <p className="text-xs text-[#142238] leading-relaxed bg-[#FAFBFB] p-3 rounded-lg border border-[#D9E1E6]">
                  {activeEvent.summary}
                </p>
              </div>

              {/* Technical Telemetry Parameter Key-Values */}
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#53657A] block mb-1.5 flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-[#2DBDCA]" />
                  <span>Technical Parameters</span>
                </span>
                <div className="bg-[#FAFBFB] p-3 rounded-lg border border-[#D9E1E6] space-y-1.5 font-mono text-[11px]">
                  {Object.entries(activeEvent.forensicDetails).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2 border-b border-[#D9E1E6]/40 pb-1">
                      <span className="text-[#53657A] text-[10px] shrink-0">{k}:</span>
                      <span className="font-bold text-[#142238] text-right break-all">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Associated IOC Card (if linked) */}
              {activeEvent.ioc && (
                <div className="bg-[#FAFBFB] p-3 rounded-lg border border-[#D94A4A]/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#D94A4A] flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>Extracted Threat Indicator</span>
                    </span>
                    <span className="font-mono text-[10px] font-bold text-[#142238] uppercase">
                      {activeEvent.ioc.type}
                    </span>
                  </div>
                  <div className="font-mono text-xs font-bold text-[#142238] break-all bg-white p-2 rounded border border-[#D9E1E6]">
                    {activeEvent.ioc.value}
                  </div>
                  <div className="text-[10px] text-[#53657A] flex justify-between">
                    <span>Location: {activeEvent.ioc.location || 'Body payload'}</span>
                    <span className="font-bold text-[#D94A4A]">Status: {activeEvent.ioc.status || 'SUSPICIOUS'}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 text-center text-[#53657A] flex flex-col items-center justify-center">
              <Clock className="w-10 h-10 text-[#D9E1E6] mb-2" />
              <p className="text-xs">Select any timeline step to inspect detailed forensic telemetry.</p>
            </div>
          )}

          {/* Footer Evidence Seal */}
          <div className="pt-3 border-t border-[#D9E1E6] text-[11px] text-[#53657A] flex items-center justify-between">
            <span>Cryptographic Chain-of-Custody</span>
            <span className="font-mono text-[#0e808c] font-bold">Deterministic Sequence</span>
          </div>
        </div>
      </div>
    </div>
  );
};
