/**
 * Kryptos Forensics — Types & Data Contracts
 * Pure forensic provenance and state definitions
 */

export type ProvenanceType =
  | 'VERIFIED FROM EMAIL'
  | 'DETERMINISTICALLY DERIVED'
  | 'VERIFIED THROUGH EXTERNAL INTELLIGENCE'
  | 'ANALYTICAL INFERENCE'
  | 'UNKNOWN'
  | 'NOT VERIFIABLE'
  | 'EXTERNAL SOURCE UNAVAILABLE';

export type StageId =
  | '01_INTAKE'
  | '02_PARSER'
  | '03_AUTHENTICATION'
  | '04_IOC'
  | '05_INTELLIGENCE'
  | '06_CONTENT_ANALYSIS'
  | '07_TECHNICAL_ANALYSIS'
  | '08_FUSION'
  | '09_ORIGIN'
  | '10_GRAPH'
  | '11_CAMPAIGN'
  | '12_REPORT';

export type InvestigationStageId = StageId;

export type StageStatus = 'LOCKED' | 'READY' | 'RUNNING' | 'COMPLETE' | 'FAILED' | 'UNAVAILABLE';

export interface ChainOfCustodyEvent {
  id: string;
  timestamp: string;
  action: string;
  operator?: string;
  actor?: string;
  details: string;
  caseId?: string;
  evidenceId?: string;
  sha256?: string;
}

export interface AttachmentInfo {
  filename: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  encoding?: string;
  isExecutableOrSuspicious: boolean;
}

export interface ReceivedHop {
  hopNumber: number;
  from?: string;
  by?: string;
  with?: string;
  id?: string;
  for?: string;
  timestamp?: string;
  ip?: string;
  isEarliestReliableRelay?: boolean;
  raw: string;
}

export interface DkimSignatureRecord {
  domain: string;
  selector: string;
  algorithm: string;
  bodyHash: string;
  signature: string;
  headers: string;
  canonicalization?: string;
}

export interface ParsedEmail {
  headers: Record<string, string | string[]>;
  rawHeaders: string;
  from: {
    raw: string;
    email: string;
    domain: string;
    displayName?: string;
  };
  to: Array<{ email: string; domain: string; displayName?: string }>;
  cc: Array<{ email: string; domain: string; displayName?: string }>;
  bcc: Array<{ email: string; domain: string; displayName?: string }>;
  replyTo: {
    raw: string;
    email: string;
    domain: string;
  } | null;
  returnPath: {
    raw: string;
    email: string;
    domain: string;
  } | null;
  messageId: string | null;
  date: string | null;
  subject: string;
  receivedChain: ReceivedHop[];
  dkimSignatures: DkimSignatureRecord[];
  authenticationResultsHeader: string | null;
  receivedSpfHeader: string | null;
  contentType: string;
  mimeVersion: string | null;
  plainText: string;
  htmlContent: string;
  sanitizedHtml: string;
  attachments: AttachmentInfo[];
  rawByteSize: number;
}

export interface SpfEvaluation {
  status: 'PASS' | 'FAIL' | 'NOT_VERIFIABLE' | 'NOT_PRESENT';
  reason: string;
  evidence: string;
  source: string;
  sendingIp?: string;
  senderDomain?: string;
  dnsTxtRecords?: string[];
  provenance: ProvenanceType;
}

export interface DkimEvaluation {
  status:
    | 'PASS'
    | 'FAIL'
    | 'SIGNATURE_PRESENT_VERIFICATION_UNAVAILABLE'
    | 'NO_DKIM_SIGNATURE'
    | 'NOT_VERIFIABLE';
  reason: string;
  evidence: string;
  source: string;
  signatures: DkimSignatureRecord[];
  provenance: ProvenanceType;
}

export interface DmarcEvaluation {
  status: 'PASS' | 'FAIL' | 'NOT_VERIFIABLE' | 'NO_POLICY_RECORD';
  reason: string;
  evidence: string;
  policy?: string;
  alignmentMode?: 'STRICT' | 'RELAXED';
  source: string;
  provenance: ProvenanceType;
}

export interface AlignmentEvaluation {
  fromDomain: string;
  replyToDomain: string | null;
  returnPathDomain: string | null;
  fromMatchesReplyTo: boolean;
  fromMatchesReturnPath: boolean;
  status: 'ALIGNED' | 'DIFFERENT_DOMAINS' | 'INCOMPLETE_DATA';
  explanation: string;
  source: string;
  provenance: ProvenanceType;
}

export interface AuthenticationState {
  spf: SpfEvaluation;
  dkim: DkimEvaluation;
  dmarc: DmarcEvaluation;
  alignment: AlignmentEvaluation;
}

export type IocType =
  | 'ipv4'
  | 'ipv6'
  | 'domain'
  | 'url'
  | 'email'
  | 'hash'
  | 'message_id'
  | 'attachment';

export interface IOC {
  id: string;
  type: IocType;
  value: string;
  source: string;
  location: string;
  provenance: ProvenanceType;
  reputationStatus?: 'CLEAN' | 'SUSPICIOUS' | 'UNAVAILABLE' | 'PENDING';
  details?: Record<string, any>;
}

