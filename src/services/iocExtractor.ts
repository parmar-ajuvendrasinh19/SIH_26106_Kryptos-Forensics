/**
 * Kryptos Forensics — IOC (Indicators of Compromise) Extractor
 * Extracts genuine indicators from the parsed email.
 * NEVER fabricates IOCs. Tracks source and provenance for every indicator.
 */

import { ParsedEmail, IOC } from '../types';

export function extractIOCs(parsedEmail: ParsedEmail): IOC[] {
  const iocs: IOC[] = [];
  const seen = new Set<string>();

  const addIoc = (
    type: IOC['type'],
    value: string,
    source: string,
    location: string,
    provenance: IOC['provenance'] = 'VERIFIED FROM EMAIL'
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = `${type}:${trimmed.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);

    iocs.push({
      id: `ioc-${iocs.length + 1}`,
      type,
      value: trimmed,
      source,
      location,
      provenance,
    });
  };

  // 1. Message-ID
  if (parsedEmail.messageId) {
    addIoc('message_id', parsedEmail.messageId, 'Message-ID header', 'Headers');
  }

  // 2. Email addresses
  if (parsedEmail.from.email) {
    addIoc('email', parsedEmail.from.email, 'From header', 'Headers (Sender)');
    if (parsedEmail.from.domain) {
      addIoc('domain', parsedEmail.from.domain, 'From header domain', 'Headers (Sender Domain)');
    }
  }

  parsedEmail.to.forEach((rec) => {
    if (rec.email) {
      addIoc('email', rec.email, 'To header', 'Headers (Recipient)');
      if (rec.domain) addIoc('domain', rec.domain, 'To header domain', 'Headers');
    }
  });

  parsedEmail.cc.forEach((rec) => {
    if (rec.email) {
      addIoc('email', rec.email, 'Cc header', 'Headers (Cc)');
      if (rec.domain) addIoc('domain', rec.domain, 'Cc header domain', 'Headers');
    }
  });

  if (parsedEmail.replyTo?.email) {
    addIoc('email', parsedEmail.replyTo.email, 'Reply-To header', 'Headers (Reply-To)');
    if (parsedEmail.replyTo.domain) {
      addIoc('domain', parsedEmail.replyTo.domain, 'Reply-To header domain', 'Headers');
    }
  }

  if (parsedEmail.returnPath?.email) {
    addIoc('email', parsedEmail.returnPath.email, 'Return-Path header', 'Headers (Return-Path)');
    if (parsedEmail.returnPath.domain) {
      addIoc('domain', parsedEmail.returnPath.domain, 'Return-Path header domain', 'Headers');
    }
  }

  // 3. IPs from Received headers
  parsedEmail.receivedChain.forEach((hop) => {
    if (hop.ip) {
      // Check IPv4 vs IPv6
      const isIpv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hop.ip);
      const isIpv6 = hop.ip.includes(':');
      if (isIpv4) {
        addIoc(
          'ipv4',
          hop.ip,
          `Received header #${hop.hopNumber}${hop.isEarliestReliableRelay ? ' (Earliest Relay)' : ''}`,
          `Received hop ${hop.hopNumber}`
        );
      } else if (isIpv6) {
        addIoc(
          'ipv6',
          hop.ip,
          `Received header #${hop.hopNumber}`,
          `Received hop ${hop.hopNumber}`
        );
      }
    }
    if (hop.from && hop.from.includes('.')) {
      const host = hop.from.replace(/[()]/g, '').trim();
      if (!/^[0-9.]+$/.test(host)) {
        addIoc('domain', host, `Received header #${hop.hopNumber}`, 'Mail Transit');
      }
    }
  });

  // 4. URLs from plain text and HTML
  const combinedBody = `${parsedEmail.plainText}\n${parsedEmail.htmlContent}`;
  const urlRegex = /(https?:\/\/[^\s<>"'`]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(combinedBody)) !== null) {
    let cleanUrl = match[1];
    // Strip trailing punctuation often caught in sentences
    cleanUrl = cleanUrl.replace(/[.,;:!?)]+$/, '');

    try {
      const parsedUrl = new URL(cleanUrl);
      addIoc('url', cleanUrl, 'Email body content', 'Body Link');
      if (parsedUrl.hostname) {
        // If hostname is IP
        if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(parsedUrl.hostname)) {
          addIoc('ipv4', parsedUrl.hostname, 'URL Host in body', 'Body Link');
        } else {
          addIoc('domain', parsedUrl.hostname, 'URL Domain in body', 'Body Link');
        }
      }
    } catch {
      // Invalid URL string, ignore
    }
  }

  // Also extract href="..." specifically from HTML
  if (parsedEmail.htmlContent) {
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let hrefMatch: RegExpExecArray | null;
    while ((hrefMatch = hrefRegex.exec(parsedEmail.htmlContent)) !== null) {
      const href = hrefMatch[1].trim();
      if (href.startsWith('http://') || href.startsWith('https://')) {
        addIoc('url', href, 'HTML <a> hyperlink', 'HTML Markup');
        try {
          const parsed = new URL(href);
          if (parsed.hostname) {
            addIoc('domain', parsed.hostname, 'Hyperlink Target Domain', 'HTML Markup');
          }
        } catch {
          // ignore
        }
      } else if (href.startsWith('mailto:')) {
        const mail = href.replace('mailto:', '').split('?')[0].trim();
        if (mail) {
          addIoc('email', mail, 'HTML mailto hyperlink', 'HTML Markup');
        }
      }
    }
  }

  // 5. Attachment Hashes & Filenames
  parsedEmail.attachments.forEach((att, idx) => {
    addIoc(
      'attachment',
      att.filename,
      `MIME attachment #${idx + 1} (${att.contentType})`,
      'Email Attachment Payload'
    );
    if (att.sha256) {
      addIoc(
        'hash',
        att.sha256,
        `Attachment SHA-256 for "${att.filename}"`,
        'Computed Cryptographic Evidence'
      );
    }
  });

  return iocs;
}
