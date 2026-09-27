import express from 'express';
import http from 'http';
import path from 'path';
import dns from 'dns';
import { promises as dnsPromises } from 'dns';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

const SIH_SYSTEM_INSTRUCTION = `You are the Kryptos Forensics AI Voice Assistant representing our Smart India Hackathon (SIH) cybersecurity team.
You speak naturally, warmly, concisely, and with forensic authority.
You explain:
1) Our SIH project and team mission: Building an automated, zero-hallucination email threat detection and forensic intelligence platform for law enforcement, CERT, and security operations centers.
2) How things work across the 12-stage pipeline: From evidence intake and SHA-256 cryptographic verification, RFC 5322 MIME decomposition, SPF/DKIM/DMARC protocol validation, IOC observables extraction, live RDAP domain intelligence, linguistic threat Model A, technical anomaly Model B, multi-vector evidence fusion, relay origin tracing, entity topology graph, MITRE ATT&CK correlation, to court-ready PDF docket generation.
3) How our platform differs from generic AI: We never speculate or hallucinate. Every verdict is grounded in raw email bytes and cryptographic chain of custody.
Keep answers concise, engaging, and spoken (2 to 4 sentences). When asked about the platform or team, give an insightful, friendly, and technically accurate answer.`;

// Real DNS Inspection Endpoint
app.get('/api/intel/dns', async (req, res) => {
  const domain = req.query.domain as string;
  const recordType = (req.query.type as string || 'ALL').toUpperCase();

  if (!domain) {
    return res.status(400).json({ error: 'Domain parameter is required' });
  }

  const results: Record<string, any> = {};

  try {
    // TXT records (SPF, DMARC, DKIM)
    if (recordType === 'ALL' || recordType === 'TXT') {
      try {
        const txtRecords = await dnsPromises.resolveTxt(domain);
        results.TXT = txtRecords.map((chunk) => chunk.join(''));
      } catch (err: any) {
        results.TXT = [];
        results.txtError = err.code || err.message;
      }
    }

    // MX records
    if (recordType === 'ALL' || recordType === 'MX') {
      try {
        const mxRecords = await dnsPromises.resolveMx(domain);
        results.MX = mxRecords.sort((a, b) => a.priority - b.priority);
      } catch (err: any) {
        results.MX = [];
        results.mxError = err.code || err.message;
      }
    }

    // A records (IPv4)
    if (recordType === 'ALL' || recordType === 'A') {
      try {
        const aRecords = await dnsPromises.resolve4(domain);
        results.A = aRecords;
      } catch (err: any) {
        results.A = [];
        results.aError = err.code || err.message;
      }
    }

    // NS records
    if (recordType === 'ALL' || recordType === 'NS') {
      try {
        const nsRecords = await dnsPromises.resolveNs(domain);
        results.NS = nsRecords;
      } catch (err: any) {
        results.NS = [];
        results.nsError = err.code || err.message;
      }
    }

    return res.json({
      status: 'SUCCESS',
      domain,
      queryTime: new Date().toISOString(),
      provider: 'System DNS Resolver',
      results,
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'ERROR',
      domain,
      provider: 'System DNS Resolver',
      message: err.message || 'DNS resolution failed',
    });
  }
});

