import * as React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  X,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import Dialog from '@/components/app/global/Dialog.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import {
  useCloseDeckChangeRequest,
  useCommentDeckChangeRequest,
  useDeckBranchDiff,
  useMergeDeckChangeRequest,
  useTeamChangeRequests,
} from '@/api/teams';
import type {
  DeckCardChange,
  DeckChangeRequestListItem,
  DeckDiffResponse,
  DeckFieldChange,
  DeckReviewComment,
  ZDeckChangeRequestMergeRequest,
} from '../../../../../../types/ZDeckBranch.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { aspectLib } from '../../../../../../shared/lib/aspectLib.ts';
import type { SwuAspect } from '../../../../../../types/enums.ts';
import { DeckCompare, DeckMerge, DeckPullRequest } from '@/components/app/decks/deckWorkflowIcons.ts';

type TeamChangeRequestsTabProps = {
  teamId: string;
};

type DeckConflict = DeckDiffResponse['conflicts'][number];
const overallReviewCommentKey = '__overall__';
const identityFields = ['leaderCardId1', 'leaderCardId2', 'baseCardId'] as const;
const deckPreviewFields = ['name', 'description'] as const;

type IdentityField = (typeof identityFields)[number];
type IdentityEntry = {
  field: IdentityField;
  key: string;
  label: string;
  beforeId: string | null;
  afterId: string | null;
  cardId: string | null;
  change?: DeckFieldChange;
};

type IdentityCardPreview = {
  key: string;
  field: IdentityField;
  label: string;
  source: 'current' | 'proposal';
  cardId: string;
  pairedCardId: string | null;
  change?: DeckFieldChange;
};

type ReviewChange = {
  key: string;
  type: 'field' | 'card';
  title: string;
  subtitle: string;
  badge: string;
  beforeLabel: string;
  afterLabel: string;
  before: unknown;
  after: unknown;
  conflict?: DeckConflict;
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'empty';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const fieldLabel = (field: string) =>
  field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, value => value.toUpperCase())
    .replace('Id', 'ID');

const identityLabel = (field: IdentityField) => {
  if (field === 'leaderCardId1') return 'Leader';
  if (field === 'leaderCardId2') return 'Second leader';
  return 'Base';
};

const isDeckPreviewField = (field: string) => (deckPreviewFields as readonly string[]).includes(field);

const inlineFieldValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'empty';
  return String(value);
};

const cardValue = (value: DeckCardChange['before'] | DeckCardChange['after']) => {
  if (!value) return 'not present';
  return `Qty ${value.quantity}`;
};

const buildIdentityEntries = (diffData: DeckDiffResponse): IdentityEntry[] => {
  const fieldChanges = new Map(
    diffData.proposedDiff.fields
      .filter((field): field is DeckFieldChange & { field: IdentityField } =>
        (identityFields as readonly string[]).includes(field.field),
      )
      .map(field => [field.field, field]),
  );

  return identityFields
    .map(field => {
      const beforeId = diffData.snapshots.current.deck[field] ?? null;
      const afterId = diffData.snapshots.branch.deck[field] ?? null;
      const change = fieldChanges.get(field);
      if (!beforeId && !afterId) return null;
      return {
        field,
        key: `identity:${field}`,
        label: identityLabel(field),
        beforeId,
        afterId,
        cardId: afterId ?? beforeId,
        change,
      };
    })
    .filter((entry): entry is IdentityEntry => Boolean(entry));
};

const conflictKey = (conflict: DeckConflict) =>
  conflict.type === 'field' ? `field:${conflict.field}` : `card:${conflict.key}`;

const buildReviewChanges = (diffData: DeckDiffResponse): ReviewChange[] => {
  const conflicts = new Map(diffData.conflicts.map(conflict => [conflictKey(conflict), conflict]));
  const fieldChanges: ReviewChange[] = diffData.proposedDiff.fields.map((change: DeckFieldChange) => {
    const key = `field:${change.field}`;
    return {
      key,
      type: 'field',
      title: fieldLabel(change.field),
      subtitle: 'Deck detail',
      badge: 'field',
      beforeLabel: 'Before',
      afterLabel: 'After',
      before: change.before,
      after: change.after,
      conflict: conflicts.get(key),
    };
  });
  const cardChanges: ReviewChange[] = diffData.proposedDiff.cards.map((change: DeckCardChange) => {
    const key = `card:${change.key}`;
    return {
      key,
      type: 'card',
      title: change.cardId,
      subtitle: `Board ${change.board}`,
      badge: change.changeType,
      beforeLabel: 'Before',
      afterLabel: 'After',
      before: cardValue(change.before),
      after: cardValue(change.after),
      conflict: conflicts.get(key),
    };
  });

  return [...cardChanges, ...fieldChanges];
};

const reviewFeedbackComments = (comments: DeckReviewComment[]) =>
  comments.filter(comment => !comment.changeKey || comment.changeKey === overallReviewCommentKey || comment.body);

const ValuePanel: React.FC<{
  label: string;
  value: unknown;
  tone: 'before' | 'after' | 'neutral';
}> = ({ label, value, tone }) => {
  const toneClass =
    tone === 'before'
      ? 'border-destructive/30 bg-destructive/10'
      : tone === 'after'
        ? 'border-emerald-500/30 bg-emerald-500/10'
        : 'border-border bg-muted/30';

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">{label}</div>
      <pre className="min-h-8 whitespace-pre-wrap break-words font-sans text-sm leading-5">
        {formatValue(value)}
      </pre>
    </div>
  );
};

type SnapshotCard = DeckDiffResponse['snapshots']['current']['cards'][number];
type StackEntry = SnapshotCard & {
  key: string;
  ghost?: boolean;
  change?: DeckCardChange;
};

const snapshotCardKey = (card: Pick<SnapshotCard, 'cardId' | 'board'>) =>
  `${card.cardId}::${card.board}`;

const buildStackEntries = (
  snapshotCards: SnapshotCard[],
  cardChanges: DeckCardChange[],
): StackEntry[] => {
  const entryMap = new Map<string, StackEntry>();
  snapshotCards.forEach(card => {
    const key = snapshotCardKey(card);
    entryMap.set(key, { ...card, key });
  });

  cardChanges.forEach(change => {
    const existing = entryMap.get(change.key);
    if (existing) {
      entryMap.set(change.key, { ...existing, change });
      return;
    }
    if (change.changeType !== 'removed') return;

    entryMap.set(change.key, {
      cardId: change.cardId,
      board: change.board,
      quantity: 0,
      key: change.key,
      ghost: true,
      change,
    });
  });

  return [...entryMap.values()].sort((a, b) => a.cardId.localeCompare(b.cardId));
};

