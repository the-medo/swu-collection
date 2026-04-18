import { createFileRoute } from '@tanstack/react-router';
import { useGetApplicationConfiguration } from '@/api/application-configuration';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import DailySnapshots from '@/components/app/daily-snapshots/DailySnapshots.tsx';
import { HomepageHeader } from '@/components/app/home/HomepageHeader.tsx';
import { HomepageModeSwitcher } from '@/components/app/home/HomepageModeSwitcher.tsx';
import LiveTournamentHome from '@/components/app/home/LiveTournamentHome.tsx';
import type { HomepageMode, UserHomepageMode } from '@/components/app/home/homepageTypes.ts';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  const { homeMode } = Route.useSearch();
  const { data: applicationConfiguration } = useGetApplicationConfiguration();
  const { data: userHomepageMode = 'default' } = useGetUserSetting('homepageMode');
  const appHomepageMode = applicationConfiguration?.homepageMode;

  const modeResolution = resolveHomepageMode({
    searchMode: homeMode,
    userMode: userHomepageMode,
    applicationMode: appHomepageMode,
  });

  return (
    <>
      <HomepageHeader />
      <HomepageModeSwitcher activeMode={modeResolution} />
      {modeResolution === 'live' ? <LiveTournamentHome /> : <DailySnapshots />}
    </>
  );
}

function resolveHomepageMode({
  searchMode,
  userMode,
  applicationMode,
}: {
  searchMode?: HomepageMode;
  userMode: UserHomepageMode;
  applicationMode?: HomepageMode;
}): HomepageMode {
  if (searchMode) {
    return searchMode;
  }

  if (userMode !== 'default') {
    return userMode;
  }

  if (applicationMode) {
    return applicationMode;
  }

  return 'snapshot';
}
