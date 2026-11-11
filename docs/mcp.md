# MCP servers for Claude Code

`.mcp.json` at the repo root registers two project-scoped MCP servers. Claude Code asks
to approve them the first time it opens the project.

| Server | What it does | Transport |
|---|---|---|
| `github` | Issues, PRs, branches, code search via GitHub's hosted MCP | HTTP, `https://api.githubcopilot.com/mcp/` |
| `firefox` | Drives Zen (Firefox-based) via WebDriver BiDi: navigate, click, snapshot, screenshot, console, network | stdio, `npx @mozilla/firefox-devtools-mcp@0.10.7` |

## GitHub setup

The GitHub server reads the token from the environment, never from the file:

```sh
# fish
set -Ux GITHUB_PAT <fine-grained token with repo + issues + PR access>
# bash/zsh
export GITHUB_PAT=...
```

## Browser: Zen via Firefox DevTools MCP

Playwright can't drive Zen (it needs its own Juggler-patched Firefox), so we use Mozilla's
[firefox-devtools-mcp](https://github.com/mozilla/firefox-devtools-mcp), which works with any
Firefox 100+ binary over Marionette + WebDriver BiDi.

It **attaches to a Zen you already have running** (`--connect-existing`) over Marionette on
port 2828, instead of launching its own browser. Start Zen with remote control enabled first:

```sh
zen-browser --marionette --remote-debugging-port
```

> The agent sees everything that Zen session can reach: open tabs, cookies, logged-in
> sites. Keep sensitive sessions in another browser, or use the dedicated profile below.

### Try it

1. Start Zen as above, then restart Claude Code in this repo and approve the `firefox` server.
2. Run `/mcp`: `firefox` should show as connected.
3. Ask: "how many tabs are open?". The agent lists the tabs of your running Zen.

### Using a dedicated profile instead (optional)

To keep the agent away from your everyday logins, have the MCP launch its own Zen with a
separate profile. In `.mcp.json` args, replace `"--connect-existing", "--marionette-port", "2828"` with:

```json
"--firefox-path", "/opt/zen-browser-bin/zen-bin",
"--profile-path", "${HOME}/.local/share/zen-mcp"
```

`/opt/zen-browser-bin/zen-bin` is the `zen-browser-bin` AUR package. On macOS use
`/Applications/Zen.app/Contents/MacOS/zen`. Add `"--headless"` to run without a window.

## Notes

- Package versions are pinned; bump them deliberately.

## Agent skills

Skills for Claude Code are vendored in `.agents/skills/<name>/` and linked into
`.claude/skills/<name>`, so every clone has them. They are managed with the
[`skills`](https://www.npmjs.com/package/skills) CLI, which records each source and a content hash
in `skills-lock.json`:

| Skill | Source | Used for |
|---|---|---|
| `claude-for-safari` | `SDLLL/claude-for-safari` (GitHub) | Driving Safari on the Mac |
| `gt` | `https://gitea.com/gitea/cli.git` | Issues, PRs and Actions on Forgejo through the `gt` CLI (#137) |

Install or update one (re-running `add` replaces it), then commit the result through a PR:

```bash
npx skills add https://gitea.com/gitea/cli.git --skill gt
```

Read the diff of `.agents/skills/` before committing: skills are instructions the agent follows.