const boardLabel = (board: number) => {
  if (board === 2) return 'Sideboard';
  if (board === 3) return 'Maybeboard';
  return 'Main deck';
};

const typeSection = (type: string | undefined) => {
  const normalizedType = type?.toLowerCase() ?? '';
  if (normalizedType.includes('unit')) return { key: 'unit', label: 'Units', order: 1 };
  if (normalizedType.includes('event')) return { key: 'event', label: 'Events', order: 2 };
  if (normalizedType.includes('upgrade')) return { key: 'upgrade', label: 'Upgrades', order: 3 };
  return { key: 'other', label: 'Other', order: 4 };
};

const stackChangeTone = (entry: StackEntry): 'same' | 'added' | 'removed' | 'decreased' | 'increased' => {
  const change = entry.change;
  if (!change) return 'same';
  if (change.changeType === 'added') return 'added';
  if (change.changeType === 'removed') return 'removed';

  const beforeQty = change.before?.quantity ?? 0;
  const afterQty = change.after?.quantity ?? 0;
  if (afterQty > beforeQty) return 'increased';
  if (afterQty < beforeQty) return 'decreased';
  return 'same';
};

const StackedDeckReview: React.FC<{
  diffData: DeckDiffResponse;
  selectedCardKey: string | undefined;
  selectedIdentityKey: string | undefined;
  selectedIdentityCardKey: string | undefined;
  selectedChangeKey: string | undefined;
  onSelectCard: (entry: StackEntry) => void;
  onSelectIdentityCard: (preview: IdentityCardPreview) => void;
  onSelectFieldChange: (change: DeckFieldChange) => void;
}> = ({
  diffData,
  selectedCardKey,
  selectedIdentityKey,
  selectedIdentityCardKey,
  selectedChangeKey,
  onSelectCard,
  onSelectIdentityCard,
  onSelectFieldChange,
}) => {
  return (
    <StackedDeckPanel
      diffData={diffData}
      snapshotCards={diffData.snapshots.branch.cards}
      cardChanges={diffData.proposedDiff.cards}
      selectedCardKey={selectedCardKey}
      selectedIdentityKey={selectedIdentityKey}
      selectedIdentityCardKey={selectedIdentityCardKey}
      selectedChangeKey={selectedChangeKey}
      onSelectCard={onSelectCard}
      onSelectIdentityCard={onSelectIdentityCard}
      onSelectFieldChange={onSelectFieldChange}
    />
  );
};

