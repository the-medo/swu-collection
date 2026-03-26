export const SWU_CARD_IMAGE_BASE_URL = 'https://images.swubase.com/cards';

export const getCardImageUrl = (imageName?: string | null) =>
  imageName ? `${SWU_CARD_IMAGE_BASE_URL}/${imageName}` : undefined;
