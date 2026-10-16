import { TournamentConnectionPicker } from './TournamentConnectionPicker.tsx';
import { ConnectionLink } from './ConnectionLink.tsx';
import { useId, useState } from 'react';
import { Check, Link2, Plus, Search, X } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useConnectionChoices, useResolvedSubjects } from '@/api/creators/useConnectionSubjects.ts';
import CardSearchCommand from '@/components/app/global/CardSearchCommand/CardSearchCommand.tsx';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import { DeckRow } from '@/components/app/crossfire/DeckRow.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import type {
  ConnectionSubject,
  EntityReference,
} from '../../../../../shared/creators/contracts.ts';
import { ConnectionContent } from './ConnectionContent.tsx';
import { connectionTypes } from './connectionTypes.ts';
import { creatorDescription, creatorPanel, creatorSubheading } from './creatorStyles.ts';

export function SubjectPicker({
  references,
  resolved,
  timestamps = false,
  onChange,
}: {
  references: EntityReference[];
  resolved: ReturnType<typeof useResolvedSubjects>;
  timestamps?: boolean;
  onChange: (refs: EntityReference[]) => void;
}) {
  const id = useId();
  const { data: catalog } = useCardList();
  const [type, setType] = useState<EntityReference['type']>('card');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const choices = useConnectionChoices(type, search, type !== 'tournament');
  const full = references.length >= 50;
  const selected = (subject: Pick<EntityReference, 'type' | 'id'>) =>
    references.some(ref => ref.type === subject.type && ref.id === subject.id);
  const add = (subject: Pick<EntityReference, 'type' | 'id'>) => {
    if (selected(subject)) {
      setNotice('This connection is already added.');
      return;
    }
    if (full) {
      setNotice('You can add up to 50 connections.');
      return;
    }
    onChange([...references, { type: subject.type, id: subject.id, startSeconds: null }]);
    setNotice('Connection added.');
  };
  const choose = (item: ConnectionSubject) => (
    <button
      type="button"
      key={item.id}
      disabled={selected(item) || full}
      aria-label={`${selected(item) ? 'Connected' : 'Connect'} ${item.type}: ${item.label}`}
      aria-describedby={`${id}-choice-${item.id}`}
      className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      onClick={() => add(item)}
    >
      <span id={`${id}-choice-${item.id}`} className="flex min-w-0 flex-1">
        <ConnectionContent subject={item} />
      </span>
      {selected(item) ? (
        <Check className="size-4 shrink-0 text-[var(--creator-accent)]" />
      ) : (
        <Plus className="size-4 shrink-0 text-muted-foreground" />
      )}
    </button>
  );
  return (
    <section aria-label="Connect to SWUBASE" className={`${creatorPanel} space-y-5`}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--creator-soft)] text-[var(--creator-accent)]">
          <Link2 className="size-5" />
        </span>
        <div>
          <h2 className={creatorSubheading}>Connect to SWUBASE</h2>
          <p className={`${creatorDescription} mt-1`}>
            Bring your content to life with cards, decks and events readers can explore.
          </p>
        </div>
      </div>
      <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-3 sm:p-4">
        <div
          role="group"
          aria-label="Connection type"
          className="grid grid-cols-3 gap-2 sm:grid-cols-6"
        >
          {connectionTypes.map(({ type: value, label, icon: Icon }) => (
            <button
              type="button"
              key={value}
              aria-pressed={type === value}
              onClick={() => {
                setType(value);
                setSearch('');
                setNotice('');
              }}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-transparent px-2 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-[var(--creator-border)] aria-pressed:bg-background aria-pressed:text-[var(--creator-accent)] aria-pressed:shadow-sm"
            >
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </button>
          ))}
        </div>
        {type === 'card' ? (
          <CardSearchCommand
            id={`connection-card-${id}`}
            label="Find a card to connect"
            disabled={full}
            onSelectCard={cardId => add({ type: 'card', id: cardId })}
          />
        ) : type === 'leader' ? (
          <LeaderSelector
            onLeaderSelected={leaderId => leaderId && add({ type: 'leader', id: leaderId })}
            trigger={
              <Button type="button" variant="outline" disabled={full} className="w-full gap-2">
                <Plus className="size-4" />
                Choose leader
              </Button>
            }
          />
        ) : type === 'base' ? (
          <BaseSelector
            onBaseSelected={baseId => baseId && add({ type: 'base', id: baseId })}
            trigger={
              <Button type="button" variant="outline" disabled={full} className="w-full gap-2">
                <Plus className="size-4" />
                Choose base
              </Button>
            }
          />
        ) : type === 'tournament' ? (
          <TournamentConnectionPicker renderChoice={choose} />
        ) : (
          <>
            <div className="space-y-2">
              <label htmlFor={`${id}-search`} className="text-xs font-medium">
                {type === 'deck' ? 'Your public decks' : 'Find a set'}
              </label>
              <Input
                id={`${id}-search`}
                icon={Search}
                type="search"
                maxLength={100}
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={type === 'deck' ? 'Search your decks…' : 'Search sets…'}
              />
              <p className="text-[11px] text-muted-foreground">
                {type === 'deck'
                  ? 'Only decks you own. Make a deck public so readers can open it.'
                  : 'Connect the sets featured in your content.'}
              </p>
            </div>
            <div
              role="group"
              className="max-h-80 space-y-2 overflow-y-auto overscroll-contain p-1"
              aria-label={`${type} choices`}
              aria-busy={choices.isPending || choices.typing}
            >
              {choices.isPending || choices.typing ? (
                <p role="status" className="p-4 text-sm text-muted-foreground">
                  Loading choices…
                </p>
              ) : (
                <>
                  {choices.data?.pages.flat().map(item =>
                    type === 'deck' ? (
                      <DeckRow
                        key={item.id}
                        appearance="connection"
                        deck={{
                          id: item.id,
                          name: item.label,
                          leaderId: item.leaderId ?? null,
                          baseId: item.baseId ?? null,
                          author: 'you',
                        }}
                        selected={selected(item)}
                        disabled={selected(item) || full}
                        catalog={catalog?.cards}
                        onSelect={() => add(item)}
                      />
                    ) : (
                      choose(item)
                    ),
                  )}
                  {!choices.isError && !choices.data?.pages.flat().length && (
                    <p role="status" className="p-4 text-sm text-muted-foreground">
                      {type === 'deck'
                        ? 'No public decks found in your account.'
                        : 'No matches found. Try another name.'}
                    </p>
                  )}
                </>
              )}
              {choices.isError && (
                <div role="alert" className="space-y-2 p-3 text-sm">
                  <p>Could not load choices.</p>
                  <Button type="button" variant="outline" onClick={() => void choices.refetch()}>
                    Try again
                  </Button>
                </div>
              )}
              {choices.hasNextPage && !choices.typing && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={choices.isFetchingNextPage}
                  onClick={() => void choices.fetchNextPage()}
                >
                  {choices.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Button>
              )}
            </div>
          </>
        )}
        <p role="status" className="text-xs text-muted-foreground">
          {full ? 'You have reached the limit of 50 connections.' : notice}
        </p>
      </div>
      <div className="@container/connections space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="m-0! text-[13px]! font-semibold! leading-normal!">
            Connected to this content
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {references.length}
          </span>
        </div>
        {!references.length && (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            Choose something above to add your first connection.
          </div>
        )}
        {resolved.isError && !!references.length && (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-xs">
            <span>Connection details could not be loaded.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void resolved.refetch()}
            >
              Retry details
            </Button>
          </div>
        )}
        <div className="grid min-w-0 gap-2 @min-[520px]/connections:grid-cols-2 @min-[800px]/connections:grid-cols-3">
          {references.map((ref, index) => {
            const subject = resolved.data?.find(
              item => item.type === ref.type && item.id === ref.id,
            );
            return (
              <div
                key={`${ref.type}:${ref.id}:${index}`}
                data-connection={`${ref.type}:${ref.id}`}
                className="min-w-0 rounded-xl border border-border bg-background p-2.5 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <ConnectionLink
                    subject={subject ?? ref}
                    available={
                      !!subject ||
                      (['card', 'leader', 'base'].includes(ref.type) && !!catalog?.cards[ref.id])
                    }
                  >
                    <ConnectionContent
                      subject={subject ?? ref}
                      pending={resolved.isPending || resolved.isFetching}
                    />
                  </ConnectionLink>
                  <Button
                    type="button"
                    variant="ghost"
                    size="iconSmall"
                    className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${subject?.label ?? ref.type} connection`}
                    onClick={() => {
                      onChange(references.filter((_, i) => i !== index));
                      setNotice('Connection removed.');
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                {timestamps && (
                  <label className="mt-3 flex items-center justify-between gap-3 border-t pt-3 text-[11px] text-muted-foreground">
                    Start time (seconds)
                    <Input
                      aria-label={`Timestamp in seconds for ${ref.id}`}
                      type="number"
                      className="h-8 w-24"
                      min={0}
                      max={604800}
                      placeholder="Optional"
                      value={ref.startSeconds ?? ''}
                      onChange={event =>
                        onChange(
                          references.map((r, i) =>
                            i === index
                              ? {
                                  ...r,
                                  startSeconds:
                                    event.target.value === '' ? null : Number(event.target.value),
                                }
                              : r,
                          ),
                        )
                      }
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
