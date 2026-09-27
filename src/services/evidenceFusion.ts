/**
 * Kryptos Forensics — Evidence Fusion Engine
 * Fuses Model A (Content Analysis) and Model B (Technical Analysis) deterministically.
 * NEVER creates fake scores. Transparently displays formulas and factor contributions.
 */

import { ContentAnalysisState, TechnicalAnalysisState, EvidenceFusionState } from '../types';

export function fuseEvidence(
  contentAnalysis: ContentAnalysisState | null,
  technicalAnalysis: TechnicalAnalysisState | null
): EvidenceFusionState {
  if (!contentAnalysis && !technicalAnalysis) {
    return {
      contentRisk: 0,
      technicalRisk: 0,
      fusedRisk: 0,
      fusedScore: 0,
      verdict: 'INSUFFICIENT_EVIDENCE',
      formulaUsed: 'None — Evidence components have not executed.',
      contentSignalCount: 0,
      technicalSignalCount: 0,
      observedSignals: [],
      explanation: 'Both Content Analysis and Technical Analysis must be completed before evidence fusion can proceed.',
      whyBreakdown: [],
    };
  }

  const cScore = contentAnalysis ? contentAnalysis.contentScore : 0;
  const tScore = technicalAnalysis ? technicalAnalysis.technicalScore : 0;

  const contentRisk = parseFloat((cScore / 100).toFixed(3));
  const technicalRisk = parseFloat((tScore / 100).toFixed(3));

  // Independent joint probability fusion:
  // fusedRisk = 1 - ((1 - contentRisk) * (1 - technicalRisk))
  const fusedRisk = parseFloat((1 - (1 - contentRisk) * (1 - technicalRisk)).toFixed(3));
  const fusedScore = Math.round(fusedRisk * 100);

  const observedSignals: EvidenceFusionState['observedSignals'] = [];
  const whyBreakdown: EvidenceFusionState['whyBreakdown'] = [];

  // Add content signals
  if (contentAnalysis) {
    contentAnalysis.findings.forEach((f) => {
      observedSignals.push({
        name: f.category,
        weight: f.weight,
        source: `${f.location} ("${f.quote}")`,
        category: 'Content',
      });
      whyBreakdown.push({
        factor: f.category,
        contribution: `+${f.weight} points`,
        evidence: f.quote,
        source: `${f.location} (${f.provenance})`,
      });
    });
  }

  // Add technical signals
  if (technicalAnalysis) {
    technicalAnalysis.features
      .filter((feat) => feat.state === 'KNOWN' && feat.weight > 0)
      .forEach((feat) => {
        observedSignals.push({
          name: feat.feature,
          weight: feat.weight,
          source: `${feat.value} [${feat.source}]`,
          category: 'Technical',
        });
        whyBreakdown.push({
          factor: feat.feature,
          contribution: `+${feat.weight} points`,
          evidence: feat.value,
          source: `${feat.source} (${feat.provenance})`,
        });
      });
  }

  let verdict: EvidenceFusionState['verdict'] = 'LOW_EVIDENCE_OF_THREAT';
  let explanation = 'Based on the verified evidence, no significant threat signals were confirmed in either content or technical infrastructure.';

  if (fusedScore >= 60) {
    verdict = 'HIGH_CONFIDENCE_THREAT';
    explanation = 'Corroborated high-risk indicators observed across both linguistic content and technical headers/routing.';
  } else if (fusedScore > 20) {
    verdict = 'ELEVATED_RISK_DETECTED';
    explanation = 'Multiple caution indicators identified. Independent investigation recommended before taking action.';
  }

  const formulaUsed = 'fusedRisk = 1 - ((1 - contentRisk) × (1 - technicalRisk)) [Normalized to 0–100 scale]';

  return {
    contentRisk,
    technicalRisk,
    fusedRisk,
    fusedScore,
    verdict,
    formulaUsed,
    contentSignalCount: contentAnalysis?.findings.length || 0,
    technicalSignalCount: technicalAnalysis?.features.filter((f) => f.state === 'KNOWN' && f.weight > 0).length || 0,
    observedSignals,
    explanation,
    whyBreakdown,
  };
}
