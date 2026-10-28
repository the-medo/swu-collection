import { Link } from '@tanstack/react-router';
import { ArrowUpRight, ChartColumn, ChartPie, Layers, Swords } from 'lucide-react';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { cn } from '@/lib/utils.ts';

const destinations = [
  {
    to: '/tournaments/$tournamentId/meta',
    title: 'Meta breakdown',
    description: 'The leaders and bases that shaped the field.',
    icon: ChartPie,
  },
  {
    to: '/tournaments/$tournamentId/decks',
    title: 'Explore the decks',
    description: 'Find a new idea or take a closer look at a list.',
    icon: Layers,
  },
  {
    to: '/tournaments/$tournamentId/matchups',
    title: 'Matchups',
    description: 'See how decks performed against each other.',
    icon: Swords,
  },
  {
    to: '/tournaments/$tournamentId/card-stats',
    title: 'Card statistics',
    description: 'Discover the cards players brought to the tables.',
    icon: ChartColumn,
  },
] as const;

export function TournamentNoBracket({ tournamentId }: { tournamentId: string }) {
  return (
    <section
      aria-label="Explore this tournament"
      className="@container/explore overflow-hidden rounded-xl border bg-linear-to-br from-primary/5 via-card to-card p-5"
    >
      <div className="flex flex-col-reverse items-start gap-5 @lg/explore:flex-row @lg/explore:items-center">
        <div className="min-w-0 flex-1 space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Beyond the standings
          </span>
          <h3 className={cn(workspaceStyles.title, 'text-[length:1.5rem]!')}>Explore the field.</h3>
          <p className="max-w-md text-sm leading-relaxed! text-muted-foreground">
            This event has no elimination bracket. There’s still plenty to discover in the decks,
            matchups and choices behind the results.
          </p>
        </div>
        <div aria-hidden="true" className="relative h-28 w-44 shrink-0 self-center">
          <div className="absolute inset-3 rounded-full border border-dashed border-primary/25" />
          <div className="absolute left-7 top-3 flex h-20 w-14 -rotate-12 flex-col justify-end gap-1 rounded-lg border border-primary/20 bg-card p-2 shadow-sm">
            <span className="mb-auto flex size-6 items-center justify-center rounded bg-primary/10 text-primary">
              <Layers className="size-4" />
            </span>
            <span className="h-1.5 rounded bg-primary/25" />
            <span className="h-1.5 w-2/3 rounded bg-primary/15" />
          </div>
          <div className="absolute right-5 top-4 flex size-20 rotate-6 items-center justify-center rounded-xl border border-primary/20 bg-card shadow-sm">
            <ChartPie className="size-10 text-primary" strokeWidth={1.2} />
          </div>
          <span className="absolute bottom-0 left-16 flex size-9 items-center justify-center rounded-lg border-4 border-card bg-primary text-primary-foreground">
            <Swords className="size-4" />
          </span>
        </div>
      </div>
      <div className="mt-6 grid gap-3 @lg/explore:grid-cols-2">
        {destinations.map(({ to, title, description, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            params={{ tournamentId }}
            className="group flex min-w-0 items-start gap-3 rounded-xl border border-border/70 bg-card/80 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold group-hover:text-primary">{title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {description}
              </span>
            </span>
            <ArrowUpRight
              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-hover:text-primary"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
