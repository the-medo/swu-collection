import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronsRight,
  Clock,
  ExternalLink,
  GitMerge,
  GitPullRequest,
  Inbox,
  MessageSquare,
  Minus,
  MoreHorizontal,
  PanelRightOpen,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';

export const Route = createFileRoute('/review-mocks')({
  component: ReviewMocksPage,
});

const cardImageBase = 'https://images.swubase.com/cards';

const cards = {
  vader: {
    name: 'Darth Vader',
    subtitle: 'Dark Lord of the Sith',
    image: `${cardImageBase}/darth-vader--dark-lord-of-the-sith-10-spark-of-rebellion-front.webp`,
  },
  ecl: {
    name: 'Energy Conversion Lab',
    subtitle: 'Base',
    image: `${cardImageBase}/energy-conversion-lab-22-spark-of-rebellion-front.webp`,
  },
  iden: {
    name: 'Iden Versio',
    subtitle: 'Inferno Squad Commander',
    image: `${cardImageBase}/iden-versio--inferno-squad-commander-2-spark-of-rebellion-front.webp`,
  },
  dataVault: {
    name: 'Data Vault',
    subtitle: 'Base',
    image: `${cardImageBase}/data-vault-24-jump-to-lightspeed-front.webp`,
  },
  superlaser: {
    name: 'Superlaser Technician',
    subtitle: '3 to 1 copies',
    image: `${cardImageBase}/superlaser-technician---83-spark-of-rebellion-front.webp`,
  },
  probe: {
    name: 'Viper Probe Droid',
    subtitle: 'Added to main',
    image: `${cardImageBase}/viper-probe-droid-228-spark-of-rebellion-front.webp`,
  },
  choke: {
    name: 'Force Choke',
    subtitle: 'Note changed',
    image: `${cardImageBase}/force-choke-139-spark-of-rebellion-front.webp`,
  },
  barrage: {
    name: 'Overwhelming Barrage',
    subtitle: 'Sideboard candidate',
    image: `${cardImageBase}/overwhelming-barrage-92-spark-of-rebellion-front.webp`,
  },
  snowtrooper: {
    name: 'Snowtrooper Lieutenant',
    subtitle: 'Removed from sideboard',
    image: `${cardImageBase}/snowtrooper-lieutenant---227-spark-of-rebellion-front.webp`,
  },
};

const mockSummary = [
  { label: 'Cards', value: '4 changed' },
  { label: 'Details', value: '1 field' },
  { label: 'Feedback', value: '3 notes' },
  { label: 'Conflicts', value: '1 open' },
];

const concepts = [
  {
    id: 1,
    name: 'Card Gallery Diff',
    premise: 'Best for scanning visual card changes first, then details second.',
  },
  {
    id: 2,
    name: 'Three Column Merge Board',
    premise: 'Best for Git-style base/current/proposed conflict review.',
  },
  {
    id: 3,
    name: 'Deck Zone Heatmap',
    premise: 'Best for showing how changes affect main deck, sideboard, leader, and base zones.',
  },
  {
    id: 4,
    name: 'Reviewer Queue',
    premise: 'Best for fast approval work when there are many requests.',
  },
  {
    id: 5,
    name: 'Card Focus Lens',
    premise: 'Best for one-at-a-time detailed review with card art front and center.',
  },
  {
    id: 6,
    name: 'Change Timeline',
    premise: 'Best for understanding branch intent as a sequence of edits.',
  },
  {
    id: 7,
    name: 'Pinned Comment Canvas',
    premise: 'Best for leaving feedback directly on cards and changed quantities.',
  },
  {
    id: 8,
    name: 'Mobile Review Stack',
    premise: 'Best for phone-first review and thumb-friendly decisions.',
  },
  {
    id: 9,
    name: 'Impact Dashboard',
    premise: 'Best for competitive deck reviewers who care about curve/aspects/counts.',
  },
  {
    id: 10,
    name: 'Merge Decision Table',
    premise: 'Best for dense operational review with strong auditability.',
  },
];

const leaderBaseMocks = [
  { id: 1, name: 'Deck Page Rail', note: 'Left rail, large proposed card, small current card below.' },
  { id: 2, name: 'Hero Swap Pair', note: 'Two equal visual swap cards with a clear center arrow.' },
  { id: 3, name: 'Compact Filmstrip', note: 'Current and proposed as dense strips, good for small modals.' },
  { id: 4, name: 'Pinned Proposed', note: 'Proposal dominates; current card is a small anchored reference.' },
  { id: 5, name: 'Before Ghost', note: 'Current card appears behind the proposal as a muted ghost.' },
  { id: 6, name: 'Split Identity Board', note: 'Leader and base are separate lanes with matching rhythm.' },
  { id: 7, name: 'Gradient Shelf', note: 'Aspect gradient shelf with card art standing on the rail.' },
  { id: 8, name: 'Review Tokens', note: 'Card art plus strong current/proposal status tokens.' },
  { id: 9, name: 'Mini PR Header', note: 'Feels like a GitHub compare header for deck identity.' },
  { id: 10, name: 'Stacked Identity', note: 'Uses the same stack metaphor as the deck list.' },
  { id: 11, name: 'Bento Identity', note: 'Asymmetric bento layout: leader larger than base summary.' },
  { id: 12, name: 'Timeline Swap', note: 'Current to proposed runs vertically for quick reading.' },
  { id: 13, name: 'Focus Lens', note: 'Selected proposal large, current/base available as thumbnails.' },
  { id: 14, name: 'Aspect Ribbon', note: 'Thin color rail makes identity feel connected to deck aspects.' },
  { id: 15, name: 'Inline Diff Cards', note: 'Card image and name diff sit in one tight horizontal row.' },
  { id: 16, name: 'Comparison Tiles', note: 'Equal tiles, clear labels, best for unambiguous clicking.' },
  { id: 17, name: 'Commander Header', note: 'Leader/base treated like a commanding deck title block.' },
  { id: 18, name: 'Review Drawer', note: 'Narrow left drawer with details progressively disclosed.' },
  { id: 19, name: 'Card-First Table', note: 'Dense operational table with visual first column.' },
  { id: 20, name: 'Minimal Rail', note: 'Least chrome: art, arrow, status, and nothing extra.' },
];

