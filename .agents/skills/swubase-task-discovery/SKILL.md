---
name: swubase-task-discovery
description: Clarify an underspecified SWUBASE feature, fix, operational change, or decision before planning or implementation, without asking for facts the repository can answer.
---

# SWUBASE task discovery

Use this skill when the user has an outcome in mind but a missing decision could
materially change scope, behaviour, data handling, or acceptance criteria. Do
not use it to slow down a small, well-specified request.

## Discover before asking

1. Restate the requested outcome in one sentence and inspect the repository,
   existing docs, current behaviour, and nearby patterns for facts the agent can
   determine itself.
2. Separate facts from decisions. Never ask the user where a route, table, or
   existing convention lives if the repository can answer it.
3. Proceed with a safe, reversible default when it preserves the user's intent.
   Ask only about decisions that would otherwise make the result meaningfully
   different or hard to reverse.

## Ask in useful rounds

- Ask at most three independent, high-leverage questions in one round. Give a
  concise recommendation and the consequence of each answer.
- Do not ask downstream questions until the decisions they depend on are
  settled. Preserve answers already given; never re-ask them.
- If the user says to use your judgement, record the assumption in the plan or
  final handoff and continue.
- Before implementation, confirm a compact definition of ready: intended user
  behaviour, explicit out-of-scope work, meaningful acceptance checks, and any
  privacy/external-side-effect constraints.

## Handoffs

Once the task is ready, select the domain skills from
`.agents/skills/SELECTION-MATRIX.md` and implement or plan normally. Load
`swubase-github-issues` only when the user wants a draft or a published issue;
task discovery must not create GitHub issues, ADRs, or repository documents on
its own.