export interface IpIntelligence {
  ip: string;
  asn?: string;
  org?: string;
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lng?: number;
  rDNS?: string[];
  status: 'SUCCESS' | 'PARTIAL' | 'UNAVAILABLE' | 'PROVIDER_NOT_CONFIGURED';
  provider: string;
  timestamp: string;
  raw?: any;
}

export interface DomainIntelligence {
  domain: string;
  registrar?: string;
  registrationDate?: string;
  expirationDate?: string;
  ageDays?: number;
  nameservers?: string[];
  dnsRecords?: {
    A?: string[];
    MX?: Array<{ exchange: string; priority: number }>;
    TXT?: string[];
    NS?: string[];
  };
  status: 'SUCCESS' | 'PARTIAL' | 'UNAVAILABLE' | 'PROVIDER_NOT_CONFIGURED';
  provider: string;
  timestamp: string;
}

export interface UrlIntelligence {
  url: string;
  protocol: string;
  hostname: string;
  pathname: string;
  port?: string;
  isIpBased: boolean;
  isPunycode: boolean;
  hasSuspiciousEncoding: boolean;
  credentialKeywords: string[];
  status: 'ANALYZED' | 'UNAVAILABLE';
  provider: string;
}

export interface ContentFinding {
  id: string;
  category:
    | 'Urgency'
    | 'Credential Request'
    | 'Payment / Wire'
    | 'Impersonation'
    | 'Suspicious Instruction'
    | 'Account Verification';
  quote: string;
  location: 'Subject' | 'Email Body' | 'HTML Markup' | 'Header';
  weight: number;
  explanation: string;
  provenance: ProvenanceType;
}

export interface ContentAnalysisState {
  modelName: string;
  modelVersion: string;
  isProductionModel: boolean;
  findings: ContentFinding[];
  contentScore: number; // 0 to 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'INSUFFICIENT_SIGNALS';
  explanation: string;
}

export interface TechnicalFeature {
  id: string;
  feature: string;
  state: 'KNOWN' | 'UNKNOWN' | 'NOT_APPLICABLE';
  value: string;
  source: string;
  interpretation: string;
  weight: number;
  provenance: ProvenanceType;
}

export interface TechnicalAnalysisState {
  features: TechnicalFeature[];
  technicalScore: number; // 0 to 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'INSUFFICIENT_SIGNALS';
  explanation: string;
}

export interface EvidenceFusionState {
  contentRisk: number; // 0 to 1
  technicalRisk: number; // 0 to 1
  fusedRisk: number; // 0 to 1
  fusedScore: number; // 0 to 100
  verdict: 'LOW_EVIDENCE_OF_THREAT' | 'ELEVATED_RISK_DETECTED' | 'HIGH_CONFIDENCE_THREAT' | 'INSUFFICIENT_EVIDENCE';
  formulaUsed: string;
  contentSignalCount: number;
  technicalSignalCount: number;
  observedSignals: Array<{ name: string; weight: number; source: string; category: 'Content' | 'Technical' }>;
  explanation: string;
  whyBreakdown: Array<{
    factor: string;
    contribution: string;
    evidence: string;
    source: string;
  }>;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'email' | 'sender' | 'recipient' | 'domain' | 'url' | 'ip' | 'asn' | 'attachment' | 'hash';
  group: string;
  metadata?: Record<string, any>;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  label: string;
  provenance: ProvenanceType;
}

export interface ThreatGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface CampaignCorrelation {
  hasCorrelatedCampaign: boolean;
  explanation: string;
  sharedEntities: Array<{
    type: string;
    value: string;
    observationCount: number;
  }>;
  confidence: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';
  statusMessage: string;
}

export interface ForensicFinding {
  id: string;
  title: string;
  category: 'INTEGRITY' | 'AUTHENTICATION' | 'CONTENT' | 'TECHNICAL' | 'ORIGIN' | 'CORRELATION';
  finding: string;
  evidence: string;
  source: string;
  status: 'OBSERVED' | 'VERIFIED' | 'NOT_VERIFIED' | 'ANALYTICAL_INFERENCE' | 'UNAVAILABLE';
  confidence: 'FACTUAL_OBSERVATION' | 'HIGH' | 'MEDIUM' | 'NOT_APPLICABLE';
}

export interface InvestigationState {
  caseId: string;
  evidenceId: string;
  file: {
    name: string;
    size: number;
    sha256: string;
    mimeType: string;
    acquiredAt: string;
  } | null;
  rawEmail: string;
  parsedEmail: ParsedEmail | null;
  authentication: AuthenticationState | null;
  iocs: IOC[];
  ipIntelligence: Record<string, IpIntelligence>;
  domainIntelligence: Record<string, DomainIntelligence>;
  urlIntelligence: Record<string, UrlIntelligence>;
  contentAnalysis: ContentAnalysisState | null;
  technicalAnalysis: TechnicalAnalysisState | null;
  fusion: EvidenceFusionState | null;
  graph: ThreatGraphData;
  campaign: CampaignCorrelation | null;
  findings: ForensicFinding[];
  chainOfCustody: ChainOfCustodyEvent[];
  stageStatuses: Record<StageId, StageStatus>;
  currentStage: StageId;
  advancedInvestigatorMode: boolean;
}
