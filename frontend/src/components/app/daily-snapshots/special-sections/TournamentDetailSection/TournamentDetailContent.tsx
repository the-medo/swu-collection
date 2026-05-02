import * as React from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import SectionHeader from '@/components/app/daily-snapshots/sections/components/SectionHeader.tsx';
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
import { SidebarClose, SidebarOpen, Users, X } from 'lucide-react';
import { CountryCode } from '../../../../../../../server/db/lists.ts';
import { formatDate } from '@/lib/locale.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button.tsx';

export interface TournamentDetailContentProps {
  tournamentId?: string;
  maTournamentId?: string;
  expanded?: boolean;
  setExpanded?: React.Dispatch<React.SetStateAction<boolean>>;
  onClose?: () => void;
}

const TournamentDetailContent: React.FC<TournamentDetailContentProps> = ({
  tournamentId,
  maTournamentId,
  expanded,
  setExpanded,
  onClose,
}) => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const resolvedTournamentId = tournamentId ?? maTournamentId;
  const { data } = useGetTournament(resolvedTournamentId);

  const activeTab = (search.page as string) || 'details';

  const closeDetail = () => {
    if (onClose) {
      onClose();
      return;
    }

    navigate({
      to: '.',
      search: prev => ({ ...prev, maTournamentId: undefined }),
    });
  };

  const tournamentDetailContent = useMemo(() => {
    if (!resolvedTournamentId) return null;

    switch (activeTab) {
      case 'details':
        return (
          <DetailAndBracketTab
            tournamentId={resolvedTournamentId}
            displayDetail={false}
            compact={true}
          />
        );
      case 'meta':
        return <MetaAnalysisTab route={RootRoute} />;
      case 'matchups':
        return <MatchupsTab route={RootRoute} />;
      case 'decks':
        return <AllDecksTab compact={true} />;
      case 'card-stats':
        return <CardStatsTab route={RootRoute} tournamentId={resolvedTournamentId} />;
      default:
        return (
          <DetailAndBracketTab
            tournamentId={resolvedTournamentId}
            displayDetail={false}
            compact={true}
          />
        );
    }
  }, [activeTab, resolvedTournamentId]);

  const t = data?.tournament;
  const countryCode = t?.location as CountryCode;

  if (!resolvedTournamentId) return null;

  return (
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
            <Button variant="outline" size="sm" onClick={closeDetail}>
              Close
              <X />
            </Button>
            {setExpanded && (
              <Button
                variant="outline"
                size="sm"
                className="px-2"
                onClick={() => setExpanded(p => !p)}
              >
                {expanded ? <SidebarClose /> : <SidebarOpen />}
              </Button>
            )}
          </div>
        }
      />
      <div
        className="flex gap-4 justify-center flex-wrap @container/tournament-detail"
        id="section-tournament-detail"
      >
        <TournamentDetail
          tournamentId={resolvedTournamentId}
          activeTab={activeTab}
          mode="search-params"
          displayHeader={false}
        >
          {tournamentDetailContent}
        </TournamentDetail>
      </div>
    </div>
  );
};

export default TournamentDetailContent;
