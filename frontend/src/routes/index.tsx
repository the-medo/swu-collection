import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { useEffect } from 'react';
import { useGetApplicationConfiguration } from '@/api/application-configuration';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import DailySnapshots from '@/components/app/daily-snapshots/DailySnapshots.tsx';
import { HomepageHeader } from '@/components/app/home/HomepageHeader.tsx';
import { HomepageModeSwitcher } from '@/components/app/home/HomepageModeSwitcher.tsx';
import LiveTournamentHome from '@/components/app/home/LiveTournamentHome.tsx';
import type { HomepageMode, UserHomepageMode } from '@/components/app/home/homepageTypes.ts';
import TodayHome from '@/components/app/home/today/TodayHome.tsx';
import { dailySealedDateSchema } from '../../../shared/types/dailySealed.ts';
import { useRememberedHomepageMode } from '@/components/app/home/useRememberedHomepageMode.ts';

export const Route = createFileRoute('/')({
  component: Index,
  validateSearch: z.object({
    poolDate: dailySealedDateSchema.optional().catch(undefined),
    poolDiscussion: z.boolean().optional().catch(undefined),
    poolComment: z.guid().optional().catch(undefined),
  }),
});

function Index() {
  const { homeMode, streamId, poolDate, poolDiscussion, poolComment } = Route.useSearch();
  const { data: applicationConfiguration } = useGetApplicationConfiguration();
  const { data: userHomepageMode = 'default' } = useGetUserSetting('homepageMode');
  const appHomepageMode = applicationConfiguration?.homepageMode;
  const isWatchMode = !!streamId;
  const [rememberedMode, rememberMode] = useRememberedHomepageMode();

  useEffect(() => {
    if (homeMode && !isWatchMode) rememberMode(homeMode);
  }, [homeMode, isWatchMode, rememberMode]);

  const modeResolution = resolveHomepageMode({
    searchMode: isWatchMode ? 'live' : homeMode,
    rememberedMode,
    userMode: userHomepageMode,
    applicationMode: appHomepageMode,
  });

  return (
    <>
      {!isWatchMode && <HomepageHeader />}
      {!isWatchMode && <HomepageModeSwitcher activeMode={modeResolution} />}
      {modeResolution === 'live' ? (
        <LiveTournamentHome />
      ) : modeResolution === 'today' ? (
        <TodayHome
          date={poolDate}
          discussionOpen={poolDiscussion || !!poolComment}
          focusCommentId={poolComment}
        />
      ) : (
        <DailySnapshots />
      )}
    </>
  );
}

function resolveHomepageMode({
  searchMode,
  rememberedMode,
  userMode,
  applicationMode,
}: {
  searchMode?: HomepageMode;
  rememberedMode?: HomepageMode;
  userMode: UserHomepageMode;
  applicationMode?: HomepageMode;
}): HomepageMode {
  if (searchMode) {
    return searchMode;
  }

  if (rememberedMode) {
    return rememberedMode;
  }

  if (userMode !== 'default') {
    return userMode;
  }

  if (applicationMode) {
    return applicationMode;
  }

  return 'snapshot';
}
