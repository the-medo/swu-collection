import * as React from 'react';
import {
  DiffDisplayMode,
  useComparerStore,
  useComparerStoreActions,
} from '@/components/app/comparer/useComparerStore.ts';
import DiffDisplaySelector from './DiffDisplaySelector.tsx';

/**
 * Component for managing deck comparer settings
 */
const DeckComparerSettings: React.FC = () => {
  const { settings } = useComparerStore();
  const { updateSettings } = useComparerStoreActions();

  const handleDiffDisplayModeChange = (diffDisplayMode: DiffDisplayMode | undefined) => {
    updateSettings({ diffDisplayMode });
  };

  return (
    <div className="flex gap-2 items-center p-2">
      <DiffDisplaySelector
        value={settings.diffDisplayMode}
        onChange={handleDiffDisplayModeChange}
      />
    </div>
  );
};

export default DeckComparerSettings;
