import { Deck } from '../../../../../../types/Deck.ts';
import { User } from '../../../../../../types/User.ts';
import { formatDataById } from '../../../../../../types/Format.ts';

export type UserDeckData = {
  user: User;
  deck: Deck;
};

export const getFormatName = (formatId: number): string => {
  return formatDataById[formatId].name ?? 'Unknown';
};
