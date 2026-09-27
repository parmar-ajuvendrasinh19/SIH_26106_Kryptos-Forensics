/**
 * Kryptos Forensics — Model B: Technical Threat Analysis Engine
 * Evaluates observed technical evidence features.
 * Features with UNKNOWN states contribute ZERO weight.
 */

import { ParsedEmail, AuthenticationState, IOC, DomainIntelligence, TechnicalFeature, TechnicalAnalysisState } from '../types';

export function analyzeTechnicalFeatures(
  parsedEmail: ParsedEmail,
  auth: AuthenticationState | null,
  iocs: IOC[],
  domainIntel: Record<string, DomainIntelligence>
): TechnicalAnalysisState {
  const features: TechnicalFeature[] = [];

  // 1. SPF Feature
  if (auth) {
    if (auth.spf.status === 'FAIL') {
      features.push({
        id: 'feat-spf',
        feature: 'SPF Authentication',
        state: 'KNOWN',
        value: 'FAIL',
        source: auth.spf.source,
        interpretation: 'Sending mail server failed SPF domain authorization.',
        weight: 25,
        provenance: auth.spf.provenance,
      });
    } else if (auth.spf.status === 'PASS') {
      features.push({
        id: 'feat-spf',
        feature: 'SPF Authentication',
        state: 'KNOWN',
        value: 'PASS',
        source: auth.spf.source,
        interpretation: 'Sending server explicitly authorized by sender domain policy.',
        weight: 0,
        provenance: auth.spf.provenance,
      });
    } else {
      features.push({
        id: 'feat-spf',
        feature: 'SPF Authentication',
        state: 'UNKNOWN',
        value: 'NOT VERIFIABLE',
        source: auth.spf.source,
        interpretation: 'Context insufficient to prove SPF pass or fail.',
        weight: 0,
        provenance: auth.spf.provenance,
      });
    }

    // 2. DKIM Feature
    if (auth.dkim.status === 'FAIL') {
      features.push({
        id: 'feat-dkim',
        feature: 'DKIM Cryptographic Signature',
        state: 'KNOWN',
        value: 'FAIL',
        source: auth.dkim.source,
        interpretation: 'DKIM signature present but failed cryptographic validation.',
        weight: 25,
        provenance: auth.dkim.provenance,
      });
    } else if (auth.dkim.status === 'PASS') {
      features.push({
        id: 'feat-dkim',
        feature: 'DKIM Cryptographic Signature',
        state: 'KNOWN',
        value: 'PASS',
        source: auth.dkim.source,
        interpretation: 'Authentic cryptographic domain signature verified.',
        weight: 0,
        provenance: auth.dkim.provenance,
      });
    } else if (auth.dkim.status === 'NO_DKIM_SIGNATURE') {
      features.push({
        id: 'feat-dkim',
        feature: 'DKIM Cryptographic Signature',
        state: 'KNOWN',
        value: 'NO SIGNATURE PRESENT',
        source: auth.dkim.source,
        interpretation: 'Message does not carry DKIM cryptographic protection.',
        weight: 8,
        provenance: auth.dkim.provenance,
      });
    } else {
      features.push({
        id: 'feat-dkim',
        feature: 'DKIM Cryptographic Signature',
        state: 'UNKNOWN',
        value: 'VERIFICATION UNAVAILABLE',
        source: auth.dkim.source,
        interpretation: 'Signature present but public key DNS verification unavailable.',
        weight: 0,
        provenance: auth.dkim.provenance,
      });
    }

    // 3. DMARC Feature
    if (auth.dmarc.status === 'FAIL') {
      features.push({
        id: 'feat-dmarc',
        feature: 'DMARC Alignment Policy',
        state: 'KNOWN',
        value: 'FAIL',
        source: auth.dmarc.source,
        interpretation: 'Domain policy alignment failed.',
        weight: 20,
        provenance: auth.dmarc.provenance,
      });
    } else if (auth.dmarc.status === 'PASS') {
      features.push({
        id: 'feat-dmarc',
        feature: 'DMARC Alignment Policy',
        state: 'KNOWN',
        value: 'PASS',
        source: auth.dmarc.source,
        interpretation: 'Domain policy alignment and verification successful.',
        weight: 0,
        provenance: auth.dmarc.provenance,
      });
    } else {
      features.push({
        id: 'feat-dmarc',
        feature: 'DMARC Alignment Policy',
        state: 'UNKNOWN',
        value: 'NOT VERIFIABLE',
        source: auth.dmarc.source,
        interpretation: 'DMARC alignment cannot be proven without verified SPF/DKIM baseline.',
        weight: 0,
        provenance: auth.dmarc.provenance,
      });
    }

    // 4. Reply-To Alignment Feature
    if (auth.alignment.replyToDomain && !auth.alignment.fromMatchesReplyTo) {
      features.push({
        id: 'feat-replyto',
        feature: 'Reply-To Alignment',
        state: 'KNOWN',
        value: `Mismatch: ${auth.alignment.fromDomain} vs ${auth.alignment.replyToDomain}`,
        source: 'Parsed headers',
        interpretation: 'Replies are directed to an external domain different from the apparent sender.',
        weight: 18,
        provenance: 'DETERMINISTICALLY DERIVED',
      });
    } else {
      features.push({
        id: 'feat-replyto',
        feature: 'Reply-To Alignment',
        state: 'KNOWN',
        value: 'Aligned or not specified',
        source: 'Parsed headers',
        interpretation: 'No discrepancy between From and Reply-To headers.',
        weight: 0,
        provenance: 'DETERMINISTICALLY DERIVED',
      });
    }
  }

  // 5. High Risk Attachments
  const riskyAttachments = parsedEmail.attachments.filter((a) => a.isExecutableOrSuspicious);
  if (riskyAttachments.length > 0) {
    features.push({
      id: 'feat-att',
      feature: 'Executable / Script Attachment',
      state: 'KNOWN',
      value: riskyAttachments.map((a) => a.filename).join(', '),
      source: 'MIME Attachment inspection',
      interpretation: 'Payload carries potentially executable or containerized extension.',
      weight: 30,
      provenance: 'VERIFIED FROM EMAIL',
    });
  }

  // 6. IP-Based or Suspicious URLs
  const urls = iocs.filter((i) => i.type === 'url');
  const ipBasedUrls = urls.filter((u) => {
    try {
      const host = new URL(u.value).hostname;
      return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host);
    } catch {
      return false;
    }
  });

  if (ipBasedUrls.length > 0) {
    features.push({
      id: 'feat-ip-url',
      feature: 'Raw IP Hostname in URL',
      state: 'KNOWN',
      value: ipBasedUrls.map((u) => u.value).join(', '),
      source: 'URL extraction',
      interpretation: 'Hyperlinks resolve directly to numeric IP addresses rather than registered domains.',
      weight: 20,
      provenance: 'VERIFIED FROM EMAIL',
    });
  }

  // 7. Domain Age from RDAP (if known)
  const senderDomain = parsedEmail.from.domain.toLowerCase();
  const intel = domainIntel[senderDomain];
  if (intel?.ageDays !== undefined) {
    if (intel.ageDays < 14) {
      features.push({
        id: 'feat-domain-age',
        feature: 'Domain Registration Age',
        state: 'KNOWN',
        value: `${intel.ageDays} days (Newly Registered)`,
        source: intel.provider,
        interpretation: 'Newly registered domain commonly associated with disposable attack infrastructure.',
        weight: 20,
        provenance: 'VERIFIED THROUGH EXTERNAL INTELLIGENCE',
      });
    } else {
      features.push({
        id: 'feat-domain-age',
        feature: 'Domain Registration Age',
        state: 'KNOWN',
        value: `${intel.ageDays} days`,
        source: intel.provider,
        interpretation: 'Domain has established historical registration tenure.',
        weight: 0,
        provenance: 'VERIFIED THROUGH EXTERNAL INTELLIGENCE',
      });
    }
  } else {
    features.push({
      id: 'feat-domain-age',
      feature: 'Domain Registration Age',
      state: 'UNKNOWN',
      value: 'Unavailable',
      source: 'RDAP Provider',
      interpretation: 'External RDAP registration date not verified.',
      weight: 0,
      provenance: 'EXTERNAL SOURCE UNAVAILABLE',
    });
  }

  const rawSum = features.reduce((sum, f) => sum + (f.state === 'KNOWN' ? f.weight : 0), 0);
  const technicalScore = Math.min(100, rawSum);

  let riskLevel: TechnicalAnalysisState['riskLevel'] = 'LOW';
  let explanation = 'Technical features indicate nominal operational baseline with no confirmed protocol violations.';

  if (technicalScore >= 40) {
    riskLevel = 'HIGH';
    explanation = 'Multiple elevated technical risk signals verified (authentication anomalies, mismatched routing, or hazardous payloads).';
  } else if (technicalScore > 0) {
    riskLevel = 'MEDIUM';
    explanation = 'Observable technical indicators present that warrant investigator scrutiny.';
  }

  return {
    features,
    technicalScore,
    riskLevel,
    explanation,
  };
}

export const analyzeTechnicalThreats = (
  parsedEmail: ParsedEmail,
  auth: AuthenticationState | null,
  iocs: IOC[],
  domainIntel: Record<string, DomainIntelligence>,
  _urlIntel?: any
): TechnicalAnalysisState => analyzeTechnicalFeatures(parsedEmail, auth, iocs, domainIntel);
