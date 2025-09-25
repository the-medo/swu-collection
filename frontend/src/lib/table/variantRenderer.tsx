import { variantInfo } from '../../../../server/lib/cards/variants.ts';
import { cn } from '@/lib/utils.ts';

export const variantRenderer = (
  value: string,
  displayType: 'fixed' | 'free' = 'fixed',
  surrounded: boolean = false,
) => {
  const shortName = variantInfo[value]?.shortName;
  const text = shortName === undefined ? value : shortName;
  return (
    <div
      className={cn('text-sm text-gray-500', {
        'w-12': displayType === 'fixed',
        'w-auto': displayType === 'free',
      })}
    >
      {surrounded && text !== '' ? '(' : ''}
      {text}
      {surrounded && text !== '' ? ')' : ''}
    </div>
  );
};
