# Email: hello@josuedev.dpdns.org (E10, #123)

No mail server at home. Receiving goes through **Cloudflare Email Routing**, sending through
**Resend**. Nothing runs in Docker for this; it's DNS plus two accounts.

```
inbound:  sender ──MX──> Cloudflare Email Routing ──forward──> personal Gmail
outbound: Gmail "Send mail as" ──SMTP 587──> Resend (eu-west-1) ──> recipient
```

| | |
|---|---|
| Address | `hello@josuedev.dpdns.org` (catch-all **off**: other local parts bounce) |
| Receiving | Cloudflare Email Routing → personal Gmail |
| Sending | Resend, region `eu-west-1`, SMTP `smtp.resend.com:587` (STARTTLS), user `resend` |
| SPF / DKIM / DMARC | Cloudflare SPF for the root, Resend DKIM `resend._domainkey`, Resend return path `send.`, DMARC `p=quarantine` |
| Credentials | Resend API key with **Sending access** for this domain only: password manager (later `.env` for #145), never in git |

## Why not a mail server at home

Checked 2026-11-11 from the PC:

- **No PTR (reverse DNS)** for the public IP, and it's a shared CGNAT address the ISP won't give a PTR
  for. Gmail rejects mail from IPs without one (`550-5.7.25`); Outlook spam-folders it.
- **No inbound ports** (CGNAT): Cloudflare Tunnel only carries HTTP(S), so inbound MX on port 25 is
  impossible, and so is a home SMTP server Gmail could reach.
- Outbound port 25 is open and the IP isn't listed today, but a shared dynamic IP can be listed by
  someone else at any time.

A real mail server would need a VPS with a fixed IP and PTR in front of the homelab. A homelab SMTP
container that apps send through, delivering via Resend, is #145.

### Why Resend (2026-11-23)

| Option | Free | Why not |
|---|---|---|
| **Resend** | 3,000/month, 100/day, 1 domain | chosen: free, SMTP + API, simple domain setup |
| Amazon SES | none for new accounts since 2026-07-21 (~$0.10 / 1,000) | paid, sandbox until production access is granted |
| Cloudflare Email Sending | needs Workers Paid ($5/month) | paid, still beta (SMTP only on 465) |
| Brevo | 300/day | fine too; free plan adds branding to campaigns |

100/day is plenty for personal mail and homelab alerts. Switching provider later only means new DNS
records (DKIM + return path) and new SMTP settings.

## Setup

### 1. Receiving: Cloudflare Email Routing

Cloudflare dashboard → `josuedev.dpdns.org` → **Email → Email Routing**:

1. **Get started / Enable**. Let it **add the records** it proposes: 3 `MX` (`route1/2/3.mx.cloudflare.net`),
   the root SPF `TXT v=spf1 include:_spf.mx.cloudflare.net ~all`, and its DKIM `cf2024-1._domainkey`.
   The zone is fully delegated to Cloudflare, so DigitalPlat doesn't need to allow anything (MX is just a
   record in our zone).
2. **Destination addresses → Add**: the personal Gmail, then click the link in the verification mail.
3. **Routing rules → Custom address**: `hello` → *Send to* that Gmail. **Catch-all: Disabled** (or "Drop").

### 2. Sending: Resend

[resend.com](https://resend.com) → **Domains → Add domain** `josuedev.dpdns.org`, region **Ireland
(eu-west-1)**. Add the records it shows in **Cloudflare → DNS → Records**, all **DNS only** (grey
cloud), or use Resend's *Auto configure* with Cloudflare:

| Type | Name | Content |
|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0…` (DKIM public key, from Resend) |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` (priority 10) |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |

`send.` is the return path (envelope MAIL FROM), so it doesn't touch the root SPF that Email Routing
owns. Click **Verify DNS records** and wait for **Verified** (minutes).

**API Keys → Create**: permission **Sending access**, domain `josuedev.dpdns.org`. That key is the
SMTP password. It can't read or change the account (the API answers `restricted_api_key`).

### 3. DMARC

| Type | Name | Content |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; adkim=r; aspf=r` |

Resend signs with `d=josuedev.dpdns.org` and the return path is `send.josuedev.dpdns.org`, so both
DKIM and SPF align (relaxed). Optional: Cloudflare → **Email → DMARC Management** adds a `rua=`
address for a free report dashboard. Once reports show only passing mail for a few weeks, consider
`p=reject`.

### 4. Gmail: "Send mail as"

Gmail → **Settings → Accounts and Import → Send mail as → Add another email address**:

- Name `Josue Lopez`, address `hello@josuedev.dpdns.org`, *Treat as an alias*: on.
- SMTP server `smtp.resend.com`, port **587**, username `resend`, password = the Resend API key,
  **TLS**.
- Gmail sends a confirmation code to `hello@`, which Cloudflare forwards to the same inbox: paste it.
- Optional: *When replying to a message: reply from the same address it was sent to*.

## Check it

```bash
d=josuedev.dpdns.org
dig +short MX  $d                       # route1/2/3.mx.cloudflare.net
dig +short TXT $d                       # v=spf1 include:_spf.mx.cloudflare.net ~all
dig +short TXT _dmarc.$d                # v=DMARC1; p=quarantine; ...
dig +short MX  send.$d                  # 10 feedback-smtp.eu-west-1.amazonses.com.
dig +short TXT send.$d                  # v=spf1 include:amazonses.com ~all
dig +short TXT resend._domainkey.$d     # p=MIGfMA0...
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
- Cloudflare Email Routing forwards; it can't send. Replies go out through Resend via Gmail.
- Resend free plan: 100 mails/day, 3,000/month, one domain. Keep bounces and complaints low (no
  lists, no marketing) or the account gets paused.
- If the API key leaks: Resend → **API Keys** → delete it, create a new *Sending access* key, update
  Gmail's SMTP password (and `.env` once #145 uses it).
