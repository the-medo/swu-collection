---
name: swubase-github-issues
description: Turn selected SWUBASE bugs, feature ideas, decisions, or implementation plans into clear GitHub issue drafts or explicitly authorized published issues.
---

# SWUBASE GitHub issues

Use this skill when the user asks to create, draft, split, triage, or publish
GitHub issues. A mention that something "could" become an issue is a request for
an option or draft, not permission to create a remote issue.

## Prepare a durable issue

1. Read the relevant conversation, inspect the current repository state, and
   load the matching domain skill. Do not file a request that is already
   implemented, intentionally rejected, or too vague to act on.
2. State the user-visible problem and intended outcome before technical details.
   Include scope, explicit out-of-scope boundaries, acceptance criteria,
   dependencies/blockers, known risks, and open questions. For a bug, include a
   redacted reproduction and observed versus expected behaviour.
3. Split work only into independently verifiable vertical slices. Keep a single
   issue when splitting would create artificial layer-by-layer tickets.

## Draft first; publish deliberately

Present issue drafts to the user unless they explicitly asked to create or
publish them. Before a remote write, verify the target repository and current
GitHub CLI authentication, show the title(s) and number of issues to be created,
then use `gh issue create`. Read existing labels first; never invent a label or
apply a triage state without user direction.

Do not close, edit, or label existing issues unless the user explicitly requests
that exact operation. Never include secrets, personal data, raw backup paths, or
private logs in an issue. Report the created issue URLs or explain why only
drafts were produced.
