import { ArrowUpRight, Trophy } from 'lucide-react';
import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { getTournamentTypeLogo } from '@/lib/tournamentTypeLogo.ts';
import { cn } from '@/lib/utils.ts';
import type { SectionRecentTournamentsItem } from '../../../../../../../types/DailySnapshots.ts';
import { dailySnapshotFormatBadgeById } from '../../../../../../../types/Format.ts';
import {
  tournamentTypesInfo,
  type TournamentTypeKey,
} from '../../../../../../../types/Tournament.ts';
import { TournamentEventDetails, TournamentEventLink } from '../components/TournamentEvent.tsx';
import TournamentFormatBadge from '../components/TournamentFormatBadge.tsx';

export default function TournamentResultCard({
  item,
  featured = false,
  showDate = true,
  fullName = false,
}: {
  item: SectionRecentTournamentsItem;
  featured?: boolean;
  showDate?: boolean;
  fullName?: boolean;
}) {
  const { tournament, deck, winningTournamentDeck } = item;
  const name = fullName ? tournament.name : tournament.name.replace('PQ - ', '').split(', ')[0];
  const champion = tournament.imported
    ? winningTournamentDeck?.meleePlayerUsername?.trim()
    : undefined;
  const hasDeck =
    tournament.imported && (deck?.leaderCardId1 || deck?.leaderCardId2 || deck?.baseCardId);
  const hasFormatBadge = !!dailySnapshotFormatBadgeById[tournament.format];
  const logoUrl = featured ? getTournamentTypeLogo(tournament.type) : undefined;
  const typeName =
    tournamentTypesInfo[tournament.type as TournamentTypeKey]?.name ?? 'Major tournament';
  const logo = logoUrl && (
    <span
      className={cn(
        'meta-result-type-logo relative grid place-items-center flex-none w-11.5 h-12',
        'text-[color:var(--meta-accent)]',
      )}
      role="img"
      aria-label={typeName}
    >
      <Trophy size={22} aria-hidden="true" />
      <img
        src={logoUrl}
        alt=""
        loading="lazy"
        onError={event => {
          event.currentTarget.hidden = true;
        }}
        className="absolute inset-0 w-full h-full object-contain"
      />
    </span>
  );

  return (
    <TournamentEventLink
      tournament={tournament}
      inlineDetails
      className={cn(
        'meta-result-card',
        featured && 'meta-event-featured border-[color:var(--meta-line)]',
      )}
    >
      <div className="meta-result-top flex items-start gap-[7px] py-2 px-[9px] min-w-0">
        {hasDeck ? (
          <div className="meta-result-art flex-none -ml-6.5 mr-0 mt-0 mb-0">
            <DeckArtwork
              size="compact"
              leaderId={deck?.leaderCardId1}
              leader2Id={deck?.leaderCardId2}
              baseId={deck?.baseCardId}
            />
          </div>
        ) : (
          logo
        )}
        <div
          className={cn(
            'meta-result-copy flex flex-1 flex-col justify-center gap-[5px] min-w-0 min-h-8.5',
            '[&_.meta-event-details]:gap-y-1 [&_.meta-event-details]:gap-x-1.5',
          )}
        >
          <div
            className={cn(
              'meta-event-title flex items-start justify-between gap-2 min-w-0 text-[12px] font-semibold',
              'leading-[1.4]',
              '[&_>_span]:min-w-0 [&_>_span]:wrap-anywhere',
              '[&_>_svg]:shrink-0 [&_>_svg]:mt-px [&_>_svg]:text-muted-foreground',
            )}
          >
            <span>{name}</span>
            <ArrowUpRight size={13} aria-hidden="true" />
          </div>
          <TournamentEventDetails tournament={tournament} showDate={showDate} />
        </div>
      </div>
      {(champion || (hasDeck && logo) || hasFormatBadge) && (
        <div
          className={cn(
            'meta-event-champion flex items-center gap-[5px] min-w-0 min-h-6 py-[3px] px-[9px] border-t',
            'border-t-border/65 text-muted-foreground text-[10px]',
            '[&_>_svg]:shrink-0 [&_>_svg]:text-[#a77a26]',
            'dark:[&_>_svg]:text-[#d1b271]',
            '[&_.meta-result-type-logo]:w-5.5 [&_.meta-result-type-logo]:h-6 [&_.meta-result-type-logo]:mr-0.5',
            '[&_strong]:min-w-0 [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap',
            '[&_strong]:text-foreground [&_strong]:text-[11px] [&_strong]:font-medium',
          )}
        >
          {hasDeck && logo}
          {champion && (
            <>
              <Trophy size={11} aria-hidden="true" />
              <span>Winner</span>
              <strong title={champion}>{champion}</strong>
            </>
          )}
          <TournamentFormatBadge formatId={tournament.format} className="ml-auto shrink-0" />
        </div>
      )}
    </TournamentEventLink>
  );
}
