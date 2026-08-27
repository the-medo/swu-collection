---
name: swubase-documentation
description: Create, update, or audit durable SWUBASE documentation from verified repository behaviour, architecture decisions, workflows, and contributor operations.
---

# SWUBASE documentation

Use this skill when the user asks to document the project, a workflow, an
architecture decision, or a feature; also use it when a code change makes an
existing document materially stale.

## Write only what can be maintained

1. Define the audience and the question the document must answer: contributor
   setup, operator runbook, feature behaviour, API/integration contract, or
   architecture rationale.
2. Verify each behavioural claim against current code, configuration, or an
   authoritative external source. Mark unknowns and deliberate limitations
   instead of filling gaps with plausible prose.
3. Extend the nearest existing documentation structure and vocabulary. Do not
   duplicate a source of truth or create a new documentation hierarchy merely
   because one would be aesthetically cleaner.

## Select the right durable form

- Explain how a subsystem works today in a focused document under `docs/`.
- Keep operational instructions executable, safe for development versus
  production, and clear about credentials or irreversible actions.
- Record an ADR only when a decision is hard to reverse, surprising without
  context, and selected from genuine alternatives. Include the context,
  decision, consequences, and rejected alternatives—not an implementation log.
- Update a glossary only when a term has an agreed, stable meaning that agents
  and contributors need to use consistently.

Check commands, paths, links, and terminology before handoff. Documentation
does not authorize code changes, GitHub issue creation, or operational actions;
use the matching workflow skill when those are requested.
