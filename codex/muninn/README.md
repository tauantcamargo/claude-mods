# Muninn for Codex

Muninn, Odin's raven of memory, is your [ai-memory](https://github.com/akitaonrails/ai-memory)
in Codex: an MCP App (`app.html`, served by `server.mjs`) that shows the current folder's
project (its pages, sessions and observations, the last handoff, recent pages), a search, and
any page as markdown. The `$muninn` skill points Codex at it. It only reads the server.

The Claude Code side of Muninn (a `/muninn` pane and a tab in `/mods`) is
[`plugins/muninn`](../../plugins/muninn).

## Install

```sh
codex plugin marketplace add tauantcamargo/claude-mods
codex plugin add muninn@tauan-mods
```

Needs ai-memory 3.0 or later running locally (`ai-memory setup`) and Node 18 or later
(the Codex app brings its own).
