import { useNavigate, useSearch } from '@tanstack/react-router';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import type { HomepageMode } from './homepageTypes.ts';

type HomepageModeSwitcherProps = {
  activeMode: HomepageMode;
};

export function HomepageModeSwitcher({ activeMode }: HomepageModeSwitcherProps) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });

  const setUrlMode = (mode: string) => {
    if (mode !== 'snapshot' && mode !== 'live') return;

    navigate({
      to: '/',
      search: previous => ({
        ...previous,
        homeMode: mode,
      }),
    });
  };

  return (
    <div className="mx-[-0.5rem] border-y bg-muted/30 px-2 py-2">
      <ToggleGroup
        type="single"
        value={(search.homeMode as HomepageMode | undefined) ?? activeMode}
        onValueChange={setUrlMode}
        className="justify-center gap-2"
      >
        <ToggleGroupItem value="snapshot" className="px-4">
          Snapshot
        </ToggleGroupItem>
        <ToggleGroupItem value="live" className="px-4">
          Live
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
