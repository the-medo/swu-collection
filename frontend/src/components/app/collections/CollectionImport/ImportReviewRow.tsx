import { Fragment, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Check, ChevronRight, ExternalLink, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import {
  useCompleteCollectionImportRow,
  useResolveCollectionImportDuplicate,
} from '@/api/collections/useCollectionImportReview.ts';
import { cn } from '@/lib/utils.ts';
import {
  collectionImportMaxResolvedCount,
  collectionImportSwudbUrl,
  type CollectionImportProblem,
} from '../../../../../../types/CollectionImport.ts';
import type { ImportReviewGroup } from './importReviewGroups.ts';

const labels: Record<CollectionImportProblem, string> = {
  duplicate: 'Duplicate',
  unmatched: 'Unmatched',
  ambiguous: 'Ambiguous match',
  invalid: 'Invalid row',
};
const colors: Record<CollectionImportProblem | 'completed', string> = {
  duplicate: 'border-l-amber-500 bg-amber-500/5',
  unmatched: 'border-l-rose-500 bg-rose-500/5',
  ambiguous: 'border-l-violet-500 bg-violet-500/5',
  invalid: 'border-l-orange-500 bg-orange-500/5',
  completed: 'border-l-emerald-500 bg-emerald-500/5',
};
const badgeColors: Record<CollectionImportProblem | 'completed', string> = {
  duplicate: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  unmatched: 'bg-rose-500/15 text-rose-800 dark:text-rose-300',
  ambiguous: 'bg-violet-500/15 text-violet-800 dark:text-violet-300',
  invalid: 'bg-orange-500/15 text-orange-800 dark:text-orange-300',
  completed: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
};

function SourceRows({ group, headers }: { group: ImportReviewGroup; headers: string[] }) {
  const [page, setPage] = useState(0);
  return (
    <div className="space-y-2 p-2">
      <p className="text-xs text-muted-foreground">{group.rows[0].message}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-7">CSV line</TableHead>
            {headers.map((header, i) => (
              <TableHead className="h-7" key={i}>
                {header || `Column ${i + 1}`}
              </TableHead>
            ))}
            <TableHead className="h-7">SWUDB</TableHead>
            <TableHead className="h-7">Original CSV</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.rows.slice(page * 20, (page + 1) * 20).map(row => {
            const url = collectionImportSwudbUrl(headers, row.values);
            return (
              <TableRow key={row.id} data-testid={`import-source-row-${row.rowNumber}`}>
                <TableCell className="p-2 font-mono">{row.rowNumber}</TableCell>
                {headers.map((_, i) => (
                  <TableCell className="max-w-xs whitespace-pre-wrap break-words p-2" key={i}>
                    {row.values[i] ?? 'Missing'}
                  </TableCell>
                ))}
                <TableCell className="p-2">
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
                      View card
                    </a>
                  )}
                </TableCell>
                <TableCell className="p-2">
                  <pre className="max-w-sm whitespace-pre-wrap break-all text-xs">{row.raw}</pre>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {group.rows.length > 20 && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous source rows
          </Button>
          <span>
            {page * 20 + 1}–{Math.min((page + 1) * 20, group.rows.length)} of {group.rows.length}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={(page + 1) * 20 >= group.rows.length}
            onClick={() => setPage(page + 1)}
          >
            Next source rows
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ImportReviewRow({
  group,
  headers,
  collectionId,
  importId,
}: {
  group: ImportReviewGroup;
  headers: string[];
  collectionId: string;
  importId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const catalog = useCardList();
  const complete = useCompleteCollectionImportRow(collectionId, importId);
  const save = useResolveCollectionImportDuplicate(collectionId, importId);
  const first = group.rows[0];
  const duplicate = first.problem === 'duplicate' && !!first.match;
  const match = first.match;
  const card = match ? catalog.data?.cards[match.cardId] : undefined;
  const variant = card?.variants[match?.variantId ?? ''];
  const url = collectionImportSwudbUrl(headers, first.values);
  const pending = complete.isPending || save.isPending;
  const error =
    complete.error ??
    (group.resolvedCount !== null && save.variables?.count === group.resolvedCount
      ? null
      : save.error);
  const form = useForm({
    defaultValues: {
      count: String(
        group.resolvedCount ??
          group.rows.reduce((total, row) => total + (row.match?.count ?? 0), 0),
      ),
    },
    onSubmit: async ({ value }) => {
      if (pending || group.resolvedCount !== null) return;
      try {
        await save.mutateAsync({ rowId: first.id, count: Number(value.count) });
      } catch {
        /* Keep the count and display the server error below. */
      }
    },
  });
  const state = group.completed ? 'completed' : first.problem;
  return (
    <Fragment>
      <TableRow
        data-testid={`import-row-${first.rowNumber}`}
        className={cn('border-l-[3px]', colors[state])}
      >
        <TableCell className="min-w-60 max-w-sm p-2">
          <div className="flex items-center gap-2">
            {card && variant?.image.front && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-8 shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Preview ${card.name}`}
                  >
                    <CardImage
                      card={card}
                      cardVariantId={variant.variantId}
                      size="responsive"
                      backSideButton={false}
                      loading="lazy"
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1">
                  <CardImage card={card} cardVariantId={variant.variantId} size="w200" />
                </PopoverContent>
              </Popover>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              {match && (
                <p className="text-xs font-medium leading-tight">
                  {match.cardName}
                  <span className="ml-1 font-normal text-muted-foreground">
                    · {match.variantName}
                  </span>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium',
                    badgeColors[state],
                  )}
                >
                  {group.completed ? 'Completed' : labels[first.problem]}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground"
                  aria-expanded={expanded}
                  onClick={() => setExpanded(!expanded)}
                >
                  <ChevronRight className={cn('size-3', expanded && 'rotate-90')} />
                  {group.rows.length > 1
                    ? `${group.rows.length} source rows`
                    : `CSV line ${first.rowNumber}`}
                </button>
              </div>
            </div>
          </div>
        </TableCell>
        {headers.map((header, i) => {
          const isCount = header.trim().toLowerCase() === 'count';
          const values = isCount
            ? group.rows.map(row => row.values[i])
            : [...new Set(group.rows.map(row => row.values[i]))];
          return (
            <TableCell key={i} className="max-w-40 whitespace-pre-wrap break-words p-2 text-xs">
              {values.slice(0, 6).map((value, j) => (
                <Fragment key={j}>
                  {j > 0 && (
                    <span className="text-muted-foreground">{isCount ? ' + ' : ' / '}</span>
                  )}
                  <span
                    title={isCount ? `CSV line ${group.rows[j].rowNumber}` : undefined}
                    className={
                      isCount && duplicate
                        ? 'rounded bg-amber-500/10 px-1 py-0.5 font-mono'
                        : undefined
                    }
                  >
                    {value === '' ? '—' : (value ?? 'Missing')}
                  </span>
                </Fragment>
              ))}
              {values.length > 6 && (
                <button type="button" className="ml-1 underline" onClick={() => setExpanded(true)}>
                  +{values.length - 6} more
                </button>
              )}
            </TableCell>
          );
        })}
        <TableCell className="p-2">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View card"
              title="View on SWUDB"
              className="inline-flex text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
            </a>
          ) : (
            '—'
          )}
        </TableCell>
        <TableCell className="min-w-52 p-2">
          <div className="flex flex-wrap items-center gap-2">
            {duplicate && group.resolvedCount === null && (
              <form
                className="flex items-center gap-1"
                onSubmit={event => {
                  event.preventDefault();
                  void form.handleSubmit();
                }}
              >
                <form.Field name="count">
                  {field => (
                    <Input
                      aria-label={`Final count for CSV lines ${group.rows
                        .slice(0, 6)
                        .map(row => row.rowNumber)
                        .join(', ')}`}
                      title="Copies to add from this duplicate group"
                      type="number"
                      min={0}
                      max={collectionImportMaxResolvedCount}
                      step={1}
                      required
                      disabled={pending}
                      className="h-7 w-20 text-xs"
                      value={field.state.value}
                      onChange={event => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>
                <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={pending}>
                  {save.isPending ? 'Saving…' : 'Save'}
                </Button>
              </form>
            )}
            {group.resolvedCount !== null && (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {group.resolvedCount} added
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={pending}
              onClick={() =>
                complete.mutate(
                  { rowId: first.id, completed: !group.completed },
                  { onSuccess: () => save.reset() },
                )
              }
            >
              {group.completed ? <RotateCcw className="size-3" /> : <Check className="size-3" />}
              {group.completed
                ? 'Reopen'
                : duplicate && group.resolvedCount === null
                  ? 'Skip without adding'
                  : 'Mark completed'}
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-1 max-w-xs text-xs text-destructive">
              {error.message}
            </p>
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={headers.length + 3} className="bg-muted/20 p-1">
            <SourceRows group={group} headers={headers} />
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}
