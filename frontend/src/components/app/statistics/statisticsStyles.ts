// Shared Tailwind utilities for this feature. Marker classes scope contextual states.
export const statisticsStyles = {
  page: [
    'statistics-page [--statistics-line:hsl(var(--border))] [--statistics-positive:#087b52]',
    '[--statistics-negative:#be3346] [--statistics-draw:#996700] [--statistics-activity-surface:hsl(var(--card))]',
    '[--statistics-activity-empty:#e0e2e3] [--statistics-activity-unrated:#8b9298] [--statistics-activity-1:#bd6127]',
    '[--statistics-activity-2:#d08040] [--statistics-activity-3:#dfa063] [--statistics-activity-4:#e8bd8d]',
    '[--statistics-activity-5:#9eac89] [--statistics-activity-6:#7b956a]',
    '[--statistics-activity-7:#557b50] [--statistics-activity-8:var(--workspace-accent)]',
    'dark:[--statistics-positive:#55dcab] dark:[--statistics-negative:#ff8ba0] dark:[--statistics-draw:#f9cc62]',
    'dark:[--statistics-activity-empty:#363b3e] dark:[--statistics-activity-unrated:#90989e] dark:[--statistics-activity-1:#c47740]',
    'dark:[--statistics-activity-2:#d59256] dark:[--statistics-activity-3:#dfaa70] dark:[--statistics-activity-4:#e8c18d]',
    'dark:[--statistics-activity-5:#829672] dark:[--statistics-activity-6:#95ad81]',
    'dark:[--statistics-activity-7:#abc395] dark:[--statistics-activity-8:#c1d8ab] [&_p]:leading-[1.5]!',
    '[&_[data-state=on][role=radio]]:bg-[var(--workspace-soft)]',
    '[&_[data-state=on][role=radio]]:text-[color:var(--workspace-accent)] [&_table_thead_th]:bg-muted',
    '[&_table_thead_th]:text-muted-foreground [&_table_td]:border-[color:var(--statistics-line)]',
  ].join(' '),
  header: [
    'statistics-header [.statistics-page_&]:flex [.statistics-page_&]:flex-wrap [.statistics-page_&]:items-center',
    '[.statistics-page_&]:justify-between [.statistics-page_&]:gap-3 [.statistics-page_&]:mb-3',
  ].join(' '),
  filters: [
    'statistics-filters [.statistics-page_&]:flex [.statistics-page_&]:flex-wrap [.statistics-page_&]:items-end',
    '[.statistics-page_&]:gap-y-2 [.statistics-page_&]:gap-x-3.5 [&>div]:min-w-0 [&_button[role=combobox]]:h-8',
    'max-mobile:w-full max-mobile:[&>div]:flex-[1_1_auto]',
  ].join(' '),
  nav: [
    'statistics-nav [.statistics-page_&]:mb-4 [.statistics-page_&_.workspace-tabs]:flex-wrap',
    '[.statistics-page_&_.workspace-tabs]:gap-0.5 [.statistics-page_&_.workspace-tabs]:p-0',
    '[.statistics-page_&_.workspace-tabs]:border-0 [.statistics-page_&_.workspace-tabs]:border-b',
    '[.statistics-page_&_.workspace-tabs]:border-b-[color:var(--statistics-line)]',
    '[.statistics-page_&_.workspace-tabs]:rounded-none [.statistics-page_&_.workspace-tabs]:bg-transparent',
    '[.statistics-page_&_.workspace-tab]:relative [.statistics-page_&_.workspace-tab]:flex-1',
    '[.statistics-page_&_.workspace-tab]:py-2.5 [.statistics-page_&_.workspace-tab]:px-2',
    '[.statistics-page_&_.workspace-tab]:rounded-none [.statistics-page_&_.workspace-tab]:text-[length:0.8125rem]',
    '[.statistics-page_&_.workspace-tab[aria-current=page]]:bg-[var(--workspace-soft)]',
    '[.statistics-page_&_.workspace-tab[aria-current=page]]:rounded-[0.5rem_0.5rem_0_0]',
    '[.statistics-page_&_.workspace-tab[aria-current=page]]:shadow-none',
    '[.statistics-page_&_.workspace-tab[aria-current=page]]:text-[color:var(--workspace-accent)]',
    "[.statistics-page_&_.workspace-tab[aria-current=page]::after]:content-['']",
    '[.statistics-page_&_.workspace-tab[aria-current=page]::after]:absolute',
    '[.statistics-page_&_.workspace-tab[aria-current=page]::after]:h-0.5',
    '[.statistics-page_&_.workspace-tab[aria-current=page]::after]:top-auto',
    '[.statistics-page_&_.workspace-tab[aria-current=page]::after]:right-0',
    '[.statistics-page_&_.workspace-tab[aria-current=page]::after]:-bottom-0.25',
    '[.statistics-page_&_.workspace-tab[aria-current=page]::after]:left-0',
    '[.statistics-page_&_.workspace-tab[aria-current=page]::after]:rounded-[2px]',
    '[.statistics-page_&_.workspace-tab[aria-current=page]::after]:bg-[var(--workspace-accent)]',
    'max-mobile:[.statistics-page_&_.workspace-tab]:flex-[1_1_28%]',
    'max-mobile:[.statistics-page_&_.workspace-tab]:py-2 max-mobile:[.statistics-page_&_.workspace-tab]:px-1.5',
    'max-mobile:[.statistics-page_&_.workspace-tab]:text-[length:0.75rem]',
    'max-mobile:[.statistics-page_&_.workspace-tab_svg]:hidden',
  ].join(' '),
  sectionTitle: [
    'statistics-section-title [.statistics-page_&]:flex [.statistics-page_&]:items-center [.statistics-page_&]:gap-2',
    '[.statistics-page_&]:m-0! [.statistics-page_&]:p-0! [.statistics-page_&]:border-0!',
    '[.statistics-page_&]:text-[length:0.875rem]! [.statistics-page_&]:leading-[1.4]!',
    '[.statistics-page_&]:font-semibold! [.statistics-page_&]:tracking-[-0.01em]!',
  ].join(' '),
  resultsIcon: 'statistics-results-icon text-muted-foreground',
  activityIcon: 'statistics-activity-icon text-muted-foreground',
  sectionHeader:
    'statistics-section-header flex items-center justify-between flex-wrap gap-2 mb-3 [.statistics-activity_&]:mb-0',
  textLink: [
    'statistics-text-link inline-flex items-center gap-1 text-[length:0.75rem] text-[color:var(--workspace-accent)]',
    'rounded-[3px] hover:underline hover:underline-offset-3 focus-visible:outline-[2px]',
    'focus-visible:outline-[color:var(--workspace-accent)] focus-visible:outline-offset-3',
  ].join(' '),
  overviewGrid: [
    'statistics-overview-grid grid grid-cols-1 overflow-hidden border border-[color:var(--statistics-line)]',
    'rounded-[0.625rem] bg-card mb-6 @min-[800px]/statistics-dashboard:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]',
  ].join(' '),
  overview: 'statistics-overview min-w-0 p-3.5 max-[639.01px]:p-3',
  periods: [
    'statistics-periods w-full mt-2.5 table-fixed border-collapse [.statistics-page_&_th]:py-1.5',
    '[.statistics-page_&_th]:px-2.5 [.statistics-page_&_th]:text-left [.statistics-page_&_th]:border-0',
    '[.statistics-page_&_td]:py-1.5 [.statistics-page_&_td]:px-2.5 [.statistics-page_&_td]:text-left',
    '[.statistics-page_&_td]:border-0 [.statistics-page_&_thead_th]:bg-transparent',
    '[.statistics-page_&_thead_th]:text-muted-foreground [.statistics-page_&_thead_th]:text-[length:0.6875rem]',
    '[.statistics-page_&_thead_th]:font-semibold [.statistics-page_&_thead_th]:py-1',
    '[.statistics-page_&_tbody_th]:text-[length:0.75rem] [.statistics-page_&_tbody_th]:font-medium',
    '[&_tbody_tr]:border-t [&_tbody_tr]:border-t-[color:var(--statistics-line)] [&_tbody_tr:last-child]:bg-muted/55',
    '[.statistics-page_&_tbody_tr:last-child_th]:font-bold',
    '[.statistics-page_&_tbody_tr:last-child_th]:text-foreground',
    '[.statistics-page_&_tbody_tr:last-child_th]:shadow-[inset_3px_0_hsl(var(--muted-foreground)_/_0.5)]',
    '[&_th:first-child]:w-[30%] [&_td]:align-middle max-[639.01px]:[.statistics-page_&_th]:px-1.5',
    'max-[639.01px]:[.statistics-page_&_td]:px-1.5',
  ].join(' '),
  metricValue: [
    'statistics-metric-value text-foreground text-[length:1.875rem] font-[750] leading-[1.15]',
    '@max-[175px]/statistics-metric:text-[length:1.25rem]',
    '@max-[115px]/statistics-metric:text-[length:1rem]',
    '@max-[90px]/statistics-metric:text-[length:0.875rem]',
  ].join(' '),
  recordNumber:
    'statistics-record-number inline-block min-w-[3ch] text-right tabular-nums tracking-normal',
  recordSuffix: 'inline-block w-[1em] text-[0.5em] font-medium tracking-normal',
  activity: [
    'statistics-activity min-w-0 p-3.5 border-b border-b-[color:var(--statistics-line)] flex flex-col justify-center',
    'bg-[var(--statistics-activity-surface)] @min-[800px]/statistics-dashboard:border-b-0',
    '@min-[800px]/statistics-dashboard:border-r',
    '@min-[800px]/statistics-dashboard:border-r-[color:var(--statistics-line)] max-[639.01px]:p-3',
  ].join(' '),
  calendar: 'statistics-calendar h-36 w-full min-w-0 max-[639.01px]:h-30',
  calendarLegend:
    'statistics-calendar-legend flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5 text-[length:0.625rem] text-muted-foreground',
  calendarScale: [
    'statistics-calendar-scale w-16 h-1.5 rounded-[2px]',
    'bg-[linear-gradient(_to_right,var(--statistics-activity-1),var(--statistics-activity-2),var(--statistics-activity-3),var(--statistics-activity-4),var(--statistics-activity-5),var(--statistics-activity-6),var(--statistics-activity-7),var(--statistics-activity-8)_)]',
  ].join(' '),
  dashboardLists:
    'statistics-dashboard-lists grid gap-6 grid-cols-1 @min-[800px]/statistics-dashboard:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]',
  ledger:
    'statistics-ledger min-w-0 border border-[color:var(--statistics-line)] rounded-[0.625rem] bg-card overflow-hidden',
  card: 'statistics-card [.statistics-page_&]:border-[color:var(--statistics-line)] [.statistics-page_&]:rounded-[0.625rem] [.statistics-page_&]:shadow-none',
  metric: [
    'statistics-metric @container/statistics-metric min-w-0 w-full tabular-nums [.statistics-deck-records>&]:py-2 [.statistics-deck-records>&]:px-2.5',
    '[.statistics-deck-records>&]:rounded-lg [.statistics-deck-records>&]:bg-muted/45',
  ].join(' '),
  metricHorizontal: 'statistics-metric-horizontal min-w-20',
  metricLabel: 'statistics-metric-label block mb-1 text-[length:0.6875rem] text-muted-foreground',
  metricMain:
    'statistics-metric-main flex items-baseline justify-between flex-wrap gap-y-0.5 gap-x-2',
  rate: [
    'statistics-rate py-0.5 px-1.5 rounded-md text-[length:0.75rem] font-[650] text-muted-foreground',
    'data-[tone=positive]:text-[color:var(--statistics-positive)]',
    'data-[tone=positive]:bg-[color-mix(in_srgb,var(--statistics-positive)_10%,transparent)]',
    'data-[tone=negative]:text-[color:var(--statistics-negative)]',
    'data-[tone=negative]:bg-[color-mix(in_srgb,var(--statistics-negative)_10%,transparent)]',
    'data-[tone=draw]:text-[color:var(--statistics-draw)]',
    'data-[tone=draw]:bg-[color-mix(in_srgb,var(--statistics-draw)_10%,transparent)]',
    'max-[639.01px]:[.statistics-periods_&]:text-[length:0.6875rem]',
  ].join(' '),
  metricRecord:
    'statistics-metric-record block mt-0.5 text-[length:0.6875rem] leading-[1.4] text-muted-foreground',
  recordWins:
    'inline-flex items-baseline gap-0.5 statistics-record-wins text-[color:var(--statistics-positive)] font-semibold',
  recordLosses:
    'inline-flex items-baseline gap-0.5 statistics-record-losses text-[color:var(--statistics-negative)] font-semibold',
  recordDraws:
    'inline-flex items-baseline gap-0.5 statistics-record-draws text-[color:var(--statistics-draw)] font-semibold',
  deckRecords:
    'statistics-deck-records grid grid-cols-2 gap-2 [.statistics-leader-main>&]:flex-[1_1_14rem]',
  deckRow: 'statistics-deck-row relative flex flex-wrap items-center gap-4 p-4',
  deckEntry:
    'statistics-deck-entry min-w-0 bg-card border-b border-b-[color:var(--statistics-line)] last:border-b-0 hover:bg-muted/20',
  leaderEntry:
    'statistics-leader-entry min-w-0 bg-card border-b border-b-[color:var(--statistics-line)] last:border-b-0 p-3.5 @container/statistics-leader',
  deckLink: [
    "statistics-deck-link after:content-[''] after:absolute after:inset-0 after:z-1 focus-visible:outline-none",
    '[&:focus-visible::after]:outline-[2px] [&:focus-visible::after]:outline-[color:var(--workspace-accent)]',
    '[&:focus-visible::after]:-outline-offset-2 [.statistics-related-deck_&]:font-medium',
  ].join(' '),
  leaderMain:
    'statistics-leader-main flex items-center flex-wrap gap-3.5 @max-[380.01px]/statistics-leader:gap-x-2',
  leaderLink: 'statistics-leader-link flex-none',
  recentDecks: [
    'statistics-recent-decks mt-2.5 [&>summary]:flex [&>summary]:items-center [&>summary]:gap-1.5 [&>summary]:w-fit',
    '[&>summary]:py-0.5 [&>summary]:px-0 [&>summary]:cursor-pointer [&>summary]:list-none',
    '[&>summary]:text-muted-foreground [&>summary]:text-[length:0.6875rem]',
    '[&>summary::-webkit-details-marker]:hidden [&>summary:hover]:text-[color:var(--workspace-accent)]',
    '[&>summary:focus-visible]:outline-[2px] [&>summary:focus-visible]:outline-[color:var(--workspace-accent)]',
    '[&>summary:focus-visible]:outline-offset-2 [&>summary:focus-visible]:rounded-[3px]',
    '[&[open]>summary_svg]:transform-[rotate(180deg)]',
  ].join(' '),
  relatedDeck:
    'statistics-related-deck py-2 px-0 border-t border-t-[color:var(--statistics-line)] mt-1.5',
  matchRow: [
    'statistics-match-row [--statistics-result:hsl(var(--muted-foreground))] min-w-0 w-full border-b',
    'border-b-[color:var(--statistics-line)] border-l-[3px] border-l-[color:var(--statistics-result)]',
    'bg-[linear-gradient(_110deg,color-mix(in_srgb,var(--statistics-result)_7%,transparent),transparent_70%_)]',
    'data-[result=3]:[--statistics-result:var(--statistics-positive)]',
    'data-[result=0]:[--statistics-result:var(--statistics-negative)]',
    'data-[result=1]:[--statistics-result:var(--statistics-draw)] last:border-b-0',
  ].join(' '),
  match: 'statistics-match @container/statistics-match',
  matchMain: [
    'statistics-match-main grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 pt-3 pr-3.5 pb-1.5',
    'pl-3.5 @max-[380.01px]/statistics-match:gap-2 @max-[380.01px]/statistics-match:px-2.5',
  ].join(' '),
  matchMainWithMeta: [
    'grid-cols-[auto_auto_auto_minmax(0,1fr)]',
    '@min-[520px]/statistics-match:gap-x-4 @min-[560px]/statistics-match:gap-x-6',
    '@min-[640px]/statistics-match:gap-x-8',
    '@max-[480px]/statistics-match:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
    '@max-[480px]/statistics-match:gap-y-2',
  ].join(' '),
  matchIdentity: [
    'statistics-match-player flex flex-col self-start items-start gap-1 min-w-0 [&>.statistics-match-player-name]:max-w-27',
    '@max-[320px]/statistics-match:[&>.statistics-match-player-name]:max-w-22',
  ].join(' '),
  matchOpponent: [
    'statistics-match-player flex flex-col self-start items-end gap-1 min-w-0 text-right [&>.statistics-match-player-name]:max-w-27',
    '@max-[320px]/statistics-match:[&>.statistics-match-player-name]:max-w-22',
  ].join(' '),
  matchMetaCompact: [
    'statistics-match-meta-compact flex min-w-0 flex-col items-start gap-1.5 text-[10px] text-muted-foreground',
    '[&_.statistics-game-results]:ml-0 [&_.statistics-game-results]:flex-wrap',
    '@max-[480px]/statistics-match:col-span-3 @max-[480px]/statistics-match:flex-row',
    '@max-[480px]/statistics-match:flex-wrap @max-[480px]/statistics-match:items-center',
    '@max-[480px]/statistics-match:gap-x-2 @max-[480px]/statistics-match:gap-y-1',
  ].join(' '),
  matchPlayer: [
    'statistics-match-player flex items-center gap-3 min-w-0 last:flex-row-reverse last:text-right',
    '@max-[550.01px]/statistics-match:flex-col @max-[550.01px]/statistics-match:gap-2',
    '@max-[550.01px]/statistics-match:items-start @max-[550.01px]/statistics-match:last:flex-col',
    '@max-[550.01px]/statistics-match:last:items-end',
  ].join(' '),
  matchPlayerName:
    'statistics-match-player-name min-w-0 wrap-anywhere text-[11px] leading-tight',
  matchScore: [
    'statistics-match-score flex flex-col items-center gap-1 min-w-20 text-[color:var(--statistics-result)]',
    'text-[length:0.6875rem] font-semibold [&>span]:leading-[1.2] @max-[380.01px]/statistics-match:min-w-17',
  ].join(' '),
  scoreNumber: [
    'statistics-score-number pt-0 pr-1 pb-1 pl-1 border-b-[3px] border-b-[color:var(--statistics-result)]',
    'text-[length:2.25rem] leading-[1] font-[750] tracking-[-0.045em] tabular-nums whitespace-nowrap text-foreground',
    '@max-[380.01px]/statistics-match:text-[length:1.875rem]',
  ].join(' '),
  matchMeta:
    'statistics-match-meta flex items-center justify-start flex-wrap gap-y-1.5 gap-x-2.5 pt-0.5 pr-3.5 pb-2 pl-3.5 text-muted-foreground text-[length:0.625rem]',
  gameResults: 'statistics-game-results inline-flex gap-1 ml-auto',
  gameResult: [
    'statistics-game-result inline-flex min-w-5 items-center justify-center py-0.5 px-1 rounded-[3px] bg-muted',
    'data-[result=3]:text-[color:var(--statistics-positive)]',
    'data-[result=3]:bg-[color-mix(in_srgb,var(--statistics-positive)_12%,transparent)]',
    'data-[result=0]:text-[color:var(--statistics-negative)]',
    'data-[result=0]:bg-[color-mix(in_srgb,var(--statistics-negative)_12%,transparent)]',
    'data-[result=1]:text-[color:var(--statistics-draw)]',
    'data-[result=1]:bg-[color-mix(in_srgb,var(--statistics-draw)_12%,transparent)]',
  ].join(' '),
  member: 'statistics-member @container/statistics-member',
  memberTrigger:
    'statistics-member-trigger grid grid-cols-[1rem_2rem_minmax(0,1fr)_auto] @max-[520.01px]/statistics-member:grid-cols-[1rem_2rem_minmax(0,1fr)]',
  memberRecord:
    'statistics-member-record @max-[520.01px]/statistics-member:col-[3] @max-[520.01px]/statistics-member:justify-start',
  deckRecordsCompact: 'statistics-deck-records-compact max-[639.01px]:hidden',
} as const;
