# CLAUDE.md – working agreement for Claude Code

## Project
Self-hosted Docker homelab. Dev on MacBook (arm64), prod on CachyOS PC (amd64).
Public access via Cloudflare Tunnel -> Traefik v3 (routes from Docker labels).
Full plan: see ROADMAP.md. Source of truth for code and work: the Forgejo repo
`josue/homelab` at https://git.josuedev.dpdns.org (issues, PRs). GitHub is a read-only push
mirror: never open issues or PRs there. Use the `gt` CLI (Gitea/Forgejo), not `gh`.

## How to work
1. Start every session with: `gt issue view <number> --no-input` and read its acceptance criteria.
2. Work on ONE issue at a time, on branch `feat/<number>-short-name`, **always in its own git
   worktree**. Never `git switch`/`checkout` in the main checkout: the user or another session
   may be working there.
   ```bash
   git fetch origin
   git worktree add -b feat/<number>-short-name .worktrees/feat-<number>-short-name origin/main
   cd .worktrees/feat-<number>-short-name
   ```
   A worktree has no `.env` or `data/` (git-ignored). Validate with
   `docker compose --env-file ../../.env config`, and **never** run `docker compose up` from a
   worktree (it would start a second stack under another project name): deploy from the main
   checkout after the merge.
3. Keep changes minimal and scoped to the issue. If you find extra work, propose a new issue
   (`gt issue create`) instead of doing it.
4. Verify acceptance criteria yourself (`docker compose config`, `curl`, healthchecks) and
   report the evidence before saying it is done.
5. Open a PR on Forgejo (`gt pr create`) with `Closes #<number>` in the body. Commits must be
   GPG-signed (`main` requires signed commits).
6. **After the PR is merged, clean up locally** (from the main checkout):
   ```bash
   git fetch --prune origin
   git worktree remove .worktrees/feat-<number>-short-name
   git branch -d feat/<number>-short-name     # -D only if it was squash-merged
   ```
   Confirm the merge first (`gt pr view <number> -R josue/homelab --no-input --json state` → `merged`).
   Never delete a branch or worktree whose PR is still open or that you didn't create.

## Rules
- Never commit secrets. Use `.env` (git-ignored) and keep `.env.example` updated.
- Never publish database ports. Databases live only on the `internal` network.
- Expose services ONLY through Traefik labels (`traefik.enable=true` + router + service port).
- Traefik talks to Docker through docker-socket-proxy, never the raw socket.
- Images must build for both linux/amd64 and linux/arm64.
- Pin image versions (no `:latest` in production compose, except our own GHCR images).
- Update docs (README or docs/) in the same PR when behavior changes.

## Useful commands
- `docker compose up -d` / `docker compose logs -f <service>`
- `docker compose config` (validate)
- `gt issue list --label epic:E1 --no-input`
- `gt pr checks <number> --no-input`