// Real IP & Reverse DNS endpoint
app.get('/api/intel/ip', async (req, res) => {
  const ip = req.query.ip as string;
  if (!ip) {
    return res.status(400).json({ error: 'IP parameter is required' });
  }

  const result: Record<string, any> = {
    ip,
    provider: 'System DNS / Public RDAP',
    timestamp: new Date().toISOString(),
  };

  // 1. Reverse DNS (PTR)
  try {
    const ptr = await dnsPromises.reverse(ip);
    result.rDNS = ptr;
  } catch (err: any) {
    result.rDNS = [];
    result.rDNSError = err.code || 'No PTR record found';
  }

  // 2. Fetch public RDAP/Geo data if online
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const fetchRes = await fetch(`https://rdap.arin.net/registry/ip/${ip}`, {
      headers: { Accept: 'application/rdap+json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (fetchRes.ok) {
      const rdapData = await fetchRes.json();
      result.rdap = {
        name: rdapData.name || null,
        handle: rdapData.handle || null,
        country: rdapData.country || null,
        startAddress: rdapData.startAddress || null,
        endAddress: rdapData.endAddress || null,
        org: rdapData.entities?.[0]?.vcardArray?.[1]?.find((e: any) => e[0] === 'fn')?.[3] || null,
      };
      result.provider = 'ARIN RDAP';
      result.status = 'SUCCESS';
    } else {
      result.rdapStatus = `HTTP ${fetchRes.status}`;
      result.status = 'PARTIAL';
    }
  } catch (err: any) {
    result.rdapStatus = err.message || 'RDAP request failed or timed out';
    result.status = 'PARTIAL';
  }

  return res.json(result);
});

// Real Domain RDAP endpoint
app.get('/api/intel/rdap', async (req, res) => {
  const domain = req.query.domain as string;
  if (!domain) {
    return res.status(400).json({ error: 'Domain parameter is required' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const fetchRes = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { Accept: 'application/rdap+json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (fetchRes.ok) {
      const data = await fetchRes.json();
      const registrar = data.entities?.find((e: any) => e.roles?.includes('registrar'))?.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3];
      const events = data.events || [];
      const registrationDate = events.find((e: any) => e.eventAction === 'registration')?.eventDate;
      const expirationDate = events.find((e: any) => e.eventAction === 'expiration')?.eventDate;
      const lastChangedDate = events.find((e: any) => e.eventAction === 'last changed')?.eventDate;

      return res.json({
        status: 'SUCCESS',
        domain,
        provider: 'rdap.org / ICANN RDAP',
        timestamp: new Date().toISOString(),
        registrationDate: registrationDate || null,
        expirationDate: expirationDate || null,
        lastChangedDate: lastChangedDate || null,
        registrar: registrar || null,
        nameservers: data.nameservers?.map((ns: any) => ns.ldhName) || [],
      });
    } else {
      return res.json({
        status: 'UNAVAILABLE',
        domain,
        provider: 'rdap.org',
        timestamp: new Date().toISOString(),
        reason: `RDAP provider returned HTTP ${fetchRes.status}`,
      });
    }
  } catch (err: any) {
    return res.json({
      status: 'UNAVAILABLE',
      domain,
      provider: 'rdap.org',
      timestamp: new Date().toISOString(),
      reason: err.message || 'RDAP lookup failed or timed out',
    });
  }
});

// Voice Assistant Status Endpoint
app.get('/api/voice/status', (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    liveApiAvailable: hasKey,
    model: 'gemini-3.8-live',
    voice: 'Zephyr',
    team: 'Smart India Hackathon (SIH)',
    system: 'Kryptos Forensics Workstation',
  });
});

function getFallbackSihResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('team') || q.includes('sih') || q.includes('who are you') || q.includes('mission')) {
    return 'We are the Smart India Hackathon engineering team behind Kryptos Forensics. Our mission is to build an automated, zero-hallucination email threat detection platform for law enforcement and cyber defense. Every verdict is backed by cryptographic ground truth, eliminating speculative guesses.';
  }
  if (q.includes('how it works') || q.includes('how things work') || q.includes('platform') || q.includes('architecture')) {
    return 'Kryptos Forensics processes raw email artifacts through a 12-stage forensic pipeline. It acquires SHA-256 hashes, decomposes RFC 5322 MIME structures, verifies SPF, DKIM, and DMARC protocols, queries live RDAP domain telemetry, executes dual linguistic and technical models, and computes a multi-vector fusion verdict with court-admissible PDF reports.';
  }
  if (q.includes('stage') || q.includes('pipeline') || q.includes('twelve') || q.includes('12')) {
    return 'The 12 stages encompass: Evidence Intake, RFC 5322 Parsing, Cryptographic Authentication, IOC Extraction, Network Telemetry, Linguistic Threat Model A, Technical Spoofing Model B, Multi-Vector Evidence Fusion, Origin Hop Traversal, Entity Topology Graph, MITRE ATT&CK Correlation, and Final Findings Docket with PDF export.';
  }
  if (q.includes('fusion') || q.includes('score') || q.includes('verdict')) {
    return 'Our Multi-Vector Evidence Fusion combines linguistic psychological triggers from Model A with protocol transport anomalies from Model B into a calibrated 0-to-100 joint index. It ensures clean corporate emails are never falsely penalized while weaponized spear-phishing attacks are reliably identified.';
  }
  if (q.includes('admiss') || q.includes('court') || q.includes('legal') || q.includes('evidence')) {
    return 'Evidence admissibility is guaranteed by strict cryptographic chain-of-custody. Every hop, header, and observable links directly to exact line numbers and byte offsets in the acquired RFC 5322 artifact, producing an immutable SHA-256 sealed audit trail.';
  }
  return 'Kryptos Forensics is an automated threat intelligence workstation built for the Smart India Hackathon. It performs deterministic RFC 5322 decomposition, SPF and DKIM protocol validation, and multi-vector risk scoring to safeguard organizations against advanced email threats.';
}

