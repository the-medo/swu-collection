export const comparerTableStyles = {
  table: 'w-max border-separate border-spacing-0 text-xs tabular-nums [&_th]:font-medium',
  name: 'sticky left-0 z-20 box-border w-[var(--comparer-name-width)] min-w-[var(--comparer-name-width)] max-w-[var(--comparer-name-width)] border-r border-[var(--workspace-border)] bg-card px-2 py-1 text-left',
  reference:
    'sticky left-[var(--comparer-name-width)] z-10 border-r border-[var(--workspace-border)] bg-[var(--workspace-soft)] text-center font-semibold text-[var(--workspace-accent)]',
  number: 'h-7 min-w-20 whitespace-nowrap border-b border-border/40 px-1.5 py-1 text-center',
  summary: 'border-l border-[var(--workspace-border)] bg-muted/50 font-medium',
  group: 'bg-[var(--workspace-soft)] font-semibold',
  hover: 'bg-[var(--workspace-soft)]',
} as const;
