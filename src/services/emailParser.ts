/**
 * Kryptos Forensics — RFC 5322 & MIME Email Parser
 * Fully deterministic, forensically sound email parsing engine.
 */

import { ParsedEmail, AttachmentInfo, ReceivedHop, DkimSignatureRecord } from '../types';
import { calculateSha256 } from './cryptoUtils';

// Decode RFC 2047 encoded words: =?charset?encoding?encoded_text?=
export function decodeRfc2047(text: string): string {
  if (!text) return '';
  return text.replace(/=\?([^?]+)\?([BQbq])\?([^?]+)\?=/g, (_, _charset, encoding, encoded) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        return atob(encoded);
      } else if (encoding.toUpperCase() === 'Q') {
        return decodeQuotedPrintable(encoded.replace(/_/g, ' '));
      }
    } catch {
      return encoded;
    }
    return encoded;
  });
}

// Decode Quoted-Printable strings
export function decodeQuotedPrintable(str: string): string {
  if (!str) return '';
  // Remove soft line breaks: = followed by \r\n or \n
  const cleanStr = str.replace(/=\r?\n/g, '');
  return cleanStr.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return `=${hex}`;
    }
  });
}

// Extract email address and domain from standard formats
export function extractEmailAndDomain(raw: string): { email: string; domain: string; displayName?: string } {
  if (!raw) return { email: '', domain: '', displayName: '' };

  const match = raw.match(/^(?:["']?([^"']*)["']?\s*)?<([^>]+)>/);
  if (match) {
    const displayName = match[1]?.trim();
    const email = match[2]?.trim().toLowerCase();
    const domain = email.includes('@') ? email.split('@')[1] : '';
    return { email, domain, displayName };
  }

  // Bare email address or plain text
  const bareEmailMatch = raw.match(/([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/);
  if (bareEmailMatch) {
    const email = bareEmailMatch[1].toLowerCase();
    const domain = email.split('@')[1];
    return { email, domain, displayName: raw.replace(bareEmailMatch[1], '').replace(/[<>"']/g, '').trim() };
  }

  return { email: raw.trim(), domain: '', displayName: '' };
}

// Parse Received header into structured hop
export function parseReceivedHeader(raw: string, hopIndex: number): ReceivedHop {
  const hop: ReceivedHop = {
    hopNumber: hopIndex + 1,
    raw: raw.replace(/\s+/g, ' ').trim(),
  };

  // Check for "from hostname (ip)"
  const fromMatch = raw.match(/from\s+([^\s;]+)(?:\s+\((?:\[?([0-9a-fA-F:.]+)\]?|[^)]+)\))?/i);
  if (fromMatch) {
    hop.from = fromMatch[1];
  }

  // Extract IP if present in brackets or parentheses
  const ipMatch = raw.match(/\[([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|[0-9a-fA-F:]{3,})\]/);
  if (ipMatch) {
    hop.ip = ipMatch[1];
  }

  // Check for "by hostname"
  const byMatch = raw.match(/by\s+([^\s;]+)/i);
  if (byMatch) {
    hop.by = byMatch[1];
  }

  // Check for "with protocol"
  const withMatch = raw.match(/with\s+([^\s;]+)/i);
  if (withMatch) {
    hop.with = withMatch[1];
  }

  // Check for "for <email>"
  const forMatch = raw.match(/for\s+<([^>]+)>/i);
  if (forMatch) {
    hop.for = forMatch[1];
  }

  // Check for timestamp after semicolon
  const semiIndex = raw.lastIndexOf(';');
  if (semiIndex !== -1) {
    const timeCandidate = raw.substring(semiIndex + 1).trim();
    if (timeCandidate) {
      hop.timestamp = timeCandidate;
    }
  }

  return hop;
}

// Parse DKIM-Signature header tags
export function parseDkimHeader(raw: string): DkimSignatureRecord | null {
  try {
    const tags: Record<string, string> = {};
    const pairs = raw.split(';');
    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx !== -1) {
        const key = pair.substring(0, eqIdx).trim();
        const val = pair.substring(eqIdx + 1).trim();
        tags[key] = val;
      }
    }

    if (!tags.d) return null;

    return {
      domain: tags.d || '',
      selector: tags.s || '',
      algorithm: tags.a || '',
      bodyHash: tags.bh || '',
      signature: tags.b || '',
      headers: tags.h || '',
      canonicalization: tags.c || '',
    };
  } catch {
    return null;
  }
}

// Sanitize HTML so it can be safely displayed as evidence without executing scripts
export function sanitizeEvidenceHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '<!-- Script removed for forensic safety -->')
    .replace(/\bon\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '') // remove onclick, onload etc.
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '<!-- iframe neutralized -->')
    .replace(/<embed\b[^>]*>/gi, '<!-- embed neutralized -->')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '<!-- object neutralized -->');
}

