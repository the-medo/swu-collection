---
name: swubase-architecture
description: Explain, assess, or challenge SWUBASE architecture using evidence from the running code, data flow, and repository conventions before proposing a structural change.
---

# SWUBASE architecture

Use this skill for architecture questions, design alternatives, or a focused
architecture-health review. It is not required for an ordinary local feature
change that follows an existing shape.

## Build an evidence-backed model

1. Read the selection matrix, then load the domain skills that cover the
   subsystem in question. Trace the actual path from entry point through state,
   persistence, integrations, and consumers as applicable.
2. Distinguish verified facts from inference. Cite concrete repository paths in
   findings, and say when runtime or production evidence would still be needed.
3. Respect deliberate existing decisions unless evidence shows real current
   friction. Do not recommend abstraction just because several files look
   similar.

## Present decisions, not a vague audit

For each meaningful concern or option, state:

- the current shape and the specific cost or risk;
- the smallest viable option and any credible alternative;
- effects on ownership, tests, data/API compatibility, privacy, operations, and
  future changes;
- a recommendation with confidence and what evidence could change it.

Use a compact table or a diagram only when it makes a multi-part relationship
clearer than prose. Do not make code changes, create issues, or write an ADR
unless the user asks. If a chosen decision is hard to reverse, surprising, and
the result of a real trade-off, offer to capture it through
`swubase-documentation`.
