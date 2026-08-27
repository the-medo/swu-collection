---
name: swubase-debugging
description: Diagnose SWUBASE bugs, regressions, slow paths, and unexpected runtime behaviour through a reproducible feedback loop before making a fix.
---

# SWUBASE debugging

Use this skill when behaviour is broken, failing, incorrect, flaky, or slow.
Load the affected domain skill and `swubase-validation` as companions.

## Diagnose before changing code

1. Preserve and redact evidence. Never paste secrets, tokens, cookies, private
   user data, raw production backups, or unredacted request headers into logs,
   comments, or issues.
2. Establish the narrowest agent-runnable signal that can fail on the reported
   symptom: a focused test, API request, CLI fixture, browser flow, trace replay,
   or minimal harness. Confirm it exercises the user's actual symptom rather
   than only proving that a command exits successfully.
3. Minimise the reproduction, then inspect the relevant path and form multiple
   falsifiable, ranked hypotheses. Add only targeted instrumentation that
   distinguishes those hypotheses; tag temporary diagnostics so they can be
   removed reliably.

## Respect the requested scope

If the user asked to diagnose, report the proven cause, reproduction, affected
scope, and safe fix options; do not implement a fix without their request. If
they asked to fix it, first turn the minimised reproduction into a regression
check at the highest useful seam, then make the smallest fix and rerun the
original reproduction.

Before completion, remove temporary diagnostics and harnesses unless the user
asked to retain them. State any gap where no trustworthy reproduction could be
built rather than presenting a theory as a diagnosis. Use
`swubase-github-issues` only when the user wants the finding tracked.