// Vite middleware or production static serving
async function startServer() {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/api/live' });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('Client connected to Live API WebSocket');
    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');

    if (!hasValidKey) {
      console.log('Live API: No GEMINI_API_KEY detected. Running in interactive SIH briefing mode.');
      clientWs.send(
        JSON.stringify({
          type: 'fallback_mode',
          message: 'GEMINI_API_KEY is not configured in environment. Interactive SIH voice briefing mode is active.',
        })
      );

      clientWs.on('message', (rawData) => {
        try {
          const data = JSON.parse(rawData.toString());
          if (data.type === 'text' && data.text) {
            const reply = getFallbackSihResponse(data.text);
            clientWs.send(JSON.stringify({ type: 'text', text: reply }));
          }
        } catch (err) {
          console.error('Error handling fallback message:', err);
        }
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: SIH_SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
            console.log('Connected to Gemini 3.8 Live API session');
            clientWs.send(JSON.stringify({ type: 'ready', model: 'gemini-3.8-live', voice: 'Zephyr' }));
          },
          onmessage: (message: LiveServerMessage) => {
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ type: 'audio', audio: part.inlineData.data }));
              }
              if (part.text) {
                clientWs.send(JSON.stringify({ type: 'text', text: part.text }));
              }
            }
            if (message.text && parts.length === 0) {
              clientWs.send(JSON.stringify({ type: 'text', text: message.text }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
          },
          onclose: (e) => {
            console.log('Gemini Live session closed:', e?.reason);
            clientWs.send(JSON.stringify({ type: 'session_closed', reason: e?.reason }));
          },
          onerror: (err: any) => {
            console.error('Gemini Live session error:', err);
            clientWs.send(JSON.stringify({ type: 'error', error: err?.message || 'Live session error' }));
          },
        },
      });

      clientWs.on('message', (rawData) => {
        try {
          const data = JSON.parse(rawData.toString());
          if (data.type === 'audio' && data.audio) {
            session.sendRealtimeInput({
              audio: { data: data.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (data.type === 'text' && data.text) {
            session.sendRealtimeInput({
              text: data.text,
            });
          }
        } catch (e) {
          console.error('Error forwarding message to Gemini Live:', e);
        }
      });

      clientWs.on('close', () => {
        try {
          session.close();
        } catch {}
      });
    } catch (err: any) {
      console.error('Failed to initialize Gemini 3.8 Live session:', err);
      clientWs.send(
        JSON.stringify({
          type: 'fallback_mode',
          message: err.message || 'Gemini 3.8 Live initialization failed. Falling back to voice briefing.',
        })
      );

      clientWs.on('message', (rawData) => {
        try {
          const data = JSON.parse(rawData.toString());
          if (data.type === 'text' && data.text) {
            const reply = getFallbackSihResponse(data.text);
            clientWs.send(JSON.stringify({ type: 'text', text: reply }));
          }
        } catch {}
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Kryptos Forensics server running on port ${PORT}`);
  });
}

startServer();
