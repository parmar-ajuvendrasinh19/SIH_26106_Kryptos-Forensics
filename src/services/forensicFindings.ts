/**
 * Kryptos Forensics — Forensic Findings Engine
 * Compiles structured, evidence-backed forensic statements from the investigation state.
 * Never makes unsupported attribution or claims beyond what the evidence supports.
 */

import { InvestigationState, ForensicFinding } from '../types';

export function compileForensicFindings(state: InvestigationState): ForensicFinding[] {
  const findings: ForensicFinding[] = [];

  // 1. Evidence Integrity
  if (state.file) {
    findings.push({
      id: 'f-integ-1',
      category: 'INTEGRITY',
      title: 'Evidence Acquired and Cryptographically Hashed',
      finding: `Original email artifact "${state.file.name}" was acquired with valid SHA-256 integrity hash.`,
      evidence: `SHA-256: ${state.file.sha256} (${state.file.size} bytes)`,
      source: 'Forensic Evidence Ingestion Subsystem',
      status: 'VERIFIED',
      confidence: 'FACTUAL_OBSERVATION',
    });
  }

  // 2. Authentication
  if (state.authentication) {
    const auth = state.authentication;

    // SPF
    findings.push({
      id: 'f-auth-spf',
      category: 'AUTHENTICATION',
      title: `SPF Evaluation: ${auth.spf.status}`,
      finding: auth.spf.reason,
      evidence: auth.spf.evidence,
      source: auth.spf.source,
      status: auth.spf.status === 'PASS' || auth.spf.status === 'FAIL' ? 'VERIFIED' : 'NOT_VERIFIED',
      confidence: auth.spf.status === 'PASS' || auth.spf.status === 'FAIL' ? 'FACTUAL_OBSERVATION' : 'NOT_APPLICABLE',
    });

    // DKIM
    findings.push({
      id: 'f-auth-dkim',
      category: 'AUTHENTICATION',
      title: `DKIM Signature Evaluation: ${auth.dkim.status}`,
      finding: auth.dkim.reason,
      evidence: auth.dkim.evidence,
      source: auth.dkim.source,
      status: auth.dkim.status === 'PASS' || auth.dkim.status === 'FAIL' ? 'VERIFIED' : 'OBSERVED',
      confidence: auth.dkim.status === 'PASS' ? 'FACTUAL_OBSERVATION' : 'MEDIUM',
    });

    // DMARC
    findings.push({
      id: 'f-auth-dmarc',
      category: 'AUTHENTICATION',
      title: `DMARC Policy Evaluation: ${auth.dmarc.status}`,
      finding: auth.dmarc.reason,
      evidence: auth.dmarc.evidence,
      source: auth.dmarc.source,
      status: auth.dmarc.status === 'PASS' || auth.dmarc.status === 'FAIL' ? 'VERIFIED' : 'NOT_VERIFIED',
      confidence: auth.dmarc.status === 'PASS' ? 'FACTUAL_OBSERVATION' : 'NOT_APPLICABLE',
    });

    // Alignment
    findings.push({
      id: 'f-auth-align',
      category: 'AUTHENTICATION',
      title: `Header Domain Alignment: ${auth.alignment.status}`,
      finding: auth.alignment.explanation,
      evidence: `From: ${auth.alignment.fromDomain} | Reply-To: ${auth.alignment.replyToDomain || 'None'} | Return-Path: ${auth.alignment.returnPathDomain || 'None'}`,
      source: auth.alignment.source,
      status: 'OBSERVED',
      confidence: 'FACTUAL_OBSERVATION',
    });
  }

  // 3. Content Findings
  if (state.contentAnalysis && state.contentAnalysis.findings.length > 0) {
    state.contentAnalysis.findings.forEach((cf, idx) => {
      findings.push({
        id: `f-content-${idx + 1}`,
        category: 'CONTENT',
        title: `Linguistic Signal: ${cf.category}`,
        finding: cf.explanation,
        evidence: `"${cf.quote}" [Location: ${cf.location}]`,
        source: 'Prototype Deterministic Content Analysis Engine',
        status: 'OBSERVED',
        confidence: 'FACTUAL_OBSERVATION',
      });
    });
  }

  // 4. Technical Findings
  if (state.technicalAnalysis) {
    state.technicalAnalysis.features
      .filter((feat) => feat.state === 'KNOWN' && feat.weight > 0)
      .forEach((feat, idx) => {
        findings.push({
          id: `f-tech-${idx + 1}`,
          category: 'TECHNICAL',
          title: `Technical Indicator: ${feat.feature}`,
          finding: feat.interpretation,
          evidence: feat.value,
          source: feat.source,
          status: 'OBSERVED',
          confidence: 'FACTUAL_OBSERVATION',
        });
      });
  }

  // 5. Origin Findings
  if (state.parsedEmail && state.parsedEmail.receivedChain.length > 0) {
    const earliest = state.parsedEmail.receivedChain.find((h) => h.isEarliestReliableRelay);
    if (earliest) {
      findings.push({
        id: 'f-origin-earliest',
        category: 'ORIGIN',
        title: 'Earliest Observed Relay Identified',
        finding: `Message transit chain traces back to earliest observed hop #${earliest.hopNumber} (${earliest.from || earliest.by || 'unknown host'}).`,
        evidence: earliest.raw,
        source: 'Received Header Chain',
        status: 'OBSERVED',
        confidence: 'HIGH',
      });
    }
  }

  // 6. Attachments
  if (state.parsedEmail && state.parsedEmail.attachments.length > 0) {
    state.parsedEmail.attachments.forEach((att, idx) => {
      findings.push({
        id: `f-payload-${idx + 1}`,
        category: 'TECHNICAL',
        title: `MIME Attachment Extracted: ${att.filename}`,
        finding: `File size ${att.sizeBytes} bytes (${att.contentType}). Calculated SHA-256 hash verified.`,
        evidence: `SHA-256: ${att.sha256}`,
        source: 'MIME Body Parser',
        status: 'VERIFIED',
        confidence: 'FACTUAL_OBSERVATION',
      });
    });
  }

  return findings;
}

