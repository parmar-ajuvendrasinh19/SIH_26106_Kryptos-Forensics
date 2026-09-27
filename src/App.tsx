import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { StageProgressBar } from './components/StageProgressBar';
import { StageController } from './components/StageController';
import { Stage01Intake } from './components/stages/Stage01Intake';
import { Stage02Parser } from './components/stages/Stage02Parser';
import { Stage03Auth } from './components/stages/Stage03Auth';
import { Stage04IOC } from './components/stages/Stage04IOC';
import { Stage05Intelligence } from './components/stages/Stage05Intelligence';
import { Stage06ContentAnalysis } from './components/stages/Stage06ContentAnalysis';
import { Stage07TechnicalAnalysis } from './components/stages/Stage07TechnicalAnalysis';
import { Stage08Fusion } from './components/stages/Stage08Fusion';
import { Stage09Origin } from './components/stages/Stage09Origin';
import { Stage10Graph } from './components/stages/Stage10Graph';
import { Stage11Campaign } from './components/stages/Stage11Campaign';
import { Stage12Findings } from './components/stages/Stage12Findings';
import { ExplainabilityModal } from './components/ExplainabilityModal';
import { VoiceAssistantModal } from './components/voice/VoiceAssistantModal';
import { ThreatLandscapeOverlay } from './components/ThreatLandscapeOverlay';
import { X, Copy, Check, FileText } from 'lucide-react';

import {
  InvestigationState,
  StageId,
  StageStatus,
  IOC,
  ContentFinding,
} from './types';
import { computeSha256 } from './services/cryptoUtils';
import { parseEmail } from './services/emailParser';
import { evaluateAuthentication } from './services/authEvaluator';
import { extractIOCs } from './services/iocExtractor';
import {
  queryIpIntelligence,
  queryDomainIntelligence,
  queryUrlIntelligence,
} from './services/intelligenceService';
import { analyzeEmailContent } from './services/contentAnalyzer';
import { analyzeTechnicalThreats } from './services/technicalAnalyzer';
import { fuseEvidence } from './services/evidenceFusion';
import { buildThreatGraph } from './services/graphBuilder';
import { SAMPLE_EMAILS } from './services/sampleEmails';

const STAGE_SEQUENCE: StageId[] = [
  '01_INTAKE',
  '02_PARSER',
  '03_AUTHENTICATION',
  '04_IOC',
  '05_INTELLIGENCE',
  '06_CONTENT_ANALYSIS',
  '07_TECHNICAL_ANALYSIS',
  '08_FUSION',
  '09_ORIGIN',
  '10_GRAPH',
  '11_CAMPAIGN',
  '12_REPORT',
];

const initialStageStatuses: Record<StageId, StageStatus> = {
  '01_INTAKE': 'COMPLETE',
  '02_PARSER': 'READY',
  '03_AUTHENTICATION': 'LOCKED',
  '04_IOC': 'LOCKED',
  '05_INTELLIGENCE': 'LOCKED',
  '06_CONTENT_ANALYSIS': 'LOCKED',
  '07_TECHNICAL_ANALYSIS': 'LOCKED',
  '08_FUSION': 'LOCKED',
  '09_ORIGIN': 'LOCKED',
  '10_GRAPH': 'LOCKED',
  '11_CAMPAIGN': 'LOCKED',
  '12_REPORT': 'LOCKED',
};

