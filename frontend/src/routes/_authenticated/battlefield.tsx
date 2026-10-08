import { createFileRoute } from '@tanstack/react-router';
import { BattlefieldPage } from '@/components/app/battlefield/BattlefieldPage';
import { z } from 'zod';
export const Route = createFileRoute('/_authenticated/battlefield')({
  validateSearch: z.object({
    battlefieldPreset: z.uuid().optional().catch(undefined),
    battlefieldPresetMode: z.literal('edit').optional().catch(undefined),
    battlefieldSlot: z
      .union([z.uuid(), z.literal('new')])
      .optional()
      .catch(undefined),
  }),
  component: BattlefieldEditorRoute,
});
function BattlefieldEditorRoute() {
  const { battlefieldPreset, battlefieldSlot, battlefieldPresetMode } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <BattlefieldPage
      presetId={battlefieldPreset}
      presetMode={battlefieldPresetMode}
      initialSlot={battlefieldSlot}
      onClosePreset={() =>
        void navigate({
          replace: true,
          search: previous => ({
            ...previous,
            battlefieldPreset: undefined,
            battlefieldSlot: undefined,
            battlefieldPresetMode: undefined,
          }),
        })
      }
    />
  );
}
