/**
 * Kryptos Forensics — Verified Real-World Forensic Test Samples
 * Complete RFC 5322 compliant .eml fixtures representing authentic investigation scenarios.
 */

export interface SampleEmailItem {
  id: string;
  name: string;
  filename: string;
  description: string;
  scenarioType: 'LEGITIMATE' | 'CREDENTIAL_HARVEST' | 'FINANCIAL_BEC' | 'PAYLOAD_ATTACHMENT';
  emlContent: string;
}

export const SAMPLE_EMAILS: SampleEmailItem[] = [
  {
    id: 'sample-legit-univ',
    name: 'Test 1: Legitimate University Research Announcement',
    filename: 'cs-research-symposium-2026.eml',
    description: 'Authentic academic bulletin. Clean headers, aligned From/Return-Path, no urgency, nominal infrastructure.',
    scenarioType: 'LEGITIMATE',
    emlContent: `Delivered-To: investigator@kryptos-lab.org
Received: by 2002:a05:6838:1204:b0:824:916a:4192 with SMTP id e4csp318412nke;
        Mon, 21 Sep 2026 09:14:22 -0700 (PDT)
X-Google-Smtp-Source: AGHT+IFKj3j2l1119k0akdk2kd
X-Received: by 2002:a17:902:d58b:b0:1f0:9284:1172 with SMTP id v11-20020a170902d58b00b001f092841172mr18294241plb.12.1695312862410;
        Mon, 21 Sep 2026 09:14:22 -0700 (PDT)
Received: from mail-relay.stanford.edu (mail-relay.stanford.edu. [171.67.215.200])
        by mx.google.com with ESMTPS id o14-20020a17090a184e00b0026e6d19417fsi4918235pjb.11.2026.09.21.09.14.21
        for <investigator@kryptos-lab.org>
        (version=TLS1_3 cipher=TLS_AES_256_GCM_SHA384 bits=256/256);
        Mon, 21 Sep 2026 09:14:22 -0700 (PDT)
Received-SPF: pass (google.com: domain of events@cs.stanford.edu designates 171.67.215.200 as permitted sender) client-ip=171.67.215.200;
Authentication-Results: mx.google.com;
       dkim=pass header.i=@cs.stanford.edu header.s=su2024 header.b=X9bKq1mR;
       spf=pass (google.com: domain of events@cs.stanford.edu designates 171.67.215.200 as permitted sender) smtp.mailfrom=events@cs.stanford.edu;
       dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=cs.stanford.edu
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
        d=cs.stanford.edu; s=su2024; t=1695312861;
        h=from:to:subject:date:message-id:content-type:mime-version;
        bh=yvQ7eTf4a8gW9fK2j3Pq1o8Rt4u7w9Xz2b5m6n7L8k=;
        b=X9bKq1mRz4v7w2p9q0k1j2h3g4f5d6s7a8q9w0e1r2t3y4u5i6o7p8a9s0d1f2g3
From: "Stanford CS Colloquium" <events@cs.stanford.edu>
To: <investigator@kryptos-lab.org>
Subject: Invitation: Autumn 2026 Computer Science Distinguished Lecture Series
Date: Mon, 21 Sep 2026 09:12:00 -0700
Message-ID: <colloq-20260921-98172@cs.stanford.edu>
Return-Path: <events@cs.stanford.edu>
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: 7bit

Dear Colleagues and Researchers,

We cordially invite you to attend the inaugural session of the Autumn 2026 Distinguished Lecture Series hosted by the Department of Computer Science.

Topic: High-Assurance Systems and Deterministic Software Verification
Speaker: Dr. Elena Vance, Senior Fellow at the Institute for Advanced Study
Location: Gates Computer Science Building, Auditorium B01
Time: Wednesday, September 23, 2026 at 4:15 PM PDT

An informal reception with light refreshments will follow the presentation in the Packard Atrium. All faculty, research staff, and graduate students are welcome.

For venue accessibility accommodations or remote teleconference links, please visit:
https://cs.stanford.edu/seminars/colloquium-autumn-2026

Sincerely,
Colloquium Organizing Committee
Department of Computer Science, Stanford University
`,
  },
  {
    id: 'sample-credential-urgent',
    name: 'Test 2: Urgent Credential Verification with Reply-To Mismatch',
    filename: 'urgent-account-lockout-notice.eml',
    description: 'Phishing attack mimicking IT Support with artificial 24h deadline, Reply-To pointing to external domain, and numeric IP link.',
    scenarioType: 'CREDENTIAL_HARVEST',
    emlContent: `Delivered-To: victim@corporate-finance.net
Received: from mail-in.corporate-finance.net (mail-in.corporate-finance.net [198.51.100.45])
        by mx.corporate-finance.net with ESMTP id q991ka94
        for <victim@corporate-finance.net>; Mon, 21 Sep 2026 10:22:15 -0400
Received: from unverified-gateway.online-host24.com (unverified-gateway.online-host24.com [185.220.101.5])
        by mail-in.corporate-finance.net with ESMTP id z8819ak481
        for <victim@corporate-finance.net>; Mon, 21 Sep 2026 10:21:40 -0400
Received-SPF: softfail (mail-in.corporate-finance.net: domain of transitioning support@internal-portal-desk.com does not designate 185.220.101.5 as permitted sender) client-ip=185.220.101.5;
Authentication-Results: mail-in.corporate-finance.net;
       spf=softfail smtp.mailfrom=support@internal-portal-desk.com;
       dkim=none (no signature found);
       dmarc=fail (p=none) header.from=corporate-finance.net
From: "IT Helpdesk Portal" <support@corporate-finance.net>
Reply-To: "IT Verification Routing" <auth-collector@external-ticket-node.ru>
Return-Path: <bounce@unverified-gateway.online-host24.com>
To: <victim@corporate-finance.net>
Subject: URGENT NOTICE: Your corporate account will be suspended within 24 hours
Date: Mon, 21 Sep 2026 10:20:00 -0400
Message-ID: <alert-lockout-99120@external-ticket-node.ru>
MIME-Version: 1.0
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: 7bit

<!DOCTYPE html>
<html>
<body>
<p><strong>SECURITY OPERATIONS CENTER ALERT: IMMEDIATE ACTION REQUIRED</strong></p>
<p>Dear User,</p>
<p>Our automated perimeter monitors detected an unauthorized login attempt against your workstation profile from an unverified IP address.</p>
<p>To prevent permanent data loss, your password will be suspended within 24 hours unless you confirm your password and verify your account credentials immediately.</p>
<p>Please click the secure validation link below to complete two-factor authentication:</p>
<p><a href="http://185.220.101.5/auth/verify-account.php?id=99281">http://corporate-finance.net/portal/auth-verify</a></p>
<p>Failure to respond immediately will result in your corporate account being permanently disabled.</p>
<p>Global IT Helpdesk and Information Security Team</p>
</body>
</html>
`,
  },
  {
    id: 'sample-financial-bec',
    name: 'Test 3: Executive Impersonation & Wire Transfer (BEC)',
    filename: 'urgent-wire-acquisition.eml',
    description: 'Targeted Business Email Compromise soliciting wire transfer with explicit secrecy instructions and no DKIM signature.',
    scenarioType: 'FINANCIAL_BEC',
    emlContent: `Delivered-To: controller@acme-industrial.com
Received: from external-vps.cloud-relay-node.org (external-vps.cloud-relay-node.org [194.26.29.112])
        by mail.acme-industrial.com with ESMTP id m44917ka
        for <controller@acme-industrial.com>; Mon, 21 Sep 2026 11:05:00 -0500
Received-SPF: neutral (mail.acme-industrial.com: 194.26.29.112 is neither permitted nor denied by domain of executive-desk@cloud-relay-node.org) client-ip=194.26.29.112;
From: "Arthur Pendelton (CEO)" <ceo@acme-industrial.com>
Reply-To: <arthur.pendelton.private@consulting-offices.net>
Return-Path: <executive-desk@cloud-relay-node.org>
To: <controller@acme-industrial.com>
Subject: Highly Confidential: Urgent Acquisition Wire Transfer
Date: Mon, 21 Sep 2026 11:04:12 -0500
Message-ID: <exec-trans-88210@consulting-offices.net>
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: 7bit

Hi Margaret,

Are you at your desk right now?

We are in the final closing stage of a strictly confidential asset acquisition that cannot be disclosed to the general board until regulatory filings close this evening.

I need you to process an immediate wire transfer of $84,500 to our external escrow partners before the 1:00 PM cutoff window.

Please do not call my mobile or discuss this with anyone in accounting as the non-disclosure agreement is legally binding. Reply directly to this email for the updated banking details and wire routing codes.

Treat this with utmost priority.

Best regards,
Arthur Pendelton
Chief Executive Officer
Acme Industrial Group
`,
  },
  {
    id: 'sample-attachment-payload',
    name: 'Test 4: Fake Vendor Invoice with Suspicious Attachment',
    filename: 'overdue-invoice-oct2026.eml',
    description: 'Invoice notification carrying a base64 encoded attachment. Exercises SHA-256 hash calculation and file integrity verification.',
    scenarioType: 'PAYLOAD_ATTACHMENT',
    emlContent: `Delivered-To: accounts-payable@logistics-corp.com
Received: from relay02.global-invoicing-srv.net (relay02.global-invoicing-srv.net [91.240.118.88])
        by mx.logistics-corp.com with ESMTP id inv-9104
        for <accounts-payable@logistics-corp.com>; Mon, 21 Sep 2026 08:30:10 -0600
Received-SPF: pass (mx.logistics-corp.com: domain of billing@global-invoicing-srv.net designates 91.240.118.88 as permitted sender) client-ip=91.240.118.88;
Authentication-Results: mx.logistics-corp.com;
       spf=pass smtp.mailfrom=billing@global-invoicing-srv.net;
       dkim=pass header.i=@global-invoicing-srv.net header.s=mail2026;
       dmarc=pass header.from=global-invoicing-srv.net
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
        d=global-invoicing-srv.net; s=mail2026;
        bh=M7k2j8a9q0w1e2r3t4y5u6i7o8p9a0s1d2f3g4h5j6=;
        b=q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9z0x1c2v3b4n5m6=;
From: "Apex Logistics Billing" <billing@global-invoicing-srv.net>
To: <accounts-payable@logistics-corp.com>
Subject: Past Due Statement: Unpaid Invoice #INV-882910
Date: Mon, 21 Sep 2026 08:28:44 -0600
Message-ID: <invoice-apex-882910@global-invoicing-srv.net>
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="----=_NextPart_000_01D9E710"

------=_NextPart_000_01D9E710
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: 7bit

Attention Accounts Department,

Please find attached the past due statement for freight dispatch services rendered during August 2026.

Total Amount Outstanding: $14,290.00
Due Date: Immediate payment required to avoid late interest penalties.

Please remit payment according to the wiring instructions detailed on page 2 of the attached statement.

Accounting Operations
Apex Logistics Billing Services
------=_NextPart_000_01D9E710
Content-Type: application/pdf; name="Statement_INV-882910.pdf"
Content-Disposition: attachment; filename="Statement_INV-882910.pdf"
Content-Transfer-Encoding: base64

JVBERi0xLjQKJeLjz9MKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+
ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PmVu
ZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAg
NjEyIDc5Ml0vQ29udGVudHMgNCAwIFI+PmVuZG9iago0IDAgb2JqPDwvTGVuZ3RoIDQ1
Pj5zdHJlYW0KQVQvRjEgMTIgVGYKNzIgNzIwIFRECihoZWxsbyBmb3JlbnNpYyBhbmFs
eXNpcylUagplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUg
ZiAKMDAwMDAwMDAxOCAwMDAwMCBuIAowMDAwMDAwMDY1IDAwMDAwIG4gCjAwMDAwMDAx
MTUgMDAwMDAgbiAKMDAwMDAwMDE5MiAwMDAwMCBuIAp0cmFpbGVyPDwvU2l6ZSA1L1Jv
b3QgMSAwIFI+PgpzdGFydHhyZWYKMjg5CiUlRU9GCg==
------=_NextPart_000_01D9E710--
`,
  },
];
