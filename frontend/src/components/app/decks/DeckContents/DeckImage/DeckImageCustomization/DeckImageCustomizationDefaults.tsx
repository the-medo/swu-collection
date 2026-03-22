import * as React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import GroupBySelector from '../../GroupBySelector/GroupBySelector';
import { DeckGroupBy } from '../../../../../../../../types/enums.ts';
import DefaultVariantSelector from './DefaultVariantSelector';
import ExportWidthSelector from './ExportWidthSelector';
import { useGetUserSetting } from '@/api/user/useGetUserSetting';
import { useSetUserSetting } from '@/api/user/useSetUserSetting';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

// DefaultVariantSelector extracted to its own file

const DeckImageCustomizationDefaults: React.FC = () => {
  const { data: showNoisyBackground } = useGetUserSetting('deckImage_showNoisyBackground');
  const { data: showQr } = useGetUserSetting('deckImage_showQr');
  const { data: showcaseLeader } = useGetUserSetting('deckImage_showcaseLeader');
  const { data: hyperspaceBase } = useGetUserSetting('deckImage_hyperspaceBase');
  const { data: groupBy } = useGetUserSetting('deckImage_groupBy');

  const { mutate: setShowNoisyBackground } = useSetUserSetting('deckImage_showNoisyBackground');
  const { mutate: setShowQr } = useSetUserSetting('deckImage_showQr');
  const { mutate: setShowcaseLeader } = useSetUserSetting('deckImage_showcaseLeader');
  const { mutate: setHyperspaceBase } = useSetUserSetting('deckImage_hyperspaceBase');
  const { mutate: setGroupBy } = useSetUserSetting('deckImage_groupBy');

  return (
    <AccordionItem value="defaults">
      <AccordionTrigger right className="font-semibold">
        Default deck image settings
      </AccordionTrigger>
      <AccordionContent className="mt-2 space-y-3">
        <Alert variant="info">
          <AlertDescription className="text-xs">
            These settings are saved for user and will be used for all deck images by default
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!showcaseLeader}
              onCheckedChange={v => setShowcaseLeader(Boolean(v))}
            />
            Showcase leader
          </label>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!hyperspaceBase}
              onCheckedChange={v => setHyperspaceBase(Boolean(v))}
            />
            Hyperspace base
          </label>

          <label className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm">
              <Checkbox checked={showQr !== false} onCheckedChange={v => setShowQr(Boolean(v))} />
              Show QR code
            </div>
            <span className="text-xs italic">
              (adds a scannable link back to the live deck page)
            </span>
          </label>

          <DefaultVariantSelector fullWidth />

          <ExportWidthSelector fullWidth />

          <GroupBySelector
            value={groupBy as DeckGroupBy}
            onChange={v => setGroupBy(v)}
            userSettingName="deckImage_groupBy"
            fullWidth
          />

          <label className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={showNoisyBackground !== false}
                onCheckedChange={v => setShowNoisyBackground(Boolean(v))}
              />
              Show noisy background
            </div>
            <span className="text-xs italic">
              (turning off noise background reduces image size)
            </span>
          </label>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export default DeckImageCustomizationDefaults;
