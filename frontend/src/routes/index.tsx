import { createFileRoute } from '@tanstack/react-router';
import { useGetApplicationConfiguration } from '@/api/application-configuration';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import DailySnapshots from '@/components/app/daily-snapshots/DailySnapshots.tsx';
import { HomepageModeSwitcher } from '@/components/app/home/HomepageModeSwitcher.tsx';
import LiveTournamentHome from '@/components/app/home/LiveTournamentHome.tsx';
import type {
  HomepageMode,
  HomepageModeSource,
  UserHomepageMode,
} from '@/components/app/home/homepageTypes.ts';

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
      <HomepageModeSwitcher
        activeMode={modeResolution.mode}
        modeSource={modeResolution.source}
        userPreference={userHomepageMode}
      />
      {modeResolution.mode === 'live' ? <LiveTournamentHome /> : <DailySnapshots />}
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
}): { mode: HomepageMode; source: HomepageModeSource } {
  if (searchMode) {
    return { mode: searchMode, source: 'search' };
  }

  if (userMode !== 'default') {
    return { mode: userMode, source: 'user' };
  }

  if (applicationMode) {
    return { mode: applicationMode, source: 'application' };
  }

  return { mode: 'snapshot', source: 'fallback' };
}