const branchDisplayMocks = [
  { id: 1, name: 'Action Bar Chip', note: 'Tiny status chip in the deck action bar.' },
  { id: 2, name: 'Decklist Side Rail', note: 'Collapsed vertical rail beside the deck content.' },
  { id: 3, name: 'Owner Inbox Button', note: 'Single inbox control opens branch work on demand.' },
  { id: 4, name: 'Inline Title Badge', note: 'Count beside deck title, no separate panel.' },
  { id: 5, name: 'Floating Corner Tray', note: 'Small sticky tray that stays available while scrolling.' },
  { id: 6, name: 'Activity Row', note: 'One dense row under description with newest branch only.' },
  { id: 7, name: 'Navigation Tab Badge', note: 'Uses existing deck tabs and keeps details one click away.' },
  { id: 8, name: 'Compact Compare Cards', note: 'Two micro cards tucked into the left rail.' },
  { id: 9, name: 'More Menu Section', note: 'No persistent real estate, discoverable in the actions menu.' },
  { id: 10, name: 'Review Drawer Stub', note: 'A thin right-edge handle that expands into branch review.' },
];

const branchRows = [
  { name: 'Data Vault Branch: 60 Card Review', author: 'test-member', status: 'review requested' },
  { name: 'Branch of Codex Data Vault Review Seed Deck', author: 'test-member', status: 'draft' },
];

function ReviewMocksPage() {
  return (
    <>
      <Helmet title="Deck Review Mockups | SWUBase" />
      <div className="min-h-screen bg-background text-foreground">
        <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <h1 className="text-xl font-semibold">Team Deck Review Mockups</h1>
              <p className="text-sm text-muted-foreground">
                Ten visual directions plus a featured stacked-deck diff concept.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="#branch-display-mocks"
                className="rounded-md border bg-primary px-2.5 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
              >
                Branch display
              </a>
              <a
                href="#leader-base-mocks"
                className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted"
              >
                Leader/base
              </a>
              <a
                href="#stacked-deck-diff"
                className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted"
              >
                Stacked
              </a>
              {concepts.map(concept => (
                <a
                  key={concept.id}
                  href={`#mock-${concept.id}`}
                  className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted"
                >
                  {concept.id}
                </a>
              ))}
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
          <IntroPanel />
          <BranchDisplayMockGallery />
          <LeaderBaseMockGallery />
          <FeaturedStackedDeckDiff />
          <MockShell concept={concepts[0]}>
            <CardGalleryDiff />
          </MockShell>
          <MockShell concept={concepts[1]}>
            <ThreeColumnMergeBoard />
          </MockShell>
          <MockShell concept={concepts[2]}>
            <DeckZoneHeatmap />
          </MockShell>
          <MockShell concept={concepts[3]}>
            <ReviewerQueue />
          </MockShell>
          <MockShell concept={concepts[4]}>
            <CardFocusLens />
          </MockShell>
          <MockShell concept={concepts[5]}>
            <ChangeTimeline />
          </MockShell>
          <MockShell concept={concepts[6]}>
            <PinnedCommentCanvas />
          </MockShell>
          <MockShell concept={concepts[7]}>
            <MobileReviewStack />
          </MockShell>
          <MockShell concept={concepts[8]}>
            <ImpactDashboard />
          </MockShell>
          <MockShell concept={concepts[9]}>
            <MergeDecisionTable />
          </MockShell>
        </main>
      </div>
    </>
  );
}

