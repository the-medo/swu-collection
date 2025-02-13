import { CardLanguage } from '../../../../types/enums.ts';
import { languageObj } from '../../../../types/iterableEnumInfo.ts';

export const languageRenderer = (value: CardLanguage, shortName: boolean = true) => (
  <div className="text-sm flex gap-2 items-center">
    <img src={languageObj[value].flag} alt={value} className="h-3 w-4" /> {shortName ? value : null}
  </div>
);
