// Shared Tailwind utilities for this feature. Marker classes scope contextual states.
export const competitionStyles = {
  page: [
    'competition-page [--competition-accent:#326149] [--competition-soft:#eef2e9] [--competition-border:#d9e1d2]',
    '[--competition-bar-label:#fff] dark:[--competition-accent:#b9d4a8] dark:[--competition-soft:#1d2720]',
    'dark:[--competition-border:#364437] dark:[--competition-bar-label:#17352e] min-w-0 w-full',
  ].join(' '),
  mainNav: [
    'competition-main-nav [--competition-accent:#326149] [--competition-soft:#eef2e9] [--competition-border:#d9e1d2]',
    '[--competition-bar-label:#fff] dark:[--competition-accent:#b9d4a8] dark:[--competition-soft:#1d2720]',
    'dark:[--competition-border:#364437] dark:[--competition-bar-label:#17352e] [&>a]:flex [&>a]:items-center',
    '[&>a]:justify-center [&>a]:min-w-0 [&>a]:min-h-15 [&>a]:py-2 [&>a]:px-3 [&>a]:border',
    '[&>a]:border-[color:var(--competition-border)] [&>a]:rounded-[10px] [&>a]:bg-[var(--competition-soft)]',
    '[&>a]:text-[color:var(--competition-accent)] [&>a]:text-[length:18px] [&>a]:font-[550] [&>a]:leading-[1.3]',
    '[&>a]:text-center [&>a]:transition-[background,border-color] [&>a]:duration-150 [&>a]:ease-[ease]',
    '[&>a:hover]:border-[color:var(--competition-accent)] [&>a[aria-current=page]]:bg-[#173b30]',
    '[&>a[aria-current=page]]:text-[color:#f6f8ee] [&>a[aria-current=page]]:border-[color:#173b30]',
    '[&>a[aria-current=page]]:font-[650] dark:[&>a[aria-current=page]]:bg-[#b9d4a8]',
    'dark:[&>a[aria-current=page]]:text-[color:#17352e] dark:[&>a[aria-current=page]]:border-[color:#b9d4a8]',
    '[&>a:focus-visible]:outline-[2px] [&>a:focus-visible]:outline-ring [&>a:focus-visible]:outline-offset-3',
    'motion-reduce:[&>a]:transition-none',
  ].join(' '),
  tabs: [
    'competition-tabs [--competition-accent:#326149] [--competition-soft:#eef2e9] [--competition-border:#d9e1d2]',
    '[--competition-bar-label:#fff] dark:[--competition-accent:#b9d4a8] dark:[--competition-soft:#1d2720]',
    'dark:[--competition-border:#364437] dark:[--competition-bar-label:#17352e] bg-[var(--competition-soft)]',
    'shadow-[inset_0_0_0_1px_var(--competition-border)] [&_a]:text-muted-foreground [&_a]:rounded-md',
    '[&_a:hover]:text-[color:var(--competition-accent)] [&_a[aria-current=page]]:bg-card',
    '[&_a[aria-current=page]]:text-[color:var(--competition-accent)]',
    '[&_a[aria-current=page]]:shadow-[0_1px_3px_#00000012]',
  ].join(' '),
  meta: [
    'competition-meta [--competition-accent:#326149] [--competition-soft:#eef2e9] [--competition-border:#d9e1d2]',
    '[--competition-bar-label:#fff] dark:[--competition-accent:#b9d4a8] dark:[--competition-soft:#1d2720]',
    'dark:[--competition-border:#364437] dark:[--competition-bar-label:#17352e] max-tablet-small:[&>div>div]:min-w-0',
  ].join(' '),
  header: [
    'competition-header [&_h3]:text-foreground [&_h3]:tracking-[-0.025em]!',
    '[&_[role=combobox]]:border-[color:var(--competition-border)] [&_[role=combobox]]:bg-card',
    '[&_[role=combobox]]:rounded-lg',
  ].join(' '),
  mobileHeader: [
    'competition-mobile-header [&_[role=combobox]]:border-[color:var(--competition-border)]',
    '[&_[role=combobox]]:bg-card [&_[role=combobox]]:rounded-lg [&>*]:border-[color:var(--competition-border)]',
    '[&>*]:rounded-lg',
  ].join(' '),
  mainNavMobile: [
    'competition-main-nav-mobile flex gap-2 [&>a]:flex-1 [&>a]:min-h-13 [&>button]:w-13 [&>button]:h-13',
    '[&>button]:rounded-[10px] [&>button]:border-[color:var(--competition-border)]',
  ].join(' '),
  analysisControls: [
    'competition-analysis-controls [&_[data-state=on]]:bg-[var(--competition-soft)]',
    '[&_[data-state=on]]:text-[color:var(--competition-accent)]',
    '[&_[data-state=on]]:shadow-[inset_0_0_0_1px_var(--competition-border)]',
    'max-tablet-small:[&_[role=group]]:flex-wrap',
  ].join(' '),
  methodology: [
    'competition-methodology bg-[var(--competition-soft)] border-[color:var(--competition-border)]',
    'text-muted-foreground dark:bg-[var(--competition-soft)] dark:border-[color:var(--competition-border)] dark:text-muted-foreground [&>svg]:shrink-0 [&>svg]:text-[color:var(--competition-accent)]',
  ].join(' '),
  group:
    'competition-group bg-[var(--competition-soft)] rounded-[10px] shadow-[inset_0_0_0_1px_var(--competition-border)]',
  eventCard: [
    'competition-event-card rounded-lg shadow-[0_1px_2px_#00000008] transition-[border-color] duration-150',
    'ease-[ease] hover:border-[color:var(--competition-accent)] motion-reduce:transition-none',
  ].join(' '),
  filterDisclosure:
    'competition-filter-disclosure [&>*]:border-[color:var(--competition-border)] [&>*]:rounded-lg',
} as const;
