import * as React from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import SectionHeader from '@/components/app/daily-snapshots/sections/components/SectionHeader.tsx';
import GridSectionContent from '@/components/app/global/GridSection/GridSectionContent.tsx';
import GridSection from '@/components/app/global/GridSection/GridSection.tsx';
import { specialSectionSizing } from '@/components/app/daily-snapshots/DailySnapshots.tsx';
import TournamentDetail from '@/components/app/tournaments/TournamentDetail/TournamentDetail.tsx';
import {
  DetailAndBracketTab,
  MetaAnalysisTab,
  MatchupsTab,
  AllDecksTab,
  CardStatsTab,
} from '@/components/app/tournaments/TournamentTabs';
import { Route as RootRoute } from '@/routes';
import { useGetTournament } from '@/api/tournaments/useGetTournament.ts';
import MeleeButton from '@/components/app/tournaments/TournamentDetail/MeleeButton.tsx';
import Flag from '@/components/app/global/Flag.tsx';
import { Users, X } from 'lucide-react';
import { CountryCode } from '../../../../../../../server/db/lists.ts';
import { formatDate } from '@/lib/locale.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button.tsx';

export interface TournamentDetailSectionProps {}

const TournamentDetailSection: React.FC<TournamentDetailSectionProps> = ({}) => {
  const navigate = useNavigate();
  const { maTournamentId, page } = useSearch({ strict: false });
  const { data } = useGetTournament(maTournamentId);

  const activeTab = (page as string) || 'details';

  let content = useMemo(() => {
    if (!maTournamentId) return null;

    switch (activeTab) {
      case 'details':
        return (
          <DetailAndBracketTab tournamentId={maTournamentId} displayDetail={false} compact={true} />
        );
      case 'meta':
        return <MetaAnalysisTab route={RootRoute} />;
      case 'matchups':
        return <MatchupsTab route={RootRoute} />;
      case 'decks':
        return <AllDecksTab />;
      case 'card-stats':
        return <CardStatsTab route={RootRoute} tournamentId={maTournamentId} />;
      default:
        return (
          <DetailAndBracketTab tournamentId={maTournamentId} displayDetail={false} compact={true} />
        );
    }
  }, [activeTab, maTournamentId]);

  if (!maTournamentId) return null;

  const t = data?.tournament;
  const countryCode = t?.location as CountryCode;

  return (
    <GridSection
      key="tournament-detail"
      sizing={specialSectionSizing['tournament-detail']}
      id={`s-tournament-detail`}
      className="z-10"
    >
      <GridSectionContent>
        <div className="h-full w-full flex flex-col gap-2 ">
          <SectionHeader
            headerAndTooltips={
              t ? (
                <div className="flex items-center gap-4 flex-wrap">
                  <h4 className="mb-0!">{t.name}</h4>
                  <Flag countryCode={countryCode} className="w-5 h-3" />

                  {t.attendance > 0 ? (
                    <div className="items-center justify-end gap-1 flex">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{t.attendance}</span>
                    </div>
                  ) : null}
                  <span className="text-sm italic">({formatDate(t.date)})</span>
                </div>
              ) : (
                <Skeleton className="h-10 w-100" />
              )
            }
            dropdownMenu={
              <div className="flex gap-2 mb-2">
                {data?.tournament.meleeId && <MeleeButton meleeId={data.tournament.meleeId} />}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate({
                      to: '.',
                      search: prev => ({ ...prev, maTournamentId: undefined }),
                    })
                  }
                >
                  Close
                  <X />
                </Button>
              </div>
            }
          />
          <div
            className="flex gap-4 justify-center flex-wrap @container/tournament-detail"
            id="section-tournament-detail"
          >
            <TournamentDetail
              tournamentId={maTournamentId as string}
              activeTab={activeTab}
              mode="search-params"
              displayHeader={false}
            >
              {content}
            </TournamentDetail>
          </div>
        </div>
      </GridSectionContent>
    </GridSection>
  );
};

export default TournamentDetailSection;
