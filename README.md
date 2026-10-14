# tauan-mods

My Claude Code mods in one marketplace. `/mods` opens one pane with a tab per mod: no per-mod slash commands to remember.

| Mod | Source | What it does |
| --- | --- | --- |
| mods | [tauantcamargo/claude-mods-hub](https://github.com/tauantcamargo/claude-mods-hub) (fork of mvacoimbra's, plus a Workers tab) | The `/mods` pane |
| workers | [`plugins/workers`](plugins/workers) | **Salão dos Deuses**: every subagent becomes a Norse or Roman god, in a carved-stone pane (`/workers`) with runes, laurel, Roman-numeral progress, an oracle check and a war band above the prompt |
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
claude plugin install workers@tauan-mods
claude plugin install cache-tax@tauan-mods
claude plugin install skins@tauan-mods
claude plugin install filetree@tauan-mods
claude plugin install savvy-progress@tauan-mods
claude plugin install replay-theater@tauan-mods
claude plugin install blast-radius@tauan-mods
claude plugin install reflect-mod@tauan-mods
```

Restart Claude Code, then open `/mods`. Uninstall the same mods from their original marketplaces first so nothing loads twice.
