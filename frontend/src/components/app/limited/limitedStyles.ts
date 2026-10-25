// Shared Tailwind utilities for this feature. Marker classes scope contextual states.
export const limitedStyles = {
  page: [
    'limited-page [--primary:149_32%_29%] [--primary-foreground:0_0%_100%] [--ring:149_32%_29%]',
    '[--limited-accent:#326149] [--limited-soft:#eef2e9] [--limited-border:#d9e1d2] [--limited-contrast:#fff]',
    'min-w-0 dark:[--primary:97_34%_75%] dark:[--primary-foreground:164_39%_15%] dark:[--ring:97_34%_75%]',
    'dark:[--limited-accent:#b9d4a8] dark:[--limited-soft:#1d2720] dark:[--limited-border:#364437]',
    'dark:[--limited-contrast:#17352e] [&_[data-slot=toggle-group-item][data-state=on]]:bg-[var(--limited-soft)]',
    '[&_[data-slot=toggle-group-item][data-state=on]]:text-[color:var(--limited-accent)]',
    '[&_[data-slot=toggle-group-item][data-state=on]]:shadow-[inset_0_0_0_1px_var(--limited-border)]',
    '[&_[role=group]>button[data-state=on]]:bg-[var(--limited-soft)]',
    '[&_[role=group]>button[data-state=on]]:text-[color:var(--limited-accent)]',
    '[&_[role=group]>button[data-state=on]]:shadow-[inset_0_0_0_1px_var(--limited-border)]',
  ].join(' '),
  title: [
    'limited-title m-0! p-0! border-0! text-[length:1.375rem]! leading-[1.4]! font-[650]! tracking-[-0.035em]!',
    'wrap-anywhere [.limited-landing_&]:text-[length:1.75rem]!',
  ].join(' '),
  heading:
    'limited-heading m-0! p-0! border-0! text-[length:0.9375rem]! leading-[1.5]! font-semibold!',
  panel: 'limited-panel min-w-0 border border-[color:var(--limited-border)] rounded-xl bg-card',
  primary:
    'limited-primary bg-[var(--limited-accent)] text-[color:var(--limited-contrast)] hover:opacity-90',
  segments: [
    'limited-segments [&_button[data-state=on]]:bg-[var(--limited-soft)]',
    '[&_button[data-state=on]]:text-[color:var(--limited-accent)]',
    '[&_button[data-state=on]]:shadow-[inset_0_0_0_1px_var(--limited-border)] justify-start flex-wrap gap-1',
    '[&_button]:h-8 [&_button]:text-[length:0.8125rem] [&_button]:px-2.5 [.limited-deck-create_&]:grid',
    '[.limited-deck-create_&]:grid-cols-3 [.limited-deck-create_&]:gap-0.5 [.limited-deck-create_&]:border',
    '[.limited-deck-create_&]:border-[color:var(--limited-border)] [.limited-deck-create_&]:rounded-lg',
    '[.limited-deck-create_&]:p-0.75 [.limited-deck-create_&]:bg-card [.limited-deck-create_&_button]:px-0',
    '[.limited-deck-create_&_button]:text-[length:0.75rem]',
  ].join(' '),
  poolTable:
    'limited-pool-table [&_th]:bg-[var(--limited-soft)] [&_th]:text-[color:var(--limited-accent)] [&_a:hover]:text-[color:var(--limited-accent)]',
  builder:
    'limited-builder flex flex-col h-dvh overflow-hidden max-[1023.01px]:h-auto max-[1023.01px]:min-h-dvh max-[1023.01px]:overflow-visible',
  builderWorkspace:
    'limited-builder-workspace flex flex-1 min-h-0 min-w-0 gap-2 max-[1023.01px]:flex-col',
  builderFilters: [
    'limited-builder-filters flex-[0_0_320px] min-w-0 overflow-y-auto border-r',
    'border-r-[color:var(--limited-border)] pr-2 max-[1023.01px]:basis-auto max-[1023.01px]:max-h-[40dvh]',
    'max-[1023.01px]:border-r-0 max-[1023.01px]:border-b max-[1023.01px]:border-b-[color:var(--limited-border)]',
    'max-[1023.01px]:pt-0 max-[1023.01px]:pr-0 max-[1023.01px]:pb-2 max-[1023.01px]:pl-0',
  ].join(' '),
  builderCards:
    'limited-builder-cards grid grid-cols-[minmax(0,1fr)_280px] flex-1 min-h-0 min-w-0 gap-2 max-[1023.01px]:grid-cols-1',
  categoryFilters: [
    'limited-category-filters [.limited-builder_&_button[aria-pressed=true]]:bg-[var(--limited-accent)]',
    '[.limited-builder_&_button[aria-pressed=true]]:text-[color:var(--limited-contrast)]',
  ].join(' '),
  customEntry:
    'limited-custom-entry [&_p]:my-1.5 [&_p]:mx-0 [&_p]:text-[length:0.75rem] [&_p]:leading-[1.5]!',
  landing: 'limited-landing [&_p]:leading-[1.5]!',
  landingLayout: [
    'limited-landing-layout grid grid-cols-[320px_minmax(0,1fr)] gap-6 items-start',
    'max-[1100.01px]:grid-cols-[280px_minmax(0,1fr)] max-[1100.01px]:gap-4 max-[900.01px]:grid-cols-1',
  ].join(' '),
  poolBrowser: 'limited-pool-browser @container',
  dailyLink: [
    'limited-daily-link inline-flex items-center gap-2 py-2.5 px-3 border border-[color:var(--limited-border)]',
    'rounded-[0.625rem] text-[color:var(--limited-accent)] bg-[var(--limited-soft)] text-[length:0.8125rem]',
    'font-medium hover:bg-card focus-visible:outline-[2px] focus-visible:outline-[color:var(--limited-accent)]',
    'focus-visible:outline-offset-3',
  ].join(' '),
  poolCard: [
    'limited-pool-card focus-visible:outline-[2px] focus-visible:outline-[color:var(--limited-accent)]',
    'focus-visible:outline-offset-3 block min-w-0 overflow-hidden border border-[color:var(--limited-border)]',
    'rounded-[0.875rem] bg-card transition-[border-color,box-shadow] duration-160 ease-[ease]',
    'hover:border-[color:var(--limited-accent)] hover:shadow-[0_5px_18px_-12px_#173b3070]',
    'motion-reduce:transition-none',
  ].join(' '),
  createCover: [
    'limited-create-cover relative overflow-hidden isolate bg-[#173b30] text-[color:#fff] after:absolute',
    "after:inset-0 after:z-1 after:content-[''] after:bg-[linear-gradient(90deg,#173b30_8%,#173b30e8_38%,#173b3010)]",
  ].join(' '),
  setArt: [
    'limited-set-art absolute -top-3 -right-5.5 -bottom-3 left-[27%] flex gap-1.25 transform-[rotate(12deg)]',
    'opacity-85 [&>svg]:h-full [&>svg]:w-[48%] [&>svg]:shrink-0 [&>svg:nth-child(2)]:transform-[translateY(-12px)]',
    'max-[900.01px]:[.limited-create-cover_&]:left-[40%] max-phone:[.limited-create-cover_&]:left-[27%]',
  ].join(' '),
  poolGrid:
    'limited-pool-grid grid grid-cols-2 gap-3.5 @min-[1000px]:grid-cols-3 max-phone:grid-cols-1',
  recentGrid: 'limited-recent-grid grid grid-cols-2 gap-3.5 @max-[520.01px]:grid-cols-1',
  leaderFan: [
    'limited-leader-fan relative @container isolate h-34 overflow-hidden',
    'bg-[radial-gradient(ellipse_at_50%_0,hsl(var(--card)_/_0.4),transparent_70%)] bg-[var(--limited-soft)]',
    '[.limited-pool-card-compact_&]:w-26.25 [.limited-pool-card-compact_&]:h-auto',
    '[.limited-pool-card-compact_&]:min-h-24.5 [.limited-pool-card-compact_&]:shrink-0',
    '[.limited-pool-card-compact_&>div]:flex-col [.limited-pool-card-compact_&>div]:p-2',
    '[.limited-pool-card-compact_&>div]:text-center [.limited-pool-card-compact_&>div>span]:hidden',
  ].join(' '),
  fanCard: [
    'limited-fan-card absolute top-3.75 left-1/2 w-[min(42cqi,124px)] aspect-[1.4] rounded-[5px] bg-muted',
    'shadow-[-3px_4px_8px_#12251b35]',
    'transform-[translate(calc(-50%_+_var(--position)_*_25cqi),var(--drop))_rotate(var(--angle))] origin-[50%_110%]',
    'transition-[top] duration-180 ease-[ease] [.limited-pool-card:hover_&]:top-2.25',
    '[.limited-pool-card:focus-visible_&]:top-2.25 [&>img]:block [&>img]:w-full [&>img]:h-full',
    '[&>img]:rounded-[inherit] [.limited-pool-card-compact_&]:top-6.25 [.limited-pool-card-compact_&]:w-[68cqi]',
    'motion-reduce:transition-none',
  ].join(' '),
  fanPlaceholder:
    'limited-fan-placeholder w-full h-full rounded-[inherit] grid place-items-center text-[color:var(--limited-accent)] border border-[color:var(--limited-border)]',
  fanCopies: [
    'limited-fan-copies absolute top-1.25 left-1.25 py-0 px-1 border border-[color:#ffffff80] rounded-[3px]',
    'bg-[#15251de8] text-white text-[length:9px] leading-[16px]',
  ].join(' '),
  poolCardCopy:
    'limited-pool-card-copy min-w-0 py-3 px-3.5 [.limited-pool-card-compact_&]:flex-1 [.limited-pool-card-compact_&]:p-2.5',
  poolCardName:
    'limited-pool-card-name line-clamp-2 overflow-hidden wrap-anywhere text-[length:0.875rem] font-semibold leading-[1.4]',
  poolCardCompact: 'limited-pool-card-compact flex items-stretch',
  deckCreate: [
    'limited-deck-create p-4 bg-[linear-gradient(145deg,var(--limited-soft),hsl(var(--card))_85%)] border',
    'border-[color:var(--limited-border)] rounded-xl [&_input]:bg-card [&_p]:leading-[1.5]!',
  ].join(' '),
  deckCard: [
    'limited-deck-card grid grid-cols-[98px_minmax(0,1fr)] relative min-w-0 border',
    'border-[color:var(--limited-border)] rounded-xl bg-card overflow-hidden',
    'hover:border-[color:var(--limited-accent)] focus-within:border-[color:var(--limited-accent)]',
  ].join(' '),
  deckCardArt: [
    'limited-deck-card-art flex min-h-24.5 h-full items-center justify-center',
    'bg-[radial-gradient(ellipse_at_50%_100%,var(--limited-soft),transparent_85%)]',
    '[&_.deck-artwork]:transform-[scale(0.86)]',
  ].join(' '),
  deckCardLink: [
    "limited-deck-card-link after:absolute after:inset-0 after:z-1 after:content-[''] focus-visible:outline-none",
    '[&:focus-visible::after]:outline-[2px] [&:focus-visible::after]:outline-[color:var(--limited-accent)]',
    '[&:focus-visible::after]:-outline-offset-3 [&:focus-visible::after]:rounded-xl',
  ].join(' '),
  decksColumn: 'limited-decks-column [&_p]:leading-[1.5]!',
} as const;
