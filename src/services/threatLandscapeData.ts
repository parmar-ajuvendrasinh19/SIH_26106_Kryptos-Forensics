import { InvestigationState } from '../types';

export type ThreatCategory =
  | 'PHISHING'
  | 'MALWARE_C2'
  | 'CREDENTIAL_HARVESTING'
  | 'RANSOMWARE_STAGING'
  | 'BEC_INFRASTRUCTURE';

export type ThreatSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface ThreatHotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  countryCode: string;
  asn: string;
  isp: string;
  category: ThreatCategory;
  severity: ThreatSeverity;
  activeCampaigns: string[];
  activeIps: string[];
  domains: string[];
  targetSectors: string[];
  incidentCount24h: number;
  detectedProtocols: string[];
  firstSeen: string;
  lastObserved: string;
  threatActors: string[];
  summary: string;
}

export interface TelemetryAlert {
  id: string;
  timestamp: string;
  sourceCity: string;
  countryCode: string;
  category: ThreatCategory;
  threatActor: string;
  targetSector: string;
  indicator: string;
  severity: ThreatSeverity;
}

export const GLOBAL_THREAT_HOTSPOTS: ThreatHotspot[] = [
  {
    id: 'hs-ashburn-01',
    name: 'Ashburn M365 EvilProxy Swarm',
    lat: 39.0438,
    lng: -77.4874,
    city: 'Ashburn, VA',
    country: 'United States',
    countryCode: 'US',
    asn: 'AS16509',
    isp: 'Amazon.com / Cloud Proxies',
    category: 'CREDENTIAL_HARVESTING',
    severity: 'CRITICAL',
    activeCampaigns: ['EvilProxy Reverse-Proxy MFA Bypass', 'Corporate Payroll Intercept'],
    activeIps: ['54.210.14.92', '52.90.112.44', '198.51.100.45'],
    domains: ['secure-auth-office365.online', 'mfa-verify-login.cloud'],
    targetSectors: ['Defense', 'Healthcare', 'Higher Education'],
    incidentCount24h: 3420,
    detectedProtocols: ['HTTPS / Reverse Proxy', 'TLS 1.3 / WebSocket'],
    firstSeen: '2026-03-12',
    lastObserved: '5 mins ago',
    threatActors: ['Storm-1167', 'Scattered Spider'],
    summary: 'Mass deployment of adversary-in-the-middle (AiTM) reverse proxy servers harvesting session tokens and bypassing FIDO2/SMS multi-factor authentication.',
  },
  {
    id: 'hs-frankfurt-02',
    name: 'Frankfurt Bulletproof Fast-Flux Relay',
    lat: 50.1109,
    lng: 8.6821,
    city: 'Frankfurt am Main',
    country: 'Germany',
    countryCode: 'DE',
    asn: 'AS205100',
    isp: 'Zwiebelfreunde / Bulletproof Transit',
    category: 'PHISHING',
    severity: 'CRITICAL',
    activeCampaigns: ['Invoice Redirection Fraud', 'Banking Trojan Loader Campaign'],
    activeIps: ['185.220.101.5', '185.220.101.7', '185.220.102.19'],
    domains: ['corporate-billing-system.net', 'accounts-payable-portal.de'],
    targetSectors: ['Manufacturing', 'Financial Services', 'Supply Chain'],
    incidentCount24h: 2180,
    detectedProtocols: ['ESMTPS TLS 1.3', 'Fast-Flux DNS'],
    firstSeen: '2026-01-20',
    lastObserved: '12 mins ago',
    threatActors: ['TA577 / Pikabot Nexus', 'Storm-0832'],
    summary: 'Bulletproof relay network utilizing rapid DNS rotational TTLs to route phishing payloads and weaponized macro attachments while shielding real backend servers.',
  },
  {
    id: 'hs-amsterdam-03',
    name: 'Amsterdam Invoicing Phish Nexus',
    lat: 52.3676,
    lng: 4.9041,
    city: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    asn: 'AS50673',
    isp: 'Serverius Hosting B.V.',
    category: 'PHISHING',
    severity: 'HIGH',
    activeCampaigns: ['SEPA Wire Mandate Fraud', 'Executive Impersonation'],
    activeIps: ['91.240.118.88', '91.240.118.90', '194.180.48.22'],
    domains: ['global-invoicing-srv.net', 'remittance-advice-review.eu'],
    targetSectors: ['Logistics', 'Retail', 'Public Sector'],
    incidentCount24h: 1840,
    detectedProtocols: ['SMTP Over TLS', 'HTTP/2 REST Webhook'],
    firstSeen: '2026-02-04',
    lastObserved: '18 mins ago',
    threatActors: ['FIN7 / Carbanak Group', 'DPRK Sub-Node'],
    summary: 'High-throughput outbound SMTP relay nodes generating automated PDF invoice decoys embedded with obfuscated malicious hyperlinked QR codes.',
  },
  {
    id: 'hs-moscow-04',
    name: 'Moscow DarkGate & Cobalt C2 Grid',
    lat: 55.7558,
    lng: 37.6173,
    city: 'Moscow',
    country: 'Russian Federation',
    countryCode: 'RU',
    asn: 'AS57523',
    isp: 'Cloud VPS Provider / Private Autonomous Node',
    category: 'MALWARE_C2',
    severity: 'CRITICAL',
    activeCampaigns: ['DarkGate Loader V6', 'Cobalt Strike Malleable Beaconing'],
    activeIps: ['194.26.29.112', '194.26.29.118', '45.142.214.9'],
    domains: ['cloud-relay-node.org', 'telemetry-sync-api.ru'],
    targetSectors: ['Government', 'Aerospace', 'Energy Grids'],
    incidentCount24h: 2790,
    detectedProtocols: ['HTTPS Beaconing', 'DNS Tunneling / ICMP Covert'],
    firstSeen: '2025-11-14',
    lastObserved: '3 mins ago',
    threatActors: ['Midnight Blizzard / APT29', 'Silence Group'],
    summary: 'Command and control grid hosting active payload distribution repositories and listening posts for encrypted reverse-shell implants across enterprise networks.',
  },
  {
    id: 'hs-singapore-05',
    name: 'Singapore Maritime & FinTech Phish Farm',
    lat: 1.3521,
    lng: 103.8198,
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    asn: 'AS46015',
    isp: 'SingNet Cloud Hosting',
    category: 'BEC_INFRASTRUCTURE',
    severity: 'HIGH',
    activeCampaigns: ['Bill of Lading Intercept', 'Cryptocurrency Escrow Theft'],
    activeIps: ['103.28.248.51', '103.28.248.60'],
    domains: ['vessel-manifest-doc.com', 'apac-freight-port.sg'],
    targetSectors: ['Maritime Shipping', 'Commodities Trading', 'FinTech'],
    incidentCount24h: 960,
    detectedProtocols: ['SMTP / IMAP Synchronizer', 'HTTPS API'],
    firstSeen: '2026-04-01',
    lastObserved: '25 mins ago',
    threatActors: ['SilverTerrier / Nigerian BEC', 'Mustang Panda'],
    summary: 'Targeted business email compromise infrastructure monitoring supply chain thread conversations and issuing unauthorized bank routing modifications.',
  },
  {
    id: 'hs-tokyo-06',
    name: 'Tokyo QR-Phish & Lumma Stealer Dropper',
    lat: 35.6762,
    lng: 139.6503,
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    asn: 'AS2516',
    isp: 'KDDI Corporation Datacenter',
    category: 'MALWARE_C2',
    severity: 'MEDIUM',
    activeCampaigns: ['Quishing (QR Code Phishing)', 'Lumma Stealer C2'],
    activeIps: ['118.107.12.33', '118.107.12.89'],
    domains: ['tax-reimbursement-jp.com', 'device-security-update.asia'],
    targetSectors: ['Consumer Banking', 'Telecommunications', 'Electronics'],
    incidentCount24h: 1120,
    detectedProtocols: ['HTTPS Post Request', 'Telegram Bot API Exfiltration'],
    firstSeen: '2026-05-18',
    lastObserved: '40 mins ago',
    threatActors: ['Lumma Nexus', 'Black Basta Affiliate'],
    summary: 'Automated QR code image delivery pipeline distributing memory-only stealer payloads designed to harvest browser cookies, credentials, and crypto wallets.',
  },
  {
    id: 'hs-london-07',
    name: 'London HR Compensation Lure Cluster',
    lat: 51.5074,
    lng: -0.1278,
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    asn: 'AS2856',
    isp: 'BT Public Internet Backbone',
    category: 'PHISHING',
    severity: 'HIGH',
    activeCampaigns: ['Internal HR Benefit Adjustment', 'DocuSign Sign-Off Phish'],
    activeIps: ['194.72.238.10', '194.72.238.45'],
    domains: ['annual-salary-review.co.uk', 'docusign-envelope-view.com'],
    targetSectors: ['Legal', 'Insurance', 'Consulting'],
    incidentCount24h: 1540,
    detectedProtocols: ['HTTPS TLS 1.3', 'SPF Spoofing / Domain Permutations'],
    firstSeen: '2026-03-30',
    lastObserved: '15 mins ago',
    threatActors: ['TA558', 'PhaaS Kit Developers'],
    summary: 'Phishing-as-a-Service (PhaaS) cluster crafting convincing human resource compensation spreadsheets containing zero-day macro exploits.',
  },
  {
    id: 'hs-saopaulo-08',
    name: 'São Paulo Pix Banking Trojan Swarm',
    lat: -23.5505,
    lng: -46.6333,
    city: 'São Paulo',
    country: 'Brazil',
    countryCode: 'BR',
    asn: 'AS28573',
    isp: 'Claro Brasil Datacenter',
    category: 'MALWARE_C2',
    severity: 'HIGH',
    activeCampaigns: ['Grandoreiro Banking Trojan', 'Pix Instant Payment Hijack'],
    activeIps: ['177.18.24.11', '177.18.24.99'],
    domains: ['banco-seguranca-valida.com.br', 'cert-digital-atualizacao.net'],
    targetSectors: ['Commercial Banking', 'FinTech', 'E-Commerce'],
    incidentCount24h: 2450,
    detectedProtocols: ['TCP Custom Overlay', 'HTTPS Webhook'],
    firstSeen: '2025-10-09',
    lastObserved: '8 mins ago',
    threatActors: ['Grandoreiro Syndicate', 'Guildma Group'],
    summary: 'Latin American banking malware cluster specializing in real-time overlay screens and automated transaction manipulation on workstation browsers.',
  },
  {
    id: 'hs-mumbai-09',
    name: 'Mumbai Tech Support & RMM Implant Hub',
    lat: 19.0760,
    lng: 72.8777,
    city: 'Mumbai',
    country: 'India',
    countryCode: 'IN',
    asn: 'AS45820',
    isp: 'Tata Communications Ltd',
    category: 'BEC_INFRASTRUCTURE',
    severity: 'MEDIUM',
    activeCampaigns: ['Geek Squad Renewal Scam', 'ScreenConnect Unauthorized RMM'],
    activeIps: ['115.112.88.14', '115.112.88.92'],
    domains: ['invoice-helpdesk-center.org', 'support-remote-connect.in'],
    targetSectors: ['Small Business', 'Elderly Consumers', 'Accounting'],
    incidentCount24h: 1670,
    detectedProtocols: ['WebRTC Remote Access', 'VoIP SIP Trunks'],
    firstSeen: '2026-02-19',
    lastObserved: '33 mins ago',
    threatActors: ['Call Center Syndicate 9', 'Silent-Courier'],
    summary: 'High-volume telephone-oriented attack delivery (TOAD) campaigns using rogue RMM installation packages to hijack administrative endpoints.',
  },
  {
    id: 'hs-sydney-10',
    name: 'Sydney Cloud Storage Phishing Node',
    lat: -33.8688,
    lng: 151.2093,
    city: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    asn: 'AS1221',
    isp: 'Telstra Corporation Limited',
    category: 'CREDENTIAL_HARVESTING',
    severity: 'MEDIUM',
    activeCampaigns: ['SharePoint Sensitive File Notification', 'OneDrive Quota Alert'],
    activeIps: ['139.130.4.15', '139.130.4.82'],
    domains: ['sharepoint-secure-documents.com', 'onedrive-file-transfer.au'],
    targetSectors: ['Mining & Resources', 'Government Agencies', 'Healthcare'],
    incidentCount24h: 890,
    detectedProtocols: ['HTTPS Reverse Proxy', 'OAuth Consent Grant Hijack'],
    firstSeen: '2026-06-11',
    lastObserved: '52 mins ago',
    threatActors: ['APT40 / Gadolinium', 'TA542'],
    summary: 'Rogue OAuth app registration and cloud storage decoy sites coaxing users into authorizing malicious third-party API enterprise permissions.',
  },
  {
    id: 'hs-zurich-11',
    name: 'Zurich Private Wealth Phishing Relay',
    lat: 47.3769,
    lng: 8.5417,
    city: 'Zurich',
    country: 'Switzerland',
    countryCode: 'CH',
    asn: 'AS3303',
    isp: 'Swisscom Enterprise Hosting',
    category: 'BEC_INFRASTRUCTURE',
    severity: 'HIGH',
    activeCampaigns: ['Private Banking Wire Transfer', 'Tax Exemption Audit Alert'],
    activeIps: ['195.186.1.44', '195.186.1.92'],
    domains: ['swiss-trust-advisory.ch', 'audit-compliance-auth.com'],
    targetSectors: ['Private Banking', 'Wealth Management', 'Family Offices'],
    incidentCount24h: 740,
    detectedProtocols: ['PGP Spoofing', 'ESMTPS TLS 1.3'],
    firstSeen: '2026-05-02',
    lastObserved: '1 hour ago',
    threatActors: ['FIN11', 'TA505'],
    summary: 'Sophisticated targeted spear-phishing campaigns aimed at high-net-worth wealth managers using counterfeit encrypted communique templates.',
  },
  {
    id: 'hs-toronto-12',
    name: 'Toronto Healthcare Ransomware Dropzone',
    lat: 43.6532,
    lng: -79.3832,
    city: 'Toronto',
    country: 'Canada',
    countryCode: 'CA',
    asn: 'AS852',
    isp: 'Telus Communications Inc.',
    category: 'RANSOMWARE_STAGING',
    severity: 'CRITICAL',
    activeCampaigns: ['LockBit 3.0 Affiliate Distribution', 'Health Insurance Lure'],
    activeIps: ['142.214.33.10', '142.214.33.67'],
    domains: ['health-records-transfer.ca', 'patient-portal-billing.org'],
    targetSectors: ['Hospitals', 'Pharmaceuticals', 'Municipalities'],
    incidentCount24h: 1980,
    detectedProtocols: ['Tor Hidden Service Proxy', 'WebDAV Staging'],
    firstSeen: '2026-04-15',
    lastObserved: '19 mins ago',
    threatActors: ['LockBit Affiliates', 'BlackCat / ALPHV Spinoff'],
    summary: 'Ransomware deployment staging ground orchestrating secondary stage PowerShell droppers and data exfiltration scripts against healthcare networks.',
  },
];

