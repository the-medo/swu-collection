import { cn } from '@/lib/utils.ts';
import * as React from 'react';
import GridSection, {
  SectionCardSizing,
} from '@/components/app/global/GridSection/GridSection.tsx';
import { specialSectionSizing } from '@/components/app/daily-snapshots/DailySnapshots.tsx';
import { useMemo, useState } from 'react';
import TournamentDetailContent from '@/components/app/daily-snapshots/special-sections/TournamentDetailSection/TournamentDetailContent.tsx';

export interface TournamentDetailSectionProps {
  maTournamentId: string;
}

const TournamentDetailSection: React.FC<TournamentDetailSectionProps> = ({ maTournamentId }) => {
  const [expanded, setExpanded] = useState(false);

  const size = useMemo(() => {
    if (!expanded) return specialSectionSizing['tournament-detail'];

    const expandedSize: SectionCardSizing = { ...specialSectionSizing['tournament-detail'] };
    Object.entries(specialSectionSizing['tournament-detail']).forEach(([key, section]) => {
      expandedSize[key as unknown as keyof SectionCardSizing] = {
        ...section,
        col: { ...section.col, to: section.col.to + 1 },
      };
    });

    return expandedSize;
  }, [expanded]);

  return (
    <GridSection key="tournament-detail" sizing={size} id={`s-tournament-detail`} className="z-10">
      <div
        className={cn(
          'meta-panel meta-tournament-detail @container/meta-panel h-full min-w-0 p-5 border border-border',
          'rounded-[20px] bg-card',
          '[#s-meta-share-2-weeks_>_&]:border-[color:var(--meta-line)]',
          '[#s-meta-share-2-weeks_>_&]:[background:linear-gradient(130deg,_var(--meta-tint),_hsl(var(--card))_65%)]',
          '[#s-recent-tournaments_>_&]:p-4',
          '[#s-upcoming-tournaments_>_&]:p-4',
          'max-tablet-small:p-4 max-tablet-small:rounded-[17px]',
          'relative shadow-[0_8px_30px_hsl(var(--foreground)_/_0.12)]',
        )}
      >
        <TournamentDetailContent
          tournamentId={maTournamentId}
          expanded={expanded}
          setExpanded={setExpanded}
        />
      </div>
    </GridSection>
  );
};

export default TournamentDetailSection;
