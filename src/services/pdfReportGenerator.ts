/**
 * Kryptos Forensics — PDF Investigation Report Generator
 * Generates an evidence-backed PDF summary of the forensic investigation.
 * Includes Case ID, Evidence Metadata, Cryptographic Authentication, and Final Verdict.
 */

import { jsPDF } from 'jspdf';
import { InvestigationState } from '../types';
import { formatBytes } from './cryptoUtils';

export function generateForensicPdf(state: InvestigationState): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const ensureSpace = (requiredMm: number) => {
    if (y + requiredMm > pageHeight - 16) {
      doc.addPage();
      y = 14;
      renderPageHeader();
    }
  };

  const renderPageHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(83, 101, 122);
    doc.text('KRYPTOS FORENSICS • EMAIL THREAT & FORENSIC INTELLIGENCE REPORT', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`CASE REF: ${state.caseId}`, pageWidth - margin, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(217, 225, 230);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  // --- 1. COVER / DOCUMENT TITLE BLOCK ---
  // Top Banner
  doc.setFillColor(20, 34, 56); // Deep Navy (#142238)
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('FORENSIC INVESTIGATION REPORT', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(45, 189, 202); // Cyan (#2DBDCA)
  doc.text('OFFICIAL EVIDENCE DOCKET • DETERMINISTIC ARTIFACT ANALYSIS', margin + 6, y + 15);

  const genDate = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  doc.setFontSize(7.5);
  doc.setTextColor(200, 210, 220);
  doc.text(`Generated: ${genDate}`, pageWidth - margin - 6, y + 9, { align: 'right' });
  doc.text(`Classification: PRIVILEGED / CONFIDENTIAL`, pageWidth - margin - 6, y + 15, { align: 'right' });

  y += 26;

  // --- 2. EXECUTIVE VERDICT & RISK SUMMARY BOX ---
  ensureSpace(42);
  const fusion = state.fusion;
  const verdict = fusion?.verdict || 'PENDING EVALUATION';
  const score = fusion ? fusion.fusedScore : 0;

  let verdictColor: [number, number, number] = [31, 164, 99]; // Green
  let verdictBg: [number, number, number] = [238, 250, 243]; // Soft Green
  let verdictBorder: [number, number, number] = [170, 230, 195];

  if (verdict === 'HIGH_CONFIDENCE_THREAT' || score >= 70) {
    verdictColor = [224, 49, 49]; // Red
    verdictBg = [254, 242, 242];
    verdictBorder = [248, 180, 180];
  } else if (verdict === 'ELEVATED_RISK_DETECTED' || score >= 40) {
    verdictColor = [217, 119, 6]; // Amber
    verdictBg = [255, 251, 235];
    verdictBorder = [251, 211, 141];
  }

  // Verdict Container Card
  doc.setFillColor(...verdictBg);
  doc.setDrawColor(...verdictBorder);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(83, 101, 122);
  doc.text('EXECUTIVE FORENSIC VERDICT', margin + 5, y + 6);

  doc.setFontSize(13);
  doc.setTextColor(...verdictColor);
  doc.text(verdict.replace(/_/g, ' '), margin + 5, y + 13);

  // Score Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 34, 56);
  doc.text(`Multi-Vector Threat Score: ${score} / 100`, pageWidth - margin - 6, y + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(83, 101, 122);
  const contentScoreText = state.contentAnalysis ? `Content Model: ${state.contentAnalysis.contentScore}/100` : 'Content: N/A';
  const techScoreText = state.technicalAnalysis ? `Technical Model: ${state.technicalAnalysis.technicalScore}/100` : 'Tech: N/A';
  doc.text(`${contentScoreText} | ${techScoreText}`, pageWidth - margin - 6, y + 13, { align: 'right' });

  // Explanation text
  const explanation = fusion?.explanation || 'Evaluation completed based on available email artifact headers and content signals.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(20, 34, 56);
  const wrappedExplanation = doc.splitTextToSize(explanation, contentWidth - 10);
  doc.text(wrappedExplanation.slice(0, 3), margin + 5, y + 19);

  y += 38;

  // --- 3. CASE & EVIDENCE METADATA ---
  ensureSpace(38);
  renderSectionHeading('1. EVIDENCE IDENTIFICATION & METADATA', doc, margin, y, contentWidth);
  y += 6;

  doc.setFillColor(245, 246, 244);
  doc.setDrawColor(217, 225, 230);
  doc.roundedRect(margin, y, contentWidth, 26, 1.5, 1.5, 'FD');

  const metaCol1X = margin + 5;
  const metaCol2X = margin + 65;
  const metaCol3X = margin + 125;

  renderMetaItem(doc, 'CASE REFERENCE', state.caseId, metaCol1X, y + 5);
  renderMetaItem(doc, 'EVIDENCE IDENTIFIER', state.evidenceId, metaCol2X, y + 5);
  renderMetaItem(doc, 'ACQUISITION TIMESTAMP', state.file?.acquiredAt || 'Recorded at ingestion', metaCol3X, y + 5);

  renderMetaItem(doc, 'ARTIFACT FILENAME', state.file?.name || 'artifact.eml', metaCol1X, y + 15);
  renderMetaItem(doc, 'FILE SIZE', state.file ? `${formatBytes(state.file.size)} (${state.file.size} bytes)` : 'N/A', metaCol2X, y + 15);
  renderMetaItem(doc, 'MIME TYPE', state.file?.mimeType || 'message/rfc822', metaCol3X, y + 15);

  y += 29;

  // Cryptographic Hash Box
  ensureSpace(14);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(217, 225, 230);
  doc.rect(margin, y, contentWidth, 10, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(83, 101, 122);
  doc.text('CRYPTOGRAPHIC INTEGRITY (SHA-256):', margin + 3, y + 4.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 34, 56);
  doc.text(state.file?.sha256 || 'Pending computation', margin + 3, y + 8);

  y += 14;

  // --- 4. RFC 5322 ENVELOPE METADATA ---
  const parsed = state.parsedEmail;
  if (parsed) {
    ensureSpace(34);
    renderSectionHeading('2. RFC 5322 ENVELOPE & HEADER RECORD', doc, margin, y, contentWidth);
    y += 6;

    doc.setFillColor(250, 251, 251);
    doc.setDrawColor(217, 225, 230);
    doc.roundedRect(margin, y, contentWidth, 28, 1.5, 1.5, 'FD');

    renderHeaderField(doc, 'From', parsed.from.raw || `${parsed.from.displayName || ''} <${parsed.from.email}>`, margin + 4, y + 4.5, contentWidth - 8);
    renderHeaderField(doc, 'To', parsed.to.map((t) => t.email || t.domain).join(', ') || 'N/A', margin + 4, y + 9.5, contentWidth - 8);
    renderHeaderField(doc, 'Subject', parsed.subject || '(No subject)', margin + 4, y + 14.5, contentWidth - 8);
    renderHeaderField(doc, 'Date', parsed.date || 'N/A', margin + 4, y + 19.5, contentWidth - 8);
    renderHeaderField(doc, 'Message-ID', parsed.messageId || 'N/A', margin + 4, y + 24.5, contentWidth - 8);

    y += 32;
  }

  // --- 5. CRYPTOGRAPHIC AUTHENTICATION PROTOCOLS ---
  const auth = state.authentication;
  if (auth) {
    ensureSpace(42);
    renderSectionHeading('3. CRYPTOGRAPHIC & PROTOCOL AUTHENTICATION STATUS', doc, margin, y, contentWidth);
    y += 6;

    const boxWidth = (contentWidth - 6) / 3;

    // SPF
    renderAuthPill(doc, margin, y, boxWidth, 'SPF EVALUATION', auth.spf.status, auth.spf.reason, auth.spf.provenance);
    // DKIM
    renderAuthPill(doc, margin + boxWidth + 3, y, boxWidth, 'DKIM EVALUATION', auth.dkim.status, auth.dkim.reason, auth.dkim.provenance);
    // DMARC
    renderAuthPill(doc, margin + (boxWidth + 3) * 2, y, boxWidth, 'DMARC EVALUATION', auth.dmarc.status, auth.dmarc.reason, auth.dmarc.provenance);

    y += 30;
  }

  // --- 6. INDICATORS OF COMPROMISE (IOCs) ---
  if (state.iocs.length > 0) {
    ensureSpace(38);
    renderSectionHeading(`4. EXTRACTED OBSERVABLES & INDICATORS (IOCs: ${state.iocs.length})`, doc, margin, y, contentWidth);
    y += 6;

    const displayIocs = state.iocs.slice(0, 8); // Top 8 indicators for compact presentation
    doc.setFillColor(245, 246, 244);
    doc.setDrawColor(217, 225, 230);
    doc.rect(margin, y, contentWidth, 6, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(83, 101, 122);
    doc.text('TYPE', margin + 4, y + 4);
    doc.text('OBSERVABLE VALUE', margin + 28, y + 4);
    doc.text('LOCATION', margin + 115, y + 4);
    doc.text('STATUS', margin + 155, y + 4);
    y += 6;

    displayIocs.forEach((ioc, idx) => {
      ensureSpace(6);
      doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 251, idx % 2 === 0 ? 255 : 251);
      doc.setDrawColor(230, 235, 238);
      doc.rect(margin, y, contentWidth, 5.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(45, 189, 202);
      doc.text(ioc.type.toUpperCase(), margin + 4, y + 3.8);

      doc.setFont('courier', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(20, 34, 56);
      const val = ioc.value.length > 55 ? ioc.value.substring(0, 52) + '...' : ioc.value;
      doc.text(val, margin + 28, y + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(83, 101, 122);
      doc.text(ioc.location, margin + 115, y + 3.8);

      doc.setFont('helvetica', 'bold');
      const isSuspicious = ioc.reputationStatus === 'SUSPICIOUS';
      doc.setTextColor(isSuspicious ? 224 : 83, isSuspicious ? 49 : 101, isSuspicious ? 49 : 122);
      doc.text(ioc.reputationStatus || 'OBSERVED', margin + 155, y + 3.8);

      y += 5.5;
    });

    if (state.iocs.length > 8) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(83, 101, 122);
      doc.text(`... and ${state.iocs.length - 8} additional observables recorded in full JSON docket.`, margin + 4, y + 4);
      y += 6;
    }

    y += 4;
  }

  // --- 7. CHAIN OF CUSTODY LOG ---
  if (state.chainOfCustody.length > 0) {
    ensureSpace(32);
    renderSectionHeading('5. CHAIN OF CUSTODY & AUDIT VERIFICATION LOG', doc, margin, y, contentWidth);
    y += 6;

    const displayLogs = state.chainOfCustody.slice(-6); // Last 6 chronological events
    displayLogs.forEach((item) => {
      ensureSpace(6);
      doc.setFont('courier', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(83, 101, 122);
      doc.text(item.timestamp, margin + 2, y + 3);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(20, 34, 56);
      doc.text(item.action, margin + 42, y + 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(83, 101, 122);
      const actorText = `[${item.actor || item.operator || 'Investigator'}]`;
      doc.text(actorText, margin + 92, y + 3);

      const maxDetailsLen = 52;
      const detailsText = item.details.length > maxDetailsLen ? item.details.substring(0, maxDetailsLen - 3) + '...' : item.details;
      doc.text(detailsText, margin + 124, y + 3);

      y += 4.8;
    });

    y += 4;
  }

  // --- 8. FORENSIC ADMISSIBILITY ATTESTATION ---
  ensureSpace(22);
  doc.setFillColor(245, 246, 244);
  doc.setDrawColor(217, 225, 230);
  doc.roundedRect(margin, y, contentWidth, 16, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(20, 34, 56);
  doc.text('FORENSIC INTEGRITY NOTICE & ADMISSIBILITY ATTESTATION:', margin + 4, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(83, 101, 122);
  doc.text(
    'This technical summary was generated deterministically from RFC 5322 MIME structures and cryptographic hashes.',
    margin + 4,
    y + 8.5
  );
  doc.text(
    'All observed indicators correspond to unaltered byte payloads. Kryptos Forensics attests to computational chain-of-custody.',
    margin + 4,
    y + 12
  );

  // --- 9. PAGE NUMBERS ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(130, 145, 160);
    doc.text(`Kryptos Forensics Evidence Docket • Case ${state.caseId}`, margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  return doc;
}

export function downloadForensicPdfReport(state: InvestigationState): void {
  const doc = generateForensicPdf(state);
  const cleanCaseId = state.caseId.replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`kryptos-forensic-report-${cleanCaseId}.pdf`);
}

// --- HELPER RENDERING FUNCTIONS ---

function renderSectionHeading(title: string, doc: jsPDF, x: number, y: number, width: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 34, 56);
  doc.text(title, x, y + 3.5);

  doc.setDrawColor(217, 225, 230);
  doc.setLineWidth(0.3);
  doc.line(x, y + 4.5, x + width, y + 4.5);
}

function renderMetaItem(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(83, 101, 122);
  doc.text(label, x, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 34, 56);
  doc.text(value, x, y + 4.2);
}

function renderHeaderField(doc: jsPDF, label: string, value: string, x: number, y: number, maxWidth: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(83, 101, 122);
  doc.text(`${label}:`, x, y);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(20, 34, 56);
  const textX = x + 20;
  const availWidth = maxWidth - 20;
  const truncated = value.length > 80 ? value.substring(0, 77) + '...' : value;
  doc.text(truncated, textX, y);
}

function renderAuthPill(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  status: string,
  reason: string,
  provenance: string
) {
  doc.setFillColor(250, 251, 251);
  doc.setDrawColor(217, 225, 230);
  doc.roundedRect(x, y, w, 24, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(83, 101, 122);
  doc.text(title, x + 3, y + 4.5);

  let statusColor: [number, number, number] = [83, 101, 122];
  if (status === 'PASS') statusColor = [31, 164, 99];
  else if (status === 'FAIL') statusColor = [224, 49, 49];
  else if (status.includes('SIGNATURE_PRESENT') || status.includes('NOT_VERIFIABLE')) statusColor = [217, 119, 6];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...statusColor);
  doc.text(status, x + 3, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(83, 101, 122);
  const wrappedReason = doc.splitTextToSize(reason, w - 6);
  doc.text(wrappedReason.slice(0, 2), x + 3, y + 15);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.5);
  doc.setTextColor(130, 145, 160);
  doc.text(provenance, x + 3, y + 21);
}