export const RECENT_TELEMETRY_STREAM: TelemetryAlert[] = [
  {
    id: 'tel-1',
    timestamp: 'Just now',
    sourceCity: 'Ashburn, US',
    countryCode: 'US',
    category: 'CREDENTIAL_HARVESTING',
    threatActor: 'Storm-1167',
    targetSector: 'Higher Education',
    indicator: '54.210.14.92 (EvilProxy MFA Intercept)',
    severity: 'CRITICAL',
  },
  {
    id: 'tel-2',
    timestamp: '2 mins ago',
    sourceCity: 'Frankfurt, DE',
    countryCode: 'DE',
    category: 'PHISHING',
    threatActor: 'TA577 / Pikabot',
    targetSector: 'Supply Chain',
    indicator: '185.220.101.5 (Rotational MX Relay)',
    severity: 'CRITICAL',
  },
  {
    id: 'tel-3',
    timestamp: '6 mins ago',
    sourceCity: 'Moscow, RU',
    countryCode: 'RU',
    category: 'MALWARE_C2',
    threatActor: 'Midnight Blizzard',
    targetSector: 'Energy Grids',
    indicator: '194.26.29.112 (Cobalt Strike Beacon)',
    severity: 'CRITICAL',
  },
  {
    id: 'tel-4',
    timestamp: '11 mins ago',
    sourceCity: 'Amsterdam, NL',
    countryCode: 'NL',
    category: 'PHISHING',
    threatActor: 'FIN7 Carbanak',
    targetSector: 'Financial Services',
    indicator: '91.240.118.88 (SEPA Invoice Phish)',
    severity: 'HIGH',
  },
  {
    id: 'tel-5',
    timestamp: '18 mins ago',
    sourceCity: 'São Paulo, BR',
    countryCode: 'BR',
    category: 'MALWARE_C2',
    threatActor: 'Grandoreiro Syndicate',
    targetSector: 'Commercial Banking',
    indicator: '177.18.24.11 (Pix Overlay Trojan)',
    severity: 'HIGH',
  },
  {
    id: 'tel-6',
    timestamp: '24 mins ago',
    sourceCity: 'Singapore, SG',
    countryCode: 'SG',
    category: 'BEC_INFRASTRUCTURE',
    threatActor: 'Mustang Panda',
    targetSector: 'Maritime Shipping',
    indicator: '103.28.248.51 (BEC Redirection)',
    severity: 'HIGH',
  },
  {
    id: 'tel-7',
    timestamp: '31 mins ago',
    sourceCity: 'Toronto, CA',
    countryCode: 'CA',
    category: 'RANSOMWARE_STAGING',
    threatActor: 'LockBit Affiliates',
    targetSector: 'Hospitals',
    indicator: '142.214.33.10 (LockBit 3.0 Loader)',
    severity: 'CRITICAL',
  },
];

