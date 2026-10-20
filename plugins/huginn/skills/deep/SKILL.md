---
name: deep
description: Use right before a hard decision, to think it through at xhigh effort for the rest of this turn. Triggers - choosing an architecture or approach; root-causing a bug, above all after a fix that failed; changes touching invariants, concurrency, money, auth/security or data migrations; ambiguous requirements; planning a ticket. Changes effort only, so the model and the prompt cache stay.
effort: xhigh
---

# Huginn: deep (effort xhigh)

Effort is xhigh until this turn ends. The model and the prompt cache are unchanged, and nothing
is saved to settings: the session's own effort comes back on the next prompt.

While it holds:

- Say the decision, or the failure, in one line before you act.
- Read the code that decides it rather than guessing. For a bug, reproduce or trace it to the
  root cause before changing anything; a fix that already failed means an assumption was wrong.
- Weigh two or three options against what must not break (data, money, auth, concurrency,
  migrations, public contracts) and pick one, with the reason.
- Name the main risk and how you will verify the result.

Then carry on with the task in this same turn; don't stop to report that this skill loaded. If a
self-contained part of the analysis would flood the context, hand it to the `huginn:deep`
subagent with a full brief instead.
