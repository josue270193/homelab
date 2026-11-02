# Domain

| | |
|---|---|
| Domain | `josuedev.dpdns.org` |
| Registered at | [DigitalPlat](https://domain.digitalplat.org/) (free, `dpdns.org` is on the Public Suffix List) |
| DNS | Cloudflare (Free plan), zone **Active** since 2026-11-02 |
| Nameservers | `amalia.ns.cloudflare.com`, `byron.ns.cloudflare.com` (set at DigitalPlat as external nameservers) |
| Registered / expires | 2026-11-02 / **2027-11-02** |

## Renewal (manual!)

DigitalPlat renews for free, but **only in the 120 days before expiry** (from about **2027-07-05**) and only
by hand in its dashboard. If it lapses, every public URL stops working. Set a reminder for early July 2027.

## Why this domain

- Free, and Cloudflare accepts it as its own zone because `dpdns.org` is on the
  [Public Suffix List](https://publicsuffix.org/list/public_suffix_list.dat) (checked 2026-11-01).
- Trade-offs: it's a subdomain of DigitalPlat's (they control the parent), a young volunteer-run service
  with no SLA. Use only the official site: their own page warns their Telegram group is compromised.
- Moving to another domain later only needs `DOMAIN=` in `.env` plus the tunnel routes and Access apps
  in Cloudflare; compose files use `${DOMAIN}` everywhere.

## Check it

```bash
dig +short NS josuedev.dpdns.org @1.1.1.1    # amalia/byron.ns.cloudflare.com
```

Cloudflare dashboard → the domain's Overview should say "Your domain is now protected by Cloudflare".

Gotcha seen during setup: Cloudflare assigns a nameserver pair per zone. Adding the wrong name first
(`homelabjosue.dpdns.org`) gave one pair; the real zone got a different one, and DigitalPlat had to be
updated to match. Cloudflare's nameservers answer `REFUSED` for a zone they don't serve.