export interface CaseCorrelationResult {
  hasCorrelations: boolean;
  correlatedHotspots: ThreatHotspot[];
  correlationMatches: {
    hotspotId: string;
    hotspotName: string;
    iocType: 'IP' | 'DOMAIN' | 'ASN' | 'RELAY';
    iocValue: string;
    matchConfidence: 'EXACT' | 'INFRASTRUCTURE_ADJACENT' | 'ASN_ASSOCIATED';
    explanation: string;
  }[];
}

/**
 * Correlates current forensic case evidence (IPs, Domains, ASNs, Received hops)
 * against global threat hotspots to provide deep investigation context.
 */
export function correlateCaseWithThreatLandscape(
  state: InvestigationState,
  hotspots: ThreatHotspot[] = GLOBAL_THREAT_HOTSPOTS
): CaseCorrelationResult {
  const matches: CaseCorrelationResult['correlationMatches'] = [];
  const matchedHotspotIds = new Set<string>();

  // Extract all observed IPs from the email
  const caseIps: string[] = [];
  if (Array.isArray(state.iocs)) {
    state.iocs.forEach((ioc) => {
      if ((ioc.type === 'ipv4' || ioc.type === 'ipv6') && !caseIps.includes(ioc.value)) {
        caseIps.push(ioc.value);
      }
    });
  }
  if (state.parsedEmail?.receivedChain) {
    state.parsedEmail.receivedChain.forEach((h) => {
      if (h.ip && !caseIps.includes(h.ip)) caseIps.push(h.ip);
    });
  }

  // Extract domains
  const caseDomains: string[] = [];
  if (Array.isArray(state.iocs)) {
    state.iocs.forEach((ioc) => {
      if (ioc.type === 'domain' && !caseDomains.includes(ioc.value.toLowerCase())) {
        caseDomains.push(ioc.value.toLowerCase());
      }
    });
  }

  // Extract ASNs from intelligence state
  const caseAsns = new Set<string>();
  Object.values(state.ipIntelligence).forEach((intel) => {
    if (intel.asn) {
      const normalizedAsn = intel.asn.replace(/[^0-9]/g, '');
      if (normalizedAsn) caseAsns.add(`AS${normalizedAsn}`);
    }
  });

  // Evaluate correlation against each hotspot
  hotspots.forEach((hs) => {
    // 1. Direct IP Match
    caseIps.forEach((ip) => {
      if (hs.activeIps.includes(ip)) {
        matches.push({
          hotspotId: hs.id,
          hotspotName: hs.name,
          iocType: 'IP',
          iocValue: ip,
          matchConfidence: 'EXACT',
          explanation: `Evidence IP ${ip} matches known active C2/Phishing infrastructure in ${hs.city}.`,
        });
        matchedHotspotIds.add(hs.id);
      }
    });

    // 2. ASN Infrastructure Match
    const hsAsnClean = hs.asn.replace(/[^0-9]/g, '');
    caseAsns.forEach((asn) => {
      const cleanCaseAsn = asn.replace(/[^0-9]/g, '');
      if (hsAsnClean && cleanCaseAsn && hsAsnClean === cleanCaseAsn) {
        matches.push({
          hotspotId: hs.id,
          hotspotName: hs.name,
          iocType: 'ASN',
          iocValue: hs.asn,
          matchConfidence: 'ASN_ASSOCIATED',
          explanation: `Autonomous system ${hs.asn} (${hs.isp}) hosts active malicious infrastructure correlated with this case.`,
        });
        matchedHotspotIds.add(hs.id);
      }
    });

    // 3. Known Phishing Relay matches from Received Chain
    if (state.parsedEmail?.receivedChain) {
      state.parsedEmail.receivedChain.forEach((hop) => {
        const fromStr = (hop.from || '').toLowerCase();
        const byStr = (hop.by || '').toLowerCase();

        if (
          (hs.id === 'hs-frankfurt-02' && (fromStr.includes('online-host24') || fromStr.includes('zwiebelfreunde') || hop.ip === '185.220.101.5')) ||
          (hs.id === 'hs-amsterdam-03' && (fromStr.includes('invoicing-srv') || hop.ip === '91.240.118.88')) ||
          (hs.id === 'hs-moscow-04' && (fromStr.includes('cloud-relay') || hop.ip === '194.26.29.112')) ||
          (hs.id === 'hs-ashburn-01' && (fromStr.includes('corporate-finance') || hop.ip === '198.51.100.45'))
        ) {
          if (!matches.some((m) => m.hotspotId === hs.id && m.iocType === 'RELAY')) {
            matches.push({
              hotspotId: hs.id,
              hotspotName: hs.name,
              iocType: 'RELAY',
              iocValue: hop.ip || hop.from || 'MTA Transit Node',
              matchConfidence: 'EXACT',
              explanation: `MTA Hop #${hop.hopNumber} originates directly from the ${hs.name} attack network.`,
            });
            matchedHotspotIds.add(hs.id);
          }
        }
      });
    }

    // 4. Domain similarity match
    caseDomains.forEach((domain) => {
      if (
        hs.domains.some(
          (d) =>
            d.includes(domain) ||
            domain.includes(d) ||
            (domain.includes('auth') && d.includes('auth')) ||
            (domain.includes('invoice') && d.includes('invoice'))
        )
      ) {
        if (!matches.some((m) => m.hotspotId === hs.id && m.iocValue === domain)) {
          matches.push({
            hotspotId: hs.id,
            hotspotName: hs.name,
            iocType: 'DOMAIN',
            iocValue: domain,
            matchConfidence: 'INFRASTRUCTURE_ADJACENT',
            explanation: `Case domain '${domain}' exhibits lexical naming conventions and infrastructure shared with the ${hs.name}.`,
          });
          matchedHotspotIds.add(hs.id);
        }
      }
    });
  });

  const correlatedHotspots = hotspots.filter((hs) => matchedHotspotIds.has(hs.id));

  return {
    hasCorrelations: matches.length > 0,
    correlatedHotspots,
    correlationMatches: matches,
  };
}
