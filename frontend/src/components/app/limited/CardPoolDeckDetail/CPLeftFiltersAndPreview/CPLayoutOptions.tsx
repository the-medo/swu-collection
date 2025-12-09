import React from 'react';
import CPIconOptionGroup from './CPIconOptionGroup';
import {
  PanelLeft,
  MousePointer,
  PanelTop,
  SquareStackIcon,
  RectangleVerticalIcon,
  Grid2X2,
  GalleryHorizontal,
} from 'lucide-react';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';
import { Checkbox } from '@/components/ui/checkbox';

const CPLayoutOptions: React.FC = () => {
  const { data: boxLayout } = useGetUserSetting('cpLayout_boxLayout');
  const { mutate: setBoxLayout } = useSetUserSetting('cpLayout_boxLayout');
  const { data: cardPreview } = useGetUserSetting('cpLayout_cardPreview');
  const { mutate: setCardPreview } = useSetUserSetting('cpLayout_cardPreview');

  const { data: imageSize } = useGetUserSetting('cpLayout_imageSize');
  const { mutate: setImageSize } = useSetUserSetting('cpLayout_imageSize');

  const { data: catPos } = useGetUserSetting('cpLayout_catPosition');
  const { mutate: setCatPos } = useSetUserSetting('cpLayout_catPosition');

  // New settings: display titles for boxes and stacks
  const { data: displayBoxTitles } = useGetUserSetting('cpLayout_displayBoxTitles');
  const { mutate: setDisplayBoxTitles } = useSetUserSetting('cpLayout_displayBoxTitles');

  const { data: displayStackTitles } = useGetUserSetting('cpLayout_displayStackTitles');
  const { mutate: setDisplayStackTitles } = useSetUserSetting('cpLayout_displayStackTitles');

  return (
    <div className="space-y-2">
      <CPIconOptionGroup
        title="Box layout"
        value={boxLayout}
        defaultValue="grid"
        onChange={v => setBoxLayout(v as 'grid' | 'row')}
        options={[
          {
            value: 'grid',
            tooltip: 'Grid',
            ariaLabel: 'Grid',
            icon: <Grid2X2 className="h-4 w-4" />,
          },
          {
            value: 'row',
            tooltip: 'Row',
            ariaLabel: 'Row',
            icon: <GalleryHorizontal className="h-4 w-4" />,
          },
        ]}
      />

      <CPIconOptionGroup
        title="Card preview"
        value={cardPreview}
        defaultValue="static"
        onChange={v => setCardPreview(v as 'static' | 'hover')}
        options={[
          {
            value: 'static',
            tooltip: 'Static',
            ariaLabel: 'Static',
            icon: <PanelLeft className="h-4 w-4" />,
          },
          {
            value: 'hover',
            tooltip: 'Hover',
            ariaLabel: 'Hover',
            icon: <MousePointer className="h-4 w-4" />,
          },
        ]}
      />

      <CPIconOptionGroup
        title="Image size"
        value={imageSize}
        defaultValue="big"
        onChange={v => setImageSize(v as 'big' | 'small')}
        options={[
          {
            value: 'big',
            tooltip: 'Big',
            ariaLabel: 'Big',
            icon: <RectangleVerticalIcon />,
          },
          {
            value: 'small',
            tooltip: 'Small',
            ariaLabel: 'Small',
            icon: <SquareStackIcon />,
          },
        ]}
      />

      <CPIconOptionGroup
        title="Cost/Aspect/Type"
        value={catPos}
        defaultValue="top"
        onChange={v => setCatPos(v as 'top' | 'left')}
        options={[
          {
            value: 'top',
            tooltip: 'Top',
            ariaLabel: 'Top',
            icon: <PanelTop className="h-4 w-4" />,
          },
          {
            value: 'left',
            tooltip: 'Left',
            ariaLabel: 'Left',
            icon: <PanelLeft className="h-4 w-4" />,
          },
        ]}
      />

      <div className="space-y-2 mt-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!displayBoxTitles}
            onCheckedChange={v => setDisplayBoxTitles(v === true)}
          />
          <span>Display box titles</span>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!displayStackTitles}
            onCheckedChange={v => setDisplayStackTitles(v === true)}
          />
          <span>Display stack titles</span>
        </label>
      </div>
    </div>
  );
};

export default CPLayoutOptions;
