import {
  areGameAndMatchRecordsEqual,
  calculateResultStatistics,
} from '@/components/app/statistics/lib/resultStatistics';
import { statisticsStyles } from '@/components/app/statistics/statisticsStyles';
import * as React from 'react';
import { useGameResultsContext } from '@/components/app/statistics/GameResultsContext.tsx';
import { Activity, ArrowUpRight, Swords, Trophy } from 'lucide-react';
import DashboardCalendar from '@/components/app/statistics/StatisticsDashboard/DashboardCalendar/DashboardCalendar.tsx';
import DashboardLeaderBase from '@/components/app/statistics/StatisticsDashboard/DashboardLeaderBase/DashboardLeaderBase.tsx';
import DashboardOverview from '@/components/app/statistics/StatisticsDashboard/DashboardOverview/DashboardOverview.tsx';
import { startOfDay, subDays } from 'date-fns';
import { useMemo } from 'react';
import MatchResultBox from '@/components/app/statistics/components/MatchResultBox/MatchResultBox.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Link, useSearch } from '@tanstack/react-router';
import { getTeamUrlPrefix } from '@/components/app/teams/lib/getTeamUrlPrefix.ts';
import { getStatisticsTimestampMs } from '@/components/app/statistics/lib/date.ts';

interface StatisticsDashboardProps {
  teamId?: string;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ teamId }) => {
  const gameResultData = useGameResultsContext();
  const { sInTeam } = useSearch({
    strict: false,
  });

  const { todayMatches, last7DaysMatches, allMatches } = React.useMemo(() => {
    const matches = gameResultData?.matches.array ?? [];
    const todayStartTime = startOfDay(new Date()).getTime();
    const last7DaysStartTime = startOfDay(subDays(new Date(), 7)).getTime();

    return {
      todayMatches: matches.filter(
        m => getStatisticsTimestampMs(m.firstGameCreatedAt) >= todayStartTime,
      ),
      last7DaysMatches: matches.filter(
        m => getStatisticsTimestampMs(m.firstGameCreatedAt) >= last7DaysStartTime,
      ),
      allMatches: matches,
    };
  }, [gameResultData?.matches.array]);

  const visibleMatches = useMemo(() => {
    if (!gameResultData) return [];
    return gameResultData.matches.array.slice(0, 5);
  }, [gameResultData]);

  const showWinLose = !sInTeam;
  const periodStats = useMemo(
    () => ({
      today: calculateResultStatistics(todayMatches),
      last7Days: calculateResultStatistics(last7DaysMatches),
      all: calculateResultStatistics(allMatches),
    }),
    [todayMatches, last7DaysMatches, allMatches],
  );
  const showMatches = Object.values(periodStats).some(stats => !areGameAndMatchRecordsEqual(stats));

  return (
    <div className="@container/statistics-dashboard min-w-0">
      {gameResultData?.isLoading && (
        <p className="mb-3 text-sm text-muted-foreground" role="status">
          Loading statistics…
        </p>
      )}
      {gameResultData?.isError && (
        <div className="mb-3 flex items-center gap-2 text-sm" role="alert">
          Could not refresh statistics.{' '}
          <Button variant="outline" size="sm" onClick={gameResultData.refetch}>
            Retry
          </Button>
        </div>
      )}
      <div className={statisticsStyles.overviewGrid}>
        <section className={statisticsStyles.activity} aria-labelledby="statistics-activity-title">
          <div className={statisticsStyles.sectionHeader}>
            <h2 id="statistics-activity-title" className={statisticsStyles.sectionTitle}>
              <Activity size={16} className={statisticsStyles.activityIcon} aria-hidden="true" />
              Activity
            </h2>
            <span className="text-xs text-muted-foreground">Last 90 days</span>
          </div>
          <DashboardCalendar matchesByDate={gameResultData?.matches.byDate} />
          {showWinLose && (
            <div className={statisticsStyles.calendarLegend}>
              <span className="mr-auto inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-[2px] bg-[var(--statistics-activity-empty)]"
                    aria-hidden="true"
                  />
                  No games
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-[2px] bg-[var(--statistics-activity-unrated)]"
                    aria-hidden="true"
                  />
                  No result
                </span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span>Win rate: 0%</span>
                <span className={statisticsStyles.calendarScale} aria-hidden="true" />
                <span>100%</span>
              </span>
            </div>
          )}
        </section>
        <section className={statisticsStyles.overview} aria-labelledby="statistics-overview-title">
          <h2 id="statistics-overview-title" className={statisticsStyles.sectionTitle}>
            <Trophy size={16} className={statisticsStyles.resultsIcon} aria-hidden="true" />
            Results overview
          </h2>
          <table className={statisticsStyles.periods} aria-label="Results by period">
            <thead>
              <tr>
                <th scope="col">Period</th>
                {showMatches && <th scope="col">Matches</th>}
                <th scope="col">Games</th>
              </tr>
            </thead>
            <tbody>
              <DashboardOverview
                label="Today"
                stats={periodStats.today}
                showWinLose={showWinLose}
                showMatches={showMatches}
              />
              <DashboardOverview
                label="Last 7 days"
                stats={periodStats.last7Days}
                showWinLose={showWinLose}
                showMatches={showMatches}
              />
              <DashboardOverview
                label="Selected period"
                stats={periodStats.all}
                showWinLose={showWinLose}
                showMatches={showMatches}
              />
            </tbody>
          </table>
        </section>
      </div>
      <div className={statisticsStyles.dashboardLists}>
        <section className="min-w-0" aria-labelledby="statistics-recent-title">
          <div className={statisticsStyles.sectionHeader}>
            <h2 id="statistics-recent-title" className={statisticsStyles.sectionTitle}>
              <Swords size={16} className={statisticsStyles.resultsIcon} aria-hidden="true" />
              Recent matches
            </h2>
            <Link
              className={statisticsStyles.textLink}
              to={`${getTeamUrlPrefix(teamId)}/statistics/history`}
              params={{ teamId }}
              search={prev => prev}
            >
              Full history <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className={statisticsStyles.ledger}>
            {!gameResultData?.isLoading && !gameResultData?.isError && !visibleMatches.length && (
              <div className="p-5 text-center text-sm text-muted-foreground">
                No matches in this period. Try a different date range.
              </div>
            )}
            {visibleMatches.map(match => (
              <MatchResultBox key={match.id} match={match} artworkVariant="portrait" />
            ))}
          </div>
        </section>
        <section className="min-w-0" aria-labelledby="statistics-leaders-title">
          <div className={statisticsStyles.sectionHeader}>
            <h2 id="statistics-leaders-title" className={statisticsStyles.sectionTitle}>
              Recent leaders &amp; bases
            </h2>
            <Link
              className={statisticsStyles.textLink}
              to={`${getTeamUrlPrefix(teamId)}/statistics/leader-and-base`}
              params={{ teamId }}
              search={prev => prev}
            >
              View all <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className={statisticsStyles.ledger}>
            {gameResultData && (
              <DashboardLeaderBase
                teamId={teamId}
                byLeaderBase={gameResultData.matches.byLeaderBase}
                byDeckId={gameResultData.matches.byDeckId}
              />
            )}
            {!gameResultData?.isLoading &&
              !gameResultData?.isError &&
              !Object.keys(gameResultData?.matches.byLeaderBase.matches ?? {}).length && (
                <div className="p-5 text-sm text-muted-foreground">
                  Your leader and base results will appear here.
                </div>
              )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default StatisticsDashboard;
