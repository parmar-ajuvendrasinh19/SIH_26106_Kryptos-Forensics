/**
 * Kryptos Forensics — Real Intelligence Adapter
 * Integrates real DNS, RDAP, and network resolution.
 * NEVER fabricates intelligence. Clearly reports provider status and provenance.
 */

import { IpIntelligence, DomainIntelligence, UrlIntelligence } from '../types';

export function isPrivateIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith('169.254.')) return true; // Link-local
  if (ip.startsWith('fc00:') || ip.startsWith('fe80:')) return true;
  return false;
}

export async function fetchIpIntelligence(ip: string): Promise<IpIntelligence> {
  const timestamp = new Date().toISOString();

  // Handle RFC 1918 / loopback
  if (isPrivateIp(ip)) {
    return {
      ip,
      org: 'Private Network / RFC 1918 Internal Address',
      asn: 'None (Private)',
      country: 'Internal / Non-Routable',
      status: 'PARTIAL',
      provider: 'RFC 1918 IP Classification',
      timestamp,
    };
  }

  try {
    const res = await fetch(`/api/intel/ip?ip=${encodeURIComponent(ip)}`);
    if (res.ok) {
      const data = await res.json();
      return {
        ip,
        asn: data.rdap?.handle || undefined,
        org: data.rdap?.org || data.rdap?.name || undefined,
        country: data.rdap?.country || undefined,
        rDNS: data.rDNS && data.rDNS.length > 0 ? data.rDNS : undefined,
        status: data.status === 'SUCCESS' ? 'SUCCESS' : 'PARTIAL',
        provider: data.provider || 'System DNS / RDAP',
        timestamp,
        raw: data,
      };
    }
  } catch {
    // API endpoint unavailable or offline
  }

  return {
    ip,
    status: 'UNAVAILABLE',
    provider: 'No external intelligence provider reachable',
    timestamp,
  };
}

export async function fetchDomainIntelligence(domain: string): Promise<DomainIntelligence> {
  const timestamp = new Date().toISOString();

  let rdapData: any = null;
  let dnsData: any = null;

  try {
    const [rdapRes, dnsRes] = await Promise.all([
      fetch(`/api/intel/rdap?domain=${encodeURIComponent(domain)}`).catch(() => null),
      fetch(`/api/intel/dns?domain=${encodeURIComponent(domain)}&type=ALL`).catch(() => null),
    ]);

    if (rdapRes && rdapRes.ok) {
      rdapData = await rdapRes.json();
    }
    if (dnsRes && dnsRes.ok) {
      dnsData = await dnsRes.json();
    }
  } catch {
    // ignore
  }

  let ageDays: number | undefined = undefined;
  if (rdapData?.registrationDate) {
    const regTime = new Date(rdapData.registrationDate).getTime();
    if (!isNaN(regTime)) {
      ageDays = Math.floor((Date.now() - regTime) / (1000 * 60 * 60 * 24));
    }
  }

  if (rdapData?.status === 'SUCCESS' || dnsData?.status === 'SUCCESS') {
    return {
      domain,
      registrar: rdapData?.registrar || undefined,
      registrationDate: rdapData?.registrationDate || undefined,
      expirationDate: rdapData?.expirationDate || undefined,
      ageDays,
      nameservers: rdapData?.nameservers?.length ? rdapData.nameservers : dnsData?.results?.NS,
      dnsRecords: dnsData?.results ? {
        A: dnsData.results.A,
        MX: dnsData.results.MX,
        TXT: dnsData.results.TXT,
        NS: dnsData.results.NS,
      } : undefined,
      status: 'SUCCESS',
      provider: 'ICANN RDAP / System DNS Resolver',
      timestamp,
    };
  }

  return {
    domain,
    status: 'UNAVAILABLE',
    provider: 'External RDAP / DNS not configured or unreachable',
    timestamp,
  };
}

export function analyzeUrlStructure(urlStr: string): UrlIntelligence {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname;
    const isIpBased = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname) || hostname.startsWith('[');
    const isPunycode = hostname.startsWith('xn--') || hostname.includes('.xn--');
    const hasSuspiciousEncoding = /%2e%2e|%00|%25/i.test(urlStr);

    const credentialWordList = [
      'login',
      'signin',
      'verify',
      'account',
      'password',
      'credential',
      'security',
      'update',
      'banking',
      'webscr',
      'confirm',
      'auth',
      'session',
    ];

    const lowerFull = urlStr.toLowerCase();
    const foundKeywords = credentialWordList.filter((word) => lowerFull.includes(word));

    return {
      url: urlStr,
      protocol: parsed.protocol.replace(':', ''),
      hostname,
      pathname: parsed.pathname,
      port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80'),
      isIpBased,
      isPunycode,
      hasSuspiciousEncoding,
      credentialKeywords: foundKeywords,
      status: 'ANALYZED',
      provider: 'Deterministic URL Structural Engine',
    };
  } catch {
    return {
      url: urlStr,
      protocol: 'unknown',
      hostname: 'unknown',
      pathname: '',
      isIpBased: false,
      isPunycode: false,
      hasSuspiciousEncoding: false,
      credentialKeywords: [],
      status: 'UNAVAILABLE',
      provider: 'Deterministic URL Structural Engine',
    };
  }
}

export const queryIpIntelligence = fetchIpIntelligence;
export const queryDomainIntelligence = fetchDomainIntelligence;
export const queryUrlIntelligence = analyzeUrlStructure;
