export const openCardOnMiddleButton =
  (cardId: string, variantId?: string) => (e: React.MouseEvent) => {
    if (e.button !== 1) return;
    const search = variantId ? `?${new URLSearchParams({ cardVariantId: variantId })}` : '';
    window.open(`/cards/detail/${encodeURIComponent(cardId)}${search}`, '_blank');
  };
