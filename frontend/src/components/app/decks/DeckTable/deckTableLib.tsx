import type { Deck, DeckData } from '../../../../../../types/Deck.ts';
import { User } from '../../../../../../types/User.ts';
import { formatDataById } from '../../../../../../types/Format.ts';
import { EntityPrice } from '../../../../../../server/db/schema/entity_price.ts';

export type UserDeckData = {
  user: User;
  deck: Deck;
  entityPrices?: EntityPrice[];
} & Pick<DeckData, 'branchContext' | 'openBranchCount' | 'openBranchTeams'>;

export const getFormatName = (formatId: number): string => {
  return formatDataById[formatId].name ?? 'Unknown';
};
