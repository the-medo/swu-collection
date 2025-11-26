import React from 'react';
import CPIconOptionGroup from './CPIconOptionGroup';
import {
  PanelLeft,
  MousePointer,
  PanelTop,
  SquareStackIcon,
  RectangleVerticalIcon,
} from 'lucide-react';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';

const CPLayoutOptions: React.FC = () => {
  const { data: cardPreview } = useGetUserSetting('cpLayout_cardPreview');
  const { mutate: setCardPreview } = useSetUserSetting('cpLayout_cardPreview');

  const { data: imageSize } = useGetUserSetting('cpLayout_imageSize');
  const { mutate: setImageSize } = useSetUserSetting('cpLayout_imageSize');

  const { data: catPos } = useGetUserSetting('cpLayout_catPosition');
  const { mutate: setCatPos } = useSetUserSetting('cpLayout_catPosition');

  return (
    <div className="space-y-2">
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
    </div>
  );
};

export default CPLayoutOptions;
