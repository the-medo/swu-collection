// Shared Tailwind utilities for this feature. Marker classes scope contextual states.
export const browseStyles = {
  page: [
    'browse-page [--browse-accent:#326149] [--browse-soft:#eef2e9] [--browse-border:#d9e1d2] flex flex-col gap-5',
    'w-full min-w-0 max-w-380 my-0 mx-auto pt-4 pr-6 pb-10 pl-6 dark:[--browse-accent:#b9d4a8]',
    'dark:[--browse-soft:#1d2720] dark:[--browse-border:#364437] [&_a:focus-visible]:outline-[2px]',
    '[&_a:focus-visible]:outline-ring [&_a:focus-visible]:outline-offset-4 max-mobile:pt-3 max-mobile:pr-3',
    'max-mobile:pb-8 max-mobile:pl-3 max-mobile:gap-4',
  ].join(' '),
  header: [
    'browse-header flex flex-wrap items-end justify-between gap-6 pt-6 pr-0 pb-1 pl-0 [&_h1]:m-0! [&_h1]:p-0!',
    '[&_h1]:border-0! [&_h1]:text-[length:clamp(28px,3vw,40px)]! [&_h1]:font-[650]! [&_h1]:tracking-[-0.045em]!',
    '[&_h1]:leading-[1.15]! [&_h1]:wrap-anywhere max-mobile:pt-3 max-mobile:gap-5',
  ].join(' '),
  headerCopy: 'browse-header-copy grid gap-3 min-w-0 flex-[1_1_320px]',
  eyebrow: [
    'browse-eyebrow flex items-center gap-2 text-[color:var(--browse-accent)] text-[length:10px] font-[650]',
    'tracking-[0.17em] uppercase [.browse-header-hero_&]:text-[color:#dce7a0]',
  ].join(' '),
  description:
    'browse-description max-w-160 text-muted-foreground text-[length:14px] leading-[1.7]! [.browse-header-hero_&]:text-[color:#fffaf0cc]',
  headerActions: 'browse-header-actions flex flex-wrap items-center gap-2',
  headerHero: [
    'browse-header-hero border border-[color:#344c43] rounded-3xl p-9 text-[color:#fffaf0]',
    'bg-[radial-gradient(ellipse_at_top_right,#79936b30,transparent_65%)] bg-[#17352e] max-mobile:p-6',
  ].join(' '),
  tabs: [
    'browse-tabs flex flex-wrap gap-1.5 border-b border-b-[color:var(--browse-border)] pb-3 [&_a]:inline-flex',
    '[&_a]:items-center [&_a]:gap-2 [&_a]:rounded-[10px] [&_a]:py-2.5 [&_a]:px-3.5 [&_a]:text-[length:13px]',
    '[&_a]:text-muted-foreground [&_a:hover]:bg-[var(--browse-soft)] [&_a:hover]:text-[color:var(--browse-accent)]',
    '[&_a[aria-current=page]]:bg-[var(--browse-soft)] [&_a[aria-current=page]]:text-[color:var(--browse-accent)]',
    '[&_a[aria-current=page]]:font-semibold max-mobile:[&_a]:p-2.5 max-mobile:[&_a]:text-[length:12px]',
  ].join(' '),
  panel: 'browse-panel min-w-0 border border-border rounded-[20px] bg-card p-6 max-mobile:p-5',
  sectionHeading: [
    'browse-section-heading flex flex-wrap items-center justify-between gap-3 mb-5 [.browse-page_&_h2]:m-0!',
    '[.browse-page_&_h2]:p-0! [.browse-page_&_h2]:border-0! [.browse-page_&_h2]:text-[length:22px]!',
    '[.browse-page_&_h2]:font-semibold! [.browse-page_&_h2]:tracking-[-0.035em]! [.browse-page_&_h2]:leading-[1.3]!',
  ].join(' '),
  empty: [
    'browse-empty [.browse-page_&_h2]:m-0! [.browse-page_&_h2]:p-0! [.browse-page_&_h2]:border-0!',
    '[.browse-page_&_h2]:text-[length:22px]! [.browse-page_&_h2]:font-semibold!',
    '[.browse-page_&_h2]:tracking-[-0.035em]! [.browse-page_&_h2]:leading-[1.3]! flex flex-col items-center gap-4',
    'border border-[color:var(--browse-border)] rounded-[20px] bg-card py-12 px-6 text-center [&_p]:m-0',
    '[&_p]:max-w-110 [&_p]:text-[length:14px] [&_p]:text-muted-foreground [&_p]:leading-[1.7]!',
  ].join(' '),
  icon: [
    'browse-icon inline-flex items-center justify-center w-11 h-11 border border-[color:var(--browse-border)]',
    'rounded-[14px] bg-[var(--browse-soft)] text-[color:var(--browse-accent)] shrink-0',
  ].join(' '),
  toolbar:
    'browse-toolbar flex flex-wrap items-center gap-3 min-w-0 border border-[color:var(--browse-border)] rounded-2xl bg-card p-4',
  table: [
    'browse-table min-w-0 w-full [.browse-page_&>.rounded-md]:overflow-x-auto [.browse-page_&>div]:rounded-2xl',
    '[.browse-page_&>div]:bg-card [.browse-page_&_thead]:bg-[var(--browse-soft)] [.browse-page_&_th]:py-3.5',
    '[.browse-page_&_th]:px-3 [.browse-page_&_th]:text-[color:var(--browse-accent)]',
    '[.browse-page_&_th]:text-[length:11px] [.browse-page_&_th]:font-semibold [.browse-page_&_th]:whitespace-nowrap',
    '[.browse-page_&_td]:p-3 [.browse-page_&_tbody_tr:hover]:bg-[var(--browse-soft)]',
    '[.browse-page_&>.space-y-4>.border]:rounded-2xl [.browse-page_&>.space-y-4>.border]:shadow-none',
    '[.browse-page_&_a]:underline-offset-4 [.browse-page_&_a:hover]:text-[color:var(--browse-accent)]',
  ].join(' '),
  collectionListTable:
    'collection-list-table [.browse-page_&_td:first-child]:min-w-55 [.browse-page_&_td:not(:first-child)]:whitespace-nowrap',
  folderTable: [
    'browse-folder-table [.browse-page_&>div>table>thead]:bg-[var(--browse-soft)]',
    '[.browse-page_&>div>table>thead_th]:h-11 [.browse-page_&>div>table>thead_th]:text-[color:var(--browse-accent)]',
    '[.browse-page_&>div>table>thead_th]:text-[length:11px] [.browse-page_&>div>table>thead_th]:font-semibold',
    'max-mobile:[.browse-page_&>div>table>thead]:absolute max-mobile:[.browse-page_&>div>table>thead]:w-0.25',
    'max-mobile:[.browse-page_&>div>table>thead]:h-0.25 max-mobile:[.browse-page_&>div>table>thead]:overflow-hidden',
    'max-mobile:[.browse-page_&>div>table>thead]:[clip-path:inset(50%)]',
    'max-mobile:[.browse-page_&>div>table>tbody]:block max-mobile:[.browse-page_&>div>table>tbody]:w-full',
    'max-mobile:[.browse-page_&>div>table>tbody>tr]:block max-mobile:[.browse-page_&>div>table>tbody>tr]:w-full',
    'max-mobile:[.browse-page_&>div>table>tbody>tr>td]:block',
    'max-mobile:[.browse-page_&>div>table>tbody>tr>td]:w-full',
    'max-mobile:[.browse-page_&>div>table>tbody>tr:has(>td>div>button[aria-expanded])]:grid',
    'max-mobile:[.browse-page_&>div>table>tbody>tr:has(>td>div>button[aria-expanded])]:grid-cols-[minmax(0,1fr)_auto_auto]',
    'max-mobile:[.browse-page_&>div>table>tbody>tr:has(>td>div>button[aria-expanded])]:h-auto',
    'max-mobile:[.browse-page_&>div>table>tbody>tr:has(>td>div>button[aria-expanded])]:p-2',
    'max-mobile:[.browse-page_&>div>table>tbody>tr:has(>td>div>button[aria-expanded])>td:first-child]:col-span-full',
  ].join(' '),
  deckFilterPanel: [
    'deck-filter-panel [.browse-page_&]:rounded-2xl [.browse-page_&]:border-[color:var(--browse-border)]',
    '[.browse-page_&]:bg-card [.browse-page_&>h3]:m-0! [.browse-page_&>h3]:text-[length:14px]!',
    '[.browse-page_&>h3]:font-medium!',
  ].join(' '),
  deckFilters:
    'deck-filters [.browse-page_&]:p-4 [.browse-page_&]:gap-3 [.browse-page_.deck-filter-panel_&]:border-t [.browse-page_.deck-filter-panel_&]:border-t-border',
  collectionDetailLayout: [
    'collection-detail-layout [.browse-page_&]:grid [.browse-page_&]:gap-5',
    '[.browse-page_&]:grid-cols-[minmax(0,1fr)_400px] [.browse-page_&]:items-start',
    'max-[1100.01px]:[.browse-page_&]:grid-cols-1',
  ].join(' '),
  collectionDetailTools: [
    'collection-detail-tools [.browse-page_&]:grid [.browse-page_&]:gap-4 [.browse-page_&]:min-w-0',
    '[.browse-page_&>.border]:min-w-0 [.browse-page_&>.border]:rounded-2xl [.browse-page_&>.border]:shadow-none',
    'max-[1023.01px]:[.browse-page_&]:pt-4 max-mobile:[.browse-page_&]:grid-cols-1',
  ].join(' '),
  collectionToolsDisclosure:
    'collection-tools-disclosure [.browse-page_&]:min-w-0 max-[1100.01px]:[.browse-page_&]:-order-1',
} as const;
