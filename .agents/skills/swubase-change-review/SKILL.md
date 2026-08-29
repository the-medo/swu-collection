---
name: swubase-change-review
description: Independently review SWUBASE source, test, schema, configuration, or tooling changes before handoff or commit, including a read-only Claude Code review when available.
---

# SWUBASE change review

Use this skill for every tracked source, test, schema, configuration, or tooling
change made in the current task. It is not required for a documentation-only
edit or a review-only task with no new changes. It complements, rather than
replaces, the matching domain skill and `swubase-validation`.

## Establish review scope

Before the first edit, remember the current `HEAD` as the task review base and
inspect the pre-existing working tree. Preserve unrelated user changes. Review
only the task's committed range plus its staged and unstaged changes; if that
cannot be separated safely, say so rather than treating another person's diff
as this task's work.

Run focused validation first. Then independently inspect the complete diff for
correctness, regressions, compatibility, security/privacy, error handling,
scope creep, and missing test evidence against the user's request.

## Claude Code review

The preferred second reviewer is the local Claude Code CLI. From the repository
root, run a non-interactive, read-only review such as:

```bash
printf '%s\n' "Act as an independent, read-only reviewer. Do not edit files or run state-changing commands. Review all task changes since <task-review-base>, including staged and unstaged changes. Use git diff and the relevant repository instructions. Report only actionable findings, ordered by severity, with file paths, reasoning, and a concrete recommendation. If there are no findings, say so explicitly." \
  | claude -p --permission-mode plan --no-session-persistence \
    --allowedTools 'Read,Glob,Grep,Bash(git diff *),Bash(git status *),Bash(git log *),Bash(git show *),Bash(git merge-base *)'
```

Replace `<task-review-base>` with the commit recorded before edits. Do not use
permission-bypass flags. The explicit tool allowlist permits only repository
reads and read-only Git inspection. The reviewer must be independent: do not
pre-explain why the implementation is correct or ask it to rubber-stamp a
solution.

Assess each finding yourself. Fix in-scope, substantiated issues, rerun the
relevant checks, and request one focused follow-up review if the fixes changed
behaviour materially. If `claude` is unavailable, unauthenticated, or fails,
still perform the local review but report plainly that the Claude review did not
run; never claim an independent review that did not occur.

Summarise the validation and review result in the handoff, including any
remaining risk or consciously deferred finding.
