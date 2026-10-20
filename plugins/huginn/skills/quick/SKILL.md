---
name: quick
description: Use for a mechanical step whose path is already clear, to do it at low effort for the rest of this turn. Triggers - renames, formatting, boilerplate, config edits, moving files, git/gh plumbing, running known commands, writing commit messages or PR text. Changes effort only, so the model and the prompt cache stay.
effort: low
---

# Huginn: quick (effort low)

Effort is low until this turn ends. The model and the prompt cache are unchanged, and nothing
is saved to settings: the session's own effort comes back on the next prompt.

While it holds:

- Do the step directly: no re-planning, no survey of alternatives.
- Keep checks in proportion: run the command, read the result, move on.
- If the step stops being mechanical (a surprise, a failure you can't explain, a real choice),
  invoke `huginn:deep` before going further.

Then carry on with the task in this same turn; don't stop to report that this skill loaded. Bulk
mechanical work across many files can go to the `huginn:light` subagent instead.