const StackedDeckPanel: React.FC<{
  diffData: DeckDiffResponse;
  snapshotCards: SnapshotCard[];
  cardChanges: DeckCardChange[];
  selectedCardKey: string | undefined;
  selectedIdentityKey: string | undefined;
  selectedIdentityCardKey: string | undefined;
  selectedChangeKey: string | undefined;
  onSelectCard: (entry: StackEntry) => void;
  onSelectIdentityCard: (preview: IdentityCardPreview) => void;
  onSelectFieldChange: (change: DeckFieldChange) => void;
}> = ({
  diffData,
  snapshotCards,
  cardChanges,
  selectedCardKey,
  selectedIdentityKey,
  selectedIdentityCardKey,
  selectedChangeKey,
  onSelectCard,
  onSelectIdentityCard,
  onSelectFieldChange,
}) => {
  const { data: cardList } = useCardList();
  const identityEntries = React.useMemo(() => buildIdentityEntries(diffData), [diffData]);
  const entries = React.useMemo(
    () => buildStackEntries(snapshotCards, cardChanges),
    [cardChanges, snapshotCards],
  );
  const zones = React.useMemo(() => {
    const groups = new Map<
      string,
      {
        cards: StackEntry[];
        costLabel: string;
        costSortValue: number;
        board: number;
        typeKey: string;
        typeLabel: string;
        typeSortValue: number;
      }
    >();
    entries.forEach(entry => {
      const card = cardList?.cards[entry.cardId];
      const section = typeSection(card?.type);
      const costLabel = `${card?.cost ?? 'No'} cost`;
      const costSortValue = Number(card?.cost ?? 99);
      const key = `${entry.board}:${section.key}:${costSortValue}:${costLabel}`;
      const group = groups.get(key) ?? {
        cards: [],
        costLabel,
        costSortValue,
        board: entry.board,
        typeKey: section.key,
        typeLabel: section.label,
        typeSortValue: section.order,
      };
      groups.set(key, { ...group, cards: [...group.cards, entry] });
    });

    const columns = [...groups.entries()]
      .sort(
        ([, a], [, b]) =>
          a.board - b.board ||
          a.typeSortValue - b.typeSortValue ||
          a.costSortValue - b.costSortValue ||
          a.costLabel.localeCompare(b.costLabel),
      )
      .map(([key, group]) => ({
        key,
        label: group.costLabel,
        board: group.board,
        typeKey: group.typeKey,
        typeLabel: group.typeLabel,
        typeSortValue: group.typeSortValue,
        costSortValue: group.costSortValue,
        cards: group.cards.sort((a, b) => {
          const cardA = cardList?.cards[a.cardId];
          const cardB = cardList?.cards[b.cardId];
          return (cardA?.name ?? a.cardId).localeCompare(cardB?.name ?? b.cardId);
        }),
        count: group.cards.reduce((sum, card) => sum + Math.max(card.quantity, 0), 0),
      }));

    return [1, 2, 3]
      .map(board => {
        const zoneColumns = columns.filter(column => column.board === board);
        const sectionKeys = [...new Set(zoneColumns.map(column => column.typeKey))];
        return {
          board,
          label: boardLabel(board),
          count: zoneColumns.reduce((sum, column) => sum + column.count, 0),
          sections: sectionKeys
            .map(sectionKey => {
              const sectionColumns = zoneColumns.filter(column => column.typeKey === sectionKey);
              return {
                key: sectionKey,
                label: sectionColumns[0]?.typeLabel ?? 'Other',
                order: sectionColumns[0]?.typeSortValue ?? 99,
                count: sectionColumns.reduce((sum, column) => sum + column.count, 0),
                columns: sectionColumns,
              };
            })
            .sort((a, b) => a.order - b.order),
        };
      })
      .filter(zone => zone.sections.length > 0);
  }, [cardList?.cards, entries]);
  const deckFrameStyle = React.useMemo<React.CSSProperties>(() => {
    const colors = identityEntries
      .flatMap(entry => {
        const card = entry.cardId ? cardList?.cards[entry.cardId] : undefined;
        return card?.aspects ?? [];
      })
      .map(aspect => aspectLib[aspect as SwuAspect])
      .filter((color): color is string => Boolean(color));
    const uniqueColors = [...new Set(colors)];

    if (uniqueColors.length === 0) return {};

    const primary = uniqueColors[0];
    const secondary = uniqueColors[1] ?? primary;
    const tertiary = uniqueColors[2] ?? secondary;

    return {
      background: `linear-gradient(115deg, ${primary}36 0%, ${secondary}26 42%, ${tertiary}1f 70%, hsl(var(--background) / 0.2) 100%)`,
      borderColor: `${primary}88`,
      boxShadow: `inset 0 1px 0 ${primary}55`,
    };
  }, [cardList?.cards, identityEntries]);
  const deckDetailChanges = diffData.proposedDiff.fields.filter(change =>
    isDeckPreviewField(change.field),
  );

  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Deck preview</div>
        </div>
      </div>
      <div className="overflow-hidden rounded-md border bg-muted/10" style={deckFrameStyle}>
        <div className="grid gap-0">
          <DeckDetailStrip
            changes={deckDetailChanges}
            selectedChangeKey={selectedChangeKey}
            onSelectChange={onSelectFieldChange}
          />
          <DeckIdentityStrip
            entries={identityEntries}
            selectedIdentityKey={selectedIdentityKey}
            selectedIdentityCardKey={selectedIdentityCardKey}
            onSelectIdentityCard={onSelectIdentityCard}
          />
          <div className="space-y-5 border-t bg-background/45 p-3 backdrop-blur-sm">
            {zones.map(zone => (
              <StackedDeckZone
                key={zone.board}
                zone={zone}
                selectedCardKey={selectedCardKey}
                onSelectCard={onSelectCard}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const DeckDetailStrip: React.FC<{
  changes: DeckFieldChange[];
  selectedChangeKey: string | undefined;
  onSelectChange: (change: DeckFieldChange) => void;
}> = ({ changes, selectedChangeKey, onSelectChange }) => {
  if (changes.length === 0) return null;

  return (
    <aside className="border-b bg-background/25 p-3 backdrop-blur-sm">
      <div className="grid gap-2">
        {changes.map(change => {
          const key = `field:${change.field}`;
          const selected = selectedChangeKey === key;

          return (
            <button
              key={key}
              type="button"
              className={`grid w-full min-w-0 gap-1 rounded-md px-2 py-1.5 text-left transition hover:bg-background/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:grid-cols-[88px_minmax(0,1fr)] ${
                selected ? 'bg-background/55 outline outline-2 outline-primary outline-offset-1' : ''
              }`}
              onClick={() => onSelectChange(change)}
            >
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                {fieldLabel(change.field)}
              </span>
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-sm leading-5">
                <span className="min-w-0 max-w-full break-words text-muted-foreground line-through">
                  {inlineFieldValue(change.before)}
                </span>
                <span className="shrink-0 text-muted-foreground" aria-hidden="true">
                  →
                </span>
                <span className="min-w-0 max-w-full break-words font-medium text-amber-100">
                  {inlineFieldValue(change.after)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

const DeckIdentityStrip: React.FC<{
  entries: IdentityEntry[];
  selectedIdentityKey: string | undefined;
  selectedIdentityCardKey: string | undefined;
  onSelectIdentityCard: (preview: IdentityCardPreview) => void;
}> = ({
  entries,
  selectedIdentityKey,
  selectedIdentityCardKey,
  onSelectIdentityCard,
}) => {
  const { data: cardList } = useCardList();
  if (entries.length === 0) return null;

  return (
    <aside className="bg-background/25 p-3 backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Leader and base</h4>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map(entry => {
          const card = entry.cardId ? cardList?.cards[entry.cardId] : undefined;
          const beforeCard = entry.beforeId ? cardList?.cards[entry.beforeId] : undefined;
          const afterCard = entry.afterId ? cardList?.cards[entry.afterId] : undefined;
          const variant = card ? selectDefaultVariant(card) : undefined;
          const beforeVariant = beforeCard ? selectDefaultVariant(beforeCard) : undefined;
          const afterVariant = afterCard ? selectDefaultVariant(afterCard) : undefined;
          const changed = Boolean(entry.change);
          const proposedName = afterCard?.name ?? card?.name ?? entry.cardId ?? 'No card selected';
          const beforeName = beforeCard?.name ?? entry.beforeId ?? 'No card selected';
          const isBaseChange = changed && entry.field === 'baseCardId';
          const beforeGhostPosition = isBaseChange
            ? 'left-0 top-1/2 -translate-y-1/2 -rotate-3 opacity-70'
            : 'left-0 top-1/2 -translate-y-1/2 -rotate-5 opacity-55';
          const beforeGhostHover = isBaseChange
            ? 'hover:opacity-95 focus-within:opacity-95'
            : 'hover:opacity-90 focus-within:opacity-90';
          const beforeGhostCardClass = isBaseChange
            ? 'scale-[1.45] opacity-85 saturate-90'
            : 'scale-[1.2] opacity-80 saturate-80';
          const beforePreview: IdentityCardPreview | undefined = entry.beforeId
            ? {
                key: `identity-card:${entry.field}:current`,
                field: entry.field,
                label: entry.label,
                source: 'current',
                cardId: entry.beforeId,
                pairedCardId: entry.afterId,
                change: entry.change,
              }
            : undefined;
          const afterPreview: IdentityCardPreview | undefined = entry.afterId
            ? {
                key: `identity-card:${entry.field}:proposal`,
                field: entry.field,
                label: entry.label,
                source: changed ? 'proposal' : 'current',
                cardId: entry.afterId,
                pairedCardId: entry.beforeId,
                change: entry.change,
              }
            : undefined;
          const selectPreview = (preview: IdentityCardPreview) => {
            onSelectIdentityCard(preview);
          };

          return (
            <div
              key={entry.key}
              className={`relative w-full overflow-hidden rounded-md border p-3 text-left transition duration-150 ${
                selectedIdentityKey === entry.key ? 'outline outline-2 outline-primary outline-offset-2' : ''
              } ${changed ? 'border-amber-400/70 bg-amber-950/20' : 'bg-background/40'}`}
            >
              <div className="mb-3">
                {changed ? (
                  <div className="relative mx-auto h-[166px] w-[230px]">
                    {beforePreview && (
                      <div
                        className={`absolute z-10 transition duration-150 hover:z-30 focus-within:z-30 ${beforeGhostPosition} ${beforeGhostHover}`}
                      >
                        <button
                          type="button"
                          className={`rounded-md bg-background/85 p-0.5 shadow-lg backdrop-blur transition duration-150 hover:-translate-y-1 hover:opacity-95 focus-visible:-translate-y-1 focus-visible:opacity-95 ${beforeGhostCardClass} ${
                            selectedIdentityCardKey === beforePreview.key
                              ? 'outline outline-2 outline-primary outline-offset-2'
                              : ''
                          }`}
                          onClick={() => selectPreview(beforePreview)}
                        >
                          <CardImage
                            card={beforeCard}
                            cardVariantId={beforeVariant}
                            size="w100"
                            backSideButton={false}
                            forceHorizontal={beforeCard?.front.horizontal ?? false}
                          />
                        </button>
                      </div>
                    )}
                    {afterPreview && (
                      <div className="relative z-20 ml-auto w-fit">
                        <button
                          type="button"
                          className={`rounded-md ring-2 ring-amber-400/60 transition duration-150 hover:-translate-y-1 focus-visible:-translate-y-1 ${
                            selectedIdentityCardKey === afterPreview.key
                              ? 'outline outline-2 outline-primary outline-offset-2'
                              : ''
                          }`}
                          onClick={() => selectPreview(afterPreview)}
                        >
                          <CardImage
                            card={afterCard}
                            cardVariantId={afterVariant}
                            size="w200"
                            backSideButton={false}
                            forceHorizontal={afterCard?.front.horizontal ?? false}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  afterPreview && (
                    <button
                      type="button"
                      className={`transition duration-150 hover:-translate-y-1 focus-visible:-translate-y-1 ${
                        selectedIdentityCardKey === afterPreview.key
                          ? 'outline outline-2 outline-primary outline-offset-2'
                          : ''
                      }`}
                      onClick={() => selectPreview(afterPreview)}
                    >
                      <CardImage
                        card={card}
                        cardVariantId={variant}
                        size="w200"
                        backSideButton={false}
                        forceHorizontal={card?.front.horizontal ?? false}
                      />
                    </button>
                  )
                )}
              </div>
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {entry.label}
                  </span>
                  {changed && (
                    <Badge variant="outline" className="h-5 border-amber-400/60 px-1.5 text-[11px]">
                      changed
                    </Badge>
                  )}
                </div>
                <div className="truncate text-sm font-semibold leading-tight">{proposedName}</div>
                {changed ? (
                  <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs">
                    <span className="min-w-0 flex-1 truncate text-muted-foreground line-through">
                      {beforeName}
                    </span>
                    <span className="shrink-0 text-muted-foreground" aria-hidden="true">
                      →
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-amber-100">
                      {proposedName}
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Current
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

const StackedDeckZone: React.FC<{
  zone: {
    board: number;
    label: string;
    count: number;
    sections: Array<{
      key: string;
      label: string;
      count: number;
      columns: Array<{
        key: string;
        label: string;
        cards: StackEntry[];
        count: number;
      }>;
    }>;
  };
  selectedCardKey: string | undefined;
  onSelectCard: (entry: StackEntry) => void;
}> = ({ zone, selectedCardKey, onSelectCard }) => (
  <section className={zone.board === 1 ? '' : 'border-t pt-4'}>
    <div className="mb-3 flex items-center gap-2">
      <h4 className="text-sm font-semibold">{zone.label}</h4>
      <Badge variant="outline">{zone.count}</Badge>
    </div>
    <div className="space-y-4">
      {zone.sections.map(section => (
        <StackedDeckTypeSection
          key={section.key}
          label={section.label}
          count={section.count}
          columns={section.columns}
          selectedCardKey={selectedCardKey}
          onSelectCard={onSelectCard}
        />
      ))}
    </div>
  </section>
);

const StackedDeckTypeSection: React.FC<{
  label: string;
  count: number;
  columns: Array<{
    key: string;
    label: string;
    cards: StackEntry[];
    count: number;
  }>;
  selectedCardKey: string | undefined;
  onSelectCard: (entry: StackEntry) => void;
}> = ({ label, count, columns, selectedCardKey, onSelectCard }) => (
  <div>
    <div className="mb-2 flex items-center gap-2 border-b pb-1">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <Badge variant="outline" className="h-5 px-1.5 text-[11px]">
        {count}
      </Badge>
    </div>
    <div className="flex flex-wrap gap-3">
      {columns.map(column => (
        <div key={column.key} className="w-32 shrink-0">
          <div className="mb-2 whitespace-nowrap text-xs">
            <span className="font-medium">{column.label}</span>{' '}
            <span className="text-muted-foreground">({column.count})</span>
          </div>
          <div className="pt-[112px]">
            {column.cards.map(entry => (
              <StackedCard
                key={entry.key}
                entry={entry}
                selected={entry.key === selectedCardKey}
                onSelect={() => onSelectCard(entry)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const QuantityChip: React.FC<{
  entry: StackEntry;
  tone: 'same' | 'added' | 'removed' | 'decreased' | 'increased';
}> = ({ entry, tone }) => {
  const beforeQuantity = entry.change?.before?.quantity;
  const afterQuantity = entry.change?.after?.quantity;
  const hasQuantityChange =
    entry.change &&
    (entry.change.changeType === 'added' ||
      entry.change.changeType === 'removed' ||
      beforeQuantity !== afterQuantity);
  const after = afterQuantity ?? entry.quantity;
  const toneClass =
    tone === 'added' || tone === 'increased'
      ? 'border-emerald-500/50 bg-emerald-950/90 text-emerald-100'
      : tone === 'removed' || tone === 'decreased'
        ? 'border-destructive/60 bg-destructive/90 text-destructive-foreground'
        : 'border-foreground/30 bg-background/90';

  if (!hasQuantityChange) {
    return (
      <div
        className={`absolute -right-2 top-0 rounded border px-1.5 py-0.5 text-xs font-semibold ${toneClass}`}
      >
        x{after}
      </div>
    );
  }

  return (
    <div
      className={`absolute -right-4 top-0 flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold ${toneClass}`}
      aria-label={`Quantity changed from ${beforeQuantity ?? 0} to ${afterQuantity ?? 0}`}
    >
      <span className="text-current/70 line-through">x{beforeQuantity ?? 0}</span>
      <span aria-hidden="true">→</span>
      <span>x{afterQuantity ?? 0}</span>
    </div>
  );
};

const CardChangeSummary: React.FC<{ change: DeckCardChange }> = ({ change }) => {
  const beforeQuantity = change.before?.quantity ?? 0;
  const afterQuantity = change.after?.quantity ?? 0;
  const quantityChanged = beforeQuantity !== afterQuantity;

  if (!quantityChanged) return null;

  return (
    <div className="grid gap-2 rounded-md border bg-muted/20 p-2 text-xs">
      <div>
        <div className="text-[10px] font-medium uppercase text-muted-foreground">Quantity</div>
        <div className="font-semibold">
          <span className="text-muted-foreground line-through">x{beforeQuantity}</span>
          <span className="px-2">→</span>
          <span>x{afterQuantity}</span>
        </div>
      </div>
    </div>
  );
};

const StackedCard: React.FC<{
  entry: StackEntry;
  selected: boolean;
  onSelect: () => void;
}> = ({ entry, selected, onSelect }) => {
  const { data: cardList } = useCardList();
  const card = cardList?.cards[entry.cardId];
  const variant = card ? selectDefaultVariant(card) : undefined;
  const tone = stackChangeTone(entry);
  const ringClass =
    tone === 'added' || tone === 'increased'
      ? 'ring-4 ring-emerald-500/70'
      : tone === 'removed' || tone === 'decreased'
        ? 'ring-4 ring-destructive/70'
        : '';

  return (
    <button
      type="button"
      className={`relative -mt-[112px] block w-[100px] rounded-[4.75%/3.5%] text-left transition duration-150 ease-out hover:-translate-y-2 focus-visible:-translate-y-2 ${
        selected ? 'outline outline-2 outline-primary outline-offset-4' : ''
      } cursor-pointer ${ringClass}`}
      onClick={onSelect}
    >
      <div className={tone === 'removed' ? 'brightness-90 saturate-75' : ''}>
        <CardImage card={card} cardVariantId={variant} size="w100" backSideButton={false} />
      </div>
      {tone === 'removed' && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -rotate-12 rounded bg-destructive shadow-[0_0_0_1px_rgba(0,0,0,0.55)]" />
      )}
      <QuantityChip entry={entry} tone={tone} />
    </button>
  );
};

const drawerPreviewSize = (card: CardDataWithVariants<CardListVariants> | undefined) =>
  card?.front.horizontal ? 'w200' : 'h250';

const reviewDrawerClass =
  'space-y-2 rounded-md border bg-background p-2.5 shadow-lg animate-in fade-in-0 slide-in-from-right-4 duration-200';

const ReviewInspector: React.FC<{
  selectedCard: StackEntry | undefined;
  selectedIdentity: IdentityEntry | undefined;
  selectedIdentityCard: IdentityCardPreview | undefined;
  fieldChange: ReviewChange | undefined;
  canResolve: boolean;
  resolution: 'current' | 'proposed' | undefined;
  onResolve: (value: 'current' | 'proposed') => void;
}> = ({
  selectedCard,
  selectedIdentity,
  selectedIdentityCard,
  fieldChange,
  canResolve,
  resolution,
  onResolve,
}) => {
  const { data: cardList } = useCardList();
  const selectedCardData = selectedCard ? cardList?.cards[selectedCard.cardId] : undefined;
  const variant = selectedCardData ? selectDefaultVariant(selectedCardData) : undefined;
  const selectedIdentityCardData = selectedIdentityCard
    ? cardList?.cards[selectedIdentityCard.cardId]
    : undefined;
  const selectedIdentityCardVariant = selectedIdentityCardData
    ? selectDefaultVariant(selectedIdentityCardData)
    : undefined;
  const cardChange = selectedCard?.change;
  const change = fieldChange;

  if (!selectedCard && !selectedIdentity && !selectedIdentityCard && !change) {
    return null;
  }

  if (selectedIdentityCard) {
    const sourceLabel = selectedIdentityCard.source === 'proposal' ? 'Proposed' : 'Current';
    const identityType =
      selectedIdentityCardData?.type && selectedIdentityCardData.type !== selectedIdentityCard.label
        ? selectedIdentityCardData.type
        : undefined;
    const identityDetails = [
      selectedIdentityCard.label,
      identityType,
      selectedIdentityCardData?.cost !== null && selectedIdentityCardData?.cost !== undefined
        ? `${selectedIdentityCardData.cost} cost`
        : undefined,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <aside className={reviewDrawerClass}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold leading-tight">
            {selectedIdentityCardData?.name ?? selectedIdentityCard.cardId}
          </h3>
          <Badge variant={selectedIdentityCard.source === 'proposal' ? 'secondary' : 'outline'}>
            {sourceLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{identityDetails}</p>

        <div className="flex justify-center rounded-md border bg-muted/10 p-1.5">
          <CardImage
            card={selectedIdentityCardData}
            cardVariantId={selectedIdentityCardVariant}
            size={drawerPreviewSize(selectedIdentityCardData)}
            backSideButton={false}
            forceHorizontal={selectedIdentityCardData?.front.horizontal ?? false}
          />
        </div>
      </aside>
    );
  }

  if (selectedIdentity) {
    const beforeCard = selectedIdentity.beforeId ? cardList?.cards[selectedIdentity.beforeId] : undefined;
    const afterCard = selectedIdentity.afterId ? cardList?.cards[selectedIdentity.afterId] : undefined;
    const currentCard = selectedIdentity.cardId ? cardList?.cards[selectedIdentity.cardId] : undefined;
    const currentVariant = currentCard ? selectDefaultVariant(currentCard) : undefined;
    const beforeVariant = beforeCard ? selectDefaultVariant(beforeCard) : undefined;
    const afterVariant = afterCard ? selectDefaultVariant(afterCard) : undefined;
    const changed = Boolean(selectedIdentity.change);

    return (
      <aside className={reviewDrawerClass}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold leading-tight">{selectedIdentity.label}</h3>
          <Badge variant={changed ? 'secondary' : 'outline'}>{changed ? 'changed' : 'unchanged'}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {currentCard?.name ?? selectedIdentity.cardId ?? 'No card selected'}
        </p>

        {changed ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2">
              <div className="mb-2 text-[11px] font-medium uppercase text-muted-foreground">
                Current
              </div>
              {beforeCard ? (
                <CardImage
                  card={beforeCard}
                  cardVariantId={beforeVariant}
                  size="w100"
                  backSideButton={false}
                  forceHorizontal={beforeCard.front.horizontal ?? false}
                />
              ) : (
                <div className="flex h-[140px] w-[100px] items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                  none
                </div>
              )}
            </div>
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2">
              <div className="mb-2 text-[11px] font-medium uppercase text-muted-foreground">
                Proposed
              </div>
              {afterCard ? (
                <CardImage
                  card={afterCard}
                  cardVariantId={afterVariant}
                  size="w100"
                  backSideButton={false}
                  forceHorizontal={afterCard.front.horizontal ?? false}
                />
              ) : (
                <div className="flex h-[140px] w-[100px] items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                  none
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex justify-center rounded-md border bg-muted/10 p-1.5">
            <CardImage
              card={currentCard}
              cardVariantId={currentVariant}
              size={drawerPreviewSize(currentCard)}
              backSideButton={false}
              forceHorizontal={currentCard?.front.horizontal ?? false}
            />
          </div>
        )}
      </aside>
    );
  }

  if (selectedCard) {
    return (
      <aside className={reviewDrawerClass}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold leading-tight">{selectedCardData?.name ?? selectedCard.cardId}</h3>
          <Badge variant={cardChange ? 'secondary' : 'outline'}>
            {cardChange?.changeType ?? 'unchanged'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {boardLabel(selectedCard.board)}
          {selectedCardData?.type ? ` · ${selectedCardData.type}` : ''}
          {selectedCardData?.cost !== null && selectedCardData?.cost !== undefined
            ? ` · ${selectedCardData.cost} cost`
            : ''}
        </p>

        {cardChange && <CardChangeSummary change={cardChange} />}

        <div className="flex justify-center rounded-md border bg-muted/10 p-1.5">
          <CardImage
            card={selectedCardData}
            cardVariantId={variant}
            size={drawerPreviewSize(selectedCardData)}
            backSideButton={false}
          />
        </div>

        {!cardChange && (
          <ValuePanel
            label="Deck quantity"
            value={`Qty ${selectedCard.quantity}`}
            tone="neutral"
          />
        )}
      </aside>
    );
  }

  return (
    <aside className={reviewDrawerClass}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold leading-tight">{change.title}</h3>
          <Badge variant={change.conflict ? 'destructive' : 'outline'}>{change.badge}</Badge>
          {change.conflict && <Badge variant="secondary">conflict</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">{change.subtitle}</p>
      </div>

      {change.conflict ? (
        <div className="space-y-2">
          <ValuePanel label="Original" value={change.conflict.base} tone="neutral" />
          <ValuePanel label="Current" value={change.conflict.current} tone="before" />
          <ValuePanel label="Proposed" value={change.conflict.proposed} tone="after" />
        </div>
      ) : (
        <div className="space-y-2">
          <ValuePanel label={change.beforeLabel} value={change.before} tone="before" />
          <ValuePanel label={change.afterLabel} value={change.after} tone="after" />
        </div>
      )}

      {change.conflict && canResolve && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant={resolution === 'current' ? 'default' : 'outline'}
            onClick={() => onResolve('current')}
          >
            Keep current
          </Button>
          <Button
            size="sm"
            variant={resolution === 'proposed' ? 'default' : 'outline'}
            onClick={() => onResolve('proposed')}
          >
            Use proposed
          </Button>
        </div>
      )}
    </aside>
  );
};

const ReviewFeedbackPanel: React.FC<{
  comments: DeckReviewComment[];
  canComment: boolean;
  draft: string;
  isSavingComment: boolean;
  onDraftChange: (value: string) => void;
  onSaveComment: () => void;
}> = ({ comments, canComment, draft, isSavingComment, onDraftChange, onSaveComment }) => (
  <aside className="space-y-3 rounded-md border bg-muted/10 p-3">
    <div className="flex items-center gap-2 text-sm font-semibold">
      <MessageSquare className="h-4 w-4 text-muted-foreground" />
      Feedback
    </div>
    {comments.length > 0 ? (
      <div className="space-y-2">
        {comments.map(comment => (
          <div key={comment.id} className="rounded-md border bg-background p-2 text-sm">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{comment.author.displayName ?? comment.author.name}</span>
              <span>{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <p className="whitespace-pre-wrap">{comment.body}</p>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">No feedback yet.</p>
    )}
    {canComment && (
      <div className="flex flex-col gap-2">
        <Textarea
          value={draft}
          onChange={event => onDraftChange(event.target.value)}
          placeholder="Add feedback"
          className="min-h-24 resize-y"
        />
        <Button size="sm" onClick={onSaveComment} disabled={!draft.trim() || isSavingComment}>
          {isSavingComment ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          Add feedback
        </Button>
      </div>
    )}
  </aside>
);

type RequestReviewDialogProps = {
  teamId: string;
  requestRow: DeckChangeRequestListItem;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
};

export const RequestReviewDialog: React.FC<RequestReviewDialogProps> = ({
  teamId,
  requestRow,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}) => {
  const user = useUser();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;
  const [resolutions, setResolutions] = React.useState<Record<string, 'current' | 'proposed'>>({});
  const [reviewFeedbackDraft, setReviewFeedbackDraft] = React.useState('');
  const [selectedChangeKey, setSelectedChangeKey] = React.useState<string>();
  const [selectedCard, setSelectedCard] = React.useState<StackEntry>();
  const [selectedIdentity, setSelectedIdentity] = React.useState<IdentityEntry>();
  const [selectedIdentityCard, setSelectedIdentityCard] = React.useState<IdentityCardPreview>();
  const { data: diffData, isLoading } = useDeckBranchDiff(
    open ? teamId : undefined,
    open ? requestRow.branch.id : undefined,
  );
  const mergeMutation = useMergeDeckChangeRequest(teamId);
  const closeMutation = useCloseDeckChangeRequest(teamId);
  const commentMutation = useCommentDeckChangeRequest(teamId, requestRow.branch.id);

  const request = requestRow.changeRequest;
  const baseDeck = requestRow.baseDeck;
  const canMerge = request.status === 'open' && user?.id === baseDeck?.userId;
  const canComment = request.status === 'open';
  const conflicts = diffData?.conflicts ?? [];
  const changes = React.useMemo(() => (diffData ? buildReviewChanges(diffData) : []), [diffData]);
  const selectedChange = changes.find(change => change.key === selectedChangeKey);
  const selectedFieldChange = selectedChange?.type === 'field' ? selectedChange : undefined;
  const visibleFieldChanges =
    diffData?.proposedDiff.fields.filter(
      field => !(identityFields as readonly string[]).includes(field.field) && !isDeckPreviewField(field.field),
    ) ?? [];
  const stackEntries = React.useMemo(
    () => (diffData ? buildStackEntries(diffData.snapshots.branch.cards, diffData.proposedDiff.cards) : []),
    [diffData],
  );
  const selectedCardForInspector =
    selectedCard ??
    (selectedChange?.type === 'card'
      ? stackEntries.find(entry => `card:${entry.key}` === selectedChange.key)
      : undefined);
  const selectedDrawerKey =
    selectedIdentityCard?.key ?? selectedIdentity?.key ?? selectedCardForInspector?.key ?? selectedFieldChange?.key;
  const allConflictsResolved = conflicts.every((conflict: DeckConflict) => {
    return !!resolutions[conflictKey(conflict)];
  });
  const changeKeySignature = changes.map(change => change.key).join('|');
  const overallComments = diffData ? reviewFeedbackComments(diffData.reviewComments) : [];

  React.useEffect(() => {
    if (!open) {
      setSelectedChangeKey(undefined);
      setSelectedCard(undefined);
      setSelectedIdentity(undefined);
      setSelectedIdentityCard(undefined);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    setSelectedChangeKey(previous => {
      if (!previous) return undefined;
      return changes.some(change => change.key === previous) ? previous : undefined;
    });
  }, [changeKeySignature, changes, open]);

  const clearSelection = React.useCallback(() => {
    setSelectedChangeKey(undefined);
    setSelectedCard(undefined);
    setSelectedIdentity(undefined);
    setSelectedIdentityCard(undefined);
  }, []);

  const merge = () => {
    const payload: ZDeckChangeRequestMergeRequest['resolutions'] = conflicts
      .map((conflict: DeckConflict) => {
        const key = conflictKey(conflict);
        const choice = resolutions[key];
        if (!choice) return null;
        return conflict.type === 'field'
          ? {
              type: 'field' as const,
              field: conflict.field,
              value: choice === 'proposed' ? conflict.proposed : conflict.current,
            }
          : {
              type: 'card' as const,
              key: conflict.key,
              value: choice === 'proposed' ? conflict.proposed : conflict.current,
            };
      })
      .filter((resolution): resolution is ZDeckChangeRequestMergeRequest['resolutions'][number] =>
        Boolean(resolution),
      );

    mergeMutation.mutate({ requestId: request.id, resolutions: payload });
  };

  const saveReviewFeedback = () => {
    const body = reviewFeedbackDraft.trim();
    if (!body) return;
    commentMutation.mutate(
      { requestId: request.id, changeKey: overallReviewCommentKey, body },
      {
        onSuccess: () => {
          setReviewFeedbackDraft('');
        },
      },
    );
  };

  const sendBack = () => {
    const body = reviewFeedbackDraft.trim();
    if (!body) {
      closeMutation.mutate(request.id);
      return;
    }

    commentMutation.mutate(
      { requestId: request.id, changeKey: overallReviewCommentKey, body },
      {
        onSuccess: () => {
          setReviewFeedbackDraft('');
          closeMutation.mutate(request.id);
        },
      },
    );
  };

  const totalChanged =
    (diffData?.proposedDiff.summary.fieldsChanged ?? 0) +
    (diffData?.proposedDiff.summary.cardsAdded ?? 0) +
    (diffData?.proposedDiff.summary.cardsChanged ?? 0) +
    (diffData?.proposedDiff.summary.cardsRemoved ?? 0);
  const ownerTouchedBase =
    (diffData?.ownerDiff.summary.fieldsChanged ?? 0) +
    (diffData?.ownerDiff.summary.cardsAdded ?? 0) +
    (diffData?.ownerDiff.summary.cardsChanged ?? 0) +
    (diffData?.ownerDiff.summary.cardsRemoved ?? 0);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      size="large"
      header={
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <DeckPullRequest className="h-5 w-5 text-muted-foreground" />
            <DialogTitleText>{request.title}</DialogTitleText>
            <Badge variant={request.status === 'open' ? 'secondary' : 'outline'}>{request.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {requestRow.author.displayName ?? requestRow.author.name} → {baseDeck?.name ?? 'base deck'}
          </p>
        </div>
      }
      trigger={
        trigger ?? (
        <Button variant="outline" size="sm">
          <DeckCompare className="h-4 w-4" />
          Review
        </Button>
        )
      }
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={sendBack}
            disabled={request.status !== 'open' || closeMutation.isPending || commentMutation.isPending}
          >
            <X className="h-4 w-4" />
            Send back
          </Button>
          <div className="flex items-center gap-2">
            {conflicts.length > 0 && !allConflictsResolved && (
              <span className="text-sm text-muted-foreground">Resolve conflicts</span>
            )}
            <Button
              onClick={merge}
              disabled={
                !canMerge ||
                mergeMutation.isPending ||
                isLoading ||
                (conflicts.length > 0 && !allConflictsResolved)
              }
            >
              {mergeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DeckMerge className="h-4 w-4" />
              )}
              Merge
            </Button>
          </div>
        </div>
      }
    >
      {isLoading || !diffData ? (
        <div className="flex flex-col gap-2 p-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="space-y-4 p-1">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border bg-muted/20 p-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-start gap-2">
                {conflicts.length > 0 ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                )}
                <div>
                  <div className="text-sm font-semibold">Merge check</div>
                  <div className="text-xs text-muted-foreground">
                    {conflicts.length > 0 ? 'Blocked by conflicts' : 'No conflicts'}
                  </div>
                </div>
              </div>
              {request.description && (
                <p className="max-w-3xl whitespace-pre-wrap text-sm text-muted-foreground">
                  {request.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{totalChanged} changes</Badge>
              <Badge variant="outline">{diffData.reviewComments.length} comments</Badge>
              <Badge variant={conflicts.length > 0 ? 'destructive' : 'outline'}>
                {conflicts.length} conflicts
              </Badge>
              {ownerTouchedBase > 0 && <Badge variant="secondary">{ownerTouchedBase} base edits</Badge>}
            </div>
          </div>

          <div
            className={`grid gap-4 transition-all duration-200 ${
              selectedDrawerKey
                ? 'md:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_360px]'
                : ''
            }`}
          >
            <section className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">Changes</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{diffData.proposedDiff.summary.fieldsChanged} fields</Badge>
                  <Badge variant="outline">{diffData.proposedDiff.summary.cardsAdded} added</Badge>
                  <Badge variant="outline">{diffData.proposedDiff.summary.cardsChanged} changed</Badge>
                  <Badge variant="outline">{diffData.proposedDiff.summary.cardsRemoved} removed</Badge>
                </div>
              </div>
              {changes.length === 0 ? (
                <div className="rounded-md border py-12 text-center text-sm text-muted-foreground">
                  No changes.
                </div>
              ) : (
                <>
                  <StackedDeckReview
                    diffData={diffData}
                    selectedCardKey={selectedCardForInspector?.key}
                    selectedIdentityKey={selectedIdentity?.key}
                    selectedIdentityCardKey={selectedIdentityCard?.key}
                    selectedChangeKey={selectedChangeKey}
                    onSelectCard={entry => {
                      if (selectedCardForInspector?.key === entry.key) {
                        clearSelection();
                        return;
                      }
                      setSelectedCard(entry);
                      setSelectedIdentity(undefined);
                      setSelectedIdentityCard(undefined);
                      setSelectedChangeKey(entry.change ? `card:${entry.key}` : undefined);
                    }}
                    onSelectIdentityCard={preview => {
                      if (selectedIdentityCard?.key === preview.key) {
                        clearSelection();
                        return;
                      }
                      setSelectedIdentityCard(preview);
                      setSelectedIdentity(undefined);
                      setSelectedCard(undefined);
                      setSelectedChangeKey(preview.change ? `field:${preview.field}` : undefined);
                    }}
                    onSelectFieldChange={field => {
                      const key = `field:${field.field}`;
                      if (selectedChangeKey === key) {
                        clearSelection();
                        return;
                      }
                      setSelectedCard(undefined);
                      setSelectedIdentity(undefined);
                      setSelectedIdentityCard(undefined);
                      setSelectedChangeKey(key);
                    }}
                  />
                  {visibleFieldChanges.length > 0 && (
                    <div className="rounded-md border bg-muted/10 p-3">
                      <div className="mb-2 text-sm font-semibold">Details</div>
                      <div className="flex flex-wrap gap-2">
                        {visibleFieldChanges.map(field => {
                          const key = `field:${field.field}`;
                          return (
                            <Button
                              key={key}
                              size="sm"
                              variant={selectedChangeKey === key ? 'default' : 'outline'}
                              onClick={() => {
                                if (selectedChangeKey === key) {
                                  clearSelection();
                                  return;
                                }
                                setSelectedCard(undefined);
                                setSelectedIdentity(undefined);
                                setSelectedIdentityCard(undefined);
                                setSelectedChangeKey(key);
                              }}
                            >
                              {fieldLabel(field.field)}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <ReviewFeedbackPanel
                    comments={overallComments}
                    canComment={canComment}
                    draft={reviewFeedbackDraft}
                    isSavingComment={commentMutation.isPending}
                    onDraftChange={setReviewFeedbackDraft}
                    onSaveComment={saveReviewFeedback}
                  />
                </>
              )}
            </section>

            <div className={selectedDrawerKey ? 'md:sticky md:top-3 md:self-start' : ''}>
              <ReviewInspector
                key={selectedDrawerKey ?? 'empty'}
                selectedCard={selectedCardForInspector}
                selectedIdentity={selectedIdentity}
                selectedIdentityCard={selectedIdentityCard}
                fieldChange={selectedFieldChange}
                canResolve={canMerge}
                resolution={selectedChange ? resolutions[selectedChange.key] : undefined}
                onResolve={value => {
                  if (!selectedChange) return;
                  setResolutions(previous => ({ ...previous, [selectedChange.key]: value }));
                }}
              />
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
};

const DialogTitleText: React.FC<React.PropsWithChildren> = ({ children }) => (
  <h2 className="text-lg font-semibold leading-none md:text-xl">{children}</h2>
);

const TeamChangeRequestsTab: React.FC<TeamChangeRequestsTabProps> = ({ teamId }) => {
  const { data, isLoading } = useTeamChangeRequests(teamId);
  const requests = data ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 py-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border py-12 text-center">
        <DeckPullRequest className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No deck change requests yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-4">
      {requests.map(row => (
        <div key={row.changeRequest.id} className="flex items-center gap-3 rounded-md border p-3">
          <DeckPullRequest className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{row.changeRequest.title}</span>
              <Badge variant={row.changeRequest.status === 'open' ? 'secondary' : 'outline'}>
                {row.changeRequest.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              <Link
                to="/decks/$deckId"
                params={{ deckId: row.branchDeck.id }}
                className="underline-offset-4 hover:underline"
              >
                {row.branchDeck.name}
              </Link>{' '}
              into {row.baseDeck?.name ?? 'base deck'} by {row.author.displayName ?? row.author.name}
            </div>
          </div>
          <RequestReviewDialog teamId={teamId} requestRow={row} />
        </div>
      ))}
    </div>
  );
};

export default TeamChangeRequestsTab;