export const App: React.FC = () => {
  const [isRunningStage, setIsRunningStage] = useState(false);
  const [isAutoplayActive, setIsAutoplayActive] = useState(false);
  const [selectedIoc, setSelectedIoc] = useState<IOC | null>(null);
  const [explainFinding, setExplainFinding] = useState<ContentFinding | null>(null);
  const [showRawEvidence, setShowRawEvidence] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [isThreatLandscapeOpen, setIsThreatLandscapeOpen] = useState(false);

  // Core Investigation State
  const [state, setState] = useState<InvestigationState>(() => {
    const initialCaseId = 'KX-2026-4409';
    const initialEvidenceId = 'KX-2026-4409-EV1';
    const initialSample = SAMPLE_EMAILS[1]; // Authentic Microsoft 365 credential harvesting incident

    return {
      caseId: initialCaseId,
      evidenceId: initialEvidenceId,
      rawEmail: initialSample.emlContent,
      file: {
        name: initialSample.filename,
        size: initialSample.emlContent.length,
        sha256: 'a9f2e3085bd962c4cf2c4c81ef1a44c7b209d1341c5040683ec1fa523a6f112e',
        mimeType: 'message/rfc822 (.eml)',
        acquiredAt: new Date().toISOString(),
      },
      parsedEmail: null,
      authentication: null,
      iocs: [],
      ipIntelligence: {},
      domainIntelligence: {},
      urlIntelligence: {},
      contentAnalysis: null,
      technicalAnalysis: null,
      fusion: null,
      graph: { nodes: [], links: [] },
      campaign: null,
      findings: [],
      chainOfCustody: [
        {
          id: 'coc-001',
          timestamp: new Date().toISOString(),
          action: 'EVIDENCE_ACQUIRED',
          operator: 'Forensic Investigator',
          actor: 'Forensic Investigator',
          details: `Acquired authentic .eml artifact "${initialSample.filename}" (${initialSample.emlContent.length} bytes)`,
          caseId: initialCaseId,
          evidenceId: initialEvidenceId,
          sha256: 'a9f2e3085bd962c4cf2c4c81ef1a44c7b209d1341c5040683ec1fa523a6f112e',
        },
      ],
      stageStatuses: initialStageStatuses,
      currentStage: '01_INTAKE',
      advancedInvestigatorMode: false,
    };
  });

  // Calculate real SHA-256 on initial load for cryptographic assurance
  useEffect(() => {
    const initSha = async () => {
      if (state.rawEmail && state.file) {
        const hash = await computeSha256(state.rawEmail);
        setState((prev) => ({
          ...prev,
          file: prev.file ? { ...prev.file, sha256: hash } : null,
          chainOfCustody: prev.chainOfCustody.map((c, i) =>
            i === 0 ? { ...c, sha256: hash } : c
          ),
        }));
      }
    };
    initSha();
  }, []);

  // Load new .eml artifact
  const handleLoadEml = async (content: string, filename: string, sizeBytes: number) => {
    const hash = await computeSha256(content);
    const newCaseId = `KX-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newEvidenceId = `${newCaseId}-EV1`;

    setState({
      caseId: newCaseId,
      evidenceId: newEvidenceId,
      rawEmail: content,
      file: {
        name: filename,
        size: sizeBytes,
        sha256: hash,
        mimeType: 'message/rfc822 (.eml)',
        acquiredAt: new Date().toISOString(),
      },
      parsedEmail: null,
      authentication: null,
      iocs: [],
      ipIntelligence: {},
      domainIntelligence: {},
      urlIntelligence: {},
      contentAnalysis: null,
      technicalAnalysis: null,
      fusion: null,
      graph: { nodes: [], links: [] },
      campaign: null,
      findings: [],
      chainOfCustody: [
        {
          id: `coc-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'EVIDENCE_ACQUIRED',
          operator: 'Forensic Investigator',
          actor: 'Forensic Investigator',
          details: `Acquired artifact "${filename}" (${sizeBytes} bytes, SHA-256: ${hash})`,
          caseId: newCaseId,
          evidenceId: newEvidenceId,
          sha256: hash,
        },
      ],
      stageStatuses: {
        ...initialStageStatuses,
        '01_INTAKE': 'COMPLETE',
        '02_PARSER': 'READY',
      },
      currentStage: '01_INTAKE',
      advancedInvestigatorMode: false,
    });

    setSelectedIoc(null);
  };

  // Run Stage 02: Email Parser
  const runParserStage = useCallback(async () => {
    if (!state.rawEmail) return;
    setIsRunningStage(true);

    try {
      const parsed = await parseEmail(state.rawEmail);
      const graph = buildThreatGraph(parsed, [], state.caseId);

      setState((prev) => ({
        ...prev,
        parsedEmail: parsed,
        graph,
        stageStatuses: {
          ...prev.stageStatuses,
          '02_PARSER': 'COMPLETE',
          '03_AUTHENTICATION': 'READY',
        },
        currentStage: '02_PARSER',
        chainOfCustody: [
          ...prev.chainOfCustody,
          {
            id: `coc-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'PARSER_EXECUTED',
            operator: 'RFC 5322 Parsing Engine',
            actor: 'RFC 5322 Parsing Engine',
            details: `Extracted ${parsed.receivedChain.length} received hops, ${parsed.attachments.length} attachments, Subject: "${parsed.subject}"`,
            caseId: prev.caseId,
            evidenceId: prev.evidenceId,
          },
        ],
      }));
    } finally {
      setIsRunningStage(false);
    }
  }, [state.rawEmail, state.caseId]);

  // Run Stage 03: Authentication
  const runAuthStage = useCallback(async () => {
    const currentParsed = state.parsedEmail || (await parseEmail(state.rawEmail));
    setIsRunningStage(true);

    try {
      const auth = await evaluateAuthentication(currentParsed);
      setState((prev) => ({
        ...prev,
        parsedEmail: currentParsed,
        authentication: auth,
        stageStatuses: {
          ...prev.stageStatuses,
          '03_AUTHENTICATION': 'COMPLETE',
          '04_IOC': 'READY',
        },
        currentStage: '03_AUTHENTICATION',
        chainOfCustody: [
          ...prev.chainOfCustody,
          {
            id: `coc-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'AUTHENTICATION_EVALUATED',
            operator: 'Cryptographic Auth Engine',
            actor: 'Cryptographic Auth Engine',
            details: `Evaluated SPF (${auth.spf.status}), DKIM (${auth.dkim.status}), DMARC (${auth.dmarc.status}), Alignment (${auth.alignment.status})`,
            caseId: prev.caseId,
            evidenceId: prev.evidenceId,
          },
        ],
      }));
    } finally {
      setIsRunningStage(false);
    }
  }, [state.parsedEmail, state.rawEmail]);

  // Run Stage 04: IOC Extraction
  const runIocStage = useCallback(async () => {
    const currentParsed = state.parsedEmail || (await parseEmail(state.rawEmail));
    setIsRunningStage(true);

    try {
      const extractedIocs = extractIOCs(currentParsed);
      const updatedGraph = buildThreatGraph(currentParsed, extractedIocs, state.caseId);

      setState((prev) => ({
        ...prev,
        parsedEmail: currentParsed,
        iocs: extractedIocs,
        graph: updatedGraph,
        stageStatuses: {
          ...prev.stageStatuses,
          '04_IOC': 'COMPLETE',
          '05_INTELLIGENCE': 'READY',
        },
        currentStage: '04_IOC',
        chainOfCustody: [
          ...prev.chainOfCustody,
          {
            id: `coc-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'IOCS_EXTRACTED',
            operator: 'Forensic IOC Engine',
            actor: 'Forensic IOC Engine',
            details: `Extracted ${extractedIocs.length} discrete observables from envelope, body, and attachments`,
            caseId: prev.caseId,
            evidenceId: prev.evidenceId,
          },
        ],
      }));

      if (extractedIocs.length > 0 && !selectedIoc) {
        const firstInvestigatable = extractedIocs.find(
          (i) => i.type === 'ipv4' || i.type === 'domain' || i.type === 'url'
        );
        if (firstInvestigatable) setSelectedIoc(firstInvestigatable);
      }
    } finally {
      setIsRunningStage(false);
    }
  }, [state.parsedEmail, state.rawEmail, state.caseId, selectedIoc]);

  // Investigate specific IOC (Threat Intelligence)
  const handleInvestigateIoc = async (ioc: IOC) => {
    setIsRunningStage(true);
    try {
      if (ioc.type === 'ipv4') {
        const intel = await queryIpIntelligence(ioc.value);
        setState((prev) => ({
          ...prev,
          ipIntelligence: { ...prev.ipIntelligence, [ioc.value]: intel },
          stageStatuses: {
            ...prev.stageStatuses,
            '05_INTELLIGENCE': 'COMPLETE',
            '06_CONTENT_ANALYSIS': 'READY',
          },
          chainOfCustody: [
            ...prev.chainOfCustody,
            {
              id: `coc-${Date.now()}`,
              timestamp: new Date().toISOString(),
              action: 'INTELLIGENCE_QUERIED',
              operator: 'Network Telemetry Adapter',
              actor: 'Network Telemetry Adapter',
              details: `Queried RDAP/PTR for IP ${ioc.value}: ${intel.org || 'Unspecified network'}`,
              caseId: prev.caseId,
              evidenceId: prev.evidenceId,
            },
          ],
        }));
      } else if (ioc.type === 'domain') {
        const intel = await queryDomainIntelligence(ioc.value);
        setState((prev) => ({
          ...prev,
          domainIntelligence: { ...prev.domainIntelligence, [ioc.value]: intel },
          stageStatuses: {
            ...prev.stageStatuses,
            '05_INTELLIGENCE': 'COMPLETE',
            '06_CONTENT_ANALYSIS': 'READY',
          },
          chainOfCustody: [
            ...prev.chainOfCustody,
            {
              id: `coc-${Date.now()}`,
              timestamp: new Date().toISOString(),
              action: 'INTELLIGENCE_QUERIED',
              operator: 'Domain Registry Adapter',
              actor: 'Domain Registry Adapter',
              details: `Queried RDAP for domain ${ioc.value}: Registrar ${intel.registrar || 'Unavailable'}`,
              caseId: prev.caseId,
              evidenceId: prev.evidenceId,
            },
          ],
        }));
      } else if (ioc.type === 'url') {
        const intel = queryUrlIntelligence(ioc.value);
        setState((prev) => ({
          ...prev,
          urlIntelligence: { ...prev.urlIntelligence, [ioc.value]: intel },
          stageStatuses: {
            ...prev.stageStatuses,
            '05_INTELLIGENCE': 'COMPLETE',
            '06_CONTENT_ANALYSIS': 'READY',
          },
          chainOfCustody: [
            ...prev.chainOfCustody,
            {
              id: `coc-${Date.now()}`,
              timestamp: new Date().toISOString(),
              action: 'INTELLIGENCE_QUERIED',
              operator: 'URL Deconstruction Engine',
              actor: 'URL Deconstruction Engine',
              details: `Analyzed structural characteristics for URL: Host ${intel.hostname}`,
              caseId: prev.caseId,
              evidenceId: prev.evidenceId,
            },
          ],
        }));
      }
    } finally {
      setIsRunningStage(false);
    }
  };

  // Run Stage 06: Content Analysis (Model A)
  const runContentStage = useCallback(async () => {
    const currentParsed = state.parsedEmail || (await parseEmail(state.rawEmail));
    setIsRunningStage(true);

    try {
      const contentRes = analyzeEmailContent(currentParsed);
      setState((prev) => ({
        ...prev,
        parsedEmail: currentParsed,
        contentAnalysis: contentRes,
        stageStatuses: {
          ...prev.stageStatuses,
          '06_CONTENT_ANALYSIS': 'COMPLETE',
          '07_TECHNICAL_ANALYSIS': 'READY',
        },
        currentStage: '06_CONTENT_ANALYSIS',
        chainOfCustody: [
          ...prev.chainOfCustody,
          {
            id: `coc-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'MODEL_A_EXECUTED',
            operator: 'Explainable Content Model A',
            actor: 'Explainable Content Model A',
            details: `Detected ${contentRes.findings.length} linguistic markers (Score: ${contentRes.contentScore}/100, Level: ${contentRes.riskLevel})`,
            caseId: prev.caseId,
            evidenceId: prev.evidenceId,
          },
        ],
      }));
    } finally {
      setIsRunningStage(false);
    }
  }, [state.parsedEmail, state.rawEmail]);

  // Run Stage 07: Technical Analysis (Model B)
  const runTechnicalStage = useCallback(async () => {
    const currentParsed = state.parsedEmail || (await parseEmail(state.rawEmail));
    const currentAuth = state.authentication || (await evaluateAuthentication(currentParsed));
    const currentIocs = state.iocs.length > 0 ? state.iocs : extractIOCs(currentParsed);

    setIsRunningStage(true);
    try {
      const techRes = analyzeTechnicalThreats(
        currentParsed,
        currentAuth,
        currentIocs,
        state.domainIntelligence,
        state.urlIntelligence
      );

      setState((prev) => ({
        ...prev,
        parsedEmail: currentParsed,
        authentication: currentAuth,
        iocs: currentIocs,
        technicalAnalysis: techRes,
        stageStatuses: {
          ...prev.stageStatuses,
          '07_TECHNICAL_ANALYSIS': 'COMPLETE',
          '08_FUSION': 'READY',
        },
        currentStage: '07_TECHNICAL_ANALYSIS',
        chainOfCustody: [
          ...prev.chainOfCustody,
          {
            id: `coc-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'MODEL_B_EXECUTED',
            operator: 'Technical Threat Model B',
            actor: 'Technical Threat Model B',
            details: `Scored technical infrastructure at ${techRes.technicalScore}/100 across ${techRes.features.length} protocol features`,
            caseId: prev.caseId,
            evidenceId: prev.evidenceId,
          },
        ],
      }));
    } finally {
      setIsRunningStage(false);
    }
  }, [
    state.parsedEmail,
    state.rawEmail,
    state.authentication,
    state.iocs,
    state.domainIntelligence,
    state.urlIntelligence,
  ]);

  // Run Stage 08: Evidence Fusion
  const runFusionStage = useCallback(async () => {
    const currentParsed = state.parsedEmail || (await parseEmail(state.rawEmail));
    const currentAuth = state.authentication || (await evaluateAuthentication(currentParsed));
    const currentIocs = state.iocs.length > 0 ? state.iocs : extractIOCs(currentParsed);
    const currentContent = state.contentAnalysis || analyzeEmailContent(currentParsed);
    const currentTech =
      state.technicalAnalysis ||
      analyzeTechnicalThreats(
        currentParsed,
        currentAuth,
        currentIocs,
        state.domainIntelligence,
        state.urlIntelligence
      );

    setIsRunningStage(true);
    try {
      const fusionRes = fuseEvidence(currentContent, currentTech);
      setState((prev) => ({
        ...prev,
        parsedEmail: currentParsed,
        authentication: currentAuth,
        iocs: currentIocs,
        contentAnalysis: currentContent,
        technicalAnalysis: currentTech,
        fusion: fusionRes,
        stageStatuses: {
          ...prev.stageStatuses,
          '08_FUSION': 'COMPLETE',
          '09_ORIGIN': 'READY',
          '10_GRAPH': 'READY',
          '11_CAMPAIGN': 'READY',
          '12_REPORT': 'READY',
        },
        currentStage: '08_FUSION',
        chainOfCustody: [
          ...prev.chainOfCustody,
          {
            id: `coc-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'EVIDENCE_FUSED',
            operator: 'Multi-Vector Fusion Engine',
            actor: 'Multi-Vector Fusion Engine',
            details: `Computed fused index of ${fusionRes.fusedScore}/100. Verdict: ${fusionRes.verdict}`,
            caseId: prev.caseId,
            evidenceId: prev.evidenceId,
          },
        ],
      }));
    } finally {
      setIsRunningStage(false);
    }
  }, [
    state.parsedEmail,
    state.rawEmail,
    state.authentication,
    state.iocs,
    state.contentAnalysis,
    state.technicalAnalysis,
    state.domainIntelligence,
    state.urlIntelligence,
  ]);

  // Stage Controller dispatcher for "Run Stage"
  const handleRunStage = async (stageId: StageId) => {
    switch (stageId) {
      case '01_INTAKE':
        // Stage 01 is evidence review
        break;
      case '02_PARSER':
        await runParserStage();
        break;
      case '03_AUTHENTICATION':
        await runAuthStage();
        break;
      case '04_IOC':
        await runIocStage();
        break;
      case '05_INTELLIGENCE':
        if (selectedIoc) {
          await handleInvestigateIoc(selectedIoc);
        } else if (state.iocs.length > 0) {
          await handleInvestigateIoc(state.iocs[0]);
        }
        break;
      case '06_CONTENT_ANALYSIS':
        await runContentStage();
        break;
      case '07_TECHNICAL_ANALYSIS':
        await runTechnicalStage();
        break;
      case '08_FUSION':
        await runFusionStage();
        break;
      case '09_ORIGIN':
        setState((prev) => ({
          ...prev,
          stageStatuses: { ...prev.stageStatuses, '09_ORIGIN': 'COMPLETE' },
        }));
        break;
      case '10_GRAPH':
        setState((prev) => ({
          ...prev,
          stageStatuses: { ...prev.stageStatuses, '10_GRAPH': 'COMPLETE' },
        }));
        break;
      case '11_CAMPAIGN':
        setState((prev) => ({
          ...prev,
          stageStatuses: { ...prev.stageStatuses, '11_CAMPAIGN': 'COMPLETE' },
        }));
        break;
      case '12_REPORT':
        setState((prev) => ({
          ...prev,
          stageStatuses: { ...prev.stageStatuses, '12_REPORT': 'COMPLETE' },
        }));
        break;
    }
  };

  // Run all pipeline stages sequentially
  const handleRunAllStages = async () => {
    setIsRunningStage(true);
    try {
      const parsed = await parseEmail(state.rawEmail);
      const auth = await evaluateAuthentication(parsed);
      const iocs = extractIOCs(parsed);
      const graph = buildThreatGraph(parsed, iocs, state.caseId);
      const content = analyzeEmailContent(parsed);
      const tech = analyzeTechnicalThreats(
        parsed,
        auth,
        iocs,
        state.domainIntelligence,
        state.urlIntelligence
      );
      const fusion = fuseEvidence(content, tech);

      const allComplete: Record<StageId, StageStatus> = {
        '01_INTAKE': 'COMPLETE',
        '02_PARSER': 'COMPLETE',
        '03_AUTHENTICATION': 'COMPLETE',
        '04_IOC': 'COMPLETE',
        '05_INTELLIGENCE': 'COMPLETE',
        '06_CONTENT_ANALYSIS': 'COMPLETE',
        '07_TECHNICAL_ANALYSIS': 'COMPLETE',
        '08_FUSION': 'COMPLETE',
        '09_ORIGIN': 'COMPLETE',
        '10_GRAPH': 'COMPLETE',
        '11_CAMPAIGN': 'COMPLETE',
        '12_REPORT': 'COMPLETE',
      };

      setState((prev) => ({
        ...prev,
        parsedEmail: parsed,
        authentication: auth,
        iocs,
        graph,
        contentAnalysis: content,
        technicalAnalysis: tech,
        fusion,
        stageStatuses: allComplete,
        currentStage: '12_REPORT',
        chainOfCustody: [
          ...prev.chainOfCustody,
          {
            id: `coc-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'FULL_PIPELINE_EXECUTED',
            operator: 'Kryptos Automated Triage Controller',
            actor: 'Kryptos Automated Triage Controller',
            details: `Completed 12-stage forensic evaluation. Fused Score: ${fusion.fusedScore}/100 (${fusion.verdict})`,
            caseId: prev.caseId,
            evidenceId: prev.evidenceId,
          },
        ],
      }));
    } finally {
      setIsRunningStage(false);
      setIsAutoplayActive(false);
    }
  };

  const handleToggleAutoplay = () => {
    if (isAutoplayActive) {
      setIsAutoplayActive(false);
    } else {
      setIsAutoplayActive(true);
      handleRunAllStages();
    }
  };

  const handleNavigate = (direction: 'PREV' | 'NEXT') => {
    const currentIndex = STAGE_SEQUENCE.indexOf(state.currentStage);
    if (direction === 'PREV' && currentIndex > 0) {
      setState((prev) => ({ ...prev, currentStage: STAGE_SEQUENCE[currentIndex - 1] }));
    } else if (direction === 'NEXT' && currentIndex < STAGE_SEQUENCE.length - 1) {
      setState((prev) => ({ ...prev, currentStage: STAGE_SEQUENCE[currentIndex + 1] }));
    }
  };

  const handleReset = () => {
    const initialSample = SAMPLE_EMAILS[0];
    handleLoadEml(initialSample.emlContent, initialSample.filename, initialSample.emlContent.length);
  };

  const handleCopyRaw = async () => {
    await navigator.clipboard.writeText(state.rawEmail);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F4] text-[#142238] flex flex-col font-sans antialiased selection:bg-[#2DBDCA]/20 selection:text-[#142238]">
      {/* Universal Forensic Header */}
      <Header
        state={state}
        onReset={handleReset}
        onToggleAutoplay={handleToggleAutoplay}
        isAutoplayActive={isAutoplayActive}
        onToggleAdvancedMode={() =>
          setState((prev) => ({
            ...prev,
            advancedInvestigatorMode: !prev.advancedInvestigatorMode,
          }))
        }
        onOpenRawEvidence={() => setShowRawEvidence(true)}
        onToggleVoiceAssistant={() => setIsVoiceAssistantOpen((prev) => !prev)}
        isVoiceAssistantOpen={isVoiceAssistantOpen}
        onOpenThreatLandscape={() => setIsThreatLandscapeOpen(true)}
      />

      {/* 12-Stage Visual Progress Bar */}
      <StageProgressBar
        currentStage={state.currentStage}
        stageStatuses={state.stageStatuses}
        onSelectStage={(stageId) =>
          setState((prev) => ({ ...prev, currentStage: stageId }))
        }
      />

      {/* Main Investigation Stage Canvas */}
      <main className="flex-1 overflow-y-auto pb-24">
        {state.currentStage === '01_INTAKE' && (
          <Stage01Intake
            state={state}
            onLoadEml={handleLoadEml}
            onStartInvestigation={() => {
              setState((prev) => ({ ...prev, currentStage: '02_PARSER' }));
              runParserStage();
            }}
          />
        )}

        {state.currentStage === '02_PARSER' && (
          <Stage02Parser
            state={state}
            isRunning={isRunningStage}
            onRunParser={runParserStage}
            onProceedToAuth={() => {
              setState((prev) => ({ ...prev, currentStage: '03_AUTHENTICATION' }));
              runAuthStage();
            }}
          />
        )}

        {state.currentStage === '03_AUTHENTICATION' && (
          <Stage03Auth
            state={state}
            isRunning={isRunningStage}
            onRunAuth={runAuthStage}
            onProceedToIoc={() => {
              setState((prev) => ({ ...prev, currentStage: '04_IOC' }));
              runIocStage();
            }}
          />
        )}

        {state.currentStage === '04_IOC' && (
          <Stage04IOC
            state={state}
            isRunning={isRunningStage}
            onRunIoc={runIocStage}
            onSelectIocForIntel={(ioc) => {
              setSelectedIoc(ioc);
              setState((prev) => ({ ...prev, currentStage: '05_INTELLIGENCE' }));
            }}
            onProceedToIntel={() =>
              setState((prev) => ({ ...prev, currentStage: '05_INTELLIGENCE' }))
            }
          />
        )}

        {state.currentStage === '05_INTELLIGENCE' && (
          <Stage05Intelligence
            state={state}
            selectedIoc={selectedIoc}
            onSelectIoc={(ioc) => setSelectedIoc(ioc)}
            onInvestigateIoc={handleInvestigateIoc}
            isRunning={isRunningStage}
            onProceedToContent={() => {
              setState((prev) => ({ ...prev, currentStage: '06_CONTENT_ANALYSIS' }));
              runContentStage();
            }}
          />
        )}

        {state.currentStage === '06_CONTENT_ANALYSIS' && (
          <Stage06ContentAnalysis
            state={state}
            isRunning={isRunningStage}
            onRunContentAnalysis={runContentStage}
            onOpenWhyModal={(finding) => setExplainFinding(finding)}
            onProceedToTechnical={() => {
              setState((prev) => ({ ...prev, currentStage: '07_TECHNICAL_ANALYSIS' }));
              runTechnicalStage();
            }}
          />
        )}

        {state.currentStage === '07_TECHNICAL_ANALYSIS' && (
          <Stage07TechnicalAnalysis
            state={state}
            isRunning={isRunningStage}
            onRunTechnicalAnalysis={runTechnicalStage}
            onProceedToFusion={() => {
              setState((prev) => ({ ...prev, currentStage: '08_FUSION' }));
              runFusionStage();
            }}
          />
        )}

        {state.currentStage === '08_FUSION' && (
          <Stage08Fusion
            state={state}
            isRunning={isRunningStage}
            onRunFusion={runFusionStage}
            onProceedToOrigin={() =>
              setState((prev) => ({ ...prev, currentStage: '09_ORIGIN' }))
            }
          />
        )}

        {state.currentStage === '09_ORIGIN' && (
          <Stage09Origin
            state={state}
            onProceedToGraph={() =>
              setState((prev) => ({ ...prev, currentStage: '10_GRAPH' }))
            }
            onOpenThreatLandscape={() => setIsThreatLandscapeOpen(true)}
          />
        )}

        {state.currentStage === '10_GRAPH' && (
          <Stage10Graph
            state={state}
            onProceedToCampaign={() =>
              setState((prev) => ({ ...prev, currentStage: '11_CAMPAIGN' }))
            }
          />
        )}

        {state.currentStage === '11_CAMPAIGN' && (
          <Stage11Campaign
            state={state}
            onProceedToReport={() =>
              setState((prev) => ({ ...prev, currentStage: '12_REPORT' }))
            }
          />
        )}

        {state.currentStage === '12_REPORT' && <Stage12Findings state={state} />}
      </main>

      {/* Persistent Bottom Stage Controller */}
      <StageController
        currentStage={state.currentStage}
        stageStatuses={state.stageStatuses}
        isRunning={isRunningStage}
        onRunStage={handleRunStage}
        onNavigate={handleNavigate}
        onReset={handleReset}
      />

      {/* Explainability Transparency Modal */}
      <ExplainabilityModal
        finding={explainFinding}
        onClose={() => setExplainFinding(null)}
      />

      {/* SIH AI Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
        caseId={state.caseId}
      />

      {/* Global Threat Landscape Overlay */}
      <ThreatLandscapeOverlay
        isOpen={isThreatLandscapeOpen}
        onClose={() => setIsThreatLandscapeOpen(false)}
        state={state}
      />

      {/* Raw Evidence Inspector Modal */}
      {showRawEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-[#D9E1E6] shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#F5F6F4] border-b border-[#D9E1E6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2DBDCA]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#142238]">
                  Raw RFC 5322 Evidence Artifact
                </span>
                <span className="text-[10px] font-mono text-[#53657A] ml-2">
                  ({state.file?.name} • {state.rawEmail.length.toLocaleString()} bytes)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="px-2.5 py-1 rounded text-xs font-semibold bg-white border border-[#D9E1E6] hover:bg-[#FAFBFB] text-[#142238] flex items-center gap-1.5 transition-colors"
                >
                  {copiedRaw ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#1FA463]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#53657A]" />
                      <span>Copy Raw Bytes</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRawEvidence(false)}
                  className="p-1 rounded text-[#53657A] hover:bg-[#E5E9EC] hover:text-[#142238] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#FAFBFB] border-b border-[#D9E1E6] flex items-center justify-between text-xs font-mono text-[#53657A]">
              <div>
                <span className="font-semibold text-[#142238]">SHA-256: </span>
                <span className="select-all">{state.file?.sha256}</span>
              </div>
              <div>
                <span className="font-semibold text-[#142238]">Case Ref: </span>
                <span>{state.caseId}</span>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-[#142238] whitespace-pre-wrap select-text bg-white">
              {state.rawEmail}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