function FeaturedStackedDeckDiff() {
  return (
    <section id="stacked-deck-diff" className="scroll-mt-20 rounded-md border bg-background">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge>Recommended</Badge>
            <h2 className="text-lg font-semibold">Stacked Deck Diff</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Uses the existing stacked deck-list visual language, with changes highlighted in-place.
          </p>
        </div>
        <Button size="sm">Use this direction</Button>
      </div>
      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 lg:grid-cols-2">
          <StackedDeckPanel
            title="Current deck"
            subtitle="Owner version"
            tone="current"
            superlaserCount={3}
            probeCount={0}
            chokeNote="Seed removal"
          />
          <StackedDeckPanel
            title="Branch proposal"
            subtitle="Contributor version"
            tone="proposed"
            superlaserCount={1}
            probeCount={2}
            chokeNote="Keep for Sabine and Han matchups"
          />
        </div>
        <aside className="space-y-3">
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="mb-2 text-sm font-semibold">Selected change</div>
            <div className="flex gap-3">
              <CardImage card={cards.superlaser} size="sm" />
              <div className="min-w-0">
                <div className="font-medium">Superlaser Technician</div>
                <div className="text-sm text-muted-foreground">Main deck · cost 3</div>
                <div className="mt-2">
                  <QuantityPill before={3} after={1} />
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm">Ask why</Button>
              <Button size="sm">Accept card</Button>
            </div>
          </div>
          <MiniComment>
            This keeps the reviewer oriented in the whole deck while still making the exact changed
            stack obvious.
          </MiniComment>
          <div className="rounded-md border p-3 text-sm">
            <div className="mb-2 font-semibold">Legend</div>
            <div className="space-y-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" /> Added or increased
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500" /> Removed or decreased
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-400" /> Needs reviewer attention
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function StackedDeckPanel({
  title,
  subtitle,
  tone,
  superlaserCount,
  probeCount,
  chokeNote,
}: {
  title: string;
  subtitle: string;
  tone: 'current' | 'proposed';
  superlaserCount: number;
  probeCount: number;
  chokeNote: string;
}) {
  const isProposed = tone === 'proposed';
  return (
    <div className="rounded-md border bg-muted/10 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <Badge variant={isProposed ? 'secondary' : 'outline'}>{isProposed ? '+2 / -2' : 'base'}</Badge>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[560px] gap-4">
          <StackColumn
            label="2 cost"
            count={isProposed ? 4 : 2}
            cards={[
              { card: cards.probe, copies: probeCount, change: isProposed ? 'added' : 'empty' },
              { card: cards.choke, copies: 2, change: isProposed ? 'note' : 'same', note: chokeNote },
            ]}
          />
          <StackColumn
            label="3 cost"
            count={isProposed ? 1 : 3}
            cards={[
              {
                card: cards.superlaser,
                copies: superlaserCount,
                change: isProposed ? 'decreased' : 'beforeDecrease',
              },
            ]}
          />
          <StackColumn
            label="5 cost"
            count={2}
            cards={[{ card: cards.barrage, copies: 2, change: 'same' }]}
          />
          <StackColumn
            label="Sideboard"
            count={isProposed ? 0 : 2}
            cards={[{ card: cards.snowtrooper, copies: isProposed ? 0 : 2, change: isProposed ? 'removed' : 'same' }]}
          />
        </div>
      </div>
    </div>
  );
}

function StackColumn({
  label,
  count,
  cards: stackCards,
}: {
  label: string;
  count: number;
  cards: Array<{
    card: (typeof cards)[keyof typeof cards];
    copies: number;
    change: 'same' | 'added' | 'removed' | 'decreased' | 'beforeDecrease' | 'note' | 'empty';
    note?: string;
  }>;
}) {
  return (
    <div className="w-32 shrink-0">
      <div className="mb-2 whitespace-nowrap border-b pb-1 text-sm">
        <span className="font-medium">{label}</span> <span className="text-muted-foreground">({count})</span>
      </div>
      <div className="pt-[112px]">
        {stackCards.map(item => (
          <StackCard key={`${label}-${item.card.name}`} {...item} />
        ))}
      </div>
    </div>
  );
}

function StackCard({
  card,
  copies,
  change,
  note,
}: {
  card: (typeof cards)[keyof typeof cards];
  copies: number;
  change: 'same' | 'added' | 'removed' | 'decreased' | 'beforeDecrease' | 'note' | 'empty';
  note?: string;
}) {
  if (change === 'empty') {
    return (
      <div className="-mt-[112px] flex aspect-[5/7] w-28 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
        not present
      </div>
    );
  }

  const ringClass =
    change === 'added'
      ? 'ring-4 ring-emerald-500/70'
      : change === 'removed' || change === 'decreased' || change === 'beforeDecrease'
        ? 'ring-4 ring-red-500/70'
        : change === 'note'
          ? 'ring-4 ring-amber-400/70'
          : '';

  return (
    <div className={`relative -mt-[112px] w-28 rounded-[4.75%/3.5%] ${ringClass}`}>
      <img
        src={card.image}
        alt={card.name}
        className={`aspect-[5/7] w-full rounded-md border object-cover shadow-sm ${change === 'removed' ? 'opacity-45 grayscale' : ''}`}
        loading="lazy"
      />
      <div className="absolute -right-3 top-0 rounded border-2 border-foreground/30 bg-background/90 px-2 py-0.5 text-sm font-semibold">
        x{copies}
      </div>
      {change !== 'same' && (
        <Badge
          className="absolute -left-2 bottom-2"
          variant={change === 'added' ? 'secondary' : change === 'note' ? 'outline' : 'destructive'}
        >
          {change === 'beforeDecrease'
            ? 'from 3'
            : change === 'decreased'
              ? 'to 1'
              : change === 'note'
                ? 'note'
                : change}
        </Badge>
      )}
      {note && (
        <div className="absolute left-1 right-1 top-full mt-1 rounded border bg-background/95 p-1 text-[10px] leading-3 shadow">
          {note}
        </div>
      )}
    </div>
  );
}

function IntroPanel() {
  return (
    <section className="rounded-md border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="mb-2 flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Review scenario</h2>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Test Member proposes lowering Superlaser Technician from 3 copies to 1, adding Viper
            Probe Droid, adjusting a Force Choke note, and renaming the branch deck. Test Owner
            needs to understand visual impact, leave feedback on exact changes, and merge or reject
            confidently.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {mockSummary.map(item => (
            <div key={item.label} className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="text-sm font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MockShell({ concept, children }: { concept: (typeof concepts)[number]; children: React.ReactNode }) {
  return (
    <section id={`mock-${concept.id}`} className="scroll-mt-20 rounded-md border bg-background">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="secondary">Mock {concept.id}</Badge>
            <h2 className="text-lg font-semibold">{concept.name}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{concept.premise}</p>
        </div>
        <Button variant="outline" size="sm">
          Pick for iteration
        </Button>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function CardImage({
  card,
  size = 'md',
  overlay,
}: {
  card: (typeof cards)[keyof typeof cards];
  size?: 'sm' | 'md' | 'lg';
  overlay?: React.ReactNode;
}) {
  const sizeClass =
    size === 'sm'
      ? 'w-20'
      : size === 'lg'
        ? 'w-36 sm:w-44'
        : 'w-24 sm:w-28';

  return (
    <div className={`relative shrink-0 ${sizeClass}`}>
      <img
        src={card.image}
        alt={card.name}
        className="aspect-[5/7] w-full rounded-md border object-cover shadow-sm"
        loading="lazy"
      />
      {overlay}
    </div>
  );
}

function QuantityPill({ before, after }: { before: number; after: number }) {
  const isIncrease = after > before;
  const isDecrease = after < before;
  return (
    <div className="inline-flex items-center rounded-md border bg-background text-sm font-semibold">
      <span className="px-2 py-1 text-muted-foreground">{before}</span>
      <ArrowRight className="h-3.5 w-3.5" />
      <span className={`px-2 py-1 ${isIncrease ? 'text-emerald-500' : isDecrease ? 'text-red-500' : ''}`}>
        {after}
      </span>
    </div>
  );
}

function MiniComment({ children }: React.PropsWithChildren) {
  return (
    <div className="rounded-md border bg-muted/30 p-2 text-xs leading-5">
      <div className="mb-1 flex items-center gap-1.5 font-medium">
        <MessageSquare className="h-3.5 w-3.5" />
        Feedback
      </div>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}

function LeaderBaseMockGallery() {
  return (
    <section id="leader-base-mocks" className="scroll-mt-20 rounded-md border bg-background">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge>20 directions</Badge>
            <h2 className="text-lg font-semibold">Leader and base review mocks</h2>
          </div>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
            Drafted from 2026 SaaS/product UI patterns: dense scanning, card-first recognition,
            restrained glass/gradient surfaces, progressive detail, and clear status tokens.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">visual first</Badge>
          <Badge variant="outline">clickable cards</Badge>
          <Badge variant="outline">review dense</Badge>
        </div>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        {leaderBaseMocks.map(mock => (
          <LeaderBaseMock key={mock.id} mock={mock} />
        ))}
      </div>
    </section>
  );
}

function BranchDisplayMockGallery() {
  return (
    <section id="branch-display-mocks" className="scroll-mt-20 rounded-md border bg-background">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge>10 directions</Badge>
            <h2 className="text-lg font-semibold">Open branch placement mocks</h2>
          </div>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
            Smaller ways to tell the deck owner there is branch activity without turning the top of
            the deck page into a dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">low real estate</Badge>
          <Badge variant="outline">owner only</Badge>
          <Badge variant="outline">review in context</Badge>
        </div>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        {branchDisplayMocks.map(mock => (
          <BranchDisplayMock key={mock.id} mock={mock} />
        ))}
      </div>
    </section>
  );
}

function BranchDisplayMock({ mock }: { mock: (typeof branchDisplayMocks)[number] }) {
  return (
    <article className="overflow-hidden rounded-md border bg-muted/10">
      <div className="flex items-start justify-between gap-3 border-b bg-background/70 p-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">#{mock.id}</Badge>
            <h3 className="text-sm font-semibold">{mock.name}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{mock.note}</p>
        </div>
        <Badge variant="outline">2 open</Badge>
      </div>
      <div className="p-3">
        {mock.id === 1 && <MockActionBarChip />}
        {mock.id === 2 && <MockDecklistSideRail />}
        {mock.id === 3 && <MockOwnerInbox />}
        {mock.id === 4 && <MockInlineTitleBadge />}
        {mock.id === 5 && <MockFloatingTray />}
        {mock.id === 6 && <MockActivityRow />}
        {mock.id === 7 && <MockNavigationBadge />}
        {mock.id === 8 && <MockCompactCompareCards />}
        {mock.id === 9 && <MockMoreMenuSection />}
        {mock.id === 10 && <MockReviewDrawerStub />}
      </div>
    </article>
  );
}

function MockDeckFrame({
  children,
  titleExtra,
  rail,
  footer,
}: React.PropsWithChildren<{
  titleExtra?: React.ReactNode;
  rail?: React.ReactNode;
  footer?: React.ReactNode;
}>) {
  return (
    <div className="relative overflow-hidden rounded-md border bg-background">
      <div className="border-b p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-base font-semibold">Codex Data Vault Review Seed Deck</h4>
              {titleExtra}
            </div>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              Seeded Data Vault deck with 60 main cards and 10 sideboard cards.
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="outline" size="sm">Edit</Button>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {children}
      </div>
      <div className="grid min-h-48 grid-cols-[118px_minmax(0,1fr)] gap-3 p-3">
        <div className="space-y-2">
          <CardImage card={cards.iden} size="sm" />
          <CardImage card={cards.ecl} size="sm" />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 border-b pb-2 text-xs">
            <Badge variant="secondary">Decklist</Badge>
            <Badge variant="outline">Charts</Badge>
            <Badge variant="outline">Image</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {['Unit - Ground', 'Event', 'Upgrade'].map((label, index) => (
              <div key={label} className="space-y-1">
                <div className="text-xs font-semibold">{label}</div>
                {[cards.probe, cards.choke, cards.barrage].slice(index, index + 1).map(card => (
                  <div key={card.name} className="flex items-center justify-between rounded border px-2 py-1 text-xs">
                    <span className="truncate">{card.name}</span>
                    <span className="font-semibold">x3</span>
                  </div>
                ))}
                <div className="h-6 rounded border bg-muted/30" />
                <div className="h-6 rounded border bg-muted/20" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {rail}
      {footer}
    </div>
  );
}

function BranchMiniList({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-1">
      {branchRows.map(row => (
        <div
          key={row.name}
          className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5 text-xs"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">{row.name}</div>
            {!compact && <div className="text-muted-foreground">{row.author}</div>}
          </div>
          <Badge variant={row.status === 'draft' ? 'outline' : 'secondary'} size="small">
            {row.status === 'draft' ? 'draft' : 'review'}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function MockActionBarChip() {
  return (
    <MockDeckFrame
      titleExtra={
        <Badge variant="outline" className="gap-1">
          <GitPullRequest className="h-3 w-3" /> 2 branches
        </Badge>
      }
    >
      <div className="mt-3 flex flex-wrap gap-2 rounded-md border bg-muted/20 p-2">
        <Button variant="outline" size="sm">Copy link</Button>
        <Button variant="outline" size="sm">Duplicate</Button>
        <Button size="sm">
          <GitPullRequest className="h-4 w-4" /> Review branches
        </Button>
      </div>
    </MockDeckFrame>
  );
}

function MockDecklistSideRail() {
  return (
    <MockDeckFrame
      rail={
        <div className="absolute bottom-3 right-3 top-[108px] flex w-12 flex-col items-center rounded-md border bg-background/95 py-2 shadow-sm">
          <GitPullRequest className="h-4 w-4" />
          <div className="mt-1 text-sm font-semibold">2</div>
          <div className="mt-2 h-px w-7 bg-border" />
          <Button variant="ghost" size="iconMedium" className="mt-1">
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      }
    />
  );
}

function MockOwnerInbox() {
  return (
    <MockDeckFrame>
      <div className="mt-3 flex justify-end">
        <Button variant="outline" size="sm" className="gap-2">
          <Inbox className="h-4 w-4" />
          Branch inbox
          <Badge variant="secondary">2</Badge>
        </Button>
      </div>
    </MockDeckFrame>
  );
}

function MockInlineTitleBadge() {
  return (
    <MockDeckFrame
      titleExtra={
        <button className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold hover:bg-muted">
          <GitPullRequest className="h-3 w-3" />
          2 open
        </button>
      }
    />
  );
}

function MockFloatingTray() {
  return (
    <MockDeckFrame
      footer={
        <div className="absolute bottom-3 right-3 rounded-md border bg-background/95 p-2 shadow-lg">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold">
            <GitPullRequest className="h-3.5 w-3.5" /> Branches
            <Badge variant="secondary">2</Badge>
          </div>
          <div className="flex gap-1">
            <Button size="sm">Review</Button>
            <Button variant="ghost" size="iconMedium">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      }
    />
  );
}

function MockActivityRow() {
  return (
    <MockDeckFrame>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-2 py-1.5 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate">
            Latest branch: <strong>Data Vault Branch: 60 Card Review</strong>
          </span>
        </div>
        <Button variant="ghost" size="sm">Review 2</Button>
      </div>
    </MockDeckFrame>
  );
}

function MockNavigationBadge() {
  return (
    <MockDeckFrame>
      <div className="mt-3 flex flex-wrap gap-1 border-b pb-0">
        <Button variant="ghost" size="sm" className="rounded-b-none border-b-2 border-primary">
          Decklist
        </Button>
        <Button variant="ghost" size="sm" className="rounded-b-none">
          Charts
        </Button>
        <Button variant="ghost" size="sm" className="rounded-b-none gap-1">
          Branches <Badge variant="secondary">2</Badge>
        </Button>
      </div>
    </MockDeckFrame>
  );
}

function MockCompactCompareCards() {
  return (
    <MockDeckFrame>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {branchRows.map(row => (
          <div key={row.name} className="flex items-center gap-2 rounded-md border bg-muted/20 p-2 text-xs">
            <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded border">
              <img src={cards.iden.image} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium">{row.name}</div>
              <div className="text-muted-foreground">{row.status}</div>
            </div>
          </div>
        ))}
      </div>
    </MockDeckFrame>
  );
}

function MockMoreMenuSection() {
  return (
    <MockDeckFrame>
      <div className="absolute right-3 top-12 w-56 rounded-md border bg-popover p-1 text-sm shadow-lg">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Branches</div>
        <button className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-muted">
          <span>Review open branches</span>
          <Badge variant="secondary">2</Badge>
        </button>
        <button className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted">
          <ExternalLink className="h-3.5 w-3.5" />
          Team change requests
        </button>
      </div>
    </MockDeckFrame>
  );
}

function MockReviewDrawerStub() {
  return (
    <MockDeckFrame
      rail={
        <div className="absolute bottom-0 right-0 top-0 flex w-9 items-center justify-center border-l bg-muted/40">
          <div className="flex -rotate-90 items-center gap-2 whitespace-nowrap text-xs font-semibold">
            <GitPullRequest className="h-3.5 w-3.5" />
            2 branches
          </div>
        </div>
      }
      footer={
        <div className="absolute bottom-3 right-12 w-48 rounded-md border bg-background p-2 shadow-lg">
          <BranchMiniList compact />
        </div>
      }
    />
  );
}

function LeaderBaseMock({ mock }: { mock: (typeof leaderBaseMocks)[number] }) {
  const variant = ((mock.id - 1) % 10) + 1;
  return (
    <article className="overflow-hidden rounded-md border bg-muted/10">
      <div className="flex items-start justify-between gap-3 border-b bg-background/70 p-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">#{mock.id}</Badge>
            <h3 className="text-sm font-semibold">{mock.name}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{mock.note}</p>
        </div>
        <Badge variant="outline">Vader → Iden</Badge>
      </div>
      {variant === 1 && <MockDeckRail />}
      {variant === 2 && <MockHeroSwap />}
      {variant === 3 && <MockFilmstrip />}
      {variant === 4 && <MockPinnedProposal />}
      {variant === 5 && <MockBeforeGhost />}
      {variant === 6 && <MockSplitBoard />}
      {variant === 7 && <MockGradientShelf />}
      {variant === 8 && <MockReviewTokens />}
      {variant === 9 && <MockPrHeader />}
      {variant === 10 && <MockMinimalRail />}
    </article>
  );
}

function IdentityImage({
  card,
  size = 'md',
  muted,
}: {
  card: (typeof cards)[keyof typeof cards];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  muted?: boolean;
}) {
  const sizeClass =
    size === 'xs'
      ? 'w-16'
      : size === 'sm'
        ? 'w-24'
        : size === 'lg'
          ? 'w-44'
          : 'w-32';

  return (
    <button
      type="button"
      className="group relative shrink-0 rounded-md text-left outline-none transition duration-150 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary"
    >
      <img
        src={card.image}
        alt={card.name}
        loading="lazy"
        className={`${sizeClass} rounded-md border object-cover shadow-sm ${muted ? 'opacity-65 saturate-75' : ''}`}
      />
    </button>
  );
}

function IdentityNameDiff({ before, after }: { before: string; after: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-xs">
      <span className="truncate text-muted-foreground line-through">{before}</span>
      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium text-emerald-200">{after}</span>
    </div>
  );
}

function IdentitySlot({
  label,
  before,
  after,
  layout = 'rail',
}: {
  label: string;
  before: (typeof cards)[keyof typeof cards];
  after: (typeof cards)[keyof typeof cards];
  layout?: 'rail' | 'pair' | 'compact';
}) {
  if (layout === 'pair') {
    return (
      <div className="rounded-md border bg-background/50 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
          <Badge variant="outline" className="h-5 px-1.5 text-[11px]">changed</Badge>
        </div>
        <div className="flex items-center justify-center gap-3">
          <IdentityImage card={before} size="sm" muted />
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <IdentityImage card={after} size="sm" />
        </div>
        <div className="mt-2">
          <IdentityNameDiff before={before.name} after={after.name} />
        </div>
      </div>
    );
  }

  if (layout === 'compact') {
    return (
      <div className="flex items-center gap-3 rounded-md border bg-background/50 p-2">
        <IdentityImage card={before} size="xs" muted />
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        <IdentityImage card={after} size="xs" />
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
          <IdentityNameDiff before={before.name} after={after.name} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-amber-400/50 bg-background/45 p-3">
      <div className="relative mb-2">
        <IdentityImage card={after} size="md" />
        <div className="absolute bottom-2 left-2 rounded-md bg-background/85 p-0.5 shadow backdrop-blur">
          <IdentityImage card={before} size="xs" muted />
        </div>
      </div>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
        <Badge variant="outline" className="h-5 border-amber-400/60 px-1.5 text-[11px]">changed</Badge>
      </div>
      <div className="truncate text-sm font-semibold">{after.name}</div>
      <IdentityNameDiff before={before.name} after={after.name} />
    </div>
  );
}

function MockDeckRail() {
  return (
    <div className="grid gap-3 bg-[linear-gradient(115deg,rgba(210,35,42,.25),rgba(102,148,206,.18),rgba(65,173,73,.14))] p-3 sm:grid-cols-[220px_minmax(0,1fr)]">
      <div className="space-y-3">
        <IdentitySlot label="Leader" before={cards.vader} after={cards.iden} />
        <IdentitySlot label="Base" before={cards.dataVault} after={cards.ecl} />
      </div>
      <MockDeckStub />
    </div>
  );
}

function MockHeroSwap() {
  return (
    <div className="space-y-3 p-3">
      <IdentitySlot label="Leader" before={cards.vader} after={cards.iden} layout="pair" />
      <IdentitySlot label="Base" before={cards.dataVault} after={cards.ecl} layout="pair" />
    </div>
  );
}

function MockFilmstrip() {
  return (
    <div className="space-y-2 bg-background/30 p-3">
      <IdentitySlot label="Leader" before={cards.vader} after={cards.iden} layout="compact" />
      <IdentitySlot label="Base" before={cards.dataVault} after={cards.ecl} layout="compact" />
      <MockDeckStub compact />
    </div>
  );
}

function MockPinnedProposal() {
  return (
    <div className="grid gap-3 p-3 md:grid-cols-2">
      <div className="rounded-md border bg-emerald-500/10 p-3">
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Proposed identity</div>
        <div className="flex gap-3">
          <IdentityImage card={cards.iden} size="md" />
          <IdentityImage card={cards.ecl} size="md" />
        </div>
      </div>
      <div className="space-y-2">
        <IdentitySlot label="From leader" before={cards.vader} after={cards.iden} layout="compact" />
        <IdentitySlot label="From base" before={cards.dataVault} after={cards.ecl} layout="compact" />
      </div>
    </div>
  );
}

function MockBeforeGhost() {
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-2">
      {[['Leader', cards.vader, cards.iden], ['Base', cards.dataVault, cards.ecl]].map(([label, before, after]) => (
        <div key={label as string} className="rounded-md border bg-background/45 p-3">
          <div className="relative mx-auto w-fit">
            <div className="absolute left-0 top-3 -rotate-6 opacity-45">
              <IdentityImage card={before as typeof cards.vader} size="md" muted />
            </div>
            <div className="relative ml-10">
              <IdentityImage card={after as typeof cards.vader} size="lg" />
            </div>
          </div>
          <div className="mt-2 text-xs font-semibold uppercase text-muted-foreground">{label as string}</div>
          <IdentityNameDiff before={(before as typeof cards.vader).name} after={(after as typeof cards.vader).name} />
        </div>
      ))}
    </div>
  );
}

function MockSplitBoard() {
  return (
    <div className="grid gap-0 sm:grid-cols-2">
      <div className="border-b p-3 sm:border-b-0 sm:border-r">
        <IdentitySlot label="Leader" before={cards.vader} after={cards.iden} />
      </div>
      <div className="p-3">
        <IdentitySlot label="Base" before={cards.dataVault} after={cards.ecl} />
      </div>
    </div>
  );
}

function MockGradientShelf() {
  return (
    <div className="p-3">
      <div className="rounded-md border bg-[linear-gradient(90deg,rgba(210,35,42,.4),rgba(253,185,51,.25),rgba(65,173,73,.35))] p-2">
        <div className="grid gap-2 rounded bg-background/70 p-3 backdrop-blur sm:grid-cols-2">
          <IdentitySlot label="Leader" before={cards.vader} after={cards.iden} layout="pair" />
          <IdentitySlot label="Base" before={cards.dataVault} after={cards.ecl} layout="pair" />
        </div>
      </div>
    </div>
  );
}

function MockReviewTokens() {
  return (
    <div className="space-y-3 p-3">
      <IdentityTokenRow label="Leader" before={cards.vader} after={cards.iden} />
      <IdentityTokenRow label="Base" before={cards.dataVault} after={cards.ecl} />
    </div>
  );
}

function IdentityTokenRow({
  label,
  before,
  after,
}: {
  label: string;
  before: (typeof cards)[keyof typeof cards];
  after: (typeof cards)[keyof typeof cards];
}) {
  return (
    <div className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-[auto_1fr_auto]">
      <div className="flex items-center gap-2">
        <IdentityImage card={before} size="xs" muted />
        <IdentityImage card={after} size="xs" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
        <IdentityNameDiff before={before.name} after={after.name} />
      </div>
      <div className="flex gap-1">
        <Badge variant="destructive">from</Badge>
        <Badge variant="secondary">to</Badge>
      </div>
    </div>
  );
}

function MockPrHeader() {
  return (
    <div className="p-3">
      <div className="rounded-md border bg-background/70 p-3">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <GitPullRequest className="h-4 w-4" />
          Identity changed
          <Badge variant="outline">2 fields</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <IdentitySlot label="Leader" before={cards.vader} after={cards.iden} layout="compact" />
          <IdentitySlot label="Base" before={cards.dataVault} after={cards.ecl} layout="compact" />
        </div>
      </div>
    </div>
  );
}

function MockMinimalRail() {
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div className="space-y-2">
        <IdentitySlot label="Leader" before={cards.vader} after={cards.iden} layout="compact" />
        <IdentitySlot label="Base" before={cards.dataVault} after={cards.ecl} layout="compact" />
      </div>
      <MockDeckStub compact />
    </div>
  );
}

function MockDeckStub({ compact }: { compact?: boolean }) {
  return (
    <div className="rounded-md border bg-background/55 p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="text-sm font-semibold">Main deck</div>
        <Badge variant="outline">60</Badge>
      </div>
      <div className={`grid gap-3 ${compact ? 'grid-cols-3' : 'grid-cols-4'}`}>
        {[cards.probe, cards.superlaser, cards.choke, cards.barrage].slice(0, compact ? 3 : 4).map(card => (
          <div key={card.name} className="space-y-1">
            <img src={card.image} alt={card.name} className="aspect-[5/7] w-full rounded border object-cover" />
            <div className="truncate text-[10px] text-muted-foreground">{card.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardGalleryDiff() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <VisualChangeCard card={cards.superlaser} status="changed" before={3} after={1} />
        <VisualChangeCard card={cards.probe} status="added" before={0} after={2} />
        <VisualChangeCard card={cards.snowtrooper} status="removed" before={2} after={0} />
      </div>
      <div className="rounded-md border p-3">
        <div className="mb-2 text-sm font-semibold">Deck details</div>
        <div className="grid gap-2 md:grid-cols-2">
          <DiffText label="Name" before="Codex Branch Review Seed Deck" after="Branch of Codex Branch Review Seed Deck" />
          <DiffText label="Force Choke note" before="Seed removal" after="Keep for Sabine and Han matchups" />
        </div>
      </div>
    </div>
  );
}

function VisualChangeCard({
  card,
  status,
  before,
  after,
}: {
  card: (typeof cards)[keyof typeof cards];
  status: 'added' | 'removed' | 'changed';
  before: number;
  after: number;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="mb-3 flex items-start gap-3">
        <CardImage
          card={card}
          overlay={
            <Badge className="absolute -right-2 -top-2" variant={status === 'removed' ? 'destructive' : 'secondary'}>
              {status}
            </Badge>
          }
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{card.name}</h3>
          <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          <div className="mt-3">
            <QuantityPill before={before} after={after} />
          </div>
        </div>
      </div>
      <MiniComment>Ask contributor why this count changed before merge.</MiniComment>
    </div>
  );
}

function DiffText({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="rounded-md border">
      <div className="border-b px-3 py-2 text-sm font-medium">{label}</div>
      <div className="grid md:grid-cols-2">
        <div className="border-b bg-red-500/10 p-3 text-sm md:border-b-0 md:border-r">
          <div className="mb-1 text-xs text-muted-foreground">Before</div>
          {before}
        </div>
        <div className="bg-emerald-500/10 p-3 text-sm">
          <div className="mb-1 text-xs text-muted-foreground">After</div>
          {after}
        </div>
      </div>
    </div>
  );
}

function ThreeColumnMergeBoard() {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
      <MergeColumn title="Base snapshot" tone="neutral" qty={3} note="Original branch point" />
      <MergeColumn title="Current deck" tone="current" qty={2} note="Owner changed this after branching" />
      <MergeColumn title="Branch proposal" tone="proposed" qty={1} note="Contributor proposal" />
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 lg:col-span-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Conflict decision
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline">Keep current 2 copies</Button>
          <Button size="sm">Use branch 1 copy</Button>
          <Button size="sm" variant="secondary">Request explanation</Button>
        </div>
      </div>
    </div>
  );
}

function MergeColumn({
  title,
  tone,
  qty,
  note,
}: {
  title: string;
  tone: 'neutral' | 'current' | 'proposed';
  qty: number;
  note: string;
}) {
  const toneClass =
    tone === 'current'
      ? 'border-red-500/30 bg-red-500/10'
      : tone === 'proposed'
        ? 'border-emerald-500/30 bg-emerald-500/10'
        : 'bg-muted/20';
  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <div className="flex gap-3">
        <CardImage card={cards.superlaser} />
        <div className="space-y-2 text-sm">
          <div className="font-medium">{cards.superlaser.name}</div>
          <div className="text-2xl font-semibold">{qty}x</div>
          <p className="text-muted-foreground">{note}</p>
        </div>
      </div>
    </div>
  );
}

function DeckZoneHeatmap() {
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="rounded-md border bg-muted/20 p-3">
        <div className="mb-3 text-sm font-semibold">Identity</div>
        <div className="flex gap-3">
          <CardImage card={cards.vader} size="sm" />
          <CardImage card={cards.ecl} size="sm" />
        </div>
        <div className="mt-3 text-xs text-muted-foreground">No leader/base change in this request.</div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Zone title="Main Deck" count="45 to 46" tone="changed" items={[cards.superlaser, cards.probe, cards.choke]} />
        <Zone title="Sideboard" count="10 to 8" tone="removed" items={[cards.snowtrooper, cards.barrage]} />
        <Zone title="Curve impact" count="2-cost up" tone="added" items={[cards.probe, cards.choke]} />
      </div>
    </div>
  );
}

function Zone({
  title,
  count,
  tone,
  items,
}: {
  title: string;
  count: string;
  tone: 'added' | 'removed' | 'changed';
  items: Array<(typeof cards)[keyof typeof cards]>;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        <Badge variant={tone === 'removed' ? 'destructive' : 'secondary'}>{count}</Badge>
      </div>
      <div className="flex gap-2 overflow-hidden">
        {items.map(card => (
          <CardImage key={card.name} card={card} size="sm" />
        ))}
      </div>
    </div>
  );
}

function ReviewerQueue() {
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-2">
        {['Update Vader ECL', 'Sabine sideboard tune', 'Han2 curve changes'].map((title, index) => (
          <div key={title} className={`rounded-md border p-3 ${index === 0 ? 'bg-muted/40' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="font-medium">{title}</div>
              <Badge variant={index === 0 ? 'secondary' : 'outline'}>{index === 0 ? 'open' : 'draft'}</Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{index + 2} visual changes</div>
          </div>
        ))}
      </div>
      <div className="rounded-md border p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-semibold">Selected request preview</div>
            <div className="text-xs text-muted-foreground">Scan first, open detailed review only if needed.</div>
          </div>
          <Button size="sm">
            <GitMerge className="h-4 w-4" />
            Merge
          </Button>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          {[cards.superlaser, cards.probe, cards.choke, cards.snowtrooper].map(card => (
            <div key={card.name} className="rounded-md border bg-muted/20 p-2">
              <CardImage card={card} size="sm" />
              <div className="mt-2 truncate text-xs font-medium">{card.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CardFocusLens() {
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_260px]">
      <div className="rounded-md border p-3">
        <div className="mb-3 text-sm font-semibold">Changes</div>
        {[cards.superlaser, cards.probe, cards.choke].map((card, index) => (
          <div key={card.name} className={`flex gap-2 rounded-md p-2 ${index === 0 ? 'bg-muted' : ''}`}>
            <CardImage card={card} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{card.name}</div>
              <div className="text-xs text-muted-foreground">{card.subtitle}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-md border p-4">
        <div className="flex flex-wrap justify-center gap-5">
          <CardImage card={cards.superlaser} size="lg" />
          <div className="flex items-center">
            <ChevronsRight className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardImage
            card={cards.superlaser}
            size="lg"
            overlay={<Badge className="absolute -right-2 -top-2">1x proposed</Badge>}
          />
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <DiffText label="Quantity" before="3 copies" after="1 copy" />
          <DiffText label="Reason" before="Ramp package" after="Too slow against current meta" />
        </div>
      </div>
      <div className="rounded-md border p-3">
        <div className="mb-2 font-semibold">Review note</div>
        <MiniComment>Looks reasonable, but ask if the ramp cut changes Vader deploy consistency.</MiniComment>
        <Button className="mt-3 w-full" variant="secondary">Approve this card</Button>
      </div>
    </div>
  );
}

function ChangeTimeline() {
  const rows = [
    { icon: Minus, title: 'Reduced Superlaser Technician', card: cards.superlaser, detail: '3 copies to 1 copy' },
    { icon: Plus, title: 'Added Viper Probe Droid', card: cards.probe, detail: '0 copies to 2 copies' },
    { icon: MessageSquare, title: 'Changed Force Choke note', card: cards.choke, detail: 'Matchup note updated' },
  ];
  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const Icon = row.icon;
        return (
          <div key={row.title} className="grid gap-3 rounded-md border p-3 md:grid-cols-[48px_120px_minmax(0,1fr)_180px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted/30">
              <Icon className="h-4 w-4" />
            </div>
            <CardImage card={row.card} size="sm" />
            <div>
              <div className="font-semibold">{row.title}</div>
              <div className="text-sm text-muted-foreground">{row.detail}</div>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${45 + index * 18}%` }} />
              </div>
            </div>
            <Button variant={index === 0 ? 'outline' : 'secondary'} size="sm">
              Comment
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function PinnedCommentCanvas() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-md border p-4">
        <div className="mb-4 flex flex-wrap gap-3">
          <PinnedCard card={cards.superlaser} pin="1" note="Why cut to one?" />
          <PinnedCard card={cards.probe} pin="2" note="Good meta call" />
          <PinnedCard card={cards.choke} pin="3" note="Clarify note" />
        </div>
      </div>
      <div className="space-y-2 rounded-md border p-3">
        <div className="font-semibold">Pinned feedback</div>
        {['1: Why cut ramp this hard?', '2: Probe helps information matchups.', '3: Change note to mention Boba.'].map(
          note => (
            <div key={note} className="rounded-md border bg-muted/20 p-2 text-sm">{note}</div>
          ),
        )}
      </div>
    </div>
  );
}

function PinnedCard({
  card,
  pin,
  note,
}: {
  card: (typeof cards)[keyof typeof cards];
  pin: string;
  note: string;
}) {
  return (
    <div className="relative">
      <CardImage card={card} size="lg" />
      <div className="absolute -right-2 top-6 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-black">
        {pin}
      </div>
      <div className="absolute bottom-2 left-2 right-2 rounded-md bg-black/75 p-2 text-xs text-white">{note}</div>
    </div>
  );
}

function MobileReviewStack() {
  return (
    <div className="mx-auto max-w-sm rounded-[24px] border bg-muted/30 p-3">
      <div className="rounded-[18px] border bg-background p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">1 of 4 changes</div>
            <div className="text-xs text-muted-foreground">Superlaser Technician</div>
          </div>
          <Badge>changed</Badge>
        </div>
        <div className="flex justify-center">
          <CardImage card={cards.superlaser} size="lg" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-md border bg-red-500/10 p-3 text-center">
            <div className="text-xs text-muted-foreground">Before</div>
            <div className="text-xl font-semibold">3x</div>
          </div>
          <div className="rounded-md border bg-emerald-500/10 p-3 text-center">
            <div className="text-xs text-muted-foreground">After</div>
            <div className="text-xl font-semibold">1x</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm">Comment</Button>
          <Button variant="secondary" size="sm">Skip</Button>
          <Button size="sm">Accept</Button>
        </div>
      </div>
    </div>
  );
}

function ImpactDashboard() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-3 md:grid-cols-2">
        <Metric title="Cost curve" before="2-cost: 7" after="2-cost: 9" />
        <Metric title="Command aspect" before="18 cards" after="17 cards" />
        <Metric title="Villainy aspect" before="31 cards" after="33 cards" />
        <Metric title="Sideboard count" before="10" after="8" />
      </div>
      <div className="rounded-md border p-3">
        <div className="mb-3 font-semibold">Cards driving impact</div>
        <div className="flex gap-2">
          <CardImage card={cards.probe} size="sm" />
          <CardImage card={cards.superlaser} size="sm" />
          <CardImage card={cards.snowtrooper} size="sm" />
        </div>
        <MiniComment>Good option if reviewers think in deck stats more than raw diffs.</MiniComment>
      </div>
    </div>
  );
}

function Metric({ title, before, after }: { title: string; before: string; after: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
        <div className="rounded-md bg-red-500/10 p-2">{before}</div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className="rounded-md bg-emerald-500/10 p-2">{after}</div>
      </div>
    </div>
  );
}

function MergeDecisionTable() {
  const rows = [
    { card: cards.superlaser, change: '3x to 1x', status: 'Needs note', decision: 'Comment' },
    { card: cards.probe, change: '0x to 2x', status: 'Clean', decision: 'Accept' },
    { card: cards.choke, change: 'Note edited', status: 'Clean', decision: 'Accept' },
    { card: cards.snowtrooper, change: '2x to 0x', status: 'Needs review', decision: 'Hold' },
  ];
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="grid grid-cols-[88px_minmax(170px,1fr)_120px_120px_160px] border-b bg-muted/30 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
        <div>Card</div>
        <div>Name</div>
        <div>Change</div>
        <div>Status</div>
        <div>Decision</div>
      </div>
      {rows.map(row => (
        <div key={row.card.name} className="grid grid-cols-[88px_minmax(170px,1fr)_120px_120px_160px] items-center border-b px-3 py-2 last:border-b-0">
          <CardImage card={row.card} size="sm" />
          <div className="font-medium">{row.card.name}</div>
          <div className="text-sm text-muted-foreground">{row.change}</div>
          <Badge variant={row.status === 'Clean' ? 'secondary' : 'outline'}>{row.status}</Badge>
          <div className="flex gap-2">
            <Button size="sm" variant={row.decision === 'Accept' ? 'secondary' : 'outline'}>
              {row.decision === 'Accept' ? <Check className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
              {row.decision}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
