import { CardCondition } from '../../../../types/enums.ts';
import { cardConditionNumericObj, cardConditionObj } from '../../../../types/iterableEnumInfo.ts';

export const conditionRenderer = (value: CardCondition | number) => (
  <span className="text-sm">
    {typeof value === 'number'
      ? cardConditionNumericObj[value]?.shortName
      : cardConditionObj[value]?.shortName}
  </span>
);
