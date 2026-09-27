/**
 * Kryptos Forensics — Model A: Prototype Deterministic Content Analysis Engine
 * Analyzes parsed email content (Subject, Body, HTML) for explainable linguistic signals.
 * Points to the exact quote and location. NEVER invents findings.
 */

import { ParsedEmail, ContentFinding, ContentAnalysisState } from '../types';

interface PatternRule {
  category: ContentFinding['category'];
  regex: RegExp;
  weight: number;
  explanation: string;
}

const RULES: PatternRule[] = [
  {
    category: 'Urgency',
    regex: /\b(within 24 hours|within 48 hours|immediate(?:ly)? (?:action|response|attention)|immediate action required|will be suspended|account is suspended|permanently (?:disabled|deleted)|act now|urgent notice|final warning)\b/i,
    weight: 18,
    explanation: 'High-pressure urgency language creating artificial time distress to bypass rational verification.',
  },
  {
    category: 'Credential Request',
    regex: /\b(verify your (?:password|credentials|account|identity)|confirm your (?:password|login|credentials)|enter your (?:password|pin|passcode)|reset your (?:password|security details)|update your login|authenticate your account)\b/i,
    weight: 25,
    explanation: 'Explicit solicitation of user authentication credentials or security secrets.',
  },
  {
    category: 'Payment / Wire',
    regex: /\b(wire transfer|gift cards?|bitcoin|cryptocurrency|send (?:money|funds)|unpaid invoice|payment overdue|direct deposit change|update banking details|payroll routing)\b/i,
    weight: 25,
    explanation: 'Financial redirection or immediate wire transfer solicitation commonly associated with Business Email Compromise (BEC).',
  },
  {
    category: 'Account Verification',
    regex: /\b(unusual sign-in activity|unauthorized login attempt|security alert: unauthorized access|reactivate your account|validate your mailbox|quota exceeded|storage limit reached)\b/i,
    weight: 15,
    explanation: 'Pretexting of security anomalies or quota depletion to induce credential submission.',
  },
  {
    category: 'Impersonation',
    regex: /\b(it (?:helpdesk|support team|service desk)|human resources department|payroll team|security operations center|office of the ceo)\b/i,
    weight: 12,
    explanation: 'Authority pretexts designed to lower vigilance through internal organizational hierarchy.',
  },
  {
    category: 'Suspicious Instruction',
    regex: /\b(do not call|do not contact|strictly confidential request|bypass (?:normal|standard) procedure|disable (?:antivirus|protection)|enable macros)\b/i,
    weight: 20,
    explanation: 'Explicit instructions seeking to isolate the victim or disable defense mechanisms.',
  },
];

export function analyzeContent(parsedEmail: ParsedEmail): ContentAnalysisState {
  const findings: ContentFinding[] = [];
  const seenQuotes = new Set<string>();

  // 1. Analyze Subject
  const subject = parsedEmail.subject || '';
  RULES.forEach((rule) => {
    const match = subject.match(rule.regex);
    if (match && !seenQuotes.has(match[0].toLowerCase())) {
      seenQuotes.add(match[0].toLowerCase());
      findings.push({
        id: `finding-${findings.length + 1}`,
        category: rule.category,
        quote: match[0],
        location: 'Subject',
        weight: rule.weight,
        explanation: rule.explanation,
        provenance: 'VERIFIED FROM EMAIL',
      });
    }
  });

  // 2. Analyze Body Lines
  const bodyText = parsedEmail.plainText || '';
  const lines = bodyText.split('\n');

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) return;

    RULES.forEach((rule) => {
      const match = trimmed.match(rule.regex);
      if (match && !seenQuotes.has(match[0].toLowerCase())) {
        seenQuotes.add(match[0].toLowerCase());
        findings.push({
          id: `finding-${findings.length + 1}`,
          category: rule.category,
          quote: trimmed.length > 120 ? `${trimmed.substring(0, 117)}...` : trimmed,
          location: 'Email Body',
          weight: rule.weight,
          explanation: rule.explanation,
          provenance: 'VERIFIED FROM EMAIL',
        });
      }
    });
  });

  // Calculate deterministic score (capped at 100)
  const rawSum = findings.reduce((sum, f) => sum + f.weight, 0);
  const contentScore = Math.min(100, rawSum);

  let riskLevel: ContentAnalysisState['riskLevel'] = 'LOW';
  let explanation = 'No significant suspicious language, urgency, or credential solicitations were identified in the subject or body.';

  if (contentScore >= 45) {
    riskLevel = 'HIGH';
    explanation = `High concentration of suspicious language patterns observed: ${findings.map((f) => f.category).join(', ')}.`;
  } else if (contentScore > 0) {
    riskLevel = 'MEDIUM';
    explanation = `Observable warning signals detected in content: ${findings.map((f) => f.category).join(', ')}.`;
  }

  return {
    modelName: 'Prototype Deterministic Content Analysis Engine',
    modelVersion: 'v1.4.0 (Explainable Forensic Grammar)',
    isProductionModel: false,
    findings,
    contentScore,
    riskLevel,
    explanation,
  };
}

export const analyzeEmailContent = analyzeContent;
