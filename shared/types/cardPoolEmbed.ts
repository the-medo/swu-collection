export type CardPoolEmbed = {
  id: string;
  name: string;
  set: string | null;
  leaders: { cardId: string; copies: number }[];
  boosterCount: number | null;
};
