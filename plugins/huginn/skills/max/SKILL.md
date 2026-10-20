---
name: max
description: Use when stuck after two failed attempts at the same problem, or when the user flags the step as critical, to work it at max effort for the rest of this turn. Changes effort only, so the model and the prompt cache stay.
effort: max
---

# Huginn: max (effort max)

Effort is max until this turn ends. The model and the prompt cache are unchanged, and nothing
is saved to settings: the session's own effort comes back on the next prompt.

While it holds:

- List what was tried and why each attempt failed, then question the assumptions they shared.
- Gather fresh evidence before the next attempt: the real code path, logs, a minimal repro.
- Prefer an approach of a different kind over a variation of the last one.
- Verify against the original failure, or the user's stated bar, before calling it done.

Then carry on with the task in this same turn; don't stop to report that this skill loaded. If the
problem is self-contained and this context is long, hand it to the `huginn:max` subagent with a
full brief (goal, attempts and why they failed, the files) instead.
