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

It launches `/opt/zen-browser-bin/zen-bin` (the `zen-browser-bin` AUR package) with a
**dedicated profile** in `~/.local/share/zen-mcp`, separate from your everyday Zen profile.
Only what you sign in to in that profile is reachable by the agent. Change `--firefox-path`
in `.mcp.json` if Zen lives elsewhere (on macOS: `/Applications/Zen.app/Contents/MacOS/zen`).

### Try it

1. Restart Claude Code in this repo and approve the `firefox` server.
2. Run `/mcp`: `firefox` should show as connected.
3. Ask: "open https://example.com in the browser and tell me the title".
   A Zen window opens and the agent reports "Example Domain".

Add `"--headless"` to the args to run without a window.

### Using your real Zen session instead (optional)

To reuse the logins of a running Zen, start Zen with remote control enabled and attach:

```sh
zen-browser --marionette --remote-debugging-port
# then in .mcp.json args replace the --firefox-path/--profile-path pair with:
#   "--connect-existing", "--marionette-port", "2828"
```

The agent then sees everything that browser can reach (cookies, saved sessions), so prefer
the dedicated profile.

## Notes

- Package versions are pinned; bump them deliberately.
