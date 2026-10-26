import {
  useComparerStore,
  useComparerStoreActions,
} from '@/components/app/comparer/useComparerStore.ts';
import DiffDisplaySelector from './DiffDisplaySelector.tsx';
import ViewModeSelector from './ViewModeSelector.tsx';
import GroupBySelector from '@/components/app/decks/DeckContents/GroupBySelector/GroupBySelector.tsx';
import { DeckGroupBy, DiffDisplayMode, ViewMode } from '../../../../../../../types/enums.ts';

/**
 * Component for managing deck comparer settings
 */
const DeckComparerSettings = ({ averageDeck }: { averageDeck: boolean }) => {
  const { settings } = useComparerStore();
  const { updateSettings } = useComparerStoreActions();

  const handleDiffDisplayModeChange = (diffDisplayMode: DiffDisplayMode | undefined) => {
    updateSettings({ diffDisplayMode });
  };

  const handleGroupByChange = (groupBy: DeckGroupBy) => {
    updateSettings({ groupBy });
  };

  const handleViewModeChange = (viewMode: ViewMode) => {
    updateSettings({ viewMode });
  };

  return (
    <div
      role="group"
      aria-label="Comparison settings"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--workspace-border)] bg-card p-2 [&>button]:h-8 [&>button]:max-w-full [&>button]:border-[var(--workspace-border)]"
    >
      <GroupBySelector value={settings.groupBy} onChange={handleGroupByChange} />
      <ViewModeSelector
        value={averageDeck ? ViewMode.ROW_CARD : settings.viewMode}
        onChange={handleViewModeChange}
        disabled={averageDeck}
      />
      <DiffDisplaySelector
        value={settings.diffDisplayMode}
        onChange={handleDiffDisplayModeChange}
      />
    </div>
  );
};

export default DeckComparerSettings;
