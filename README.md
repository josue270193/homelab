# homelab

Self-hosted Docker stack. Developed on a MacBook (arm64), runs 24/7 on a CachyOS PC (amd64),
published to the internet through Cloudflare Tunnel → Traefik v3 (no open router ports).

```
Internet ──> Cloudflare (DNS, TLS, Access)
               │  outbound tunnel
               ▼
         cloudflared ──> Traefik (routes from Docker labels) ──> services
         internal network only: postgres, docker-socket-proxy
```

## Docs

- [ROADMAP.md](ROADMAP.md) – epics, issues and acceptance criteria.
- [CLAUDE.md](CLAUDE.md) – working agreement for Claude Code (branching, rules).
- Work is tracked in GitHub Issues: `gh issue list`.
- Board: [Homelab project](https://github.com/users/josue270193/projects/2) with Status columns
  **Backlog → Ready → In progress → Done**. New issues from `./create-issues.sh` land there when run
  with `PROJECT="Homelab"` (needs `gh auth refresh -s project`).

## Getting started

Prerequisites on the Mac: [GitHub CLI](https://cli.github.com/) authenticated with the `project`
scope (needed for the board and `create-issues.sh`):

```bash
brew install gh
gh auth login            # GitHub.com, SSH
gh auth refresh -s project
gh issue list            # should list the repo's issues
```

Then:

```bash
git clone git@github.com:josue270193/homelab.git
cd homelab
cp .env.example .env   # fill in real values; .env is git-ignored
```

The Compose stack itself is added in epic E1 (see ROADMAP.md).

## Repository rules

- Secrets only in `.env` (git-ignored). Keep `.env.example` in sync when adding variables.
- Service data (bind mounts under `data/`, `volumes/`, `backups/`) is git-ignored.
- Databases are never published; they live only on the `internal` network.
- Services are exposed only through Traefik labels.
