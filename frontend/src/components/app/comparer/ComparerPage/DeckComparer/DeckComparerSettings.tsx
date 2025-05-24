import * as React from 'react';
import {
  DiffDisplayMode,
  useComparerStore,
  useComparerStoreActions,
} from '@/components/app/comparer/useComparerStore.ts';
import { DeckGroupBy } from '@/components/app/decks/DeckContents/useDeckLayoutStore.ts';
import DiffDisplaySelector from './DiffDisplaySelector.tsx';
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

  return (
    <div className="flex gap-4 items-center p-2">
      <DiffDisplaySelector
        value={settings.diffDisplayMode}
        onChange={handleDiffDisplayModeChange}
      />
      <GroupBySelector 
        value={settings.groupBy}
        onChange={handleGroupByChange}
      />
    </div>
  );
};

export default DeckComparerSettings;
