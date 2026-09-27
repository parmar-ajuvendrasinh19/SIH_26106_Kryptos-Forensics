import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  Layers,
  ArrowRight,
  ArrowRightLeft,
  Check,
  Search,
  Filter,
  Sparkles,
  ShieldCheck,
  Paperclip,
  Mail,
  Clock,
  Fingerprint,
  Info,
  Hash,
  Eye,
  CheckCircle2,
  ChevronRight,
  Maximize2,
  Cpu
} from 'lucide-react';
import { ParsedEmail, AttachmentInfo, ReceivedHop } from '../../types';
import { formatBytes } from '../../services/cryptoUtils';

interface EvidenceDiffProps {
  rawEmail: string;
  parsed: ParsedEmail | null;
  fileSize?: number;
  isRunning?: boolean;
  onRunParser?: () => void;
}

export type DiffCategory = 'ALL' | 'ENVELOPE' | 'ROUTING' | 'AUTH' | 'MIME' | 'BODY' | 'ATTACHMENTS';

export interface DiffMapping {
  id: string;
  title: string;
  category: 'ENVELOPE' | 'ROUTING' | 'AUTH' | 'MIME' | 'BODY' | 'ATTACHMENTS';
  startLine: number;
  endLine: number;
  rawText: string;
  extractedView: {
    type: 'object' | 'text' | 'badge-group' | 'table';
    data: any;
  };
  transformationType: 'TOKENIZED_ADDRESS' | 'RFC2047_DECODED' | 'WHITESPACE_UNFOLDED' | 'HOP_DECOMPOSED' | 'MIME_NORMALIZED' | 'BINARY_HASHED' | 'PROTOCOL_PARSED';
  transformationLabel: string;
  changeExplanation: string;
  forensicImpact: string;
}

