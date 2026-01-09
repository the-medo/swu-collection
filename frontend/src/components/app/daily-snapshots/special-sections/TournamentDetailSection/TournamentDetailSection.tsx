import * as React from 'react';
import GridSectionContent from '@/components/app/global/GridSection/GridSectionContent.tsx';
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
      <GridSectionContent>
        <TournamentDetailContent
          maTournamentId={maTournamentId}
          expanded={expanded}
          setExpanded={setExpanded}
        />
      </GridSectionContent>
    </GridSection>
  );
};

export default TournamentDetailSection;
