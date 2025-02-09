import { variantInfo } from '@/lib/cards/variants.ts';

export const variantRenderer = (value: string) => {
  const shortName = variantInfo[value]?.shortName;
  return (
    <span className="text-sm text-gray-500">{shortName === undefined ? value : shortName}</span>
  );
};
