import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';

export const settingsStyles = {
  tabs: `${workspaceStyles.tabs} inline-flex h-auto max-w-full flex-wrap justify-start [&>[role=tab]]:rounded-md [&>[role=tab][data-state=active]]:bg-card [&>[role=tab][data-state=active]]:text-primary`,
} as const;
