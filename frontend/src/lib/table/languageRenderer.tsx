import { CardLanguage } from '../../../../types/enums.ts';
import { languageObj } from '../../../../types/iterableEnumInfo.ts';
import { cn } from '@/lib/utils.ts';

export const languageRenderer = (value: CardLanguage, shortName: boolean = true) => (
  <div
    className={cn('text-sm flex gap-2 items-center', {
      'w-4': !shortName,
      'w-12': shortName,
    })}
  >
    <img src={languageObj[value].flag} alt={value} className="h-3 w-4" /> {shortName ? value : null}
  </div>
);
