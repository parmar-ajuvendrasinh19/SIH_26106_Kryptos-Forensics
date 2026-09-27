import React, { useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { ShieldAlert, ShieldCheck, HelpCircle, Activity, Info, ChevronRight, Layers } from 'lucide-react';
import { InvestigationState } from '../../types';

interface RiskBreakdownRadarProps {
  state: InvestigationState;
}

interface RadarDataPoint {
  threatVector: string;
  shortLabel: string;
  score: number;
  weightedContribution: number;
  fullMark: number;
  description: string;
  category: 'AUTH' | 'CONTENT' | 'TECH' | 'FUSED';
}

export const RiskBreakdownRadar: React.FC<RiskBreakdownRadarProps> = ({ state }) => {
  const [selectedVector, setSelectedVector] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'ALL_VECTORS' | 'CORE_TRIAD'>('ALL_VECTORS');

  const fusion = state.fusion;
  const contentScore = state.contentAnalysis?.contentScore ?? 0;
  const technicalScore = state.technicalAnalysis?.technicalScore ?? 0;
  const fusedScore = fusion?.fusedScore ?? 0;

  // 1. Compute Authentication Risk Vector (0–100)
  let authRawPoints = 0;
  const authMaxPoints = 88;
  const auth = state.authentication;
  if (auth) {
    if (auth.spf.status === 'FAIL') authRawPoints += 25;
    else if (auth.spf.status === 'NOT_PRESENT') authRawPoints += 10;

    if (auth.dkim.status === 'FAIL') authRawPoints += 25;
    else if (auth.dkim.status === 'NO_DKIM_SIGNATURE' || auth.dkim.status === 'NOT_VERIFIABLE') authRawPoints += 10;

    if (auth.dmarc.status === 'FAIL') authRawPoints += 20;
    else if (auth.dmarc.status === 'NO_POLICY_RECORD') authRawPoints += 10;

    if (auth.alignment.status === 'DIFFERENT_DOMAINS') authRawPoints += 18;
  }
  const authScore = Math.min(100, Math.round((authRawPoints / authMaxPoints) * 100));

  // 2. Compute Specific Technical Sub-vectors
  const techFeatures = state.technicalAnalysis?.features || [];
  const attachmentRisk = techFeatures.find((f) => f.feature === 'ATTACHMENT_RISK')?.weight ?? 0;
  const attachmentScore = Math.min(100, Math.round((attachmentRisk / 30) * 100));

  const linkRisk = techFeatures.find((f) => f.feature === 'SUSPICIOUS_LINKS')?.weight ?? 0;
  const domainRisk = techFeatures.find((f) => f.feature === 'DOMAIN_AGE_SUSPICIOUS')?.weight ?? 0;
  const iocScore = Math.min(100, Math.round(((linkRisk + domainRisk) / 40) * 100));

  const headerRisk = techFeatures.find((f) => f.feature === 'HEADER_DISCREPANCY')?.weight ?? 0;
  const infraScore = Math.min(100, Math.round((headerRisk / 8) * 100));

  // 3. Proportional Weighted Contribution to Fused Score
  const cRisk = contentScore / 100;
  const tRisk = technicalScore / 100;
  const totalRiskSum = cRisk + tRisk;

  let contentContribution = 0;
  let technicalContribution = 0;
  if (totalRiskSum > 0) {
    contentContribution = Math.round(fusedScore * (cRisk / totalRiskSum));
    technicalContribution = fusedScore - contentContribution;
  }

  // Split Technical Contribution between Authentication and other infrastructure/payloads
  const authWeightInTech = techFeatures
    .filter(
      (f) =>
        (f.id.includes('spf') || f.id.includes('dkim') || f.id.includes('dmarc') || f.id.includes('alignment')) &&
        f.state === 'KNOWN'
    )
    .reduce((sum, f) => sum + f.weight, 0);

  const totalTechWeight = Math.max(1, technicalScore);
  const authShareOfTech = Math.min(1, authWeightInTech / totalTechWeight);
  const authContribution = Math.round(technicalContribution * authShareOfTech);
  const otherTechContribution = Math.max(0, technicalContribution - authContribution);

  const attachShare = attachmentRisk / Math.max(1, attachmentRisk + linkRisk + domainRisk + headerRisk);
  const attachContribution = Math.round(otherTechContribution * attachShare);
  const iocContribution = Math.max(0, otherTechContribution - attachContribution);

  // 4. Radar Datasets
  const allVectorsData: RadarDataPoint[] = [
    {
      threatVector: 'Authentication Protocol',
      shortLabel: 'Authentication',
      score: authScore,
      weightedContribution: authContribution,
      fullMark: 100,
      description: 'SPF, DKIM, DMARC protocol verification and sender domain alignment checks.',
      category: 'AUTH',
    },
    {
      threatVector: 'Content & Language (Model A)',
      shortLabel: 'Content Threat',
      score: contentScore,
      weightedContribution: contentContribution,
      fullMark: 100,
      description: 'Urgency, extortion, coercion, and credential phishing markers detected in email body/subject.',
      category: 'CONTENT',
    },
    {
      threatVector: 'Technical Infrastructure (Model B)',
      shortLabel: 'Technical Features',
      score: technicalScore,
      weightedContribution: technicalContribution,
      fullMark: 100,
      description: 'Combined technical telemetry: headers, hops, IP origin, and client user-agent discrepancies.',
      category: 'TECH',
    },
    {
      threatVector: 'Attachment & Payload',
      shortLabel: 'Payload Risk',
      score: attachmentScore,
      weightedContribution: attachContribution,
      fullMark: 100,
      description: 'Executable payload risks, dangerous file extensions, script macros, and MIME anomalies.',
      category: 'TECH',
    },
    {
      threatVector: 'Domain & Network IOCs',
      shortLabel: 'Network & IOCs',
      score: iocScore,
      weightedContribution: iocContribution,
      fullMark: 100,
      description: 'Lookalike/homograph domains, newly registered domains, and external suspicious link indicators.',
      category: 'TECH',
    },
  ];

  const coreTriadData: RadarDataPoint[] = [
    {
      threatVector: 'Authentication Integrity',
      shortLabel: 'Authentication',
      score: authScore,
      weightedContribution: authContribution,
      fullMark: 100,
      description: 'Cryptographic SPF, DKIM, DMARC spoofing validation.',
      category: 'AUTH',
    },
    {
      threatVector: 'Content Threat (Model A)',
      shortLabel: 'Content Threat',
      score: contentScore,
      weightedContribution: contentContribution,
      fullMark: 100,
      description: 'Psychological coercion, urgency, and deceptive linguistic cues.',
      category: 'CONTENT',
    },
    {
      threatVector: 'Technical Threat (Model B)',
      shortLabel: 'Technical Threat',
      score: technicalScore,
      weightedContribution: technicalContribution,
      fullMark: 100,
      description: 'Infrastructure, attachment, and network forensic anomalies.',
      category: 'TECH',
    },
  ];

  const radarData = viewMode === 'ALL_VECTORS' ? allVectorsData : coreTriadData;

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as RadarDataPoint;
      return (
        <div className="bg-[#142238] text-white p-3 rounded-lg shadow-xl border border-[#24354d] text-xs max-w-xs z-50 pointer-events-none">
          <div className="font-bold text-xs text-[#2DBDCA] uppercase tracking-wider mb-1">
            {data.threatVector}
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between gap-4">
              <span className="text-[#A0B0C0]">Evaluated Threat:</span>
              <span className="font-bold text-white">{data.score} / 100</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#A0B0C0]">Contribution to Fused:</span>
              <span className="font-bold text-[#D94A4A]">+{data.weightedContribution} pts</span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[#A0B0C0] border-t border-[#24354d] pt-1.5 font-sans leading-relaxed">
            {data.description}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#FAFBFB] rounded-xl border border-[#D9E1E6] p-4 sm:p-5 shadow-2xs">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#D9E1E6]">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono font-bold text-[#2DBDCA] uppercase tracking-wider">
              Forensic Risk Breakdown
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#142238] text-white font-mono font-bold">
              RADAR TELEMETRY
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#142238] flex items-center gap-2">
            Multi-Vector Threat & Fused Contribution Radar
          </h3>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-[#D9E1E6] text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('ALL_VECTORS')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'ALL_VECTORS'
                ? 'bg-[#142238] text-white font-bold shadow-xs'
                : 'text-[#53657A] hover:text-[#142238]'
            }`}
          >
            All 5 Vectors
          </button>
          <button
            type="button"
            onClick={() => setViewMode('CORE_TRIAD')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'CORE_TRIAD'
                ? 'bg-[#142238] text-white font-bold shadow-xs'
                : 'text-[#53657A] hover:text-[#142238]'
            }`}
          >
            Core Triad (Auth / Content / Tech)
          </button>
        </div>
      </div>

      {/* Main Grid: Radar Chart + Weighted Breakdown Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left Column: Recharts Radar Visualization (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-white rounded-lg border border-[#D9E1E6] p-3 shadow-2xs">
          <div className="w-full h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                <PolarGrid stroke="#D9E1E6" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="shortLabel"
                  tick={{ fill: '#142238', fontSize: 11, fontWeight: 700 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: '#53657A', fontSize: 9 }}
                  stroke="#D9E1E6"
                />
                <Radar
                  name="Observed Threat (0–100)"
                  dataKey="score"
                  stroke="#2DBDCA"
                  fill="#2DBDCA"
                  fillOpacity={0.4}
                />
                <Radar
                  name="Weighted Fused Contribution (pts)"
                  dataKey="weightedContribution"
                  stroke="#D94A4A"
                  fill="#D94A4A"
                  fillOpacity={0.25}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <span className="text-[10px] text-[#53657A] text-center mt-1">
            Cyan polygon illustrates evaluated raw threat intensity; red polygon illustrates weighted points contributed to the final score.
          </span>
        </div>

        {/* Right Column: Mathematical Weights & Weighted Attribution Table (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Fused Risk Metric Capsule */}
          <div className="p-3.5 bg-[#142238] text-white rounded-lg border border-[#24354d] shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#2DBDCA]">
                Final Fused Score Attribution
              </span>
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                  fusedScore >= 70
                    ? 'bg-[#D94A4A]/20 text-[#ff7878] border border-[#D94A4A]/40'
                    : fusedScore >= 35
                    ? 'bg-[#D89428]/20 text-[#ffc86b] border border-[#D89428]/40'
                    : 'bg-[#1FA463]/20 text-[#54e49e] border border-[#1FA463]/40'
                }`}
              >
                {fusion?.verdict?.replace(/_/g, ' ') || 'PENDING'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-bold text-white">{fusedScore}</span>
              <span className="text-xs text-[#A0B0C0] font-mono">/ 100 points</span>
            </div>
            <p className="text-[11px] text-[#A0B0C0] mt-1.5 leading-relaxed font-mono">
              fusedRisk = 1 - ((1 - contentRisk) × (1 - technicalRisk))
            </p>
          </div>

          {/* Attribution Breakdown Cards */}
          <div className="space-y-2">
            {/* Authentication Vector */}
            <div
              onClick={() => setSelectedVector(selectedVector === 'AUTH' ? null : 'AUTH')}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                selectedVector === 'AUTH'
                  ? 'bg-white border-[#2DBDCA] shadow-xs'
                  : 'bg-white border-[#D9E1E6] hover:border-[#2DBDCA]/60'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0e808c]" />
                  <span className="font-bold text-[#142238]">1. Authentication Threats</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[11px] text-[#53657A]">{authScore}/100</span>
                  <span className="font-bold text-[#D94A4A] text-xs">+{authContribution} pts</span>
                </div>
              </div>
              {/* Contribution Bar */}
              <div className="w-full bg-[#E5E9EC] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#0e808c] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, (authContribution / Math.max(1, fusedScore)) * 100))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#53657A] mt-1">
                <span>SPF: {auth?.spf.status || '--'} • DKIM: {auth?.dkim.status || '--'}</span>
                <span>{fusedScore > 0 ? `${Math.round((authContribution / fusedScore) * 100)}% of total` : '0%'}</span>
              </div>
            </div>

            {/* Content Threat Vector */}
            <div
              onClick={() => setSelectedVector(selectedVector === 'CONTENT' ? null : 'CONTENT')}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                selectedVector === 'CONTENT'
                  ? 'bg-white border-[#2DBDCA] shadow-xs'
                  : 'bg-white border-[#D9E1E6] hover:border-[#2DBDCA]/60'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2DBDCA]" />
                  <span className="font-bold text-[#142238]">2. Linguistic Threats (Model A)</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[11px] text-[#53657A]">{contentScore}/100</span>
                  <span className="font-bold text-[#D94A4A] text-xs">+{contentContribution} pts</span>
                </div>
              </div>
              {/* Contribution Bar */}
              <div className="w-full bg-[#E5E9EC] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#2DBDCA] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, (contentContribution / Math.max(1, fusedScore)) * 100))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#53657A] mt-1">
                <span>{state.contentAnalysis?.findings.length || 0} language triggers observed</span>
                <span>{fusedScore > 0 ? `${Math.round((contentContribution / fusedScore) * 100)}% of total` : '0%'}</span>
              </div>
            </div>

            {/* Technical Threat Vector */}
            <div
              onClick={() => setSelectedVector(selectedVector === 'TECH' ? null : 'TECH')}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                selectedVector === 'TECH'
                  ? 'bg-white border-[#2DBDCA] shadow-xs'
                  : 'bg-white border-[#D9E1E6] hover:border-[#2DBDCA]/60'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#142238]" />
                  <span className="font-bold text-[#142238]">3. Technical Threats (Model B)</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[11px] text-[#53657A]">{technicalScore}/100</span>
                  <span className="font-bold text-[#D94A4A] text-xs">+{technicalContribution} pts</span>
                </div>
              </div>
              {/* Contribution Bar */}
              <div className="w-full bg-[#E5E9EC] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#142238] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, (technicalContribution / Math.max(1, fusedScore)) * 100))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#53657A] mt-1">
                <span>{state.technicalAnalysis?.features.filter((f) => f.state === 'KNOWN' && f.weight > 0).length || 0} active technical features</span>
                <span>{fusedScore > 0 ? `${Math.round((technicalContribution / fusedScore) * 100)}% of total` : '0%'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
