export const openCardOnMiddleButton = (cardId: string) => (e: React.MouseEvent) => {
  if (e.button !== 1) return;
  window.open(`/cards/detail/${cardId}`, '_blank');
};
