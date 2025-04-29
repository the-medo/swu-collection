import { DeckInformation } from '../../../../../../server/db/schema/deck_information.ts';
import { SwuAspect } from '../../../../../../types/enums.ts';

export const getAspectsFromDeckInformation = (
  deckInformation: DeckInformation | null,
): SwuAspect[] => {
  const deckAspects: SwuAspect[] = [];

  if (deckInformation?.aspectCommand) deckAspects.push(SwuAspect.COMMAND);
  if (deckInformation?.aspectVigilance) deckAspects.push(SwuAspect.VIGILANCE);
  if (deckInformation?.aspectAggression) deckAspects.push(SwuAspect.AGGRESSION);
  if (deckInformation?.aspectCunning) deckAspects.push(SwuAspect.CUNNING);
  if (deckInformation?.aspectHeroism) deckAspects.push(SwuAspect.HEROISM);
  if (deckInformation?.aspectVillainy) deckAspects.push(SwuAspect.VILLAINY);

  return deckAspects;
};
