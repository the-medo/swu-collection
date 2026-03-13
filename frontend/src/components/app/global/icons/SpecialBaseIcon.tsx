import * as React from 'react';
import { IconVariantProps } from '@/components/app/global/icons/iconLib.ts';
import { ProcessedBase } from '../../../../../../shared/lib/processBase.ts';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';

type SpecialBaseIconProps = {
  processedBase?: ProcessedBase;
} & IconVariantProps;

const SpecialBaseIcon: React.FC<SpecialBaseIconProps> = ({ processedBase, ...variants }) => {
  let aspect: string | undefined;

  if (!processedBase) return null;
  if (processedBase?.isBasicForceBase) aspect = 'force';
  if (processedBase?.isBasicAspectIgnoreBase) aspect = 'aspect-ignore';
  if (!aspect) return null;

  return <AspectIcon aspect={aspect} {...variants} />;
};

export default SpecialBaseIcon;