/**
 * Main RFC 5322 & MIME Parser
 */
export async function parseEmlContent(rawEml: string): Promise<ParsedEmail> {
  // Normalize newlines
  const normalized = rawEml.replace(/\r\n/g, '\n');

  // Split headers and body
  const splitIndex = normalized.indexOf('\n\n');
  let rawHeaders = '';
  let rawBody = '';

  if (splitIndex === -1) {
    rawHeaders = normalized;
    rawBody = '';
  } else {
    rawHeaders = normalized.substring(0, splitIndex);
    rawBody = normalized.substring(splitIndex + 2);
  }

  // Unfold headers (lines beginning with space or tab continue the previous header)
  const headerLines = rawHeaders.split('\n');
  const unfoldedLines: string[] = [];

  for (const line of headerLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfoldedLines.length > 0) {
      unfoldedLines[unfoldedLines.length - 1] += ' ' + line.trim();
    } else if (line.trim().length > 0) {
      unfoldedLines.push(line);
    }
  }

  // Store headers map
  const headers: Record<string, string | string[]> = {};
  const receivedRawList: string[] = [];
  const dkimSignatures: DkimSignatureRecord[] = [];

  for (const line of unfoldedLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const headerName = line.substring(0, colonIndex).trim();
      const headerValue = line.substring(colonIndex + 1).trim();
      const lowerName = headerName.toLowerCase();

      if (lowerName === 'received') {
        receivedRawList.push(headerValue);
      } else if (lowerName === 'dkim-signature') {
        const parsedDkim = parseDkimHeader(headerValue);
        if (parsedDkim) {
          dkimSignatures.push(parsedDkim);
        }
      }

      if (headers[headerName]) {
        if (Array.isArray(headers[headerName])) {
          (headers[headerName] as string[]).push(headerValue);
        } else {
          headers[headerName] = [headers[headerName] as string, headerValue];
        }
      } else {
        headers[headerName] = headerValue;
      }
    }
  }

  const getHeader = (name: string): string => {
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === name.toLowerCase()) {
        const val = headers[key];
        return Array.isArray(val) ? val[0] : val;
      }
    }
    return '';
  };

  // Parse core fields
  const fromHeader = decodeRfc2047(getHeader('From'));
  const toHeader = decodeRfc2047(getHeader('To'));
  const ccHeader = decodeRfc2047(getHeader('Cc'));
  const bccHeader = decodeRfc2047(getHeader('Bcc'));
  const replyToHeader = decodeRfc2047(getHeader('Reply-To'));
  const returnPathHeader = decodeRfc2047(getHeader('Return-Path'));
  const subjectHeader = decodeRfc2047(getHeader('Subject') || '(No Subject)');
  const messageId = getHeader('Message-ID') || null;
  const date = getHeader('Date') || null;
  const contentType = getHeader('Content-Type') || 'text/plain';
  const mimeVersion = getHeader('MIME-Version') || null;
  const authResults = getHeader('Authentication-Results') || null;
  const receivedSpf = getHeader('Received-SPF') || null;

  const from = {
    raw: fromHeader,
    ...extractEmailAndDomain(fromHeader),
  };

  const parseAddressList = (headerVal: string) => {
    if (!headerVal) return [];
    return headerVal
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => extractEmailAndDomain(item));
  };

  const to = parseAddressList(toHeader);
  const cc = parseAddressList(ccHeader);
  const bcc = parseAddressList(bccHeader);

  const replyTo = replyToHeader
    ? { raw: replyToHeader, ...extractEmailAndDomain(replyToHeader) }
    : null;

  const returnPath = returnPathHeader
    ? { raw: returnPathHeader, ...extractEmailAndDomain(returnPathHeader) }
    : null;

  // Parse Received Chain
  // Received headers appear in reverse chronological order (newest on top).
  // We trace from earliest relay (bottom of headers) to final hop.
  const receivedChain: ReceivedHop[] = receivedRawList.map((raw, idx) => parseReceivedHeader(raw, idx));
  if (receivedChain.length > 0) {
    // Earliest observed relay is the last element in standard reverse-chronological received chain
    receivedChain[receivedChain.length - 1].isEarliestReliableRelay = true;
  }

  // Parse Body and MIME parts
  let plainText = '';
  let htmlContent = '';
  const attachments: AttachmentInfo[] = [];

  // Extract boundary if multipart
  const boundaryMatch = contentType.match(/boundary\s*=\s*"?([^";\s]+)"?/i);
  const boundary = boundaryMatch ? boundaryMatch[1] : null;

  if (boundary && rawBody.includes(boundary)) {
    // Multipart parsing
    const parts = rawBody.split(`--${boundary}`);
    for (const part of parts) {
      if (part.trim() === '--' || !part.trim()) continue;

      const partSplit = part.indexOf('\n\n');
      if (partSplit === -1) continue;

      const partHeaderStr = part.substring(0, partSplit).trim();
      const partBodyStr = part.substring(partSplit + 2);

      const partContentTypeMatch = partHeaderStr.match(/Content-Type:\s*([^;\n]+)/i);
      const partContentType = partContentTypeMatch ? partContentTypeMatch[1].trim().toLowerCase() : 'text/plain';

      const partTransferEncodingMatch = partHeaderStr.match(/Content-Transfer-Encoding:\s*([^\n;]+)/i);
      const partTransferEncoding = partTransferEncodingMatch
        ? partTransferEncodingMatch[1].trim().toLowerCase()
        : '7bit';

      const partDispositionMatch = partHeaderStr.match(/Content-Disposition:\s*([^;\n]+)/i);
      const isAttachment =
        partDispositionMatch && partDispositionMatch[1].toLowerCase().includes('attachment');

      const filenameMatch =
        partHeaderStr.match(/filename\s*=\s*"?([^";\n]+)"?/i) ||
        partHeaderStr.match(/name\s*=\s*"?([^";\n]+)"?/i);
      const filename = filenameMatch ? decodeRfc2047(filenameMatch[1].trim()) : null;

      // Handle decoding
      let decodedBody = partBodyStr;
      if (partTransferEncoding === 'base64') {
        try {
          // If attachment, calculate real SHA-256 of raw bytes
          if (isAttachment || filename) {
            const cleanBase64 = partBodyStr.replace(/\s+/g, '');
            const binaryStr = atob(cleanBase64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            const sha256 = await calculateSha256(bytes);
            const suspiciousExts = ['.exe', '.scr', '.bat', '.ps1', '.vbs', '.js', '.iso', '.zip', '.jar', '.cmd', '.hta'];
            const isSuspicious = suspiciousExts.some((ext) => filename?.toLowerCase().endsWith(ext));

            attachments.push({
              filename: filename || `attachment_${attachments.length + 1}.bin`,
              contentType: partContentType,
              sizeBytes: bytes.length,
              sha256,
              encoding: 'base64',
              isExecutableOrSuspicious: Boolean(isSuspicious),
            });
            continue;
          } else {
            decodedBody = atob(partBodyStr.replace(/\s+/g, ''));
          }
        } catch {
          decodedBody = partBodyStr;
        }
      } else if (partTransferEncoding === 'quoted-printable') {
        decodedBody = decodeQuotedPrintable(partBodyStr);
      }

      if (partContentType.includes('text/plain') && !plainText) {
        plainText = decodedBody.trim();
      } else if (partContentType.includes('text/html') && !htmlContent) {
        htmlContent = decodedBody.trim();
      } else if (filename) {
        // Non-base64 attachment
        const sha256 = await calculateSha256(partBodyStr);
        const suspiciousExts = ['.exe', '.scr', '.bat', '.ps1', '.vbs', '.js', '.iso', '.zip', '.jar', '.cmd', '.hta'];
        const isSuspicious = suspiciousExts.some((ext) => filename.toLowerCase().endsWith(ext));
        attachments.push({
          filename,
          contentType: partContentType,
          sizeBytes: partBodyStr.length,
          sha256,
          encoding: partTransferEncoding,
          isExecutableOrSuspicious: Boolean(isSuspicious),
        });
      }
    }
  } else {
    // Single part message
    const transferEncoding = getHeader('Content-Transfer-Encoding').toLowerCase();
    let body = rawBody;
    if (transferEncoding === 'base64') {
      try {
        body = atob(rawBody.replace(/\s+/g, ''));
      } catch {
        body = rawBody;
      }
    } else if (transferEncoding === 'quoted-printable') {
      body = decodeQuotedPrintable(rawBody);
    }

    if (contentType.toLowerCase().includes('text/html')) {
      htmlContent = body.trim();
      // Strip HTML tags for fallback plain text
      plainText = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    } else {
      plainText = body.trim();
    }
  }

  // If plainText is empty but HTML exists, generate readable plainText
  if (!plainText && htmlContent) {
    plainText = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return {
    headers,
    rawHeaders,
    from,
    to,
    cc,
    bcc,
    replyTo,
    returnPath,
    messageId,
    date,
    subject: subjectHeader,
    receivedChain,
    dkimSignatures,
    authenticationResultsHeader: authResults,
    receivedSpfHeader: receivedSpf,
    contentType,
    mimeVersion,
    plainText,
    htmlContent,
    sanitizedHtml: sanitizeEvidenceHtml(htmlContent),
    attachments,
    rawByteSize: rawEml.length,
  };
}

export const parseEmail = parseEmlContent;
export default parseEmlContent;
