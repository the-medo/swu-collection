---
name: swubase-product-discovery
description: Generate and evaluate evidence-backed SWUBASE product, contributor, and operational improvement ideas from user problems and the existing application.
---

# SWUBASE product discovery

Use this skill when the user asks for future features, improvements, a roadmap,
or ideas to make SWUBASE better. It is a discovery activity, not authorization
to implement or publish work.

## Start with real context

1. Identify the affected people: players/collectors, deck builders, tournament
   organisers, Karabast users, administrators, or contributors.
2. Inspect the current feature, nearby workflows, existing data, and known
   constraints before proposing changes. Treat repository facts as evidence;
   use current external research only when the question needs it.
3. Look for a concrete user problem, not merely a missing screen. Consider
   data quality, privacy, moderation, operational burden, and effects on the
   contributor-development environment.

## Produce decisions someone can use

For each candidate, give a short title, user problem, target user, expected
outcome, supporting evidence, rough scope, key risk/dependency, and confidence.
Rank candidates by expected value and confidence rather than presenting a flat
brainstorm. Separate quick experiments from larger bets, and name what should
be learned before committing to a large bet.

Do not invent demand, metrics, or competitor behaviour. Do not create GitHub
issues automatically. When the user chooses ideas to track, load
`swubase-github-issues` to turn only those decisions into issue-ready work.
