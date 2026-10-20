# tauan-mods

My Claude Code mods in one marketplace. `/mods` opens one pane with a tab per mod: no per-mod slash commands to remember.

| Mod | Source | What it does |
| --- | --- | --- |
| mods | [tauantcamargo/claude-mods-hub](https://github.com/tauantcamargo/claude-mods-hub) (fork of mvacoimbra's, plus a Muninn tab) | The `/mods` pane |
| muninn | [`plugins/muninn`](plugins/muninn) | **Muninn**, Odin's raven of memory: your [ai-memory](https://github.com/akitaonrails/ai-memory) in a `/muninn` pane and a `/mods` tab (the project's memory, the last handoff, search, recent pages), a count in the status line and a toast when a handoff arrives. Also for the Codex app, below |
| cache-tax | mvacoimbra fork | Keeps the prompt cache warm (costs tokens) |
| skins | mvacoimbra fork | Themes and richer tool rows |
| filetree | mvacoimbra fork | File tree of what Claude touches |
| savvy-progress | mvacoimbra fork | Subagent progress and agents panel |
| replay-theater | mvacoimbra fork | Replay the last turn's edits |
| blast-radius | mvacoimbra/claude-code-playground | Holds risky shell commands for confirmation |
| reflect-mod | mvacoimbra/claude-reflect | Saves your corrections to CLAUDE.md |

## Install

```
claude plugin marketplace add tauantcamargo/claude-mods
claude plugin install mods@tauan-mods
claude plugin install muninn@tauan-mods
claude plugin install cache-tax@tauan-mods
claude plugin install skins@tauan-mods
claude plugin install filetree@tauan-mods
claude plugin install savvy-progress@tauan-mods
claude plugin install replay-theater@tauan-mods
claude plugin install blast-radius@tauan-mods
claude plugin install reflect-mod@tauan-mods
```

Restart Claude Code, then open `/mods`. Uninstall the same mods from their original marketplaces first so nothing loads twice.

## Codex

The same marketplace serves Codex (`.agents/plugins/marketplace.json`). Muninn there is an
MCP App ([`codex/muninn`](codex/muninn)): the Codex app draws its panel, and the `$muninn`
skill points Codex at it.

```
codex plugin marketplace add tauantcamargo/claude-mods
codex plugin add muninn@tauan-mods
```
