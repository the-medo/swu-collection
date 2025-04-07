import { variantInfo } from '../../../../server/lib/cards/variants.ts';

export const variantRenderer = (value: string) => {
  const shortName = variantInfo[value]?.shortName;
  return (
    <div className="text-sm text-gray-500 w-12">{shortName === undefined ? value : shortName}</div>
  );
};
