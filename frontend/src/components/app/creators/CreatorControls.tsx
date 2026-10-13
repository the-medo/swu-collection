import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { hubApi, creatorKeys, useHubQuery } from '@/api/creators';
import {
  creationTags,
  dimensionLabels,
  tagDimensions,
  formatGroups,
  normalizeTagIds,
  toggleTagIds,
  type TagDimension,
} from '../../../../../shared/creators/taxonomy.ts';
import { entityTypes, type EntityReference } from '../../../../../shared/creators/contracts.ts';
import { ContentLeaderPicker } from './ContentLeaderPicker.tsx';
import { CreatorSetLogo } from './CreatorSetLogo.tsx';
import { creatorDescription, creatorSubheading } from './creatorStyles.ts';
export const selectClass =
  'h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50';
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-2 text-[12px] font-medium">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ id: string; 'aria-describedby'?: string }>, {
            id,
            'aria-describedby': hint ? `${id}-hint` : undefined,
          })
        : children}
      {hint && (
        <span id={`${id}-hint`} className="text-xs font-normal text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}
export function Status({
  error,
  loading,
  children,
}: {
  error?: Error | null;
  loading?: boolean;
  children?: ReactNode;
}) {
  if (error)
    return (
      <p
        role="alert"
        className="break-words rounded-[20px] border border-destructive/30 bg-card p-5 text-[13px]! leading-relaxed! text-red-700 dark:text-red-300"
      >
        {error.message}
      </p>
    );
  if (loading)
    return (
      <p
        role="status"
        className="rounded-[20px] border border-border bg-card p-5 text-[13px]! text-muted-foreground"
      >
        Loading…
      </p>
    );
  return children;
}
export function TagPicker({
  selected,
  onChange,
  dimensions = tagDimensions,
  compact = false,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  dimensions?: readonly TagDimension[];
  compact?: boolean;
}) {
  const prefix = useId();
  const values = normalizeTagIds(selected);
  return (
    <div className="space-y-3">
      {dimensions.map(dimension => (
        <details
          key={dimension}
          open={!compact || ['purpose', 'format'].includes(dimension)}
          className="rounded-xl border border-border bg-card p-3"
        >
          <summary className="cursor-pointer rounded-sm text-[12px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {dimensionLabels[dimension]}
            {values.filter(id => id.startsWith(`${dimension}:`)).length > 0 && (
              <span className="ml-2 text-[var(--creator-accent)]">
                {values.filter(id => id.startsWith(`${dimension}:`)).length}
              </span>
            )}
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {creationTags
              .filter(t => t.dimension === dimension)
              .map(tag => {
                const children = formatGroups[tag.id];
                const checked = children
                  ? children.every(id => values.includes(id))
                  : values.includes(tag.id);
                const partial = !checked && !!children?.some(id => values.includes(id));
                return (
                  <label
                    key={tag.id}
                    htmlFor={`${prefix}${tag.id}`}
                    title={tag.description}
                    className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11px] leading-normal transition-colors focus-within:ring-2 focus-within:ring-ring ${checked ? 'border-[var(--creator-border)] bg-[var(--creator-soft)] text-[var(--creator-accent)]' : 'border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    <input
                      id={`${prefix}${tag.id}`}
                      type="checkbox"
                      checked={checked}
                      ref={input => {
                        if (input) input.indeterminate = partial;
                      }}
                      onChange={e => onChange(toggleTagIds(values, tag.id, e.target.checked))}
                      className="mr-1.5 accent-current"
                    />
                    {tag.label}
                  </label>
                );
              })}
          </div>
        </details>
      ))}
    </div>
  );
}
export function SubjectPicker({
  references,
  onChange,
}: {
  references: EntityReference[];
  onChange: (refs: EntityReference[]) => void;
}) {
  const { data: cardList } = useCardList();
  const [type, setType] = useState<EntityReference['type']>('leader'),
    [search, setSearch] = useState('');
  const result = useHubQuery(creatorKeys.subjects(type, search, 'authoring'), () =>
    hubApi.subjects(type, search, 'authoring'),
  );
  return (
    <div className="grid gap-3 rounded-xl border border-border p-4">
      <p className={creatorSubheading}>Connect to SWUBASE</p>
      <p className={creatorDescription}>
        Choose the cards, decks, sets or events covered. Associated decks must be public.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Subject type">
          <select
            className={selectClass}
            value={type}
            onChange={e => setType(e.target.value as EntityReference['type'])}
          >
            {entityTypes.map(t => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        {type !== 'leader' && (
          <Field label="Find a subject">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name"
            />
          </Field>
        )}
      </div>
      {type === 'leader' ? (
        <ContentLeaderPicker
          onChange={id => {
            if (id && !references.some(ref => ref.type === 'leader' && ref.id === id))
              onChange([...references, { type: 'leader', id, startSeconds: null }]);
          }}
        />
      ) : (
        <>
          <Status loading={result.isPending} error={result.error} />
          <div className="max-h-40 overflow-auto rounded-lg border border-border">
            {result.data?.map(item => (
              <button
                type="button"
                key={`${item.type}:${item.id}`}
                className="block w-full px-3 py-2 text-left text-[12px] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-40"
                disabled={references.some(r => r.id === item.id && r.type === type)}
                onClick={() => onChange([...references, { type, id: item.id, startSeconds: null }])}
              >
                {type === 'set' ? (
                  <span className="flex items-center gap-3">
                    <CreatorSetLogo code={item.id} />
                    {item.label}
                  </span>
                ) : (
                  item.label
                )}
              </button>
            ))}
          </div>
        </>
      )}
      {references.map((ref, i) => (
        <div
          key={`${ref.type}:${ref.id}:${i}`}
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <span className="min-w-0 flex-1 break-all">
            {ref.type}:{' '}
            {(['card', 'leader', 'base'].includes(ref.type)
              ? cardList?.cards[ref.id]?.title
              : undefined) ??
              result.data?.find(r => r.type === ref.type && r.id === ref.id)?.label ??
              ref.id}
          </span>
          <Input
            aria-label={`Timestamp in seconds for ${ref.id}`}
            type="number"
            className="w-28"
            min={0}
            placeholder="Seconds"
            value={ref.startSeconds ?? ''}
            onChange={e =>
              onChange(
                references.map((r, index) =>
                  index === i
                    ? { ...r, startSeconds: e.target.value === '' ? null : Number(e.target.value) }
                    : r,
                ),
              )
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(references.filter((_, index) => index !== i))}
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}
