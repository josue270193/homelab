# Home network: CGNAT check

Checked 2026-10-19 from the Mac on the home LAN. Full public addresses are intentionally
redacted (this repo is public).

## Result

**IPv4 is behind CGNAT.** Inbound connections from the internet cannot reach the house over IPv4,
so router port forwarding is not an option. This is why public access goes through an
**outbound** Cloudflare Tunnel (E2) and no router ports are opened.

## Evidence

| What | Value | Meaning |
|---|---|---|
| LAN gateway (router) | `192.168.1.1` | Normal home router. |
| Hop 2 (first ISP device after the router) | `100.101.x.x` | In `100.64.0.0/10`, the range reserved for carrier-grade NAT ([RFC 6598](https://datatracker.ietf.org/doc/html/rfc6598)). The router's WAN side sits on this private ISP network. |
| Next hops | `10.x.x.x` | More ISP-private addressing before reaching the internet. |
| Public IPv4 seen by the internet | `190.x.x.x` | The ISP's NAT address (likely shared with other customers), not the router's WAN IP. |
| Public IPv6 | global `2803:…` address | IPv6 is not NATed, but not used for this setup (tunnel is outbound). |

Commands used:

```bash
route -n get default                 # LAN gateway
traceroute -n -m 6 -q 1 1.1.1.1      # hop 2 in 100.64.0.0/10 => CGNAT
curl -4 -s https://api.ipify.org     # public IPv4 as seen from outside
```

## Not yet confirmed

The router did not answer a UPnP `GetExternalIPAddress` query, so its WAN IP was not read
directly. To confirm, open the router admin page (`http://192.168.1.1`) → WAN / Internet status:
a WAN IP in `100.64.0.0`–`100.127.255.255` confirms CGNAT; a WAN IP equal to the public IPv4
would mean no CGNAT. Either way the plan does not change: Cloudflare Tunnel works in both cases.

## Re-check

Repeat the commands above if the ISP, router or plan changes. If CGNAT is ever removed, the
tunnel still stays: it avoids exposing the home IP and needs no open ports.
