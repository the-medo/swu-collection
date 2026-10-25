import {
  workspaceStyles,
  workspaceTheme,
} from '@/components/app/global/WorkspacePage/workspaceStyles.ts';

/** The play lobby shares the site's workspace theme; the game table has its own presentation. */
export const crossfireHomeStyles = {
  page: `${workspaceTheme} cf-home [&_p]:leading-[1.5]!`,
  layout: 'cf-home-grid grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]',
  aside: 'cf-home-aside grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-1',
  panel: `${workspaceStyles.panel} cf-home-card p-4 sm:p-5`,
  heading: workspaceStyles.heading,
  eyebrow:
    'text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--workspace-accent)]',
  icon: 'grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--workspace-soft)] text-[color:var(--workspace-accent)]',
  desk: `${workspaceStyles.panel} cf-play-desk overflow-hidden`,
  deskHeader:
    'flex items-start gap-3 border-b border-[color:var(--workspace-border)] px-4 py-4 sm:px-5',
  deskBody: 'grid min-w-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]',
  picker:
    'cf-deck-picker flex h-112 min-h-0 min-w-0 flex-col gap-4 border-b border-[color:var(--workspace-border)] p-4 sm:h-132 sm:p-5 md:h-148 md:border-r md:border-b-0',
  preview: 'cf-deck-preview min-w-0 bg-[var(--workspace-soft)]/40 p-4 sm:p-5',
  launch: 'cf-deck-launch flex h-full min-w-0 flex-col gap-5',
  selected:
    'cf-preview-deck flex min-w-0 items-center gap-3 rounded-xl border border-[color:var(--workspace-border)] bg-card p-3',
  selectedCopy:
    'cf-selected-deck min-w-0 flex-1 [&_strong]:mt-1 [&_strong]:block [&_strong]:text-sm [&_strong]:font-semibold [&_strong]:leading-snug [&_strong]:wrap-anywhere [&_small]:mt-1 [&_small]:block [&_small]:text-[11px] [&_small]:leading-relaxed [&_small]:text-muted-foreground',
  settings: 'cf-inline-settings grid min-w-0 gap-4 disabled:opacity-70',
  matchLength: 'cf-match-length mt-2 grid grid-cols-2 gap-2',
  matchOption: [
    'cf-match-option relative flex min-w-0 cursor-pointer flex-col gap-1 rounded-xl border border-[color:var(--workspace-border)] bg-card px-3 py-3 text-sm font-semibold',
    'has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:text-primary',
    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:disabled]:cursor-not-allowed',
  ].join(' '),
  settingRow:
    'cf-setting-row flex min-h-10 cursor-pointer items-center justify-between gap-3 py-2 text-xs has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 [&_[role=checkbox]]:shrink-0',
  launchActions:
    'cf-launch-actions mt-auto flex flex-col gap-2 [&_.cf-deck-attention]:h-auto [&_.cf-deck-attention]:min-h-10 [&_.cf-deck-attention]:whitespace-normal [&_.cf-deck-attention]:border [&_.cf-deck-attention]:border-amber-500/50 [&_.cf-deck-attention]:bg-amber-500/10 [&_.cf-deck-attention]:text-amber-800 dark:[&_.cf-deck-attention]:text-amber-200',
  launchButton:
    'cf-create-invitation h-auto min-h-11 w-full justify-between gap-3 whitespace-normal px-4 py-3 text-left text-xs [&>span]:wrap-anywhere [&>svg]:shrink-0',
  stepBadge:
    'grid size-8 shrink-0 place-items-center rounded-full border border-[color:var(--workspace-border)] bg-card text-xs font-semibold text-muted-foreground',
  teammate:
    'cf-home-teammate flex min-h-12 w-full min-w-0 items-center gap-3 rounded-xl border border-[color:var(--workspace-border)] bg-card p-2.5 text-left text-xs transition-colors hover:border-primary/50 hover:bg-primary/5 aria-pressed:border-primary aria-pressed:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
  teammateCheck:
    'cf-deck-row-check grid size-4 shrink-0 place-items-center rounded-full border border-[color:var(--workspace-border)] [[aria-pressed=true]_&]:border-primary [[aria-pressed=true]_&]:bg-primary [[aria-pressed=true]_&]:text-primary-foreground',
  empty:
    'flex flex-col items-start gap-2 rounded-xl border border-dashed border-[color:var(--workspace-border)] bg-[var(--workspace-soft)]/40 p-4 text-xs text-muted-foreground',
  activity:
    'cf-home-activity-grid grid min-w-0 items-start gap-5 min-[1400px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]',
  tabs: 'cf-activity-tabs mb-4 grid h-auto w-full grid-cols-2 gap-1 rounded-lg bg-[var(--workspace-soft)] p-1 [&>button]:gap-2 [&>button]:px-2 [&>button]:py-2 [&>button]:text-xs [&>button[data-state=active]]:bg-card [&>button[data-state=active]]:text-primary',
  banner:
    'cf-lobby-banner flex min-w-0 flex-col items-start gap-5 rounded-xl border border-[color:var(--workspace-border)] bg-[var(--workspace-soft)]/60 p-4 sm:p-5 lg:flex-row lg:items-center lg:gap-8',
} as const;
