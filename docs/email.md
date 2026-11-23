# Email: hello@josuedev.dpdns.org (E10, #123)

No mail server at home. Receiving goes through **Cloudflare Email Routing**, sending through
**Amazon SES**. Nothing runs in Docker for this; it's DNS plus two accounts.

```
inbound:  sender ──MX──> Cloudflare Email Routing ──forward──> personal Gmail
outbound: Gmail "Send mail as" ──SMTP 587──> Amazon SES (eu-central-1) ──> recipient
```

| | |
|---|---|
| Address | `hello@josuedev.dpdns.org` (catch-all **off**: other local parts bounce) |
| Receiving | Cloudflare Email Routing → personal Gmail |
| Sending | Amazon SES, region `eu-central-1`, SMTP `email-smtp.eu-central-1.amazonaws.com:587` (STARTTLS) |
| SPF / DKIM / DMARC | Cloudflare SPF for the root, SES Easy DKIM, custom MAIL FROM `bounce.`, DMARC `p=quarantine` |
| Credentials | SES SMTP user/password: password manager only, never in git or `.env` |

## Why not a mail server at home

Checked 2026-11-11 from the PC:

- **No PTR (reverse DNS)** for the public IP, and it's a shared CGNAT address the ISP won't give a PTR
  for. Gmail rejects mail from IPs without one (`550-5.7.25`); Outlook spam-folders it.
- **No inbound ports** (CGNAT): Gmail's "Send mail as" must reach the SMTP server from the internet, and
  Cloudflare Tunnel only carries HTTP(S) publicly. Inbound MX on port 25 is impossible for the same reason.
- Outbound port 25 is open and the IP isn't listed today, but a shared dynamic IP can be listed by
  someone else at any time.

A homelab SMTP container that apps send through, delivering via SES, is a follow-up issue. A full mail
server would need a VPS with a fixed IP and PTR.

### Why SES (2026-11-23)

`dpdns.org` is on the Public Suffix List, so services treat `josuedev.dpdns.org` as a free hosted
domain. **Resend** refuses it ("We don't allow free public domains") and Brevo only authenticates
domains you own. SES verifies through DNS records alone. Cloudflare Email Sending needs Workers Paid
($5/month) and is still beta. With a real domain later, Resend's free plan would also work.

## Setup

### 1. Receiving: Cloudflare Email Routing

Cloudflare dashboard → `josuedev.dpdns.org` → **Email → Email Routing**:

1. **Get started / Enable**. Let it **add the records** it proposes: 3 `MX` (`route1/2/3.mx.cloudflare.net`),
   the root SPF `TXT v=spf1 include:_spf.mx.cloudflare.net ~all`, and its DKIM `cf2024-1._domainkey`.
   The zone is fully delegated to Cloudflare, so DigitalPlat doesn't need to allow anything (MX is just a
   record in our zone).
2. **Destination addresses → Add**: the personal Gmail, then click the link in the verification mail.
3. **Routing rules → Custom address**: `hello` → *Send to* that Gmail. **Catch-all: Disabled** (or "Drop").

### 2. Sending: Amazon SES

AWS console, region **Europe (Frankfurt) eu-central-1** (top right) → **Amazon SES**:

1. **Identities → Create identity → Domain** `josuedev.dpdns.org`:
   - *Use a custom MAIL FROM domain*: `bounce` (→ `bounce.josuedev.dpdns.org`), behavior on MX failure:
     *Use default MAIL FROM*.
   - *Easy DKIM*, RSA 2048, *Publish DNS records to Route53*: **off** (DNS is in Cloudflare).
2. Copy the records SES shows into **Cloudflare → DNS → Records**, all **DNS only** (grey cloud):

   | Type | Name | Content |
   |---|---|---|
   | CNAME ×3 | `<token>._domainkey` | `<token>.dkim.amazonses.com` |
   | MX | `bounce` | `feedback-smtp.eu-central-1.amazonses.com` (priority 10) |
   | TXT | `bounce` | `v=spf1 include:amazonses.com ~all` |

   Wait until the identity shows **Verified** and DKIM **Successful** (minutes to an hour).
3. **SMTP settings → Create SMTP credentials**: creates an IAM user allowed only `ses:SendRawEmail`.
   Save the SMTP user name and password **in the password manager** (shown once). These are not the
   IAM access keys; don't create those.
4. **Account dashboard → Request production access**: mail type *Transactional*, website
   `https://josuedev.dpdns.org`, use case: "Personal address hello@ for replies from my personal mail
   client and contact-form notifications, a few mails per day, no lists or marketing. Bounces and
   complaints are handled by hand." Until it's approved (about a day), SES only sends **to verified
   addresses** (sandbox, 200/day).

### 3. DMARC

Cloudflare → **Email → DMARC Management → Enable**: it adds a `rua` reporting address for the free
report dashboard. Then set the record (**DNS → Records**, edit or add):

| Type | Name | Content |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; adkim=s; aspf=r; rua=mailto:<address from DMARC Management>` |

`adkim=s` works because SES signs with `d=josuedev.dpdns.org`. Once reports show only passing mail for a
few weeks, consider `p=reject`.

### 4. Gmail: "Send mail as"

Gmail → **Settings → Accounts and Import → Send mail as → Add another email address**:

- Name `Josue Lopez`, address `hello@josuedev.dpdns.org`, *Treat as an alias*: on.
- SMTP server `email-smtp.eu-central-1.amazonaws.com`, port **587**, username/password = SES SMTP
  credentials, **TLS**.
- Gmail sends a confirmation code to `hello@`, which Cloudflare forwards to the same inbox: paste it.
- Optional: *When replying to a message: reply from the same address it was sent to*.

## Check it

```bash
d=josuedev.dpdns.org
dig +short MX  $d                       # route1/2/3.mx.cloudflare.net
dig +short TXT $d                       # v=spf1 include:_spf.mx.cloudflare.net ~all
dig +short TXT _dmarc.$d                # v=DMARC1; p=quarantine; ...
dig +short MX  bounce.$d                # feedback-smtp.eu-central-1.amazonses.com
dig +short TXT bounce.$d                # v=spf1 include:amazonses.com ~all
# DKIM: one per token SES shows
dig +short CNAME <token>._domainkey.$d  # <token>.dkim.amazonses.com
```

End-to-end tests:

1. **Receive:** from another account (e.g. Outlook) mail `hello@`: arrives in Gmail.
2. **Send:** from Gmail as `hello@` to a Gmail and an Outlook address: lands in **Inbox**. In Gmail,
   *Show original* must say `SPF: PASS`, `DKIM: 'PASS' with domain josuedev.dpdns.org`, `DMARC: 'PASS'`;
   in Outlook the `Authentication-Results` header shows `spf=pass dkim=pass dmarc=pass`.

## Reputation and limits

- `dpdns.org` is a free subdomain service; some filters score free domains lower and the domain is
  young. If mail keeps landing in spam despite passing SPF/DKIM/DMARC, the fix is a cheap real
  domain (~10 EUR/year), not more DNS tweaks. Moving only needs these records recreated on the new zone.
- Cloudflare Email Routing forwards; it can't send. Replies go out through SES via Gmail.
- SES: bounce rate must stay < 5 % and complaints < 0.1 % or the account gets paused. Fine for
  personal mail; don't send lists from it.
- Cost: **Essentials** plan (the default for new SES accounts since 2026-07-21): no monthly fee,
  pay per mail (cents per 1,000). The old 12-month free tier is gone for new accounts. Don't switch
  to Pro/Enterprise (fixed monthly fee). A billing alarm in AWS Budgets (e.g. $1) catches surprises.
