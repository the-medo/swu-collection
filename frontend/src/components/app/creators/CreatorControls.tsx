import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import {
  creationTags,
  dimensionLabels,
  tagDimensions,
  formatGroups,
  normalizeTagIds,
  toggleTagIds,
  type TagDimension,
} from '../../../../../shared/creators/taxonomy.ts';
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
