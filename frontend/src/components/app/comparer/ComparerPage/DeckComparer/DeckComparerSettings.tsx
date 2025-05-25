import * as React from 'react';
import {
  DiffDisplayMode,
  ViewMode,
  useComparerStore,
  useComparerStoreActions,
} from '@/components/app/comparer/useComparerStore.ts';
import { DeckGroupBy } from '@/components/app/decks/DeckContents/useDeckLayoutStore.ts';
import DiffDisplaySelector from './DiffDisplaySelector.tsx';
import ViewModeSelector from './ViewModeSelector.tsx';
import GroupBySelector from '@/components/app/decks/DeckContents/GroupBySelector/GroupBySelector.tsx';

/**
 * Component for managing deck comparer settings
 */
const DeckComparerSettings: React.FC = () => {
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
    <div className="flex gap-4 items-center">
      <GroupBySelector value={settings.groupBy} onChange={handleGroupByChange} />
      <ViewModeSelector value={settings.viewMode} onChange={handleViewModeChange} />
      <DiffDisplaySelector
        value={settings.diffDisplayMode}
        onChange={handleDiffDisplayModeChange}
      />
    </div>
  );
};

export default DeckComparerSettings;
