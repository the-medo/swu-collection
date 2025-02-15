import { CardCondition } from '../../../../types/enums.ts';
import { cardConditionNumericObj, cardConditionObj } from '../../../../types/iterableEnumInfo.ts';

export const conditionRenderer = (value: CardCondition | number) => (
  <div className="text-sm w-8 min-w-8">
    {typeof value === 'number'
      ? cardConditionNumericObj[value]?.shortName
      : cardConditionObj[value]?.shortName}
  </div>
);
