import React from 'react';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { Checkbox } from '@/components/ui/checkbox';
import { saveUserSetting } from '@/dexie/userSettings.ts';
import { useQueryClient } from '@tanstack/react-query';
import CPKeyboardShortcutsTooltip from '@/components/app/limited/CardPoolDeckDetail/CPLeftFiltersAndPreview/CPKeyboardShortcutsTooltip.tsx';

const CPKeyboardShortcuts: React.FC = () => {
  const { data: cpKeyboardShortcuts } = useGetUserSetting('cpKeyboardShortcuts');
  const queryClient = useQueryClient();

  const toggleKeyboardShortcuts = async () => {
    const next = !(cpKeyboardShortcuts ?? true);
    await saveUserSetting('cpKeyboardShortcuts', next);
    queryClient.setQueryData(['user-setting', 'cpKeyboardShortcuts'], next);
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="font-medium inline-flex items-center gap-2">
        <span>Keyboard shortcuts</span>
        <CPKeyboardShortcutsTooltip />
      </div>
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <Checkbox checked={cpKeyboardShortcuts ?? true} onCheckedChange={toggleKeyboardShortcuts} />
        <span className="text-xs">{(cpKeyboardShortcuts ?? true) ? 'On' : 'Off'}</span>
      </label>
    </div>
  );
};

export default CPKeyboardShortcuts;
