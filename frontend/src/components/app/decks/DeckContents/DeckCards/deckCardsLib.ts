export type CardInBoards = Record<number, number | undefined> | undefined;
export type CardsInBoards = Record<string, CardInBoards>;

export type DeckCardQuantityChangeHandler = (quantity: number | undefined, board?: number) => void;