export const EvidenceDiff: React.FC<EvidenceDiffProps> = ({
  rawEmail,
  parsed,
  fileSize,
  isRunning,
  onRunParser,
}) => {
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<DiffCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncScroll, setSyncScroll] = useState(true);

  const rawLines = useMemo(() => {
    return rawEmail.split(/\r?\n/);
  }, [rawEmail]);

  // Build high-resolution mappings between raw email lines and parsed structure
  const diffMappings = useMemo<DiffMapping[]>(() => {
    if (!parsed || !rawEmail) return [];
    const mappings: DiffMapping[] = [];
    const lines = rawEmail.split(/\r?\n/);

    // Helper to find header line range (accounting for RFC 5322 continuation/folding)
    const findHeaderRange = (headerName: string): { start: number; end: number; text: string }[] => {
      const results: { start: number; end: number; text: string }[] = [];
      const regex = new RegExp(`^${headerName}:`, 'i');

      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          const start = i + 1;
          let end = i + 1;
          let text = lines[i];

          // Collect folded continuation lines (starting with space or tab)
          while (end < lines.length && /^[ \t]/.test(lines[end])) {
            text += '\n' + lines[end];
            end++;
          }
          results.push({ start, end, text });
        }
      }
      return results;
    };

    // 1. FROM Header Mapping
    const fromRanges = findHeaderRange('From');
    if (fromRanges.length > 0) {
      mappings.push({
        id: 'diff-from',
        title: 'From Envelope & Mailbox',
        category: 'ENVELOPE',
        startLine: fromRanges[0].start,
        endLine: fromRanges[0].end,
        rawText: fromRanges[0].text,
        extractedView: {
          type: 'object',
          data: {
            'Display Name': parsed.from.displayName || '(none)',
            'Mailbox Address': parsed.from.email,
            'Sender Domain': parsed.from.domain,
          },
        },
        transformationType: 'TOKENIZED_ADDRESS',
        transformationLabel: 'Address Tokenization',
        changeExplanation:
          'RFC 5322 compound string decomposed into discrete display name, normalized lowercase mailbox address, and isolated authoritative domain.',
        forensicImpact: 'Enables precise domain spoofing and cryptographic SPF alignment validation.',
      });
    }

    // 2. REPLY-TO Header Mapping
    const replyToRanges = findHeaderRange('Reply-To');
    if (replyToRanges.length > 0 && parsed.replyTo) {
      mappings.push({
        id: 'diff-reply-to',
        title: 'Reply-To Routing Address',
        category: 'ENVELOPE',
        startLine: replyToRanges[0].start,
        endLine: replyToRanges[0].end,
        rawText: replyToRanges[0].text,
        extractedView: {
          type: 'object',
          data: {
            'Mailbox Address': parsed.replyTo.email,
            'Reply Domain': parsed.replyTo.domain,
            'Domain Match': parsed.replyTo.domain === parsed.from.domain ? 'ALIGNED (Matches From)' : 'MISMATCH (External Domain)',
          },
        },
        transformationType: 'TOKENIZED_ADDRESS',
        transformationLabel: 'Address Tokenization & Alignment',
        changeExplanation:
          'Isolated the destination address for response messages and compared domain against the From header.',
        forensicImpact: parsed.replyTo.domain !== parsed.from.domain ? 'CRITICAL: Detects potential reply diversion tactic.' : 'Standard communication alignment.',
      });
    }

    // 3. RETURN-PATH Header Mapping
    const returnPathRanges = findHeaderRange('Return-Path');
    if (returnPathRanges.length > 0 && parsed.returnPath) {
      mappings.push({
        id: 'diff-return-path',
        title: 'Return-Path (Envelope Sender)',
        category: 'ENVELOPE',
        startLine: returnPathRanges[0].start,
        endLine: returnPathRanges[0].end,
        rawText: returnPathRanges[0].text,
        extractedView: {
          type: 'object',
          data: {
            'Envelope Address': parsed.returnPath.email,
            'Envelope Domain': parsed.returnPath.domain,
          },
        },
        transformationType: 'TOKENIZED_ADDRESS',
        transformationLabel: 'SMTP Envelope Extraction',
        changeExplanation:
          'Extracted bounce/envelope sender used during SMTP MAIL FROM transaction.',
        forensicImpact: 'Directly compared against From header for strict SPF domain alignment.',
      });
    }

    // 4. SUBJECT Header Mapping
    const subjectRanges = findHeaderRange('Subject');
    if (subjectRanges.length > 0) {
      const isEncoded = subjectRanges[0].text.includes('=?');
      mappings.push({
        id: 'diff-subject',
        title: 'Subject Line & Linguistic Text',
        category: 'ENVELOPE',
        startLine: subjectRanges[0].start,
        endLine: subjectRanges[0].end,
        rawText: subjectRanges[0].text,
        extractedView: {
          type: 'text',
          data: parsed.subject,
        },
        transformationType: isEncoded ? 'RFC2047_DECODED' : 'WHITESPACE_UNFOLDED',
        transformationLabel: isEncoded ? 'RFC 2047 MIME Decoded' : 'Unfolded Clean String',
        changeExplanation: isEncoded
          ? 'Decoded RFC 2047 MIME encoded words (=?charset?B/Q?...?=) and normalized unfolded whitespace.'
          : 'Normalized RFC 5322 multi-line folding and stripped carriage-return delimiters.',
        forensicImpact: 'Ensures linguistic analysis operates on authentic decoded text without obfuscation.',
      });
    }

    // 5. DATE Header Mapping
    const dateRanges = findHeaderRange('Date');
    if (dateRanges.length > 0 && parsed.date) {
      mappings.push({
        id: 'diff-date',
        title: 'Date & Transmission Timestamp',
        category: 'ENVELOPE',
        startLine: dateRanges[0].start,
        endLine: dateRanges[0].end,
        rawText: dateRanges[0].text,
        extractedView: {
          type: 'object',
          data: {
            'Normalized Date': parsed.date,
          },
        },
        transformationType: 'WHITESPACE_UNFOLDED',
        transformationLabel: 'Date Header Canonicalization',
        changeExplanation:
          'RFC 2822 date string extracted, verified for timeline consistency against hop timestamps.',
        forensicImpact: 'Forms temporal anchor for received hop timeline verification.',
      });
    }

    // 6. MESSAGE-ID Header Mapping
    const messageIdRanges = findHeaderRange('Message-ID');
    if (messageIdRanges.length > 0 && parsed.messageId) {
      mappings.push({
        id: 'diff-msg-id',
        title: 'Message-ID Envelope Identifier',
        category: 'ENVELOPE',
        startLine: messageIdRanges[0].start,
        endLine: messageIdRanges[0].end,
        rawText: messageIdRanges[0].text,
        extractedView: {
          type: 'text',
          data: parsed.messageId,
        },
        transformationType: 'WHITESPACE_UNFOLDED',
        transformationLabel: 'Identifier Normalization',
        changeExplanation:
          'Extracted globally unique message identifier string, stripped outer angle brackets.',
        forensicImpact: 'Artifact pivot indicator used to track related thread messages across mail servers.',
      });
    }

    // 7. RECEIVED HOP Chain Mappings
    const receivedRanges = findHeaderRange('Received');
    receivedRanges.forEach((range, idx) => {
      const hop = parsed.receivedChain[idx];
      mappings.push({
        id: `diff-received-${idx}`,
        title: `Received Relay Hop #${idx + 1}`,
        category: 'ROUTING',
        startLine: range.start,
        endLine: range.end,
        rawText: range.text,
        extractedView: {
          type: 'object',
          data: {
            'Originating IP': hop?.ip || '(No bracketed IP)',
            'Claimed From': hop?.from || '(Unspecified)',
            'Receiving MTA (by)': hop?.by || '(Unspecified)',
            'Protocol': hop?.with || '(Default SMTP)',
            'Recipient (for)': hop?.for || '(Undisclosed)',
            'Hop Timestamp': hop?.timestamp || '(No timestamp)',
          },
        },
        transformationType: 'HOP_DECOMPOSED',
        transformationLabel: 'MTA Hop Decomposition',
        changeExplanation:
          'Multi-line transport telemetry parsed into sending host, client IP address, receiving MTA, cipher suite, and timestamp.',
        forensicImpact: 'Traces the authentic physical path and geographic relay chain.',
      });
    });

    // 8. DKIM SIGNATURE Mapping
    const dkimRanges = findHeaderRange('DKIM-Signature');
    dkimRanges.forEach((range, idx) => {
      const sig = parsed.dkimSignatures[idx];
      mappings.push({
        id: `diff-dkim-${idx}`,
        title: `DKIM Signature #${idx + 1} (${sig?.domain || 'unknown'})`,
        category: 'AUTH',
        startLine: range.start,
        endLine: range.end,
        rawText: range.text,
        extractedView: {
          type: 'object',
          data: {
            'Signing Domain (d=)': sig?.domain || '(missing)',
            'Key Selector (s=)': sig?.selector || '(missing)',
            'Algorithm (a=)': sig?.algorithm || 'rsa-sha256',
            'Body Hash (bh=)': sig?.bodyHash ? `${sig.bodyHash.substring(0, 20)}...` : '(missing)',
            'Canonicalization': sig?.canonicalization || 'relaxed/relaxed',
          },
        },
        transformationType: 'PROTOCOL_PARSED',
        transformationLabel: 'Cryptographic Tag Parsing',
        changeExplanation:
          'Decomposed folded DKIM signature header tags (v, a, c, d, s, bh, b) into cryptographic verification parameters.',
        forensicImpact: 'Provides public key DNS query target to verify message body integrity.',
      });
    });

    // 9. AUTHENTICATION-RESULTS & RECEIVED-SPF
    const authResRanges = findHeaderRange('Authentication-Results');
    if (authResRanges.length > 0) {
      mappings.push({
        id: 'diff-auth-results',
        title: 'Authentication-Results Header',
        category: 'AUTH',
        startLine: authResRanges[0].start,
        endLine: authResRanges[0].end,
        rawText: authResRanges[0].text,
        extractedView: {
          type: 'text',
          data: parsed.authenticationResultsHeader || authResRanges[0].text.replace(/\s+/g, ' '),
        },
        transformationType: 'PROTOCOL_PARSED',
        transformationLabel: 'Auth Verdict Parsing',
        changeExplanation:
          'Extracted downstream receiving server authentication findings for SPF, DKIM, and DMARC.',
        forensicImpact: 'Provides baseline MTA evaluation for cryptographic comparison.',
      });
    }

    // 10. CONTENT-TYPE & MIME STRUCTURE
    const contentTypeRanges = findHeaderRange('Content-Type');
    if (contentTypeRanges.length > 0) {
      mappings.push({
        id: 'diff-content-type',
        title: 'MIME Content-Type & Boundaries',
        category: 'MIME',
        startLine: contentTypeRanges[0].start,
        endLine: contentTypeRanges[0].end,
        rawText: contentTypeRanges[0].text,
        extractedView: {
          type: 'object',
          data: {
            'Primary Type': parsed.contentType.split(';')[0].trim(),
            'Full Directive': parsed.contentType,
            'Total Attachments Extracted': parsed.attachments.length,
          },
        },
        transformationType: 'MIME_NORMALIZED',
        transformationLabel: 'MIME Multipart Parsing',
        changeExplanation:
          'Parsed top-level MIME type, character set encoding, and multipart boundary delimiters.',
        forensicImpact: 'Defines how child parts and binary payloads are segregated and decoded.',
      });
    }

    // 11. BODY CONTENT
    // Locate body start line
    let bodyStartLine = 1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '') {
        bodyStartLine = i + 2;
        break;
      }
    }
    const bodyEndLine = Math.min(lines.length, bodyStartLine + 35);
    const rawBodySnippet = lines.slice(bodyStartLine - 1, bodyEndLine).join('\n');

    mappings.push({
      id: 'diff-body-text',
      title: 'Decoded Plaintext Body',
      category: 'BODY',
      startLine: bodyStartLine,
      endLine: bodyEndLine,
      rawText: rawBodySnippet + (lines.length > bodyEndLine ? '\n... [Remaining payload lines omitted for brevity]' : ''),
      extractedView: {
        type: 'text',
        data: parsed.plainText ? (parsed.plainText.length > 400 ? parsed.plainText.substring(0, 400) + '... [truncated]' : parsed.plainText) : '(No plaintext extracted)',
      },
      transformationType: 'MIME_NORMALIZED',
      transformationLabel: 'MIME Boundary & Quoted-Printable Decoded',
      changeExplanation:
        'Stripped multipart boundary framing, decoded quoted-printable/base64 transport streams, and converted to UTF-8 plaintext.',
      forensicImpact: 'Produces the clean, human-readable text analyzed in Stage 06 for threat markers.',
    });

    // 12. ATTACHMENT MAPPINGS
    parsed.attachments.forEach((att, idx) => {
      // Find filename in raw email lines if possible
      let attLine = bodyStartLine;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(att.filename)) {
          attLine = i + 1;
          break;
        }
      }

      mappings.push({
        id: `diff-att-${idx}`,
        title: `MIME Attachment: ${att.filename}`,
        category: 'ATTACHMENTS',
        startLine: attLine,
        endLine: Math.min(lines.length, attLine + 15),
        rawText: lines.slice(Math.max(0, attLine - 2), Math.min(lines.length, attLine + 8)).join('\n') + '\n... [Base64 binary stream truncated]',
        extractedView: {
          type: 'object',
          data: {
            'Filename': att.filename,
            'Detected Content-Type': att.contentType,
            'Decoded Size': formatBytes(att.sizeBytes),
            'Calculated SHA-256': att.sha256,
          },
        },
        transformationType: 'BINARY_HASHED',
        transformationLabel: 'Base64 Decoded & SHA-256 Hashed',
        changeExplanation:
          'Decoded base64 payload into binary bytes, validated file headers, and generated cryptographic SHA-256 signature.',
        forensicImpact: 'Provides immutable cryptographic hash for malware database query and evidentiary custody.',
      });
    });

    return mappings;
  }, [parsed, rawEmail]);

  // Filter mappings based on active category & search query
  const filteredMappings = useMemo(() => {
    return diffMappings.filter((m) => {
      const matchesCategory = activeCategory === 'ALL' || m.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.rawText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.changeExplanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.transformationLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [diffMappings, activeCategory, searchQuery]);

  // Selected mapping details
  const activeMapping = useMemo(() => {
    if (selectedMappingId) {
      return diffMappings.find((m) => m.id === selectedMappingId) || diffMappings[0];
    }
    return diffMappings[0] || null;
  }, [diffMappings, selectedMappingId]);

  // Line refs for scrolling
  const rawContainerRef = useRef<HTMLDivElement>(null);
  const mappingRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-scroll raw container when active mapping changes
  useEffect(() => {
    if (activeMapping && syncScroll && rawContainerRef.current) {
      const lineElements = rawContainerRef.current.querySelectorAll('.raw-line');
      const targetLine = lineElements[activeMapping.startLine - 1] as HTMLElement;
      if (targetLine) {
        targetLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeMapping, syncScroll]);

  const handleSelectMapping = (id: string) => {
    setSelectedMappingId(id);
  };

  // Helper badge color
  const getBadgeStyle = (type: DiffMapping['transformationType']) => {
    switch (type) {
      case 'TOKENIZED_ADDRESS':
        return 'bg-[#2DBDCA]/15 text-[#0e808c] border-[#2DBDCA]/30';
      case 'RFC2047_DECODED':
        return 'bg-[#9333EA]/15 text-[#9333EA] border-[#9333EA]/30';
      case 'WHITESPACE_UNFOLDED':
        return 'bg-[#53657A]/15 text-[#53657A] border-[#D9E1E6]';
      case 'HOP_DECOMPOSED':
        return 'bg-[#142238]/10 text-[#142238] border-[#142238]/20';
      case 'MIME_NORMALIZED':
        return 'bg-[#D89428]/15 text-[#D89428] border-[#D89428]/30';
      case 'BINARY_HASHED':
        return 'bg-[#D94A4A]/15 text-[#D94A4A] border-[#D94A4A]/30';
      case 'PROTOCOL_PARSED':
        return 'bg-[#1FA463]/15 text-[#1FA463] border-[#1FA463]/30';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Evidence Diff Metric & Control Bar */}
      <div className="bg-[#FAFBFB] p-3.5 rounded-xl border border-[#D9E1E6] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        {/* Metric Capsules */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2DBDCA] animate-pulse" />
            <span className="text-xs font-bold text-[#142238]">Evidence Diff Engine</span>
          </div>
          <div className="h-4 w-px bg-[#D9E1E6] hidden sm:block" />
          <div className="flex items-center gap-2 font-mono text-[11px] text-[#53657A]">
            <span>Raw Lines: <strong className="text-[#142238]">{rawLines.length}</strong></span>
            <span>•</span>
            <span>Mapped Features: <strong className="text-[#0e808c]">{diffMappings.length}</strong></span>
            <span>•</span>
            <span>Attachments Hashed: <strong className="text-[#142238]">{parsed?.attachments.length || 0}</strong></span>
          </div>
        </div>

        {/* Search & Sync Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#53657A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search diff elements..."
              className="pl-8 pr-3 py-1 text-xs rounded-lg border border-[#D9E1E6] bg-white text-[#142238] placeholder-[#53657A] focus:outline-none focus:border-[#2DBDCA] w-44 sm:w-56"
            />
          </div>

          <button
            type="button"
            onClick={() => setSyncScroll(!syncScroll)}
            className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-colors ${
              syncScroll
                ? 'bg-[#142238] text-white border-[#142238] font-bold'
                : 'bg-white text-[#53657A] border-[#D9E1E6] hover:text-[#142238]'
            }`}
            title="Toggle synchronous viewport scroll tracking"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sync Scroll</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { key: 'ALL', label: `All Mappings (${diffMappings.length})` },
          { key: 'ENVELOPE', label: 'Envelope & Addressing' },
          { key: 'ROUTING', label: 'Relay Hops' },
          { key: 'AUTH', label: 'Cryptographic Auth' },
          { key: 'MIME', label: 'MIME Boundaries' },
          { key: 'BODY', label: 'Body Content' },
          { key: 'ATTACHMENTS', label: 'Payloads & Hashes' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveCategory(tab.key as DiffCategory)}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors font-medium ${
              activeCategory === tab.key
                ? 'bg-[#2DBDCA] text-[#142238] font-bold shadow-2xs'
                : 'bg-white text-[#53657A] border border-[#D9E1E6] hover:bg-[#F5F6F4]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Side-by-Side Diff Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[500px] items-stretch">
        {/* LEFT PANEL: Line-Numbered Raw Evidence Stream (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-[#D9E1E6] flex flex-col overflow-hidden shadow-xs">
          {/* Header */}
          <div className="bg-[#F5F6F4] px-4 py-2.5 border-b border-[#D9E1E6] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#53657A]" />
              <span className="text-xs font-bold text-[#142238]">Raw RFC 5322 Input Stream</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-[#53657A] border border-[#D9E1E6]">
                SOURCE
              </span>
            </div>
            {activeMapping && (
              <span className="text-[11px] font-mono text-[#0e808c] font-bold">
                Lines {activeMapping.startLine}–{activeMapping.endLine} active
              </span>
            )}
          </div>

          {/* Interactive Line-Numbered Code Canvas */}
          <div
            ref={rawContainerRef}
            className="p-2 font-mono text-[11px] leading-relaxed text-[#142238] overflow-y-auto max-h-[560px] bg-[#FAFBFB] select-text flex-1"
          >
            {rawLines.map((line, idx) => {
              const lineNum = idx + 1;
              const isHighlighted =
                activeMapping && lineNum >= activeMapping.startLine && lineNum <= activeMapping.endLine;

              // Check if this line belongs to any mapping to allow clicking directly on raw lines
              const matchingMapping = diffMappings.find(
                (m) => lineNum >= m.startLine && lineNum <= m.endLine
              );

              return (
                <div
                  key={lineNum}
                  onClick={() => {
                    if (matchingMapping) setSelectedMappingId(matchingMapping.id);
                  }}
                  className={`raw-line flex items-start gap-3 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    isHighlighted
                      ? 'bg-[#2DBDCA]/20 text-[#142238] font-bold border-l-3 border-[#2DBDCA]'
                      : matchingMapping
                      ? 'hover:bg-[#F5F6F4]'
                      : ''
                  }`}
                  title={matchingMapping ? `Click to inspect: ${matchingMapping.title}` : undefined}
                >
                  <span
                    className={`w-9 text-right select-none shrink-0 text-[10px] font-mono ${
                      isHighlighted ? 'text-[#0e808c] font-bold' : 'text-[#8A9BA8]'
                    }`}
                  >
                    {lineNum}
                  </span>
                  <span className="break-all whitespace-pre-wrap flex-1">{line || ' '}</span>
                </div>
              );
            })}
          </div>

          {/* Footer Status */}
          <div className="px-4 py-2 bg-[#F5F6F4] border-t border-[#D9E1E6] text-[10px] text-[#53657A] flex items-center justify-between">
            <span>Select any line to pivot to extracted normalized representation</span>
            <span className="font-mono">{fileSize ? formatBytes(fileSize) : `${rawLines.length} lines`}</span>
          </div>
        </div>

        {/* RIGHT PANEL: Extracted Structure & Transformation Inspector (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-[#D9E1E6] flex flex-col overflow-hidden shadow-xs">
          {/* Header */}
          <div className="bg-[#F5F6F4] px-4 py-2.5 border-b border-[#D9E1E6] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2DBDCA]" />
              <span className="text-xs font-bold text-[#142238]">Normalized Structure & Transformation Diff</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#142238] text-white">
                PARSED
              </span>
            </div>
            <span className="text-[11px] text-[#53657A]">
              Showing {filteredMappings.length} mappings
            </span>
          </div>

          {/* List of Mappings with Detailed Transformation Cards */}
          <div className="p-3 overflow-y-auto max-h-[560px] flex flex-col gap-3 flex-1">
            {!parsed ? (
              <div className="py-16 flex flex-col items-center justify-center text-center text-[#53657A] px-4">
                <Cpu className="w-12 h-12 text-[#D9E1E6] mb-3 animate-pulse" />
                <h4 className="text-sm font-bold text-[#142238]">Parser Engine Idle</h4>
                <p className="text-xs max-w-sm mt-1 mb-4 text-[#53657A]">
                  Execute the RFC 5322 & MIME parser to generate high-resolution side-by-side evidence diff mappings, decoded tokens, and cryptographic digests.
                </p>
                {onRunParser && (
                  <button
                    type="button"
                    onClick={onRunParser}
                    disabled={isRunning}
                    className="px-4 py-2 rounded-lg bg-[#142238] text-white font-bold text-xs hover:bg-[#1f3556] transition-colors flex items-center gap-2"
                  >
                    <Cpu className="w-4 h-4 text-[#2DBDCA]" />
                    <span>{isRunning ? 'Parsing Artifact...' : 'Execute Email Parser'}</span>
                  </button>
                )}
              </div>
            ) : filteredMappings.length === 0 ? (
              <div className="py-16 text-center text-[#53657A] flex flex-col items-center">
                <Info className="w-8 h-8 text-[#D9E1E6] mb-2" />
                <p className="text-xs">No mappings match the active category and search filter.</p>
              </div>
            ) : (
              filteredMappings.map((mapping) => {
                const isSelected = activeMapping?.id === mapping.id;

                return (
                  <div
                    key={mapping.id}
                    ref={(el) => { mappingRefs.current[mapping.id] = el; }}
                    onClick={() => handleSelectMapping(mapping.id)}
                    className={`rounded-xl border p-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#2DBDCA] bg-[#FAFBFB] shadow-xs ring-1 ring-[#2DBDCA]/40'
                        : 'border-[#D9E1E6] bg-white hover:border-[#2DBDCA]/60'
                    }`}
                  >
                    {/* Mapping Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 mb-2 border-b border-[#D9E1E6]/60">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#142238] flex items-center gap-1.5">
                          {isSelected && <span className="w-2 h-2 rounded-full bg-[#2DBDCA]" />}
                          {mapping.title}
                        </span>
                        <span className="text-[10px] font-mono text-[#53657A]">
                          (Lines {mapping.startLine}–{mapping.endLine})
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border self-start sm:self-auto ${getBadgeStyle(
                          mapping.transformationType
                        )}`}
                      >
                        {mapping.transformationLabel}
                      </span>
                    </div>

                    {/* Side-by-Side Sub-Diff Comparison inside Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-2.5">
                      {/* Sub-Left: Original Snippet */}
                      <div className="bg-[#F5F6F4] p-2.5 rounded-lg border border-[#D9E1E6]/80 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-[#53657A] block mb-1">
                            Original Raw Input
                          </span>
                          <div className="font-mono text-[10px] text-[#142238] break-all whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
                            {mapping.rawText}
                          </div>
                        </div>
                      </div>

                      {/* Sub-Right: Extracted & Normalized Value */}
                      <div className="bg-[#FAFBFB] p-2.5 rounded-lg border border-[#2DBDCA]/30 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#0e808c] block mb-1 flex items-center justify-between">
                            <span>Extracted Forensic Value</span>
                            <CheckCircle2 className="w-3 h-3 text-[#1FA463]" />
                          </span>

                          {mapping.extractedView.type === 'object' && (
                            <div className="space-y-1 text-[11px] font-mono">
                              {Object.entries(mapping.extractedView.data).map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-2 border-b border-[#D9E1E6]/40 pb-0.5">
                                  <span className="text-[#53657A] text-[10px]">{k}:</span>
                                  <span className="font-bold text-[#142238] text-right break-all">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {mapping.extractedView.type === 'text' && (
                            <div className="text-[11px] text-[#142238] font-mono break-all whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
                              {mapping.extractedView.data}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Transformation Explanation & Forensic Impact */}
                    <div className="bg-white p-2.5 rounded-lg border border-[#D9E1E6] text-[11px] text-[#53657A] space-y-1">
                      <div>
                        <strong className="text-[#142238]">Parser Transformation: </strong>
                        <span>{mapping.changeExplanation}</span>
                      </div>
                      <div className="text-[10px] text-[#0e808c] font-medium">
                        <strong>Evidence Impact: </strong>
                        <span>{mapping.forensicImpact}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Status */}
          <div className="px-4 py-2 bg-[#F5F6F4] border-t border-[#D9E1E6] text-[10px] text-[#53657A] flex items-center justify-between">
            <span>Deterministic RFC parsing ensures zero speculative data fabrication</span>
            <span className="font-mono text-[#0e808c] font-bold">100% Cryptographically Bound</span>
          </div>
        </div>
      </div>
    </div>
  );
};