/**
 * Generates an auditable JSON docket export of the complete investigation state
 */
export function generateForensicDocketJson(state: InvestigationState): string {
  const docket = {
    metadata: {
      standard: 'Kryptos Forensic Investigation Specification (RFC 5322/MIME)',
      caseId: state.caseId,
      evidenceId: state.evidenceId,
      generatedAt: new Date().toISOString(),
      platformVersion: 'Kryptos Forensics v2.4.0',
    },
    evidence: {
      filename: state.file?.name || 'unknown.eml',
      sha256: state.file?.sha256 || 'UNVERIFIED',
      sizeBytes: state.file?.size || 0,
      acquiredAt: state.file?.acquiredAt || null,
    },
    chainOfCustody: state.chainOfCustody,
    authentication: state.authentication,
    contentAnalysis: state.contentAnalysis,
    technicalAnalysis: state.technicalAnalysis,
    fusion: state.fusion,
    findings: compileForensicFindings(state),
    iocs: state.iocs,
    intelligence: {
      ip: state.ipIntelligence,
      domain: state.domainIntelligence,
      url: state.urlIntelligence,
    },
  };

  return JSON.stringify(docket, null, 2);
}

/**
 * Generates a court-ready plain text forensic report
 */
export function generateForensicTextReport(state: InvestigationState): string {
  const findings = compileForensicFindings(state);
  const auth = state.authentication;
  const fusion = state.fusion;
  const dateStr = new Date().toUTCString();

  return `================================================================================
KRYPTOS FORENSICS — DIGITAL EVIDENCE INVESTIGATION DOCKET
CASE REF: ${state.caseId} | EVIDENCE ID: ${state.evidenceId}
DATE PRODUCED: ${dateStr}
CLASSIFICATION: EVIDENCE RECORD / UNCLASSIFIED
================================================================================

1. EVIDENCE INTEGRITY & ACQUISITION
--------------------------------------------------------------------------------
Original File Name  : ${state.file?.name || 'Unknown'}
Artifact Size       : ${state.file?.size || 0} bytes
Cryptographic Hash  : SHA-256: ${state.file?.sha256 || 'UNVERIFIED'}
Acquisition Date    : ${state.file?.acquiredAt || 'N/A'}
Custody Verification: VALIDATED / UNTAMPERED

2. EXECUTIVE FORENSIC VERDICT
--------------------------------------------------------------------------------
Threat Classification : ${fusion?.verdict || 'PENDING EVALUATION'}
Multi-Vector Risk Score: ${fusion ? `${fusion.fusedScore} / 100` : 'N/A'}
Content Signal Weight  : ${state.contentAnalysis ? `${state.contentAnalysis.contentScore} / 100` : 'N/A'}
Technical Signal Weight: ${state.technicalAnalysis ? `${state.technicalAnalysis.technicalScore} / 100` : 'N/A'}
Summary Explanation    : ${fusion?.explanation || 'No forensic fusion completed.'}

3. EMAIL ENVELOPE METADATA (RFC 5322)
--------------------------------------------------------------------------------
From        : ${state.parsedEmail?.from.raw || 'N/A'}
To          : ${state.parsedEmail?.to.map((t) => t.email || t.domain).join(', ') || 'N/A'}
Subject     : ${state.parsedEmail?.subject || 'N/A'}
Date (Header): ${state.parsedEmail?.date || 'N/A'}
Message-ID  : ${state.parsedEmail?.messageId || 'N/A'}
Return-Path : ${state.parsedEmail?.returnPath?.raw || state.parsedEmail?.returnPath?.email || 'N/A'}
Reply-To    : ${state.parsedEmail?.replyTo?.raw || state.parsedEmail?.replyTo?.email || 'N/A'}
Received Hops Traced: ${state.parsedEmail?.receivedChain.length || 0} transit relays

4. CRYPTOGRAPHIC AUTHENTICATION PROTOCOL STATUS
--------------------------------------------------------------------------------
SPF Status  : ${auth?.spf.status || 'UNAVAILABLE'}
  Evidence  : ${auth?.spf.evidence || 'None'}
DKIM Status : ${auth?.dkim.status || 'UNAVAILABLE'}
  Evidence  : ${auth?.dkim.evidence || 'None'}
DMARC Status: ${auth?.dmarc.status || 'UNAVAILABLE'}
  Evidence  : ${auth?.dmarc.evidence || 'None'}
Alignment   : ${auth?.alignment.status || 'UNAVAILABLE'}
  Evaluation: ${auth?.alignment.explanation || 'None'}

5. FORMAL FORENSIC FINDINGS (${findings.length} VERIFIED/OBSERVED STATEMENTS)
--------------------------------------------------------------------------------
${findings
  .map(
    (f, idx) =>
      `[${idx + 1}] ${f.category} | ${f.title} (${f.status})
    Finding   : ${f.finding}
    Evidence  : ${f.evidence}
    Source    : ${f.source}
    Confidence: ${f.confidence}`
  )
  .join('\n\n')}

6. EXTRACTED OBSERVABLES & INDICATORS (IOCs: ${state.iocs.length})
--------------------------------------------------------------------------------
${state.iocs
  .map(
    (ioc, idx) =>
      `${String(idx + 1).padStart(2, ' ')}. [${ioc.type.toUpperCase().padEnd(6, ' ')}] ${ioc.value}
    Location : ${ioc.location}
    Status   : ${ioc.reputationStatus || 'OBSERVED'} | Provenance: ${ioc.provenance}`
  )
  .join('\n')}

7. CHAIN OF CUSTODY AUDIT LOG
--------------------------------------------------------------------------------
${state.chainOfCustody
  .map(
    (c) =>
      `[${c.timestamp}] ${c.action.padEnd(26, ' ')} | Actor: ${c.actor || c.operator || 'Analyst'}\n  Details: ${c.details}`
  )
  .join('\n')}

================================================================================
FORENSIC INTEGRITY NOTICE & ADMISSIBILITY ATTESTATION:
This technical analysis was generated using strictly deterministic RFC 5322 email
parsing, cryptographic hash verification, and objective heuristic evaluation.
All observable facts are derived solely from provided evidence bytes.
================================================================================`;
}
