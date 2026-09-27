/**
 * Kryptos Forensics — Forensic Authentication Evaluator
 * Evaluates SPF, DKIM, DMARC and Alignment strictly according to evidence.
 * NEVER assumes or fabricates FAIL. Distinguishes UNKNOWN and NOT_VERIFIABLE.
 */

import { ParsedEmail, AuthenticationState, SpfEvaluation, DkimEvaluation, DmarcEvaluation, AlignmentEvaluation } from '../types';

export async function evaluateAuthentication(parsedEmail: ParsedEmail): Promise<AuthenticationState> {
  const fromDomain = parsedEmail.from.domain.toLowerCase();
  const replyToDomain = parsedEmail.replyTo?.domain.toLowerCase() || null;
  const returnPathDomain = parsedEmail.returnPath?.domain.toLowerCase() || null;

  // -------------------------------------------------------------
  // 1. SPF EVALUATION
  // -------------------------------------------------------------
  let spf: SpfEvaluation = {
    status: 'NOT_VERIFIABLE',
    reason: 'Evaluating SPF headers...',
    evidence: 'Header inspection in progress',
    source: 'Evidence headers',
    provenance: 'NOT VERIFIABLE',
  };
  const receivedSpf = parsedEmail.receivedSpfHeader;
  const authResults = parsedEmail.authenticationResultsHeader;

  // Check if email already contains verified SPF header from MTA
  if (receivedSpf) {
    const lowerSpf = receivedSpf.toLowerCase();
    if (lowerSpf.startsWith('pass')) {
      spf = {
        status: 'PASS',
        reason: 'Received-SPF header recorded a PASS result at receiving mail gateway.',
        evidence: receivedSpf,
        source: 'Received-SPF header',
        senderDomain: fromDomain,
        provenance: 'VERIFIED FROM EMAIL',
      };
    } else if (lowerSpf.startsWith('fail')) {
      spf = {
        status: 'FAIL',
        reason: 'Received-SPF header recorded an explicit SPF FAIL at receiving mail gateway.',
        evidence: receivedSpf,
        source: 'Received-SPF header',
        senderDomain: fromDomain,
        provenance: 'VERIFIED FROM EMAIL',
      };
    } else if (lowerSpf.startsWith('softfail') || lowerSpf.startsWith('neutral')) {
      spf = {
        status: 'NOT_VERIFIABLE',
        reason: `Received-SPF header recorded ${receivedSpf.split(' ')[0].toUpperCase()} (not an authorized pass).`,
        evidence: receivedSpf,
        source: 'Received-SPF header',
        senderDomain: fromDomain,
        provenance: 'VERIFIED FROM EMAIL',
      };
    } else {
      spf = {
        status: 'NOT_VERIFIABLE',
        reason: 'Received-SPF header present but inconclusive.',
        evidence: receivedSpf,
        source: 'Received-SPF header',
        provenance: 'VERIFIED FROM EMAIL',
      };
    }
  } else if (authResults && authResults.toLowerCase().includes('spf=')) {
    const spfMatch = authResults.match(/spf=([a-zA-Z0-9_-]+)/i);
    const result = spfMatch ? spfMatch[1].toLowerCase() : 'unknown';
    if (result === 'pass') {
      spf = {
        status: 'PASS',
        reason: 'Authentication-Results header recorded SPF=pass.',
        evidence: authResults,
        source: 'Authentication-Results header',
        senderDomain: fromDomain,
        provenance: 'VERIFIED FROM EMAIL',
      };
    } else if (result === 'fail') {
      spf = {
        status: 'FAIL',
        reason: 'Authentication-Results header recorded SPF=fail.',
        evidence: authResults,
        source: 'Authentication-Results header',
        senderDomain: fromDomain,
        provenance: 'VERIFIED FROM EMAIL',
      };
    } else {
      spf = {
        status: 'NOT_VERIFIABLE',
        reason: `Authentication-Results recorded SPF=${result}.`,
        evidence: authResults,
        source: 'Authentication-Results header',
        provenance: 'VERIFIED FROM EMAIL',
      };
    }
  } else {
    // Attempt live DNS query if server endpoint available
    let liveDnsFailed = true;
    if (fromDomain) {
      try {
        const res = await fetch(`/api/intel/dns?domain=${encodeURIComponent(fromDomain)}&type=TXT`);
        if (res.ok) {
          const data = await res.json();
          const spfRecord = data.results?.TXT?.find((t: string) => t.toLowerCase().startsWith('v=spf1'));
          if (spfRecord) {
            spf = {
              status: 'NOT_VERIFIABLE',
              reason: 'Domain has a published SPF TXT record, but sending-IP authorization cannot be validated without live MTA envelope context.',
              evidence: `SPF Record: ${spfRecord}`,
              source: 'Live DNS TXT Record',
              senderDomain: fromDomain,
              dnsTxtRecords: [spfRecord],
              provenance: 'VERIFIED THROUGH EXTERNAL INTELLIGENCE',
            };
            liveDnsFailed = false;
          }
        }
      } catch {
        // Fallback to honest unverifiable
      }
    }

    if (liveDnsFailed) {
      spf = {
        status: 'NOT_VERIFIABLE',
        reason: 'SPF verification requires DNS and sending-IP envelope context that is not currently verifiable in this standalone evidence artifact.',
        evidence: `Sender domain: ${fromDomain || '(unknown)'}`,
        source: 'Forensic Evidence Engine',
        provenance: 'NOT VERIFIABLE',
      };
    }
  }

  // -------------------------------------------------------------
  // 2. DKIM EVALUATION
  // -------------------------------------------------------------
  let dkim: DkimEvaluation;
  if (parsedEmail.dkimSignatures.length === 0) {
    dkim = {
      status: 'NO_DKIM_SIGNATURE',
      reason: 'No DKIM-Signature header is present in the email headers.',
      evidence: 'Absence of DKIM-Signature in RFC 5322 header block',
      source: 'Parsed email headers',
      signatures: [],
      provenance: 'VERIFIED FROM EMAIL',
    };
  } else {
    const primarySig = parsedEmail.dkimSignatures[0];
    // Check if Authentication-Results verified it
    if (authResults && authResults.toLowerCase().includes('dkim=pass')) {
      dkim = {
        status: 'PASS',
        reason: `DKIM verification passed for domain ${primarySig.domain} (selector: ${primarySig.selector}).`,
        evidence: `DKIM-Signature present for d=${primarySig.domain}, s=${primarySig.selector}; Authentication-Results confirms dkim=pass`,
        source: 'Authentication-Results & DKIM-Signature',
        signatures: parsedEmail.dkimSignatures,
        provenance: 'VERIFIED FROM EMAIL',
      };
    } else if (authResults && authResults.toLowerCase().includes('dkim=fail')) {
      dkim = {
        status: 'FAIL',
        reason: `DKIM verification failed for domain ${primarySig.domain} according to gateway Authentication-Results.`,
        evidence: authResults,
        source: 'Authentication-Results & DKIM-Signature',
        signatures: parsedEmail.dkimSignatures,
        provenance: 'VERIFIED FROM EMAIL',
      };
    } else {
      dkim = {
        status: 'SIGNATURE_PRESENT_VERIFICATION_UNAVAILABLE',
        reason: `DKIM-Signature header is present (d=${primarySig.domain}, s=${primarySig.selector}, a=${primarySig.algorithm}), but live public key cryptographic verification could not be validated against external DNS.`,
        evidence: `Selector: ${primarySig.selector}, Domain: ${primarySig.domain}, Algorithm: ${primarySig.algorithm}, Body Hash: ${primarySig.bodyHash}`,
        source: 'Parsed DKIM-Signature header',
        signatures: parsedEmail.dkimSignatures,
        provenance: 'DETERMINISTICALLY DERIVED',
      };
    }
  }

  // -------------------------------------------------------------
  // 3. DMARC EVALUATION
  // -------------------------------------------------------------
  let dmarc: DmarcEvaluation = {
    status: 'NOT_VERIFIABLE',
    reason: 'Evaluating DMARC policy...',
    evidence: 'Header inspection in progress',
    source: 'Evidence headers',
    provenance: 'NOT VERIFIABLE',
  };
  if (authResults && authResults.toLowerCase().includes('dmarc=pass')) {
    dmarc = {
      status: 'PASS',
      reason: 'DMARC alignment and authentication verified by receiving MTA.',
      evidence: authResults,
      source: 'Authentication-Results header',
      provenance: 'VERIFIED FROM EMAIL',
    };
  } else if (authResults && authResults.toLowerCase().includes('dmarc=fail')) {
    dmarc = {
      status: 'FAIL',
      reason: 'DMARC evaluation failed according to receiving MTA.',
      evidence: authResults,
      source: 'Authentication-Results header',
      provenance: 'VERIFIED FROM EMAIL',
    };
  } else {
    // Check if domain DMARC record exists via live query
    let liveDmarcQueried = false;
    if (fromDomain) {
      try {
        const dmarcHost = `_dmarc.${fromDomain}`;
        const res = await fetch(`/api/intel/dns?domain=${encodeURIComponent(dmarcHost)}&type=TXT`);
        if (res.ok) {
          const data = await res.json();
          const dmarcRecord = data.results?.TXT?.find((t: string) => t.toLowerCase().startsWith('v=dmarc1'));
          if (dmarcRecord) {
            const pMatch = dmarcRecord.match(/p=([a-zA-Z]+)/i);
            const policy = pMatch ? pMatch[1] : 'none';
            dmarc = {
              status: 'NOT_VERIFIABLE',
              reason: `DMARC record found for ${fromDomain} (policy: p=${policy}), but full DMARC verification requires confirmed SPF/DKIM alignment.`,
              evidence: dmarcRecord,
              policy: policy,
              source: `DNS TXT on ${dmarcHost}`,
              provenance: 'VERIFIED THROUGH EXTERNAL INTELLIGENCE',
            };
            liveDmarcQueried = true;
          }
        }
      } catch {
        // Fallback
      }
    }

    if (!liveDmarcQueried) {
      dmarc = {
        status: 'NOT_VERIFIABLE',
        reason: 'DMARC verification requires DNS policy verification and aligned SPF/DKIM authentication that cannot be confirmed from this standalone artifact.',
        evidence: `From domain: ${fromDomain || '(unknown)'}`,
        source: 'Forensic Evidence Engine',
        provenance: 'NOT VERIFIABLE',
      };
    }
  }

  // -------------------------------------------------------------
  // 4. ALIGNMENT EVALUATION
  // -------------------------------------------------------------
  const fromMatchesReplyTo = !replyToDomain || replyToDomain === fromDomain;
  const fromMatchesReturnPath = !returnPathDomain || returnPathDomain === fromDomain;

  let alignmentStatus: 'ALIGNED' | 'DIFFERENT_DOMAINS' | 'INCOMPLETE_DATA';
  let alignmentExplanation: string;

  if (!fromDomain) {
    alignmentStatus = 'INCOMPLETE_DATA';
    alignmentExplanation = 'From domain could not be resolved from headers.';
  } else if (!fromMatchesReplyTo && !fromMatchesReturnPath) {
    alignmentStatus = 'DIFFERENT_DOMAINS';
    alignmentExplanation = `From domain (${fromDomain}) differs from both Reply-To (${replyToDomain || 'none'}) and Return-Path (${returnPathDomain || 'none'}).`;
  } else if (!fromMatchesReplyTo) {
    alignmentStatus = 'DIFFERENT_DOMAINS';
    alignmentExplanation = `Reply-To domain (${replyToDomain}) differs from From domain (${fromDomain}).`;
  } else if (!fromMatchesReturnPath) {
    alignmentStatus = 'DIFFERENT_DOMAINS';
    alignmentExplanation = `Return-Path domain (${returnPathDomain}) differs from From domain (${fromDomain}).`;
  } else {
    alignmentStatus = 'ALIGNED';
    alignmentExplanation = `From domain (${fromDomain}) aligns with Reply-To and Return-Path.`;
  }

  const alignment: AlignmentEvaluation = {
    fromDomain,
    replyToDomain,
    returnPathDomain,
    fromMatchesReplyTo,
    fromMatchesReturnPath,
    status: alignmentStatus,
    explanation: alignmentExplanation,
    source: 'Parsed headers (From, Reply-To, Return-Path)',
    provenance: 'DETERMINISTICALLY DERIVED',
  };

  return {
    spf,
    dkim,
    dmarc,
    alignment,
  };
}
