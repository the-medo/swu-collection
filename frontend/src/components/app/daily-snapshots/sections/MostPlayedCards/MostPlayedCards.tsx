import { cn } from '@/lib/utils.ts';
import { Layers } from 'lucide-react';
import * as React from 'react';
import { DailySnapshotRow } from '@/api/daily-snapshot';
import type {
  DailySnapshotSectionData,
  SectionMostPlayedCards,
} from '../../../../../../../types/DailySnapshots.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardStatistic from '@/components/app/card-stats/CardStatistic/CardStatistic.tsx';
import { SectionInfoTooltip } from '../components/SectionInfoTooltip.tsx';
import { CardStatsParams } from '@/api/card-stats';
import MostPlayedCardsDropdownMenu from '@/components/app/daily-snapshots/sections/MostPlayedCards/MostPlayedCardsDropdownMenu.tsx';
import SectionHeader from '../components/SectionHeader.tsx';
import MetaEmptyState from '../components/MetaEmptyState.tsx';

export interface MostPlayedCardsProps {
  payload: DailySnapshotSectionData<SectionMostPlayedCards>;
  dailySnapshot?: DailySnapshotRow | null;
  sectionUpdatedAt?: string;
}

const MostPlayedCards: React.FC<MostPlayedCardsProps> = ({
  payload,
  dailySnapshot,
  sectionUpdatedAt,
}) => {
  const { data: cardListData } = useCardList();
  const items = payload.data.dataPoints ?? [];
  const tournamentGroupId = payload.data.tournamentGroupId;

  const groups = React.useMemo(
    () => (payload.data.tournamentGroupExt ? [payload.data.tournamentGroupExt] : []),
    [payload.data.tournamentGroupExt],
  );

  const cardStatParams = React.useMemo<CardStatsParams>(
    () => ({ tournamentGroupId }),
    [tournamentGroupId],
  );

  return (
    <div className="meta-section-content flex flex-col gap-4.5 w-full h-full min-w-0">
      <SectionHeader
        title="Cards in most decks"
        icon={Layers}
        description="Last two weeks · The five most popular cards by deck count"
        info={
          <>
            <SectionInfoTooltip
              dailySnapshot={dailySnapshot}
              sectionUpdatedAt={sectionUpdatedAt}
              sectionDataWarning={true}
              tournamentGroupExtendedInfo={groups}
            >
              <div className="text-sm">
                Shows 5 cards that have been played in the most amount of decks in the last 2 weeks.
                That does NOT mean that it has the most copies in the decks. For that, there are
                more comprehensive card statistics that you can open.
              </div>
            </SectionInfoTooltip>
          </>
        }
        dropdownMenu={<MostPlayedCardsDropdownMenu tournamentGroupId={tournamentGroupId} />}
      />

      {items.length === 0 ? (
        <MetaEmptyState title="The staples are still emerging" icon={Layers}>
          The most played cards will appear as decklists are imported.
        </MetaEmptyState>
      ) : (
        <div
          className={cn(
            'meta-card-gallery',
            'focus-visible:outline-2 focus-visible:outline-[var(--meta-accent)] focus-visible:outline-offset-3',
            'flex gap-3 w-full min-w-0 px-0 pt-1 pb-2.5 overflow-x-auto overscroll-x-contain',
            '[scrollbar-width:thin] snap-x snap-proximity',
          )}
          role="region"
          aria-label="Most played cards"
          tabIndex={0}
        >
          {items.map((it, idx) => {
            const card = cardListData?.cards?.[it.cardId];
            if (!card) return null;
            return (
              <div
                className={cn(
                  'meta-popular-card relative flex-[1_0_222px] min-w-0 snap-start',
                  '[&_>_div]:w-full [&_>_div]:h-full [&_>_div]:p-2.5 [&_>_div]:rounded-[15px] [&_>_div]:bg-muted/25',
                )}
                key={it.cardId}
              >
                <span
                  className={cn(
                    'meta-card-rank absolute z-1 top-0 left-0 grid place-items-center w-7.5 h-7.5 border',
                    'border-[color:var(--meta-line)] rounded-[11px_0_11px_0] bg-[var(--meta-tint)]',
                    'text-[color:var(--meta-accent)] text-[12px] font-semibold tabular-nums',
                  )}
                  aria-hidden="true"
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <CardStatistic
                  card={card}
                  cardStat={it}
                  cardStatParams={cardStatParams}
                  variant="image"
                  preTitle={`#${idx + 1} `}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MostPlayedCards;
