import { cn } from '@/lib/utils.ts';
import { ArrowUpRight } from 'lucide-react';
import {
  tournamentTypesInfo,
  type TournamentStringDate,
  type TournamentTypeKey,
} from '../../../../../../../types/Tournament.ts';
import {
  TournamentDateTile,
  TournamentEventDetails,
  TournamentEventLink,
} from '../components/TournamentEvent.tsx';

export default function UpcomingTournamentCard({
  tournament,
  featured = false,
}: {
  tournament: TournamentStringDate;
  featured?: boolean;
}) {
  return (
    <TournamentEventLink
      tournament={tournament}
      className={
        featured
          ? 'meta-upcoming-event meta-upcoming-featured flex items-start gap-2.5 py-[11px] px-2.5 border-[color:var(--meta-line)] bg-[var(--meta-tint)]'
          : 'meta-upcoming-event flex items-start gap-2.5 py-[11px] px-2.5'
      }
    >
      <TournamentDateTile date={tournament.date} />
      <div className="meta-upcoming-event-copy flex flex-col flex-1 gap-1.5 min-w-0">
        {featured && (
          <span className="meta-event-type text-[10px] leading-[1.4] text-muted-foreground">
            {tournamentTypesInfo[tournament.type as TournamentTypeKey]?.name ?? 'Major tournament'}
          </span>
        )}
        <div
          className={cn(
            'meta-event-title flex items-start justify-between gap-2 min-w-0 text-[12px] font-semibold',
            'leading-[1.4]',
            '[&_>_span]:min-w-0 [&_>_span]:wrap-anywhere',
            '[&_>_svg]:shrink-0 [&_>_svg]:mt-px [&_>_svg]:text-muted-foreground',
          )}
        >
          <span>{tournament.name}</span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </div>
        <TournamentEventDetails tournament={tournament} upcoming />
      </div>
    </TournamentEventLink>
  );
}
