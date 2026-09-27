/**
 * Kryptos Forensics — Entity Graph Builder
 * Creates node-link entity network purely from verified investigation evidence.
 */

import { ParsedEmail, IOC, ThreatGraphData, GraphNode, GraphLink } from '../types';

export function buildThreatGraph(parsedEmail: ParsedEmail, iocs: IOC[], caseId: string): ThreatGraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const seenNodeIds = new Set<string>();

  const addNode = (id: string, label: string, type: GraphNode['type'], group: string, metadata?: any) => {
    if (!seenNodeIds.has(id)) {
      seenNodeIds.add(id);
      nodes.push({ id, label, type, group, metadata });
    }
  };

  const addLink = (source: string, target: string, label: string) => {
    if (seenNodeIds.has(source) && seenNodeIds.has(target)) {
      links.push({
        source,
        target,
        label,
        provenance: 'DETERMINISTICALLY DERIVED',
      });
    }
  };

  // 1. Central Email Node
  const emailNodeId = `email:${caseId}`;
  addNode(emailNodeId, parsedEmail.subject || 'Email Artifact', 'email', 'case', {
    messageId: parsedEmail.messageId,
    date: parsedEmail.date,
  });

  // 2. Sender Node & Domain
  if (parsedEmail.from.email) {
    const senderId = `email_addr:${parsedEmail.from.email}`;
    addNode(senderId, parsedEmail.from.email, 'sender', 'sender', {
      displayName: parsedEmail.from.displayName,
    });
    addLink(emailNodeId, senderId, 'SENT_BY');

    if (parsedEmail.from.domain) {
      const fromDomainId = `domain:${parsedEmail.from.domain}`;
      addNode(fromDomainId, parsedEmail.from.domain, 'domain', 'infrastructure');
      addLink(senderId, fromDomainId, 'FROM_DOMAIN');
    }
  }

  // 3. Reply-To Node (if different)
  if (parsedEmail.replyTo?.email) {
    const replyToId = `email_addr:${parsedEmail.replyTo.email}`;
    addNode(replyToId, parsedEmail.replyTo.email, 'sender', 'routing');
    addLink(emailNodeId, replyToId, 'REPLY_TO');

    if (parsedEmail.replyTo.domain && parsedEmail.replyTo.domain !== parsedEmail.from.domain) {
      const replyDomainId = `domain:${parsedEmail.replyTo.domain}`;
      addNode(replyDomainId, parsedEmail.replyTo.domain, 'domain', 'routing');
      addLink(replyToId, replyDomainId, 'ROUTED_DOMAIN');
    }
  }

  // 4. Recipients
  parsedEmail.to.forEach((rec) => {
    if (rec.email) {
      const recId = `email_addr:${rec.email}`;
      addNode(recId, rec.email, 'recipient', 'target');
      addLink(emailNodeId, recId, 'DELIVERED_TO');
    }
  });

  // 5. Transit IPs
  parsedEmail.receivedChain.forEach((hop) => {
    if (hop.ip) {
      const ipId = `ip:${hop.ip}`;
      addNode(ipId, hop.ip, 'ip', hop.isEarliestReliableRelay ? 'origin' : 'transit', {
        hopNumber: hop.hopNumber,
        isEarliest: hop.isEarliestReliableRelay,
      });
      addLink(emailNodeId, ipId, hop.isEarliestReliableRelay ? 'EARLIEST_RELAY' : 'ROUTED_THROUGH');
    }
  });

  // 6. URLs & Hosts
  const urls = iocs.filter((i) => i.type === 'url');
  urls.forEach((u) => {
    const urlId = `url:${u.value}`;
    let label = u.value;
    if (label.length > 32) {
      label = label.substring(0, 29) + '...';
    }
    addNode(urlId, label, 'url', 'links', { fullUrl: u.value });
    addLink(emailNodeId, urlId, 'CONTAINS_URL');

    try {
      const parsed = new URL(u.value);
      if (parsed.hostname) {
        const hostId = `domain:${parsed.hostname}`;
        addNode(hostId, parsed.hostname, 'domain', 'infrastructure');
        addLink(urlId, hostId, 'HOSTED_ON');
      }
    } catch {
      // ignore
    }
  });

  // 7. Attachments & Hashes
  parsedEmail.attachments.forEach((att) => {
    const attId = `att:${att.filename}`;
    addNode(attId, att.filename, 'attachment', 'payload', {
      size: att.sizeBytes,
      contentType: att.contentType,
    });
    addLink(emailNodeId, attId, 'HAS_ATTACHMENT');

    if (att.sha256) {
      const hashId = `hash:${att.sha256}`;
      addNode(hashId, `${att.sha256.substring(0, 10)}...`, 'hash', 'cryptography', {
        fullHash: att.sha256,
      });
      addLink(attId, hashId, 'SHA256_HASH');
    }
  });

  return { nodes, links };
}
