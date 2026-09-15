import { AlertTriangle } from 'lucide-react';
import Dialog from '@/components/app/global/Dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { CardList } from '../../../../../lib/swu-resources/types.ts';
import type { CrossfireDeckIssue } from '../../../../../shared/types/crossfire.ts';
import { deckCardName, issueLabel, words } from './presentation.ts';
import { groupDeckIssues } from './deckIssues.ts';

export function DeckCheckDialog({
  issues,
  catalog,
}: {
  issues: CrossfireDeckIssue[];
  catalog?: CardList;
}) {
  const grouped = groupDeckIssues(issues);
  return (
    <Dialog
      header="Deck check"
      size="medium"
      trigger={
        <Button type="button" className="cf-deck-attention">
          <AlertTriangle size={17} />
          <span>Deck needs attention</span>
        </Button>
      }
    >
      <div className="space-y-5 py-3">
        <div className="rounded-lg border border-orange-400/40 bg-orange-500/10 p-4">
          <p className="font-semibold">Before you can play</p>
          <p className="mt-1 text-sm text-muted-foreground" data-deck-check-summary>
            {grouped.cardCount}{' '}
            {grouped.cardCount === 1 ? 'distinct card needs' : 'distinct cards need'} attention
            {grouped.deckIssueCount > 0 &&
              ` · ${grouped.deckIssueCount} deck ${grouped.deckIssueCount === 1 ? 'issue' : 'issues'}`}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            This checks Crossfire practice support and deck structure.
          </p>
        </div>
        {grouped.groups.map(group => (
          <section
            key={group.code}
            className="overflow-hidden rounded-lg border"
            data-deck-issue={group.code}
          >
            <div className="flex items-start justify-between gap-3 bg-muted/50 px-4 py-3">
              <h3 className="!text-sm font-semibold">{issueLabel({ code: group.code })}</h3>
              {group.cardCount > 0 && (
                <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs">
                  {group.cardCount} {group.cardCount === 1 ? 'card' : 'cards'}
                </span>
              )}
            </div>
            {(group.cardCount > 0 || group.issues.some(issue => issue.zone)) && (
              <ul className="divide-y px-4">
                {group.issues.map(issue => (
                  <li
                    key={`${issue.cardId}:${issue.zone}`}
                    className="flex items-start justify-between gap-3 py-3 text-sm"
                  >
                    <span className="min-w-0 break-words">
                      {issue.cardId ? deckCardName(catalog, issue.cardId) : words(issue.zone ?? '')}
                    </span>
                    {issue.cardId && issue.zone && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {words(issue.zone)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </Dialog>
  );
}
