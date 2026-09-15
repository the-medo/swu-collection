import type { CrossfireDeckIssue } from '../../../../../shared/types/crossfire.ts';

/** Counts distinct card identities, not copies or repeated reports across zones. */
export function groupDeckIssues(issues: CrossfireDeckIssue[]) {
  const groups = new Map<CrossfireDeckIssue['code'], Map<string, CrossfireDeckIssue>>();
  for (const issue of issues) {
    const entries = groups.get(issue.code) ?? new Map<string, CrossfireDeckIssue>();
    entries.set(`${issue.cardId ?? ''}:${issue.zone ?? ''}`, issue);
    groups.set(issue.code, entries);
  }
  return {
    cardCount: new Set(issues.flatMap(issue => (issue.cardId ? [issue.cardId] : []))).size,
    deckIssueCount: [...groups.values()].reduce(
      (count, entries) => count + [...entries.values()].filter(issue => !issue.cardId).length,
      0,
    ),
    groups: [...groups].map(([code, entries]) => ({
      code,
      issues: [...entries.values()],
      cardCount: new Set(
        [...entries.values()].flatMap(issue => (issue.cardId ? [issue.cardId] : [])),
      ).size,
    })),
  };
}
